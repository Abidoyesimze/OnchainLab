import { ethers } from "ethers";
import { keccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";

// Helper function to check if a string is a valid Ethereum address
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
};

// Helper function to sort addresses
export const sortAddresses = (addresses: string[]): string[] => {
  return addresses.map(addr => addr.toLowerCase()).sort();
};

// Generate a Merkle tree from a list of addresses
export const generateMerkleTree = (addresses: string[]): MerkleTree => {
  // Convert addresses to lowercase and hash them
  const leaves = addresses.map(addr => keccak256(addr.toLowerCase()));
  // Create the Merkle tree
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
};

// Generate a Merkle proof for a specific address
export const generateMerkleProof = (tree: MerkleTree, address: string): string[] => {
  const leaf = keccak256(address.toLowerCase());
  return tree.getHexProof(leaf);
};

// Verify a Merkle proof for a specific address
export const verifyMerkleProof = (root: string, proof: string[], address: string): boolean => {
  const leaf = keccak256(address.toLowerCase());
  return MerkleTree.verify(proof, leaf, root, keccak256);
};

// Export MerkleTree
export { MerkleTree };
