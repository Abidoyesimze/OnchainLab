# DefiForge Contract ABIs

This folder contains all the contract ABIs (Application Binary Interfaces) for the DefiForge project deployed on Somnia Testnet.

## 📋 **Available Contracts**

| Contract                 | Address                                      | Description                       |
| ------------------------ | -------------------------------------------- | --------------------------------- |
| **ERC20Factory**         | `0x4F6D41C9F94FdD64c8D82C4eb71a459075E5Ae57` | Factory for creating ERC20 tokens |
| **DeFiUtils**            | `0x8860C6081E3Dd957d225FEf12d718495EBa75255` | DeFi calculation utilities        |
| **ContractAnalyzer**     | `0xB0170720d8BB751Ed8F7cC071b8D0d9b4e5f501F` | Smart contract analysis tools     |
| **ContractTemplates**    | `0x157f375f0112837CA14c8dAFB9dFe26f83a94634` | Reusable contract templates       |
| **MerkleProofValidator** | `0x6FA75F5dc94A1Cec18a8a113851231c66e2Bb90f` | Merkle proof validation           |
| **MerkleProof**          | `0x0f1d9F35bc1631D8C3eB6A2B35A2972bF5061E53` | Merkle tree management            |

## 🚀 **Usage**

### Import ABIs

```typescript
// Import specific ABI
import { ERC20FactoryABI } from '../ABI';

// Import all ABIs
import * as ABIs from '../ABI';

// Import as default object
import ABIs from '../ABI';
```

### Use with Contract Helpers

```typescript
import { getContractAddress, getContractABI, CONTRACT_ADDRESSES } from '../utils/contractHelpers';

// Get contract address
const factoryAddress = getContractAddress('ERC20Factory');

// Get contract ABI
const factoryABI = getContractABI('ERC20Factory');

// Direct access to addresses
const factoryAddress = CONTRACT_ADDRESSES.ERC20Factory;
```

### Use with Wagmi Hooks

```typescript
import { ERC20FactoryABI } from "../ABI";
import { CONTRACT_ADDRESSES } from "../utils/contractHelpers";
import { useContractRead, useContractWrite } from "wagmi";

// Read from contract
const { data: tokenCount } = useContractRead({
  address: CONTRACT_ADDRESSES.ERC20Factory,
  abi: ERC20FactoryABI,
  functionName: "getTokenCount",
});

// Write to contract
const { write: createToken } = useContractWrite({
  address: CONTRACT_ADDRESSES.ERC20Factory,
  abi: ERC20FactoryABI,
  functionName: "createToken",
});
```

## 🌐 **Network Information**

- **Network**: Somnia Testnet
- **Chain ID**: 50312
- **RPC URL**: `https://dream-rpc.somnia.network/`
- **Block Explorer**: `https://shannon-explorer.somnia.network/`
- **Native Token**: STT (Somnia Test Token)

## 📁 **File Structure**

```
ABI/
├── index.ts                 # Main export file
├── ERC20Factory.json       # ERC20 Factory ABI
├── DeFiUtils.json          # DeFi Utilities ABI
├── ContractAnalyzer.json   # Contract Analyzer ABI
├── ContractTemplates.json  # Contract Templates ABI
├── MerkleProofValidator.json # Merkle Proof Validator ABI
├── MerkleProof.json        # Merkle Proof ABI
└── README.md               # This file
```

## 🔧 **Adding New Contracts**

When adding new contracts:

1. Copy the contract ABI JSON file to this folder
2. Update `index.ts` to export the new ABI
3. Update `deployedContracts.ts` with the new contract address
4. Update `contractHelpers.ts` with the new contract address
5. Update this README with the new contract information

## 📚 **Related Files**

- `../contracts/deployedContracts.ts` - Contract addresses and ABIs
- `../utils/contractHelpers.ts` - Helper functions for contracts
- `../hardhat/artifacts/contracts/` - Source of compiled contract ABIs
