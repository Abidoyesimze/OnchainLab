"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ERC20FactoryABI, ERC721FactoryABI, ERC1155FactoryABI, getContractAddress } from "../../ABI";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import { DocumentDuplicateIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import ContractVerification from "../../components/ContractVerification";
import { NETWORK_INFO } from "../../contracts/deployedContracts";

type TokenType = "erc20" | "erc721" | "erc1155";

interface DeploymentResult {
  type: string;
  address: string;
  name: string;
  symbol: string;
  inputs: Record<string, string>;
}

interface StoredToken {
  id: string;
  type: string;
  name: string;
  symbol: string;
  address: string;
  createdAt: number;
  txHash?: string;
}

const EXPLORER_URL = NETWORK_INFO.blockExplorer;

// Standard ERC20/ERC721 ABI for name() and symbol()
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
] as const;

// Helper function to get liquidity URL
const getLiquidityUrl = (tokenAddress: string, chainId: number): string => {
  return `https://app.uniswap.org/#/add/ETH/${tokenAddress}/${chainId}`;
};

const TokenFactoryPage = () => {
  const { address, isConnected } = useAccount();
  const [selectedTokenType, setSelectedTokenType] = useState<TokenType>("erc20");
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [myTokens, setMyTokens] = useState<StoredToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<StoredToken | null>(null);
  const [viewMode, setViewMode] = useState<"create" | "view">("create");

  // Fetch tokens from smart contracts
  const fetchMyTokens = useCallback(async () => {
    if (!isConnected || !address || !window.ethereum) return;

    setIsLoadingTokens(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const allTokens: StoredToken[] = [];

      // Fetch ERC20 tokens
      try {
        const erc20FactoryAddress = getContractAddress("ERC20Factory");
        const erc20Factory = new ethers.Contract(erc20FactoryAddress, ERC20FactoryABI, provider);
        
        // Check if the function exists before calling
        try {
          const erc20Addresses = await erc20Factory.getTokensByCreator(address);
          
          for (const tokenAddress of erc20Addresses) {
            try {
              const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
              const [name, symbol] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
              ]);
              
              allTokens.push({
                id: `${tokenAddress}-erc20`,
                type: "ERC20",
                name,
                symbol,
                address: tokenAddress,
                createdAt: Date.now(),
              });
            } catch (err) {
              console.error(`Error fetching ERC20 token ${tokenAddress}:`, err);
              allTokens.push({
                id: `${tokenAddress}-erc20`,
                type: "ERC20",
                name: "Unknown",
                symbol: "UNK",
                address: tokenAddress,
                createdAt: Date.now(),
              });
            }
          }
        } catch (err: any) {
          // If function doesn't exist or returns empty data, silently skip
          if (err.code !== 'BAD_DATA') {
            console.error("Error fetching ERC20 tokens:", err);
          }
        }
      } catch (err) {
        console.error("Error with ERC20 factory:", err);
      }

      // Fetch ERC721 tokens
      try {
        const erc721FactoryAddress = getContractAddress("ERC721Factory");
        const erc721Factory = new ethers.Contract(erc721FactoryAddress, ERC721FactoryABI, provider);
        
        try {
          const erc721Addresses = await erc721Factory.getCollectionsByCreator(address);
          
          for (const tokenAddress of erc721Addresses) {
            try {
              const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
              const [name, symbol] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
              ]);
              
              allTokens.push({
                id: `${tokenAddress}-erc721`,
                type: "ERC721",
                name,
                symbol,
                address: tokenAddress,
                createdAt: Date.now(),
              });
            } catch (err) {
              console.error(`Error fetching ERC721 token ${tokenAddress}:`, err);
              allTokens.push({
                id: `${tokenAddress}-erc721`,
                type: "ERC721",
                name: "Unknown",
                symbol: "UNK",
                address: tokenAddress,
                createdAt: Date.now(),
              });
            }
          }
        } catch (err: any) {
          if (err.code !== 'BAD_DATA') {
            console.error("Error fetching ERC721 tokens:", err);
          }
        }
      } catch (err) {
        console.error("Error with ERC721 factory:", err);
      }

      // Fetch ERC1155 tokens
      try {
        const erc1155FactoryAddress = getContractAddress("ERC1155Factory");
        const erc1155Factory = new ethers.Contract(erc1155FactoryAddress, ERC1155FactoryABI, provider);
        
        try {
          const erc1155Addresses = await erc1155Factory.getContractsByCreator(address);
          
          for (const tokenAddress of erc1155Addresses) {
            try {
              const tokenContract = new ethers.Contract(tokenAddress, [
                "function name() view returns (string)",
              ], provider);
              const name = await tokenContract.name();
              
              allTokens.push({
                id: `${tokenAddress}-erc1155`,
                type: "ERC1155",
                name,
                symbol: "MT",
                address: tokenAddress,
                createdAt: Date.now(),
              });
            } catch (err) {
              console.error(`Error fetching ERC1155 token ${tokenAddress}:`, err);
              allTokens.push({
                id: `${tokenAddress}-erc1155`,
                type: "ERC1155",
                name: "Unknown",
                symbol: "MT",
                address: tokenAddress,
                createdAt: Date.now(),
              });
            }
          }
        } catch (err: any) {
          if (err.code !== 'BAD_DATA') {
            console.error("Error fetching ERC1155 tokens:", err);
          }
        }
      } catch (err) {
        console.error("Error with ERC1155 factory:", err);
      }

      setMyTokens(allTokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      // Don't show error toast if it's just empty data
    } finally {
      setIsLoadingTokens(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchMyTokens();
    } else {
      setMyTokens([]);
    }
  }, [isConnected, address, fetchMyTokens]);

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

  const handleInputChange = useCallback((field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

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
    setViewMode("create");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleTokenClick = (token: StoredToken) => {
    setSelectedToken(token);
    setViewMode("view");
  };

  const handleCreateNew = () => {
    setSelectedToken(null);
    setViewMode("create");
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

    setIsDeploying(true);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask or wallet provider not found. Please install MetaMask.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (Number(network.chainId) !== NETWORK_INFO.chainId) {
        toast.error(`Please switch to ${NETWORK_INFO.name} (Chain ID: ${NETWORK_INFO.chainId})`);
        setIsDeploying(false);
        return;
      }

      const signer = await provider.getSigner();
      let deployedAddress: string = "";
      let txHash: string = "";

      toast.info("Please confirm the transaction in your wallet...");

      switch (selectedTokenType) {
        case "erc20":
          const erc20Address = getContractAddress("ERC20Factory");
          const erc20Contract = new ethers.Contract(erc20Address, ERC20FactoryABI, signer);
          const initialSupplyWei = ethers.parseUnits(formData.initialSupply, formData.decimals);

          const erc20Tx = await erc20Contract.createToken(
            formData.name,
            formData.symbol,
            initialSupplyWei,
            formData.decimals,
          );

          txHash = erc20Tx.hash;
          toast.info(`Transaction sent: ${txHash.slice(0, 10)}... Waiting for confirmation...`);
          
          const erc20Receipt = await erc20Tx.wait();
          console.log("✅ ERC20 Receipt:", erc20Receipt);
          
          if (erc20Receipt.status !== 1) {
            throw new Error("Transaction failed");
          }

          // Parse logs to find TokenCreated event
          for (const log of erc20Receipt.logs) {
            try {
              const parsed = erc20Contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data
              });
              
              if (parsed && parsed.name === "TokenCreated") {
                deployedAddress = parsed.args.tokenAddress || parsed.args[1];
                console.log("✅ Token deployed at:", deployedAddress);
                break;
              }
            } catch (e) {
              // Skip logs that can't be parsed
              continue;
            }
          }

          if (!deployedAddress) {
            console.warn("Could not find TokenCreated event, trying manual extraction...");
            const eventTopic = ethers.id("TokenCreated(address,address,string,string)");
            const matchingLog = erc20Receipt.logs.find((log: any) => 
              log.topics && log.topics[0] === eventTopic
            );
            if (matchingLog && matchingLog.topics && matchingLog.topics.length > 1) {
              deployedAddress = ethers.getAddress("0x" + matchingLog.topics[1].slice(-40));
              console.log("✅ Extracted address from topics:", deployedAddress);
            }
          }
          break;

        case "erc721":
          const erc721Address = getContractAddress("ERC721Factory");
          const erc721Contract = new ethers.Contract(erc721Address, ERC721FactoryABI, signer);
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

          txHash = erc721Tx.hash;
          toast.info(`Transaction sent: ${txHash.slice(0, 10)}... Waiting for confirmation...`);
          
          const erc721Receipt = await erc721Tx.wait();
          console.log("✅ ERC721 Receipt:", erc721Receipt);
          
          if (erc721Receipt.status !== 1) {
            throw new Error("Transaction failed");
          }

          for (const log of erc721Receipt.logs) {
            try {
              const parsed = erc721Contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data
              });
              
              if (parsed && parsed.name === "CollectionCreated") {
                deployedAddress = parsed.args.contractAddress || parsed.args[1];
                console.log("✅ Collection deployed at:", deployedAddress);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!deployedAddress) {
            const eventTopic = ethers.id("CollectionCreated(address,address,string,string)");
            const matchingLog = erc721Receipt.logs.find((log: any) => 
              log.topics && log.topics[0] === eventTopic
            );
            if (matchingLog && matchingLog.topics && matchingLog.topics.length > 1) {
              deployedAddress = ethers.getAddress("0x" + matchingLog.topics[1].slice(-40));
            }
          }
          break;

        case "erc1155":
          const erc1155Address = getContractAddress("ERC1155Factory");
          const erc1155Contract = new ethers.Contract(erc1155Address, ERC1155FactoryABI, signer);

          const erc1155Tx = await erc1155Contract.createMultiToken(
            formData.name,
            formData.uri,
            formData.mintable,
            formData.burnable,
            formData.pausable,
            formData.supplyTracked,
          );

          txHash = erc1155Tx.hash;
          toast.info(`Transaction sent: ${txHash.slice(0, 10)}... Waiting for confirmation...`);
          
          const erc1155Receipt = await erc1155Tx.wait();
          console.log("✅ ERC1155 Receipt:", erc1155Receipt);
          
          if (erc1155Receipt.status !== 1) {
            throw new Error("Transaction failed");
          }

          for (const log of erc1155Receipt.logs) {
            try {
              const parsed = erc1155Contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data
              });
              
              if (parsed && parsed.name === "MultiTokenCreated") {
                deployedAddress = parsed.args.contractAddress || parsed.args[1];
                console.log("✅ Multi-token deployed at:", deployedAddress);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!deployedAddress) {
            const eventTopic = ethers.id("MultiTokenCreated(address,address,string)");
            const matchingLog = erc1155Receipt.logs.find((log: any) => 
              log.topics && log.topics[0] === eventTopic
            );
            if (matchingLog && matchingLog.topics && matchingLog.topics.length > 1) {
              deployedAddress = ethers.getAddress("0x" + matchingLog.topics[1].slice(-40));
            }
          }
          break;

        default:
          throw new Error("Invalid token type");
      }

      // Show success even if we couldn't extract the address
      if (deployedAddress) {
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
            "Transaction Hash": txHash,
          },
        };

        setDeploymentResult(result);
        setShowSuccessModal(true);
        toast.success(`${selectedTokenType.toUpperCase()} token deployed successfully!`);
        
        setTimeout(() => {
          fetchMyTokens();
        }, 3000);
        
        resetForm();
      } else {
        toast.success(`Transaction confirmed! Hash: ${txHash}`);
        toast.info(`View on explorer: ${EXPLORER_URL}/tx/${txHash}`);
        
        setTimeout(() => {
          fetchMyTokens();
        }, 3000);
      }
    } catch (error: any) {
      console.error("❌ Deployment error:", error);
      let errorMessage = "Failed to deploy token";

      const errorMsg = error?.message || error?.toString() || "";
      
      if (errorMsg.includes("user rejected") || errorMsg.includes("User rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (errorMsg.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for deployment";
      } else if (errorMsg.includes("execution reverted")) {
        errorMessage = "Contract rejected the deployment";
      } else if (errorMsg) {
        errorMessage = `Deployment failed: ${errorMsg.slice(0, 100)}`;
      }

      toast.error(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  // Success Modal Component
  const SuccessModal = (): React.JSX.Element | null => {
    if (!showSuccessModal || !deploymentResult) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1c2941] rounded-xl p-8 max-w-2xl w-full border border-[#2a3b54] shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Token Deployed Successfully!</h2>
            <p className="text-gray-300">Your {deploymentResult.type} token has been created</p>
          </div>

          <div className="bg-[#0f1a2e] rounded-xl p-6 mb-6 border border-[#1e2a3a]">
            <h3 className="text-lg font-semibold mb-4 text-white">Token Details</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400 mb-1">Name</div>
                <div className="text-white font-medium">{deploymentResult.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Symbol</div>
                <div className="text-white font-medium">{deploymentResult.symbol}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Type</div>
                <div className="text-white font-medium">{deploymentResult.type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Contract Address</div>
                <div className="flex items-center gap-2">
                  <code className="text-blue-400 font-mono text-sm break-all">{deploymentResult.address}</code>
                  <button
                    onClick={() => copyToClipboard(deploymentResult.address)}
                    className="flex-shrink-0 p-1 hover:bg-[#1a2332] rounded transition-colors"
                  >
                    {copiedAddress === deploymentResult.address ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    ) : (
                      <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <ContractVerification
              contractAddress={deploymentResult.address}
              networkChainId={NETWORK_INFO.chainId.toString()}
              contractType="token"
              contractName={deploymentResult.name}
            />
          </div>

          {deploymentResult.type === "ERC20" && (
            <div className="mb-6 bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-400 mb-1">Add Liquidity</h4>
                  <p className="text-xs text-gray-300 mb-3">
                    To make your token tradable, consider adding liquidity on Uniswap.
                  </p>
                  
                  <a
                    href={getLiquidityUrl(deploymentResult.address, NETWORK_INFO.chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Add Liquidity on Uniswap
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <a
              href={`${EXPLORER_URL}/address/${deploymentResult.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center flex items-center justify-center gap-2"
            >
              View on Explorer
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
            <button
              onClick={deployAnother}
              className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              Deploy Another
            </button>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Token Details View Component
  const TokenDetailsView = ({ token }: { token: StoredToken }) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{token.name}</h2>
            <p className="text-gray-400">{token.symbol}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
            {token.type}
          </span>
        </div>

        <div className="bg-[#0f1a2e] rounded-xl p-6 border border-[#1e2a3a]">
          <h3 className="text-lg font-semibold mb-4 text-white">Token Information</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Contract Address</div>
              <div className="flex items-center gap-2">
                <code className="text-blue-400 font-mono text-sm break-all">{token.address}</code>
                <button
                  onClick={() => copyToClipboard(token.address)}
                  className="flex-shrink-0 p-1 hover:bg-[#1a2332] rounded transition-colors"
                >
                  {copiedAddress === token.address ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Created</div>
              <div className="text-white">{formatDate(token.createdAt)}</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <ContractVerification
            contractAddress={token.address}
            networkChainId={NETWORK_INFO.chainId.toString()}
            contractType="token"
            contractName={token.name}
          />
        </div>

        {token.type === "ERC20" && (
          <div className="mb-6 bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-400 mb-1">Add Liquidity</h4>
                <p className="text-xs text-gray-300 mb-3">
                  To make your token tradable, consider adding liquidity on Uniswap.
                </p>
                
                <a
                  href={getLiquidityUrl(token.address, NETWORK_INFO.chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Add Liquidity on Uniswap
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <a
            href={`${EXPLORER_URL}/address/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center flex items-center justify-center gap-2"
          >
            View on Explorer
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Token Factory</h1>
          <p className="text-xl text-gray-300">Deploy ERC20, ERC721, and ERC1155 tokens with custom configurations</p>
        </div>

        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">Please connect your wallet to Mantle Sepolia Testnet to create tokens.</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Sidebar - My Tokens List */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-[#1c2941] rounded-xl border border-[#2a3b54] overflow-hidden sticky top-4">
                <div className="p-4 border-b border-[#2a3b54] flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">My Tokens</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchMyTokens}
                      disabled={isLoadingTokens}
                      className="p-2 rounded-lg transition-colors bg-[#0f1a2e] text-gray-400 hover:bg-[#1a2332] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh tokens"
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${isLoadingTokens ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleCreateNew}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === "create"
                          ? "bg-blue-600 text-white"
                          : "bg-[#0f1a2e] text-gray-400 hover:bg-[#1a2332] hover:text-white"
                      }`}
                      title="Create new token"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {isLoadingTokens ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-400 text-sm">Loading tokens...</p>
                    </div>
                  ) : myTokens.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-400 text-sm">No tokens created yet</p>
                      <p className="text-gray-500 text-xs mt-2">Create your first token to see it here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#2a3b54]">
                      {myTokens.map(token => (
                        <button
                          key={token.id}
                          onClick={() => handleTokenClick(token)}
                          className={`w-full p-4 text-left hover:bg-[#0f1a2e] transition-colors ${
                            selectedToken?.id === token.id && viewMode === "view"
                              ? "bg-[#0f1a2e] border-l-4 border-blue-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate">{token.name}</div>
                              <div className="text-sm text-gray-400 truncate">{token.symbol}</div>
                              <div className="text-xs text-gray-500 mt-1">{formatDate(token.createdAt)}</div>
                            </div>
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                              {token.type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-[#1c2941] p-8 rounded-xl border border-[#2a3b54]">
                {viewMode === "create" || !selectedToken ? (
                  <>
                    <h2 className="text-2xl font-bold mb-6 text-white">Create New Token</h2>
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        deployToken();
                      }}
                      className="space-y-6"
                    >
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-3">Token Type</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["erc20", "erc721", "erc1155"] as TokenType[]).map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedTokenType(type)}
                              className={`p-3 rounded-lg border transition-all duration-200 ${
                                selectedTokenType === type
                                  ? "border-blue-500 bg-blue-500/20 text-blue-400"
                                  : "border-[#2a3b54] hover:border-blue-500 hover:bg-[#1a2332] text-gray-300"
                              }`}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Token Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={e => handleInputChange("name", e.target.value)}
                            placeholder="My Awesome Token"
                            className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
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
                            className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                      </div>

                      {selectedTokenType === "erc20" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Initial Supply *</label>
                            <input
                              type="text"
                              value={formData.initialSupply}
                              onChange={e => handleInputChange("initialSupply", e.target.value)}
                              placeholder="1000000"
                              className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Decimals *</label>
                            <select
                              value={formData.decimals}
                              onChange={e => handleInputChange("decimals", parseInt(e.target.value))}
                              className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                            onChange={e => handleInputChange(selectedTokenType === "erc721" ? "baseURI" : "uri", e.target.value)}
                            placeholder="https://api.example.com/metadata/"
                            className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
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
                            className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      )}

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Configuration Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.mintable}
                              onChange={e => handleInputChange("mintable", e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Mintable</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.burnable}
                              onChange={e => handleInputChange("burnable", e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Burnable</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.pausable}
                              onChange={e => handleInputChange("pausable", e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Pausable</span>
                          </label>
                        </div>

                        {selectedTokenType === "erc1155" && (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.supplyTracked}
                              onChange={e => handleInputChange("supplyTracked", e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-[#0f1a2e] border-[#2a3b54] rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Track Total Supply</span>
                          </label>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isDeploying}
                        className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
                          isDeploying
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
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
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white">Token Details</h2>
                      <button
                        onClick={handleCreateNew}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                        Create New
                      </button>
                    </div>
                    <TokenDetailsView token={selectedToken} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <SuccessModal />
      </div>
    </div>
  );
};

export default TokenFactoryPage;