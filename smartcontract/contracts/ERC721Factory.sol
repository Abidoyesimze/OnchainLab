// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC721Factory
 * @dev Factory contract for deploying customizable ERC721 NFT collections
 */
contract ERC721Factory is Ownable {
    
    // Array to track all created collections
    address[] public createdCollections;
    
    // Mapping to track collection creators
    mapping(address => address) public collectionCreators;
    
    // Mapping to store collection info
    mapping(address => Collection) public collections;
    
    struct Collection {
        string name;
        string symbol;
        address creator;
        uint256 maxSupply;
        bool mintable;
        bool burnable;
        bool pausable;
        uint256 createdAt;
    }
    
    event CollectionCreated(
        address indexed contractAddress,
        string name,
        string symbol,
        address indexed creator,
        uint256 maxSupply,
        bool mintable,
        bool burnable,
        bool pausable
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new ERC721 NFT collection
     * @param name Collection name
     * @param symbol Collection symbol
     * @param baseURI Base URI for token metadata
     * @param maxSupplyAmount Maximum supply of tokens (0 for unlimited)
     * @param mintable Whether tokens can be minted after deployment
     * @param burnable Whether tokens can be burned
     * @param pausable Whether the contract can be paused
     */
    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupplyAmount,
        bool mintable,
        bool burnable,
        bool pausable
    ) external returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        
        // Deploy the NFT contract
        CustomERC721 nftContract = new CustomERC721(
            name,
            symbol,
            baseURI,
            maxSupplyAmount,
            mintable,
            burnable,
            pausable,
            msg.sender
        );
        
        address contractAddress = address(nftContract);
        
        // Track the created collection
        createdCollections.push(contractAddress);
        collectionCreators[contractAddress] = msg.sender;
        
        // Store collection info
        collections[contractAddress] = Collection({
            name: name,
            symbol: symbol,
            creator: msg.sender,
            maxSupply: maxSupplyAmount,
            mintable: mintable,
            burnable: burnable,
            pausable: pausable,
            createdAt: block.timestamp
        });
        
        emit CollectionCreated(
            contractAddress,
            name,
            symbol,
            msg.sender,
            maxSupplyAmount,
            mintable,
            burnable,
            pausable
        );
        
        return contractAddress;
    }
    
    /**
     * @dev Get all created collections
     */
    function getAllCollections() external view returns (address[] memory) {
        return createdCollections;
    }
    
    /**
     * @dev Get collection count
     */
    function getCollectionCount() external view returns (uint256) {
        return createdCollections.length;
    }
    
    /**
     * @dev Get collections created by a specific address
     */
    function getCollectionsByCreator(address creator) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < createdCollections.length; i++) {
            if (collectionCreators[createdCollections[i]] == creator) {
                count++;
            }
        }
        
        address[] memory creatorCollections = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < createdCollections.length; i++) {
            if (collectionCreators[createdCollections[i]] == creator) {
                creatorCollections[index] = createdCollections[i];
                index++;
            }
        }
        
        return creatorCollections;
    }
}

/**
 * @title CustomERC721
 * @dev Simple customizable ERC721 NFT contract deployed by the factory
 */
contract CustomERC721 is ERC721, Ownable {
    
    string private _baseTokenURI;
    uint256 private _maxSupply;
    bool private _mintable;
    bool private _burnable;
    bool private _pausable;
    uint256 private _tokenCounter;
    bool private _paused;
    
    // Mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupply,
        bool mintable,
        bool burnable,
        bool pausable,
        address creator
    ) ERC721(name, symbol) Ownable(creator) {
        _baseTokenURI = baseURI;
        _maxSupply = maxSupply;
        _mintable = mintable;
        _burnable = burnable;
        _pausable = pausable;
        _tokenCounter = 0;
        _paused = false;
    }
    
    /**
     * @dev Set token URI for a specific token
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        _tokenURIs[tokenId] = uri;
    }
    
    /**
     * @dev Get token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory uri = _tokenURIs[tokenId];
        if (bytes(uri).length > 0) {
            return uri;
        }
        return string(abi.encodePacked(_baseTokenURI, "/", _toString(tokenId)));
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Mint a new token (only if mintable)
     */
    function mint(address to, string memory uri) external onlyOwner {
        require(_mintable, "Minting is disabled");
        require(!_paused, "Contract is paused");
        require(_maxSupply == 0 || _tokenCounter < _maxSupply, "Max supply reached");
        
        _tokenCounter++;
        uint256 tokenId = _tokenCounter;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    
    /**
     * @dev Batch mint multiple tokens
     */
    function batchMint(
        address[] memory to,
        string[] memory uris
    ) external onlyOwner {
        require(_mintable, "Minting is disabled");
        require(!_paused, "Contract is paused");
        require(to.length == uris.length, "Arrays length mismatch");
        require(_maxSupply == 0 || _tokenCounter + to.length <= _maxSupply, "Max supply would be exceeded");
        
        for (uint256 i = 0; i < to.length; i++) {
            _tokenCounter++;
            uint256 tokenId = _tokenCounter;
            
            _safeMint(to[i], tokenId);
            _setTokenURI(tokenId, uris[i]);
        }
    }
    
    /**
     * @dev Burn a token (only if burnable)
     */
    function burn(uint256 tokenId) external {
        require(_burnable, "Burning is disabled");
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        _burn(tokenId);
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
     * @dev Set base URI for all tokens
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Get base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Get max supply
     */
    function getMaxSupply() external view returns (uint256) {
        return _maxSupply;
    }
    
    /**
     * @dev Get current supply
     */
    function currentSupply() external view returns (uint256) {
        return _tokenCounter;
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
     * @dev Check if contract is paused
     */
    function isPaused() external view returns (bool) {
        return _paused;
    }
} 