import TransactionComp from "../_components/TransactionComp";
import type { NextPage } from "next";

type PageProps = {
  params: { txHash?: string };
};

// Statik parametreler oluşturuluyor
export function generateStaticParams() {
  return [{ txHash: "0x0000000000000000000000000000000000000000" }];
}

const TransactionPage: NextPage<PageProps> = ({ params }: PageProps) => {
  const txHash = params?.txHash as string;

  // Sahte bir işlem ID’si kontrolü yapılır
  if (txHash === "0x0000000000000000000000000000000000000000") return null;

  return <TransactionComp txHash={txHash} />;
};

export default TransactionPage;
