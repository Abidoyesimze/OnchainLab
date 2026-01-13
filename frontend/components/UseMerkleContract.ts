import { useEffect, useState } from "react";
import { MerkleProofContract } from "../ABI";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

// Define TypeScript interfaces for clarity
interface TreeInfo {
  description: string;
  timestamp: number;
  listSize: number;
  creator: string;
  isActive: boolean;
}

// Hook to check if a Merkle root is registered and valid
export function useMerkleRootValid(root: string | undefined) {
  const enabled = !!root && root !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  const { data, error, isPending } = useReadContract({
    address: MerkleProofContract.address,
    abi: MerkleProofContract.abi,
    functionName: "isMerkleRootValid",
    args: [root || "0x0000000000000000000000000000000000000000000000000000000000000000"],
  });

  return {
    isValid: data as boolean | undefined,
    isLoading: isPending,
    isError: !!error,
  };
}

// Hook to get platform fee
export function usePlatformFee() {
  const { data, error, isPending } = useReadContract({
    address: MerkleProofContract.address,
    abi: MerkleProofContract.abi,
    functionName: "getPlatformFee",
  });

  return {
    fee: data as bigint | string | undefined,
    isLoading: isPending,
    isError: !!error,
  };
}

// Hook to check if user is a newcomer (first tree is free)
export function useIsNewcomer() {
  const { address } = useAccount();

  const { data, error, isPending } = useReadContract({
    address: MerkleProofContract.address,
    abi: MerkleProofContract.abi,
    functionName: "isUserNewcomer",
    args: [address || "0x0000000000000000000000000000000000000000"],
  });

  return {
    isNewcomer: data as boolean | undefined,
    isLoading: isPending,
    isError: !!error,
  };
}

// Hook to get Merkle tree information
export function useMerkleTreeInfo(root: string | undefined) {
  const enabled = !!root && root !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  const { data, error, isPending } = useReadContract({
    address: MerkleProofContract.address,
    abi: MerkleProofContract.abi,
    functionName: "getMerkleTreeInfo",
    args: [root || "0x0000000000000000000000000000000000000000000000000000000000000000"],
  });

  // Transform the data into a more usable format
  const treeInfo = data
    ? {
        description: (data as any)[0] as string,
        timestamp: Number((data as any)[1]),
        listSize: Number((data as any)[2]),
        creator: (data as any)[3] as string,
        isActive: (data as any)[4] as boolean,
      }
    : null;

  return {
    treeInfo: treeInfo as TreeInfo | null,
    isLoading: isPending,
    isError: !!error,
  };
}

// Hook for all contract actions
export function useMerkleContract() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Contract write operations
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Set loading state based on write operation
  useEffect(() => {
    setIsLoading(isWritePending);
  }, [isWritePending]);

  // Add a Merkle tree
  const addMerkleTree = async (
    root: string,
    description: string,
    listSize: number,
    feeValue: bigint = 0n,
  ): Promise<`0x${string}`> => {
    if (!address) throw new Error("Wallet not connected");

    setIsLoading(true);
    try {
      const hash = await writeContractAsync({
        address: MerkleProofContract.address,
        abi: MerkleProofContract.abi,
        functionName: "addMerkleTree",
        args: [root, description, BigInt(listSize)],
        value: feeValue,
      });

      return hash;
    } catch (error) {
      console.error("Error adding Merkle tree:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a Merkle tree
  const removeMerkleTree = async (root: string): Promise<`0x${string}`> => {
    if (!address) throw new Error("Wallet not connected");

    setIsLoading(true);
    try {
      const hash = await writeContractAsync({
        address: MerkleProofContract.address,
        abi: MerkleProofContract.abi,
        functionName: "removeMerkleTree",
        args: [root],
      });

      return hash;
    } catch (error) {
      console.error("Error removing Merkle tree:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update Merkle tree description
  const updateTreeDescription = async (root: string, newDescription: string): Promise<`0x${string}`> => {
    if (!address) throw new Error("Wallet not connected");

    setIsLoading(true);
    try {
      const hash = await writeContractAsync({
        address: MerkleProofContract.address,
        abi: MerkleProofContract.abi,
        functionName: "updateMerkleTreeDescription",
        args: [root, newDescription],
      });

      return hash;
    } catch (error) {
      console.error("Error updating Merkle tree description:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    addMerkleTree,
    removeMerkleTree,
    updateTreeDescription,
    isLoading,
  };
}
