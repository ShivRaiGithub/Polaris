pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * Universal Identity Verifier (Protocol 25 - Secure Binding)
 * Supports: Aadhar (1), PAN (2), DL (3), Passport (4)
 * Verifies: Name, DOB, Gender
 * Security: Binds proof to specific Stellar Wallet Address
 */

template IdentityVerifier() {
    // ========== PRIVATE INPUTS (Hidden) ==========
    signal input name_hash;        // Poseidon hash of user's name
    signal input dob_year;         // YYYY
    signal input dob_month;        // 1-12
    signal input dob_day;          // 1-31
    signal input gender;           // 1=Male, 2=Female, 3=Other
    signal input document_type;    // 1=Aadhar, 2=PAN, 3=DL, 4=Passport
    signal input document_id_hash; // Hash of the ID string
    signal input secret_salt;      // User's secret randomness

    // ========== PUBLIC INPUTS (Visible constraints) ==========
    signal input current_year;
    signal input current_month;
    signal input current_day;
    signal input min_age_requirement; // e.g., 18
    signal input gender_filter;       // 0=Any, 1=M, 2=F, 3=O
    
    // NEW: Wallet Binding (Split 256-bit address into two 128-bit chunks)
    signal input wallet_addr_low;  
    signal input wallet_addr_high; 

    // ========== OUTPUTS ==========
    signal output commitment_hash;     // The public "User ID"
    signal output verification_passed; // Must be 1
    
    // NEW: Nullifier to prevent replay attacks on this specific wallet
    signal output nullifier; 

    // ========== 1. AGE VERIFICATION ==========
    var DAYS_PER_YEAR = 365;

    signal year_diff <== (current_year - dob_year) * DAYS_PER_YEAR;
    signal month_diff <== (current_month - dob_month) * 30;
    signal day_diff <== current_day - dob_day;
    
    signal age_in_days <== year_diff + month_diff + day_diff;
    signal min_age_in_days <== min_age_requirement * DAYS_PER_YEAR;

    component age_check = GreaterEqThan(32);
    age_check.in[0] <== age_in_days;
    age_check.in[1] <== min_age_in_days;
    
    // ========== 2. GENDER VERIFICATION ==========
    component gender_eq = IsEqual();
    gender_eq.in[0] <== gender;
    gender_eq.in[1] <== gender_filter;

    component filter_is_zero = IsZero();
    filter_is_zero.in <== gender_filter;

    signal gender_check_passed;
    gender_check_passed <== filter_is_zero.out + (1 - filter_is_zero.out) * gender_eq.out;

    // ========== 3. DOCUMENT TYPE VALIDATION ==========
    component doc_lower = GreaterEqThan(4);
    doc_lower.in[0] <== document_type;
    doc_lower.in[1] <== 1;

    component doc_upper = LessEqThan(4);
    doc_upper.in[0] <== document_type;
    doc_upper.in[1] <== 4;

    signal doc_type_valid <== doc_lower.out * doc_upper.out;

    // ========== 4. COMMITMENT GENERATION ==========
    // Commit to: Name, DOB, Gender, DocType, DocID, Salt
    component poseidon = Poseidon(8);
    poseidon.inputs[0] <== name_hash;
    poseidon.inputs[1] <== dob_year;
    poseidon.inputs[2] <== dob_month;
    poseidon.inputs[3] <== dob_day;
    poseidon.inputs[4] <== gender;
    poseidon.inputs[5] <== document_type;
    poseidon.inputs[6] <== document_id_hash;
    poseidon.inputs[7] <== secret_salt;

    commitment_hash <== poseidon.out;

    // ========== 5. WALLET BINDING (NULLIFIER) ==========
    // Generate a unique nullifier by mixing the Secret Salt with the Wallet Address.
    // If someone tries to reuse this proof with a different wallet address,
    // the nullifier would be different (or the proof invalid).
    
    component nullifier_hasher = Poseidon(3);
    nullifier_hasher.inputs[0] <== secret_salt;
    nullifier_hasher.inputs[1] <== wallet_addr_low;
    nullifier_hasher.inputs[2] <== wallet_addr_high;
    
    nullifier <== nullifier_hasher.out;

    // ========== FINAL CHECK ==========
    signal all_checks_passed;
    signal checks_step_1 <== age_check.out * gender_check_passed;
    all_checks_passed <== checks_step_1 * doc_type_valid;

    verification_passed <== all_checks_passed;
    
    verification_passed === 1;
}

// Updated Public Inputs List
component main {public [
    current_year, 
    current_month, 
    current_day, 
    min_age_requirement, 
    gender_filter,
    wallet_addr_low, 
    wallet_addr_high
]} = IdentityVerifier();