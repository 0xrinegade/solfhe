import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@project-serum/anchor";
// import idl from "../idl/solfhe.json"; // IDL file dir.
import { SolfheProgram } from "../types/solfhe"; // Program type
import { PROGRAM_ID } from "../utils/constants";

type ProgramError = {
  message: string;
  code?: string;
};

export const useProgram = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [program, setProgram] = useState<Program<SolfheProgram> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProgramError | null>(null);

  const initializeProgram = useCallback(async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError({ message: "Wallet not connected" });
      setLoading(false);
      return;
    }

    try {
      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction,
          signAllTransactions,
        },
        { commitment: "confirmed" }
      );

      const programId = new PublicKey(PROGRAM_ID);
      const program = new Program(
        idl as Idl,
        programId,
        provider
      ) as Program<SolfheProgram>;

      setProgram(program);
      setError(null);
    } catch (err) {
      console.error("Failed to initialize program:", err);
      setError({
        message: "Failed to initialize program",
        code: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  useEffect(() => {
    initializeProgram();
  }, [initializeProgram]);

  const getProgramAccountInfo = useCallback(
    async (accountPubkey: PublicKey) => {
      if (!program) {
        throw new Error("Program not initialized");
      }

      try {
        const accountInfo = await program.account.fetchAccount(accountPubkey);
        return accountInfo;
      } catch (err) {
        console.error("Failed to fetch account info:", err);
        throw new Error("Failed to fetch account info");
      }
    },
    [program]
  );

  const refreshProgram = useCallback(() => {
    setLoading(true);
    initializeProgram();
  }, [initializeProgram]);

  return {
    program,
    loading,
    error,
    getProgramAccountInfo,
    refreshProgram,
  };
};
