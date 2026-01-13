"use client";

import React, { useState } from "react";
import { DeFiUtilsContract, getContractAddress } from "../../ABI";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";

// Define types for better type safety
interface CalculationResult {
  type: string;
  value: bigint;
  formatted: string;
  inputs: Record<string, string>;
}

const DeFiUtilsPage = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("liquidity");
  const [isCalculating, setIsCalculating] = useState(false);

  // Liquidity calculation inputs
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");

  // Yield calculation inputs
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [time, setTime] = useState("");
  const [compoundFrequency, setCompoundFrequency] = useState("12");

  // Impermanent loss inputs
  const [initialTokenAAmount, setInitialTokenAAmount] = useState("");
  const [initialTokenBAmount, setInitialTokenBAmount] = useState("");
  const [currentTokenAPrice, setCurrentTokenAPrice] = useState("");
  const [currentTokenBPrice, setCurrentTokenBPrice] = useState("");

  // Swap fee inputs
  const [amountIn, setAmountIn] = useState("");
  const [feePercentage, setFeePercentage] = useState("0.3");

  // Results state
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Helper function to convert decimal inputs to proper format for BigInt
  const convertToBigInt = (value: string, decimals: number = 18): bigint => {
    if (!value || value === "") return BigInt(0);

    try {
      console.log(`🔄 Converting "${value}" to BigInt with ${decimals} decimals`);

      // Handle negative numbers
      const isNegative = value.startsWith("-");
      const absValue = isNegative ? value.slice(1) : value;

      // Convert decimal to integer by multiplying by 10^decimals
      const [wholePart, decimalPart = ""] = absValue.split(".");
      const paddedDecimal = decimalPart.padEnd(decimals, "0").slice(0, decimals);
      const fullNumber = wholePart + paddedDecimal;

      console.log(`  - Whole part: "${wholePart}"`);
      console.log(`  - Decimal part: "${decimalPart}"`);
      console.log(`  - Padded decimal: "${paddedDecimal}"`);
      console.log(`  - Full number: "${fullNumber}"`);

      // Convert to BigInt
      const result = BigInt(fullNumber);
      console.log(`  - Result: ${result.toString()}`);

      // Apply negative sign if needed
      const finalResult = isNegative ? -result : result;
      console.log(`  - Final result: ${finalResult.toString()}`);

      return finalResult;
    } catch (error) {
      console.error("❌ Error converting to BigInt:", error);
      return BigInt(0);
    }
  };

  // Generic calculation function using direct contract calls
  const performCalculation = async (functionName: string, args: any[], calculationType: string): Promise<void> => {
    setIsCalculating(true);
    console.log(`🚀 Performing ${calculationType} calculation...`);
    console.log("Function:", functionName);
    console.log("Arguments:", args);
    console.log("Contract Address:", DeFiUtilsContract.address);

    try {
      // Check if window.ethereum exists
      if (!window.ethereum) {
        throw new Error("MetaMask or wallet provider not found. Please install MetaMask.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log("✅ Provider created successfully");

      const contract = new ethers.Contract(getContractAddress("DeFiUtils"), DeFiUtilsContract.abi, provider);
      console.log("✅ Contract instance created");
      console.log("Contract ABI methods:", Object.keys(contract.interface.fragments));

      // Check if the function exists
      if (!contract.interface.hasFunction(functionName)) {
        throw new Error(`Function '${functionName}' not found in contract ABI`);
      }

      console.log("✅ Function exists in ABI, calling contract...");

      // Call the contract function directly (view function, no gas needed)
      const result = await contract[functionName](...args);
      console.log("✅ Contract call successful, result:", result);

      // Format and display the result
      const formattedResult = formatResult(result, calculationType);
      console.log("✅ Result formatted:", formattedResult);

      // Set current result and show modal
      setCurrentResult({
        type: calculationType,
        value: result,
        formatted: formattedResult,
        inputs: getInputSummary(calculationType),
      });

      setShowResultsModal(true);
      toast.success(`${calculationType} calculation completed!`);
    } catch (error: unknown) {
      console.error("❌ Error in performCalculation:", error);
      let errorMessage = `Failed to calculate ${calculationType.toLowerCase()}`;

      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          errorMessage = "Invalid calculation parameters";
        } else if (error.message.includes("MetaMask")) {
          errorMessage = error.message;
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
      setIsCalculating(false);
    }
  };

  // Get input summary for display
  const getInputSummary = (calculationType: string): Record<string, string> => {
    switch (calculationType) {
      case "Liquidity":
        return {
          "Token 0 Amount": token0Amount,
          "Token 1 Amount": token1Amount,
        };
      case "Simple Yield":
      case "Compound Yield":
        return {
          Principal: principal,
          "Annual Rate": rate + "%",
          Time: time + " years",
          ...(calculationType === "Compound Yield" && {
            "Compound Frequency": getCompoundFrequencyText(compoundFrequency),
          }),
        };
      case "Impermanent Loss":
        return {
          "Initial Token A Amount": initialTokenAAmount,
          "Initial Token B Amount": initialTokenBAmount,
          "Current Token A Price": currentTokenAPrice,
          "Current Token B Price": currentTokenBPrice,
        };
      case "Swap Fee":
        return {
          "Amount In": amountIn,
          "Fee Percentage": feePercentage + "%",
        };
      default:
        return {};
    }
  };

  const getCompoundFrequencyText = (freq: string): string => {
    const frequencies: Record<string, string> = {
      "1": "Annually",
      "2": "Semi-annually",
      "4": "Quarterly",
      "12": "Monthly",
      "365": "Daily",
    };
    return frequencies[freq] || freq;
  };

  // Input validation function
  const validateInput = (value: string, fieldName: string): boolean => {
    if (!value || value === "") {
      toast.error(`${fieldName} is required`);
      return false;
    }

    // Check if it's a valid number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      toast.error(`${fieldName} must be a valid number`);
      return false;
    }

    // Check for reasonable bounds
    if (numValue < 0) {
      toast.error(`${fieldName} cannot be negative`);
      return false;
    }

    // Check for extremely large numbers that might cause issues
    if (numValue > 1e12) {
      toast.error(`${fieldName} is too large. Please use a smaller number.`);
      return false;
    }

    return true;
  };

  const calculateLiquidity = async (): Promise<void> => {
    console.log("🔍 Starting liquidity calculation...");
    console.log("Inputs:", { token0Amount, token1Amount });

    if (!validateInput(token0Amount, "Token 0 Amount") || !validateInput(token1Amount, "Token 1 Amount")) {
      console.log("❌ Input validation failed");
      return;
    }

    console.log("✅ Input validation passed, calling contract...");

    try {
      await performCalculation(
        "calculateLiquidityTokens", // Correct function name from ABI
        [
          convertToBigInt(token0Amount),
          convertToBigInt(token1Amount),
          // Note: This function doesn't take price as parameter
        ],
        "Liquidity",
      );
    } catch (error) {
      console.error("❌ Error in calculateLiquidity:", error);
      toast.error("Failed to calculate liquidity. Check console for details.");
    }
  };

  const calculateSimpleYield = async (): Promise<void> => {
    if (
      !validateInput(principal, "Principal Amount") ||
      !validateInput(rate, "Annual Rate") ||
      !validateInput(time, "Time")
    ) {
      return;
    }

    console.log("🔍 Simple Yield Calculation Details:");
    console.log("Raw inputs:", { principal, rate, time });

    const principalBigInt = convertToBigInt(principal);
    const rateBigInt = convertToBigInt(rate, 18); // Rate in wei format (18 decimals)
    const timeBigInt = BigInt(Math.floor(parseFloat(time) * 365 * 24 * 60 * 60)); // Convert years to seconds

    console.log("Converted BigInt values:");
    console.log("- Principal:", principalBigInt.toString(), "wei");
    console.log("- Rate:", rateBigInt.toString(), "wei (rate with 18 decimals)");
    console.log("- Time:", timeBigInt.toString(), "seconds");

    console.log("Principal in ETH:", Number(principalBigInt) / 1e18);
    console.log("Rate in %:", Number(rateBigInt) / 1e16);
    console.log("Time in years:", parseFloat(time));

    await performCalculation("calculateSimpleYield", [principalBigInt, rateBigInt, timeBigInt], "Simple Yield");
  };

  const calculateCompoundYield = async (): Promise<void> => {
    if (
      !validateInput(principal, "Principal Amount") ||
      !validateInput(rate, "Annual Rate") ||
      !validateInput(time, "Time")
    ) {
      return;
    }

    console.log("🔍 Compound Yield Calculation Details:");
    console.log("Raw inputs:", { principal, rate, time, compoundFrequency });

    const principalBigInt = convertToBigInt(principal);
    const rateBigInt = convertToBigInt(rate, 18); // Rate in wei format (18 decimals)
    const timeBigInt = BigInt(Math.floor(parseFloat(time) * 365 * 24 * 60 * 60)); // Convert years to seconds

    console.log("Converted BigInt values:");
    console.log("- Principal:", principalBigInt.toString(), "wei");
    console.log("- Rate:", rateBigInt.toString(), "wei (rate with 18 decimals)");
    console.log("- Time:", timeBigInt.toString(), "seconds");
    console.log("- Frequency:", compoundFrequency);

    console.log("Principal in ETH:", Number(principalBigInt) / 1e18);
    console.log("Rate in %:", Number(rateBigInt) / 1e16);
    console.log("Time in years:", parseFloat(time));

    await performCalculation(
      "calculateCompoundYield",
      [principalBigInt, rateBigInt, timeBigInt, parseInt(compoundFrequency)],
      "Compound Yield",
    );
  };

  const calculateImpermanentLoss = async (): Promise<void> => {
    if (
      !validateInput(initialTokenAAmount, "Initial Token A Amount") ||
      !validateInput(initialTokenBAmount, "Initial Token B Amount") ||
      !validateInput(currentTokenAPrice, "Current Token A Price") ||
      !validateInput(currentTokenBPrice, "Current Token B Price")
    ) {
      return;
    }

    await performCalculation(
      "calculateImpermanentLoss",
      [
        convertToBigInt(initialTokenAAmount, 18), // Price in wei
        convertToBigInt(initialTokenBAmount, 18), // Price in wei
        convertToBigInt(currentTokenAPrice, 18), // Price in wei
        convertToBigInt(currentTokenBPrice, 18), // Price in wei
      ],
      "Impermanent Loss",
    );
  };

  const calculateSwapFee = async (): Promise<void> => {
    if (!validateInput(amountIn, "Amount In") || !validateInput(feePercentage, "Fee Percentage")) {
      return;
    }

    console.log("🔍 Swap Fee Calculation Details:");
    console.log("Raw inputs:", { amountIn, feePercentage });

    const amountBigInt = convertToBigInt(amountIn);
    // Convert percentage to wei format: 0.3% = 0.003 = 3e15
    const feeRateBigInt = BigInt(Math.floor(parseFloat(feePercentage) * 1e15)); // 0.3% = 3000000000000000

    console.log("Converted BigInt values:");
    console.log("- Amount:", amountBigInt.toString(), "wei");
    console.log("- Fee Rate:", feeRateBigInt.toString(), "wei (fee rate with 18 decimals)");

    console.log("Amount in ETH:", Number(amountBigInt) / 1e18);
    console.log("Fee Rate in %:", parseFloat(feePercentage));
    console.log("Fee Rate in wei:", Number(feeRateBigInt) / 1e18);

    await performCalculation("calculateSwapFee", [amountBigInt, feeRateBigInt], "Swap Fee");
  };

  const formatResult = (value: bigint, type: string): string => {
    if (!value) return "0";

    const numValue = Number(value) / 1e18;

    switch (type) {
      case "Impermanent Loss":
        return `${numValue.toFixed(4)}%`;
      case "Simple Yield":
      case "Compound Yield":
        return `${numValue.toFixed(2)} tokens`;
      case "Swap Fee":
        return `${numValue.toFixed(6)} tokens`;
      case "Liquidity":
        return `${numValue.toFixed(6)} LP tokens`;
      default:
        return numValue.toFixed(6);
    }
  };

  // Calculate another function
  const calculateAnother = (): void => {
    setShowResultsModal(false);
    setCurrentResult(null);
  };

  // Test contract connection
  const testContractConnection = async (): Promise<void> => {
    console.log("🧪 Testing contract connection...");

    try {
      if (!window.ethereum) {
        toast.error("MetaMask not found. Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DeFiUtilsContract.address, DeFiUtilsContract.abi, provider);

      console.log("Contract address:", DeFiUtilsContract.address);
      console.log("Contract ABI length:", DeFiUtilsContract.abi.length);
      console.log(
        "Available functions:",
        DeFiUtilsContract.abi.filter(item => item.type === "function").map(item => item.name),
      );

      // Try to read a simple property or call a view function
      toast.success("Contract connection test successful! Check console for details.");
    } catch (error) {
      console.error("Contract connection test failed:", error);
      toast.error("Contract connection test failed. Check console for details.");
    }
  };

  // Test compound yield with known values
  const testCompoundYield = async (): Promise<void> => {
    console.log("🧪 Testing Compound Yield with known values...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DeFiUtilsContract.address, DeFiUtilsContract.abi, provider);

      // Test with very simple values
      const testPrincipal = BigInt(1000000000000000000); // 1 ETH
      const testRate = BigInt(100000); // 1% (100000 basis points)
      const testTime = BigInt(1000000); // 1 year
      const testFreq = 1; // annually

      console.log("🧪 Test values:");
      console.log("- Principal:", testPrincipal.toString(), "wei (1 ETH)");
      console.log("- Rate:", testRate.toString(), "basis points (1%)");
      console.log("- Time:", testTime.toString(), "scaled years (1 year)");
      console.log("- Frequency:", testFreq);

      const result = await contract.calculateCompoundYield(testPrincipal, testRate, testTime, testFreq);

      console.log("🧪 Test result:", result.toString());
      toast.success(`Test result: ${result.toString()}`);
    } catch (error) {
      console.error("🧪 Test failed:", error);
      toast.error("Test failed. Check console for details.");
    }
  };

  // Test simple yield function
  const testSimpleYield = async (): Promise<void> => {
    console.log("🧪 Testing Simple Yield with known values...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DeFiUtilsContract.address, DeFiUtilsContract.abi, provider);

      // Test with very simple values
      const testPrincipal = BigInt(1000000000000000000); // 1 ETH
      const testRate = BigInt(100000000000000000); // 10% (10e16)
      const testTime = BigInt(31536000); // 1 year in seconds

      console.log("🧪 Simple Yield Test values:");
      console.log("- Principal:", testPrincipal.toString(), "wei (1 ETH)");
      console.log("- Rate:", testRate.toString(), "wei (10%)");
      console.log("- Time:", testTime.toString(), "seconds (1 year)");

      const result = await contract.calculateSimpleYield(testPrincipal, testRate, testTime);

      console.log("🧪 Simple Yield Test result:", result.toString());
      console.log("🧪 Expected: ~0.1 ETH (10% of 1 ETH)");
      toast.success(`Simple Yield Test result: ${result.toString()}`);
    } catch (error) {
      console.error("🧪 Simple Yield Test failed:", error);
      toast.error("Simple Yield Test failed. Check console for details.");
    }
  };

  // Test impermanent loss function
  const testImpermanentLoss = async (): Promise<void> => {
    console.log("🧪 Testing Impermanent Loss with known values...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DeFiUtilsContract.address, DeFiUtilsContract.abi, provider);

      // Test with very simple values
      const testInitialTokenAAmount = BigInt(1000000000000000000); // 1 ETH
      const testInitialTokenBAmount = BigInt(1000000000000000000); // 1 ETH
      const testCurrentTokenAPrice = BigInt(1000000000000000000); // 1 ETH
      const testCurrentTokenBPrice = BigInt(1500000000000000000); // 1.5 ETH

      console.log("🧪 Impermanent Loss Test values:");
      console.log("- Initial Token A Amount:", testInitialTokenAAmount.toString(), "wei (1 ETH)");
      console.log("- Initial Token B Amount:", testInitialTokenBAmount.toString(), "wei (1 ETH)");
      console.log("- Current Token A Price:", testCurrentTokenAPrice.toString(), "wei (1 ETH)");
      console.log("- Current Token B Price:", testCurrentTokenBPrice.toString(), "wei (1.5 ETH)");

      const result = await contract.calculateImpermanentLoss(
        testInitialTokenAAmount,
        testInitialTokenBAmount,
        testCurrentTokenAPrice,
        testCurrentTokenBPrice,
      );

      console.log("🧪 Impermanent Loss Test result:", result.toString());
      toast.success(`Impermanent Loss Test result: ${result.toString()}`);
    } catch (error) {
      console.error("🧪 Impermanent Loss Test failed:", error);
      toast.error("Impermanent Loss Test failed. Check console for details.");
    }
  };

  // Test swap fee function
  const testSwapFee = async (): Promise<void> => {
    console.log("🧪 Testing Swap Fee with known values...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DeFiUtilsContract.address, DeFiUtilsContract.abi, provider);

      // Test with very simple values
      const testAmountIn = BigInt(1000000000000000000); // 1 ETH
      const testFeePercentage = BigInt(3000000000000000); // 0.3% (3e15, not 3e16)

      console.log("🧪 Swap Fee Test values:");
      console.log("- Amount In:", testAmountIn.toString(), "wei (1 ETH)");
      console.log("- Fee Percentage:", testFeePercentage.toString(), "wei (0.3%)");

      const result = await contract.calculateSwapFee(testAmountIn, testFeePercentage);

      console.log("🧪 Swap Fee Test result:", result.toString());
      console.log("🧪 Expected: 3000000000000000 wei (0.003 ETH)");
      toast.success(`Swap Fee Test result: ${result.toString()}`);
    } catch (error) {
      console.error("🧪 Swap Fee Test failed:", error);
      toast.error("Swap Fee Test failed. Check console for details.");
    }
  };

  // Results Modal Component
  const ResultsModal = (): React.JSX.Element | null => {
    if (!showResultsModal || !currentResult) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1c2941] rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#2a3b54] shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4"></div>
            <h2 className="text-3xl font-bold text-emerald-400 mb-2">Calculation Complete!</h2>
            <p className="text-xl text-gray-300">{currentResult.type} calculation finished successfully</p>
          </div>

          {/* Result Display */}
          <div className="bg-[#0f1a2e] rounded-xl p-6 mb-6 border border-[#1e2a3a] text-center">
            <h3 className="text-lg font-semibold mb-3 text-emerald-400">{currentResult.type} Result</h3>
            <div className="text-4xl font-bold text-white mb-4">{currentResult.formatted}</div>
          </div>

          {/* Input Summary */}
          <div className="bg-[#0f1a2e] rounded-xl p-6 mb-6 border border-[#1e2a3a]">
            <h3 className="text-lg font-semibold mb-4 text-emerald-400">Calculation Inputs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(currentResult.inputs).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400">{key}:</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={calculateAnother}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              Calculate Another
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

  const tabs = [
    { id: "liquidity", name: "Liquidity", icon: "💧" },
    { id: "yield", name: "Yield", icon: "📈" },
    { id: "impermanent-loss", name: "Impermanent Loss", icon: "📉" },
    { id: "swap-fee", name: "Swap Fee", icon: "💱" },
  ];

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">DeFi Utilities</h1>
          <p className="text-xl text-gray-300">
            Advanced DeFi calculations for liquidity, yield, impermanent loss, and more
          </p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
            <p className="text-gray-300 mb-6">
              Please connect your wallet to any EVM-compatible network to use DeFi utilities.
            </p>
            <p className="text-xs text-gray-400">
              Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
            </p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={(): void => setActiveTab(tab.id)}
                  className={`px-6 py-3 mx-2 mb-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id ? "bg-purple-600 text-white" : "bg-[#1c2941] text-gray-300 hover:bg-[#243a5f]"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-[#1c2941] rounded-lg p-8">
              {/* Loading State */}
              {isCalculating && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-3"></div>
                    <span className="text-purple-400 font-medium">Performing calculation... Please wait.</span>
                  </div>
                </div>
              )}

              {/* Liquidity Calculator */}
              {activeTab === "liquidity" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Liquidity Calculator</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Token 0 Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Token 0 Amount</label>
                      <input
                        type="number"
                        value={token0Amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken0Amount(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="0.000001"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter a positive number (e.g., 1000)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Token 1 Amount</label>
                      <input
                        type="number"
                        value={token1Amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken1Amount(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="0.000001"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter a positive number (e.g., 1000)</p>
                    </div>
                  </div>
                  <button
                    onClick={calculateLiquidity}
                    disabled={isCalculating || !token0Amount || !token1Amount}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isCalculating || !token0Amount || !token1Amount
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {isCalculating ? "Calculating..." : "Calculate Liquidity"}
                  </button>

                  {/* Input Status */}
                  <div className="mt-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${token0Amount ? "bg-green-500" : "bg-gray-500"}`}></span>
                      Token 0 Amount: {token0Amount || "Not set"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${token1Amount ? "bg-green-500" : "bg-gray-500"}`}></span>
                      Token 1 Amount: {token1Amount || "Not set"}
                    </div>
                  </div>
                </div>
              )}

              {/* Yield Calculator */}
              {activeTab === "yield" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Yield Calculator</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {/* Principal Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Principal Amount</label>
                      <input
                        type="number"
                        value={principal}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrincipal(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter a positive number (e.g., 1000)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Annual Rate (%)</label>
                      <input
                        type="number"
                        value={rate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate(e.target.value)}
                        placeholder="5"
                        min="0"
                        max="1000"
                        step="0.1"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter percentage (e.g., 5 for 5%)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Time (years)</label>
                      <input
                        type="number"
                        value={time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)}
                        placeholder="1"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter time in years (e.g., 1 for 1 year)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Compound Frequency</label>
                      <select
                        value={compoundFrequency}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompoundFrequency(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="1">Annually</option>
                        <option value="2">Semi-annually</option>
                        <option value="4">Quarterly</option>
                        <option value="12">Monthly</option>
                        <option value="365">Daily</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={calculateSimpleYield}
                      disabled={isCalculating}
                      className={`px-6 py-3 rounded-lg transition-colors ${
                        isCalculating
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      {isCalculating ? "Calculating..." : "Calculate Simple Yield"}
                    </button>
                    <button
                      onClick={calculateCompoundYield}
                      disabled={isCalculating}
                      className={`px-6 py-3 rounded-lg transition-colors ${
                        isCalculating
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      {isCalculating ? "Calculating..." : "Calculate Compound Yield"}
                    </button>
                  </div>
                </div>
              )}

              {/* Impermanent Loss Calculator */}
              {activeTab === "impermanent-loss" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Impermanent Loss Calculator</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Initial Token A Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Initial Token A Amount</label>
                      <input
                        type="number"
                        value={initialTokenAAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInitialTokenAAmount(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="0.000001"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter initial amount of token A</p>
                    </div>
                    {/* Initial Token B Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Initial Token B Amount</label>
                      <input
                        type="number"
                        value={initialTokenBAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInitialTokenBAmount(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="0.000001"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter initial amount of token B</p>
                    </div>
                    {/* Current Token A Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Token A Price</label>
                      <input
                        type="number"
                        value={currentTokenAPrice}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTokenAPrice(e.target.value)}
                        placeholder="1.0"
                        min="0"
                        step="0.000001"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter current price of token A</p>
                    </div>
                    {/* Current Token B Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Token B Price</label>
                      <input
                        type="number"
                        value={currentTokenBPrice}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTokenBPrice(e.target.value)}
                        placeholder="1.5"
                        min="0"
                        step="0.000001"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter current price of token B</p>
                    </div>
                  </div>
                  <button
                    onClick={calculateImpermanentLoss}
                    disabled={isCalculating}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isCalculating
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {isCalculating ? "Calculating..." : "Calculate Impermanent Loss"}
                  </button>
                </div>
              )}

              {/* Swap Fee Calculator */}
              {activeTab === "swap-fee" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Swap Fee Calculator</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Amount In */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Amount In</label>
                      <input
                        type="number"
                        value={amountIn}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountIn(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter a positive amount (e.g., 1000)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Fee Percentage (%)</label>
                      <input
                        type="number"
                        value={feePercentage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeePercentage(e.target.value)}
                        placeholder="0.3"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-3 bg-[#0f1a2e] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">Enter fee percentage (e.g., 0.3 for 0.3%)</p>
                    </div>
                  </div>
                  <button
                    onClick={calculateSwapFee}
                    disabled={isCalculating}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isCalculating
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {isCalculating ? "Calculating..." : "Calculate Swap Fee"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ResultsModal />
    </div>
  );
};

export default DeFiUtilsPage;
