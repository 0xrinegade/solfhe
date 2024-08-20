"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Sahte veriler
const mockTransaction = {
  hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  blockNumber: 1234567,
  from: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
  to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
  value: BigInt("1000000000000000000"), // 1 ETH
  input: "0xabcdef",
  gasPrice: BigInt("20000000000"), // 20 Gwei
};

const mockReceipt = {
  contractAddress: null,
  logs: [
    {
      topics: ["0xabcdef", "0x123456", "0x7890ab"],
    },
  ],
};

// Sahte fonksiyon detayları
const mockFunctionCalled = "0xabcdef";

const mockTargetNetwork = {
  nativeCurrency: {
    symbol: "ETH",
  },
};

const TransactionComp = ({ txHash }: { txHash: string }) => {
  const router = useRouter();
  const [transaction, setTransaction] = useState<typeof mockTransaction | null>(null);
  const [receipt, setReceipt] = useState<typeof mockReceipt | null>(null);
  const [functionCalled, setFunctionCalled] = useState<string | null>(null);

  useEffect(() => {
    if (txHash) {
      // Burada sahte veriler kullanılıyor
      setTransaction(mockTransaction);
      setReceipt(mockReceipt);
      setFunctionCalled(mockFunctionCalled);
    }
  }, [txHash]);

  return (
    <div className="container mx-auto mt-10 mb-20 px-10 md:px-0">
      <button className="btn btn-sm btn-primary" onClick={() => router.back()}>
        Back
      </button>
      {transaction ? (
        <div className="overflow-x-auto">
          <h2 className="text-3xl font-bold mb-4 text-center text-primary-content">Transaction Details</h2>
          <table className="table rounded-lg bg-base-100 w-full shadow-lg md:table-lg table-md">
            <tbody>
              <tr>
                <td>
                  <strong>Transaction Hash:</strong>
                </td>
                <td>{transaction.hash}</td>
              </tr>
              <tr>
                <td>
                  <strong>Block Number:</strong>
                </td>
                <td>{transaction.blockNumber}</td>
              </tr>
              <tr>
                <td>
                  <strong>From:</strong>
                </td>
                <td>
                  <span>{transaction.from}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>To:</strong>
                </td>
                <td>
                  {!receipt?.contractAddress ? (
                    <span>{transaction.to}</span>
                  ) : (
                    <span>
                      Contract Creation: <span>{receipt.contractAddress}</span>
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Value:</strong>
                </td>
                <td>
                  {Number(transaction.value) / 1e18} {mockTargetNetwork.nativeCurrency.symbol}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Function called:</strong>
                </td>
                <td>
                  <div className="w-full md:max-w-[600px] lg:max-w-[800px] overflow-x-auto whitespace-nowrap">
                    {functionCalled === "0x" ? (
                      "This transaction did not call any function."
                    ) : (
                      <>
                        <span className="mr-2">Function Details Placeholder</span>
                        <span className="badge badge-primary font-bold">{functionCalled}</span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Gas Price:</strong>
                </td>
                <td>{Number(transaction.gasPrice) / 1e9} Gwei</td>
              </tr>
              <tr>
                <td>
                  <strong>Data:</strong>
                </td>
                <td className="form-control">
                  <textarea readOnly value={transaction.input} className="p-0 textarea-primary bg-inherit h-[150px]" />
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Logs:</strong>
                </td>
                <td>
                  <ul>
                    {receipt?.logs?.map((log, i) => (
                      <li key={i}>
                        <strong>Log {i} topics:</strong> {JSON.stringify(log.topics)}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-2xl text-base-content">Loading...</p>
      )}
    </div>
  );
};

export default TransactionComp;
