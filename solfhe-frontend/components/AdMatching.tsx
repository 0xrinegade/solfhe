import React, { useState, useEffect } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { CONFIG } from "../config";
import * as anchor from "@project-serum/anchor";
import { encrypt, decrypt } from "../utils/fhe";

interface MatchedAd {
  pubkey: string;
  score: number;
}

const AdMatching: React.FC = () => {
  const [matchedAds, setMatchedAds] = useState<MatchedAd[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { program } = useProgram();
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const matchAds = async () => {
    if (!publicKey || !program) {
      setError("Wallet not connected or program not loaded");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const encryptedUserTraits = await fetchEncryptedUserTraits(publicKey);

      const [matchedAdsAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("matched_ads"), publicKey.toBuffer()],
        program.programId
      );

      // const stateAccount = new PublicKey(CONFIG.STATE_ACCOUNT_PUBLIC_KEY);
      // const adsAccount = new PublicKey(CONFIG.ADS_ACCOUNT_PUBLIC_KEY);

      const [stateAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("state")],
        program.programId
      );

      const [adsAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("ads")],
        program.programId
      );

      const tx = await program.rpc.matchAds(encryptedUserTraits, {
        accounts: {
          state: stateAccount,
          ads: adsAccount,
          matchedAds: matchedAdsAccount,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        },
      });

      await connection.confirmTransaction(tx, "processed");

      const matchedAdsData = await program.account.matchedAdsAccount.fetch(
        matchedAdsAccount
      );

      setMatchedAds(
        matchedAdsData.adPubkeys.map((pubkey: PublicKey, index: number) => ({
          pubkey: pubkey.toString(),
          score: matchedAdsData.matchScores[index].toNumber(),
        }))
      );

      console.log("Ads matched successfully");
    } catch (err) {
      console.error("Error matching ads:", err);
      setError(`Error matching ads: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEncryptedUserTraits = async (
    userPubkey: PublicKey
  ): Promise<Buffer> => {
    try {
      const [userDataAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("user_data"), userPubkey.toBuffer()],
        program.programId
      );

      const userDataAccountInfo = await connection.getAccountInfo(
        userDataAccount
      );

      if (!userDataAccountInfo) {
        throw new Error("User data not found");
      }

      const userDataDecoded = program.coder.accounts.decode(
        "UserDataAccount",
        userDataAccountInfo.data
      );

      // Decrypt the user data (in a real FHE system, this would be done securely)
      const decryptedData = await decrypt(userDataDecoded.encryptedData);

      // Re-encrypt the data for ad matching (in a real FHE system, this would be done differently)
      const reEncryptedData = await encrypt(decryptedData);

      return Buffer.from(reEncryptedData);
    } catch (err) {
      console.error("Error fetching encrypted user traits:", err);
      throw err;
    }
  };

  return (
    <div>
      <h2>Ad Matching</h2>
      <button onClick={matchAds} disabled={isLoading || !publicKey}>
        {isLoading ? "Matching..." : "Match Ads"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {matchedAds.length > 0 && (
        <div>
          <h3>Matched Ads:</h3>
          <ul>
            {matchedAds.map((ad, index) => (
              <li key={index}>
                Ad: {ad.pubkey} - Score: {ad.score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdMatching;
