import { defineChain } from "viem";
import * as chains from "viem/chains";

export type ScaffoldConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  dynamicEnvId: string;
  onlyLocalBurnerWallet: boolean;
};

const fhenix = /*#__PURE__*/ defineChain({
  id: 8008135,
  name: "Fhenix",
  nativeCurrency: {
    decimals: 18,
    name: "Fhenix Token",
    symbol: "FHE",
  },
  rpcUrls: {
    default: { http: ["https://api.helium.fhenix.zone"] },
  },
  blockExplorers: {
    default: { name: "Fhenix Explorer", url: "https://explorer.helium.fhenix.zone" },
  },
  testnet: true, // Set to true if this is a testnet
});

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [fhenix],

  // The interval at which your front-end polls the RPC servers for new data
  // it has no effect if you only target the local network (default is 4000)
  pollingInterval: 30000,

  // This is ours Alchemy's default API key.
  // You can get your own at https://dashboard.alchemyapi.io
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF",

  // This is Dynamic's default environment ID.
  // You can get your own at https://app.dynamic.xyz/
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  dynamicEnvId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || "96bae37d-7ed7-44aa-9081-79bb984508fe",

  // Only show the Burner Wallet when running on hardhat network
  onlyLocalBurnerWallet: true,
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
