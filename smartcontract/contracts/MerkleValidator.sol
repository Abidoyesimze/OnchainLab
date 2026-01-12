// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerkleProofValidator
 * @dev A simple contract for validating Merkle proofs on-chain
 */
contract MerkleProofValidator is Ownable {
    // Mapping from Merkle root to its validation data
    struct ValidationData {
        string description;
        address creator;
        uint256 timestamp;
        uint256 validationCount;
        bool isActive;
    }

    mapping(bytes32 => ValidationData) public validationData;

    // Events
    event MerkleRootRegistered(bytes32 indexed merkleRoot, string description, address creator);
    event ProofValidated(bytes32 indexed merkleRoot, address indexed user, bool isValid);

    // Constructor to pass owner to Ownable
    constructor() Ownable(msg.sender) {
        // Initialize contract with deployer as owner
    }

    /**
     * @dev Register a new Merkle root for validation
     * @param merkleRoot The root of the Merkle tree
     * @param description A description of what this Merkle tree represents
     */
    function registerMerkleRoot(bytes32 merkleRoot, string calldata description) external {
        // Ensure the root is not already registered
        require(validationData[merkleRoot].creator == address(0), "Merkle root already registered");

        validationData[merkleRoot] = ValidationData({
            description: description,
            creator: msg.sender,
            timestamp: block.timestamp,
            validationCount: 0,
            isActive: true
        });

        emit MerkleRootRegistered(merkleRoot, description, msg.sender);
    }

    /**
     * @dev Validate if an address is part of a Merkle tree
     * @param merkleRoot The root of the Merkle tree
     * @param proof The Merkle proof
     * @param leaf The leaf to verify (usually keccak256(address))
     * @return bool Whether the proof is valid
     */
    function validateProof(bytes32 merkleRoot, bytes32[] calldata proof, bytes32 leaf) external returns (bool) {
        // Check if the Merkle root is registered and active
        require(validationData[merkleRoot].isActive, "Merkle root not registered or inactive");

        // Validate the proof
        bool isValid = MerkleProof.verify(proof, merkleRoot, leaf);

        // Update validation count
        validationData[merkleRoot].validationCount++;

        emit ProofValidated(merkleRoot, msg.sender, isValid);

        return isValid;
    }

    /**
     * @dev Validate if an address is part of a Merkle tree (view function)
     * @param merkleRoot The root of the Merkle tree
     * @param proof The Merkle proof
     * @param leaf The leaf to verify
     * @return bool Whether the proof is valid
     */
    function validateProofView(
        bytes32 merkleRoot,
        bytes32[] calldata proof,
        bytes32 leaf
    ) external view returns (bool) {
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    /**
     * @dev Helper function to create a leaf from an address
     * @param addr The address to create a leaf for
     * @return The leaf (keccak256 hash of the address)
     */
    function getLeaf(address addr) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(addr));
    }

    /**
     * @dev Set the active status of a Merkle root
     * @param merkleRoot The root of the Merkle tree
     * @param isActive Whether the Merkle root should be active
     */
    function setMerkleRootStatus(bytes32 merkleRoot, bool isActive) external {
        require(
            validationData[merkleRoot].creator == msg.sender || owner() == msg.sender,
            "Only creator or owner can update status"
        );

        validationData[merkleRoot].isActive = isActive;
    }

    /**
     * @dev Get validation statistics for a Merkle root
     * @param merkleRoot The root of the Merkle tree
     * @return description The description of the Merkle tree
     * @return creator The creator of the Merkle tree
     * @return timestamp When the Merkle tree was registered
     * @return validationCount How many times proofs have been validated
     * @return isActive Whether the Merkle root is active
     */
    function getValidationStats(
        bytes32 merkleRoot
    )
        external
        view
        returns (string memory description, address creator, uint256 timestamp, uint256 validationCount, bool isActive)
    {
        ValidationData memory data = validationData[merkleRoot];
        return (data.description, data.creator, data.timestamp, data.validationCount, data.isActive);
    }
}
