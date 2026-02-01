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
    UserIdentity(Address),      // Latest identity record (for backward compatibility)
    UserDocument(Address, u32),  // All documents indexed by number
    UserDocCount(Address),       // Track how many docs a user has verified
    UserPrepaidCredits(Address), // Track prepaid credits for future verifications
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

    /// NEW: User prepays for future verification (called by user before their 2nd+ doc)
    /// This allows users to pay in advance in a separate transaction
    pub fn prepay_verification(
        env: Env,
        user: Address,
        token_address: Address,
    ) {
        // User must authorize this payment
        user.require_auth();

        // Get current prepaid credits
        let credits_key = StorageKey::UserPrepaidCredits(user.clone());
        let mut credits: u32 = env.storage().persistent()
            .get(&credits_key)
            .unwrap_or(0);

        // Transfer payment from user to admin
        let admin: Address = env.storage().instance()
            .get(&StorageKey::Admin)
            .unwrap();
        
        let token = token::Client::new(&env, &token_address);
        token.transfer(&user, &admin, &PAYMENT_AMOUNT);

        // Increment prepaid credits
        credits += 1;
        env.storage().persistent().set(&credits_key, &credits);
        env.storage().persistent().extend_ttl(&credits_key, 5184000, 5184000);

        // Emit event
        env.events().publish(
            (symbol_short!("PREPAID"), user.clone()),
            credits
        );
    }

    /// Register Identity (Admin Gated - Uses prepaid credits)
    /// 
    /// This function performs a "Hybrid Verification":
    /// 1. Admin has verified the ZK Proof off-chain
    /// 2. Admin authorizes this call (only admin signature needed)
    /// 3. For 2nd+ documents, we consume a prepaid credit instead of charging in-transaction
    pub fn register_verified_identity(
        env: Env,
        admin: Address,         // The Admin approving this
        user: Address,          // The User getting verified
        commitment_hash: BytesN<32>, // The Public ID from the ZK circuit
        nullifier: BytesN<32>,
        // Attribute metadata (from ZK proof public signals)
        min_age_verified: u32,   // The minimum age that was proven (e.g., 18, 21)
        document_type: u32,      // What type of document was used (1-5)
        gender_verified: bool,   // Was gender verification required?
    ) {
        // 1. ADMIN AUTH (The "Gatekeeper")
        let stored_admin: Address = env.storage().instance().get(&StorageKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized: Admin address mismatch");
        }
        admin.require_auth(); // Only admin needs to sign this transaction

        // Check nullifier hasn't been used
        let null_key = StorageKey::NullifierUsed(nullifier.clone());
        if env.storage().persistent().has(&null_key) {
            panic!("This identity has already been registered");
        }
        env.storage().persistent().set(&null_key, &true);
        env.storage().persistent().extend_ttl(&null_key, 5184000, 5184000);

        // 2. PAYMENT LOGIC (Check prepaid credits for 2nd+ doc)
        let doc_count_key = StorageKey::UserDocCount(user.clone());
        let mut count: u32 = env.storage().persistent()
            .get(&doc_count_key)
            .unwrap_or(0);

        if count >= 1 {
            // Not the first document - consume a prepaid credit
            let credits_key = StorageKey::UserPrepaidCredits(user.clone());
            let mut credits: u32 = env.storage().persistent()
                .get(&credits_key)
                .unwrap_or(0);

            if credits == 0 {
                panic!("No prepaid credits available. User must call prepay_verification first.");
            }

            // Consume one credit
            credits -= 1;
            env.storage().persistent().set(&credits_key, &credits);
            env.storage().persistent().extend_ttl(&credits_key, 5184000, 5184000);
        }

        // Increment doc count
        count += 1;
        env.storage().persistent().set(&doc_count_key, &count);
        env.storage().persistent().extend_ttl(&doc_count_key, 5184000, 5184000);

        // 4. CREATE ATTRIBUTE RECORD
        let attributes = VerifiedAttributes {
            age_over_18: min_age_verified >= 18,
            age_over_21: min_age_verified >= 21,
            document_type,
            gender_verified,
            verification_date: env.ledger().timestamp(),
        };

        // 5. STORAGE - Store in both indexed location and as latest
        let record = IdentityRecord {
            commitment_hash: commitment_hash.clone(),
            timestamp: env.ledger().timestamp(),
            attributes_verified: attributes,
        };
        
        // Store as indexed document (doc_count is 0-indexed)
        let doc_index = count - 1;
        let user_doc_key = StorageKey::UserDocument(user.clone(), doc_index);
        env.storage().persistent().set(&user_doc_key, &record);
        env.storage().persistent().extend_ttl(&user_doc_key, 5184000, 5184000);
        
        // Also store as latest identity (for backward compatibility)
        let user_identity_key = StorageKey::UserIdentity(user.clone());
        env.storage().persistent().set(&user_identity_key, &record);
        env.storage().persistent().extend_ttl(&user_identity_key, 5184000, 5184000);
        
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
    
    /// Get a specific document by index (0-based)
    pub fn get_document(env: Env, user: Address, doc_index: u32) -> Option<IdentityRecord> {
        env.storage().persistent().get(&StorageKey::UserDocument(user, doc_index))
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

    /// NEW: Check how many prepaid credits a user has
    pub fn get_prepaid_credits(env: Env, user: Address) -> u32 {
        env.storage().persistent()
            .get(&StorageKey::UserPrepaidCredits(user))
            .unwrap_or(0)
    }

    /// NEW: Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&StorageKey::Admin).unwrap()
    }
}