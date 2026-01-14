import { useEffect, useState } from "react";
import { MerkleProofContract } from "../ABI";
import { ethers } from "ethers";
import { useAccount } from "wagmi";

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
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!root || root === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        setIsValid(undefined);
        return;
      }

      if (!window.ethereum) {
        setIsError(true);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, provider);
        const result = await contract.isMerkleRootValid(root);
        setIsValid(result);
      } catch (error) {
        console.error("Error checking Merkle root:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [root]);

  return {
    isValid,
    isLoading,
    isError,
  };
}

// Hook to get platform fee
export function usePlatformFee() {
  const [fee, setFee] = useState<bigint | string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!window.ethereum) {
        setIsError(true);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, provider);
        const result = await contract.getPlatformFee();
        setFee(result);
      } catch (error) {
        console.error("Error fetching platform fee:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    fee,
    isLoading,
    isError,
  };
}

// Hook to check if user is a newcomer (first tree is free)
export function useIsNewcomer() {
  const { address } = useAccount();
  const [isNewcomer, setIsNewcomer] = useState<boolean | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!address || !window.ethereum) {
        setIsNewcomer(undefined);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, provider);
        const result = await contract.isUserNewcomer(address);
        setIsNewcomer(result);
      } catch (error) {
        console.error("Error checking newcomer status:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [address]);

  return {
    isNewcomer,
    isLoading,
    isError,
  };
}

// Hook to get Merkle tree information
export function useMerkleTreeInfo(root: string | undefined) {
  const [treeInfo, setTreeInfo] = useState<TreeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!root || root === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        setTreeInfo(null);
        return;
      }

      if (!window.ethereum) {
        setIsError(true);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, provider);
        const result = await contract.getMerkleTreeInfo(root);

        setTreeInfo({
          description: result[0] as string,
          timestamp: Number(result[1]),
          listSize: Number(result[2]),
          creator: result[3] as string,
          isActive: result[4] as boolean,
        });
      } catch (error) {
        console.error("Error fetching Merkle tree info:", error);
        setIsError(true);
        setTreeInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [root]);

  return {
    treeInfo,
    isLoading,
    isError,
  };
}

// Hook for all contract actions
export function useMerkleContract() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Add a Merkle tree
  const addMerkleTree = async (
    root: string,
    description: string,
    listSize: number,
    feeValue: bigint = 0n,
  ): Promise<`0x${string}`> => {
    if (!address) throw new Error("Wallet not connected");
    if (!window.ethereum) throw new Error("MetaMask or wallet provider not found");

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, signer);

      const tx = await contract.addMerkleTree(root, description, BigInt(listSize), { value: feeValue });
      await tx.wait();

      return tx.hash as `0x${string}`;
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
    if (!window.ethereum) throw new Error("MetaMask or wallet provider not found");

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, signer);

      const tx = await contract.removeMerkleTree(root);
      await tx.wait();

      return tx.hash as `0x${string}`;
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
    if (!window.ethereum) throw new Error("MetaMask or wallet provider not found");

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MerkleProofContract.address, MerkleProofContract.abi, signer);

      const tx = await contract.updateMerkleTreeDescription(root, newDescription);
      await tx.wait();

      return tx.hash as `0x${string}`;
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
