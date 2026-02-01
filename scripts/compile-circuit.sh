#!/bin/bash

# ========================================
# Circom Circuit Compilation Script
# ========================================
# This script compiles the identity verifier circuit
# and generates the proving and verification keys
# using Groth16 proof system.
# ========================================

set -e  # Exit on error

echo "========================================="
echo "ZK Identity Verifier - Circuit Compilation"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
CIRCUIT_DIR="./circuits"
COMPILED_DIR="$CIRCUIT_DIR/compiled"
PTAU_DIR="$CIRCUIT_DIR/ptau"
NODE_MODULES_DIR="./node_modules"

# Circuit file
CIRCUIT_NAME="identity_verifier"
CIRCUIT_FILE="$CIRCUIT_DIR/${CIRCUIT_NAME}.circom"

# Create necessary directories
mkdir -p "$COMPILED_DIR"
mkdir -p "$PTAU_DIR"

echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo -e "${RED}Error: circom is not installed${NC}"
    echo "Please install circom: https://docs.circom.io/getting-started/installation/"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}Error: snarkjs is not installed${NC}"
    echo "Please install snarkjs: npm install -g snarkjs"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# ========================================
# Step 1.5: Install circomlib
# ========================================

echo -e "${BLUE}Step 1.5: Installing circomlib...${NC}"

if [ ! -d "$NODE_MODULES_DIR/circomlib" ]; then
    echo "Installing circomlib via npm..."
    npm install circomlib
else
    echo "circomlib already installed"
fi

echo -e "${GREEN}✓ circomlib ready${NC}"

# ========================================
# Step 2: Compile the circuit
# ========================================

echo -e "${BLUE}Step 2: Compiling circuit...${NC}"

# Use -l flag to specify library path (no line breaks in command)
circom "$CIRCUIT_FILE" --r1cs --wasm --sym --c -l "$NODE_MODULES_DIR" -o "$COMPILED_DIR"

echo -e "${GREEN}✓ Circuit compiled${NC}"

# Move WASM file to correct location
if [ -f "$COMPILED_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" ]; then
    cp "$COMPILED_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "$COMPILED_DIR/"
    echo -e "${GREEN}✓ WASM file copied${NC}"
fi

# ========================================
# Step 3: Circuit information
# ========================================

echo -e "${BLUE}Step 3: Gathering circuit information...${NC}"

snarkjs r1cs info "$COMPILED_DIR/${CIRCUIT_NAME}.r1cs"

snarkjs r1cs print "$COMPILED_DIR/${CIRCUIT_NAME}.r1cs" "$COMPILED_DIR/${CIRCUIT_NAME}.sym" > "$COMPILED_DIR/circuit_info.txt"

echo -e "${GREEN}✓ Circuit info generated${NC}"

# ========================================
# Step 4: Download Powers of Tau
# ========================================

PTAU_FILE="$PTAU_DIR/powersOfTau28_hez_final_12.ptau"

if [ ! -f "$PTAU_FILE" ]; then
    echo -e "${BLUE}Step 4: Downloading Powers of Tau ceremony file...${NC}"
    echo "This file is ~47MB and only needs to be downloaded once"
    
    # Try multiple sources
    echo -e "${YELLOW}Trying Google Cloud Storage...${NC}"
    if wget -O "$PTAU_FILE" https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau 2>/dev/null; then
        echo -e "${GREEN}✓ Downloaded from Google Cloud Storage${NC}"
    else
        echo -e "${YELLOW}Google Cloud failed, trying alternative source...${NC}"
        
        # Alternative: Generate it locally (takes longer but always works)
        echo -e "${YELLOW}Generating Powers of Tau locally (this will take 2-5 minutes)...${NC}"
        snarkjs powersoftau new bn128 12 "$PTAU_DIR/pot12_0000.ptau" -v
        snarkjs powersoftau contribute "$PTAU_DIR/pot12_0000.ptau" "$PTAU_DIR/pot12_0001.ptau" --name="First contribution" -v -e="$(openssl rand -hex 32)"
        snarkjs powersoftau beacon "$PTAU_DIR/pot12_0001.ptau" "$PTAU_DIR/pot12_beacon.ptau" 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
        snarkjs powersoftau prepare phase2 "$PTAU_DIR/pot12_beacon.ptau" "$PTAU_FILE" -v
        
        # Clean up intermediate files
        rm -f "$PTAU_DIR/pot12_0000.ptau" "$PTAU_DIR/pot12_0001.ptau" "$PTAU_DIR/pot12_beacon.ptau"
        
        echo -e "${GREEN}✓ Powers of Tau generated locally${NC}"
    fi
else
    echo -e "${GREEN}✓ Powers of Tau file already exists${NC}"
fi

# Verify the ptau file
echo -e "${BLUE}Verifying Powers of Tau file...${NC}"
if snarkjs powersoftau verify "$PTAU_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Powers of Tau file verified${NC}"
else
    echo -e "${RED}Powers of Tau verification failed. Regenerating...${NC}"
    rm -f "$PTAU_FILE"
    # Regenerate
    snarkjs powersoftau new bn128 12 "$PTAU_DIR/pot12_0000.ptau" -v
    snarkjs powersoftau contribute "$PTAU_DIR/pot12_0000.ptau" "$PTAU_DIR/pot12_0001.ptau" --name="First contribution" -v -e="$(openssl rand -hex 32)"
    snarkjs powersoftau beacon "$PTAU_DIR/pot12_0001.ptau" "$PTAU_DIR/pot12_beacon.ptau" 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
    snarkjs powersoftau prepare phase2 "$PTAU_DIR/pot12_beacon.ptau" "$PTAU_FILE" -v
    rm -f "$PTAU_DIR/pot12_0000.ptau" "$PTAU_DIR/pot12_0001.ptau" "$PTAU_DIR/pot12_beacon.ptau"
fi

# ========================================
# Step 5: Generate Groth16 proving key
# ========================================

echo -e "${BLUE}Step 5: Generating Groth16 proving key (zkey)...${NC}"
echo "This may take a few minutes..."

# Generate initial zkey
snarkjs groth16 setup "$COMPILED_DIR/${CIRCUIT_NAME}.r1cs" "$PTAU_FILE" "$COMPILED_DIR/${CIRCUIT_NAME}_0000.zkey"

echo -e "${GREEN}✓ Initial zkey generated${NC}"

# ========================================
# Step 6: Contribute to Phase 2 ceremony
# ========================================

echo -e "${BLUE}Step 6: Contributing to Phase 2 ceremony...${NC}"

# Contribute with a random beacon
snarkjs zkey contribute "$COMPILED_DIR/${CIRCUIT_NAME}_0000.zkey" "$COMPILED_DIR/${CIRCUIT_NAME}_0001.zkey" --name="First contribution" -v -e="$(openssl rand -hex 32)"

echo -e "${GREEN}✓ Phase 2 contribution completed${NC}"

# ========================================
# Step 7: Apply random beacon
# ========================================

echo -e "${BLUE}Step 7: Applying random beacon...${NC}"

snarkjs zkey beacon "$COMPILED_DIR/${CIRCUIT_NAME}_0001.zkey" "$COMPILED_DIR/${CIRCUIT_NAME}_final.zkey" 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

echo -e "${GREEN}✓ Random beacon applied${NC}"

# ========================================
# Step 8: Verify the zkey
# ========================================

echo -e "${BLUE}Step 8: Verifying final zkey...${NC}"

snarkjs zkey verify "$COMPILED_DIR/${CIRCUIT_NAME}.r1cs" "$PTAU_FILE" "$COMPILED_DIR/${CIRCUIT_NAME}_final.zkey"

echo -e "${GREEN}✓ Zkey verified${NC}"

# ========================================
# Step 9: Export verification key
# ========================================

echo -e "${BLUE}Step 9: Exporting verification key...${NC}"

snarkjs zkey export verificationkey "$COMPILED_DIR/${CIRCUIT_NAME}_final.zkey" "$COMPILED_DIR/verification_key.json"

echo -e "${GREEN}✓ Verification key exported${NC}"

# ========================================
# Step 10: Export for Soroban
# ========================================

echo -e "${BLUE}Step 10: Exporting verification key for Soroban...${NC}"

# Export as Solidity verifier (we'll adapt for Soroban)
snarkjs zkey export solidityverifier "$COMPILED_DIR/${CIRCUIT_NAME}_final.zkey" "$COMPILED_DIR/verifier.sol"

echo -e "${GREEN}✓ Verifier contract exported${NC}"

# ========================================
# Step 11: Clean up intermediate files
# ========================================

echo -e "${BLUE}Step 11: Cleaning up...${NC}"

rm -f "$COMPILED_DIR/${CIRCUIT_NAME}_0000.zkey"
rm -f "$COMPILED_DIR/${CIRCUIT_NAME}_0001.zkey"

echo -e "${GREEN}✓ Cleanup completed${NC}"

# ========================================
# Summary
# ========================================

echo ""
echo "========================================="
echo -e "${GREEN}✓ Circuit compilation completed successfully!${NC}"
echo "========================================="
echo ""
echo "Generated files:"
echo "  • R1CS:              $COMPILED_DIR/${CIRCUIT_NAME}.r1cs"
echo "  • WASM:              $COMPILED_DIR/${CIRCUIT_NAME}.wasm"
echo "  • Proving key:       $COMPILED_DIR/${CIRCUIT_NAME}_final.zkey"
echo "  • Verification key:  $COMPILED_DIR/verification_key.json"
echo ""
echo "Next steps:"
echo "  1. Run test proof: npm run test"
echo "  2. Deploy contract: ./scripts/deploy-contract.sh"
echo ""