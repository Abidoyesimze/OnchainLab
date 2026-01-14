"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";

// Define types for better type safety
interface CalculationResult {
  type: string;
  value: number;
  formatted: string;
  inputs: Record<string, string>;
}

const DeFiUtilsPage = () => {
  const [activeTab, setActiveTab] = useState("liquidity");

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

  // Input validation function
  const validateInput = (value: string, fieldName: string): boolean => {
    if (!value || value === "") {
      toast.error(`${fieldName} is required`);
      return false;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      toast.error(`${fieldName} must be a valid number`);
      return false;
    }

    if (numValue < 0) {
      toast.error(`${fieldName} cannot be negative`);
      return false;
    }

    if (numValue > 1e12) {
      toast.error(`${fieldName} is too large. Please use a smaller number.`);
      return false;
    }

    return true;
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

  // Client-side calculation functions
  const calculateLiquidity = (): void => {
    if (!validateInput(token0Amount, "Token 0 Amount") || !validateInput(token1Amount, "Token 1 Amount")) {
      return;
    }

    const amount0 = parseFloat(token0Amount);
    const amount1 = parseFloat(token1Amount);

    // Constant product formula: LP tokens = sqrt(x * y)
    // This is the standard Uniswap V2 formula
    const liquidity = Math.sqrt(amount0 * amount1);

    setCurrentResult({
      type: "Liquidity",
      value: liquidity,
      formatted: liquidity.toFixed(6) + " LP tokens",
      inputs: getInputSummary("Liquidity"),
    });

    setShowResultsModal(true);
    toast.success("Liquidity calculation completed!");
  };

  const calculateSimpleYield = (): void => {
    if (!validateInput(principal, "Principal Amount") || !validateInput(rate, "Annual Rate") || !validateInput(time, "Time")) {
      return;
    }

    const principalValue = parseFloat(principal);
    const rateValue = parseFloat(rate) / 100; // Convert percentage to decimal
    const timeValue = parseFloat(time);

    // Simple interest: A = P * r * t
    const yieldAmount = principalValue * rateValue * timeValue;
    const totalAmount = principalValue + yieldAmount;

    setCurrentResult({
      type: "Simple Yield",
      value: yieldAmount,
      formatted: yieldAmount.toFixed(2) + " tokens (Total: " + totalAmount.toFixed(2) + " tokens)",
      inputs: getInputSummary("Simple Yield"),
    });

    setShowResultsModal(true);
    toast.success("Simple yield calculation completed!");
  };

  const calculateCompoundYield = (): void => {
    if (!validateInput(principal, "Principal Amount") || !validateInput(rate, "Annual Rate") || !validateInput(time, "Time")) {
      return;
    }

    const principalValue = parseFloat(principal);
    const rateValue = parseFloat(rate) / 100; // Convert percentage to decimal
    const timeValue = parseFloat(time);
    const frequency = parseFloat(compoundFrequency);

    // Compound interest: A = P * (1 + r/n)^(n*t)
    const compoundAmount = principalValue * Math.pow(1 + rateValue / frequency, frequency * timeValue);
    const yieldAmount = compoundAmount - principalValue;

    setCurrentResult({
      type: "Compound Yield",
      value: yieldAmount,
      formatted: yieldAmount.toFixed(2) + " tokens (Total: " + compoundAmount.toFixed(2) + " tokens)",
      inputs: getInputSummary("Compound Yield"),
    });

    setShowResultsModal(true);
    toast.success("Compound yield calculation completed!");
  };

  const calculateImpermanentLoss = (): void => {
    if (
      !validateInput(initialTokenAAmount, "Initial Token A Amount") ||
      !validateInput(initialTokenBAmount, "Initial Token B Amount") ||
      !validateInput(currentTokenAPrice, "Current Token A Price") ||
      !validateInput(currentTokenBPrice, "Current Token B Price")
    ) {
      return;
    }

    const initialA = parseFloat(initialTokenAAmount);
    const initialB = parseFloat(initialTokenBAmount);
    const currentPriceA = parseFloat(currentTokenAPrice);
    const currentPriceB = parseFloat(currentTokenBPrice);

    // Calculate price ratio (r = newPrice / oldPrice)
    // For constant product AMMs, we need the price ratio
    const initialPriceRatio = initialB / initialA; // Initial price of B in terms of A
    const currentPriceRatio = currentPriceB / currentPriceA; // Current price of B in terms of A
    const priceRatio = currentPriceRatio / initialPriceRatio; // Relative price change

    // Impermanent Loss formula: IL = 2 * sqrt(r) / (1 + r) - 1
    // Where r is the price ratio
    const impermanentLoss = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
    const impermanentLossPercent = impermanentLoss * 100;

    setCurrentResult({
      type: "Impermanent Loss",
      value: impermanentLossPercent,
      formatted: impermanentLossPercent.toFixed(4) + "%",
      inputs: getInputSummary("Impermanent Loss"),
    });

    setShowResultsModal(true);
    toast.success("Impermanent loss calculation completed!");
  };

  const calculateSwapFee = (): void => {
    if (!validateInput(amountIn, "Amount In") || !validateInput(feePercentage, "Fee Percentage")) {
      return;
    }

    const amount = parseFloat(amountIn);
    const fee = parseFloat(feePercentage) / 100; // Convert percentage to decimal

    // Swap fee: fee = amount * feePercentage
    const feeAmount = amount * fee;

    setCurrentResult({
      type: "Swap Fee",
      value: feeAmount,
      formatted: feeAmount.toFixed(6) + " tokens",
      inputs: getInputSummary("Swap Fee"),
    });

    setShowResultsModal(true);
    toast.success("Swap fee calculation completed!");
  };

  // Calculate another function
  const calculateAnother = (): void => {
    setShowResultsModal(false);
    setCurrentResult(null);
  };

  // Results Modal Component
  const ResultsModal = (): React.JSX.Element | null => {
    if (!showResultsModal || !currentResult) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1c2941] rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#2a3b54] shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-white mb-2">Calculation Complete!</h2>
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
          <h1 className="text-4xl font-bold mb-4 text-white">DeFi Utilities</h1>
          <p className="text-xl text-gray-300">
            Advanced DeFi calculations for liquidity, yield, impermanent loss, and more
          </p>
        </div>

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
          {/* Liquidity Calculator */}
          {activeTab === "liquidity" && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Liquidity Calculator</h2>
              <p className="text-gray-400 mb-6">
                Calculate LP tokens for a constant product AMM (Uniswap V2 style) using the formula: LP = √(x × y)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  <p className="text-sm text-gray-400 mt-1">Enter amount of token 0</p>
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
                  <p className="text-sm text-gray-400 mt-1">Enter amount of token 1</p>
                </div>
              </div>
              <button
                onClick={calculateLiquidity}
                disabled={!token0Amount || !token1Amount}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  !token0Amount || !token1Amount
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                Calculate Liquidity
              </button>
            </div>
          )}

          {/* Yield Calculator */}
          {activeTab === "yield" && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Yield Calculator</h2>
              <p className="text-gray-400 mb-6">
                Calculate simple or compound interest returns on your principal amount
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                  <p className="text-sm text-gray-400 mt-1">Initial investment amount</p>
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
                  <p className="text-sm text-gray-400 mt-1">Annual interest rate</p>
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
                  <p className="text-sm text-gray-400 mt-1">Investment period in years</p>
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
                  <p className="text-sm text-gray-400 mt-1">For compound yield only</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={calculateSimpleYield}
                  disabled={!principal || !rate || !time}
                  className={`px-6 py-3 rounded-lg transition-colors ${
                    !principal || !rate || !time
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  Calculate Simple Yield
                </button>
                <button
                  onClick={calculateCompoundYield}
                  disabled={!principal || !rate || !time}
                  className={`px-6 py-3 rounded-lg transition-colors ${
                    !principal || !rate || !time
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  Calculate Compound Yield
                </button>
              </div>
            </div>
          )}

          {/* Impermanent Loss Calculator */}
          {activeTab === "impermanent-loss" && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Impermanent Loss Calculator</h2>
              <p className="text-gray-400 mb-6">
                Calculate impermanent loss for liquidity providers in constant product AMMs. Impermanent loss occurs when the price ratio of tokens in a liquidity pool changes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  <p className="text-sm text-gray-400 mt-1">Initial amount of token A in pool</p>
                </div>
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
                  <p className="text-sm text-gray-400 mt-1">Initial amount of token B in pool</p>
                </div>
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
                  <p className="text-sm text-gray-400 mt-1">Current price of token A</p>
                </div>
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
                  <p className="text-sm text-gray-400 mt-1">Current price of token B</p>
                </div>
              </div>
              <button
                onClick={calculateImpermanentLoss}
                disabled={!initialTokenAAmount || !initialTokenBAmount || !currentTokenAPrice || !currentTokenBPrice}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  !initialTokenAAmount || !initialTokenBAmount || !currentTokenAPrice || !currentTokenBPrice
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                Calculate Impermanent Loss
              </button>
            </div>
          )}

          {/* Swap Fee Calculator */}
          {activeTab === "swap-fee" && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Swap Fee Calculator</h2>
              <p className="text-gray-400 mb-6">
                Calculate the fee amount for a token swap based on the swap amount and fee percentage
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  <p className="text-sm text-gray-400 mt-1">Amount being swapped</p>
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
                  <p className="text-sm text-gray-400 mt-1">Swap fee percentage (e.g., 0.3 for 0.3%)</p>
                </div>
              </div>
              <button
                onClick={calculateSwapFee}
                disabled={!amountIn || !feePercentage}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  !amountIn || !feePercentage
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                Calculate Swap Fee
              </button>
            </div>
          )}
        </div>
      </div>
      <ResultsModal />
    </div>
  );
};

export default DeFiUtilsPage;
