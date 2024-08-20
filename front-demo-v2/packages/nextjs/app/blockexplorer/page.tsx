"use client";

import { useEffect, useState } from "react";
import { PaginationButton, SearchBar, TransactionsTable } from "./_components";

// Sahte veriler ve fonksiyonlar
const mockBlocks: any[] | (() => any[]) = [];
const mockTransactionReceipts: any[] | (() => any[]) = [];
const mockTotalBlocks = 100;
const mockTargetNetwork = {
  id: 1,
  name: "Localhost",
  blockExplorers: {
    default: {
      url: "http://localhost:3000",
      name: "Local Block Explorer",
    },
  },
};

// Sahte hata işleme
const simulateError = false;

const BlockExplorer = () => {
  const [blocks, setBlocks] = useState(mockBlocks);
  const [transactionReceipts, setTransactionReceipts] = useState(mockTransactionReceipts);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBlocks, setTotalBlocks] = useState(mockTotalBlocks);
  const [targetNetwork, setTargetNetwork] = useState(mockTargetNetwork);
  const [isLocalNetwork, setIsLocalNetwork] = useState(true);
  const [hasError, setHasError] = useState(simulateError);

  // Network kontrolü
  useEffect(() => {
    if (targetNetwork.id !== 1) { // Yerel ağı kontrol ediyoruz
      setIsLocalNetwork(false);
    }
  }, [targetNetwork.id]);

  // Hata durumu
  useEffect(() => {
    if (targetNetwork.id === 1 && simulateError) {
      setHasError(true);
    }
  }, [targetNetwork.id]);

  // Network hatası bildirimi
  useEffect(() => {
    if (!isLocalNetwork) {
      alert(
        `Network is not localhost. You are on ${targetNetwork.name}. This block explorer is only for localhost. You can use ${targetNetwork.blockExplorers?.default.name} instead.`
      );
    }
  }, [isLocalNetwork, targetNetwork]);

  // Bağlantı hatası bildirimi
  useEffect(() => {
    if (hasError) {
      alert(
        `Cannot connect to local provider. Did you forget to run 'yarn chain'? Or you can change the targetNetwork in the configuration.`
      );
    }
  }, [hasError]);

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default BlockExplorer;
