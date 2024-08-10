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
    pub fn match_ads(ctx: Context<MatchAds>, user_traits: Vec<u8>) -> Result<()> {
        let ads = &ctx.accounts.ads;
        let matched_ads = &mut ctx.accounts.matched_ads;

        // Bu kısımda normalde FHE işlemleri yapılacak
        // Şimdilik basit bir eşleştirme simülasyonu yapıyoruz
        for ad in ads.iter() {
            if simulate_fhe_match(&user_traits, &ad.target_traits) {
                matched_ads.ad_pubkeys.push(ad.key());
            }
        }

        msg!("Reklamlar eşleştirildi");
        Ok(())
    }
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
    #[account(init, payer = authority, space = 8 + size_of::<AdAccount>())]
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
    #[account(mut)]
    pub ads: AccountLoader<'info, AdAccount>,
    #[account(init, payer = authority, space = 8 + size_of::<MatchedAdsAccount>())]
    pub matched_ads: Account<'info, MatchedAdsAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StateAccount {
    pub authority: Pubkey,
    pub advertiser_count: u64,
    pub user_count: u64,
    pub ad_count: u64,
}

#[account]
pub struct AdvertiserAccount {
    pub authority: Pubkey,
    pub name: String,
    pub email: String,
    pub ad_count: u64,
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

#[account]
pub struct UserDataAccount {
    pub authority: Pubkey,
    pub encrypted_data: Vec<u8>,
}

#[account]
pub struct MatchedAdsAccount {
    pub ad_pubkeys: Vec<Pubkey>,
}

// FHE eşleştirme işlemini simüle eden yardımcı fonksiyon
fn simulate_fhe_match(user_traits: &[u8], ad_traits: &[u8]) -> bool {
    // Gerçek uygulamada, bu kısımda FHE kütüphanesi kullanılarak
    // şifreli veriler üzerinde işlem yapılacak
    // Şimdilik basit bir karşılaştırma yapıyoruz
    let user_hash = hash(user_traits).to_bytes();
    let ad_hash = hash(ad_traits).to_bytes();
    user_hash[0] == ad_hash[0] // Basit bir eşleştirme örneği
}

// Hata türlerini tanımlayın
#[error_code]
pub enum AdFHEError {
    #[msg("Geçersiz reklam süresi")]
    InvalidAdDuration,
    #[msg("Geçersiz hedef özellikler")]
    InvalidTargetTraits,
    #[msg("Yetersiz bakiye")]
    InsufficientBalance,
}
