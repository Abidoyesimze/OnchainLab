"use client";

import React, { useEffect, useState } from "react";
import { ContractTemplatesContract, getContractAddress } from "../../ABI";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import ContractVerification from "../../components/ContractVerification";

// Define types for better type safety
interface DeploymentParams {
  [key: string]: any;
}

interface Template {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: string;
  category: string;
  contractFunction: string;
  requiredParams: string[];
  gasEstimate: string;
  complexity: string;
}

const ContractTemplatesPage = () => {
  const { address, isConnected } = useAccount();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [deploymentParams, setDeploymentParams] = useState<DeploymentParams>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<Array<{address: string, name: string, type: string}>>([]);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);
  const [deploymentTimeout, setDeploymentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isWaitingForTx, setIsWaitingForTx] = useState(false);
  const [deployData, setDeployData] = useState<string | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  // Get network info when wallet connects
  useEffect(() => {
    const getNetworkInfo = async () => {
      if (isConnected && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setNetworkInfo({
            chainId: network.chainId.toString(),
            name: network.name || "Unknown",
          });
        } catch (error) {
          console.error("Error getting network info:", error);
        }
      }
    };

    getNetworkInfo();
  }, [isConnected]);

  // Enhanced templates with more details
  const templates: Template[] = [
    {
      id: "staking",
      name: "Staking Contract",
      description: "Deploy a basic staking contract for rewards distribution",
      features: [
        "Configurable staking and reward tokens",
        "Flexible reward rate system",
        "Secure withdrawal mechanisms",
        "Owner-controlled parameters",
      ],
      icon: "🏦",
      category: "DeFi",
      contractFunction: "deployStakingContract",
      requiredParams: ["stakingToken", "rewardToken", "rewardRate"],
      gasEstimate: "~800,000",
      complexity: "Intermediate",
    },
    {
      id: "vesting",
      name: "Vesting Contract",
      description: "Create token vesting schedules with time-based releases",
      features: [
        "Linear vesting over time",
        "Configurable vesting period",
        "Emergency pause functionality",
        "Owner controls",
      ],
      icon: "⏰",
      category: "Token Management",
      contractFunction: "deployVestingContract",
      requiredParams: ["token", "beneficiary", "totalAmount", "startTime", "duration"],
      gasEstimate: "~600,000",
      complexity: "Intermediate",
    },
    {
      id: "multisig",
      name: "Multi-Signature Wallet",
      description: "Secure multi-signature wallet for team funds and governance",
      features: ["Configurable signer count", "Threshold-based approvals", "Add/remove signers", "Emergency pause"],
      icon: "🔐",
      category: "Security",
      contractFunction: "deployMultiSigWallet",
      requiredParams: ["owner1", "owner2", "requiredSignatures"],
      gasEstimate: "~500,000",
      complexity: "Advanced",
    },
  ];

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    if (!isConnected) {
      toast.error("Please connect your wallet to deploy templates");
      return;
    }

    setSelectedTemplate(templateId);
    setDeploymentParams({});
    setShowDeploymentModal(true);
    toast.info(`Preparing to deploy ${templates.find(t => t.id === templateId)?.name}...`);
  };

  // Handle deployment
  const handleDeploy = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    // Check if we're on a supported network
    if (!networkInfo) {
      toast.error("Unable to detect network. Please check your wallet connection.");
      return;
    }

    const supportedNetworks = ["5201420", "50312"]; // ETN and Somnia
    if (!supportedNetworks.includes(networkInfo.chainId)) {
      toast.error(`Unsupported network. Please switch to ETN (5201420) or Somnia (50312) testnet. Current: ${networkInfo.chainId}`);
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    try {
      setIsDeploying(true);

      // Set a timeout to prevent infinite loading (5 minutes)
      const timeout = setTimeout(() => {
        console.error("Deployment timeout - transaction taking too long");
        toast.error("Deployment is taking too long. Please try again or check your transaction on the block explorer.");
        setIsDeploying(false);
        setIsWaitingForTx(false);
      }, 5 * 60 * 1000); // 5 minutes
      
      setDeploymentTimeout(timeout);

      // Prepare deployment arguments based on template
      let args: any[] = [];

      switch (template.id) {
        case "staking":
          args = [
            deploymentParams.stakingToken || "0x0000000000000000000000000000000000000000",
            deploymentParams.rewardToken || "0x0000000000000000000000000000000000000000",
            BigInt(deploymentParams.rewardRate || "1000000000000000000"), // 1 token per second
          ];
          break;
        case "vesting":
          args = [
            deploymentParams.token || "0x0000000000000000000000000000000000000000",
            deploymentParams.beneficiary || address,
            BigInt(deploymentParams.totalAmount || "1000000000000000000000"), // 1000 tokens
            BigInt(deploymentParams.startTime || Math.floor(Date.now() / 1000)), // Now
            BigInt(deploymentParams.duration || "31536000"), // 1 year
          ];
          break;
        case "multisig":
          // Build signers array from individual inputs
          const signers = [];
          if (deploymentParams.owner1) signers.push(deploymentParams.owner1.trim());
          if (deploymentParams.owner2) signers.push(deploymentParams.owner2.trim());
          
          // Remove duplicates and empty addresses
          const uniqueSigners = [...new Set(signers.filter(addr => addr && addr !== ""))];
          const requiredSignatures = parseInt(deploymentParams.requiredSignatures || "1");
          
          // Validate that we have at least 2 owners for a meaningful multi-sig
          if (uniqueSigners.length < 2) {
            toast.error("Multi-signature wallet requires at least 2 owners. Please provide both owner addresses.");
            setIsDeploying(false);
            setIsWaitingForTx(false);
            return;
          }
          
          // Validate that required signatures doesn't exceed number of owners
          if (requiredSignatures > uniqueSigners.length) {
            toast.error(`Required signatures (${requiredSignatures}) cannot exceed number of owners (${uniqueSigners.length})`);
            setIsDeploying(false);
            setIsWaitingForTx(false);
            return;
          }
          
          // Validate that required signatures is at least 1
          if (requiredSignatures < 1) {
            toast.error("Required signatures must be at least 1");
            setIsDeploying(false);
            setIsWaitingForTx(false);
            return;
          }
          
          // Validate that required signatures doesn't exceed total owners
          if (requiredSignatures > uniqueSigners.length) {
            toast.error(`Required signatures (${requiredSignatures}) cannot exceed number of owners (${uniqueSigners.length})`);
            setIsDeploying(false);
            setIsWaitingForTx(false);
            return;
          }
          
          args = [uniqueSigners, BigInt(requiredSignatures)];
          break;
      }

      // Validate required parameters
      const missingParams = template.requiredParams.filter(
        param => !deploymentParams[param] || deploymentParams[param] === "",
      );

      if (missingParams.length > 0) {
        toast.error(`Missing required parameters: ${missingParams.join(", ")}`);
        setIsDeploying(false);
        return;
      }

      // Get the correct contract address for the current network
      const networkType = networkInfo.chainId === "5201420" ? "etn" : "somnia";
      const contractAddress = getContractAddress("ContractTemplates", networkType);
      
      console.log("🚀 Deploying contract template...");
      console.log("Network Info:", networkInfo);
      console.log("Network Type:", networkType);
      console.log("Contract Address:", contractAddress);
      console.log("Template:", template);
      console.log("Arguments:", args);
      
      // Use ethers directly for deployment
      if (!window.ethereum) {
        throw new Error("MetaMask or wallet provider not found");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Verify the contract exists at the address
      const code = await provider.getCode(contractAddress);
      if (code === "0x") {
        throw new Error(`No contract found at address ${contractAddress} on this network`);
      }
      
      console.log("Contract code found at address:", contractAddress);
      console.log("Contract code length:", code.length);
      
      const contract = new ethers.Contract(
        contractAddress,
        ContractTemplatesContract.abi,
        signer
      );

      toast.info("Sending deployment transaction...");
      
      // Call the contract function directly with ethers
      const tx = await contract[template.contractFunction](...args);
      console.log("Transaction sent:", tx.hash);
      
      setDeployData(tx.hash);
      setIsWaitingForTx(true);
      toast.info("Transaction sent! Waiting for confirmation...");

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Extract deployed contract address from events
      let deployedAddress = "";
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name.includes("Deployed")) {
              deployedAddress = parsed.args.contractAddress || parsed.args[0];
              break;
            }
          } catch (e) {
            // Continue checking other logs
          }
        }
      }

      if (deployedAddress) {
        console.log("Contract deployed at:", deployedAddress);
        setIsDeployed(true);
        toast.success("Contract deployed successfully!");
      } else {
        console.warn("Could not extract deployed contract address from transaction receipt");
        setIsDeployed(true); // Still mark as deployed since transaction succeeded
        toast.success("Transaction confirmed!");
      }
    } catch (error: any) {
      console.error("Error deploying template:", error);
      
      // Parse error message for better user feedback
      let errorMessage = "Failed to deploy template";
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (errorMsg.includes("gas")) {
        errorMessage = "Gas estimation failed or insufficient gas";
      } else if (errorMsg.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (errorMsg.includes("execution reverted")) {
        errorMessage = "Contract execution failed - check parameters";
      } else if (errorMsg.includes("nonce")) {
        errorMessage = "Transaction nonce error - try again";
      } else if (errorMsg) {
        errorMessage = `Deployment failed: ${errorMsg}`;
      }
      
      toast.error(errorMessage);
      setDeploymentError(errorMessage);
      setIsDeploying(false);
      setIsWaitingForTx(false);
      
      // Clear timeout if it exists
      if (deploymentTimeout) {
        clearTimeout(deploymentTimeout);
        setDeploymentTimeout(null);
      }
    }
  };

  // Handle successful deployment
  useEffect(() => {
    if (isDeployed && deployData && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDeployedContracts(prev => [...prev, {
          address: deployData, // Using transaction hash for now
          name: template.name,
          type: template.category
        }]);
      }
      setIsDeploying(false);
      setIsWaitingForTx(false);
      setShowDeploymentModal(false);
      setSelectedTemplate(null);
      setDeploymentParams({});
      setDeployData(null);
      setIsDeployed(false);
      
      // Clear timeout if it exists
      if (deploymentTimeout) {
        clearTimeout(deploymentTimeout);
        setDeploymentTimeout(null);
      }
    }
  }, [isDeployed, deployData, selectedTemplate, deploymentTimeout]);

  // Clear deployment error when starting new deployment
  useEffect(() => {
    if (isDeploying) {
      setDeploymentError(null);
    }
  }, [isDeploying]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (deploymentTimeout) {
        clearTimeout(deploymentTimeout);
      }
    };
  }, [deploymentTimeout]);

  // Helper function to get consistent input styling
  const getInputClassName = () => {
    return "w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:z-10 relative";
  };

  // Helper function to get input props
  const getInputProps = (onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void) => {
    return {
      className: getInputClassName(),
      style: { minHeight: '48px' },
      onFocus: onFocus
    };
  };

  // Handle input focus to prevent modal jumping
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Prevent the modal from jumping by ensuring the input stays in view
    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Get parameter input fields based on template
  const getParameterInputs = (templateId: string) => {
    switch (templateId) {
      case "staking":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Staking Token Address *</label>
              <input
                type="text"
                value={deploymentParams.stakingToken || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, stakingToken: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">Address of the token users will stake</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reward Token Address *</label>
              <input
                type="text"
                value={deploymentParams.rewardToken || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, rewardToken: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">Address of the token users will earn as rewards</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reward Rate (tokens per second) *</label>
              <input
                type="text"
                value={deploymentParams.rewardRate || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, rewardRate: e.target.value })}
                placeholder="1000000000000000000"
                className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">Amount of reward tokens distributed per second (in wei)</p>
            </div>
          </div>
        );
      case "vesting":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Token Address *</label>
              <input
                type="text"
                value={deploymentParams.token || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, token: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">Address of the token being vested</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Beneficiary Address *</label>
              <input
                type="text"
                value={deploymentParams.beneficiary || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, beneficiary: e.target.value })}
                placeholder={address || "0x..."}
                className="w-full px-4 py-3 bg-[#0f1a2e] border border-[#2a3b54] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">Address that will receive the vested tokens</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Total Amount (in wei) *</label>
              <input
                type="text"
                value={deploymentParams.totalAmount || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, totalAmount: e.target.value })}
                onFocus={handleInputFocus}
                placeholder="1000000000000000000000"
                className={getInputClassName()}
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">Total amount of tokens to vest</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Time (Unix timestamp) *</label>
              <input
                type="number"
                value={deploymentParams.startTime || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, startTime: e.target.value })}
                onFocus={handleInputFocus}
                placeholder={Math.floor(Date.now() / 1000).toString()}
                className={getInputClassName()}
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">
                When vesting starts (current time: {Math.floor(Date.now() / 1000)})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duration (in seconds) *</label>
              <input
                type="number"
                value={deploymentParams.duration || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, duration: e.target.value })}
                onFocus={handleInputFocus}
                placeholder="31536000"
                className={getInputClassName()}
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">How long vesting takes (1 year = 31,536,000 seconds)</p>
            </div>
          </div>
        );
      case "multisig":
        // Calculate owner count and validation
        const owners = [];
        if (deploymentParams.owner1) owners.push(deploymentParams.owner1.trim());
        if (deploymentParams.owner2) owners.push(deploymentParams.owner2.trim());
        const uniqueOwners = [...new Set(owners.filter(addr => addr && addr !== ""))];
        const ownerCount = uniqueOwners.length;
        const requiredSigs = parseInt(deploymentParams.requiredSignatures || "0");
        const isValidConfig = ownerCount >= 2 && requiredSigs > 0 && requiredSigs <= ownerCount;
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Owner Address *
              </label>
              <input
                type="text"
                value={deploymentParams.owner1 || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, owner1: e.target.value })}
                onFocus={handleInputFocus}
                placeholder={address || "0x..."}
                className={getInputClassName()}
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Address of the first owner (usually your address)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Second Owner Address *
              </label>
              <input
                type="text"
                value={deploymentParams.owner2 || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, owner2: e.target.value })}
                onFocus={handleInputFocus}
                placeholder="0x..."
                className={getInputClassName()}
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Address of the second owner (team member, partner, etc.)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Required Signatures *</label>
              <input
                type="number"
                value={deploymentParams.requiredSignatures || ""}
                onChange={e => setDeploymentParams({ ...deploymentParams, requiredSignatures: e.target.value })}
                onFocus={handleInputFocus}
                placeholder="1"
                min="1"
                max={ownerCount}
                className={getInputClassName()}
                style={{ minHeight: '48px' }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Number of signatures required to execute transactions • Must be between 1 and {ownerCount} (e.g., 1-of-2, 2-of-2, 2-of-3)
              </p>
            </div>
            
            {/* Validation Status */}
            {deploymentParams.owner1 && deploymentParams.owner2 && deploymentParams.requiredSignatures && (
              <div className={`p-3 rounded-lg border ${
                isValidConfig 
                  ? 'bg-green-900/20 border-green-500/30 text-green-300' 
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              }`}>
                <div className="text-sm font-medium">
                  {isValidConfig ? '✅ Valid Configuration' : '❌ Invalid Configuration'}
                </div>
                <div className="text-xs mt-1">
                  {!isValidConfig && ownerCount < 2 && 
                    'Multi-signature wallet requires at least 2 owners'
                  }
                  {!isValidConfig && requiredSigs > ownerCount && 
                    `Required signatures (${requiredSigs}) cannot exceed number of owners (${ownerCount})`
                  }
                  {!isValidConfig && requiredSigs < 1 && 
                    'Required signatures must be at least 1'
                  }
                  {isValidConfig && 
                    `Multi-sig wallet will require ${requiredSigs} out of ${ownerCount} signatures to execute transactions`
                  }
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Deployment Modal Component
  const DeploymentModal = () => {
    if (!showDeploymentModal || !selectedTemplate) return null;

    const template = templates.find(t => t.id === selectedTemplate);

    // Modal is now properly structured to prevent jumping

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className="bg-[#1c2941] rounded-xl p-8 max-w-4xl w-full max-h-[90vh] border border-[#2a3b54] shadow-2xl flex flex-col"
          style={{ 
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header - Fixed */}
          <div className="text-center mb-6 flex-shrink-0">
            <div className="text-6xl mb-4">{template?.icon}</div>
            <h2 className="text-3xl font-bold text-emerald-400 mb-2">Deploy {template?.name}</h2>
            <p className="text-xl text-gray-300">Configure parameters and deploy your smart contract</p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" style={{ scrollBehavior: 'smooth' }}>
          {/* Template Info */}
            <div className="p-4 bg-[#0f1a2e] rounded-xl border border-[#1e2a3a]">
            <h3 className="text-lg font-semibold mb-3 text-emerald-400">Template Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Category:</span>
                <span className="text-white ml-2">{template?.category}</span>
              </div>
              <div>
                <span className="text-gray-400">Complexity:</span>
                <span className="text-white ml-2">{template?.complexity}</span>
              </div>
              <div>
                <span className="text-gray-400">Gas Estimate:</span>
                <span className="text-white ml-2">{template?.gasEstimate}</span>
              </div>
            </div>
          </div>

            {/* Network Information */}
            {networkInfo && (
              <div className="p-4 bg-[#0f1a2e] rounded-xl border border-[#1e2a3a]">
                <h3 className="text-lg font-semibold text-emerald-400 mb-3">Network Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">{networkInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chain ID:</span>
                    <span className="text-white">{networkInfo.chainId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract Address:</span>
                    <span className="text-emerald-400 font-mono text-xs">
                      {getContractAddress("ContractTemplates").slice(0, 10)}...{getContractAddress("ContractTemplates").slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">✓ Ready to Deploy</span>
                  </div>
                </div>
              </div>
            )}

          {/* Parameter Inputs */}
            <div>
            <h3 className="text-lg font-semibold mb-4 text-emerald-400">Deployment Parameters</h3>
              <div className="space-y-4">
            {getParameterInputs(selectedTemplate)}
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed */}
          <div className="flex-shrink-0 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleDeploy}
                disabled={isDeploying || isWaitingForTx}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  isDeploying || isWaitingForTx
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-slate-600 hover:from-emerald-700 hover:to-slate-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              }`}
            >
                {isDeploying || isWaitingForTx ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isDeploying ? "Deploying..." : "Waiting for confirmation..."}
                </div>
              ) : (
                "Deploy Contract"
              )}
            </button>
            <button
              onClick={() => setShowDeploymentModal(false)}
              className="w-full py-4 px-6 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              Cancel
            </button>
            </div>
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
            Contract Templates
          </h1>
          <p className="text-xl text-gray-300">
            Deploy pre-built, audited smart contract templates for common DeFi use cases
          </p>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center p-8 bg-[#1c2941] rounded-xl border border-[#2a3b54]">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300">
              Please connect your wallet to any EVM-compatible network to deploy contract templates.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported testnets: ETN (Chain ID: 5201420) and Somnia (Chain ID: 50312)
            </p>
          </div>
        ) : (
          <>
            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-[#1c2941] p-6 rounded-xl border border-[#2a3b54] shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group"
                >
                  {/* Template Icon */}
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {template.icon}
                  </div>

                  {/* Template Info */}
                  <h3 className="text-xl font-bold mb-2 text-white group-hover:text-emerald-400 transition-colors duration-300">
                    {template.name}
                  </h3>
                  <p className="text-gray-300 mb-4 text-sm">{template.description}</p>

                  {/* Template Metadata */}
                  <div className="flex items-center justify-between mb-4 text-xs">
                    <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded-full">
                      {template.category}
                    </span>
                    <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full">{template.complexity}</span>
                  </div>

                  {/* Features */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Features:</h4>
                    <ul className="space-y-1">
                      {template.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-300 flex items-center">
                          <span className="text-emerald-400 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gas Estimate */}
                  <div className="mb-4 p-2 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
                    <div className="text-xs text-gray-400">Estimated Gas:</div>
                    <div className="text-sm text-emerald-400 font-semibold">{template.gasEstimate}</div>
                  </div>

                  {/* Deploy Button */}
                  <button
                    onClick={() => handleSelectTemplate(template.id)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-slate-600 hover:from-emerald-700 hover:to-slate-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
                  >
                    Deploy Template
                  </button>
                </div>
              ))}
            </div>

            {/* Contract Information */}
            <div className="bg-[#1c2941] p-6 rounded-xl border border-[#2a3b54] shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-emerald-400">Contract Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Contract Address</h3>
                  <div className="flex items-center gap-2">
                    <code className="text-emerald-400 text-sm bg-[#0f1a2e] p-3 rounded-lg flex-1 break-all border border-[#1e2a3a]">
                      {ContractTemplatesContract.address}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(ContractTemplatesContract.address)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-all duration-200"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Network</h3>
                  <div className="text-emerald-400 font-semibold">EVM-Compatible Network</div>
                  <div className="text-gray-400 text-sm">Chain ID: {networkInfo?.chainId || "..."}</div>
                  <div className="text-xs text-gray-500 mt-1">Supported: ETN (5201420), Somnia (50312)</div>
                </div>
              </div>
            </div>

            {/* Recently Deployed Contracts */}
            {deployedContracts.length > 0 && (
              <div className="mt-8 bg-[#1c2941] p-6 rounded-xl border border-[#2a3b54] shadow-xl">
                <h2 className="text-2xl font-bold mb-4 text-emerald-400">Recently Deployed Contracts</h2>
                <div className="space-y-4">
                  {deployedContracts.map((contract, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
                        <div>
                          <div className="text-white font-medium">{contract.name}</div>
                          <div className="text-sm text-gray-400">{contract.type}</div>
                        </div>
                        <code className="text-emerald-400 text-sm font-mono">
                          {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                        </code>
                      </div>
                      <ContractVerification
                        contractAddress={contract.address}
                        networkChainId={networkInfo?.chainId || ""}
                        contractType="template"
                        contractName={contract.name}
                        className="ml-4"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Deployment Modal */}
      <DeploymentModal />
    </div>
  );
};

export default ContractTemplatesPage;
