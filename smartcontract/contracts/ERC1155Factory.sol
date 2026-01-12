// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC1155Factory
 * @dev Factory contract for deploying customizable ERC1155 multi-token contracts
 */
contract ERC1155Factory is Ownable {
    
    // Array to track all created contracts
    address[] public createdContracts;
    
    // Mapping to track contract creators
    mapping(address => address) public contractCreators;
    
    // Mapping to store contract info
    mapping(address => MultiToken) public multiTokens;
    
    struct MultiToken {
        string name;
        string uri;
        address creator;
        bool mintable;
        bool burnable;
        bool pausable;
        bool supplyTracked;
        uint256 createdAt;
    }
    
    event MultiTokenCreated(
        address indexed contractAddress,
        string name,
        string uri,
        address indexed creator,
        bool mintable,
        bool burnable,
        bool pausable,
        bool supplyTracked
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new ERC1155 multi-token contract
     * @param name Contract name
     * @param uri URI for token metadata
     * @param mintable Whether tokens can be minted after deployment
     * @param burnable Whether tokens can be burned
     * @param pausable Whether the contract can be paused
     * @param supplyTracked Whether to track total supply per token
     */
    function createMultiToken(
        string memory name,
        string memory uri,
        bool mintable,
        bool burnable,
        bool pausable,
        bool supplyTracked
    ) external returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(uri).length > 0, "URI cannot be empty");
        
        // Deploy the multi-token contract
        CustomERC1155 multiTokenContract = new CustomERC1155(
            name,
            uri,
            mintable,
            burnable,
            pausable,
            supplyTracked,
            msg.sender
        );
        
        address contractAddress = address(multiTokenContract);
        
        // Track the created contract
        createdContracts.push(contractAddress);
        contractCreators[contractAddress] = msg.sender;
        
        // Store contract info
        multiTokens[contractAddress] = MultiToken({
            name: name,
            uri: uri,
            creator: msg.sender,
            mintable: mintable,
            burnable: burnable,
            pausable: pausable,
            supplyTracked: supplyTracked,
            createdAt: block.timestamp
        });
        
        emit MultiTokenCreated(
            contractAddress,
            name,
            uri,
            msg.sender,
            mintable,
            burnable,
            pausable,
            supplyTracked
        );
        
        return contractAddress;
    }
    
    /**
     * @dev Get all created contracts
     */
    function getAllContracts() external view returns (address[] memory) {
        return createdContracts;
    }
    
    /**
     * @dev Get contract count
     */
    function getContractCount() external view returns (uint256) {
        return createdContracts.length;
    }
    
    /**
     * @dev Get contracts created by a specific address
     */
    function getContractsByCreator(address creator) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < createdContracts.length; i++) {
            if (contractCreators[createdContracts[i]] == creator) {
                count++;
            }
        }
        
        address[] memory creatorContracts = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < createdContracts.length; i++) {
            if (contractCreators[createdContracts[i]] == creator) {
                creatorContracts[index] = createdContracts[i];
                index++;
            }
        }
        
        return creatorContracts;
    }
}

/**
 * @title CustomERC1155
 * @dev Simple customizable ERC1155 multi-token contract deployed by the factory
 */
contract CustomERC1155 is ERC1155, Ownable {
    
    string private _name;
    bool private _mintable;
    bool private _burnable;
    bool private _pausable;
    bool private _supplyTracked;
    bool private _paused;
    
    // Supply tracking per token ID
    mapping(uint256 => uint256) private _totalSupply;
    
    constructor(
        string memory name_,
        string memory uri_,
        bool mintable_,
        bool burnable_,
        bool pausable_,
        bool supplyTracked_,
        address creator
    ) ERC1155(uri_) Ownable(creator) {
        _name = name_;
        _mintable = mintable_;
        _burnable = burnable_;
        _pausable = pausable_;
        _supplyTracked = supplyTracked_;
        _paused = false;
    }
    
    /**
     * @dev Mint a single token type
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        require(_mintable, "Minting is disabled");
        require(!_paused, "Contract is paused");
        if (_supplyTracked) {
            _totalSupply[id] += amount;
        }
        _mint(to, id, amount, data);
    }
    
    /**
     * @dev Mint multiple token types
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        require(_mintable, "Minting is disabled");
        require(!_paused, "Contract is paused");
        require(ids.length == amounts.length, "Arrays length mismatch");
        
        if (_supplyTracked) {
            for (uint256 i = 0; i < ids.length; i++) {
                _totalSupply[ids[i]] += amounts[i];
            }
        }
        
        _mintBatch(to, ids, amounts, data);
    }
    
    /**
     * @dev Burn a single token type
     */
    function burn(
        address from,
        uint256 id,
        uint256 amount
    ) external {
        require(_burnable, "Burning is disabled");
        require(from == msg.sender || msg.sender == owner(), "Not authorized");
        if (_supplyTracked) {
            _totalSupply[id] -= amount;
        }
        _burn(from, id, amount);
    }
    
    /**
     * @dev Burn multiple token types
     */
    function burnBatch(
        address from,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external {
        require(_burnable, "Burning is disabled");
        require(from == msg.sender || msg.sender == owner(), "Not authorized");
        require(ids.length == amounts.length, "Arrays length mismatch");
        
        if (_supplyTracked) {
            for (uint256 i = 0; i < ids.length; i++) {
                _totalSupply[ids[i]] -= amounts[i];
            }
        }
        
        _burnBatch(from, ids, amounts);
    }
    
    /**
     * @dev Pause the contract (only if pausable)
     */
    function pause() external onlyOwner {
        require(_pausable, "Pausing is disabled");
        _paused = true;
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _paused = false;
    }
    
    /**
     * @dev Set URI for all token types
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
    
    /**
     * @dev Get contract name
     */
    function name() external view returns (string memory) {
        return _name;
    }
    
    /**
     * @dev Check if minting is enabled
     */
    function isMintable() external view returns (bool) {
        return _mintable;
    }
    
    /**
     * @dev Check if burning is enabled
     */
    function isBurnable() external view returns (bool) {
        return _burnable;
    }
    
    /**
     * @dev Check if pausing is enabled
     */
    function isPausable() external view returns (bool) {
        return _pausable;
    }
    
    /**
     * @dev Check if supply tracking is enabled
     */
    function isSupplyTracked() external view returns (bool) {
        return _supplyTracked;
    }
    
    /**
     * @dev Check if contract is paused
     */
    function isPaused() external view returns (bool) {
        return _paused;
    }
    
    /**
     * @dev Get total supply for a specific token ID
     */
    function getTotalSupply(uint256 id) external view returns (uint256) {
        if (_supplyTracked) {
            return _totalSupply[id];
        }
        return 0;
    }
} 