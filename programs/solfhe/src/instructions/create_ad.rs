use crate::error::ErrorCode;
use crate::events::AdCreated;
use crate::state::{AdAccount, AdvertiserAccount, StateAccount};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use tfhe::prelude::*;
use tfhe::shortint::parameters::PARAM_MESSAGE_2_CARRY_2;
use tfhe::shortint::prelude::*;

// Constants
const MAX_CONTENT_LENGTH: usize = 1000;
const MIN_AD_DURATION: i64 = 60 * 60; // 1 hour
const MAX_AD_DURATION: i64 = 30 * 24 * 60 * 60; // 30 days
const MIN_AD_BUDGET: u64 = 100_000_000; // 0.1 SOL
const FHE_TRAITS_COUNT: usize = 5; // Number of encrypted traits

#[derive(Accounts)]
#[instruction(content: String, encrypted_target_traits: Vec<u8>, duration: i64, budget: u64)]
pub struct CreateAd<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, StateAccount>,

    #[account(mut, seeds = [b"advertiser", authority.key().as_ref()], bump)]
    pub advertiser: Account<'info, AdvertiserAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + AdAccount::SPACE,
        seeds = [b"ad", advertiser.key().as_ref(), &advertiser.ad_count.to_le_bytes()],
        bump
    )]
    pub ad: Account<'info, AdAccount>,

    #[account(
        mut,
        constraint = advertiser_token_account.owner == authority.key(),
        constraint = advertiser_token_account.mint == state.payment_mint,
    )]
    pub advertiser_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = treasury.mint == state.payment_mint, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateAd>,
    content: String,
    encrypted_target_traits: Vec<u8>,
    duration: i64,
    budget: u64,
) -> Result<()> {
    // Validate input data
    require!(
        !content.is_empty() && content.len() <= MAX_CONTENT_LENGTH,
        ErrorCode::InvalidAdContent
    );
    require!(
        duration >= MIN_AD_DURATION && duration <= MAX_AD_DURATION,
        ErrorCode::InvalidAdDuration
    );
    require!(budget >= MIN_AD_BUDGET, ErrorCode::InsufficientAdBudget);

    let state = &mut ctx.accounts.state;
    let advertiser = &mut ctx.accounts.advertiser;
    let ad = &mut ctx.accounts.ad;
    let authority = &ctx.accounts.authority;

    // Verify and process FHE encrypted data
    let processed_traits = process_fhe_traits(&encrypted_target_traits)?;

    // Transfer tokens from advertiser to treasury
    let cpi_accounts = Transfer {
        from: ctx.accounts.advertiser_token_account.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, budget)?;

    // Initialize the ad account
    ad.advertiser = advertiser.key();
    ad.content = content.clone();
    ad.encrypted_target_traits = processed_traits;
    ad.duration = duration;
    ad.budget = budget;
    ad.spent_budget = 0;
    ad.impressions = 0;
    ad.clicks = 0;
    ad.is_active = true;
    ad.created_at = Clock::get()?.unix_timestamp;
    ad.last_updated = ad.created_at;

    // Update advertiser account
    advertiser.ad_count = advertiser
        .ad_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    advertiser.total_budget = advertiser
        .total_budget
        .checked_add(budget)
        .ok_or(ErrorCode::Overflow)?;
    advertiser.last_updated = Clock::get()?.unix_timestamp;

    // Update state account
    state.ad_count = state.ad_count.checked_add(1).ok_or(ErrorCode::Overflow)?;
    state.total_budget = state
        .total_budget
        .checked_add(budget)
        .ok_or(ErrorCode::Overflow)?;
    state.last_updated = Clock::get()?.unix_timestamp;

    // Emit an event for ad creation
    emit!(AdCreated {
        ad: ad.key(),
        advertiser: advertiser.key(),
        content: content.clone(),
        budget,
        duration,
        created_at: ad.created_at,
    });

    msg!("Ad created successfully: {}", ad.key());
    Ok(())
}

// Function to process FHE encrypted traits
fn process_fhe_traits(encrypted_data: &[u8]) -> Result<Vec<u8>> {
    // Deserialize the encrypted data
    let ciphertexts: Vec<Ciphertext> =
        bincode::deserialize(encrypted_data).map_err(|_| ErrorCode::InvalidFheEncryption)?;

    // Ensure we have the correct number of traits
    require!(
        ciphertexts.len() == FHE_TRAITS_COUNT,
        ErrorCode::InvalidTargetTraits
    );

    // Generate a new server key for FHE operations
    let client_key = ClientKey::new(PARAM_MESSAGE_2_CARRY_2);
    let server_key = ServerKey::new(&client_key);

    // Process each trait (for example, adding 1 to each trait)
    let processed_ciphertexts: Vec<Ciphertext> = ciphertexts
        .into_iter()
        .map(|ct| server_key.scalar_add(&ct, 1))
        .collect();

    // Serialize the processed ciphertexts
    bincode::serialize(&processed_ciphertexts).map_err(|_| ErrorCode::SerializationError.into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::pubkey::Pubkey;

    #[test]
    fn test_create_ad_with_fhe() {
        // Set up test environment (similar to previous test setup)
        // ...

        // Generate dummy encrypted traits
        let client_key = ClientKey::new(PARAM_MESSAGE_2_CARRY_2);
        let dummy_traits: Vec<Ciphertext> = (0..FHE_TRAITS_COUNT)
            .map(|i| client_key.encrypt(i as u64))
            .collect();
        let encrypted_target_traits = bincode::serialize(&dummy_traits).unwrap();

        // Create test accounts and context
        // ...

        let content = "Test Ad Content".to_string();
        let duration = 24 * 60 * 60; // 1 day
        let budget = 500_000_000; // 0.5 SOL

        let result = handler(
            context,
            content.clone(),
            encrypted_target_traits,
            duration,
            budget,
        );
        assert!(result.is_ok());

        // Verify account updates
        // ...

        // Verify FHE processing
        let ad = AdAccount::try_from_slice(&ad_account_info.data.borrow()).unwrap();
        let processed_traits: Vec<Ciphertext> =
            bincode::deserialize(&ad.encrypted_target_traits).unwrap();
        assert_eq!(processed_traits.len(), FHE_TRAITS_COUNT);

        // Decrypt and verify processed traits
        for (i, ct) in processed_traits.iter().enumerate() {
            let decrypted = client_key.decrypt(ct);
            assert_eq!(decrypted, (i as u64) + 1); // Original value + 1
        }
    }

    // @virjilakrum: Additional tests maybe 🤡 ...
}
