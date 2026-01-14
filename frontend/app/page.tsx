"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAccount } from "wagmi";
import {
  BeakerIcon,
  ChartBarIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  KeyIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    title: "Token Factory",
    description: "Deploy ERC20, ERC721, and ERC1155 tokens with custom configurations.",
    icon: CurrencyDollarIcon,
    link: "/token-factory",
  },
  {
    title: "DeFi Utilities",
    description: "Calculate liquidity, yield, impermanent loss, and swap fees for DeFi protocols.",
    icon: ChartBarIcon,
    link: "/defi-utils",
  },
  {
    title: "Contract Analyzer",
    description: "Analyze smart contracts for gas optimization, security, and deployment costs.",
    icon: BeakerIcon,
    link: "/contract-analyzer",
  },
  {
    title: "Contract Templates",
    description: "Pre-built templates for vesting, multi-sig wallets, and staking contracts.",
    icon: DocumentTextIcon,
    link: "/contract-templates",
  },
  {
    title: "Merkle Proof Validator",
    description: "Validate Merkle proofs on-chain for whitelists and airdrops.",
    icon: ShieldCheckIcon,
    link: "/merkle-validator",
  },
  {
    title: "Merkle Proof Generator",
    description: "Generate Merkle trees and proofs from address lists.",
    icon: KeyIcon,
    link: "/merkle-proof-generator",
  },
  {
    title: "Contract Debugger",
    description: "Read contract state and interact with deployed contracts.",
    icon: CodeBracketIcon,
    link: "/debug",
  },
  {
    title: "Block Explorer",
    description: "Explore blocks, transactions, and addresses on Mantle Sepolia.",
    icon: GlobeAltIcon,
    link: "/blockexplorer",
  },
];

const Home = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const handleNavigateToFeature = (link: string) => {
    if (isConnected) {
      router.push(link);
    } else {
      setIsButtonLoading(true);
        toast.info("Please connect your wallet to continue");
        setIsButtonLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && isButtonLoading) {
      setIsButtonLoading(false);
    }
  }, [isConnected, isButtonLoading]);

  return (
    <div className="bg-[#121d33] min-h-screen">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
            OnchainLab
            </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Developer tools for building and deploying smart contracts on Mantle Sepolia
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleNavigateToFeature("/token-factory")}
              className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${
                  isButtonLoading ? "opacity-75 cursor-wait" : ""
                }`}
                disabled={isButtonLoading}
              >
              {isButtonLoading ? "Connecting..." : isConnected ? "Get Started" : "Connect Wallet"}
              </button>
              <button
                onClick={() => router.push("/contract-analyzer")}
              className="px-6 py-3 bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg font-medium transition-colors"
            >
              Explore Tools
                </button>
          </div>
        </div>

        {/* What is OnchainLab Section */}
        <div className="mb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">What is OnchainLab?</h2>
            <p className="text-gray-300 leading-relaxed">
              OnchainLab provides a suite of tools for smart contract development on Mantle Sepolia. 
              Deploy tokens, analyze contracts, perform DeFi calculations, and interact with the blockchain—all from your browser.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <h2 className="text-2xl font-semibold text-white mb-10 text-center">Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#1c2941] p-5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => handleNavigateToFeature(feature.link)}
              >
                <div className="mb-3">
                  <feature.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1c2941] rounded-lg border border-gray-700 p-8">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">Getting Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-lg font-semibold text-blue-400 mb-2">1. Connect Wallet</div>
                <p className="text-gray-400 text-sm">
                  Connect your wallet to Mantle Sepolia testnet to get started.
            </p>
          </div>
              <div>
                <div className="text-lg font-semibold text-blue-400 mb-2">2. Choose a Tool</div>
                <p className="text-gray-400 text-sm">
                  Select a tool from the list above based on what you want to build.
                </p>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400 mb-2">3. Start Building</div>
                <p className="text-gray-400 text-sm">
                  Use the tools to deploy contracts, analyze code, or perform calculations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
