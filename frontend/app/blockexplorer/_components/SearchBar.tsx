"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAddress, isHex } from "viem";
import { usePublicClient, useAccount } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export const SearchBar = () => {
  const [searchInput, setSearchInput] = useState("");
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);
  const router = useRouter();
  const { isConnected } = useAccount();

  // Helper function to check if input is a transaction hash
  const isTransactionHash = (input: string): boolean => {
    return input.length === 66 && input.startsWith('0x') && isHex(input);
  };

  // Get current network info
  useEffect(() => {
    const getNetworkInfo = async () => {
      if (isConnected && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setNetworkInfo({
            chainId: network.chainId.toString(),
            name: network.name || "Unknown",
          });
        } catch (error) {
          console.error("Error getting network info:", error);
        }
      }
    };

    getNetworkInfo();
  }, [isConnected]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!searchInput.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!window.ethereum) {
      toast.error("Wallet provider not found");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const input = searchInput.trim();

      // For address search (check this FIRST since addresses are more specific)
      if (isAddress(input)) {
        router.push(`/blockexplorer/address/${input}`);
        return;
      }

      // For block number search
      if (/^\d+$/.test(input)) {
        try {
          const block = await provider.getBlock(parseInt(input));
          if (block) {
            router.push(`/blockexplorer/block/${input}`);
            return;
          }
        } catch (error) {
          console.error("Failed to fetch block:", error);
        }
        toast.error("Block not found");
        return;
      }

      // For transaction hash search (check this LAST since it's the least specific)
      if (isTransactionHash(input)) { 
        try {
          const tx = await provider.getTransaction(input as `0x${string}`);
          if (tx) {
            router.push(`/blockexplorer/transaction/${input}`);
            return;
          }
        } catch (error) {
          console.error("Failed to fetch transaction:", error);
        }
        toast.error("Transaction not found");
        return;
      }

      toast.error("Invalid search term. Please enter a valid address, transaction hash, or block number");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please check your network connection and try again.");
    }
  };

  return (
    <div className="mb-6">
      {/* Network Info */}
      {networkInfo && (
        <div className="mb-4 p-3 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
          <div className="text-sm text-gray-300">
            <span className="text-emerald-400 font-medium">Searching on:</span> {networkInfo.name} (Chain ID: {networkInfo.chainId})
          </div>
        </div>
      )}
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="flex-1">
          <input
            className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
            type="text"
            value={searchInput}
            placeholder="Search by address, transaction hash, or block number"
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <button 
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
          type="submit"
        >
          Search
        </button>
      </form>
      
      {/* Search Help */}
      <div className="mt-3 text-xs text-gray-400">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-2 bg-[#0f1a2e] rounded border border-[#1e2a3a]">
            <div className="font-medium text-emerald-400 mb-1">Address</div>
            <div className="font-mono text-xs break-all">0x742d35Cc6634C0532925a3b844Bc454e4438f44e</div>
          </div>
          <div className="p-2 bg-[#0f1a2e] rounded border border-[#1e2a3a]">
            <div className="font-medium text-blue-400 mb-1">Transaction</div>
            <div className="font-mono text-xs break-all">0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef</div>
          </div>
          <div className="p-2 bg-[#0f1a2e] rounded border border-[#1e2a3a]">
            <div className="font-medium text-purple-400 mb-1">Block Number</div>
            <div className="font-mono text-xs">12345</div>
          </div>
        </div>
      </div>
    </div>
  );
};
