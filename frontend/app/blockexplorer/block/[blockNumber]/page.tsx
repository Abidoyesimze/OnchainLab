"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, ClockIcon, HashIcon, CubeIcon } from "@heroicons/react/24/outline";

interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  transactions: string[];
}

const BlockPage = () => {
  const params = useParams();
  const blockNumber = params?.blockNumber as string;
  const { isConnected } = useAccount();
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blockNumber && isConnected) {
      fetchBlockData();
    }
  }, [blockNumber, isConnected]);

  const fetchBlockData = async () => {
    if (!window.ethereum) {
      setError("Wallet not connected");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const block = await provider.getBlock(parseInt(blockNumber), true);
      
      if (block) {
        setBlockData({
          number: block.number,
          hash: block.hash || "",
          parentHash: block.parentHash,
          timestamp: block.timestamp,
          gasLimit: block.gasLimit.toString(),
          gasUsed: block.gasUsed.toString(),
          miner: block.miner,
          difficulty: block.difficulty.toString(),
          totalDifficulty: block.totalDifficulty?.toString() || "0",
          size: block.length,
          transactions: block.transactions.map(tx => typeof tx === 'string' ? tx : tx.hash)
        });
      } else {
        setError("Block not found");
      }
    } catch (err) {
      console.error("Error fetching block:", err);
      setError("Failed to fetch block data");
      toast.error("Failed to fetch block data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatGasUsage = (used: string, limit: string) => {
    const usedNum = parseInt(used);
    const limitNum = parseInt(limit);
    const percentage = ((usedNum / limitNum) * 100).toFixed(2);
    return `${usedNum.toLocaleString()} / ${limitNum.toLocaleString()} (${percentage}%)`;
  };

  const goBack = () => {
    window.history.back();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#121d33] text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">Please connect your wallet to view block details.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121d33] text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading block data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !blockData) {
    return (
      <div className="min-h-screen bg-[#121d33] text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-4">Error</h2>
            <p className="text-gray-300 mb-4">{error || "Block not found"}</p>
            <button
              onClick={goBack}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={goBack}
            className="p-2 bg-[#1c2941] hover:bg-[#243a5f] rounded-lg border border-[#2a3b54] transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-emerald-400">Block #{blockData.number}</h1>
            <p className="text-gray-300">Block details and transactions</p>
          </div>
        </div>

        {/* Block Information */}
        <div className="bg-[#1c2941] rounded-xl p-6 mb-6 border border-[#2a3b54] shadow-xl">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Block Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <HashIcon className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-sm text-gray-400">Block Hash</div>
                  <div className="text-white font-mono text-sm break-all">{blockData.hash}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <HashIcon className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-sm text-gray-400">Parent Hash</div>
                  <div className="text-white font-mono text-sm break-all">{blockData.parentHash}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-sm text-gray-400">Timestamp</div>
                  <div className="text-white">{formatTimestamp(blockData.timestamp)}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CubeIcon className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="text-sm text-gray-400">Gas Usage</div>
                  <div className="text-white">{formatGasUsage(blockData.gasUsed, blockData.gasLimit)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <HashIcon className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-sm text-gray-400">Miner</div>
                  <div className="text-white font-mono text-sm break-all">{blockData.miner}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <CubeIcon className="h-5 w-5 text-cyan-400" />
                <div>
                  <div className="text-sm text-gray-400">Block Size</div>
                  <div className="text-white">{blockData.size.toLocaleString()} bytes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-[#1c2941] rounded-xl p-6 border border-[#2a3b54] shadow-xl">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">
            Transactions ({blockData.transactions.length})
          </h2>
          
          {blockData.transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No transactions in this block
            </div>
          ) : (
            <div className="space-y-3">
              {blockData.transactions.map((txHash, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-mono text-sm break-all">{txHash}</div>
                      <div className="text-xs text-gray-400">Transaction #{index + 1}</div>
                    </div>
                  </div>
                  <a
                    href={`/blockexplorer/transaction/${txHash}`}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockPage;
