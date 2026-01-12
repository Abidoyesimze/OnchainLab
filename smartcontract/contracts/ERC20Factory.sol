// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20Factory
 * @dev A factory contract for creating ERC20 tokens with basic configuration
 * Perfect for DeFi developers who need quick token deployment
 */
contract ERC20Factory is Ownable {
    // Array to track all created tokens
    address[] public createdTokens;

    // Mapping to track token creators
    mapping(address => address) public tokenCreators;

    // Events
    event TokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        uint8 decimals,
        address indexed creator
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new ERC20 token
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param decimals Token decimals (usually 18)
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals
    ) external returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(decimals <= 18, "Decimals cannot exceed 18");

        // Create new token contract
        ERC20Token newToken = new ERC20Token(name, symbol, initialSupply, decimals, msg.sender);

        address tokenAddress = address(newToken);

        // Track the created token
        createdTokens.push(tokenAddress);
        tokenCreators[tokenAddress] = msg.sender;

        emit TokenCreated(tokenAddress, name, symbol, initialSupply, decimals, msg.sender);

        return tokenAddress;
    }

    /**
     * @dev Get all created tokens
     * @return Array of token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return createdTokens;
    }

    /**
     * @dev Get token count
     * @return Number of created tokens
     */
    function getTokenCount() external view returns (uint256) {
        return createdTokens.length;
    }

    /**
     * @dev Get tokens created by a specific address
     * @param creator Address of the token creator
     * @return Array of token addresses created by the specified address
     */
    function getTokensByCreator(address creator) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < createdTokens.length; i++) {
            if (tokenCreators[createdTokens[i]] == creator) {
                count++;
            }
        }

        address[] memory creatorTokens = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < createdTokens.length; i++) {
            if (tokenCreators[createdTokens[i]] == creator) {
                creatorTokens[index] = createdTokens[i];
                index++;
            }
        }

        return creatorTokens;
    }
}

/**
 * @title ERC20Token
 * @dev Standard ERC20 token implementation
 */
contract ERC20Token is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _decimals = decimals_;
        _mint(initialOwner, initialSupply * 10 ** decimals_);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
