"use client";

import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Debug: NextPage = () => {
  const { isConnected } = useAccount();

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
            Contract Debugger
          </h1>
          <p className="text-xl text-gray-300">
            Debug and interact with your deployed smart contracts
          </p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">
              Please connect your wallet to any EVM-compatible network to debug contracts.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
            </p>
          </div>
        ) : (
          <>
            {/* Debug Interface */}
            <div className="bg-[#1c2941] rounded-xl border border-[#2a3b54] shadow-xl">
              <div className="p-6 border-b border-[#2a3b54]">
                <h2 className="text-2xl font-bold text-emerald-400">Contract Debug Interface</h2>
                <p className="text-gray-300 mt-2">
                  Interact with deployed contracts, read state variables, and execute functions
                </p>
              </div>
              <div className="p-6">
                <DebugContracts />
              </div>
            </div>

            {/* Information Section */}
            <div className="mt-8 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-6 border border-[#2a3b54]">
              <h3 className="text-lg font-semibold mb-4 text-amber-400">Debug Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="space-y-2">
                  <div>• <strong>Read Functions:</strong> View contract state without gas costs</div>
                  <div>• <strong>Write Functions:</strong> Execute contract functions (requires gas)</div>
                  <div>• <strong>Event Logs:</strong> Monitor contract events and transactions</div>
                </div>
                <div className="space-y-2">
                  <div>• <strong>Contract State:</strong> Inspect current contract variables</div>
                  <div>• <strong>Gas Estimation:</strong> Preview transaction costs before execution</div>
                  <div>• <strong>Transaction History:</strong> View past contract interactions</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Debug;
