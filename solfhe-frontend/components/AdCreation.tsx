import React, { useState } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";

const AdCreation: React.FC = () => {
  const [content, setContent] = useState("");
  const [targetTraits, setTargetTraits] = useState("");
  const [duration, setDuration] = useState("");
  const [payment, setPayment] = useState("");

  const { program } = useProgram();
  const { publicKey } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    try {
      const stateAccount = new PublicKey("STATE_ACCOUNT_PUBLIC_KEY");
      const [adAccount] = await PublicKey.findProgramAddress(
        [
          Buffer.from("ad"),
          publicKey.toBuffer(),
          Buffer.from(new anchor.BN(0).toArray("le", 8)),
        ],
        program.programId
      );

      const tx = await program.rpc.createAd(
        content,
        Buffer.from(targetTraits),
        new anchor.BN(duration),
        new anchor.BN(payment),
        {
          accounts: {
            state: stateAccount,
            advertiser: publicKey,
            ad: adAccount,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          },
        }
      );
      console.log("Ad created with transaction signature", tx);
    } catch (error) {
      console.error("Error creating ad:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ad Content"
      />
      <input
        type="text"
        value={targetTraits}
        onChange={(e) => setTargetTraits(e.target.value)}
        placeholder="Target Traits"
      />
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Duration"
      />
      <input
        type="number"
        value={payment}
        onChange={(e) => setPayment(e.target.value)}
        placeholder="Payment (SOL)"
      />
      <button type="submit">Create Ad</button>
    </form>
  );
};

export default AdCreation;
