# SlabVaultFi Smart Contracts

This directory contains the Solana smart contracts for the SlabVaultFi marketplace.

## Setup

These contracts are written in Rust using the Anchor framework. To develop and deploy these contracts, you'll need to set up a separate Anchor project.

### Prerequisites

- Rust toolchain
- Solana CLI
- Anchor framework
- Solana wallet

### Installation

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Initialize Anchor project (in a separate directory)
anchor init slabvaultfi-contracts
```

## Contract Structure

### Token Burn Contract (`programs/token-burn`)

Handles burning of SVF tokens as part of the purchase process.

### Escrow/Purchase Contract (`programs/escrow`)

Handles split payments (SOL + SVF) and slab ownership transfers.

## Deployment

1. Configure your Solana wallet
2. Set the network (devnet/testnet/mainnet)
3. Build the contract: `anchor build`
4. Deploy the contract: `anchor deploy`
5. Update the program IDs in the frontend

## Security

- All contracts must be audited before mainnet deployment
- Implement rate limiting
- Add emergency pause mechanism
- Test thoroughly on devnet/testnet
