/**
 * This file contains the deployed contract addresses and ABIs for OnchainLab on Mantle Sepolia Testnet.
 * These contracts were deployed to Chain ID: 5003
 */
import {
  ContractAnalyzerABI,
  ContractTemplatesABI,
  DeFiUtilsABI,
  ERC20FactoryABI,
  ERC721FactoryABI,
  ERC1155FactoryABI,
  MerkleProofABI,
  MerkleProofValidatorABI,
} from "../ABI";

// Contract addresses for easy access
export const CONTRACT_ADDRESSES = {
  ContractAnalyzer: "0xeAf73aee69441cA68166bc0E1BE63E70F2ce2c06",
  ContractTemplates: "0x836E78d3059a17E9D11C509c0b82782490B9d84D",
  DeFiUtils: "0x208Cc34f586b70c35d0Db69E3A1FCdF8B8Eb35cc",
  ERC20Factory: "0x813a30B635e0925bA02fce2234B72F18c0B8F46F",
  ERC721Factory: "0x05e4f6A15Ef1016691332c94037694031FC26F35",
  ERC1155Factory: "0x74560D1B931c5A60A4Da31F24d2aB92aa9365190",
  MerkleProofValidator: "0xE13e882Fd85071541700355C07A520926f3c11fa",
  MerkleProof: "0xC51083720359DBaDe92d52f809a17Ef3e7180e2b",
} as const;

// Contract ABIs for easy access
// Extract abi property if it's a full artifact object
const extractABI = (abiOrArtifact: any) => {
  if (abiOrArtifact && typeof abiOrArtifact === 'object' && 'abi' in abiOrArtifact) {
    return abiOrArtifact.abi;
  }
  return abiOrArtifact;
};

export const CONTRACT_ABIS = {
  ERC20Factory: extractABI(ERC20FactoryABI),
  ERC721Factory: extractABI(ERC721FactoryABI),
  ERC1155Factory: extractABI(ERC1155FactoryABI),
  DeFiUtils: extractABI(DeFiUtilsABI),
  ContractAnalyzer: extractABI(ContractAnalyzerABI),
  ContractTemplates: extractABI(ContractTemplatesABI),
  MerkleProofValidator: extractABI(MerkleProofValidatorABI),
  MerkleProof: extractABI(MerkleProofABI),
} as const;

// Network information
export const NETWORK_INFO = {
  name: "Mantle Sepolia Testnet",
  chainId: 5003,
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  blockExplorer: "https://sepolia.mantlescan.xyz",
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
    ContractTemplates: {
      address: CONTRACT_ADDRESSES.ContractTemplates,
      abi: CONTRACT_ABIS.ContractTemplates,
    },
    DeFiUtils: {
      address: CONTRACT_ADDRESSES.DeFiUtils,
      abi: CONTRACT_ABIS.DeFiUtils,
    },
    ERC20Factory: {
      address: CONTRACT_ADDRESSES.ERC20Factory,
      abi: CONTRACT_ABIS.ERC20Factory,
    },
    ERC721Factory: {
      address: CONTRACT_ADDRESSES.ERC721Factory,
      abi: CONTRACT_ABIS.ERC721Factory,
    },
    ERC1155Factory: {
      address: CONTRACT_ADDRESSES.ERC1155Factory,
      abi: CONTRACT_ABIS.ERC1155Factory,
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
