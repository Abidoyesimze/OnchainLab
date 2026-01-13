/**
 * This file contains the deployed contract addresses and ABIs for OnchainLab on Mantle Sepolia Testnet.
 * These contracts were deployed to Chain ID: 5003
 */
import {
  ContractAnalyzerABI,
  ContractTemplatesABI,
  DeFiUtilsABI,
  ERC20FactoryABI,
  MerkleProofABI,
  MerkleProofValidatorABI,
} from "../ABI";

// Contract addresses for easy access
export const CONTRACT_ADDRESSES = {
  ContractAnalyzer: "0xeAf73aee69441cA68166bc0E1BE63E70F2ce2c06",
  // TODO: Update addresses when other contracts are deployed
  ERC20Factory: "0x0000000000000000000000000000000000000000",
  DeFiUtils: "0x0000000000000000000000000000000000000000",
  ContractTemplates: "0x0000000000000000000000000000000000000000",
  MerkleProofValidator: "0x0000000000000000000000000000000000000000",
  MerkleProof: "0x0000000000000000000000000000000000000000",
} as const;

// Contract ABIs for easy access
export const CONTRACT_ABIS = {
  ERC20Factory: ERC20FactoryABI,
  DeFiUtils: DeFiUtilsABI,
  ContractAnalyzer: ContractAnalyzerABI,
  ContractTemplates: ContractTemplatesABI,
  MerkleProofValidator: MerkleProofValidatorABI,
  MerkleProof: MerkleProofABI,
} as const;

// Network information
export const NETWORK_INFO = {
  name: "Mantle Sepolia Testnet",
  chainId: 5003,
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  blockExplorer: "https://explorer.sepolia.mantle.xyz",
  nativeCurrency: {
    name: "Mantle Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
} as const;

// Default export for backward compatibility
const deployedContracts = {
  5003: {
    ContractAnalyzer: {
      address: CONTRACT_ADDRESSES.ContractAnalyzer,
      abi: CONTRACT_ABIS.ContractAnalyzer,
    },
    // TODO: Add other contracts when deployed
    ERC20Factory: {
      address: CONTRACT_ADDRESSES.ERC20Factory,
      abi: CONTRACT_ABIS.ERC20Factory,
    },
    DeFiUtils: {
      address: CONTRACT_ADDRESSES.DeFiUtils,
      abi: CONTRACT_ABIS.DeFiUtils,
    },
    ContractTemplates: {
      address: CONTRACT_ADDRESSES.ContractTemplates,
      abi: CONTRACT_ABIS.ContractTemplates,
    },
    MerkleProofValidator: {
      address: CONTRACT_ADDRESSES.MerkleProofValidator,
      abi: CONTRACT_ABIS.MerkleProofValidator,
    },
    MerkleProof: {
      address: CONTRACT_ADDRESSES.MerkleProof,
      abi: CONTRACT_ABIS.MerkleProof,
    },
  },
};

export default deployedContracts;
