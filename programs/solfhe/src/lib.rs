use anchor_lang::prelude::*;

mod error;
mod events;
mod instructions;
mod state;

pub use error::ErrorCode;
use instructions::*;
use state::*;

declare_id!("BxVYzMVCkq4Amxwz5sN8Z9EkATWSoTs99bkLUEmnEscm");

#[program]
pub mod solfhe {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn register_advertiser(
        ctx: Context<RegisterAdvertiser>,
        name: String,
        email: String,
    ) -> Result<()> {
        instructions::register_advertiser::handler(ctx, name, email)
    }

    pub fn create_ad(
        ctx: Context<CreateAd>,
        content: String,
        encrypted_target_traits: Vec<u8>,
        duration: i64,
        budget: u64,
    ) -> Result<()> {
        instructions::create_ad::handler(ctx, content, encrypted_target_traits, duration, budget)
    }

    pub fn submit_user_profile(
        ctx: Context<SubmitUserProfile>,
        encrypted_profile_data: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_user_profile::handler(ctx, encrypted_profile_data)
    }

    pub fn match_ads(ctx: Context<MatchAds>, encrypted_user_traits: Vec<u8>) -> Result<()> {
        instructions::match_ads::handler(ctx, encrypted_user_traits)
    }
}

// Constants
pub const MIN_AD_BUDGET: u64 = 1_000_000; // 0.001 SOL
pub const MAX_AD_DURATION: i64 = 30 * 24 * 60 * 60; // 30 days in seconds
pub const FHE_MATCH_THRESHOLD: u64 = 75;

// Re-export important structs for external use
pub use events::{AdCreated, AdsMatched, AdvertiserRegistered, UserProfileSubmitted};
pub use state::{AdAccount, AdvertiserAccount, MatchedAdsAccount, StateAccount, UserProfile};
