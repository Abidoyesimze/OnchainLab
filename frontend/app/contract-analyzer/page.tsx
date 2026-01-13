"use client";

import React, { useEffect, useState } from "react";
import { ContractAnalyzerContract, DeFiUtilsContract, ERC20FactoryContract, getContractAddress } from "../../ABI";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount, useReadContract } from "wagmi";

// Define types for better type safety
interface AnalysisResult {
  contractAddress: string;
  analysis: any;
  txHash: string;
}

interface FormattedResult {
  contractSize: string;
  estimatedDeploymentGas: string;
  isContract: boolean;
  hasFallback: boolean;
  hasReceive: boolean;
  balance: string;
  codeSize: string;
  gasOptimization: string;
  securityScore: string;
  analyzedAddress: string;
  txHash: string;
}

const ContractAnalyzerPage = () => {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Success modal state
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Format analysis results from the contract event
  const formatAnalysisResult = (analysisData: AnalysisResult | null): FormattedResult | null => {
    if (!analysisData?.analysis) return null;

    try {
      const analysis = analysisData.analysis;

      return {
        contractSize: `${Math.round(Number(analysis.contractSize) * 100) / 100} KB`,
        estimatedDeploymentGas: Number(analysis.estimatedDeploymentGas).toLocaleString(),
        isContract: analysis.isContract,
        hasFallback: analysis.hasFallback,
        hasReceive: analysis.hasReceive,
        balance: `${Number(analysis.balance) / 1e18} ETH`,
        codeSize: `${Number(analysis.codeSize).toLocaleString()} bytes`,
        gasOptimization: Number(analysis.estimatedDeploymentGas) < 1000000 ? "Good" : "Needs optimization",
        securityScore: analysis.hasFallback && analysis.hasReceive ? "High" : "Medium",
        analyzedAddress: analysisData.contractAddress,
        txHash: analysisData.txHash,
      };
    } catch (error) {
      return null;
    }
  };

  const formattedResult: FormattedResult | null = formatAnalysisResult(analysisResult);

  const handleAnalyzeContract = async () => {
    if (!contractAddress) {
      toast.error("Please enter a contract address");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    // Basic address validation
    if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
      toast.error("Please enter a valid contract address");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Use ethers.js directly (same fix as Token Factory)
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(getContractAddress("ContractAnalyzer"), ContractAnalyzerContract.abi, signer);

      // Estimate gas properly
      const gasEstimate = await contract.analyzeContract.estimateGas(contractAddress);

      // Execute with proper gas limit (add 50% buffer)
      const gasLimit = (gasEstimate * BigInt(150)) / BigInt(100);

      const tx = await contract.analyzeContract(contractAddress, {
        gasLimit: gasLimit,
        gasPrice: ethers.parseUnits("6", "gwei"),
      });

      toast.info(`Transaction sent: ${tx.hash.slice(0, 10)}...`);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Parse the ContractAnalyzed event to get analysis results
      const contractAnalyzedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "ContractAnalyzed";
        } catch {
          return false;
        }
      });

      if (contractAnalyzedEvent) {
        try {
          const parsed = contract.interface.parseLog(contractAnalyzedEvent);
          if (parsed?.args?.analysis) {
            const analysis = parsed.args.analysis;

            // Set the analysis result from the event
            setAnalysisResult({
              contractAddress: contractAddress,
              analysis: analysis,
              txHash: tx.hash,
            });

            // Show results modal
            setShowResultsModal(true);
            toast.success("Contract analysis completed!");
          } else {
            toast.warning("Analysis completed, but no results found in transaction");
          }
        } catch (parseError) {
          console.error("Failed to parse analysis event:", parseError);
          toast.warning("Analysis completed, but failed to parse results");
        }
      } else {
        toast.warning("Analysis completed, but no results found in transaction");
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to analyze contract";

      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas fees";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction rejected by user";
        } else if (error.message.includes("execution reverted")) {
          if (error.message.includes("Invalid contract address")) {
            errorMessage = "Invalid contract address provided";
          } else {
            errorMessage = "Contract rejected the analysis request";
          }
        } else if ((error as any).reason) {
          errorMessage = (error as any).reason;
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sample contract addresses for quick testing
  const sampleAddresses = [
    { name: "Token Factory", address: getContractAddress("ERC20Factory") },
    { name: "DeFi Utils", address: getContractAddress("DeFiUtils") },
    { name: "Contract Analyzer", address: getContractAddress("ContractAnalyzer") },
  ];

  const handleSampleAddress = (address: string) => {
    setContractAddress(address);
    toast.info("Sample address loaded. Click 'Analyze Contract' to proceed.");
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Analyze another contract
  const analyzeAnotherContract = () => {
    setShowResultsModal(false);
    setAnalysisResult(null);
    setContractAddress("");
  };

  // Results Modal Component
  const ResultsModal = () => {
    if (!showResultsModal || !formattedResult) return null;

    const getExplorerLink = (address: string, txHash: string) => {
      // Use ETN testnet explorer for better integration
      const baseExplorerUrl = "https://testnet-blockexplorer.electroneum.com";
      return {
        contract: `${baseExplorerUrl}/address/${address}`,
        transaction: `${baseExplorerUrl}/tx/${txHash}`,
      };
    };

    const explorerLinks = getExplorerLink(formattedResult.analyzedAddress, formattedResult.txHash);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1c2941] rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#2a3b54] shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-3xl font-bold text-emerald-400 mb-2">Analysis Complete!</h2>
            <p className="text-xl text-gray-300">Contract analysis finished successfully</p>
          </div>

          {/* Contract Address Display */}
          <div className="mb-6 p-4 bg-[#0f1a2e] rounded-xl border border-[#1e2a3a]">
            <h3 className="text-sm font-semibold mb-2 text-emerald-400">Analyzed Contract</h3>
            <div className="flex items-center gap-2">
              <code className="text-white font-mono text-sm bg-[#0a0f1a] p-3 rounded-lg flex-1 break-all border border-[#1e2a3a]">
                {formattedResult.analyzedAddress}
              </code>
              <button
                onClick={() => copyToClipboard(formattedResult.analyzedAddress, "Contract address")}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                Copy
              </button>
            </div>
            {formattedResult.txHash && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-gray-400 text-sm">Transaction Hash:</span>
                <code className="text-emerald-400 text-sm bg-[#0a0f1a] p-2 rounded flex-1 break-all border border-[#1e2a3a]">
                  {formattedResult.txHash}
                </code>
                <button
                  onClick={() => copyToClipboard(formattedResult.txHash, "Transaction hash")}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-all duration-200"
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Analysis Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Contract Status */}
            <div className="bg-[#0f1a2e] p-6 rounded-xl border border-[#1e2a3a]">
              <div className="flex items-center mb-3">
                <div
                  className={`w-4 h-4 rounded-full mr-3 ${formattedResult.isContract ? "bg-emerald-500" : "bg-red-500"}`}
                ></div>
                <span className="text-gray-400 text-sm">Contract Status</span>
              </div>
              <div className="text-white font-bold text-lg">
                {formattedResult.isContract ? "Valid Contract" : "Not a Contract"}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {formattedResult.isContract ? "Verified smart contract" : "External owned account"}
              </div>
            </div>

            {/* Code Size */}
            <div className="bg-[#0f1a2e] p-6 rounded-xl border border-[#1e2a3a]">
              <div className="text-gray-400 text-sm mb-3">Code Size</div>
              <div className="text-white font-bold text-lg">{formattedResult.contractSize}</div>
              <div className="text-xs text-gray-400 mt-1">{formattedResult.codeSize}</div>
            </div>

            {/* Gas Estimation */}
            <div className="bg-[#0f1a2e] p-6 rounded-xl border border-[#1e2a3a]">
              <div className="text-gray-400 text-sm mb-3">Deploy Gas</div>
              <div className="text-white font-bold text-lg">{formattedResult.estimatedDeploymentGas}</div>
              <div
                className={`text-xs mt-1 ${formattedResult.gasOptimization === "Good" ? "text-emerald-400" : "text-amber-400"}`}
              >
                {formattedResult.gasOptimization}
              </div>
            </div>

            {/* Balance */}
            <div className="bg-[#0f1a2e] p-6 rounded-xl border border-[#1e2a3a]">
              <div className="text-gray-400 text-sm mb-3">Balance</div>
              <div className="text-white font-bold text-lg">{formattedResult.balance}</div>
              <div className="text-gray-400 text-xs mt-1">Current holdings</div>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-[#0f1a2e] p-6 rounded-xl border border-[#1e2a3a] mb-6">
            <h3 className="text-lg font-semibold mb-4 text-emerald-400">Security Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-3 ${formattedResult.hasFallback ? "bg-emerald-500" : "bg-gray-500"}`}
                ></div>
                <div>
                  <div className="text-white font-medium">Fallback Function</div>
                  <div className="text-gray-400 text-sm">
                    {formattedResult.hasFallback ? "Present" : "Not detected"}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-3 ${formattedResult.hasReceive ? "bg-emerald-500" : "bg-gray-500"}`}
                ></div>
                <div>
                  <div className="text-white font-medium">Receive Function</div>
                  <div className="text-gray-400 text-sm">{formattedResult.hasReceive ? "Present" : "Not detected"}</div>
                </div>
              </div>

              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-3 ${formattedResult.securityScore === "High" ? "bg-emerald-500" : "bg-amber-500"}`}
                ></div>
                <div>
                  <div className="text-white font-medium">Security Score</div>
                  <div
                    className={`text-sm ${formattedResult.securityScore === "High" ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {formattedResult.securityScore} Risk
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Summary */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-6 mb-6 border border-[#2a3b54]">
            <h3 className="text-lg font-semibold mb-4 text-amber-400">Analysis Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="space-y-2">
                <div>
                  • <strong>Contract Type:</strong> {formattedResult.isContract ? "Smart Contract" : "EOA/Invalid"}
                </div>
                <div>
                  • <strong>Size Optimization:</strong>{" "}
                  {formattedResult.gasOptimization === "Good" ? "Well optimized" : "Could be improved"}
                </div>
                <div>
                  • <strong>Security Level:</strong> {formattedResult.securityScore} risk assessment
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  • <strong>Deploy Cost:</strong> ~{formattedResult.estimatedDeploymentGas} gas units
                </div>
                <div>
                  • <strong>Current Balance:</strong> {formattedResult.balance}
                </div>
                <div>
                  • <strong>Code Size:</strong> {formattedResult.contractSize} total
                </div>
              </div>
            </div>
          </div>

          {/* Block Explorer Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <a
              href={explorerLinks.contract}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-4 bg-slate-600 hover:bg-slate-700 text-white rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              <span>🔍</span>
              View Contract on Explorer
            </a>
            <a
              href={explorerLinks.transaction}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-4 bg-slate-600 hover:bg-slate-700 text-white rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              <span>📊</span>
              View Analysis Transaction
            </a>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={analyzeAnotherContract}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              Analyze Another Contract
            </button>
            <button
              onClick={(): void => setShowResultsModal(false)}
              className="w-full py-4 px-6 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              Close Results
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
            Contract Analyzer
          </h1>
          <p className="text-xl text-gray-300">
            Analyze smart contracts for gas optimization, security, and deployment costs
          </p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">
              Please connect your wallet to any EVM-compatible network to analyze contracts.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
            </p>
          </div>
        ) : (
          <>
            {/* Analysis Form */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54] shadow-xl">
                <h2 className="text-2xl font-bold mb-6">Analyze Smart Contract</h2>

                <div className="space-y-6">
                  {/* Contract Address Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address *</label>
                    <input
                      type="text"
                      value={contractAddress}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContractAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Enter the address of the smart contract you want to analyze
                    </p>
                  </div>

                  {/* Sample Addresses */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quick Test with Sample Addresses
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {sampleAddresses.map((sample, index) => (
                        <button
                          key={index}
                          onClick={() => handleSampleAddress(sample.address)}
                          className="p-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-sm text-gray-300 hover:border-emerald-500 hover:text-white hover:bg-[#1a2332] transition-all duration-200"
                        >
                          <div className="font-medium">{sample.name}</div>
                          <div className="text-xs text-gray-400 mt-1 break-all">
                            {sample.address.slice(0, 10)}...{sample.address.slice(-8)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Analyze Button */}
                  <button
                    onClick={handleAnalyzeContract}
                    disabled={isAnalyzing || !contractAddress}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                      isAnalyzing || !contractAddress
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-600 to-slate-600 hover:from-emerald-700 hover:to-slate-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    }`}
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Analyzing Contract...
                      </div>
                    ) : (
                      "Analyze Contract"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction Status */}
            {isAnalyzing && (
              <div className="max-w-4xl mx-auto mb-12">
                <div className="bg-gradient-to-r from-emerald-900/20 to-slate-900/20 p-6 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mr-3"></div>
                    <span className="text-emerald-400 font-medium">
                      Analyzing contract... Please wait for confirmation.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {formattedResult && !showResultsModal && (
              <div className="max-w-4xl mx-auto mb-12">
                <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54] shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="text-2xl">📊</div>
                    <h2 className="text-2xl font-bold text-emerald-400">Analysis Results</h2>
                    <button
                      onClick={(): void => setShowResultsModal(true)}
                      className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-all duration-200"
                    >
                      View Detailed Results
                    </button>
                  </div>
                  <div className="text-center p-6 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
                    <p className="text-gray-300 mb-4">Analysis completed for:</p>
                    <code className="text-emerald-400 text-sm break-all">{formattedResult.analyzedAddress}</code>
                    <p className="text-gray-400 text-sm mt-2">
                      Click &quot;View Detailed Results&quot; to see the full analysis
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Results Modal */}
      <ResultsModal />
    </div>
  );
};

export default ContractAnalyzerPage;
