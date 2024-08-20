import { Wallet } from "@dynamic-labs/sdk-react-core";
import { NetworkConfigurationMap } from "@dynamic-labs/types";
import { Account, Chain, Hex, Transport, WalletClient, parseEther } from "viem";
import { notification } from "../utils/notification"; 

export const signMessage = async (message: string, wallet: Wallet): Promise<string> => {
  const connector = wallet.connector;
  
  return await connector.signMessage(message);
};

export const sendTransaction = async (
  address: string,
  amount: string,
  wallet: Wallet,
  networkConfigurations: NetworkConfigurationMap,
): Promise<string | undefined> => {
  try {
    const walletClient = wallet.connector.getWalletClient<WalletClient<Transport, Chain, Account>>();

    const chainID = Number(await wallet.connector.getNetwork());

    const currentNetwork = networkConfigurations.evm?.find(network => Number(network.chainId) === chainID);

    if (!currentNetwork) {
      throw new Error("Network not found");
    }

    const chain: Chain = {
      id: Number(currentNetwork.chainId), name: currentNetwork.name,
      nativeCurrency: {
        name: "",
        symbol: "",
        decimals: 0
      },
      rpcUrls: {
        default: {
          http: [],
          webSocket: undefined
        }
      }
    };  
    const transaction = {
      account: wallet.address as Hex,
      to: address as Hex,
      chain,
      value: amount ? parseEther(amount) : undefined,
    };

    const transactionHash = await walletClient.sendTransaction(transaction);
    return transactionHash;
  } catch (e) {
    if (e instanceof Error) {
      notification.error(`Error sending transaction: ${e.message}`);
    } else {
      notification.error("Error sending transaction");
    }
  }
};
