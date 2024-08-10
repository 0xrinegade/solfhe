import React, { useState } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";

const UserDataInput: React.FC = () => {
  const [traits, setTraits] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { program } = useProgram();
  const { publicKey } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setIsLoading(true);
    try {
      // This part should be a real FHE encryption process
      const encryptedData = await encryptUserData(traits);

      const userDataAccount = await PublicKey.findProgramAddress(
        [Buffer.from("user_data"), publicKey.toBuffer()],
        program.programId
      );

      await program.rpc.storeEncryptedUserData(encryptedData, {
        accounts: {
          state: new PublicKey("STATE_ACCOUNT_PUBLIC_KEY"),
          userData: userDataAccount[0],
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        },
      });

      console.log("User data stored successfully");
    } catch (error) {
      console.error("Error storing user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // This function should encrypt user data
  const encryptUserData = async (data: string): Promise<Buffer> => {
    // This part should include the actual FHE encryption process
    // For now we return dummy data
    return Buffer.from(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Enter Your Traits</h2>
      <textarea
        value={traits}
        onChange={(e) => setTraits(e.target.value)}
        placeholder="Enter your traits (comma-separated)"
      />
      <button type="submit" disabled={isLoading || !publicKey}>
        {isLoading ? "Storing..." : "Store User Data"}
      </button>
    </form>
  );
};

export default UserDataInput;
