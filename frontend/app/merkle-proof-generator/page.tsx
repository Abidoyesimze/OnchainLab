"use client";

import { useEffect, useState } from "react";
import { MerkleProofContract } from "../../ABI";
import { generateMerkleTree as buildMerkleTree } from "../../utils/Merkle";
import { MerkleTree } from "../../utils/Merkle";
import { ethers } from "ethers";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatEther } from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { NETWORK_INFO } from "../../contracts/deployedContracts";
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  DocumentCheckIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Contract address - use the actual deployed contract address from ABI
const CONTRACT_ADDRESS = MerkleProofContract.address;

// Define interface for tree info
interface TreeInfo {
  description: string;
  creator: string;
  listSize: number;
  timestamp: number;
}

const MerkleGenerator = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // UI state
  const [addresses, setAddresses] = useState<string[]>([]);
  const [inputAddress, setInputAddress] = useState("");
  const [merkleRoot, setMerkleRoot] = useState("");
  const [merkleTree, setMerkleTree] = useState<MerkleTree | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [proof, setProof] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [treeDescription, setTreeDescription] = useState("");
  const [showContractSection, setShowContractSection] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState("");

  // Contract state
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isContractLoading, setIsContractLoading] = useState(false);
  const [merkleRootValid, setMerkleRootValid] = useState(false);
  const [treeInfo, setTreeInfo] = useState<TreeInfo | null>(null);
  const [platformFee, setPlatformFee] = useState<string>("0");
  const [isNewcomer, setIsNewcomer] = useState(false);
  const [isCheckingContract, setIsCheckingContract] = useState(false);

  // Initialize ethers contract when wallet connects
  useEffect(() => {
    const initializeContract = async () => {
      if (!isConnected || !window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, MerkleProofContract.abi, signer);

        setContract(contractInstance);
        setSigner(signer);

        // Fetch platform fee
        try {
          const fee = await contractInstance.platformFee();
          setPlatformFee(fee.toString());
        } catch (error) {
          console.error("Error fetching platform fee:", error);
        }

        // Check if user is newcomer
        if (connectedAddress) {
          try {
            const newcomerStatus = await contractInstance.isNewcomer(connectedAddress);
            setIsNewcomer(newcomerStatus);
          } catch (error) {
            console.error("Error checking newcomer status:", error);
          }
        }
      } catch (error) {
        console.error("Error initializing contract:", error);
        toast.error("Failed to initialize contract");
      }
    };

    initializeContract();
  }, [isConnected, connectedAddress]);

  // Check merkle root validity when it changes
  useEffect(() => {
    const checkMerkleRoot = async () => {
      if (!merkleRoot || !contract) {
        setMerkleRootValid(false);
        setTreeInfo(null);
        return;
      }

      setIsCheckingContract(true);
      try {
        // Check if root exists
        const exists = await contract.merkleRoots(merkleRoot);
        setMerkleRootValid(exists);

        if (exists) {
          // Get tree info
          const info = await contract.merkleTreeInfo(merkleRoot);
          setTreeInfo({
            description: info.description,
            creator: info.creator,
            listSize: Number(info.listSize),
            timestamp: Number(info.timestamp),
          });
        } else {
          setTreeInfo(null);
        }
      } catch (error) {
        console.error("Error checking merkle root:", error);
        setMerkleRootValid(false);
        setTreeInfo(null);
      } finally {
        setIsCheckingContract(false);
      }
    };

    checkMerkleRoot();
  }, [merkleRoot, contract]);

  const isPageLoading = isLoading || isContractLoading || isCheckingContract;

  const validateAddress = (address: string) => {
    try {
      return ethers.isAddress(address.toLowerCase());
    } catch (error) {
      return false;
    }
  };

  const handleAddAddress = () => {
    if (!inputAddress.trim()) {
      toast.error("Please enter an address");
      return;
    }

    const normalizedAddress = inputAddress.trim().toLowerCase();
    if (!validateAddress(normalizedAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (addresses.includes(normalizedAddress)) {
      toast.warning("Address already added");
      return;
    }

    setAddresses(prevAddresses => {
      const newAddresses = [...prevAddresses, normalizedAddress];
      generateMerkleTree(newAddresses);
      return newAddresses;
    });
    setInputAddress("");
    toast.success("Address added successfully");
  };

  const handleRemoveAddress = (addressToRemove: string) => {
    setAddresses(prevAddresses => {
      const newAddresses = prevAddresses.filter(addr => addr !== addressToRemove);
      generateMerkleTree(newAddresses);
      return newAddresses;
    });
    toast.info("Address removed");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const text = e.target?.result as string | undefined;
        if (!text) {
          toast.error("Error reading file");
          setIsLoading(false);
          return;
        }
        Papa.parse(text, {
          complete: (results: ParseResult<string[]>) => {
            const lines = results.data
              .flat()
              .map((line: string | number) => (typeof line === "string" ? line.trim() : String(line).trim()))
              .filter((line: string) => line)
              .map((line: string) => line.toLowerCase());

            const validAddresses = lines.filter((addr: string) => validateAddress(addr));
            const invalidAddresses = lines.filter((addr: string) => !validateAddress(addr) && addr.length > 0);

            if (validAddresses.length > 0) {
              setAddresses(prevAddresses => {
                const newAddresses = [...new Set([...prevAddresses, ...validAddresses])];
                generateMerkleTree(newAddresses);
                return newAddresses;
              });
              toast.success(`Added ${validAddresses.length} valid addresses`);
            }

            if (invalidAddresses.length > 0) {
              toast.error(`Found ${invalidAddresses.length} invalid addresses`);
            }
          },
          error: (error: any) => {
            toast.error("Error parsing file: " + error.message);
          },
        });
      } catch (error) {
        toast.error("Error processing file");
        console.error(error);
      } finally {
        setIsLoading(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    };

    reader.onerror = () => {
      toast.error("Error reading file");
      setIsLoading(false);
      if (event.target) {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  const handlePasteAddresses = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    const lines = text
      .split(/[\n,]/) // Split by newlines or commas
      .map(line => line.trim())
      .filter(line => line)
      .map(line => line.toLowerCase());

    const validAddresses = lines.filter(addr => validateAddress(addr));
    const invalidAddresses = lines.filter(addr => !validateAddress(addr) && addr.length > 0);

    if (validAddresses.length > 0) {
      setAddresses(prevAddresses => {
        const newAddresses = [...new Set([...prevAddresses, ...validAddresses])];
        generateMerkleTree(newAddresses);
        return newAddresses;
      });
      toast.success(`Added ${validAddresses.length} valid addresses`);
    } else {
      toast.warning("No valid addresses found in pasted text");
    }

    if (invalidAddresses.length > 0) {
      toast.error(`Found ${invalidAddresses.length} invalid addresses`);
    }

    event.target.value = "";
  };

  const generateMerkleTree = (addressList: string[]) => {
    if (!addressList || addressList.length === 0) {
      setMerkleTree(null);
      setMerkleRoot("");
      return null;
    }

    try {
      const tree = buildMerkleTree(addressList);
      setMerkleTree(tree);
      setMerkleRoot(tree.getHexRoot());
      return tree;
    } catch (error) {
      toast.error("Error generating Merkle tree");
      console.error(error);
      return null;
    }
  };

  const handleGenerateProof = (address: string) => {
    if (!merkleTree || !address) return;

    try {
      const proof = merkleTree.getHexProof(ethers.keccak256(address));
      setProof(proof);
      setSelectedAddress(address);
      toast.success("Proof generated successfully");
    } catch (error) {
      toast.error("Error generating proof");
      console.error(error);
    }
  };

  const downloadProof = () => {
    if (!proof.length) return;

    const proofData = {
      address: selectedAddress,
      proof: proof,
      merkleRoot: merkleRoot,
    };

    const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: "application/json" });
    saveAs(blob, `merkle-proof-${selectedAddress.slice(0, 8)}.json`);
    toast.success("Proof downloaded successfully");
  };

  const downloadAllData = () => {
    if (!merkleTree || !addresses.length) return;

    const allData = {
      merkleRoot,
      addresses,
      proofs: addresses.map(address => ({
        address,
        proof: merkleTree.getHexProof(ethers.keccak256(address)),
      })),
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    saveAs(blob, `merkle-tree-data.json`);
    toast.success("All data downloaded successfully");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Contract interaction handlers using ethers
  const handlePublishMerkleRoot = async () => {
    if (!merkleRoot || !addresses.length || !treeDescription || !contract) {
      toast.error("Missing required information to publish Merkle root");
      return;
    }

    try {
      setIsContractLoading(true);
      setTxStatus("pending");

      // Calculate fee
      const fee = isNewcomer ? 0n : BigInt(platformFee);

      // Estimate gas with a buffer
      let gasEstimate;
      try {
        gasEstimate = await contract.addMerkleTree.estimateGas(merkleRoot, treeDescription, addresses.length, {
          value: fee,
        });
        // Add 20% buffer to gas estimate
        gasEstimate = (gasEstimate * 120n) / 100n;
      } catch (error) {
        console.warn("Gas estimation failed, using fallback:", error);
        gasEstimate = 300000n; // Fallback gas limit
      }

      // Send transaction with manual gas settings
      const tx = await contract.addMerkleTree(merkleRoot, treeDescription, addresses.length, {
        value: fee,
        gasLimit: gasEstimate,
      });

      setTxHash(tx.hash);
      toast.info("Transaction submitted, waiting for confirmation...");

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setTxStatus("confirmed");
        toast.success("Merkle root successfully published to the blockchain!");
      } else {
        setTxStatus("failed");
        toast.error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Error publishing Merkle root:", error);
      setTxStatus("failed");

      // User-friendly error messages
      if (error.code === 4001 || error.message?.includes("user rejected")) {
        toast.error("Transaction was rejected");
      } else if (error.code === -32603 || error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds in your wallet");
      } else if (error.message?.includes("gas")) {
        toast.error("Gas estimation failed. Try increasing gas limit manually.");
      } else {
        toast.error(`Error: ${error.reason || error.message || "Transaction failed"}`);
      }
    } finally {
      setIsContractLoading(false);
    }
  };

  const handleRemoveMerkleRoot = async () => {
    if (!merkleRoot || !contract) {
      toast.error("No Merkle root selected or contract not available");
      return;
    }

    if (!merkleRootValid) {
      toast.error("This Merkle root is not registered in the contract");
      return;
    }

    if (treeInfo && treeInfo.creator !== connectedAddress) {
      toast.error("Only the creator can remove this Merkle tree");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this Merkle tree? This action cannot be undone.")) {
      return;
    }

    try {
      setIsContractLoading(true);
      setTxStatus("pending");

      // Estimate gas with buffer
      let gasEstimate;
      try {
        gasEstimate = await contract.removeMerkleTree.estimateGas(merkleRoot);
        gasEstimate = (gasEstimate * 120n) / 100n;
      } catch (error) {
        console.warn("Gas estimation failed, using fallback:", error);
        gasEstimate = 200000n;
      }

      const tx = await contract.removeMerkleTree(merkleRoot, {
        gasLimit: gasEstimate,
      });

      setTxHash(tx.hash);
      toast.info("Transaction submitted, waiting for confirmation...");

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setTxStatus("confirmed");
        toast.success("Merkle root successfully removed from the blockchain!");
      } else {
        setTxStatus("failed");
        toast.error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Error removing Merkle root:", error);
      setTxStatus("failed");

      if (error.code === 4001 || error.message?.includes("user rejected")) {
        toast.error("Transaction was rejected");
      } else {
        toast.error(`Error: ${error.reason || error.message || "Transaction failed"}`);
      }
    } finally {
      setIsContractLoading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!merkleRoot || !treeDescription || !contract) {
      toast.error("Please provide a new description");
      return;
    }

    if (!merkleRootValid) {
      toast.error("This Merkle root is not registered in the contract");
      return;
    }

    if (treeInfo && treeInfo.creator !== connectedAddress) {
      toast.error("Only the creator can update this Merkle tree's description");
      return;
    }

    try {
      setIsContractLoading(true);
      setTxStatus("pending");

      // Estimate gas with buffer
      let gasEstimate;
      try {
        gasEstimate = await contract.updateTreeDescription.estimateGas(merkleRoot, treeDescription);
        gasEstimate = (gasEstimate * 120n) / 100n;
      } catch (error) {
        console.warn("Gas estimation failed, using fallback:", error);
        gasEstimate = 150000n;
      }

      const tx = await contract.updateTreeDescription(merkleRoot, treeDescription, {
        gasLimit: gasEstimate,
      });

      setTxHash(tx.hash);
      toast.info("Transaction submitted, waiting for confirmation...");

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setTxStatus("confirmed");
        toast.success("Merkle tree description successfully updated!");
      } else {
        setTxStatus("failed");
        toast.error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Error updating description:", error);
      setTxStatus("failed");

      if (error.code === 4001 || error.message?.includes("user rejected")) {
        toast.error("Transaction was rejected");
      } else {
        toast.error(`Error: ${error.reason || error.message || "Transaction failed"}`);
      }
    } finally {
      setIsContractLoading(false);
    }
  };

  // Format timestamp to date
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    try {
      return new Date(timestamp * 1000).toLocaleString();
    } catch (error) {
      return "";
    }
  };

  return (
    <div className="bg-[#121d33] text-white">
      {/* ToastContainer for notifications */}
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

      <div className="max-w-4xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">OnchainLab Merkle Proof Generator</h2>

            {/* Wallet Connection */}
            <div>
              {!isConnected ? (
                <button
                  onClick={() => {
                    connect({ connector: connectors[0] });
                    toast.info("Connecting wallet...");
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">
                    {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
                  </span>
                  <button
                    onClick={() => {
                      disconnect();
                      toast.info("Wallet disconnected");
                    }}
                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-gray-300 mb-4">
            Generate Merkle proofs for your whitelist, airdrop, or any other permissioned system. Upload addresses, get
            your Merkle root and proofs.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Network: {NETWORK_INFO.name} (Chain ID: {NETWORK_INFO.chainId})
          </p>

          <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-800">
            <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <CodeBracketIcon className="h-5 w-5" />
              Developer Note
            </h3>
            <p className="text-sm text-purple-300">
              Use the Merkle root in your smart contract. Users can later submit their proof to verify eligibility. This
              saves gas by not storing the entire list on-chain.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Debug Import Test */}
          <div className="rounded-lg p-6 bg-red-900/20 border border-red-500/30">
            <h3 className="text-lg font-semibold mb-4 text-white">Debug Import Test</h3>
            <p className="text-sm text-gray-400">
              This section is for debugging the address import functionality. It will generate a Merkle tree from a
              predefined list of addresses.
            </p>
            <button
              onClick={() => {
                const testAddresses = [
                  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                  "0x1234567890123456789012345678901234567890",
                  "0xabcdef1234567890abcdef1234567890abcdef1234",
                  "0x1122334455667788990011223344556677889900",
                ];
                generateMerkleTree(testAddresses);
                toast.success("Merkle tree generated from test addresses.");
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Generate Test Merkle Tree
            </button>
            <p className="mt-4 text-sm text-gray-400">
              Current Merkle Root: <span className="font-mono text-gray-300">{merkleRoot || "N/A"}</span>
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Current Tree Size: <span className="font-mono text-gray-300">{merkleTree?.getHexRoot() ? "Valid" : "Invalid"}</span>
            </p>
          </div>

          {/* File Upload Section */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Upload Addresses</h3>
            <div className="space-y-4">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-900/30 file:text-purple-300
                  hover:file:bg-purple-900/40
                  dark:hover:file:text-purple-300
                  file:transition-colors"
                disabled={isPageLoading}
              />
              <p className="text-sm text-gray-400">Upload a CSV or TXT file with one address per line</p>
            </div>
          </div>

          {/* Paste Addresses Section */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Add Multiple Addresses</h3>
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  placeholder="Paste addresses here (one per line or comma-separated)"
                  onChange={handlePasteAddresses}
                  className="block w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white"
                  disabled={isPageLoading}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Address Input Section */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Add Single Address</h3>
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputAddress}
                onChange={e => setInputAddress(e.target.value)}
                placeholder="Enter Ethereum address"
                className="flex-1 p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white"
                disabled={isPageLoading}
              />
              <button
                onClick={handleAddAddress}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                disabled={isPageLoading || !inputAddress.trim()}
              >
                Add
              </button>
            </div>
          </div>

          {/* Address List Section */}
          <div className="rounded-lg p-6 bg-[#1c2941]">
            <h3 className="text-lg font-semibold mb-4 text-white">Addresses List</h3>
            {addresses.length === 0 ? (
              <p className="text-gray-400">No addresses added yet</p>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-400">
                    Total Addresses: <span className="font-semibold">{addresses.length}</span>
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all addresses?")) {
                        setAddresses([]);
                        setMerkleTree(null);
                        setMerkleRoot("");
                        setProof([]);
                        setSelectedAddress("");
                        toast.info("All addresses cleared");
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                    disabled={isPageLoading}
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
                  <ul className="divide-y divide-gray-700">
                    {addresses.map(address => (
                      <li key={address} className="p-3 flex items-center justify-between text-sm hover:bg-gray-700">
                        <span className="text-gray-200 font-mono truncate max-w-xs">{address}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRemoveAddress(address)}
                            className="text-red-400 hover:text-red-300"
                            title="Remove Address"
                            disabled={isPageLoading}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleGenerateProof(address)}
                            className="text-green-400 hover:text-green-300"
                            title="Generate Proof"
                            disabled={isPageLoading}
                          >
                            <DocumentCheckIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Merkle Root Display */}
          {merkleRoot && (
            <div className="rounded-lg p-6 bg-[#1c2941]">
              <h3 className="text-lg font-semibold mb-4 text-white">Merkle Root</h3>
              <div className="flex items-center space-x-2 overflow-x-auto mb-4 bg-gray-700 p-3 rounded">
                <span className="text-sm font-mono text-gray-300 break-all">{merkleRoot}</span>
                <button
                  onClick={() => copyToClipboard(merkleRoot)}
                  className="text-purple-400 ml-2 flex-shrink-0"
                  title="Copy to Clipboard"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Root Status & Contract Interaction Section */}
              {isConnected && (
                <div className="space-y-4">
                  {/* Root status */}
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium mb-2 text-gray-300">Blockchain Status</h4>

                    {isCheckingContract ? (
                      <p className="text-sm text-gray-400">Checking root status...</p>
                    ) : merkleRootValid ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-green-400 text-sm">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          <span>Root is registered on-chain</span>
                        </div>

                        {treeInfo && (
                          <div className="mt-2 text-sm text-gray-300">
                            <p>
                              <span className="font-medium">Description:</span> {treeInfo.description}
                            </p>
                            <p>
                              <span className="font-medium">Creator:</span> {treeInfo.creator?.slice(0, 6)}...
                              {treeInfo.creator?.slice(-4)}
                            </p>
                            <p>
                              <span className="font-medium">Size:</span> {treeInfo.listSize} addresses
                            </p>
                            <p>
                              <span className="font-medium">Created:</span> {formatDate(treeInfo.timestamp)}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-400 text-sm">
                        <XCircleIcon className="h-5 w-5 mr-2" />
                        <span>Root is not yet registered on-chain</span>
                      </div>
                    )}
                  </div>

                  {/* Contract interaction buttons */}
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => {
                        setShowContractSection(!showContractSection);
                        if (!showContractSection) {
                          toast.info("Expanded blockchain operations");
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {showContractSection ? "Hide Contract Options" : "Manage on Blockchain"}
                    </button>
                  </div>

                  {/* Contract interaction section */}
                  {showContractSection && (
                    <div className="mt-4 p-4 border border-gray-700 rounded-lg">
                      <h4 className="text-lg font-medium mb-4 text-gray-200">Blockchain Operations</h4>

                      {/* Description input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tree Description</label>
                        <input
                          type="text"
                          value={treeDescription}
                          onChange={e => setTreeDescription(e.target.value)}
                          placeholder="e.g., NFT Whitelist Phase 1"
                          className="w-full p-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white"
                          disabled={isPageLoading}
                        />
                      </div>

                      {/* Fee info */}
                      {platformFee && BigInt(platformFee) > 0 && (
                        <div className="mb-4 p-3 bg-gray-700 rounded-lg text-sm">
                          <p className="text-gray-300">
                            <span className="font-medium">Platform Fee:</span> {formatEther(BigInt(platformFee))} ETH
                            {isNewcomer && <span className="ml-2 text-green-400">(First tree is free!)</span>}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Publish button */}
                        <button
                          onClick={handlePublishMerkleRoot}
                          disabled={isPageLoading || !merkleRoot || !treeDescription || merkleRootValid}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isContractLoading ? "Processing..." : "Publish Root"}
                        </button>

                        {/* Update button */}
                        <button
                          onClick={handleUpdateDescription}
                          disabled={isPageLoading || !merkleRoot || !treeDescription || !merkleRootValid}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isContractLoading ? "Processing..." : "Update Description"}
                        </button>

                        {/* Remove button */}
                        <button
                          onClick={handleRemoveMerkleRoot}
                          disabled={isPageLoading || !merkleRoot || !merkleRootValid}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isContractLoading ? "Processing..." : "Remove Root"}
                        </button>
                      </div>

                      {/* Transaction status */}
                      {txHash && (
                        <div className="mt-4 p-3 bg-purple-900/20 rounded-lg text-sm border border-purple-800">
                          <p className="text-purple-300 break-all">
                            <span className="font-medium">Transaction Hash:</span> {txHash}
                          </p>
                          <p className="mt-1 text-purple-300">
                            <span className="font-medium">Status:</span> {txStatus}
                          </p>
                          {txHash && (
                            <p className="mt-1">
                              <a
                                href={`${NETWORK_INFO.blockExplorer}/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 underline text-sm"
                              >
                                View on Explorer
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Proof Generation Section */}
          {proof.length > 0 && (
            <div className="rounded-lg p-6 bg-[#1c2941]">
              <h3 className="text-lg font-semibold mb-4 text-white">
                Merkle Proof for {selectedAddress.slice(0, 6)}...{selectedAddress.slice(-4)}
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm text-white">{JSON.stringify(proof, null, 2)}</pre>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(proof, null, 2))}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Copy Proof
                  </button>
                  <button
                    onClick={downloadProof}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Download Proof
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Download All Data Button */}
          {addresses.length > 0 && (
            <div className="mt-6">
              <button
                onClick={downloadAllData}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={isPageLoading}
              >
                Download All Data (Merkle Root + All Proofs)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerkleGenerator;
