// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerkleProofX
 * @dev A decentralized contract for registering and verifying Merkle proofs (now optimized for kOS)
 */
contract MerkleProofX {
    // Struct to store Merkle tree information
    struct MerkleTreeInfo {
        string description;
        uint256 timestamp;
        uint256 listSize;
        address creator;
        bool isActive;
    }

    // Platform fee configuration
    uint256 public platformFee = 0.001 ether; // 0.001 ETH fee
    address public platformTreasury;

    // Trusted verifier for off-chain signatures (kOS service)
    address public trustedVerifier;

    // Track user's first tree status
    mapping(address => bool) public isNewcomer;

    // Mapping to store Merkle roots and their information
    mapping(bytes32 => MerkleTreeInfo) public merkleTrees;
    mapping(address => bool) public isKosVerified;

    // Events
    event MerkleTreeAdded(bytes32 indexed root, string description, uint256 listSize, address creator, uint256 feePaid);
    event MerkleTreeRemoved(bytes32 indexed root, address remover);
    event MerkleTreeUpdated(bytes32 indexed root, string newDescription, address updater);
    event PlatformFeeUpdated(uint256 newFee);
    event TreasuryUpdated(address newTreasury);
    event FeeCollected(address user, uint256 amount);
    event TrustedVerifierUpdated(address newVerifier);

    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury address");
        platformTreasury = _treasury;
        // Set deployer as newcomer
        isNewcomer[msg.sender] = true;
    }

    /**
     * @dev Set a user as a newcomer (only callable by treasury)
     */
    function setNewcomerStatus(address _user, bool _isNewcomer) external {
        require(msg.sender == platformTreasury, "Only treasury can set newcomer status");
        isNewcomer[_user] = _isNewcomer;
    }

    /**
     * @dev Adds a new Merkle root to the contract
     */
    function addMerkleTree(bytes32 _root, string memory _description, uint256 _listSize) external payable {
        require(_root != bytes32(0), "Merkle root cannot be zero");
        require(!merkleTrees[_root].isActive, "Tree already exists");
        require(_listSize > 0, "List size must be greater than 0");
        require(bytes(_description).length > 0, "Description cannot be empty");

        // Handle platform fee
        if (isNewcomer[msg.sender]) {
            // Newcomers can add first tree for free
            isNewcomer[msg.sender] = false;
        } else {
            // Non-newcomers must pay fee
            require(msg.value >= platformFee, "Insufficient fee");
            (bool success, ) = platformTreasury.call{ value: msg.value }("");
            require(success, "Fee transfer failed");
            emit FeeCollected(msg.sender, msg.value);
        }

        merkleTrees[_root] = MerkleTreeInfo({
            description: _description,
            timestamp: block.timestamp,
            listSize: _listSize,
            creator: msg.sender,
            isActive: true
        });

        emit MerkleTreeAdded(_root, _description, _listSize, msg.sender, msg.value);
    }

    /**
     * @dev Updates platform fee (only callable by treasury)
     */
    function updatePlatformFee(uint256 _newFee) external {
        require(msg.sender == platformTreasury, "Only treasury can update fee");
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    /**
     * @dev Updates treasury address (only callable by current treasury)
     */
    function updateTreasury(address _newTreasury) external {
        require(msg.sender == platformTreasury, "Only treasury can update address");
        require(_newTreasury != address(0), "Invalid treasury address");
        platformTreasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    /**
     * @dev Sets the trusted verifier address (only callable by treasury)
     */
    function setTrustedVerifier(address _verifier) external {
        require(msg.sender == platformTreasury, "Only treasury can set verifier");
        require(_verifier != address(0), "Verifier cannot be zero address");
        trustedVerifier = _verifier;
        emit TrustedVerifierUpdated(_verifier);
    }

    /**
     * @dev Verifies a kOS signed proof for a claimer
     */
    function submitVerifiedProof(address _claimer, bytes memory _signature) external returns (bool) {
        require(trustedVerifier != address(0), "Trusted verifier not set");

        bytes32 messageHash = keccak256(abi.encodePacked(_claimer));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address recoveredSigner = recoverSigner(ethSignedMessageHash, _signature);
        bool isValid = recoveredSigner == trustedVerifier;

        if (isValid) {
            isKosVerified[_claimer] = true;
        }

        return isValid;
    }

    /**
     * @dev Removes a Merkle tree from the contract
     */
    function removeMerkleTree(bytes32 _root) external {
        require(merkleTrees[_root].isActive, "Tree does not exist");
        require(merkleTrees[_root].creator == msg.sender, "Only creator can remove");

        merkleTrees[_root].isActive = false;
        emit MerkleTreeRemoved(_root, msg.sender);
    }

    /**
     * @dev Updates a Merkle tree's description
     */
    function updateMerkleTreeDescription(bytes32 _root, string memory _newDescription) external {
        require(merkleTrees[_root].isActive, "Tree does not exist");
        require(merkleTrees[_root].creator == msg.sender, "Only creator can update");
        require(bytes(_newDescription).length > 0, "Description cannot be empty");

        merkleTrees[_root].description = _newDescription;
        emit MerkleTreeUpdated(_root, _newDescription, msg.sender);
    }

    /**
     * @dev Gets information about a Merkle tree
     */
    function getMerkleTreeInfo(bytes32 _root) external view returns (MerkleTreeInfo memory) {
        require(merkleTrees[_root].isActive, "Tree does not exist");
        return merkleTrees[_root];
    }

    /**
     * @dev Checks if a Merkle root exists in the contract
     */
    function isMerkleRootValid(bytes32 _root) external view returns (bool) {
        return merkleTrees[_root].isActive;
    }

    /**
     * @dev Gets the current platform fee
     */
    function getPlatformFee() external view returns (uint256) {
        return platformFee;
    }

    /**
     * @dev Checks if an address is a newcomer
     */
    function isUserNewcomer(address _user) external view returns (bool) {
        return isNewcomer[_user];
    }

    /**
     * @dev Helper to recover signer address from signature
     */
    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    /**
     * @dev Helper to split a signature into r, s, v components
     */
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
