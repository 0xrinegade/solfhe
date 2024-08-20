// Basit bir metadata nesnesi oluşturuyoruz
export const metadata = {
  title: "Block Explorer",
  description: "Block Explorer created without ETH or scaffold-eth dependencies",
};

const BlockExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default BlockExplorerLayout;
