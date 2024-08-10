import { TFHE, TFHEParameters, TFHEPublicKey, TFHESecretKey } from "node-tfhe";

let secretKey: TFHESecretKey | null = null;
let publicKey: TFHEPublicKey | null = null;

export async function initializeFHE() {
  if (!secretKey || !publicKey) {
    const params = TFHEParameters.default();
    const keyPair = TFHE.generateKeyPair(params);
    secretKey = keyPair.secretKey;
    publicKey = keyPair.publicKey;
  }
}

export async function encrypt(data: string): Promise<string> {
  if (!publicKey) {
    await initializeFHE();
  }

  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(data);
  const encryptedArray = uint8Array.map((byte) =>
    TFHE.encrypt(BigInt(byte), publicKey!)
  );

  return JSON.stringify(encryptedArray.map((e) => e.serialize()));
}

export async function decrypt(encryptedData: string): Promise<string> {
  if (!secretKey) {
    throw new Error("Secret key not initialized");
  }

  const encryptedArray = JSON.parse(encryptedData).map((serialized: string) =>
    TFHE.Ciphertext.deserialize(serialized)
  );

  const decryptedArray = encryptedArray.map((ciphertext) =>
    Number(TFHE.decrypt(ciphertext, secretKey!))
  );

  const uint8Array = new Uint8Array(decryptedArray);
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array);
}
