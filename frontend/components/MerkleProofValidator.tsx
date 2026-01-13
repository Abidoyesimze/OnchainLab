/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useEffect, useState } from "react";
import { MerkleVerifierContract } from "../components/index";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createPublicClient, http } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { CodeBracketIcon, DocumentCheckIcon } from "@heroicons/react/24/outline";

// Define TypeScript interface for tree info
interface TreeInfo {
  description: string;
  creator: string;
  timestamp: string;
  validationCount: number;
  isActive: boolean;
}

const MerkleValidator: React.FC = () => {
  // UI states
  const [merkleRoot, setMerkleRoot] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [proof, setProof] = useState<string>("");
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isOnChainValidating, setIsOnChainValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [resultColor, setResultColor] = useState<string>("");

  // Contract states
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [treeInfo, setTreeInfo] = useState<TreeInfo | null>(null);

  // Wagmi hooks
  const { address: userAddress, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Function to check if a Merkle root is registered on-chain
  const checkMerkleRootRegistration = useCallback(async (): Promise<void> => {
    if (!merkleRoot || !chain?.id) return;

    try {
      // Create a read-only provider for the current chain
      const publicClient = createPublicClient({
        chain: chain,
        transport: http("https://eth-sepolia.g.alchemy.com/v2/FIQ1qwifmra7ZqdkVHnZ2lHQAKG8j4Yd"),
      });

      const contractAddress = MerkleVerifierContract.address as `0x${string}`;

      // Call getValidationStats to check if registered
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: MerkleVerifierContract.abi,
        functionName: "getValidationStats",
        args: [merkleRoot],
      });

      if (!Array.isArray(result) || result.length < 5) {
        throw new Error("Invalid result format from contract");
      }

      // Type assertion to ensure correct types
      const [description, creator, timestamp, validationCount, isActive] = result as [
        string,
        string,
        bigint,
        bigint,
        boolean,
      ];

      // If creator address is not zero, it's registered
      const isReg = creator !== ethers.ZeroAddress;
      setIsRegistered(isReg);

      if (isReg) {
        // Format tree info
        setTreeInfo({
          description,
          creator,
          timestamp: new Date(Number(timestamp) * 1000).toLocaleString(),
          validationCount: Number(validationCount),
          isActive,
        });
      } else {
        setTreeInfo(null);
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setIsRegistered(false);
      setTreeInfo(null);
    }
  }, [merkleRoot, chain]); // Dependencies for useCallback

  // Set user's address as default if connected
  useEffect(() => {
    if (userAddress && !address) {
      setAddress(userAddress);
    }
  }, [userAddress, address]);

  // Check if the merkle root is registered when it changes

  useEffect(() => {
    if (merkleRoot && merkleRoot.startsWith("0x") && merkleRoot.length === 66) {
      checkMerkleRootRegistration();
    } else {
      setIsRegistered(false);
      setTreeInfo(null);
    }
  }, [merkleRoot, chain?.id]);

  // Function to verify Merkle proof client-side
  const verifyProof = (): void => {
    setIsValidating(true);

    try {
      // Parse the proof JSON if it's a string
      let parsedProof;
      try {
        parsedProof = typeof proof === "string" ? JSON.parse(proof) : proof;
      } catch (e) {
        toast.error("Invalid proof format. Please provide a valid JSON array.");
        setIsValidating(false);
        return;
      }

      // Check if proof is an array
      if (!Array.isArray(parsedProof)) {
        toast.error("The proof must be an array of strings.");
        setIsValidating(false);
        return;
      }

      // Verify the proof
      const leaf = ethers.keccak256(ethers.getBytes(ethers.getAddress(address)));
      const isValid = verifyMerkleProof(parsedProof, merkleRoot, leaf);

      // Set the result with appropriate color
      setValidationResult(
        isValid ? "Valid proof! Address is in the Merkle tree." : "Invalid proof. Address is not in the Merkle tree.",
      );
      setResultColor(isValid ? "text-green-400" : "text-red-400");

      // Show toast notification
      if (isValid) {
        toast.success("Proof is valid!");
      } else {
        toast.error("Proof is invalid!");
      }
    } catch (error) {
      console.error("Validation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setValidationResult(`Error: ${errorMessage}`);
      setResultColor("text-red-400");
      toast.error(`Validation error: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Helper function for Merkle proof verification
  const verifyMerkleProof = (proof: string[], root: string, leaf: string): boolean => {
    let computedHash = leaf;

    for (const proofElement of proof) {
      if (computedHash < proofElement) {
        // Hash(current computed hash + current element of the proof)
        computedHash = ethers.keccak256(ethers.concat([computedHash as `0x${string}`, proofElement as `0x${string}`]));
      } else {
        // Hash(current element of the proof + current computed hash)
        computedHash = ethers.keccak256(ethers.concat([proofElement as `0x${string}`, computedHash as `0x${string}`]));
      }
    }

    // Check if the computed hash (root) is equal to the provided root
    return computedHash === root;
  };

  // Function to verify on-chain
  const verifyOnChain = async (): Promise<void> => {
    if (!isConnected) {
      toast.error("Please connect your wallet to verify on-chain");
      return;
    }

    if (!chain?.id) {
      toast.error("Unable to determine current network");
      return;
    }

    setIsOnChainValidating(true);

    try {
      // Parse the proof JSON and ensure it's an array
      let parsedProof;
      try {
        parsedProof = typeof proof === "string" ? JSON.parse(proof) : proof;
      } catch (e) {
        toast.error("Invalid proof format. Please provide a valid JSON array.");
        setIsOnChainValidating(false);
        return;
      }

      // Check if proof is an array
      if (!Array.isArray(parsedProof)) {
        toast.error("The proof must be an array of strings.");
        setIsOnChainValidating(false);
        return;
      }

      // Create contract instance
      const contractAddress = MerkleVerifierContract.address as `0x${string}`;

      // Prepare transaction data
      const leaf = ethers.keccak256(ethers.getBytes(ethers.getAddress(address)));

      // Use view function first to check validity without spending gas
      const publicClient = createPublicClient({
        chain: chain,
        transport: http("https://eth-sepolia.g.alchemy.com/v2/FIQ1qwifmra7ZqdkVHnZ2lHQAKG8j4Yd"),
      });

      // Ensure hex strings have 0x prefix
      const formattedProof = parsedProof.map((item: string) =>
        item.startsWith("0x") ? (item as `0x${string}`) : (`0x${item}` as `0x${string}`),
      );

      try {
        const isValidView = await publicClient.readContract({
          address: contractAddress,
          abi: MerkleVerifierContract.abi,
          functionName: "validateProofView",
          args: [merkleRoot, formattedProof, leaf],
        });

        // If not valid according to view function, no need to send transaction
        if (!isValidView) {
          setValidationResult("Invalid proof. Address is not in the Merkle tree.");
          setResultColor("text-red-400");
          toast.error("Proof is invalid! No transaction needed.");
          setIsOnChainValidating(false);
          return;
        }
      } catch (e) {
        console.error("Error during validation view call:", e);
        toast.error(`Contract error: ${e instanceof Error ? e.message : "Unknown error during proof validation"}`);
        setIsOnChainValidating(false);
        return;
      }

      // If the tree is not registered, offer to register it
      if (!isRegistered) {
        const registerFirst = window.confirm(
          "This Merkle root is not registered on-chain. Would you like to register it first?\n\n" +
            "Registering allows tracking validation statistics and ensures the root is recognized by other contracts.",
        );

        if (registerFirst) {
          // Register the Merkle root first
          const success = await registerMerkleRoot();
          if (!success) {
            setIsOnChainValidating(false);
            return;
          }
        }
      }

      if (!userAddress) {
        toast.error("Could not determine your address. Please reconnect your wallet.");
        setIsOnChainValidating(false);
        return;
      }

      // Execute the transaction
      try {
        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: MerkleVerifierContract.abi,
          functionName: "validateProof",
          args: [merkleRoot, formattedProof, leaf],
          account: userAddress,
        });

        if (!walletClient) {
          toast.error("Wallet client is not available. Please reconnect your wallet.");
          setIsOnChainValidating(false);
          return;
        }

        const hash = await walletClient.writeContract(request);

        toast.info(
          <div>
            <p>Transaction submitted!</p>
            <a
              href={`${chain.blockExplorers?.default?.url}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              View on block explorer
            </a>
          </div>,
          { autoClose: false },
        );

        setValidationResult("Proof validated on-chain successfully!");
        setResultColor("text-green-400");

        // Refresh tree info after validation
        setTimeout(checkMerkleRootRegistration, 5000);
      } catch (e) {
        console.error("Error during contract transaction:", e);
        toast.error(`Transaction error: ${e instanceof Error ? e.message : "Unknown error during transaction"}`);
        setIsOnChainValidating(false);
      }
    } catch (error) {
      console.error("On-chain validation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setValidationResult(`Error: ${errorMessage}`);
      setResultColor("text-red-400");
      toast.error(`On-chain validation failed: ${errorMessage}`);
    } finally {
      setIsOnChainValidating(false);
    }
  };

  // Function to register a new Merkle root
  const registerMerkleRoot = async (): Promise<boolean> => {
    if (!isConnected || !merkleRoot) {
      toast.error("Please connect your wallet and provide a valid Merkle root");
      return false;
    }

    const description = prompt("Enter a description for this Merkle tree:", "My Merkle Tree");

    if (!description) return false; // User canceled

    try {
      if (!userAddress || !walletClient || !chain) {
        toast.error("Wallet connection issues. Please reconnect your wallet.");
        return false;
      }

      // Create contract instance
      const contractAddress = MerkleVerifierContract.address as `0x${string}`;

      // Create public client for simulation
      const publicClient = createPublicClient({
        chain: chain,
        transport: http("https://eth-sepolia.g.alchemy.com/v2/FIQ1qwifmra7ZqdkVHnZ2lHQAKG8j4Yd"),
      });

      // Simulate transaction
      try {
        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: MerkleVerifierContract.abi,
          functionName: "registerMerkleRoot",
          args: [merkleRoot, description],
          account: userAddress,
        });

        // Execute transaction
        const hash = await walletClient.writeContract(request);

        toast.info(
          <div>
            <p>Registration submitted!</p>
            <a
              href={`${chain.blockExplorers?.default?.url}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              View on block explorer
            </a>
          </div>,
          { autoClose: false },
        );

        // Refresh tree info after registration
        setTimeout(checkMerkleRootRegistration, 5000);

        return true;
      } catch (e) {
        console.error("Simulation error:", e);
        toast.error(`Contract error: ${e instanceof Error ? e.message : "Unknown error during contract simulation"}`);
        return false;
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to register Merkle root: ${errorMessage}`);
      return false;
    }
  };

  // Handle file upload for proof JSON
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const target = e.target;
        if (!target || !target.result) {
          toast.error("File reading failed or no content found.");
          return;
        }

        const result = target.result;
        if (typeof result !== "string") {
          toast.error("File content is not a valid string.");
          return;
        }

        const content = JSON.parse(result);

        // Handle different JSON formats
        if (content.merkleRoot) {
          setMerkleRoot(content.merkleRoot);
        }

        // Extract proof based on format
        if (content.proofs && Array.isArray(content.proofs)) {
          // For the format in your example with multiple proofs
          let proofEntry;

          // If address is already set, try to find a matching proof
          if (address) {
            proofEntry = content.proofs.find((p: any) => p.address?.toLowerCase() === address.toLowerCase());
          }

          // If no matching proof found or no address set, use the first proof
          if (!proofEntry && content.proofs.length > 0) {
            proofEntry = content.proofs[0];
            // Also set the address if not set
            if (proofEntry.address && !address) {
              setAddress(proofEntry.address);
            }
          }

          // If we found a proof entry, set the proof
          if (proofEntry && Array.isArray(proofEntry.proof)) {
            setProof(JSON.stringify(proofEntry.proof, null, 2));
          } else {
            toast.warning("Could not find a valid proof in the file");
          }
        } else if (content.proof) {
          // Simple format with direct proof object
          if (Array.isArray(content.proof)) {
            setProof(JSON.stringify(content.proof, null, 2));
          }

          // Set address if available
          if (content.address && !address) {
            setAddress(content.address);
          }
        } else if (Array.isArray(content)) {
          // Just an array of proof elements
          setProof(JSON.stringify(content, null, 2));
        } else {
          toast.warning("Could not find proof data in the expected format");
        }

        toast.success("Proof file loaded successfully");
      } catch (error) {
        console.error("Error parsing JSON:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(`Error parsing JSON: ${errorMessage}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#121d33] text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Merkle Proof Validator</h2>

          <p className="text-gray-300 mb-6">
            Validate Merkle proofs to ensure addresses are correctly included in your Merkle tree. This tool helps
            verify the integrity of your whitelists and access control systems.
          </p>

          {/* Developer Note */}
          <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-800">
            <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <CodeBracketIcon className="h-5 w-5" />
              Developer Note
            </h3>
            <p className="text-sm text-purple-300">
              Verify a Merkle proof against the root to confirm an address is part of the tree. This allows for
              efficient verification without storing the entire list on-chain.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Merkle Root Input */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Merkle Root</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={merkleRoot}
                onChange={e => setMerkleRoot(e.target.value)}
                placeholder="Enter Merkle root (0x...)"
                className="w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white"
              />
              <p className="text-sm text-gray-400">
                The Merkle root from your tree (32 bytes hex string starting with 0x)
              </p>

              {/* Display tree info if registered */}
              {isRegistered && treeInfo && (
                <div className="bg-gray-700/50 p-3 rounded-lg mt-2 border border-purple-800/50">
                  <div className="flex items-center mb-2">
                    <div className="bg-green-900/30 text-green-400 px-2 py-1 text-xs rounded mr-2">Registered</div>
                    <span className="text-sm font-medium text-gray-300">On-Chain Tree Information</span>
                  </div>
                  <div className="text-sm grid grid-cols-1 gap-1 text-gray-300">
                    <p>
                      <span className="font-medium">Description:</span> {treeInfo.description}
                    </p>
                    <p>
                      <span className="font-medium">Creator:</span> {treeInfo.creator.slice(0, 6)}...
                      {treeInfo.creator.slice(-4)}
                    </p>
                    <p>
                      <span className="font-medium">Created:</span> {treeInfo.timestamp}
                    </p>
                    <p>
                      <span className="font-medium">Validation Count:</span> {treeInfo.validationCount}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span> {treeInfo.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address Input */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Address to Verify</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter Ethereum address (0x...)"
                className="w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white"
              />
              <p className="text-sm text-gray-400">The address you want to verify is in the Merkle tree</p>

              {isConnected && userAddress && (
                <div className="flex items-center">
                  <button
                    onClick={() => setAddress(userAddress)}
                    className="px-3 py-1 bg-purple-600/30 text-purple-300 text-sm rounded hover:bg-purple-600/50 transition-colors border border-purple-600/50"
                  >
                    Use My Address
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Proof Input */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Merkle Proof</h3>
            <div className="space-y-4">
              <textarea
                value={proof}
                onChange={e => setProof(e.target.value)}
                placeholder={`Enter Merkle proof JSON array\n[\n  "0x123...",\n  "0x456..."\n]`}
                className="w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white font-mono"
                rows={6}
              />

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">Or upload proof JSON file:</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-900/30 file:text-purple-300
                    hover:file:bg-purple-900/40"
                />
              </div>
            </div>
          </div>

          {/* Validation Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={verifyProof}
              disabled={isValidating || !merkleRoot || !address || !proof}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Validating...
                </div>
              ) : (
                "Validate Locally"
              )}
            </button>

            {isConnected && (
              <button
                onClick={verifyOnChain}
                disabled={isOnChainValidating || !merkleRoot || !address || !proof}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOnChainValidating ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  "Validate On-Chain"
                )}
              </button>
            )}

            {!isRegistered && isConnected && merkleRoot && (
              <button
                onClick={registerMerkleRoot}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Register Merkle Root
              </button>
            )}
          </div>

          {/* Results Section */}
          {validationResult && (
            <div className="rounded-lg p-6 bg-[#1c2941]">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
                <DocumentCheckIcon className="h-5 w-5 mr-2" />
                Validation Result
              </h3>
              <div
                className={`p-4 rounded-lg ${
                  resultColor === "text-green-400"
                    ? "bg-green-900/20 border border-green-800"
                    : "bg-red-900/20 border border-red-800"
                }`}
              >
                <p className={`text-lg font-medium ${resultColor}`}>{validationResult}</p>
              </div>

              {resultColor === "text-green-400" && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium text-gray-300">You can use this proof for:</h4>
                  <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                    <li>NFT whitelist verification</li>
                    <li>Token airdrop claims</li>
                    <li>DAO governance access</li>
                    <li>Permission management in smart contracts</li>
                  </ul>

                  <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium mb-2 text-gray-300">Sample Contract Code</h4>
                    {}
                    <pre className="text-xs overflow-x-auto text-gray-300 p-2 bg-gray-800 rounded">
                      {`// Verify this address and proof in your smart contract
function verify(bytes32[] memory proof) public view returns (bool) {
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    return MerkleProof.verify(proof, merkleRoot, leaf);
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Usage Guide */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">How to Use the Validator</h3>
            <ol className="space-y-2 text-gray-300 list-decimal list-inside">
              <li>Enter the Merkle root from your generated tree</li>
              <li>Enter the Ethereum address you want to verify</li>
              <li>
                Enter the Merkle proof array as JSON or upload a proof file
                <span className="block text-sm text-gray-400 ml-5 mt-1">
                  (Generate this proof from the Merkle Proof Generator tool)
                </span>
              </li>
              <li>Click {}"Validate Locally" to check client-side</li>
              <li>
                Click {}"Validate On-Chain" to verify and record the validation on the blockchain
                <span className="block text-sm text-gray-400 ml-5 mt-1">
                  (Requires a connected wallet and will trigger a transaction)
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerkleValidator;
