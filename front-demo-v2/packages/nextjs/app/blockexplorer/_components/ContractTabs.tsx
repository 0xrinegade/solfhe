"use client";

import { useEffect, useState } from "react";
import { AddressCodeTab } from "./AddressCodeTab";
import { AddressLogsTab } from "./AddressLogsTab";
import { AddressStorageTab } from "./AddressStorageTab";
import { TransactionsTable } from "./TransactionsTable";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";

// Mock useFetchBlocks hook, replace with actual implementation
const useFetchBlocks = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [transactionReceipts, setTransactionReceipts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const totalBlocks = 100; // Replace with actual total block count

  useEffect(() => {
    const fetchBlocks = async () => {
      // This is a placeholder. Replace with actual logic to fetch blocks and transaction receipts.
      const exampleBlocks = [
        {
          transactions: [
            { from: "0x...", to: "0x...", value: "1000000000000000000" },
            // Add more transactions as needed
          ],
        },
      ];
      setBlocks(exampleBlocks);
      setTransactionReceipts([]); // Replace with actual transaction receipts
    };

    fetchBlocks();
  }, [currentPage]);

  return { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage };
};

type AddressCodeTabProps = {
  bytecode: string;
  assembly: string;
};

type PageProps = {
  address: string;
  contractData: AddressCodeTabProps | null;
};

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(),
});

export const ContractTabs = ({ address, contractData }: PageProps) => {
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage } = useFetchBlocks();
  const [activeTab, setActiveTab] = useState("transactions");
  const [isContract, setIsContract] = useState(false);

  useEffect(() => {
    const checkIsContract = async () => {
      const contractCode = await publicClient.getBytecode({ address: address });
      setIsContract(contractCode !== undefined && contractCode !== "0x");
    };

    checkIsContract();
  }, [address]);

  const filteredBlocks = blocks.filter(block =>
    block.transactions.some((tx: { from: string; to: string; }) => {
      if (typeof tx === "string") {
        return false;
      }
      return tx.from.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase();
    }),
  );

  return (
    <>
      {isContract && (
        <div className="tabs tabs-lifted w-min">
          <button
            className={`tab ${activeTab === "transactions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>
          <button className={`tab ${activeTab === "code" ? "tab-active" : ""}`} onClick={() => setActiveTab("code")}>
            Code
          </button>
          <button
            className={`tab  ${activeTab === "storage" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("storage")}
          >
            Storage
          </button>
          <button className={`tab  ${activeTab === "logs" ? "tab-active" : ""}`} onClick={() => setActiveTab("logs")}>
            Logs
          </button>
        </div>
      )}
      {activeTab === "transactions" && (
        <div className="pt-4">
          <TransactionsTable blocks={filteredBlocks} transactionReceipts={transactionReceipts} />
          <div className="flex justify-center">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="btn btn-primary"
            >
              Previous
            </button>
            <button
              disabled={currentPage === Math.ceil(totalBlocks / 10)}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="btn btn-primary"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {activeTab === "code" && contractData && (
        <AddressCodeTab bytecode={contractData.bytecode} assembly={contractData.assembly} />
      )}
      {activeTab === "storage" && <AddressStorageTab address={address} />}
      {activeTab === "logs" && <AddressLogsTab address={address} />}
    </>
  );
};
