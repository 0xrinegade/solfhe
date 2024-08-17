use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program::ID as ED25519_PROGRAM_ID;
use anchor_lang::solana_program::hash::{hash, Hash};
use borsh::{BorshDeserialize, BorshSerialize};
use hyperlane_core::{Decode, Encode};
use hyperlane_solana::{HyperlaneMessage, HyperlaneReceiver};
use std::mem::size_of;
use tfhe::prelude::*;
use tfhe::shortint::parameters::PARAM_MESSAGE_2_CARRY_2;
use tfhe::shortint::prelude::*;
use zama_fhe::prelude::*;

declare_id!("BxVYzMVCkq4Amxwz5sN8Z9EkATWSoTs99bkLUEmnEscm");

#[program]
pub mod solfhe {
    use super::*;

    pub fn process_hyperlane_message(
        ctx: Context<ProcessHyperlaneMessage>,
        message: HyperlaneMessage,
    ) -> Result<()> {
        let cross_chain_message = CrossChainMessage::decode(&message.body)
            .map_err(|_| solFHEError::InvalidCrossChainMessage)?;

        match cross_chain_message.message_type {
            0 => process_fhenix_ad_data(ctx, &cross_chain_message.payload)?,
            1 => process_fhenix_user_data(ctx, &cross_chain_message.payload)?,
            _ => return Err(solFHEError::UnknownMessageType.into()),
        }

        Ok(())
    }

    pub fn create_ad(
        ctx: Context<CreateAd>,
        content: String,
        target_traits: Vec<u8>,
        duration: u64,
        payment: u64,
    ) -> Result<()> {
        require!(!content.is_empty(), solFHEError::InvalidAdContent);
        require!(
            duration > 0 && duration <= MAX_AD_DURATION,
            solFHEError::InvalidAdDuration
        );
        require!(
            !target_traits.is_empty() && target_traits.len() <= MAX_TARGET_TRAITS,
            solFHEError::InvalidTargetTraits
        );
        require!(payment >= MIN_AD_PAYMENT, solFHEError::InsufficientPayment);

        let state = &mut ctx.accounts.state;
        let advertiser = &mut ctx.accounts.advertiser;
        let ad = &mut ctx.accounts.ad;

        // Transfer payment from advertiser to program account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ad.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, payment)?;

        ad.advertiser = advertiser.key();
        ad.content = content;
        ad.target_traits = target_traits;
        ad.duration = duration;
        ad.created_at = Clock::get()?.unix_timestamp;
        ad.is_active = true;
        ad.payment = payment;

        advertiser.ad_count = advertiser.ad_count.checked_add(1).unwrap();
        state.ad_count = state.ad_count.checked_add(1).unwrap();

        msg!("New ad created: {}", content);
        Ok(())
    }

    // Store proof data on Solana Devnet
    pub fn store_proof(
        ctx: Context<StoreProof>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        require!(proof.len() <= MAX_PROOF_SIZE, solFHEError::InvalidProofData);
        require!(
            public_inputs.len() <= MAX_PUBLIC_INPUTS_SIZE,
            solFHEError::InvalidProofData
        );

        let state = &mut ctx.accounts.state;
        let proof_account = &mut ctx.accounts.proof_account;

        // Generate proof data
        let proof_data = ProofData {
            proof,
            public_inputs,
            timestamp: Clock::get()?.unix_timestamp,
        };

        // Update your Proof account
        proof_account.authority = ctx.accounts.authority.key();
        proof_account.proof_data = proof_data;

        // Update State
        state.proof_count = state.proof_count.checked_add(1).unwrap();

        // Calculate and save the proof hash
        let proof_hash = hash(&proof_account.proof_data.proof);
        msg!("Proof stored with hash: {:?}", proof_hash);

        Ok(())
    }
}

#[account]
pub struct StateAccount {
    pub authority: Pubkey,
    pub advertiser_count: u64,
    pub user_count: u64,
    pub ad_count: u64,
    pub proof_count: u64,
}

// Update Initialize function
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.authority = ctx.accounts.authority.key();
    state.advertiser_count = 0;
    state.user_count = 0;
    state.ad_count = 0;
    state.proof_count = 0;
    msg!("Starting solFHE Program...");
    Ok(())
}

pub fn register_advertiser(
    ctx: Context<RegisterAdvertiser>,
    name: String,
    email: String,
) -> Result<()> {
    require!(
        !name.is_empty() && !email.is_empty(),
        solFHEError::InvalidAdvertiserData
    );

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

pub fn store_encrypted_user_data(
    ctx: Context<StoreEncryptedUserData>,
    encrypted_data: Vec<u8>,
) -> Result<()> {
    require!(
        !encrypted_data.is_empty(),
        solFHEError::InvalidEncryptedData
    );

    let state = &mut ctx.accounts.state;
    let user_data = &mut ctx.accounts.user_data;

    user_data.authority = ctx.accounts.authority.key();
    user_data.encrypted_data = encrypted_data;

    state.user_count = state.user_count.checked_add(1).unwrap();

    msg!("User data saved in encrypted form");
    Ok(())
}

/// Match ads with user traits using FHE
pub fn match_ads(ctx: Context<MatchAds>, encrypted_user_traits: Vec<u8>) -> Result<()> {
    require!(
        !encrypted_user_traits.is_empty(),
        solFHEError::InvalidEncryptedData
    );

    let ads = &ctx.accounts.ads;
    let matched_ads = &mut ctx.accounts.matched_ads;

    // Generate the necessary parameters and switches for FHE
    let fhe_params = FheParameters::default();
    let (public_key, secret_key) = generate_keys(&fhe_params);

    // Decode user properties and convert to FHE format
    let user_traits =
        decrypt_and_prepare_user_traits(&secret_key, &encrypted_user_traits, &fhe_params)?;

    for ad in ads.iter() {
        // Convert the ad's target attributes to FHE format
        let target_traits = prepare_target_traits(&ad.target_traits, &public_key, &fhe_params)?;

        // Perform FHE matching
        let match_score =
            perform_fhe_match(&user_traits, &target_traits, &public_key, &fhe_params)?;

        // Solve match score
        let decrypted_score = decrypt_score(&match_score, &secret_key)?;

        // Mark ads that exceed a certain threshold as matched
        if decrypted_score > FHE_MATCH_THRESHOLD {
            matched_ads.ad_pubkeys.push(ad.key());
            matched_ads.match_scores.push(decrypted_score);
        }
    }
    matched_ads.sort_by_score();

    msg!("Ads were matched and ranked using FHE");
    Ok(())
}

// Auxiliary functions for FHE operations
fn decrypt_and_prepare_user_traits(
    secret_key: &SecretKey,
    encrypted_data: &[u8],
    params: &FheParameters,
) -> Result<Vec<FheCiphertext>> {
    let decrypted_data = zama_fhe::decrypt_vector(secret_key, encrypted_data, params)
        .map_err(|_| solFHEError::DecryptionError)?;

    let mut fhe_traits = Vec::new();
    for trait_value in decrypted_data {
        let encrypted_trait = trait_value.encrypt(&secret_key.to_public(), params)?;
        fhe_traits.push(encrypted_trait);
    }

    Ok(fhe_traits)
}

fn prepare_target_traits(
    target_traits: &[u8],
    public_key: &PublicKey,
    params: &FheParameters,
) -> Result<Vec<FheCiphertext>> {
    let mut fhe_traits = Vec::new();
    for trait_value in target_traits {
        let encrypted_trait = (*trait_value as u64).encrypt(public_key, params)?;
        fhe_traits.push(encrypted_trait);
    }

    Ok(fhe_traits)
}

// fn prepare_target_traits(target_traits: &[u8]) -> Result<Vec<Ciphertext>> {
//     // Convert target properties to FHE ciphertext
//     let client_key = ClientKey::new(PARAM_MESSAGE_2_CARRY_2); // 🚨 This key must be stored securely
//     let mut fhe_traits = Vec::new();
//     for trait_value in target_traits {
//         fhe_traits.push(client_key.encrypt(*trait_value as u64));
//     }

//     Ok(fhe_traits)
// }

fn perform_fhe_match(
    user_traits: &[FheCiphertext],
    target_traits: &[FheCiphertext],
    public_key: &PublicKey,
    params: &FheParameters,
) -> Result<FheCiphertext> {
    let mut match_score = 0u64.encrypt(public_key, params)?;

    for (user_trait, target_trait) in user_traits.iter().zip(target_traits.iter()) {
        let diff = user_trait.fhe_xor(target_trait, params)?;
        match_score = match_score.fhe_add(&diff, params)?;
    }

    let trait_count = (user_traits.len() as u64).encrypt(public_key, params)?;
    match_score = match_score.fhe_div(&trait_count, params)?;

    Ok(match_score)
}

fn decrypt_score(score: &FheCiphertext, secret_key: &SecretKey) -> Result<u64> {
    score.decrypt(secret_key)
}

#[derive(BorshSerialize, BorshDeserialize)]
struct FhenixAdData {
    ad_id: u64,
    encrypted_content: Vec<u8>,
    encrypted_target_traits: Vec<u8>,
    duration: u64,
}

#[derive(BorshSerialize, BorshDeserialize)]
struct FhenixUserData {
    user_id: Pubkey,
    encrypted_traits: Vec<u8>,
}

fn process_fhenix_ad_data(ctx: Context<ProcessHyperlaneMessage>, payload: &[u8]) -> Result<()> {
    let fhenix_ad_data =
        FhenixAdData::try_from_slice(payload).map_err(|_| solFHEError::InvalidCrossChainMessage)?;
    let ad_account = &mut ctx.accounts.ad_account;
    ad_account.advertiser = ctx.accounts.authority.key();
    ad_account.content = fhenix_ad_data.encrypted_content;
    ad_account.target_traits = fhenix_ad_data.encrypted_target_traits;
    ad_account.duration = fhenix_ad_data.duration;
    ad_account.created_at = Clock::get()?.unix_timestamp;
    ad_account.is_active = true;
    let state = &mut ctx.accounts.state;
    state.ad_count = state.ad_count.checked_add(1).unwrap();

    msg!("Processed Fhenix ad data: Ad ID {}", fhenix_ad_data.ad_id);
    Ok(())
}

fn process_fhenix_user_data(ctx: Context<ProcessHyperlaneMessage>, payload: &[u8]) -> Result<()> {
    let fhenix_user_data = FhenixUserData::try_from_slice(payload)
        .map_err(|_| solFHEError::InvalidCrossChainMessage)?;
    let user_data_account = &mut ctx.accounts.user_data_account;
    user_data_account.authority = fhenix_user_data.user_id;
    user_data_account.encrypted_data = fhenix_user_data.encrypted_traits;
    let state = &mut ctx.accounts.state;
    if user_data_account.to_account_info().owner == &ID {
    } else {
        state.user_count = state.user_count.checked_add(1).unwrap();
    }
    msg!(
        "Processed Fhenix user data for user: {}",
        fhenix_user_data.user_id
    );
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ProofData {
    pub proof: Vec<u8>,
    pub public_inputs: Vec<u8>,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Encode, Decode)]
pub struct CrossChainMessage {
    pub message_type: u8,
    pub payload: Vec<u8>,
}

#[account]
pub struct ProofAccount {
    pub authority: Pubkey,
    pub proof_data: ProofData,
}

#[derive(Accounts)]
pub struct ProcessHyperlaneMessage<'info> {
    #[account(mut)]
    pub state: Account<'info, StateAccount>,
    #[account(mut)]
    pub ad_account: Account<'info, AdAccount>,
    #[account(mut)]
    pub user_data_account: Account<'info, UserDataAccount>,
    pub hyperlane_receiver: Account<'info, HyperlaneReceiver>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + size_of::<StateAccount>())]
    pub state: Account<'info, StateAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAdvertiser<'info> {
    #[account(mut)]
    pub state: Account<'info, StateAccount>,
    #[account(init, payer = authority, space = 8 + size_of::<AdvertiserAccount>())]
    pub advertiser: Account<'info, AdvertiserAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateAd<'info> {
    #[account(mut)]
    pub state: Account<'info, StateAccount>,
    #[account(mut, has_one = authority)]
    pub advertiser: Account<'info, AdvertiserAccount>,
    #[account(
        init,
        payer = authority,
        space = 8 + size_of::<AdAccount>(),
        seeds = [b"ad", advertiser.key().as_ref(), &advertiser.ad_count.to_le_bytes()],
        bump
    )]
    pub ad: Account<'info, AdAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StoreEncryptedUserData<'info> {
    #[account(mut)]
    pub state: Account<'info, StateAccount>,
    #[account(init, payer = authority, space = 8 + size_of::<UserDataAccount>())]
    pub user_data: Account<'info, UserDataAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MatchAds<'info> {
    #[account(mut)]
    pub state: Account<'info, StateAccount>,
    pub ads: AccountLoader<'info, AdAccount>,
    #[account(init, payer = authority, space = 8 + size_of::<MatchedAdsAccount>())]
    pub matched_ads: Account<'info, MatchedAdsAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AdAccount {
    pub advertiser: Pubkey,
    pub content: String,
    pub target_traits: Vec<u8>,
    pub duration: u64,
    pub created_at: i64,
    pub is_active: bool,
    pub payment: u64,
}

// Update MatchedAdsAccount structure
#[account]
pub struct MatchedAdsAccount {
    pub ad_pubkeys: Vec<Pubkey>,
    pub match_scores: Vec<u64>,
}

impl MatchedAdsAccount {
    fn sort_by_score(&mut self) {
        let mut pairs: Vec<_> = self
            .ad_pubkeys
            .iter()
            .zip(self.match_scores.iter())
            .collect();
        pairs.sort_by(|a, b| b.1.cmp(a.1)); // Sort from high score to low

        self.ad_pubkeys = pairs.iter().map(|(pubkey, _)| **pubkey).collect();
        self.match_scores = pairs.iter().map(|(_, score)| **score).collect();
    }
}

// Error types
#[error_code]
pub enum solFHEError {
    #[msg("Invalid ad duration")]
    InvalidAdDuration,
    #[msg("Invalid target traits")]
    InvalidTargetTraits,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("FHE operation failed")]
    FheOperationFailed,
    #[msg("Encryption error")]
    EncryptionError,
    #[msg("Decryption error")]
    DecryptionError,
    #[msg("Invalid proof data")]
    InvalidProofData,
    #[msg("Invalid advertiser data")]
    InvalidAdvertiserData,
    #[msg("Invalid ad content")]
    InvalidAdContent,
    #[msg("Invalid encrypted data")]
    InvalidEncryptedData,
    #[msg("Insufficient payment for ad creation")]
    InsufficientPayment,
}

type FheResult<T> = std::result::Result<T, solFHEError>;

// Traits required for FHE operations
trait FheEncrypt {
    fn encrypt(&self, public_key: &PublicKey, params: &FheParameters) -> FheResult<FheCiphertext>;
}

trait FheDecrypt {
    fn decrypt(&self, secret_key: &SecretKey) -> FheResult<u64>;
}

trait FheOperation {
    fn fhe_add(&self, other: &Self, params: &FheParameters) -> FheResult<Self>
    where
        Self: Sized;
    fn fhe_xor(&self, other: &Self, params: &FheParameters) -> FheResult<Self>
    where
        Self: Sized;
    fn fhe_div(&self, other: &Self, params: &FheParameters) -> FheResult<Self>
    where
        Self: Sized;
}

impl FheEncrypt for u64 {
    fn encrypt(&self, public_key: &PublicKey, params: &FheParameters) -> FheResult<FheCiphertext> {
        match zama_fhe::encrypt(*self, public_key, params) {
            Ok(ciphertext) => Ok(ciphertext),
            Err(_) => Err(solFHEError::EncryptionError),
        }
    }
}

impl FheDecrypt for FheCiphertext {
    fn decrypt(&self, secret_key: &SecretKey) -> FheResult<u64> {
        match zama_fhe::decrypt(self, secret_key) {
            Ok(plaintext) => Ok(plaintext),
            Err(_) => Err(solFHEError::DecryptionError),
        }
    }
}

impl FheOperation for FheCiphertext {
    fn fhe_add(&self, other: &Self, params: &FheParameters) -> FheResult<Self> {
        match zama_fhe::add(self, other, params) {
            Ok(result) => Ok(result),
            Err(_) => Err(solFHEError::FheOperationFailed),
        }
    }

    fn fhe_xor(&self, other: &Self, params: &FheParameters) -> FheResult<Self> {
        match zama_fhe::xor(self, other, params) {
            Ok(result) => Ok(result),
            Err(_) => Err(solFHEError::FheOperationFailed),
        }
    }

    fn fhe_div(&self, other: &Self, params: &FheParameters) -> FheResult<Self> {
        match zama_fhe::div(self, other, params) {
            Ok(result) => Ok(result),
            Err(_) => Err(solFHEError::FheOperationFailed),
        }
    }
}
// FHE match threshold value
const MIN_AD_PAYMENT: u64 = 1_000_000; // 0.001 SOL
const MAX_PROOF_SIZE: usize = 1024;
const MAX_PUBLIC_INPUTS_SIZE: usize = 256;
const MAX_AD_DURATION: u64 = 30 * 24 * 60 * 60;
const FHE_MATCH_THRESHOLD: u64 = 75;
const MAX_TARGET_TRAITS: usize = 10;
