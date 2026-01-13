import fs from "fs";
import path from "path";
import { hardhat } from "viem/chains";
import { AddressComponent } from "~~/app/blockexplorer/_components/AddressComponent";
import deployedContracts from "~~/contracts/deployedContracts";
import { isZeroAddress } from "~~/utils/core/common";
import { GenericContractsDeclaration } from "~~/utils/core/contract";

type PageProps = {
  params: Promise<{ address: string }>;
};

async function fetchByteCodeAndAssembly(buildInfoDirectory: string, contractPath: string) {
  try {
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
  } catch (error) {
    console.error("Error fetching bytecode and assembly:", error);
    return { bytecode: "", assembly: "" };
  }
}

const getContractData = async (address: string) => {
  try {
    const contracts = deployedContracts as GenericContractsDeclaration | null;
    const chainId = hardhat.id;
    let contractPath = "";

    const buildInfoDirectory = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "..",
      "..",
      "hardhat",
      "artifacts",
      "build-info",
    );

    if (!fs.existsSync(buildInfoDirectory)) {
      console.warn(`Build info directory not found: ${buildInfoDirectory}`);
      return null;
    }

    const deployedContractsOnChain = contracts ? contracts[chainId] : {};
    for (const [contractName, contractInfo] of Object.entries(deployedContractsOnChain)) {
      if (contractInfo.address.toLowerCase() === address.toLowerCase()) {
        contractPath = `contracts/${contractName}.sol`;
        break;
      }
    }

    if (!contractPath) {
      // No contract found at this address - this is normal for external contracts
      return null;
    }

    const { bytecode, assembly } = await fetchByteCodeAndAssembly(buildInfoDirectory, contractPath);

    return { bytecode, assembly };
  } catch (error) {
    console.error("Error getting contract data:", error);
    return null;
  }
};

export function generateStaticParams() {
  // An workaround to enable static exports in Next.js, generating single dummy page.
  return [{ address: "0x0000000000000000000000000000000000000000" }];
}

const AddressPage = async (props: PageProps) => {
  const params = await props.params;
  const address = params?.address as string;

  if (isZeroAddress(address)) return null;

  const contractData: { bytecode: string; assembly: string } | null = await getContractData(address);
  return <AddressComponent address={address} contractData={contractData} />;
};

export default AddressPage;
