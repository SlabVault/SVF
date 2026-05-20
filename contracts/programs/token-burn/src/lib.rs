use anchor_lang::prelude::*;

declare_id!("TOKEN_BURN_PROGRAM_ID"); // Replace with actual program ID after deployment

#[program]
pub mod token_burn {
    use super::*;

    /// Burn SVF tokens as part of the purchase process
    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        let token_account = &ctx.accounts.token_account;
        let authority = &ctx.accounts.authority;
        let token_program = &ctx.accounts.token_program;

        // Transfer tokens to the burn account
        let cpi_accounts = Transfer {
            from: token_account.to_account_info(),
            to: ctx.accounts.burn_account.to_account_info(),
            authority: authority.to_account_info(),
        };

        let cpi_program = token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, amount)?;

        // Emit burn event
        emit!(BurnEvent {
            authority: authority.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Get the burn authority for a wallet
    pub fn get_burn_authority(
        ctx: Context<GetBurnAuthority>,
        wallet: Pubkey,
    ) -> Result<()> {
        // In a real implementation, this would check if the wallet is authorized
        // For now, we assume the wallet itself is the authority
        require!(
            ctx.accounts.wallet.key() == wallet,
            ErrorCode::UnauthorizedWallet
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub burn_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetBurnAuthority<'info> {
    pub wallet: AccountInfo<'info>,
}

#[event]
pub struct BurnEvent {
    pub authority: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized wallet")]
    UnauthorizedWallet,
    #[msg("Invalid token amount")]
    InvalidAmount,
}
