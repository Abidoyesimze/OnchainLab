"use client";

import React, { useEffect, useState } from "react";
import { ERC20FactoryABI, ERC721FactoryABI, ERC1155FactoryABI, getContractAddress } from "../../ABI";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import ContractVerification from "../../components/ContractVerification";

type TokenType = "erc20" | "erc721" | "erc1155";

interface DeploymentResult {
  type: string;
  address: string;
  name: string;
  symbol: string;
  inputs: Record<string, string>;
}

const TokenFactoryPage = () => {
  const { address, isConnected } = useAccount();
  const [selectedTokenType, setSelectedTokenType] = useState<TokenType>("erc20");
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);

  // Check network on mount and when wallet connects
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected && window.ethereum) {
        try {
          console.log("🔍 Checking network...");
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          console.log("🌐 Network detected:", network);
          
          const networkInfo = {
            chainId: network.chainId.toString(),
            name: network.name || "Unknown",
          };
          
          console.log("📡 Setting network info:", networkInfo);
          setNetworkInfo(networkInfo);
        } catch (error) {
          console.error("❌ Error checking network:", error);
        }
      } else {
        console.log("⚠️ Wallet not connected or ethereum not available");
      }
    };

    checkNetwork();
  }, [isConnected]);

  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    initialSupply: "1000000",
    decimals: 18,
    maxSupply: "10000",
    baseURI: "https://api.example.com/metadata/",
    uri: "https://api.example.com/metadata/",
    mintable: true,
    burnable: true,
    pausable: true,
    supplyTracked: true,
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      initialSupply: "1000000",
      decimals: 18,
      maxSupply: "10000",
      baseURI: "https://api.example.com/metadata/",
      uri: "https://api.example.com/metadata/",
      mintable: true,
      burnable: true,
      pausable: true,
      supplyTracked: true,
    });
  };

  const deployAnother = () => {
    setShowSuccessModal(false);
    setDeploymentResult(null);
    resetForm();
  };

  const deployToken = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error("Name and symbol are required");
      return;
    }

    console.log("🚀 Starting token deployment...");
    console.log("Network Info:", networkInfo);
    console.log("Selected Token Type:", selectedTokenType);

    setIsDeploying(true);

    try {
      // Check if window.ethereum exists
      if (!window.ethereum) {
        throw new Error("MetaMask or wallet provider not found. Please install MetaMask.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const signer = await provider.getSigner();

      let deployedAddress: string = ""; // Initialize deployedAddress

      switch (selectedTokenType) {
        case "erc20":
          const erc20Address = getContractAddress("ERC20Factory");
          console.log("🔗 Using ERC20Factory address:", erc20Address);
          
          const erc20Contract = new ethers.Contract(
            erc20Address, // Use network-aware address
            ERC20FactoryABI,
            signer,
          );

          // Use parseUnits with explicit decimals to avoid ENS resolution
          const initialSupplyWei = ethers.parseUnits(formData.initialSupply, formData.decimals);

          const erc20Tx = await erc20Contract.createToken(
            formData.name,
            formData.symbol,
            initialSupplyWei,
            formData.decimals,
          );

          const erc20Receipt = await erc20Tx.wait();
          const erc20Event = erc20Receipt.logs.find((log: any) => {
            try {
              const parsed = erc20Contract.interface.parseLog(log);
              return parsed?.name === "TokenCreated";
            } catch {
              return false;
            }
          });

          if (erc20Event) {
            const parsed = erc20Contract.interface.parseLog(erc20Event);
            if (parsed) deployedAddress = parsed.args.tokenAddress; // Null check
          }
          break;

        case "erc721":
          const erc721Address = getContractAddress("ERC721Factory");
          console.log("🔗 Using ERC721Factory address:", erc721Address);
          
          const erc721Contract = new ethers.Contract(
            erc721Address, // Use network-aware address
            ERC721FactoryABI,
            signer,
          );

          const maxSupply = formData.maxSupply ? parseInt(formData.maxSupply) : 0;

          const erc721Tx = await erc721Contract.createCollection(
            formData.name,
            formData.symbol,
            formData.baseURI,
            maxSupply,
            formData.mintable,
            formData.burnable,
            formData.pausable,
          );

          const erc721Receipt = await erc721Tx.wait();
          const erc721Event = erc721Receipt.logs.find((log: any) => {
            try {
              const parsed = erc721Contract.interface.parseLog(log);
              return parsed?.name === "CollectionCreated";
            } catch {
              return false;
            }
          });

          if (erc721Event) {
            const parsed = erc721Contract.interface.parseLog(erc721Event);
            if (parsed) deployedAddress = parsed.args.contractAddress; // Null check
          }
          break;

        case "erc1155":
          const erc1155Address = getContractAddress("ERC1155Factory");
          console.log("🔗 Using ERC1155Factory address:", erc1155Address);
          
          const erc1155Contract = new ethers.Contract(
            erc1155Address, // Use network-aware address
            ERC1155FactoryABI,
            signer,
          );

          const erc1155Tx = await erc1155Contract.createMultiToken(
            formData.name,
            formData.uri,
            formData.mintable,
            formData.burnable,
            formData.pausable,
            formData.supplyTracked,
          );

          const erc1155Receipt = await erc1155Tx.wait();
          const erc1155Event = erc1155Receipt.logs.find((log: any) => {
            try {
              const parsed = erc1155Contract.interface.parseLog(log);
              return parsed?.name === "MultiTokenCreated";
            } catch {
              return false;
            }
          });

          if (erc1155Event) {
            const parsed = erc1155Contract.interface.parseLog(erc1155Event);
            if (parsed) deployedAddress = parsed.args.contractAddress; // Null check
          }
          break;

        default:
          throw new Error("Invalid token type");
      }

      if (deployedAddress) {
        console.log("✅ Token deployed successfully at:", deployedAddress);
        
        // Create deployment result object
        const result: DeploymentResult = {
          type: selectedTokenType.toUpperCase(),
          address: deployedAddress,
          name: formData.name,
          symbol: formData.symbol,
          inputs: {
            "Token Name": formData.name,
            "Token Symbol": formData.symbol,
            ...(selectedTokenType === "erc20" && {
              "Initial Supply": formData.initialSupply,
              Decimals: formData.decimals.toString(),
            }),
            ...(selectedTokenType === "erc721" && {
              "Max Supply": formData.maxSupply || "Unlimited",
              "Base URI": formData.baseURI,
            }),
            ...(selectedTokenType === "erc1155" && {
              "Metadata URI": formData.uri,
            }),
            Mintable: formData.mintable ? "Yes" : "No",
            Burnable: formData.burnable ? "Yes" : "No",
            Pausable: formData.pausable ? "Yes" : "No",
            ...(selectedTokenType === "erc1155" && {
              "Supply Tracked": formData.supplyTracked ? "Yes" : "No",
            }),
          },
        };

        console.log("📋 Setting deployment result:", result);
        setDeploymentResult(result);
        setShowSuccessModal(true);
        console.log("🎉 Success modal should now be visible!");

        toast.success(`${selectedTokenType.toUpperCase()} token deployed successfully!`);
      } else {
        console.log("❌ No deployed address found in transaction receipt");
      }
    } catch (error: any) {
      console.error("Deployment error:", error);
      let errorMessage = "Failed to deploy token";

      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for deployment";
      } else if (error.message.includes("execution reverted")) {
        errorMessage = "Contract rejected the deployment";
      } else if (error.message.includes("ENS") || error.message.includes("UNSUPPORTED_OPERATION")) {
        errorMessage = "Network configuration error. Please ensure you're connected to an EVM-compatible network.";
      }

      toast.error(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  // Success Modal Component
  const SuccessModal = (): React.JSX.Element | null => {
    if (!showSuccessModal || !deploymentResult) return null;

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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1c2941] rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#2a3b54] shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-emerald-400 mb-2">Token Deployed Successfully!</h2>
            <p className="text-xl text-gray-300">Your {deploymentResult.type} token has been created on {network.name}</p>
          </div>

          {/* Network Information */}
          <div className={`${network.bgColor} rounded-xl p-6 mb-6 border ${network.borderColor}`}>
            <h3 className="text-lg font-semibold mb-4 text-emerald-400">Network Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${network.color.replace('text-', 'bg-')}`}></div>
                <div>
                  <div className="text-white font-medium">{network.name}</div>
                  <div className="text-sm text-gray-400">Chain ID: {network.chainId}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Block Explorer</div>
                <a 
                  href={`${network.explorer}/address/${deploymentResult.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm ${network.color} hover:underline`}
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          </div>

          {/* Token Info Display */}
          <div className="bg-[#0f1a2e] rounded-xl p-6 mb-6 border border-[#1e2a3a] text-center">
            <h3 className="text-lg font-semibold mb-3 text-emerald-400">Token Details</h3>
            <div className="text-2xl font-bold text-white mb-2">{deploymentResult.name}</div>
            <div className="text-lg text-emerald-400 mb-4">{deploymentResult.symbol}</div>
            <div className="bg-[#1a2332] p-3 rounded-lg border border-[#2a3b54]">
              <div className="text-sm text-gray-400 mb-1">Contract Address</div>
              <div className="text-sm text-emerald-400 font-mono break-all">{deploymentResult.address}</div>
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="bg-[#0f1a2e] rounded-xl p-6 mb-6 border border-[#1e2a3a]">
            <h3 className="text-lg font-semibold mb-4 text-emerald-400">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(deploymentResult.inputs).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-[#1a2332] rounded-lg">
                  <span className="text-gray-400 text-sm">{key}:</span>
                  <span className="text-white font-medium text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Verification */}
          <div className="mb-6">
            <ContractVerification
              contractAddress={deploymentResult.address}
              networkChainId={networkInfo?.chainId || ""}
              contractType="token"
              contractName={deploymentResult.name}
            />
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-6 mb-6 border border-[#2a3b54]">
            <h3 className="text-lg font-semibold mb-4 text-amber-400">Next Steps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="space-y-2">
                <div>• <strong>Verify Contract:</strong> Use the verification guide above to verify your contract</div>
                <div>• <strong>Add to Wallet:</strong> Import the token address to your wallet</div>
                <div>• <strong>Test Functions:</strong> Try minting, transferring, or other features</div>
              </div>
              <div className="space-y-2">
                <div>• <strong>Share Address:</strong> Share the contract address with your community</div>
                <div>• <strong>Monitor Activity:</strong> Track transactions and usage on the explorer</div>
                <div>• <strong>Documentation:</strong> Keep track of your token&apos;s configuration</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={deployAnother}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              Deploy Another Token
            </button>
            <a
              href={`${network.explorer}/address/${deploymentResult.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] text-center flex items-center justify-center"
            >
              View on Explorer
            </a>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-4 px-6 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-slate-400 bg-clip-text text-transparent">
            Token Factory
          </h1>
          <p className="text-xl text-gray-300">Deploy ERC20, ERC721, and ERC1155 tokens with custom configurations</p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">Please connect your wallet to any EVM-compatible network to create tokens.</p>
          </div>
        ) : (
          <>
            {/* Network Status */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="p-4 rounded-xl border bg-green-900/20 border-green-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">
                      Network: {networkInfo?.name || "Checking..."} (Chain ID: {networkInfo?.chainId || "..."})
                    </span>
                  </div>
                  <span className="text-green-400 text-sm">✓ EVM-Compatible Network</span>
                </div>
                <div className="mt-3 text-sm text-green-300">
                  <p>Connected to an EVM-compatible network. You can now deploy tokens!</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
                  </p>
                </div>
                
                {/* Debug Information */}
                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <h4 className="text-sm font-semibold text-blue-300 mb-2">Debug Info</h4>
                  <div className="text-xs text-blue-200 space-y-1">
                    <div>Current Network: {networkInfo?.name || "Unknown"}</div>
                    <div>Chain ID: {networkInfo?.chainId || "Unknown"}</div>
                    <div>ERC20 Factory: {getContractAddress("ERC20Factory")}</div>
                    <div>ERC721 Factory: {getContractAddress("ERC721Factory")}</div>
                    <div>ERC1155 Factory: {getContractAddress("ERC1155Factory")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54] shadow-xl">
                <h2 className="text-2xl font-bold mb-6">Create New Token</h2>

                {/* Token Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">Token Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["erc20", "erc721", "erc1155"] as TokenType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedTokenType(type)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          selectedTokenType === type
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : "border-[#2a3b54] hover:border-emerald-500 hover:bg-[#1a2332]"
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    deployToken();
                  }}
                  className="space-y-6"
                >
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Token Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => handleInputChange("name", e.target.value)}
                        placeholder="My Awesome Token"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Token Symbol *</label>
                      <input
                        type="text"
                        value={formData.symbol}
                        onChange={e => handleInputChange("symbol", e.target.value)}
                        placeholder="MAT"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Token Type Specific Fields */}
                  {selectedTokenType === "erc20" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Initial Supply *</label>
                        <input
                          type="text"
                          value={formData.initialSupply}
                          onChange={e => handleInputChange("initialSupply", e.target.value)}
                          placeholder="1000000"
                          className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Decimals *</label>
                        <select
                          value={formData.decimals}
                          onChange={e => handleInputChange("decimals", parseInt(e.target.value))}
                          className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-all duration-200"
                        >
                          <option value={18}>18 (Standard)</option>
                          <option value={6}>6 (USDC style)</option>
                          <option value={8}>8 (Bitcoin style)</option>
                          <option value={0}>0 (Whole numbers)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {(selectedTokenType === "erc721" || selectedTokenType === "erc1155") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {selectedTokenType === "erc721" ? "Base URI" : "Metadata URI"} *
                      </label>
                      <input
                        type="text"
                        value={selectedTokenType === "erc721" ? formData.baseURI : formData.uri}
                        onChange={e =>
                          handleInputChange(selectedTokenType === "erc721" ? "baseURI" : "uri", e.target.value)
                        }
                        placeholder="https://api.example.com/metadata/"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                        required
                      />
                    </div>
                  )}

                  {selectedTokenType === "erc721" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Supply</label>
                      <input
                        type="text"
                        value={formData.maxSupply}
                        onChange={e => handleInputChange("maxSupply", e.target.value)}
                        placeholder="10000 (0 for unlimited)"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                      />
                    </div>
                  )}

                  {/* Configuration Options */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-400">Configuration Options</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.mintable}
                          onChange={e => handleInputChange("mintable", e.target.checked)}
                          className="w-4 h-4 text-emerald-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        <span className="text-sm">Mintable</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.burnable}
                          onChange={e => handleInputChange("burnable", e.target.checked)}
                          className="w-4 h-4 text-emerald-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        <span className="text-sm">Burnable</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.pausable}
                          onChange={e => handleInputChange("pausable", e.target.checked)}
                          className="w-4 h-4 text-emerald-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        <span className="text-sm">Pausable</span>
                      </label>
                    </div>

                    {selectedTokenType === "erc1155" && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.supplyTracked}
                          onChange={e => handleInputChange("supplyTracked", e.target.checked)}
                          className="w-4 h-4 text-emerald-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        <span className="text-sm">Track Total Supply</span>
                      </label>
                    )}
                  </div>

                  {/* Deploy Button */}
                  <button
                    type="submit"
                    disabled={isDeploying}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                      isDeploying
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-600 to-slate-600 hover:from-emerald-700 hover:to-slate-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    }`}
                  >
                    {isDeploying ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Deploying {selectedTokenType.toUpperCase()} Token...
                      </div>
                    ) : (
                      `Deploy ${selectedTokenType.toUpperCase()} Token`
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Success Modal */}
        <SuccessModal />
      </div>
    </div>
  );
};

export default TokenFactoryPage;
