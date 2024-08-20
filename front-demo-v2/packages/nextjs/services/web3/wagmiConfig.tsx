import { getOrMapViemChain } from "@dynamic-labs/viem-utils";
import { Chain, createClient, http } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  hardhat,
  mainnet,
  polygon,
  polygonAmoy,
  scroll,
  scrollSepolia,
  sepolia,
} from "viem/chains";
import { createConfig } from "wagmi";
import { customEvmNetworks } from "~~/lib/networks";
import scaffoldConfig from "~~/scaffold.config";

// Örnek HTTP sağlayıcı URL fonksiyonu
const customHttpUrl = (chainId: number) => {
  // Burada chainId'ye göre uygun HTTP URL'yi döndürün
  // Örnek olarak, belirli bir URL kullanabilirsiniz
  return `https://example.com/${chainId}`;
};

export const wagmiConfig = createConfig({
  chains: [
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    mainnet,
    polygon,
    polygonAmoy,
    scroll,
    scrollSepolia,
    sepolia,
    hardhat,
    ...customEvmNetworks.map(getOrMapViemChain),
  ],
  ssr: true,
  client({ chain }) {
    return createClient({
      chain,
      transport: http(customHttpUrl(chain.id)),
      ...(chain.id !== (hardhat as Chain).id
        ? {
            pollingInterval: scaffoldConfig.pollingInterval,
          }
        : {}),
    });
  },
});
