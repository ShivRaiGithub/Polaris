#!/bin/bash

# ========================================
# Universal Verifier: Build + Deploy + Initialize
# ========================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Universal ZK Verifier Deployment      ${NC}"
echo -e "${BLUE}=========================================${NC}"

# 1. LOAD CONFIGURATION
# ---------------------
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

source .env

# Default to testnet if not set
NETWORK="${NETWORK:-testnet}"
# Use ADMIN_SECRET or fallback to ADMIN or USER_SECRET
SOURCE_SECRET="${ADMIN_SECRET:-${ADMIN:-$USER_SECRET}}"

if [ -z "$SOURCE_SECRET" ]; then
    echo -e "${RED}Error: No secret key found in .env (ADMIN_SECRET/ADMIN/USER_SECRET)${NC}"
    exit 1
fi

# 2. CHECK PREREQUISITES
# ----------------------
if ! command -v stellar &> /dev/null; then
    if command -v soroban &> /dev/null; then
        echo -e "${YELLOW}Note: Using 'soroban' CLI instead of 'stellar' CLI${NC}"
        CLI="soroban"
    else
        echo -e "${RED}Error: Stellar/Soroban CLI not installed${NC}"
        exit 1
    fi
else
    CLI="stellar"
fi

echo -e "${GREEN}✓ Using CLI: $CLI${NC}"

# Check if Node.js is available for initialization
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js not installed (needed for initialization)${NC}"
    exit 1
fi

# 3. BUILD
# --------
echo -e "${BLUE}Building contract...${NC}"

# Ensure target exists
rustup target add wasm32-unknown-unknown

# Enter contract directory
cd contracts/identity-verifier

# Build with optimization
echo -e "${BLUE}Building and optimizing contract...${NC}"
cargo build --target wasm32-unknown-unknown --release

WASM_FILE="target/wasm32-unknown-unknown/release/universal_verifier.wasm"

if [ ! -f "$WASM_FILE" ]; then
    echo -e "${RED}Error: Build failed. Could not find $WASM_FILE${NC}"
    echo "Check if package name in Cargo.toml is 'universal_verifier'"
    echo "Available WASM files:"
    ls -la target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || echo "No WASM files found"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"

# 4. OPTIMIZE (optional but recommended)
# --------------------------------------
if command -v stellar &> /dev/null; then
    echo -e "${BLUE}Optimizing WASM...${NC}"
    stellar contract optimize --wasm "$WASM_FILE"
    
    # Check for optimized file
    OPTIMIZED_WASM="target/wasm32-unknown-unknown/release/universal_verifier.optimized.wasm"
    if [ -f "$OPTIMIZED_WASM" ]; then
        WASM_FILE="$OPTIMIZED_WASM"
        echo -e "${GREEN}✓ Using optimized WASM${NC}"
    fi
fi

# 5. DEPLOY
# ---------
echo -e "${BLUE}Deploying to $NETWORK...${NC}"

# Deploy command
if [ "$CLI" == "stellar" ]; then
    CMD="stellar contract deploy"
else
    CMD="soroban contract deploy"
fi

CONTRACT_ID=$($CMD \
    --wasm "$WASM_FILE" \
    --source "$SOURCE_SECRET" \
    --network "$NETWORK" \
     --network-passphrase "Test SDF Network ; September 2015")

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}Error: Deployment failed - no contract ID returned${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Contract ID: ${YELLOW}$CONTRACT_ID${NC}"

# 6. UPDATE .ENV
# --------------
cd ../..  # Back to project root

# Remove old ID if exists
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '/^CONTRACT_ID=/d' .env
else
    sed -i '/^CONTRACT_ID=/d' .env
fi

# Append new ID
echo "CONTRACT_ID=$CONTRACT_ID" >> .env
echo -e "${BLUE}Updated .env with new CONTRACT_ID${NC}"

# 7. GENERATE DEPLOY REPORT
# -------------------------
cat > deployment.json << EOF
{
  "contract_id": "$CONTRACT_ID",
  "network": "$NETWORK",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed": true,
  "initialized": false
}
EOF

echo -e "${GREEN}Saved deployment details to deployment.json${NC}"

# 8. INITIALIZE CONTRACT
# ----------------------
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Initializing Contract                 ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Create temporary initialization script
cat > /tmp/init-contract.js << 'EOFINIT'
const { 
    Keypair, Operation, TransactionBuilder, 
    Networks, Address, rpc 
} = require("@stellar/stellar-sdk");

const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = process.env.CONTRACT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN || process.env.USER_SECRET;

async function initialize() {
    if (!CONTRACT_ID) {
        throw new Error("CONTRACT_ID not set");
    }
    if (!ADMIN_SECRET) {
        throw new Error("ADMIN_SECRET not set");
    }

    const adminKey = Keypair.fromSecret(ADMIN_SECRET);
    const server = new rpc.Server(RPC_URL);

    console.log("🔧 Initializing Contract...");
    console.log("   Contract ID:", CONTRACT_ID);
    console.log("   Admin:", adminKey.publicKey());

    const adminAccount = await server.getAccount(adminKey.publicKey());
    
    const tx = new TransactionBuilder(adminAccount, { 
        fee: "100000", 
        networkPassphrase: NETWORK_PASSPHRASE 
    })
        .addOperation(
            Operation.invokeContractFunction({
                contract: CONTRACT_ID,
                function: "initialize",
                args: [new Address(adminKey.publicKey()).toScVal()]
            })
        )
        .setTimeout(180)
        .build();

    // Simulate first
    console.log("🧪 Simulating initialization...");
    const simResult = await server.simulateTransaction(tx);
    if (simResult.error) {
        console.error("❌ Simulation failed:", simResult.error);
        throw new Error("Initialization simulation failed");
    }
    console.log("✅ Simulation successful");

    // Prepare and sign
    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(adminKey);

    // Send transaction
    const sentTx = await server.sendTransaction(preparedTx);
    console.log("⏳ Transaction Sent. Hash:", sentTx.hash);

    // Check for errors
    if (sentTx.errorResult) {
        console.error("❌ Transaction rejected:", sentTx.errorResult);
        throw new Error("Transaction rejected by network");
    }

    // Poll for result
    let status = await server.getTransaction(sentTx.hash);
    let attempts = 0;
    const maxAttempts = 30;
    
    while (status.status === "NOT_FOUND" || status.status === "PENDING") {
        await new Promise(r => setTimeout(r, 2000));
        status = await server.getTransaction(sentTx.hash);
        attempts++;
        console.log(`   Polling attempt ${attempts}/${maxAttempts} - Status: ${status.status}`);
        
        if (attempts >= maxAttempts) {
            throw new Error("Transaction timeout");
        }
    }
    
    if (status.status === "SUCCESS") {
        console.log("🎉 Contract Initialized Successfully!");
        console.log("   Transaction Hash:", sentTx.hash);
        return sentTx.hash;
    } else {
        console.error("❌ Transaction failed:", status);
        throw new Error("Initialization failed");
    }
}

initialize()
    .then(hash => {
        console.log("\n✅ INITIALIZATION COMPLETE");
        process.exit(0);
    })
    .catch(err => {
        console.error("\n❌ INITIALIZATION FAILED:", err.message);
        process.exit(1);
    });
EOFINIT

# Run initialization
export CONTRACT_ID
export ADMIN_SECRET="$SOURCE_SECRET"
export RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org:443}"

if NODE_PATH="$(pwd)/node_modules" node /tmp/init-contract.js; then
    echo -e "${GREEN}✓ Initialization successful${NC}"
    
    # Update deployment.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/"initialized": false/"initialized": true/' deployment.json
    else
        sed -i 's/"initialized": false/"initialized": true/' deployment.json
    fi
else
    echo -e "${RED}✗ Initialization failed${NC}"
    echo -e "${YELLOW}Contract deployed but not initialized${NC}"
    echo -e "${YELLOW}Run 'node scripts/initialize-contract.js' manually${NC}"
    exit 1
fi

# Clean up
rm /tmp/init-contract.js

# 9. FINAL SUMMARY
# ----------------
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Contract ID: ${YELLOW}$CONTRACT_ID${NC}"
echo -e "Network:     ${YELLOW}$NETWORK${NC}"
echo -e "Status:      ${GREEN}Deployed & Initialized${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Update your frontend/backend with new CONTRACT_ID"
echo -e "  2. Test the contract: node test-contract.js"
echo -e "  3. Start your server: node server.js"
echo ""