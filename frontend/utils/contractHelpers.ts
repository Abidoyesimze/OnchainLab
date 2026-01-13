import deployedContracts from "../contracts/deployedContracts";
import { useAccount, useContractRead, useContractWrite } from "wagmi";

// Helper function to get contract address by name and chain ID
export const getContractAddress = (contractName: string, chainId: number = 50312) => {
  const contracts = deployedContracts[chainId as keyof typeof deployedContracts];
  if (!contracts) {
    throw new Error(`No contracts found for chain ID ${chainId}`);
  }

  const contract = contracts[contractName as keyof typeof contracts];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found on chain ${chainId}`);
  }

  return contract.address;
};

// Helper function to get contract ABI by name and chain ID
export const getContractABI = (contractName: string, chainId: number = 50312) => {
  const contracts = deployedContracts[chainId as keyof typeof deployedContracts];
  if (!contracts) {
    throw new Error(`No contracts found for chain ID ${chainId}`);
  }

  const contract = contracts[contractName as keyof typeof contracts];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found on chain ${chainId}`);
  }

  return contract.abi;
};

// Contract addresses for easy access
export const CONTRACT_ADDRESSES = {
  ERC20Factory: "0x4F6D41C9F94FdD64c8D82C4eb71a459075E5Ae57",
  DeFiUtils: "0x8860C6081E3Dd957d225FEf12d718495EBa75255",
  ContractAnalyzer: "0xB0170720d8BB751Ed8F7cC071b8D0d9b4e5f501F",
  ContractTemplates: "0x157f375f0112837CA14c8dAFB9dFe26f83a94634",
  MerkleProofValidator: "0x6FA75F5dc94A1Cec18a8a113851231c66e2Bb90f",
  MerkleProof: "0x0f1d9F35bc1631D8C3eB6A2B35A2972bF5061E53",
} as const;

// Network information
export const NETWORK_INFO = {
  name: "Somnia Testnet",
  chainId: 50312,
  rpcUrl: "https://dream-rpc.somnia.network/",
  blockExplorer: "https://shannon-explorer.somnia.network/",
  nativeCurrency: {
    name: "Somnia Test Token",
    symbol: "STT",
    decimals: 18,
  },
} as const;
