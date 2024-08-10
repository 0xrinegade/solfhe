use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use std::mem::size_of;
use tfhe::prelude::*;
use tfhe::shortint::parameters::PARAM_MESSAGE_2_CARRY_2;
use tfhe::shortint::prelude::*;

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
            let (client_key, server_key) = gen_keys(PARAM_MESSAGE_2_CARRY_2);

            // Decode user properties and convert to FHE format
            let user_traits = decrypt_and_prepare_user_traits(&client_key, &encrypted_user_traits)?;

            for ad in ads.iter() {
                // Convert the ad's target attributes to FHE format
                let target_traits = prepare_target_traits(&ad.target_traits)?;

                // Perform FHE matching
                let match_score = perform_fhe_match(&server_key, &user_traits, &target_traits)?;

                // Solve match score
                let decrypted_score = client_key.decrypt(&match_score);

                // Mark ads that exceed a certain threshold as matched
                if decrypted_score > FHE_MATCH_THRESHOLD {
                    matched_ads.ad_pubkeys.push(ad.key());
                    matched_ads.match_scores.push(decrypted_score);
                }
            }

            // Sort matching ads by score
            matched_ads.sort_by_score();

            msg!("Sort matched ads by score");
            Ok(())
        }


        // Auxiliary functions for FHE operations
        fn decrypt_and_prepare_user_traits(client_key: &ClientKey, encrypted_data: &[u8]) -> Result<Vec<Ciphertext>> {
            // Decrypt encrypted data
            let decrypted_data = client_key.decrypt_vector(encrypted_data);

            // Convert decrypted data to FHE ciphertext
            let mut fhe_traits = Vec::new();
            for trait_value in decrypted_data {
                fhe_traits.push(client_key.encrypt(trait_value));
            }

            Ok(fhe_traits)
        }

        fn prepare_target_traits(target_traits: &[u8]) -> Result<Vec<Ciphertext>> {
            // Convert target properties to FHE ciphertext
            let client_key = ClientKey::new(PARAM_MESSAGE_2_CARRY_2); // 🚨 This key must be stored securely
            let mut fhe_traits = Vec::new();
            for trait_value in target_traits {
                fhe_traits.push(client_key.encrypt(*trait_value as u64));
            }

            Ok(fhe_traits)
        }

        fn perform_fhe_match(server_key: &ServerKey, user_traits: &[Ciphertext], target_traits: &[Ciphertext]) -> Result<Ciphertext> {
            let mut match_score = server_key.encrypt(0u64);

            for (user_trait, target_trait) in user_traits.iter().zip(target_traits.iter()) {
                // Calculate differences with XOR operation
                let diff = server_key.xor(user_trait, target_trait);

                // Add the difference score to the total score
                match_score = server_key.add(&match_score, &diff);
            }

            // Normalize the total score divided by the number of traits
            let trait_count = server_key.encrypt(user_traits.len() as u64);
            match_score = server_key.div(&match_score, &trait_count);

            Ok(match_score)
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
            #[msg("Invalid advertising duration")]
            InvalidAdDuration,
            #[msg("Invalid target traits")]
            InvalidTargetTraits,
            #[msg("Insufficient balance")]
            InsufficientBalance,
            #[msg("FHE operation failed")]
            FHEOperationFailed,
        }

        // FHE match threshold value
        const MAX_AD_DURATION: u64 = 30 * 24 * 60 * 60;
        const FHE_MATCH_THRESHOLD: u64 = 75;
        const MAX_TARGET_TRAITS: usize = 10;
