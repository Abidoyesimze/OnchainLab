// Import all contract ABIs
import ContractAnalyzerABI from "./ContractAnalyzer.json";
import ContractTemplatesABI from "./ContractTemplates.json";
import DeFiUtilsABI from "./DeFiUtils.json";
import ERC20FactoryABI from "./ERC20Factory.json";
import ERC721FactoryABI from "./ERC721FactoryABI.json";
import ERC1155FactoryABI from "./ERC1155FactoryABI.json";
import MerkleProofABI from "./MerkleProof.json";
import MerkleProofValidatorABI from "./MerkleProofValidator.json";

// Helper function to get contract address based on network
export const getContractAddress = (contractName: string, network: 'etn' | 'somnia' = 'etn') => {
  const contracts = {
    ContractAnalyzer: ContractAnalyzerContract,
    ContractTemplates: ContractTemplatesContract,
    DeFiUtils: DeFiUtilsContract,
    ERC20Factory: ERC20FactoryContract,
    ERC721Factory: ERC721FactoryContract,
    ERC1155Factory: ERC1155FactoryContract,
    MerkleProof: MerkleProofContract,
    MerkleProofValidator: MerkleProofValidatorContract,
  };
  
  const contract = contracts[contractName as keyof typeof contracts];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found`);
  }
  
  return contract.addresses[network] || contract.address;
};

// Export individual ABIs for backward compatibility
export {
  ContractAnalyzerABI,
  ContractTemplatesABI,
  DeFiUtilsABI,
  ERC20FactoryABI,
  ERC721FactoryABI,
  ERC1155FactoryABI,
  MerkleProofABI,
  MerkleProofValidatorABI,
};

// Export contract objects with ABI and address
// ETN Testnet addresses
export const ContractAnalyzerContract = {
  abi: ContractAnalyzerABI,
  address: "0x4A4EBc7bfb813069e5495fB36B53cc937A31b441", // ETN Testnet
  addresses: {
    etn: "0x4A4EBc7bfb813069e5495fB36B53cc937A31b441",
    somnia: "0xB0170720d8BB751Ed8F7cC071b8D0d9b4e5f501F",
  },
};

export const ContractTemplatesContract = {
  abi: ContractTemplatesABI,
  address: "0x9f853686c5162A8E210dc9D13a8114f095Fc17F3", // ETN Testnet
  addresses: {
    etn: "0x9f853686c5162A8E210dc9D13a8114f095Fc17F3",
    somnia: "0x24AAE861EAd800726066145d998BaECb73e61bD7", // Updated to allow 2-of-2 multi-sig
  },
};

export const DeFiUtilsContract = {
  abi: DeFiUtilsABI,
  address: "0x2d03D266204c1c5c4B29A36c499CA15a72b1C2A0", // ETN Testnet
  addresses: {
    etn: "0x2d03D266204c1c5c4B29A36c499CA15a72b1C2A0",
    somnia: "0x875CbF85A375a573645a475Fe9daD9678FA24625",
  },
};

export const ERC20FactoryContract = {
  abi: ERC20FactoryABI,
  address: "0xdB34E8611333Fd6dd3a57C59F125ebA8878378Cd", // ETN Testnet
  addresses: {
    etn: "0xdB34E8611333Fd6dd3a57C59F125ebA8878378Cd",
    somnia: "0x4F6D41C9F94FdD64c8D82C4eb71a459075E5Ae57",
  },
};

export const ERC721FactoryContract = {
  abi: ERC721FactoryABI,
  address: "0xB818Da67ccb75651556Fd301BCE23c6d094EFD0b", // ETN Testnet
  addresses: {
    etn: "0xB818Da67ccb75651556Fd301BCE23c6d094EFD0b",
    somnia: "0x915C81F20f8A6fFe4A19342B2C54Bf0840C37B9A",
  },
};

export const ERC1155FactoryContract = {
  abi: ERC1155FactoryABI,
  address: "0x57999eC2a3a01D5212b1D4302991B57E98aA4CC5", // ETN Testnet
  addresses: {
    etn: "0x57999eC2a3a01D5212b1D4302991B57E98aA4CC5",
    somnia: "0xaA65bf9B2c119Df5043498f0C78D7FC1a6F6F4B4",
  },
};

export const MerkleProofContract = {
  abi: MerkleProofABI,
  address: "0xbF1B2ca2CC17Bd98679D584575d549c62B3214eb", // ETN Testnet
  addresses: {
    etn: "0xbF1B2ca2CC17Bd98679D584575d549c62B3214eb",
    somnia: "0x0f1d9F35bc1631D8C3eB6A2B35A2972bF5061E53",
  },
};

export const MerkleProofValidatorContract = {
  abi: MerkleProofValidatorABI,
  address: "0x88deaBcDDdAD618aBd67eCBdf490f68646c088aD", // ETN Testnet
  addresses: {
    etn: "0x88deaBcDDdAD618aBd67eCBdf490f68646c088aD",
    somnia: "0x6FA75F5dc94A1Cec18a8a113851231c66e2Bb90f",
  },
};
