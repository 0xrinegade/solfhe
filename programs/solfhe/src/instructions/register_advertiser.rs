use anchor_lang::prelude::*;
use crate::state::{StateAccount, AdvertiserAccount};
use crate::error::ErrorCode;
use crate::events::AdvertiserRegistered;

// Constants
const MAX_NAME_LENGTH: usize = 50;
const MAX_EMAIL_LENGTH: usize = 100;
const MIN_DEPOSIT_AMOUNT: u64 = 10_000_000; // 0.01 SOL

#[derive(Accounts)]
#[instruction(name: String, email: String)]
pub struct RegisterAdvertiser<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump,
    )]
    pub state: Account<'info, StateAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + AdvertiserAccount::SPACE,
        seeds = [b"advertiser", authority.key().as_ref()],
        bump
    )]
    pub advertiser: Account<'info, AdvertiserAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterAdvertiser>, name: String, email: String) -> Result<()> {
    // Validate input data
    require!(
        !name.is_empty() && name.len() <= MAX_NAME_LENGTH,
        ErrorCode::InvalidAdvertiserName
    );
    require!(
        !email.is_empty() && email.len() <= MAX_EMAIL_LENGTH,
        ErrorCode::InvalidAdvertiserEmail
    );

    let state = &mut ctx.accounts.state;
    let advertiser = &mut ctx.accounts.advertiser;
    let authority = &ctx.accounts.authority;

    // Check if the advertiser is already registered
    require!(
        !state.is_advertiser_registered(&authority.key()),
        ErrorCode::AdvertiserAlreadyRegistered
    );

    // Ensure the advertiser has enough balance for the minimum deposit
    require!(
        authority.lamports() >= MIN_DEPOSIT_AMOUNT,
        ErrorCode::InsufficientFunds
    );

    // Initialize the advertiser account
    advertiser.authority = authority.key();
    advertiser.name = name.clone();
    advertiser.email = email.clone();
    advertiser.ad_count = 0;
    advertiser.total_budget = 0;
    advertiser.reputation_score = 100; // Initial reputation score
    advertiser.is_active = true;
    advertiser.created_at = Clock::get()?.unix_timestamp;
    advertiser.last_updated = advertiser.created_at;

    // Update the state account
    state.advertiser_count = state.advertiser_count.checked_add(1).ok_or(ErrorCode::Overflow)?;
    state.last_updated = Clock::get()?.unix_timestamp;

    // Emit an event for advertiser registration
    emit!(AdvertiserRegistered {
        advertiser: advertiser.key(),
        authority: authority.key(),
        name: name.clone(),
        email: email.clone(),
        timestamp: advertiser.created_at,
    });

    msg!("Advertiser registered successfully: {}", name);
    Ok(())
}

// Helper function to validate email format
fn is_valid_email(email: &str) -> bool {
    // Basic email validation logic
    // This can be expanded for more robust validation
    email.contains('@') && email.contains('.')
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::pubkey::Pubkey;

    #[test]
    fn test_register_advertiser_success() {
        let program_id = Pubkey::new_unique();
        let authority_pubkey = Pubkey::new_unique();
        let (state_pubkey, _) = Pubkey::find_program_address(&[b"state"], &program_id);
        let (advertiser_pubkey, _) = Pubkey::find_program_address(&[b"advertiser", authority_pubkey.as_ref()], &program_id);

        // Create mock accounts
        let mut state_account = StateAccount::default();
        state_account.bump = 255;
        let mut state_data = state_account.try_to_vec().unwrap();
        let mut state_lamports = 1000000000;
        let state_account_info = AccountInfo::new(
            &state_pubkey,
            false,
            true,
            &mut state_lamports,
            &mut state_data,
            &program_id,
            false,
            0,
        );

        let mut advertiser_data = vec![0; AdvertiserAccount::SPACE];
        let mut advertiser_lamports = 0;
        let advertiser_account_info = AccountInfo::new(
            &advertiser_pubkey,
            false,
            true,
            &mut advertiser_lamports,
            &mut advertiser_data,
            &program_id,
            false,
            0,
        );

        let mut authority_lamports = MIN_DEPOSIT_AMOUNT;
        let mut authority_data = vec![];
        let authority_account_info = AccountInfo::new(
            &authority_pubkey,
            true,
            false,
            &mut authority_lamports,
            &mut authority_data,
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

        let accounts = RegisterAdvertiser {
            state: Account::try_from(&state_account_info).unwrap(),
            advertiser: Account::try_from(&advertiser_account_info).unwrap(),
            authority: Signer::try_from(&authority_account_info).unwrap(),
            system_program: Program::try_from(&system_program_account_info).unwrap(),
        };

        let name = "Test Advertiser".to_string();
        let email = "test@example.com".to_string();

        let mut context = Context::new(
            program_id,
            accounts,
            &[&state_account_info, &advertiser_account_info, &authority_account_info, &system_program_account_info],
            BTreeMap::new(),
            BTreeMap::new(),
        );

        let result = handler(context, name.clone(), email.clone());
        assert!(result.is_ok());

        // Verify state account updates
        let updated_state = StateAccount::try_from_slice(&state_account_info.data.borrow()).unwrap();
        assert_eq!(updated_state.advertiser_count, 1);

        // Verify advertiser account
        let advertiser = AdvertiserAccount::try_from_slice(&advertiser_account_info.data.borrow()).unwrap();
        assert_eq!(advertiser.authority, authority_pubkey);
        assert_eq!(advertiser.name, name);
        assert_eq!(advertiser.email, email);
        assert_eq!(advertiser.ad_count, 0);
        assert_eq!(advertiser.total_budget, 0);
        assert_eq!(advertiser.reputation_score, 100);
        assert!(advertiser.is_active);
        assert!(advertiser.created_at > 0);
        assert_eq!(advertiser.last_updated, advertiser.created_at);
    }

    #[test]
    fn test_register_advertiser_invalid_name() {
        // Similar setup as success test, but with an empty name
        // Assert that the handler returns an error
    }

    #[test]
    fn test_register_advertiser_invalid_email() {
        // Similar setup as success test, but with an invalid email
        // Assert that the handler returns an error
    }

    #[test]
    fn test_register_advertiser_insufficient_funds() {
        // Similar setup as success test, but with insufficient lamports in authority account
        // Assert that the handler returns an error
    }

🏗️

}
