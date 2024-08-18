use crate::error::ErrorCode;
use crate::events::ProgramInitialized;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StateAccount::SPACE,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, StateAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let state = &mut ctx.accounts.state;

    // Initialize the state account
    state.authority = ctx.accounts.authority.key();
    state.advertiser_count = 0;
    state.user_count = 0;
    state.ad_count = 0;
    state.total_budget = 0;
    state.last_updated = Clock::get()?.unix_timestamp;

    // Set the bump to be used in future PDA derivations
    state.bump = *ctx.bumps.get("state").ok_or(ErrorCode::BumpNotFound)?;

    // Emit an event for program initialization
    emit!(ProgramInitialized {
        authority: state.authority,
        timestamp: state.last_updated,
    });

    msg!("solFHE program initialized successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::pubkey::Pubkey;

    #[test]
    fn test_initialize() {
        let program_id = Pubkey::new_unique();
        let authority_pubkey = Pubkey::new_unique();
        let (state_pubkey, _) = Pubkey::find_program_address(&[b"state"], &program_id);

        let mut lamports = 0;
        let mut data = vec![0; StateAccount::SPACE];
        let owner = program_id;
        let state_account_info = AccountInfo::new(
            &state_pubkey,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );

        let mut lamports = 1000000000; // 1 SOL
        let mut data = vec![];
        let owner = Pubkey::default();
        let authority_account_info = AccountInfo::new(
            &authority_pubkey,
            true,
            false,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );

        let system_program_id = Pubkey::new_unique();
        let mut lamports = 0;
        let mut data = vec![];
        let system_program_account_info = AccountInfo::new(
            &system_program_id,
            false,
            false,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );

        let accounts = Initialize {
            state: Account::try_from(&state_account_info).unwrap(),
            authority: Signer::try_from(&authority_account_info).unwrap(),
            system_program: Program::try_from(&system_program_account_info).unwrap(),
        };

        let mut context = Context::new(
            program_id,
            accounts,
            &[
                &state_account_info,
                &authority_account_info,
                &system_program_account_info,
            ],
            BTreeMap::new(),
            BTreeMap::new(),
        );

        context.bumps.insert("state".to_string(), 255);

        handler(context).unwrap();

        let state = StateAccount::try_from_slice(&state_account_info.data.borrow()).unwrap();
        assert_eq!(state.authority, authority_pubkey);
        assert_eq!(state.advertiser_count, 0);
        assert_eq!(state.user_count, 0);
        assert_eq!(state.ad_count, 0);
        assert_eq!(state.total_budget, 0);
        assert_eq!(state.bump, 255);
        assert!(state.last_updated > 0);
    }
}
