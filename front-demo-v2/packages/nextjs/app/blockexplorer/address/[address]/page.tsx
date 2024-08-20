import fs from "fs";
import path from "path";

// Sözleşme bilgilerini temsil eden arayüz
interface ContractInfo {
  address: string;
  [key: string]: any; // Ekstra özellikler olabilir
}

interface DeployedContracts {
  [contractName: string]: ContractInfo;
}

const AddressComponent = ({
  address,
  contractData,
}: {
  address: string;
  contractData: { bytecode: string; assembly: string } | null;
}) => (
  <div>
    <h1>Address: {address}</h1>
    {contractData ? (
      <div>
        <h2>Bytecode:</h2>
        <pre>{contractData.bytecode}</pre>
        <h2>Assembly:</h2>
        <pre>{contractData.assembly}</pre>
      </div>
    ) : (
      <p>No contract found at this address.</p>
    )}
  </div>
);

async function fetchByteCodeAndAssembly(buildInfoDirectory: string, contractPath: string) {
  const buildInfoFiles = fs.readdirSync(buildInfoDirectory);
  let bytecode = "";
  let assembly = "";

  for (let i = 0; i < buildInfoFiles.length; i++) {
    const filePath = path.join(buildInfoDirectory, buildInfoFiles[i]);

    const buildInfo = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (buildInfo.output.contracts[contractPath]) {
      for (const contract in buildInfo.output.contracts[contractPath]) {
        bytecode = buildInfo.output.contracts[contractPath][contract].evm.bytecode.object;
        assembly = buildInfo.output.contracts[contractPath][contract].evm.bytecode.opcodes;
        break;
      }
    }

    if (bytecode && assembly) {
      break;
    }
  }

  return { bytecode, assembly };
}

const getContractData = async (address: string, chainId: number, contractsDirectory: string) => {
  let contractPath = "";

  const buildInfoDirectory = path.join(contractsDirectory, "artifacts", "build-info");

  if (!fs.existsSync(buildInfoDirectory)) {
    throw new Error(`Directory ${buildInfoDirectory} not found.`);
  }

  // JSON dosyasını okur ve uygun türde pars eder
  const deployedContractsOnChain: DeployedContracts = fs.existsSync(contractsDirectory)
    ? JSON.parse(fs.readFileSync(path.join(contractsDirectory, "deployedContracts.json"), "utf8"))
    : {};
  
  for (const [contractName, contractInfo] of Object.entries(deployedContractsOnChain)) {
    if (contractInfo.address.toLowerCase() === address.toLowerCase()) {
      contractPath = `contracts/${contractName}.sol`;
      break;
    }
  }

  if (!contractPath) {
    return null;
  }

  const { bytecode, assembly } = await fetchByteCodeAndAssembly(buildInfoDirectory, contractPath);

  return { bytecode, assembly };
};

const AddressPage = async ({ params }: { params: { address: string } }) => {
  const address = params?.address as string;
  
  if (address === "0x0000000000000000000000000000000000000000") return null;

  const chainId = 31337; // Hardhat yerel ağı chainId
  const contractsDirectory = path.join(__dirname, "..", "..", "..", "hardhat");

  const contractData = await getContractData(address, chainId, contractsDirectory);
  return <AddressComponent address={address} contractData={contractData} />;
};

export function generateStaticParams() {
  return [{ address: "0x0000000000000000000000000000000000000000" }];
}

export default AddressPage;
