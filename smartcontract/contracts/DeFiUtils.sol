// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeFiUtils
 * @dev A utility contract providing common DeFi calculations and helper functions
 * Perfect for developers building DeFi applications
 */
contract DeFiUtils is Ownable {
    using Math for uint256;

    // Constants for common calculations
    uint256 public constant PRECISION = 1e18;
    uint256 public constant YEAR_IN_SECONDS = 365 days;

    // Events
    event LiquidityCalculated(uint256 tokenAAmount, uint256 tokenBAmount, uint256 liquidityTokens, uint256 fee);

    event YieldCalculated(uint256 principal, uint256 rate, uint256 time, uint256 yield);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Calculate liquidity tokens based on token amounts (Uniswap V2 style)
     * @param tokenAAmount Amount of token A
     * @param tokenBAmount Amount of token B
     * @return liquidityTokens Amount of liquidity tokens to mint
     */
    function calculateLiquidityTokens(
        uint256 tokenAAmount,
        uint256 tokenBAmount
    ) external pure returns (uint256 liquidityTokens) {
        require(tokenAAmount > 0 && tokenBAmount > 0, "Amounts must be greater than 0");

        // Simple geometric mean calculation (Uniswap V2 style)
        liquidityTokens = Math.sqrt(tokenAAmount * tokenBAmount);

        return liquidityTokens;
    }

    /**
     * @dev Calculate optimal token amounts for equal value
     * @param tokenAPrice Price of token A in USD (with 18 decimals)
     * @param tokenBPrice Price of token B in USD (with 18 decimals)
     * @param totalValue Total value to invest in USD
     * @return tokenAAmount Amount of token A to buy
     * @return tokenBAmount Amount of token B to buy
     */
    function calculateOptimalAmounts(
        uint256 tokenAPrice,
        uint256 tokenBPrice,
        uint256 totalValue
    ) external pure returns (uint256 tokenAAmount, uint256 tokenBAmount) {
        require(tokenAPrice > 0 && tokenBPrice > 0, "Prices must be greater than 0");
        require(totalValue > 0, "Total value must be greater than 0");

        // Calculate amounts for equal value allocation
        uint256 halfValue = totalValue / 2;

        tokenAAmount = (halfValue * PRECISION) / tokenAPrice;
        tokenBAmount = (halfValue * PRECISION) / tokenBPrice;

        return (tokenAAmount, tokenBAmount);
    }

    /**
     * @dev Calculate simple interest yield
     * @param principal Principal amount
     * @param rate Annual interest rate (with 18 decimals, e.g., 5% = 5e16)
     * @param time Time period in seconds
     * @return yield Total yield earned
     */
    function calculateSimpleYield(uint256 principal, uint256 rate, uint256 time) external pure returns (uint256 yield) {
        require(principal > 0, "Principal must be greater than 0");
        require(rate > 0, "Rate must be greater than 0");
        require(time > 0, "Time must be greater than 0");

        // Simple interest formula: I = P * r * t
        yield = (principal * rate * time) / (YEAR_IN_SECONDS * PRECISION);

        return yield;
    }

    /**
     * @dev Calculate compound interest yield
     * @param principal Principal amount
     * @param rate Annual interest rate (with 18 decimals)
     * @param time Time period in seconds
     * @param compoundFrequency How often interest is compounded per year
     * @return yield Total yield earned
     */
    function calculateCompoundYield(
        uint256 principal,
        uint256 rate,
        uint256 time,
        uint256 compoundFrequency
    ) external pure returns (uint256 yield) {
        require(principal > 0, "Principal must be greater than 0");
        require(rate > 0, "Rate must be greater than 0");
        require(time > 0, "Time must be greater than 0");
        require(compoundFrequency > 0, "Compound frequency must be greater than 0");

        // Convert time to years with proper precision
        uint256 timeInYears = (time * PRECISION) / YEAR_IN_SECONDS;
        
        // Calculate compound interest: A = P * (1 + r/n)^(n*t)
        uint256 n = compoundFrequency;
        uint256 r = rate; // Rate is already in wei format (18 decimals)
        
        // Calculate (1 + r/n) with proper precision
        uint256 base = PRECISION + (r / n);
        
        // Calculate (n * t) for the exponent
        uint256 exponent = (n * timeInYears) / PRECISION;
        
        // Limit exponent to prevent excessive gas usage
        if (exponent > 100) {
            exponent = 100;
        }
        
        // Calculate (1 + r/n)^(n*t) using iterative multiplication
        uint256 compoundMultiplier = PRECISION;
        for (uint256 i = 0; i < exponent; i++) {
            compoundMultiplier = (compoundMultiplier * base) / PRECISION;
        }
        
        // Calculate final yield: P * (1 + r/n)^(n*t) - P
        yield = (principal * compoundMultiplier) / PRECISION - principal;
        
        return yield;
    }

    /**
     * @dev Calculate impermanent loss for a liquidity position
     * @param initialTokenAAmount Initial amount of token A
     * @param initialTokenBAmount Initial amount of token B
     * @param currentTokenAPrice Current price of token A
     * @param currentTokenBPrice Current price of token B
     * @return lossPercentage Loss as a percentage (with 18 decimals)
     */
    function calculateImpermanentLoss(
        uint256 initialTokenAAmount,
        uint256 initialTokenBAmount,
        uint256 currentTokenAPrice,
        uint256 currentTokenBPrice
    ) external pure returns (uint256 lossPercentage) {
        require(initialTokenAAmount > 0 && initialTokenBAmount > 0, "Initial amounts must be greater than 0");
        require(currentTokenAPrice > 0 && currentTokenBPrice > 0, "Current prices must be greater than 0");

        // Calculate impermanent loss using a realistic approach
        // We'll compare holding tokens vs providing liquidity
        
        // Calculate current value of holding tokens (HODL strategy)
        uint256 heldValue = (initialTokenAAmount * currentTokenAPrice + initialTokenBAmount * currentTokenBPrice) / PRECISION;
        
        // Calculate the value if we had provided liquidity (LP strategy)
        // This is a simplified calculation that shows the difference
        
        // For LP, we need to calculate the geometric mean of the current prices
        // and compare it to the arithmetic mean of the initial amounts
        uint256 sqrtPriceProduct = Math.sqrt(currentTokenAPrice * currentTokenBPrice);
        
        // Calculate LP value based on the geometric mean price
        uint256 lpValue = (initialTokenAAmount + initialTokenBAmount) * sqrtPriceProduct / PRECISION;
        
        // Calculate impermanent loss: (HODL - LP) / HODL
        if (heldValue > lpValue) {
            // There is impermanent loss
            lossPercentage = ((heldValue - lpValue) * PRECISION) / heldValue;
        } else {
            // No impermanent loss (LP performed better or equal)
            lossPercentage = 0;
        }
        
        return lossPercentage;
    }

    /**
     * @dev Calculate swap fee for a given amount
     * @param amount Amount to swap
     * @param feeRate Fee rate (with 18 decimals, e.g., 0.3% = 3e15)
     * @return fee Fee amount
     */
    function calculateSwapFee(uint256 amount, uint256 feeRate) external pure returns (uint256 fee) {
        require(amount > 0, "Amount must be greater than 0");
        require(feeRate > 0, "Fee rate must be greater than 0");

        fee = (amount * feeRate) / PRECISION;
        return fee;
    }

    /**
     * @dev Calculate slippage impact for a trade
     * @param inputAmount Input amount
     * @param outputAmount Output amount
     * @param expectedOutput Expected output amount
     * @return slippagePercentage Slippage as a percentage (with 18 decimals)
     */
    function calculateSlippage(
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 expectedOutput
    ) external pure returns (uint256 slippagePercentage) {
        require(inputAmount > 0, "Input amount must be greater than 0");
        require(outputAmount > 0, "Output amount must be greater than 0");
        require(expectedOutput > 0, "Expected output must be greater than 0");

        if (expectedOutput > outputAmount) {
            slippagePercentage = ((expectedOutput - outputAmount) * PRECISION) / expectedOutput;
        } else {
            slippagePercentage = 0;
        }

        return slippagePercentage;
    }
}
