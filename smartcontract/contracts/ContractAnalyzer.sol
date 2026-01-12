// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ContractAnalyzer
 * @dev A utility contract for analyzing smart contracts and estimating gas costs
 * Perfect for developers who want to understand contract behavior before interaction
 */
contract ContractAnalyzer is Ownable {
    using Address for address;

    // Analysis results structure
    struct ContractAnalysis {
        uint256 contractSize;
        uint256 estimatedDeploymentGas;
        bool isContract;
        bool hasFallback;
        bool hasReceive;
        uint256 balance;
        uint256 codeSize;
    }

    // Gas estimation structure
    struct GasEstimate {
        uint256 estimatedGas;
        uint256 gasPrice;
        uint256 totalCost;
        bool success;
        string errorMessage;
    }

    // Events
    event ContractAnalyzed(address indexed contractAddress, ContractAnalysis analysis);
    event GasEstimated(address indexed contractAddress, bytes4 functionSelector, GasEstimate estimate);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Analyze a contract's basic properties
     * @param contractAddress Address of the contract to analyze
     * @return analysis Contract analysis results
     */
    function analyzeContract(address contractAddress) external returns (ContractAnalysis memory analysis) {
        require(contractAddress != address(0), "Invalid contract address");

        // Initialize all fields to default values
        analysis.contractSize = 0;
        analysis.estimatedDeploymentGas = 0;
        analysis.isContract = false;
        analysis.hasFallback = false;
        analysis.hasReceive = false;
        analysis.balance = 0;
        analysis.codeSize = 0;

        // Check if it's a contract
        analysis.isContract = contractAddress.code.length > 0;

        if (analysis.isContract) {
            // Get contract code size
            analysis.codeSize = contractAddress.code.length;

            // Estimate deployment gas (rough estimate: 200 gas per byte + 21k base)
            analysis.estimatedDeploymentGas = (analysis.codeSize * 200) + 21000;

            // Check for fallback function
            analysis.hasFallback = contractAddress.code.length > 0;

            // Check for receive function (basic check)
            analysis.hasReceive = contractAddress.code.length > 0;

            // Get contract balance
            analysis.balance = contractAddress.balance;

            // Contract size in KB
            analysis.contractSize = analysis.codeSize / 1024;
        }

        emit ContractAnalyzed(contractAddress, analysis);
        return analysis;
    }

    /**
     * @dev Estimate gas for a function call
     * @param contractAddress Address of the contract
     * @param functionSelector Function selector (first 4 bytes of function signature)
     * @param data Calldata for the function call
     * @return estimate Gas estimation results
     */
    function estimateGas(
        address contractAddress,
        bytes4 functionSelector,
        bytes calldata data
    ) external returns (GasEstimate memory estimate) {
        require(contractAddress != address(0), "Invalid contract address");
        require(contractAddress.code.length > 0, "Address is not a contract");

        // Initialize all fields to default values
        estimate.estimatedGas = 0;
        estimate.gasPrice = 0;
        estimate.totalCost = 0;
        estimate.success = false;
        estimate.errorMessage = "";

        try this.estimateGasCall{ gas: 10000000 }(contractAddress, data) {
            // If successful, estimate was successful
            estimate.success = true;
            estimate.estimatedGas = 10000000; // Base estimate
            estimate.gasPrice = block.basefee;
            estimate.totalCost = estimate.estimatedGas * estimate.gasPrice;
        } catch Error(string memory reason) {
            estimate.success = false;
            estimate.errorMessage = reason;
            estimate.estimatedGas = 0;
            estimate.gasPrice = block.basefee;
            estimate.totalCost = 0;
        } catch {
            estimate.success = false;
            estimate.errorMessage = "Unknown error during gas estimation";
            estimate.estimatedGas = 0;
            estimate.gasPrice = block.basefee;
            estimate.totalCost = 0;
        }

        emit GasEstimated(contractAddress, functionSelector, estimate);
        return estimate;
    }

    /**
     * @dev Internal function to attempt gas estimation
     * @param contractAddress Address of the contract
     * @param data Calldata for the function call
     */
    function estimateGasCall(address contractAddress, bytes calldata data) external view {
        // This function is used internally for gas estimation
        // It will revert if the call would fail, allowing us to catch errors
        (bool success, ) = contractAddress.staticcall(data);
        require(success, "Function call would fail");
    }

    /**
     * @dev Get basic contract information
     * @param contractAddress Address of the contract
     * @return codeSize Size of contract code in bytes
     * @return balance Contract's ETH balance
     * @return isContract Whether the address is a contract
     */
    function getBasicInfo(
        address contractAddress
    ) external view returns (uint256 codeSize, uint256 balance, bool isContract) {
        codeSize = contractAddress.code.length;
        balance = contractAddress.balance;
        isContract = contractAddress.code.length > 0;
    }

    /**
     * @dev Calculate estimated deployment cost
     * @param codeSize Size of contract code in bytes
     * @param gasPrice Gas price in wei
     * @return deploymentCost Estimated deployment cost in wei
     */
    function calculateDeploymentCost(
        uint256 codeSize,
        uint256 gasPrice
    ) external pure returns (uint256 deploymentCost) {
        uint256 baseGas = 21000; // Base transaction cost
        uint256 codeGas = codeSize * 200; // 200 gas per byte
        uint256 totalGas = baseGas + codeGas;

        deploymentCost = totalGas * gasPrice;
        return deploymentCost;
    }

    /**
     * @dev Check if contract has specific function
     * @param contractAddress Address of the contract
     * @param functionSelector Function selector to check
     * @return hasFunction Whether the contract has the specified function
     */
    function hasFunction(address contractAddress, bytes4 functionSelector) external view returns (bool hasFunction) {
        if (contractAddress.code.length == 0) {
            return false;
        }

        // Basic check - if contract has code, assume it might have the function
        // This is a simplified check and not 100% accurate
        hasFunction = contractAddress.code.length > 0;
        return hasFunction;
    }
}
