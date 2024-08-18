//! # solFHE: Fully Homomorphic Encryption-based Advertising Protocol
//! # Author: @virjilakrum 🦀
//! This module serves as the root of the solFHE crate, organizing and re-exporting
//! all public components of the protocol. solFHE enables personalized advertising
//! while maintaining user privacy through the use of Fully Homomorphic Encryption (FHE).
//!
//! ## Module Structure
//!
//! - `instructions`: Contains all instruction handlers for the Solana program.
//! - `state`: Defines the account structures used in the protocol.
//! - `error`: Custom error types for the solFHE program.
//! - `events`: Event definitions for important protocol actions.
//! - `fhe`: Utility functions and traits for FHE operations.
//! - `validation`: Input validation and security check functions.
//! - `constants`: Protocol-wide constant values.
//!
//! ## Main Features
//!
//! - Create and manage advertiser accounts
//! - Submit and process encrypted user profiles
//! - Create and manage ad campaigns with FHE-encrypted targeting data
//! - Match ads to users using FHE computations
//! - Handle token transfers and budget management

// Re-export essential Anchor and Solana types
pub use anchor_lang::prelude::*;
pub use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Define and re-export submodules
pub mod constants;
pub mod error;
pub mod events;
pub mod fhe;
pub mod instructions;
pub mod state;
pub mod validation;

// Re-export main instruction handlers for easier access
pub use instructions::{
    create_ad::*, initialize::*, match_ads::*, register_advertiser::*, submit_user_profile::*,
    update_ad_status::*,
};

// Re-export state structures
pub use state::{AdAccount, AdvertiserAccount, MatchedAdsAccount, StateAccount, UserProfile};

// Re-export error types
pub use error::ErrorCode;

// Re-export event structures
pub use events::{AdCreated, AdsMatched, AdvertiserRegistered, UserProfileSubmitted};

// Re-export important constants
pub use constants::{
    FHE_TRAITS_COUNT, MAX_AD_DURATION, MAX_CONTENT_LENGTH, MIN_AD_BUDGET, MIN_AD_DURATION,
};

// Define the entrypoint for the Solana program
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = anchor_lang::AnchorDeserialize::deserialize(&mut &instruction_data[..])?;
    let mut acc_iter = &mut accounts.iter();

    match instruction {
        solFHEInstruction::Initialize {} => {
            instructions::initialize::handler(Context::new(program_id, acc_iter, instruction_data)?)
        }
        solFHEInstruction::RegisterAdvertiser { name, email } => {
            instructions::register_advertiser::handler(
                Context::new(program_id, acc_iter, instruction_data)?,
                name,
                email,
            )
        }
        solFHEInstruction::CreateAd {
            content,
            encrypted_target_traits,
            duration,
            budget,
        } => instructions::create_ad::handler(
            Context::new(program_id, acc_iter, instruction_data)?,
            content,
            encrypted_target_traits,
            duration,
            budget,
        ),
        solFHEInstruction::SubmitUserProfile {
            encrypted_profile_data,
        } => instructions::submit_user_profile::handler(
            Context::new(program_id, acc_iter, instruction_data)?,
            encrypted_profile_data,
        ),
        solFHEInstruction::MatchAds {
            encrypted_user_traits,
        } => instructions::match_ads::handler(
            Context::new(program_id, acc_iter, instruction_data)?,
            encrypted_user_traits,
        ),
        solFHEInstruction::UpdateAdStatus { is_active } => instructions::update_ad_status::handler(
            Context::new(program_id, acc_iter, instruction_data)?,
            is_active,
        ),
    }
}

/// Defines the instructions supported by the solFHE program
#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum solFHEInstruction {
    Initialize {},
    RegisterAdvertiser {
        name: String,
        email: String,
    },
    CreateAd {
        content: String,
        encrypted_target_traits: Vec<u8>,
        duration: i64,
        budget: u64,
    },
    SubmitUserProfile {
        encrypted_profile_data: Vec<u8>,
    },
    MatchAds {
        encrypted_user_traits: Vec<u8>,
    },
    UpdateAdStatus {
        is_active: bool,
    },
}

#[cfg(test)]
mod tests {

    /*  Import test modules here
    Example: mod test_initialize;
    mod test_create_ad;
    This allows for organizing tests into separate files for better maintainability */
}
