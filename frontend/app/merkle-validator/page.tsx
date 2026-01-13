"use client";

import { useState } from "react";
import { MerkleProofValidatorContract, getContractAddress } from "../../ABI";
import { toast } from "react-toastify";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import React from "react"; // Added missing import

const MerkleValidatorPage = () => {
  const { address, isConnected } = useAccount();
  const [merkleRoot, setMerkleRoot] = useState("");
  const [proof, setProof] = useState("");
  const [leaf, setLeaf] = useState("");
  const [description, setDescription] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { writeContract: registerMerkleRoot, data: registerData } = useWriteContract();

  const { writeContract: validateProof, data: validateData } = useWriteContract();

  const { isLoading: isRegistering, isSuccess: isRegistered } = useWaitForTransactionReceipt({
    hash: registerData,
  });

  const { isLoading: isValidatingTx, isSuccess: isValidationComplete } = useWaitForTransactionReceipt({
    hash: validateData,
  });

  const handleRegisterMerkleRoot = () => {
    if (!merkleRoot || !description) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    // Basic validation
    if (!merkleRoot.startsWith("0x") || merkleRoot.length !== 66) {
      toast.error("Please enter a valid Merkle root (0x + 64 hex characters)");
      return;
    }

    try {
      setIsValidating(true);
      registerMerkleRoot({
        address: getContractAddress("MerkleProofValidator"),
        abi: MerkleProofValidatorContract.abi,
        functionName: "registerMerkleRoot",
        args: [merkleRoot, description],
      });
      toast.info("Registering Merkle root...");
    } catch (error) {
      console.error("Error registering Merkle root:", error);
      toast.error("Failed to register Merkle root");
      setIsValidating(false);
    }
  };

  const handleValidateProof = () => {
    if (!merkleRoot || !proof || !leaf) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    // Basic validation
    if (!merkleRoot.startsWith("0x") || merkleRoot.length !== 66) {
      toast.error("Please enter a valid Merkle root (0x + 64 hex characters)");
      return;
    }

    if (!proof.startsWith("0x")) {
      toast.error("Please enter a valid proof (should start with 0x)");
      return;
    }

    try {
      setIsValidating(true);
      validateProof({
        address: getContractAddress("MerkleProofValidator"),
        abi: MerkleProofValidatorContract.abi,
        functionName: "validateProof",
        args: [merkleRoot, proof, leaf],
      });
      toast.info("Validating proof...");
    } catch (error) {
      console.error("Error validating proof:", error);
      toast.error("Failed to validate proof");
      setIsValidating(false);
    }
  };

  // Reset form after successful operations
  React.useEffect(() => {
    if (isRegistered) {
      setMerkleRoot("");
      setDescription("");
      setIsValidating(false);
      toast.success("Merkle root registered successfully!");
    }
  }, [isRegistered]);

  React.useEffect(() => {
    if (isValidationComplete) {
      setIsValidating(false);
      toast.success("Proof validation completed!");
    }
  }, [isValidationComplete]);

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-slate-400 bg-clip-text text-transparent">
            Merkle Proof Validator
          </h1>
          <p className="text-xl text-gray-300">
            Validate Merkle proofs and manage Merkle root registrations
          </p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">
              Please connect your wallet to any EVM-compatible network to use the Merkle Proof Validator.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Register Merkle Root Section */}
            <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54] shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-purple-400">Register Merkle Root</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Merkle Root *</label>
                  <input
                    type="text"
                    value={merkleRoot}
                    onChange={(e) => setMerkleRoot(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-200"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Enter the Merkle root hash (0x + 64 hex characters)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., NFT Whitelist Phase 1"
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-200"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Provide a description for this Merkle root
                  </p>
                </div>

                <button
                  onClick={handleRegisterMerkleRoot}
                  disabled={isValidating || !merkleRoot || !description}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    isValidating || !merkleRoot || !description
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-slate-600 hover:from-purple-700 hover:to-slate-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  }`}
                >
                  {isValidating ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Registering...
                    </div>
                  ) : (
                    "Register Merkle Root"
                  )}
                </button>
              </div>
            </div>

            {/* Validate Proof Section */}
            <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54] shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-green-400">Validate Merkle Proof</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Merkle Root *</label>
                  <input
                    type="text"
                    value={merkleRoot}
                    onChange={(e) => setMerkleRoot(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Proof *</label>
                  <input
                    type="text"
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all duration-200"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Enter the Merkle proof (array of hashes)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Leaf *</label>
                  <input
                    type="text"
                    value={leaf}
                    onChange={(e) => setLeaf(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all duration-200"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Enter the leaf value to validate
                  </p>
                </div>

                <button
                  onClick={handleValidateProof}
                  disabled={isValidating || !merkleRoot || !proof || !leaf}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    isValidating || !merkleRoot || !proof || !leaf
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  }`}
                >
                  {isValidating ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Validating...
                    </div>
                  ) : (
                    "Validate Proof"
                  )}
                </button>
              </div>
            </div>

            {/* Transaction Status */}
            {(isRegistering || isValidatingTx) && (
              <div className="bg-gradient-to-r from-blue-900/20 to-slate-900/20 p-6 rounded-xl border border-blue-500/30">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-blue-400 font-medium">
                    {isRegistering ? "Registering Merkle root..." : "Validating proof..."}
                  </span>
                </div>
              </div>
            )}

            {/* Results Display */}
            {validationResult && (
              <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54] shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-emerald-400">Validation Result</h3>
                <div className="bg-[#0f1a2e] p-4 rounded-lg border border-[#1e2a3a]">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(validationResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerkleValidatorPage;
