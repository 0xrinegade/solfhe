import { formatEther } from "viem";

// Basit bir `Address` bileşeni; tam adres yerine sadece ilk ve son birkaç karakteri gösterir.
const Address = ({ address, size }: { address: string; size: "sm" | "md" }) => {
  const displayAddress =
    size === "sm" ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  return <span>{displayAddress}</span>;
};

// Placeholder veriler; `useTargetNetwork` işlevselliği olmadan elle belirlenen nativeCurrency.
const targetNetwork = {
  nativeCurrency: { symbol: "ETH" },
};

// Yeni `TransactionsTable` bileşeni.
export const TransactionsTable = ({
  blocks,
  transactionReceipts,
}: {
  blocks: any[];
  transactionReceipts: { [key: string]: any };
}) => {
  return (
    <div className="flex justify-center px-4 md:px-0">
      <div className="overflow-x-auto w-full shadow-2xl rounded-xl">
        <table className="table text-xl bg-base-100 table-zebra w-full md:table-md table-sm">
          <thead>
            <tr className="rounded-xl text-sm text-base-content">
              <th className="bg-primary">Transaction Hash</th>
              <th className="bg-primary">Function Called</th>
              <th className="bg-primary">Block Number</th>
              <th className="bg-primary">Time Mined</th>
              <th className="bg-primary">From</th>
              <th className="bg-primary">To</th>
              <th className="bg-primary text-end">
                Value ({targetNetwork.nativeCurrency.symbol})
              </th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) =>
              block.transactions.map((tx: any) => {
                const receipt = transactionReceipts[tx.hash];
                const timeMined = new Date(Number(block.timestamp) * 1000).toLocaleString();
                const functionCalled = tx.input.substring(0, 10);

                return (
                  <tr key={tx.hash} className="hover text-sm">
                    <td className="w-1/12 md:py-4">
                      <span>{tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}</span>
                    </td>
                    <td className="w-2/12 md:py-4">
                      {tx.functionName === "0x" ? (
                        ""
                      ) : (
                        <span className="mr-1">{tx.functionName}</span>
                      )}
                      {functionCalled !== "0x" && (
                        <span className="badge badge-primary font-bold text-xs">
                          {functionCalled}
                        </span>
                      )}
                    </td>
                    <td className="w-1/12 md:py-4">{block.number?.toString()}</td>
                    <td className="w-2/1 md:py-4">{timeMined}</td>
                    <td className="w-2/12 md:py-4">
                      <Address address={tx.from} size="sm" />
                    </td>
                    <td className="w-2/12 md:py-4">
                      {!receipt?.contractAddress ? (
                        tx.to && <Address address={tx.to} size="sm" />
                      ) : (
                        <div className="relative">
                          <Address address={receipt.contractAddress} size="sm" />
                          <small className="absolute top-4 left-4">(Contract Creation)</small>
                        </div>
                      )}
                    </td>
                    <td className="text-right md:py-4">
                      {formatEther(tx.value)} {targetNetwork.nativeCurrency.symbol}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
