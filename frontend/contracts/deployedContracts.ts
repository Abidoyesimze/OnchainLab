/**
 * This file contains the deployed contract addresses and ABIs for DefiForge on Somnia Testnet.
 * These contracts were deployed to Chain ID: 50312
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
  ERC20Factory: "0x4F6D41C9F94FdD64c8D82C4eb71a459075E5Ae57",
  DeFiUtils: "0x8860C6081E3Dd957d225FEf12d718495EBa75255",
  ContractAnalyzer: "0xB0170720d8BB751Ed8F7cC071b8D0d9b4e5f501F",
  ContractTemplates: "0x157f375f0112837CA14c8dAFB9dFe26f83a94634",
  MerkleProofValidator: "0x6FA75F5dc94A1Cec18a8a113851231c66e2Bb90f",
  MerkleProof: "0x0f1d9F35bc1631D8C3eB6A2B35A2972bF5061E53",
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

// Default export for backward compatibility
const deployedContracts = {
  50312: {
    ERC20Factory: {
      address: CONTRACT_ADDRESSES.ERC20Factory,
      abi: CONTRACT_ABIS.ERC20Factory,
    },
    DeFiUtils: {
      address: CONTRACT_ADDRESSES.DeFiUtils,
      abi: CONTRACT_ABIS.DeFiUtils,
    },
    ContractAnalyzer: {
      address: CONTRACT_ADDRESSES.ContractAnalyzer,
      abi: CONTRACT_ABIS.ContractAnalyzer,
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
