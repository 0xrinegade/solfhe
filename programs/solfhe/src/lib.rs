use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hash, Hash};
use std::mem::size_of;
use tfhe::prelude::*;
use tfhe::shortint::parameters::PARAM_MESSAGE_2_CARRY_2;
use tfhe::shortint::prelude::*;
use zama_fhe::prelude::*;


declare_id!("BxVYzMVCkq4Amxwz5sN8Z9EkATWSoTs99bkLUEmnEscm");

#[program]
pub mod solfhe {
    use super::*;

    pub fn create_ad(
            ctx: Context<CreateAd>,
            content: String,
            target_traits: Vec<u8>,
            duration: u64,
        ) -> Result<()> {
            let state = &mut ctx.accounts.state;
            let advertiser = &mut ctx.accounts.advertiser;
            let ad = &mut ctx.accounts.ad;

            // Check that the ad time is valid
            if duration == 0 || duration > MAX_AD_DURATION {
                return Err(AdFHEError::InvalidAdDuration.into());
            }

            // Check that target properties are valid
            if target_traits.is_empty() || target_traits.len() > MAX_TARGET_TRAITS {
                return Err(AdFHEError::InvalidTargetTraits.into());
            }

            ad.advertiser = advertiser.key();
            ad.content = content;
            ad.target_traits = target_traits;
            ad.duration = duration;
            ad.created_at = Clock::get()?.unix_timestamp;
            ad.is_active = true;

            advertiser.ad_count = advertiser.ad_count.checked_add(1).unwrap();
            state.ad_count = state.ad_count.checked_add(1).unwrap();

            msg!("New ad created: {}", content);
            Ok(())
        }

        pub fn store_proof(ctx: Context<StoreProof>, proof: Vec<u8>, public_inputs: Vec<u8>) -> Result<()> {
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
        let state = &mut ctx.accounts.state;
        let user_data = &mut ctx.accounts.user_data;

        user_data.authority = ctx.accounts.authority.key();
        user_data.encrypted_data = encrypted_data;

        state.user_count = state.user_count.checked_add(1).unwrap();

        msg!("User data saved in encrypted form");
        Ok(())
    }


    pub fn match_ads(ctx: Context<MatchAds>, encrypted_user_traits: Vec<u8>) -> Result<()> {
            let ads = &ctx.accounts.ads;
            let matched_ads = &mut ctx.accounts.matched_ads;

            // Generate the necessary parameters and switches for FHE
            let fhe_params = FheParameters::default();
            let (public_key, secret_key) = generate_keys(&fhe_params);

            // Decode user properties and convert to FHE format
            let user_traits = decrypt_and_prepare_user_traits(&secret_key, &encrypted_user_traits, &fhe_params)?;

            for ad in ads.iter() {
                // Convert the ad's target attributes to FHE format
                let target_traits = prepare_target_traits(&ad.target_traits, &public_key, &fhe_params)?;

                // Perform FHE matching
                let match_score = perform_fhe_match(&user_traits, &target_traits, &public_key, &fhe_params)?;

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
                .map_err(|_| AdFHEError::DecryptionError)?;

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

        #[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
        pub struct ProofData {
            pub proof: Vec<u8>,
            pub public_inputs: Vec<u8>,
            pub timestamp: i64,
        }

        #[account]
        pub struct ProofAccount {
            pub authority: Pubkey,
            pub proof_data: ProofData,
        }



        #[derive(Accounts)]
        pub struct StoreProof<'info> {
            #[account(mut)]
            pub state: Account<'info, StateAccount>,
            #[account(
                init,
                payer = authority,
                space = 8 + size_of::<ProofAccount>(),
                seeds = [b"proof", state.proof_count.to_le_bytes().as_ref()],
                bump
            )]
            pub proof_account: Account<'info, ProofAccount>,
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
        }


        // Update MatchedAdsAccount structure
        #[account]
        pub struct MatchedAdsAccount {
            pub ad_pubkeys: Vec<Pubkey>,
            pub match_scores: Vec<u64>,
        }

        impl MatchedAdsAccount {
            fn sort_by_score(&mut self) {
                let mut pairs: Vec<_> = self.ad_pubkeys.iter().zip(self.match_scores.iter()).collect();
                pairs.sort_by(|a, b| b.1.cmp(a.1)); // Sort from high score to low

                self.ad_pubkeys = pairs.iter().map(|(pubkey, _)| **pubkey).collect();
                self.match_scores = pairs.iter().map(|(_, score)| **score).collect();
            }
        }

        // Update error types
        #[error_code]
        pub enum AdFHEError {
            #[msg("Invalid ad time")]
            InvalidAdDuration,
            #[msg("Invalid target properties")]
            InvalidTargetTraits,
            #[msg("Insufficient funds")]
            InsufficientBalance,
            #[msg("FHE operation failed")]
            FheOperationFailed,
            #[msg("Encryption error")]
            EncryptionError,
            #[msg("Decryption error")]
            DecryptionError,
            #[msg("Invalid proof data")]
                InvalidProofData,
        }

        type FheResult<T> = std::result::Result<T, AdFHEError>;

        // Traits required for FHE operations
        trait FheEncrypt {
            fn encrypt(&self, public_key: &PublicKey, params: &FheParameters) -> FheResult<FheCiphertext>;
        }

        trait FheDecrypt {
            fn decrypt(&self, secret_key: &SecretKey) -> FheResult<u64>;
        }

        trait FheOperation {
            fn fhe_add(&self, other: &Self, params: &FheParameters) -> FheResult<Self> where Self: Sized;
            fn fhe_xor(&self, other: &Self, params: &FheParameters) -> FheResult<Self> where Self: Sized;
            fn fhe_div(&self, other: &Self, params: &FheParameters) -> FheResult<Self> where Self: Sized;
        }

        impl FheEncrypt for u64 {
            fn encrypt(&self, public_key: &PublicKey, params: &FheParameters) -> FheResult<FheCiphertext> {
                match zama_fhe::encrypt(*self, public_key, params) {
                    Ok(ciphertext) => Ok(ciphertext),
                    Err(_) => Err(AdFHEError::EncryptionError)
                }
            }
        }

        impl FheDecrypt for FheCiphertext {
            fn decrypt(&self, secret_key: &SecretKey) -> FheResult<u64> {
                match zama_fhe::decrypt(self, secret_key) {
                    Ok(plaintext) => Ok(plaintext),
                    Err(_) => Err(AdFHEError::DecryptionError)
                }
            }
        }

        impl FheOperation for FheCiphertext {
            fn fhe_add(&self, other: &Self, params: &FheParameters) -> FheResult<Self> {
                match zama_fhe::add(self, other, params) {
                    Ok(result) => Ok(result),
                    Err(_) => Err(AdFHEError::FheOperationFailed)
                }
            }

            fn fhe_xor(&self, other: &Self, params: &FheParameters) -> FheResult<Self> {
                match zama_fhe::xor(self, other, params) {
                    Ok(result) => Ok(result),
                    Err(_) => Err(AdFHEError::FheOperationFailed)
                }
            }

            fn fhe_div(&self, other: &Self, params: &FheParameters) -> FheResult<Self> {
                match zama_fhe::div(self, other, params) {
                    Ok(result) => Ok(result),
                    Err(_) => Err(AdFHEError::FheOperationFailed)
                }
            }
        }
        // FHE match threshold value
        const MAX_PROOF_SIZE: usize = 1024;
        const MAX_PUBLIC_INPUTS_SIZE: usize = 256;
        const MAX_AD_DURATION: u64 = 30 * 24 * 60 * 60;
        const FHE_MATCH_THRESHOLD: u64 = 75;
        const MAX_TARGET_TRAITS: usize = 10;
