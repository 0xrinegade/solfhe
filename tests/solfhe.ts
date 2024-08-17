import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
// import { Solfhe } from "../target/types/solfhe";
import { expect } from "chai";

describe("solfhe", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solfhe as Program<Solfhe>;

  it("Initializes the program", async () => {
    const [statePDA] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("state")],
      program.programId
    );

    const tx = await program.methods
      .initialize()
      .accounts({
        state: statePDA,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const stateAccount = await program.account.stateAccount.fetch(statePDA);
    expect(stateAccount.authority).to.eql(provider.wallet.publicKey);
    expect(stateAccount.advertiserCount).to.eql(0);
    expect(stateAccount.userCount).to.eql(0);
    expect(stateAccount.adCount).to.eql(0);
    expect(stateAccount.proofCount).to.eql(0);
  });
});
