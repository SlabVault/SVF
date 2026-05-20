use anchor_lang::prelude::*;

declare_id!("ESCROW_PROGRAM_ID"); // Replace with actual program ID after deployment

#[program]
pub mod escrow {
    use super::*;

    /// Initiate a slab purchase with split payment (SOL + SVF)
    pub fn initiate_purchase(
        ctx: Context<InitiatePurchase>,
        slab_id: String,
        sol_amount: u64,
        svf_amount: u64,
    ) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        let buyer = &ctx.accounts.buyer;
        let treasury = &ctx.accounts.treasury;

        // Store purchase details
        escrow_account.slab_id = slab_id.clone();
        escrow_account.buyer = buyer.key();
        escrow_account.sol_amount = sol_amount;
        escrow_account.svf_amount = svf_amount;
        escrow_account.status = PurchaseStatus::Pending;
        escrow_account.created_at = Clock::get()?.unix_timestamp;
        escrow_account.treasury = treasury.key();

        // Transfer SOL to escrow
        let cpi_accounts = Transfer {
            from: buyer.to_account_info(),
            to: escrow_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
        );
        transfer(cpi_ctx, sol_amount)?;

        // Emit purchase initiated event
        emit!(PurchaseInitiatedEvent {
            slab_id,
            buyer: buyer.key(),
            sol_amount,
            svf_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Complete the purchase after token burn is confirmed
    pub fn complete_purchase(
        ctx: Context<CompletePurchase>,
        transfer_signature: String,
        burn_signature: String,
    ) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        let treasury = &ctx.accounts.treasury;

        // Verify purchase is in pending state
        require!(
            escrow_account.status == PurchaseStatus::Pending,
            ErrorCode::InvalidPurchaseStatus
        );

        // Transfer SOL from escrow to treasury
        let treasury_balance = treasury.lamports();
        **escrow_account.to_account_info().lamports.borrow_mut() -= escrow_account.sol_amount;
        **treasury.to_account_info().lamports.borrow_mut() += escrow_account.sol_amount;

        // Update escrow status
        escrow_account.status = PurchaseStatus::Completed;
        escrow_account.transfer_signature = Some(transfer_signature.clone());
        escrow_account.burn_signature = Some(burn_signature.clone());
        escrow_account.completed_at = Some(Clock::get()?.unix_timestamp);

        // Emit purchase completed event
        emit!(PurchaseCompletedEvent {
            slab_id: escrow_account.slab_id.clone(),
            buyer: escrow_account.buyer,
            transfer_signature,
            burn_signature,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Cancel a pending purchase and refund SOL
    pub fn cancel_purchase(ctx: Context<CancelPurchase>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        let buyer = &ctx.accounts.buyer;

        // Verify purchase is in pending state
        require!(
            escrow_account.status == PurchaseStatus::Pending,
            ErrorCode::InvalidPurchaseStatus
        );

        // Verify buyer is the original purchaser
        require!(
            buyer.key() == escrow_account.buyer,
            ErrorCode::UnauthorizedBuyer
        );

        // Refund SOL from escrow to buyer
        let escrow_balance = escrow_account.lamports();
        **escrow_account.to_account_info().lamports.borrow_mut() -= escrow_account.sol_amount;
        **buyer.to_account_info().lamports.borrow_mut() += escrow_account.sol_amount;

        // Update escrow status
        escrow_account.status = PurchaseStatus::Cancelled;

        // Emit purchase cancelled event
        emit!(PurchaseCancelledEvent {
            slab_id: escrow_account.slab_id.clone(),
            buyer: buyer.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Get purchase status
    pub fn get_purchase_status(
        ctx: Context<GetPurchaseStatus>,
        purchase_id: String,
    ) -> Result<()> {
        let escrow_account = &ctx.accounts.escrow_account;

        // Verify purchase ID matches
        require!(
            escrow_account.slab_id == purchase_id,
            ErrorCode::InvalidPurchaseId
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitiatePurchase<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [b"escrow", buyer.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: This is the treasury account that will receive the SOL
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompletePurchase<'info> {
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    /// CHECK: This is the treasury account
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CancelPurchase<'info> {
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetPurchaseStatus<'info> {
    pub escrow_account: Account<'info, EscrowAccount>,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub slab_id: String,
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub svf_amount: u64,
    pub status: PurchaseStatus,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub transfer_signature: Option<String>,
    pub burn_signature: Option<String>,
    pub treasury: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum PurchaseStatus {
    Pending,
    Completed,
    Cancelled,
}

#[event]
pub struct PurchaseInitiatedEvent {
    pub slab_id: String,
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub svf_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PurchaseCompletedEvent {
    pub slab_id: String,
    pub buyer: Pubkey,
    pub transfer_signature: String,
    pub burn_signature: String,
    pub timestamp: i64,
}

#[event]
pub struct PurchaseCancelledEvent {
    pub slab_id: String,
    pub buyer: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid purchase status")]
    InvalidPurchaseStatus,
    #[msg("Unauthorized buyer")]
    UnauthorizedBuyer,
    #[msg("Invalid purchase ID")]
    InvalidPurchaseId,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
