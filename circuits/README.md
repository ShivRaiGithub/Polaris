# Circom Circuit README

## Identity Verifier Circuit

This directory contains the zero-knowledge proof circuit for privacy-preserving identity verification.

### Circuit Overview

The `identity_verifier.circom` circuit enables users to prove identity attributes without revealing sensitive information:

- **Age verification**: Prove age >= threshold without revealing exact DOB
- **Residency verification**: Prove Indian residency without revealing exact state
- **Gender verification**: Prove gender match without revealing other attributes
- **Document validity**: Prove valid Aadhar/PAN without revealing numbers

### Input Template

See `input_template.json` for example inputs.

### Compilation

Run the compilation script:
```bash
cd /home/shiv/Codes/blockchain/sirius/zk-identity
./scripts/compile-circuit.sh
```

This will generate the compiled circuit and proving/verification keys.
