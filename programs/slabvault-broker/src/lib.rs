//! SlabVault broker program — **scaffold only**, not deployed.
//!
//! Phase 2: optional policy + interface fee layer on top of Tensor TCM + fees programs.
//! See `docs/integrations/onchain-trade-stack.md`.

use anchor_lang::prelude::*;

/// Placeholder program id — replace after `anchor keys sync` on devnet.
declare_id!("SVFB111111111111111111111111111111111111111");

#[program]
pub mod slabvault_broker {
    use super::*;

    /// Initialize broker config pointing fee share at SVF treasury.
    /// Real implementation will validate treasury pubkey and max bps.
    pub fn initialize_broker_config(
        _ctx: Context<InitializeBrokerConfig>,
        _max_interface_fee_bps: u16,
    ) -> Result<()> {
        msg!("slabvault-broker: scaffold — not deployed");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeBrokerConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: BrokerConfig PDA — seeds TBD to match lib/onchain/pdas.ts
    #[account(mut)]
    pub broker_config: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct BrokerConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub max_interface_fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

#[error_code]
pub enum BrokerError {
    #[msg("Program is scaffold-only; deploy to devnet before use")]
    NotDeployed,
}
