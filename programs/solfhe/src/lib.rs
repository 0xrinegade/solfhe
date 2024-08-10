use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use std::mem::size_of;

declare_id!("BxVYzMVCkq4Amxwz5sN8Z9EkATWSoTs99bkLUEmnEscm");

#[program]
pub mod solfhe {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.advertiser_count = 0;
        state.user_count = 0;
        state.ad_count = 0;
        msg!("Starting solFHE Program...");
        Ok(())
    }
    pub fn register_advertiser(
        ctx: Context<RegisterAdvertiser>,
        name: String,
        email: String,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let advertiser = &mut ctx.accounts.advertiser;

        advertiser.authority = ctx.accounts.authority.key();
        advertiser.name = name;
        advertiser.email = email;
        advertiser.ad_count = 0;

        state.advertiser_count = state.advertiser_count.checked_add(1).unwrap();

        msg!("New advertiser saved 💾: {}", name);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
