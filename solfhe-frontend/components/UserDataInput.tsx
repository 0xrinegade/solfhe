import React, { useState, useEffect } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { CONFIG } from "../config";
import { encrypt } from "../utils/fhe";
import * as anchor from "@project-serum/anchor";

interface Trait {
  name: string;
  value: string;
}

const UserDataInput: React.FC = () => {
  const [traits, setTraits] = useState<Trait[]>([{ name: "", value: "" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { program } = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const handleTraitChange = (
    index: number,
    field: "name" | "value",
    value: string
  ) => {
    const newTraits = [...traits];
    newTraits[index][field] = value;
    setTraits(newTraits);
  };

  const addTrait = () => {
    setTraits([...traits, { name: "", value: "" }]);
  };

  const removeTrait = (index: number) => {
    const newTraits = traits.filter((_, i) => i !== index);
    setTraits(newTraits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !program) {
      setError("Wallet not connected or program not loaded");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const encryptedData = await encryptUserData(traits);

      const [userDataAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("user_data"), publicKey.toBuffer()],
        program.programId
      );

      const [stateAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("state")],
        program.programId
      );

      const tx = new Transaction().add(
        await program.instruction.storeEncryptedUserData(encryptedData, {
          accounts: {
            state: stateAccount,
            userData: userDataAccount,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          },
        })
      );

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "processed");

      console.log("User data stored successfully");
      setTraits([{ name: "", value: "" }]);
    } catch (err) {
      console.error("Error storing user data:", err);
      setError(`Error storing user data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const encryptUserData = async (data: Trait[]): Promise<Buffer> => {
    try {
      const traitsString = JSON.stringify(data);
      const encryptedString = await encrypt(traitsString);
      return Buffer.from(encryptedString, "base64");
    } catch (err) {
      console.error("Error encrypting user data:", err);
      throw err;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Enter Your Traits</h2>
      {traits.map((trait, index) => (
        <div key={index}>
          <input
            type="text"
            value={trait.name}
            onChange={(e) => handleTraitChange(index, "name", e.target.value)}
            placeholder="Trait Name"
          />
          <input
            type="text"
            value={trait.value}
            onChange={(e) => handleTraitChange(index, "value", e.target.value)}
            placeholder="Trait Value"
          />
          <button type="button" onClick={() => removeTrait(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addTrait}>
        Add Trait
      </button>
      <button type="submit" disabled={isLoading || !publicKey}>
        {isLoading ? "Storing..." : "Store User Data"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
};

export default UserDataInput;
