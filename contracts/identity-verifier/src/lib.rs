#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, 
    token, Address, BytesN, Env
};

// ===========================================================================
// CONSTANTS & TYPES
// ===========================================================================

// 30 XLM (7 decimals)
const PAYMENT_AMOUNT: i128 = 300_000_000; 

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IdentityRecord {
    pub commitment_hash: BytesN<32>,
    pub timestamp: u64,
    pub attributes_verified: VerifiedAttributes,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerifiedAttributes {
    pub age_over_18: bool,
    pub age_over_21: bool,
    pub document_type: u32,  // 1=Passport, 2=PAN, 3=DL, 4=Aadhaar, 5=Other
    pub gender_verified: bool,
    pub verification_date: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    Admin,
    UserIdentity(Address), 
    UserDocCount(Address), // Track how many docs a user has verified
    TotalVerifications,
    NullifierUsed(BytesN<32>)
}

// ===========================================================================
// CONTRACT
// ===========================================================================

#[contract]
pub struct UniversalVerifier;

#[contractimpl]
impl UniversalVerifier {

    /// Initialize the contract with the Admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&StorageKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&StorageKey::Admin, &admin);
    }

    /// Register Identity (Admin Gated + User Payment + Attribute Tracking)
    /// 
    /// This function performs a "Hybrid Verification":
    /// 1. We assume the Admin has ALREADY verified the ZK Proof off-chain.
    /// 2. We strictly enforce that the Admin authorizes this call.
    /// 3. We enforce the 30 XLM payment logic for the user.
    /// 4. We store what attributes were verified (age, document type, gender)
    pub fn register_verified_identity(
        env: Env,
        admin: Address,         // The Admin approving this
        user: Address,          // The User getting verified
        commitment_hash: BytesN<32>, // The Public ID from the ZK circuit
        nullifier: BytesN<32>,
        token_address: Address,  // The XLM Contract Address
        // NEW: What was verified
        min_age_verified: u32,   // The minimum age that was proven (e.g., 18, 21)
        document_type: u32,      // What type of document was used (1-5)
        gender_verified: bool,   // Was gender verification required?
    ) {
        // 1. ADMIN AUTH (The "Gatekeeper")
        let stored_admin: Address = env.storage().instance().get(&StorageKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized: Admin address mismatch");
        }
        admin.require_auth();

        // Check nullifier hasn't been used
        let null_key = StorageKey::NullifierUsed(nullifier.clone());
        if env.storage().persistent().has(&null_key) {
            panic!("This identity has already been registered");
        }
        env.storage().persistent().set(&null_key, &true);
        env.storage().persistent().extend_ttl(&null_key, 5184000, 5184000); // ~60 days

        // 2. PAYMENT LOGIC (30 XLM for 2nd+ Doc)
        let mut count: u32 = env.storage().persistent()
            .get(&StorageKey::UserDocCount(user.clone()))
            .unwrap_or(0);

        if count >= 1 {
            // Not the first document. Charge the user.
            let token = token::Client::new(&env, &token_address);
            token.transfer(&user, &admin, &PAYMENT_AMOUNT);
        }

        // Increment doc count
        count += 1;
        let doc_count_key = StorageKey::UserDocCount(user.clone());
        env.storage().persistent().set(&doc_count_key, &count);
        env.storage().persistent().extend_ttl(&doc_count_key, 5184000, 5184000); // ~60 days

        // 3. CREATE ATTRIBUTE RECORD
        let attributes = VerifiedAttributes {
            age_over_18: min_age_verified >= 18,
            age_over_21: min_age_verified >= 21,
            document_type,
            gender_verified,
            verification_date: env.ledger().timestamp(),
        };

        // 4. STORAGE
        let record = IdentityRecord {
            commitment_hash: commitment_hash.clone(),
            timestamp: env.ledger().timestamp(),
            attributes_verified: attributes,
        };
        
        let user_identity_key = StorageKey::UserIdentity(user.clone());
        env.storage().persistent().set(&user_identity_key, &record);
        env.storage().persistent().extend_ttl(&user_identity_key, 5184000, 5184000); // ~60 days
        
        // Update stats
        let total: u32 = env.storage().instance()
            .get(&StorageKey::TotalVerifications).unwrap_or(0);
        env.storage().instance().set(&StorageKey::TotalVerifications, &(total + 1));

        // Emit Event
        env.events().publish(
            (symbol_short!("VERIFIED"), user),
            commitment_hash
        );
    }

    /// Check if a user is verified and get their attributes
    pub fn check_verification(env: Env, user: Address) -> Option<IdentityRecord> {
        env.storage().persistent().get(&StorageKey::UserIdentity(user))
    }
    
    /// Check specific attributes
    pub fn check_age_over_18(env: Env, user: Address) -> bool {
        let record: Option<IdentityRecord> = env.storage().persistent()
            .get(&StorageKey::UserIdentity(user));
        match record {
            Some(r) => r.attributes_verified.age_over_18,
            None => false,
        }
    }

    pub fn check_age_over_21(env: Env, user: Address) -> bool {
        let record: Option<IdentityRecord> = env.storage().persistent()
            .get(&StorageKey::UserIdentity(user));
        match record {
            Some(r) => r.attributes_verified.age_over_21,
            None => false,
        }
    }

    pub fn get_document_type(env: Env, user: Address) -> Option<u32> {
        let record: Option<IdentityRecord> = env.storage().persistent()
            .get(&StorageKey::UserIdentity(user));
        record.map(|r| r.attributes_verified.document_type)
    }
    
    /// Check how many documents a user has verified
    pub fn get_user_doc_count(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&StorageKey::UserDocCount(user)).unwrap_or(0)
    }
}