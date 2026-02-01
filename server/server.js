const express = require("express");
const cors = require("cors");
const snarkjs = require("snarkjs");
const { 
    Keypair, Asset, Operation, TransactionBuilder, 
    Networks, Address, Contract, xdr, rpc, StrKey 
} = require("@stellar/stellar-sdk");
const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend

// --- CONFIGURATION ---
const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = process.env.CONTRACT_ID || "CDWMZOQNG2SRMKGLNZH7PRZIYFO25NG4MQOF3RPAHH5WUD5WQXSQ25YO";
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const PORT = process.env.PORT || 3001;

// ZK Files
const WASM_PATH = "./circuits/identity_verifier_js/identity_verifier.wasm";
const ZKEY_PATH = "./circuits/circuit_final.zkey";
const VKEY_PATH = JSON.parse(fs.readFileSync("./circuits/verification_key.json"));

// Initialize Poseidon (cached)
let poseidonInstance = null;
const getPoseidon = async () => {
    if (!poseidonInstance) {
        poseidonInstance = await buildPoseidon();
    }
    return poseidonInstance;
};

// Initialize Soroban server
const server = new rpc.Server(RPC_URL);

// --- UTILITY FUNCTIONS ---

async function generateProof(identityData, userAddress) {
    const poseidon = await getPoseidon();
    
    // Hash strings using Poseidon
    const nameHash = poseidon.F.toObject(poseidon([Buffer.from(identityData.name)]));
    const docIdHash = poseidon.F.toObject(poseidon([Buffer.from(identityData.docId)]));

    // Split 256-bit Stellar Address into two 128-bit chunks
    const userBytes = StrKey.decodeEd25519PublicKey(userAddress);
    const addrLow = BigInt("0x" + userBytes.slice(16).toString("hex"));
    const addrHigh = BigInt("0x" + userBytes.slice(0, 16).toString("hex"));

    const inputs = {
        name_hash: nameHash.toString(),
        dob_year: identityData.dob.year,
        dob_month: identityData.dob.month,
        dob_day: identityData.dob.day,
        gender: identityData.gender,
        document_type: identityData.docType,
        document_id_hash: docIdHash.toString(),
        secret_salt: identityData.secretSalt,
        current_year: identityData.currentYear || 2024,
        current_month: identityData.currentMonth || 5,
        current_day: identityData.currentDay || 20,
        min_age_requirement: identityData.minAge || 18,
        gender_filter: identityData.genderFilter || 0,
        wallet_addr_low: addrLow.toString(),
        wallet_addr_high: addrHigh.toString()
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);

    // Verify off-chain
    const verified = await snarkjs.groth16.verify(VKEY_PATH, publicSignals, proof);
    
    return { proof, publicSignals, verified };
}

// Submit to Soroban (admin signs and submits)
async function submitToSoroban(userAddress, commitmentHashHex, nullifierHex, identityData) {
    const adminKey = Keypair.fromSecret(ADMIN_SECRET);
    
    const nativeAsset = Asset.native();
    const TOKEN_ADDRESS = nativeAsset.contractId(NETWORK_PASSPHRASE);
    const tokenContract = new Contract(TOKEN_ADDRESS);

    // Use admin account as source (admin pays fees)
    const adminAccount = await server.getAccount(adminKey.publicKey());
    
    // Extract verification attributes from identityData
    const minAgeVerified = parseInt(identityData.minAge) || 18;
    const documentType = parseInt(identityData.docType) || 1;
    const genderVerified = identityData.genderFilter !== 0;
    
    const tx = new TransactionBuilder(adminAccount, { fee: "200000", networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(
            Operation.invokeContractFunction({
                contract: CONTRACT_ID,
                function: "register_verified_identity",
                args: [
                    new Address(adminKey.publicKey()).toScVal(),  // Admin authorizes
                    new Address(userAddress).toScVal(),           // User being registered
                    xdr.ScVal.scvBytes(Buffer.from(commitmentHashHex, "hex")),
                    xdr.ScVal.scvBytes(Buffer.from(nullifierHex, "hex")),
                    xdr.ScVal.scvU32(minAgeVerified),
                    xdr.ScVal.scvU32(documentType),
                    xdr.ScVal.scvBool(genderVerified),
                ],
            })
        )
        .setTimeout(300)
        .build();

    // Simulate transaction
    const simResult = await server.simulateTransaction(tx);
    if (simResult.error) {
        throw new Error(`Simulation failed: ${simResult.error}`);
    }

    // Prepare and sign with admin
    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(adminKey);
    
    // Submit transaction
    const sentTx = await server.sendTransaction(preparedTx);
    
    if (sentTx.errorResult) {
        throw new Error(`Transaction rejected: ${JSON.stringify(sentTx.errorResult)}`);
    }

    // Poll for result
    let status = await server.getTransaction(sentTx.hash);
    let attempts = 0;
    const maxAttempts = 30;
    
    while (status.status === "NOT_FOUND" || status.status === "PENDING") {
        await new Promise(r => setTimeout(r, 2000));
        status = await server.getTransaction(sentTx.hash);
        attempts++;
        
        if (attempts >= maxAttempts) {
            throw new Error("Transaction timeout");
        }
    }
    
    if (status.status !== "SUCCESS") {
        throw new Error(`Transaction failed with status: ${status.status}`);
    }

    return { hash: sentTx.hash, status: status.status };
}

// --- API ENDPOINTS ---

/**
 * POST /api/register
 * Register a verified identity on-chain
 * 
 * Body:
 * {
 *   "userAddress": "GXXX...",
 *   "identityData": {
 *     "name": "JOHN DOE",
 *     "dob": { "year": 1995, "month": 5, "day": 15 },
 *     "gender": 1,
 *     "docType": 2,
 *     "docId": "ABCDE1234F",
 *     "secretSalt": "12345678901234567890",
 *     "currentYear": 2024,
 *     "currentMonth": 5,
 *     "currentDay": 20,
 *     "minAge": 18,
 *     "genderFilter": 0
 *   }
 * }
 * 
 * Note: userSecret is NO LONGER required - user will sign via Freighter wallet on frontend if needed
 */
// UPDATE THE /api/register ENDPOINT in server.js
// Replace the existing endpoint with this:

app.post("/api/register", async (req, res) => {
    try {
        const { userAddress, identityData } = req.body;

        if (!userAddress || !identityData) {
            return res.status(400).json({ error: "Missing userAddress or identityData" });
        }

        console.log(`[REGISTER] Starting registration for ${userAddress}`);

        // Check if user needs to pay (2nd+ doc)
        const adminAccount = await server.getAccount(Keypair.fromSecret(ADMIN_SECRET).publicKey());
        const countCheckTx = new TransactionBuilder(adminAccount, { 
            fee: "100", 
            networkPassphrase: NETWORK_PASSPHRASE 
        })
            .addOperation(
                Operation.invokeContractFunction({
                    contract: CONTRACT_ID,
                    function: "get_user_doc_count",
                    args: [new Address(userAddress).toScVal()]
                })
            )
            .setTimeout(180)
            .build();

        const countResult = await server.simulateTransaction(countCheckTx);
        const currentDocCount = countResult.result?.retval?._value ?? 0;
        
        console.log(`[REGISTER] Current doc count: ${currentDocCount}`);

        // Note: For 2nd+ documents requiring payment, the frontend should handle payment
        // via Freighter wallet before calling this endpoint
        
        // Generate ZK proof
        console.log(`[REGISTER] Generating ZK proof...`);
        const { proof, publicSignals, verified } = await generateProof(identityData, userAddress);

        if (!verified) {
            return res.status(400).json({ error: "Proof verification failed" });
        }

        console.log(`[REGISTER] Proof verified off-chain ✓`);

        // Extract commitment and nullifier
        const commitmentHashHex = BigInt(publicSignals[0]).toString(16).padStart(64, '0');
        const nullifierHex = BigInt(publicSignals[2]).toString(16).padStart(64, '0');

        // Check if user needs prepaid credits
        if (currentDocCount >= 1) {
            // Check if user has prepaid credits
            const creditsCheckTx = new TransactionBuilder(adminAccount, { 
                fee: "100", 
                networkPassphrase: NETWORK_PASSPHRASE 
            })
                .addOperation(
                    Operation.invokeContractFunction({
                        contract: CONTRACT_ID,
                        function: "get_prepaid_credits",
                        args: [new Address(userAddress).toScVal()]
                    })
                )
                .setTimeout(180)
                .build();

            const creditsResult = await server.simulateTransaction(creditsCheckTx);
            const credits = creditsResult.result?.retval?._value ?? 0;

            if (credits === 0) {
                return res.status(402).json({ 
                    error: "Payment required",
                    message: "You need to prepay for additional verifications. Please call /api/prepay first.",
                    requiresPayment: true,
                    docCount: currentDocCount
                });
            }
        }

        // Submit to Soroban (admin signs and submits)
        console.log(`[REGISTER] Submitting to Soroban...`);
        const result = await submitToSoroban(userAddress, commitmentHashHex, nullifierHex, identityData);

        console.log(`[REGISTER] Success! Txn Hash: ${result.hash}`);

        // Helper function to get document type name
        const getDocTypeName = (code) => {
            const types = {
                1: "Aadhaar Card",
                2: "PAN Card",
                3: "Driver's License",
                4: "Passport",
                5: "Other ID"
            };
            return types[parseInt(code)] || "Unknown";
        };

        // Return success response
        res.json({
            success: true,
            txnHash: result.hash,
            commitment: commitmentHashHex,
            nullifier: nullifierHex,
            publicSignals,
            docCount: currentDocCount + 1,
            verifiedAttributes: {
                ageOver18: (identityData.minAge || 18) >= 18,
                ageOver21: (identityData.minAge || 18) >= 21,
                documentType: getDocTypeName(identityData.docType),
                documentTypeCode: identityData.docType,
                genderVerified: parseInt(identityData.genderFilter || 0) !== 0, // Gender verified if genderFilter is set (1=Male only, 2=Female only)
            }
        });

    } catch (error) {
        console.error(`[REGISTER] Error:`, error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack 
        });
    }
});

/**
 * POST /api/register/build-prepay
 * Build unsigned prepayment transaction for user to sign
 * 
 * Body:
 * {
 *   "userAddress": "GXXX..."
 * }
 */
app.post("/api/register/build-prepay", async (req, res) => {
    try {
        const { userAddress } = req.body;

        if (!userAddress) {
            return res.status(400).json({ error: "Missing userAddress" });
        }

        console.log(`[BUILD-PREPAY] Building prepayment transaction for ${userAddress}`);

        const adminKey = Keypair.fromSecret(ADMIN_SECRET);
        const nativeAsset = Asset.native();
        const TOKEN_ADDRESS = nativeAsset.contractId(NETWORK_PASSPHRASE);
        const tokenContract = new Contract(TOKEN_ADDRESS);

        // Get user account
        const userAccount = await server.getAccount(userAddress);

        // Build prepay transaction
        const tx = new TransactionBuilder(userAccount, { 
            fee: "200000", 
            networkPassphrase: NETWORK_PASSPHRASE 
        })
            .addOperation(
                Operation.invokeContractFunction({
                    contract: CONTRACT_ID,
                    function: "prepay_verification",
                    args: [
                        new Address(userAddress).toScVal(),
                        tokenContract.address().toScVal(),
                    ]
                })
            )
            .setTimeout(300)
            .build();

        // Simulate transaction
        const simResult = await server.simulateTransaction(tx);
        if (simResult.error) {
            throw new Error(`Simulation failed: ${simResult.error}`);
        }

        // Prepare transaction and return unsigned XDR
        const preparedTx = await server.prepareTransaction(tx);
        const unsignedXdr = preparedTx.toXDR();

        console.log(`[BUILD-PREPAY] Returning unsigned prepayment transaction`);

        res.json({
            success: true,
            unsignedXdr,
        });

    } catch (error) {
        console.error(`[BUILD-PREPAY] Error:`, error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack 
        });
    }
});

/**
 * POST /api/register/prepay
 * Prepay for future verification (2nd+ documents)
 * 
 * Body:
 * {
 *   "userAddress": "GXXX...",
 *   "signedXdr": "AAAAAgA..." // User-signed prepayment transaction
 * }
 */
app.post("/api/register/prepay", async (req, res) => {
    try {
        const { userAddress, signedXdr } = req.body;

        if (!signedXdr || !userAddress) {
            return res.status(400).json({ error: "Missing signedXdr or userAddress" });
        }

        console.log(`[PREPAY] Submitting prepayment for ${userAddress}`);

        // Parse and submit the signed prepayment transaction
        const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
        const sentTx = await server.sendTransaction(tx);
        
        if (sentTx.errorResult) {
            throw new Error(`Transaction rejected: ${JSON.stringify(sentTx.errorResult)}`);
        }

        // Poll for result
        let status = await server.getTransaction(sentTx.hash);
        let attempts = 0;
        const maxAttempts = 30;
        
        while (status.status === "NOT_FOUND" || status.status === "PENDING") {
            await new Promise(r => setTimeout(r, 2000));
            status = await server.getTransaction(sentTx.hash);
            attempts++;
            
            if (attempts >= maxAttempts) {
                throw new Error("Transaction timeout");
            }
        }
        
        if (status.status !== "SUCCESS") {
            throw new Error(`Transaction failed with status: ${status.status}`);
        }

        console.log(`[PREPAY] Success! Txn Hash: ${sentTx.hash}`);

        res.json({
            success: true,
            txnHash: sentTx.hash,
            message: "Prepayment successful. You can now register additional documents."
        });

    } catch (error) {
        console.error(`[PREPAY] Error:`, error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack 
        });
    }
});

/**
 * GET /api/transaction/:hash
 * Fetch transaction details by hash
 */
app.get("/api/transaction/:hash", async (req, res) => {
    try {
        const { hash } = req.params;
        
        console.log(`[TXN] Fetching transaction: ${hash}`);
        
        const status = await server.getTransaction(hash);
        
        if (status.status === "NOT_FOUND") {
            return res.status(404).json({ error: "Transaction not found" });
        }

        res.json({
            hash,
            status: status.status,
            ledger: status.ledger,
            createdAt: status.createdAt,
            applicationOrder: status.applicationOrder,
            envelopeXdr: status.envelopeXdr,
            resultXdr: status.resultXdr,
            resultMetaXdr: status.resultMetaXdr
        });

    } catch (error) {
        console.error(`[TXN] Error:`, error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/user/:address
 * Get user's on-chain identity information
 */
// UPDATE THE /api/user/:address ENDPOINT in server.js
// Replace the existing endpoint with this:

app.get("/api/user/:address", async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log(`[USER] Fetching info for: ${address}`);

        const adminAccount = await server.getAccount(Keypair.fromSecret(ADMIN_SECRET).publicKey());
        
        // Get identity record (now includes attributes)
        const identityCheckTx = new TransactionBuilder(adminAccount, { 
            fee: "100", 
            networkPassphrase: NETWORK_PASSPHRASE 
        })
            .addOperation(
                Operation.invokeContractFunction({
                    contract: CONTRACT_ID,
                    function: "check_verification",
                    args: [new Address(address).toScVal()]
                })
            )
            .setTimeout(180)
            .build();

        const identityResult = await server.simulateTransaction(identityCheckTx);
        
        // Get document count
        const countCheckTx = new TransactionBuilder(adminAccount, { 
            fee: "100", 
            networkPassphrase: NETWORK_PASSPHRASE 
        })
            .addOperation(
                Operation.invokeContractFunction({
                    contract: CONTRACT_ID,
                    function: "get_user_doc_count",
                    args: [new Address(address).toScVal()]
                })
            )
            .setTimeout(180)
            .build();

        const countResult = await server.simulateTransaction(countCheckTx);

        // Get prepaid credits
        const creditsCheckTx = new TransactionBuilder(adminAccount, { 
            fee: "100", 
            networkPassphrase: NETWORK_PASSPHRASE 
        })
            .addOperation(
                Operation.invokeContractFunction({
                    contract: CONTRACT_ID,
                    function: "get_prepaid_credits",
                    args: [new Address(address).toScVal()]
                })
            )
            .setTimeout(180)
            .build();

        const creditsResult = await server.simulateTransaction(creditsCheckTx);

        if (identityResult.error) {
            return res.status(404).json({ 
                error: "User not verified or identity not found",
                address,
                verified: false
            });
        }

        const docCount = countResult.result?.retval?._value ?? 0;
        const prepaidCredits = creditsResult.result?.retval?._value ?? 0;
        const identityRecord = identityResult.result?.retval;

        // Fetch all document records
        const allDocuments = [];
        for (let i = 0; i < docCount; i++) {
            try {
                const docCheckTx = new TransactionBuilder(adminAccount, { 
                    fee: "100", 
                    networkPassphrase: NETWORK_PASSPHRASE 
                })
                    .addOperation(
                        Operation.invokeContractFunction({
                            contract: CONTRACT_ID,
                            function: "get_document",
                            args: [
                                new Address(address).toScVal(),
                                xdr.ScVal.scvU32(i)
                            ]
                        })
                    )
                    .setTimeout(180)
                    .build();

                const docResult = await server.simulateTransaction(docCheckTx);
                
                if (!docResult.error && docResult.result?.retval) {
                    // Parse this document's attributes
                    const docRecord = docResult.result.retval;
                    let docCommitmentHash = null;
                    let docTimestamp = null;
                    let docAttributes = null;

                    if (docRecord && docRecord._value) {
                        const recordMap = docRecord._value;
                        
                        if (Array.isArray(recordMap)) {
                            for (const entry of recordMap) {
                                const key = entry._attributes?.key?._value?.toString();
                                const val = entry._attributes?.val;
                                
                                if (key === 'commitment_hash') {
                                    docCommitmentHash = val._value?.toString('hex');
                                } else if (key === 'timestamp') {
                                    docTimestamp = val._value?.toString();
                                } else if (key === 'attributes_verified') {
                                    const attrMap = val._value;
                                    if (Array.isArray(attrMap)) {
                                        docAttributes = {};
                                        for (const attrEntry of attrMap) {
                                            const attrKey = attrEntry._attributes?.key?._value?.toString();
                                            const attrVal = attrEntry._attributes?.val;
                                            
                                            if (attrKey === 'age_over_18') {
                                                docAttributes.ageOver18 = attrVal._value === true;
                                            } else if (attrKey === 'age_over_21') {
                                                docAttributes.ageOver21 = attrVal._value === true;
                                            } else if (attrKey === 'document_type') {
                                                const docTypeCode = attrVal._value;
                                                docAttributes.documentTypeCode = docTypeCode;
                                                const docTypes = {
                                                    1: "Aadhaar Card",
                                                    2: "PAN Card",
                                                    3: "Driver's License",
                                                    4: "Passport",
                                                    5: "Other ID"
                                                };
                                                docAttributes.documentType = docTypes[docTypeCode] || "Unknown";
                                            } else if (attrKey === 'gender_verified') {
                                                docAttributes.genderVerified = attrVal._value === true;
                                            } else if (attrKey === 'verification_date') {
                                                docAttributes.verificationDate = attrVal._value?.toString();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    allDocuments.push({
                        index: i,
                        commitmentHash: docCommitmentHash,
                        timestamp: docTimestamp,
                        attributes: docAttributes
                    });
                }
            } catch (e) {
                console.error(`[USER] Error fetching document ${i}:`, e);
            }
        }

        // Parse the identity record (IdentityRecord struct)
        let commitmentHash = null;
        let timestamp = null;
        let attributes = null;

        if (identityRecord && identityRecord._value) {
            try {
                const recordMap = identityRecord._value;
                
                if (Array.isArray(recordMap)) {
                    for (const entry of recordMap) {
                        const key = entry._attributes?.key?._value?.toString();
                        const val = entry._attributes?.val;
                        
                        if (key === 'commitment_hash') {
                            commitmentHash = val._value?.toString('hex');
                        } else if (key === 'timestamp') {
                            timestamp = val._value?.toString();
                        } else if (key === 'attributes_verified') {
                            // Parse VerifiedAttributes struct
                            const attrMap = val._value;
                            if (Array.isArray(attrMap)) {
                                attributes = {};
                                for (const attrEntry of attrMap) {
                                    const attrKey = attrEntry._attributes?.key?._value?.toString();
                                    const attrVal = attrEntry._attributes?.val;
                                    
                                    if (attrKey === 'age_over_18') {
                                        attributes.ageOver18 = attrVal._value === true;
                                    } else if (attrKey === 'age_over_21') {
                                        attributes.ageOver21 = attrVal._value === true;
                                    } else if (attrKey === 'document_type') {
                                        const docTypeCode = attrVal._value;
                                        attributes.documentTypeCode = docTypeCode;
                                        // Map document type code to name
                                        const docTypes = {
                                            1: "Aadhaar Card",
                                            2: "PAN Card",
                                            3: "Driver's License",
                                            4: "Passport",
                                            5: "Other ID"
                                        };
                                        attributes.documentType = docTypes[docTypeCode] || "Unknown";
                                    } else if (attrKey === 'gender_verified') {
                                        attributes.genderVerified = attrVal._value === true;
                                    } else if (attrKey === 'verification_date') {
                                        attributes.verificationDate = attrVal._value?.toString();
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[USER] Error parsing identity record:', e);
            }
        }

        res.json({
            address,
            verified: true,
            docCount,
            prepaidCredits,
            commitmentHash,
            timestamp,
            attributes,  // Latest verification attributes
            documents: allDocuments,  // All documents
            rawIdentityRecord: identityRecord
        });

    } catch (error) {
        console.error(`[USER] Error:`, error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        contractId: CONTRACT_ID,
        network: "testnet",
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/generate-proof
 * Generate and verify ZK proof without submitting to chain (for testing)
 */
app.post("/api/generate-proof", async (req, res) => {
    try {
        const { userAddress, identityData } = req.body;

        if (!userAddress || !identityData) {
            return res.status(400).json({ error: "Missing userAddress or identityData" });
        }

        console.log(`[PROOF] Generating proof for ${userAddress}`);

        const { proof, publicSignals, verified } = await generateProof(identityData, userAddress);

        const commitmentHashHex = BigInt(publicSignals[0]).toString(16).padStart(64, '0');
        const nullifierHex = BigInt(publicSignals[2]).toString(16).padStart(64, '0');

        res.json({
            verified,
            commitment: commitmentHashHex,
            nullifier: nullifierHex,
            publicSignals,
            proof
        });

    } catch (error) {
        console.error(`[PROOF] Error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// --- START SERVER ---

if (!ADMIN_SECRET) {
    console.error("❌ ADMIN_SECRET environment variable is required!");
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         🔐 ZK Identity Verification Server                 ║
╠════════════════════════════════════════════════════════════╣
║  Status:      ✅ Running                                   ║
║  Port:        ${PORT}                                      ║
║  Network:     Stellar Testnet                              ║
║  Contract:    ${CONTRACT_ID.substring(0, 10)}...           ║
║  RPC:         ${RPC_URL}                                   ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║  • POST   /api/register          - Register identity       ║
║  • GET    /api/user/:address     - Get user info           ║
║  • GET    /api/transaction/:hash - Get transaction         ║
║  • POST   /api/generate-proof    - Generate proof only     ║
║  • GET    /api/health            - Health check            ║
╚════════════════════════════════════════════════════════════╝
    `);
});
