import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, Provider } from "@project-serum/anchor";
import idl from "../utils/idl.json";

const programID = new PublicKey("BxVYzMVCkq4Amxwz5sN8Z9EkATWSoTs99bkLUEmnEscm");

export function useProgram() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const provider = new Provider(
    connection,
    {
      publicKey,
      signTransaction,
      signAllTransactions,
    },
    { commitment: "processed" }
  );

  const program = new Program(idl, programID, provider);

  return {
    program,
    connection,
    provider,
  };
}
