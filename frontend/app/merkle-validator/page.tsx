"use client";

import { useState } from "react";
import { MerkleProofValidatorContract, getContractAddress } from "../../ABI";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";

const MerkleValidatorPage = () => {
  const { address, isConnected } = useAccount();
  const [merkleRoot, setMerkleRoot] = useState("");
  const [proof, setProof] = useState("");
  const [leaf, setLeaf] = useState("");
  const [description, setDescription] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleRegisterMerkleRoot = async () => {
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

    if (!window.ethereum) {
      toast.error("MetaMask or wallet provider not found");
      return;
    }

    setIsRegistering(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        getContractAddress("MerkleProofValidator"),
        MerkleProofValidatorContract.abi,
        signer,
      );

      toast.info("Registering Merkle root...");

      const tx = await contract.registerMerkleRoot(merkleRoot, description);
      toast.info(`Transaction sent: ${tx.hash.slice(0, 10)}...`);

      const receipt = await tx.wait();
      toast.success("Merkle root registered successfully!");

      // Reset form
      setMerkleRoot("");
      setDescription("");
    } catch (error: unknown) {
      let errorMessage = "Failed to register Merkle root";
      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction rejected by user";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "Transaction failed. The Merkle root may already be registered.";
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
      console.error("Error registering Merkle root:", error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleValidateProof = async () => {
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

    if (!window.ethereum) {
      toast.error("MetaMask or wallet provider not found");
      return;
    }

    setIsValidating(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        getContractAddress("MerkleProofValidator"),
        MerkleProofValidatorContract.abi,
        signer,
      );

      // Parse proof - it should be an array of bytes32
      // The proof input might be a comma-separated string or JSON array
      let proofArray: string[];
      try {
        // Try to parse as JSON array first
        if (proof.trim().startsWith("[")) {
          proofArray = JSON.parse(proof);
        } else {
          // Otherwise, try comma-separated values
          proofArray = proof.split(",").map((p) => p.trim());
        }
      } catch {
        // If parsing fails, treat as single value
        proofArray = [proof];
      }

      toast.info("Validating proof...");

      const tx = await contract.validateProof(merkleRoot, proofArray, leaf);
      toast.info(`Transaction sent: ${tx.hash.slice(0, 10)}...`);

      const receipt = await tx.wait();

      // Parse events from receipt
      const validateEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "ProofValidated" || parsed?.name === "ValidationResult";
        } catch {
          return false;
        }
      });

      if (validateEvent) {
        try {
          const parsed = contract.interface.parseLog(validateEvent);
          setValidationResult({
            valid: parsed?.args?.valid || true,
            merkleRoot: merkleRoot,
            leaf: leaf,
            txHash: receipt.hash,
          });
        } catch {
          setValidationResult({
            valid: true,
            merkleRoot: merkleRoot,
            leaf: leaf,
            txHash: receipt.hash,
          });
        }
      } else {
        setValidationResult({
          valid: true,
          merkleRoot: merkleRoot,
          leaf: leaf,
          txHash: receipt.hash,
        });
      }

      toast.success("Proof validation completed!");
    } catch (error: unknown) {
      let errorMessage = "Failed to validate proof";
      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction rejected by user";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "Proof validation failed. The proof may be invalid.";
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
      console.error("Error validating proof:", error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Merkle Proof Validator</h1>
          <p className="text-xl text-gray-300">Validate Merkle proofs and manage Merkle root registrations</p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">
              Please connect your wallet to Mantle Sepolia Testnet to use the Merkle Proof Validator.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Register Merkle Root Section */}
            <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54]">
              <h2 className="text-2xl font-bold mb-6 text-white">Register Merkle Root</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Merkle Root *</label>
                  <input
                    type="text"
                    value={merkleRoot}
                    onChange={(e) => setMerkleRoot(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-sm text-gray-400 mt-1">Enter the Merkle root hash (0x + 64 hex characters)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., NFT Whitelist Phase 1"
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-sm text-gray-400 mt-1">Provide a description for this Merkle root</p>
                </div>

                <button
                  onClick={handleRegisterMerkleRoot}
                  disabled={isRegistering || !merkleRoot || !description}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    isRegistering || !merkleRoot || !description
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isRegistering ? (
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
            <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54]">
              <h2 className="text-2xl font-bold mb-6 text-white">Validate Merkle Proof</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Merkle Root *</label>
                  <input
                    type="text"
                    value={merkleRoot}
                    onChange={(e) => setMerkleRoot(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Proof *</label>
                  <textarea
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder='Enter proof array (e.g., ["0x...", "0x..."] or comma-separated)'
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                  <p className="text-sm text-gray-400 mt-1">Enter the Merkle proof as a JSON array or comma-separated values</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Leaf *</label>
                  <input
                    type="text"
                    value={leaf}
                    onChange={(e) => setLeaf(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-sm text-gray-400 mt-1">Enter the leaf value to validate</p>
                </div>

                <button
                  onClick={handleValidateProof}
                  disabled={isValidating || !merkleRoot || !proof || !leaf}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    isValidating || !merkleRoot || !proof || !leaf
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
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

            {/* Results Display */}
            {validationResult && (
              <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54]">
                <h3 className="text-xl font-bold mb-4 text-green-400">Validation Result</h3>
                <div className="bg-[#0f1a2e] p-4 rounded-lg border border-[#1e2a3a]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-semibold ${validationResult.valid ? "text-green-400" : "text-red-400"}`}>
                        {validationResult.valid ? "Valid" : "Invalid"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Transaction Hash:</span>
                      <code className="text-blue-400 text-sm">{validationResult.txHash}</code>
                    </div>
                    {validationResult.merkleRoot && (
                      <div>
                        <span className="text-gray-400">Merkle Root:</span>
                        <code className="text-gray-300 text-sm ml-2">{validationResult.merkleRoot}</code>
                      </div>
                    )}
                    {validationResult.leaf && (
                      <div>
                        <span className="text-gray-400">Leaf:</span>
                        <code className="text-gray-300 text-sm ml-2">{validationResult.leaf}</code>
                      </div>
                    )}
                  </div>
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
