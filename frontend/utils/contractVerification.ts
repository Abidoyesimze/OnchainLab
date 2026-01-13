// Contract Verification Service for DefiForge
// Handles verification of user-deployed contracts on ETN and Somnia testnets

export interface VerificationResult {
  success: boolean;
  message: string;
  explorerUrl?: string;
  verificationUrl?: string;
  error?: string;
}

export interface ContractInfo {
  address: string;
  network: 'etn' | 'somnia';
  contractType: 'token' | 'template';
  constructorArgs?: any[];
  sourceCode?: string;
}

// Network configuration for verification
const NETWORK_CONFIG = {
  etn: {
    chainId: '5201420',
    name: 'ETN Testnet',
    explorer: 'https://testnet-blockexplorer.electroneum.com',
    verificationApi: 'https://testnet-blockexplorer.electroneum.com/api',
    rpcUrl: 'https://testnet-rpc.electroneum.com'
  },
  somnia: {
    chainId: '50312', 
    name: 'Somnia Testnet',
    explorer: 'https://shannon-explorer.somnia.network',
    verificationApi: 'https://shannon-explorer.somnia.network/api',
    rpcUrl: 'https://shannon-explorer.somnia.network'
  }
};

// Get network info from chain ID
export const getNetworkFromChainId = (chainId: string): 'etn' | 'somnia' | null => {
  switch (chainId) {
    case '5201420':
      return 'etn';
    case '50312':
      return 'somnia';
    default:
      return null;
  }
};

// Check if contract is already verified
export const checkVerificationStatus = async (contractInfo: ContractInfo): Promise<VerificationResult> => {
  try {
    const network = NETWORK_CONFIG[contractInfo.network];
    
    // Check verification status via API
    const response = await fetch(`${network.verificationApi}/contracts/${contractInfo.address}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.verified) {
        return {
          success: true,
          message: 'Contract is already verified',
          explorerUrl: `${network.explorer}/address/${contractInfo.address}`,
          verificationUrl: `${network.explorer}/address/${contractInfo.address}#code`
        };
      }
    }
    
    return {
      success: false,
      message: 'Contract is not verified',
      explorerUrl: `${network.explorer}/address/${contractInfo.address}`,
      verificationUrl: `${network.explorer}/address/${contractInfo.address}#verifyContract`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Unable to check verification status',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Generate verification guide for different contract types
export const generateVerificationGuide = (contractInfo: ContractInfo): string => {
  const network = NETWORK_CONFIG[contractInfo.network];
  
  let guide = `# Contract Verification Guide\n\n`;
  guide += `**Contract Address:** \`${contractInfo.address}\`\n`;
  guide += `**Network:** ${network.name} (Chain ID: ${network.chainId})\n`;
  guide += `**Contract Type:** ${contractInfo.contractType}\n\n`;
  
  guide += `## Method 1: Automatic Verification (Recommended)\n\n`;
  guide += `1. **Visit the Explorer:** [${network.explorer}/address/${contractInfo.address}](${network.explorer}/address/${contractInfo.address})\n`;
  guide += `2. **Click "Verify & Publish"** in the contract tab\n`;
  guide += `3. **Select "Via Standard JSON Input"**\n`;
  guide += `4. **Upload the contract source code** (see below for source code)\n`;
  guide += `5. **Enter compiler settings:**\n`;
  guide += `   - Compiler Version: \`v0.8.19+commit.7dd6d404\`\n`;
  guide += `   - Optimization: \`Enabled\` (200 runs)\n`;
  guide += `   - EVM Version: \`default\`\n`;
  guide += `6. **Click "Verify & Publish"**\n\n`;
  
  if (contractInfo.contractType === 'token') {
    guide += `## Token Contract Source Code\n\n`;
    guide += `\`\`\`solidity\n`;
    guide += getTokenContractSourceCode(contractInfo);
    guide += `\n\`\`\`\n\n`;
  } else if (contractInfo.contractType === 'template') {
    guide += `## Template Contract Source Code\n\n`;
    guide += `\`\`\`solidity\n`;
    guide += getTemplateContractSourceCode(contractInfo);
    guide += `\n\`\`\`\n\n`;
  }
  
  guide += `## Method 2: Manual Verification\n\n`;
  guide += `If automatic verification fails:\n\n`;
  guide += `1. **Flatten the contract** using a tool like [Hardhat Flattener](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-etherscan)\n`;
  guide += `2. **Copy the flattened source code**\n`;
  guide += `3. **Use "Via flattened source code"** option in the explorer\n`;
  guide += `4. **Paste the flattened code** and verify\n\n`;
  
  guide += `## Verification Benefits\n\n`;
  guide += `✅ **Transparency:** Source code is publicly visible\n`;
  guide += `✅ **Trust:** Users can verify contract functionality\n`;
  guide += `✅ **Integration:** Easier integration with other tools\n`;
  guide += `✅ **Security:** Community can audit the code\n\n`;
  
  guide += `## Troubleshooting\n\n`;
  guide += `- **"Already Verified":** Contract is already verified\n`;
  guide += `- **"Compilation Error":** Check compiler version and settings\n`;
  guide += `- **"Constructor Arguments":** Ensure constructor args match deployment\n`;
  guide += `- **"Bytecode Mismatch":** Verify source code matches deployed bytecode\n\n`;
  
  return guide;
};

// Get token contract source code based on type
const getTokenContractSourceCode = (contractInfo: ContractInfo): string => {
  // This would contain the actual source code for the deployed token contracts
  // For now, return a placeholder that explains the structure
  return `// Token Contract Source Code
// This is a simplified version - the actual deployed contract
// includes additional features like minting, burning, pausing, etc.

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract DefiForgeToken is ERC20, Ownable, Pausable {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    // Additional functions for minting, burning, pausing, etc.
    // would be included in the actual deployed contract
}`;
};

// Get template contract source code
const getTemplateContractSourceCode = (contractInfo: ContractInfo): string => {
  return `// Template Contract Source Code
// This is a simplified version - the actual deployed contract
// includes the full implementation based on the template type

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DefiForgeTemplate is Ownable, ReentrancyGuard {
    // Template-specific implementation
    // The actual source code depends on the template type:
    // - Staking Contract
    // - Vesting Contract  
    // - Multi-Sig Wallet
    
    constructor() {
        // Constructor implementation
    }
    
    // Template-specific functions
    // would be included in the actual deployed contract
}`;
};

// Generate verification checklist
export const getVerificationChecklist = (contractInfo: ContractInfo): string[] => {
  return [
    'Contract deployed successfully',
    'Transaction confirmed on blockchain',
    'Contract address copied',
    'Source code prepared',
    'Compiler version identified',
    'Constructor arguments noted',
    'Explorer verification page opened',
    'Source code uploaded',
    'Compiler settings configured',
    'Verification submitted',
    'Verification status checked'
  ];
};

// Get verification status with detailed information
export const getDetailedVerificationInfo = async (contractInfo: ContractInfo) => {
  const status = await checkVerificationStatus(contractInfo);
  const guide = generateVerificationGuide(contractInfo);
  const checklist = getVerificationChecklist(contractInfo);
  
  return {
    status,
    guide,
    checklist,
    network: NETWORK_CONFIG[contractInfo.network],
    contractInfo
  };
};
