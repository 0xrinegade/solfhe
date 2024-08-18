import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Solfhe } from "../target/types/solfhe";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";

describe("solfhe", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solfhe as Program<Solfhe>;

  let statePDA: PublicKey;
  let advertiserKeypair: Keypair;
  let userKeypair: Keypair;

  before(async () => {
    [statePDA] = await PublicKey.findProgramAddress(
      [Buffer.from("state")],
      program.programId
    );
    advertiserKeypair = Keypair.generate();
    userKeypair = Keypair.generate();

    // Airdrop some SOL to the advertiser and user
    await provider.connection.requestAirdrop(
      advertiserKeypair.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      userKeypair.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
  });

  it("Initializes the program", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        state: statePDA,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction signature", tx);

    const stateAccount = await program.account.stateAccount.fetch(statePDA);
    expect(stateAccount.authority).to.eql(provider.wallet.publicKey);
    expect(stateAccount.advertiserCount.toNumber()).to.equal(0);
    expect(stateAccount.userCount.toNumber()).to.equal(0);
    expect(stateAccount.adCount.toNumber()).to.equal(0);
    expect(stateAccount.proofCount.toNumber()).to.equal(0);
  });

  it("Registers an advertiser", async () => {
    const name = "Test Advertiser";
    const email = "test@example.com";

    const [advertiserPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("advertiser"), advertiserKeypair.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .registerAdvertiser(name, email)
      .accounts({
        state: statePDA,
        advertiser: advertiserPDA,
        authority: advertiserKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([advertiserKeypair])
      .rpc();

    console.log("Register advertiser transaction signature", tx);

    const advertiserAccount = await program.account.advertiserAccount.fetch(
      advertiserPDA
    );
    expect(advertiserAccount.authority).to.eql(advertiserKeypair.publicKey);
    expect(advertiserAccount.name).to.equal(name);
    expect(advertiserAccount.email).to.equal(email);
    expect(advertiserAccount.adCount.toNumber()).to.equal(0);
  });

  it("Creates an ad", async () => {
    const content = "Test Ad Content";
    const targetTraits = Buffer.from([1, 2, 3, 4]);
    const duration = new BN(7 * 24 * 60 * 60); // 7 days in seconds
    const payment = new BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

    const [advertiserPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("advertiser"), advertiserKeypair.publicKey.toBuffer()],
      program.programId
    );

    const [adPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("ad"),
        advertiserPDA.toBuffer(),
        new BN(0).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .createAd(content, targetTraits, duration, payment)
      .accounts({
        state: statePDA,
        advertiser: advertiserPDA,
        ad: adPDA,
        authority: advertiserKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([advertiserKeypair])
      .rpc();

    console.log("Create ad transaction signature", tx);

    const adAccount = await program.account.adAccount.fetch(adPDA);
    expect(adAccount.advertiser).to.eql(advertiserKeypair.publicKey);
    expect(adAccount.content).to.equal(content);
    expect(Buffer.from(adAccount.targetTraits)).to.eql(targetTraits);
    expect(adAccount.duration.toNumber()).to.equal(duration.toNumber());
    expect(adAccount.payment.toNumber()).to.equal(payment.toNumber());
    expect(adAccount.isActive).to.be.true;
  });

  it("Stores encrypted user data", async () => {
    const encryptedData = Buffer.from("encrypted user data");

    const [userDataPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("user_data"), userKeypair.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .storeEncryptedUserData(encryptedData)
      .accounts({
        state: statePDA,
        userData: userDataPDA,
        authority: userKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKeypair])
      .rpc();

    console.log("Store encrypted user data transaction signature", tx);

    const userDataAccount = await program.account.userDataAccount.fetch(
      userDataPDA
    );
    expect(userDataAccount.authority).to.eql(userKeypair.publicKey);
    expect(Buffer.from(userDataAccount.encryptedData)).to.eql(encryptedData);
  });

  // TODO: 🏗️ Need mocs and hyperlane imp.

  it("Matches ads (simplified)", async () => {
    const encryptedUserTraits = Buffer.from("encrypted user traits");

    const [matchedAdsPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("matched_ads"), userKeypair.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .matchAds(encryptedUserTraits)
      .accounts({
        state: statePDA,
        ads: program.programId,
        matchedAds: matchedAdsPDA,
        authority: userKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKeypair])
      .rpc();

    console.log("Match ads transaction signature", tx);
  });
});
