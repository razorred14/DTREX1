# Chialisp Puzzle Templates

This directory contains CLVM puzzle templates for various contract types on the Chia blockchain.

## Puzzle Files

### contract.clsp
Multi-signature contract requiring all participants to sign before execution.

**Features:**
- Multiple participant support
- Embedded contract terms hash
- Configurable signature requirements
- Standard spending conditions

**Parameters:**
- `PUBKEYS`: List of BLS public keys
- `TERMS_HASH`: SHA256 of contract document
- `REQUIRED_SIGS`: Number of required signatures
- `solution`: Runtime solution data

### timelock.clsp
Time-locked contract that releases funds after a specific block height.

**Features:**
- Block height assertion
- Single authorized spender
- Terms hash verification
- Time-based release mechanism

**Parameters:**
- `PUBKEY`: Authorized spender's public key
- `TERMS_HASH`: Contract terms hash
- `RELEASE_HEIGHT`: Block height for fund release
- `solution`: Spending conditions

### escrow.clsp
Escrow contract for secure transactions between parties.

**Features:**
- Three-party escrow (buyer, seller, arbiter)
- Multiple resolution paths (release, refund, arbitration)
- Dual-signature requirements
- Arbiter override capability

**Parameters:**
- `BUYER_PUBKEY`: Buyer's public key
- `SELLER_PUBKEY`: Seller's public key
- `ARBITER_PUBKEY`: Arbiter's public key
- `TERMS_HASH`: Contract terms hash
- `solution`: (action, destination)

## Compiling Puzzles

To compile these puzzles, use the Chialisp compiler:

```bash
# Install Chialisp tools
pip install chia-dev-tools

# Compile a puzzle
cdv clsp build contract.clsp

# Generate puzzle hash
cdv clsp treehash contract.clsp.hex
```

## Usage in Backend

The Rust backend uses these templates to generate contract-specific puzzles:

```rust
use crate::blockchain::puzzles;

let puzzle_hash = puzzles::generate_contract_puzzle_hash(
    &participants,
    &terms_hash,
    required_sigs
)?;
```

## Security Considerations

1. **Terms Hash**: Always verify the terms hash matches the actual contract document
2. **Signature Verification**: Ensure all required signatures are present and valid
3. **Replay Protection**: Use unique coin IDs to prevent replay attacks
4. **Amount Validation**: Verify amounts in spending conditions match expectations
5. **Testing**: Thoroughly test puzzles on testnet before mainnet deployment

## Resources

- [Chialisp Documentation](https://chialisp.com/)
- [CLVM Reference](https://chialisp.com/clvm)
- [Chia Developer Guide](https://docs.chia.net/guides)
