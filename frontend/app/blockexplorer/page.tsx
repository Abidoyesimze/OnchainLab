"use client";

import { useEffect, useState } from "react";
import { PaginationButton, SearchBar, TransactionsTable } from "./_components";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useFetchBlocks } from "~~/hooks/core";
import { useTargetNetwork } from "~~/hooks/core/useTargetNetwork";
import { notification } from "~~/utils/core";
import { useAccount } from "wagmi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BlockExplorer: NextPage = () => {
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage, error } = useFetchBlocks();
  const { targetNetwork } = useTargetNetwork();
  const { isConnected } = useAccount();
  const [isLocalNetwork, setIsLocalNetwork] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);

  // Get network info when wallet connects
  useEffect(() => {
    const getNetworkInfo = async () => {
      if (isConnected && window.ethereum) {
        try {
          const provider = new (await import("ethers")).BrowserProvider(window.ethereum);
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

  useEffect(() => {
    if (targetNetwork.id !== hardhat.id) {
      setIsLocalNetwork(false);
    }
  }, [targetNetwork.id]);

  useEffect(() => {
    if (targetNetwork.id === hardhat.id && error) {
      setHasError(true);
    }
  }, [targetNetwork.id, error]);

  // Get network display information
  const getNetworkDisplay = () => {
    if (!networkInfo) {
      return {
        name: "Unknown Network",
        chainId: "Unknown",
        explorer: "https://etherscan.io",
        color: "text-gray-400",
        bgColor: "bg-gray-900/20",
        borderColor: "border-gray-500/30"
      };
    }
    
    const chainId = networkInfo.chainId;
    if (chainId === "5201420") {
      return {
        name: "ETN Testnet",
        chainId: "5201420",
        explorer: "https://testnet-blockexplorer.electroneum.com",
        color: "text-blue-400",
        bgColor: "bg-blue-900/20",
        borderColor: "border-blue-500/30"
      };
    } else if (chainId === "50312") {
      return {
        name: "Somnia Testnet", 
        chainId: "50312",
        explorer: "https://shannon-explorer.somnia.network",
        color: "text-purple-400",
        bgColor: "bg-purple-900/20",
        borderColor: "border-purple-500/30"
      };
    } else {
      return {
        name: networkInfo.name || "Unknown Network",
        chainId: chainId,
        explorer: "https://etherscan.io",
        color: "text-gray-400",
        bgColor: "bg-gray-900/20",
        borderColor: "border-gray-500/30"
      };
    }
  };

  const network = getNetworkDisplay();

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-slate-400 bg-clip-text text-transparent">
            Block Explorer
          </h1>
          <p className="text-xl text-gray-300">
            Explore blocks, transactions, and addresses on the blockchain
          </p>
        </div>

        {/* Network Status */}
        {isConnected && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className={`${network.bgColor} rounded-xl p-4 border ${network.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${network.color.replace('text-', 'bg-')}`}></div>
                  <span className="text-sm font-medium">
                    Network: {network.name} (Chain ID: {network.chainId})
                  </span>
                </div>
                <span className={`${network.color} text-sm`}>✓ Connected</span>
              </div>
              <div className="mt-3 text-sm text-gray-300">
                <p>Block explorer for {network.name}</p>
                <p className="mt-1 text-xs text-gray-400">
                  External explorer: <a href={network.explorer} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{network.explorer}</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">
              Please connect your wallet to any EVM-compatible network to use the block explorer.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
            </p>
          </div>
        ) : (
          <>
            {/* Block Explorer Interface */}
            <div className="bg-[#1c2941] rounded-xl border border-[#2a3b54] shadow-xl">
              <div className="p-6 border-b border-[#2a3b54]">
                <h2 className="text-2xl font-bold text-emerald-400">Block Explorer Interface</h2>
                <p className="text-gray-300 mt-2">
                  Search for addresses, transactions, and explore blockchain data
                </p>
              </div>
              <div className="p-6">
                <SearchBar />
                <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
                <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
              </div>
            </div>

            {/* Information Section */}
            <div className="mt-8 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-6 border border-[#2a3b54]">
              <h3 className="text-lg font-semibold mb-4 text-amber-400">Block Explorer Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="space-y-2">
                  <div>• <strong>Block Search:</strong> View block details and transactions</div>
                  <div>• <strong>Transaction History:</strong> Track transaction status and details</div>
                  <div>• <strong>Address Lookup:</strong> Explore address balances and activity</div>
                </div>
                <div className="space-y-2">
                  <div>• <strong>Gas Tracking:</strong> Monitor gas prices and usage</div>
                  <div>• <strong>Contract Interaction:</strong> View contract calls and events</div>
                  <div>• <strong>Network Stats:</strong> Real-time blockchain statistics</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BlockExplorer;
