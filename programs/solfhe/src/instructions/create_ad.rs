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

    // Check if advertiser has enough balance
    require!(
        ctx.accounts.advertiser_token_account.amount >= budget,
        ErrorCode::InsufficientFunds
    );

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
    use tfhe::shortint::prelude::*;

    fn setup_test_environment() -> (Pubkey, Pubkey, Pubkey, Pubkey, Pubkey) {
        let program_id = Pubkey::new_unique();
        let authority_pubkey = Pubkey::new_unique();
        let (state_pubkey, _) = Pubkey::find_program_address(&[b"state"], &program_id);
        let (advertiser_pubkey, _) =
            Pubkey::find_program_address(&[b"advertiser", authority_pubkey.as_ref()], &program_id);
        let (ad_pubkey, _) = Pubkey::find_program_address(
            &[b"ad", advertiser_pubkey.as_ref(), &[0, 0, 0, 0, 0, 0, 0, 0]],
            &program_id,
        );
        let (treasury_pubkey, _) = Pubkey::find_program_address(&[b"treasury"], &program_id);

        (
            program_id,
            authority_pubkey,
            state_pubkey,
            advertiser_pubkey,
            ad_pubkey,
        )
    }

    fn create_mock_accounts(
        program_id: &Pubkey,
        authority_pubkey: &Pubkey,
        state_pubkey: &Pubkey,
        advertiser_pubkey: &Pubkey,
        ad_pubkey: &Pubkey,
    ) -> (
        AccountInfo,
        AccountInfo,
        AccountInfo,
        AccountInfo,
        AccountInfo,
        AccountInfo,
        AccountInfo,
        AccountInfo,
    ) {
        // Create mock state account
        let mut state_account = StateAccount {
            bump: 255,
            authority: *authority_pubkey,
            advertiser_count: 1,
            user_count: 0,
            ad_count: 0,
            total_budget: 0,
            payment_mint: Pubkey::new_unique(),
            last_updated: 0,
        };
        let mut state_data = state_account.try_to_vec().unwrap();
        let mut state_lamports = 1000000000;
        let state_account_info = AccountInfo::new(
            state_pubkey,
            false,
            true,
            &mut state_lamports,
            &mut state_data,
            program_id,
            false,
            0,
        );

        // Create mock advertiser account
        let mut advertiser_account = AdvertiserAccount {
            authority: *authority_pubkey,
            name: "Test Advertiser".to_string(),
            email: "test@example.com".to_string(),
            ad_count: 0,
            total_budget: 0,
            reputation_score: 100,
            is_active: true,
            created_at: 0,
            last_updated: 0,
        };
        let mut advertiser_data = advertiser_account.try_to_vec().unwrap();
        let mut advertiser_lamports = 1000000000;
        let advertiser_account_info = AccountInfo::new(
            advertiser_pubkey,
            false,
            true,
            &mut advertiser_lamports,
            &mut advertiser_data,
            program_id,
            false,
            0,
        );

        // Create mock ad account
        let mut ad_data = vec![0; AdAccount::SPACE];
        let mut ad_lamports = 0;
        let ad_account_info = AccountInfo::new(
            ad_pubkey,
            false,
            true,
            &mut ad_lamports,
            &mut ad_data,
            program_id,
            false,
            0,
        );

        // Create mock token accounts
        let mut advertiser_token_account = TokenAccount::default();
        advertiser_token_account.owner = *authority_pubkey;
        advertiser_token_account.mint = state_account.payment_mint;
        advertiser_token_account.amount = 1000000000;
        let mut advertiser_token_data = advertiser_token_account.try_to_vec().unwrap();
        let mut advertiser_token_lamports = 1000000000;
        let advertiser_token_account_info = AccountInfo::new(
            &Pubkey::new_unique(),
            false,
            true,
            &mut advertiser_token_lamports,
            &mut advertiser_token_data,
            program_id,
            false,
            0,
        );

        let mut treasury_account = TokenAccount::default();
        treasury_account.owner = *state_pubkey;
        treasury_account.mint = state_account.payment_mint;
        let mut treasury_data = treasury_account.try_to_vec().unwrap();
        let mut treasury_lamports = 1000000000;
        let treasury_account_info = AccountInfo::new(
            &Pubkey::new_unique(),
            false,
            true,
            &mut treasury_lamports,
            &mut treasury_data,
            program_id,
            false,
            0,
        );

        let mut authority_lamports = 1000000000;
        let mut authority_data = vec![];
        let authority_account_info = AccountInfo::new(
            authority_pubkey,
            true,
            false,
            &mut authority_lamports,
            &mut authority_data,
            &Pubkey::default(),
            false,
            0,
        );

        let token_program_id = Pubkey::new_unique();
        let mut token_program_lamports = 0;
        let mut token_program_data = vec![];
        let token_program_account_info = AccountInfo::new(
            &token_program_id,
            false,
            false,
            &mut token_program_lamports,
            &mut token_program_data,
            &Pubkey::default(),
            false,
            0,
        );

        let system_program_id = Pubkey::new_unique();
        let mut system_program_lamports = 0;
        let mut system_program_data = vec![];
        let system_program_account_info = AccountInfo::new(
            &system_program_id,
            false,
            false,
            &mut system_program_lamports,
            &mut system_program_data,
            &Pubkey::default(),
            false,
            0,
        );

        (
            state_account_info,
            advertiser_account_info,
            ad_account_info,
            advertiser_token_account_info,
            treasury_account_info,
            authority_account_info,
            token_program_account_info,
            system_program_account_info,
        )
    }

    #[test]
    fn test_create_ad_with_realistic_fhe() {
        let (program_id, authority_pubkey, state_pubkey, advertiser_pubkey, ad_pubkey) =
            setup_test_environment();

        let (
            state_account_info,
            advertiser_account_info,
            ad_account_info,
            advertiser_token_account_info,
            treasury_account_info,
            authority_account_info,
            token_program_account_info,
            system_program_account_info,
        ) = create_mock_accounts(
            &program_id,
            &authority_pubkey,
            &state_pubkey,
            &advertiser_pubkey,
            &ad_pubkey,
        );

        let client_key = ClientKey::new(PARAM_MESSAGE_2_CARRY_2);
        let server_key = ServerKey::new(&client_key);

        // Realistic target traits (i prefered age)
        let target_traits: Vec<u64> = vec![25, 30, 35, 40, 45];

        // Encry target traits
        let encrypted_traits: Vec<Ciphertext> = target_traits
            .iter()
            .map(|&trait_value| client_key.encrypt(trait_value))
            .collect();

        // Serialise encrypted properties
        let encrypted_target_traits = bincode::serialize(&encrypted_traits).unwrap();

        let accounts = CreateAd {
            state: Account::try_from(&state_account_info).unwrap(),
            advertiser: Account::try_from(&advertiser_account_info).unwrap(),
            ad: Account::try_from(&ad_account_info).unwrap(),
            advertiser_token_account: Account::try_from(&advertiser_token_account_info).unwrap(),
            treasury: Account::try_from(&treasury_account_info).unwrap(),
            authority: Signer::try_from(&authority_account_info).unwrap(),
            token_program: Program::try_from(&token_program_account_info).unwrap(),
            system_program: Program::try_from(&system_program_account_info).unwrap(),
        };

        let content = "Test Ad Content".to_string();
        let duration = 24 * 60 * 60; // 1 day
        let budget = 500_000_000; // 0.5 SOL

        let mut context = Context::new(
            program_id,
            accounts,
            &[
                &state_account_info,
                &advertiser_account_info,
                &ad_account_info,
                &advertiser_token_account_info,
                &treasury_account_info,
                &authority_account_info,
                &token_program_account_info,
                &system_program_account_info,
            ],
            BTreeMap::new(),
            BTreeMap::new(),
        );

        let result = handler(
            context,
            content.clone(),
            encrypted_target_traits,
            duration,
            budget,
        );
        assert!(result.is_ok());

        // Verify name account
        let ad = AdAccount::try_from_slice(&ad_account_info.data.borrow()).unwrap();
        let processed_traits: Vec<Ciphertext> =
            bincode::deserialize(&ad.encrypted_target_traits).unwrap();
        assert_eq!(processed_traits.len(), FHE_TRAITS_COUNT);

        // Solve and verify processed properties
        for (i, ct) in processed_traits.iter().enumerate() {
            let decrypted = client_key.decrypt(ct);
            assert_eq!(decrypted, target_traits[i] + 1); // Orijinal değer + 1
        }

        // Verify other account updates
        let updated_state =
            StateAccount::try_from_slice(&state_account_info.data.borrow()).unwrap();
        assert_eq!(updated_state.ad_count, 1);
        assert_eq!(updated_state.total_budget, budget);

        let updated_advertiser =
            AdvertiserAccount::try_from_slice(&advertiser_account_info.data.borrow()).unwrap();
        assert_eq!(updated_advertiser.ad_count, 1);
        assert_eq!(updated_advertiser.total_budget, budget);
    }
}
