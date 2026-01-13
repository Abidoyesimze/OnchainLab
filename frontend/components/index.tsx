import { MerkleProofContract } from "../ABI";

export const MerkleProofContractComponent = {
  abi: MerkleProofContract.abi,
  address: MerkleProofContract.address,
};

export const MerkleVerifierContract = {
  abi: MerkleProofContract.abi, // Using MerkleProof ABI as fallback
  address: MerkleProofContract.address, // Using MerkleProof address as fallback
};
