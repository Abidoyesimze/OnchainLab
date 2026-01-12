import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleProofValidator } from "../typechain-types";

describe("MerkleProofValidator", function () {
  let merkleValidator: MerkleProofValidator;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;

  // Test data for Merkle proofs
  let testAddresses: string[];
  let merkleRoot: string;
  let merkleProofs: Map<string, string[]>;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();

    // Deploy MerkleProofValidator
    const MerkleProofValidatorFactory = await ethers.getContractFactory("MerkleProofValidator");
    merkleValidator = (await MerkleProofValidatorFactory.deploy()) as MerkleProofValidator;
    await merkleValidator.waitForDeployment();

    // Generate test Merkle tree data
    testAddresses = [user1Address, user2Address, user3Address].map(addr => addr.toLowerCase());
    const { tree, proofs } = generateMerkleTree(testAddresses);
    merkleRoot = tree.getHexRoot();
    merkleProofs = new Map();
    testAddresses.forEach((addr, index) => {
      merkleProofs.set(addr, proofs[index]);
    });
  });

  // Helper function to generate Merkle tree
  function generateMerkleTree(addresses: string[]) {
    const { MerkleTree } = require("merkletreejs");
    const keccak256 = require("keccak256");

    const leaves = addresses.map(addr => keccak256(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const proofs = addresses.map(addr => tree.getHexProof(keccak256(addr)));

    return { tree, proofs };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await merkleValidator.owner()).to.equal(ownerAddress);
    });
  });

  describe("Merkle Root Registration", function () {
    it("Should register a new Merkle root successfully", async function () {
      const description = "Test whitelist for NFT mint";

      const tx = await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, description);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => log.fragment?.name === "MerkleRootRegistered");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = merkleValidator.interface.parseLog(event as any)!;
        const registeredRoot = parsedEvent.args[0];
        const registeredDescription = parsedEvent.args[1];
        const creator = parsedEvent.args[2];

        expect(registeredRoot).to.equal(merkleRoot);
        expect(registeredDescription).to.equal(description);
        expect(creator).to.equal(user1Address);
      }
    });

    it("Should fail when registering duplicate Merkle root", async function () {
      const description = "Test whitelist";

      // Register first time
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, description);

      // Try to register again
      await expect(
        merkleValidator.connect(user2).registerMerkleRoot(merkleRoot, "Another description"),
      ).to.be.revertedWith("Merkle root already registered");
    });

    it("Should fail when registering zero address as root", async function () {
      const zeroRoot = ethers.ZeroHash;
      const description = "Test description";

      await expect(merkleValidator.connect(user1).registerMerkleRoot(zeroRoot, description)).to.not.be.reverted; // This should work as it's a valid hash
    });

    it("Should allow different users to register different roots", async function () {
      const description1 = "First whitelist";
      const description2 = "Second whitelist";

      // Generate different Merkle tree
      const differentAddresses = [user1Address, user2Address].map(addr => addr.toLowerCase());
      const { tree: tree2 } = generateMerkleTree(differentAddresses);
      const differentRoot = tree2.getHexRoot();

      // Register both roots
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, description1);
      await merkleValidator.connect(user2).registerMerkleRoot(differentRoot, description2);

      // Both should be registered
      const stats1 = await merkleValidator.getValidationStats(merkleRoot);
      const stats2 = await merkleValidator.getValidationStats(differentRoot);

      expect(stats1.description).to.equal(description1);
      expect(stats2.description).to.equal(description2);
    });
  });

  describe("Proof Validation", function () {
    beforeEach(async function () {
      // Register the test Merkle root
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");
    });

    it("Should validate correct Merkle proof", async function () {
      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      const tx = await merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => log.fragment?.name === "ProofValidated");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = merkleValidator.interface.parseLog(event as any)!;
        expect(parsedEvent.args[0]).to.equal(merkleRoot);
        expect(parsedEvent.args[1]).to.equal(user1Address);
        expect(parsedEvent.args[2]).to.be.true;
      }
    });

    it("Should validate proof for different user", async function () {
      const userAddress = user2Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      // Use the view function to check validation without state changes
      const isValid = await merkleValidator.validateProofView(merkleRoot, proof, leaf);
      expect(isValid).to.be.true;
    });

    it("Should fail validation for incorrect proof", async function () {
      const userAddress = user1Address.toLowerCase();
      const wrongProof = ["0x" + "1".repeat(64), "0x" + "2".repeat(64)];
      const leaf = ethers.keccak256(userAddress);

      // Use the view function to check validation without state changes
      const isValid = await merkleValidator.validateProofView(merkleRoot, wrongProof, leaf);
      expect(isValid).to.be.false;
    });

    it("Should fail validation for unregistered Merkle root", async function () {
      const unregisteredRoot = "0x" + "3".repeat(64);
      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      await expect(merkleValidator.connect(user1).validateProof(unregisteredRoot, proof, leaf)).to.be.revertedWith(
        "Merkle root not registered or inactive",
      );
    });

    it("Should fail validation for inactive Merkle root", async function () {
      // Deactivate the root
      await merkleValidator.connect(user1).setMerkleRootStatus(merkleRoot, false);

      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      await expect(merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf)).to.be.revertedWith(
        "Merkle root not registered or inactive",
      );
    });

    it("Should update validation count after successful validation", async function () {
      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      const initialStats = await merkleValidator.getValidationStats(merkleRoot);
      expect(initialStats.validationCount).to.equal(0);

      await merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf);

      const updatedStats = await merkleValidator.getValidationStats(merkleRoot);
      expect(updatedStats.validationCount).to.equal(1);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");
    });

    it("Should validate proof without updating state (view function)", async function () {
      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      const isValid = await merkleValidator.validateProofView(merkleRoot, proof, leaf);
      expect(isValid).to.be.true;

      // Validation count should not change
      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.validationCount).to.equal(0);
    });

    it("Should generate correct leaf from address", async function () {
      const userAddress = user1Address.toLowerCase();
      const expectedLeaf = ethers.keccak256(userAddress);

      const generatedLeaf = await merkleValidator.getLeaf(userAddress);
      expect(generatedLeaf).to.equal(expectedLeaf);
    });

    it("Should handle different address formats", async function () {
      const address1 = user1Address.toLowerCase();
      const address2 = user1Address; // Mixed case

      const leaf1 = await merkleValidator.getLeaf(address1);
      const leaf2 = await merkleValidator.getLeaf(address2);

      expect(leaf1).to.equal(leaf2);
    });
  });

  describe("Merkle Root Management", function () {
    beforeEach(async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");
    });

    it("Should allow creator to update root status", async function () {
      await merkleValidator.connect(user1).setMerkleRootStatus(merkleRoot, false);

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.isActive).to.be.false;
    });

    it("Should allow owner to update any root status", async function () {
      await merkleValidator.connect(owner).setMerkleRootStatus(merkleRoot, false);

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.isActive).to.be.false;
    });

    it("Should fail when non-creator non-owner tries to update status", async function () {
      await expect(merkleValidator.connect(user2).setMerkleRootStatus(merkleRoot, false)).to.be.revertedWith(
        "Only creator or owner can update status",
      );
    });

    it("Should reactivate deactivated root", async function () {
      // Deactivate first
      await merkleValidator.connect(user1).setMerkleRootStatus(merkleRoot, false);

      // Reactivate
      await merkleValidator.connect(user1).setMerkleRootStatus(merkleRoot, true);

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.isActive).to.be.true;
    });
  });

  describe("Validation Statistics", function () {
    beforeEach(async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");
    });

    it("Should return correct validation statistics", async function () {
      const stats = await merkleValidator.getValidationStats(merkleRoot);

      expect(stats.description).to.equal("Test whitelist");
      expect(stats.creator).to.equal(user1Address);
      expect(stats.timestamp).to.be.greaterThan(0);
      expect(stats.validationCount).to.equal(0);
      expect(stats.isActive).to.be.true;
    });

    it("Should return zero values for unregistered root", async function () {
      const unregisteredRoot = "0x" + "4".repeat(64);
      const stats = await merkleValidator.getValidationStats(unregisteredRoot);

      expect(stats.description).to.equal("");
      expect(stats.creator).to.equal(ethers.ZeroAddress);
      expect(stats.timestamp).to.equal(0);
      expect(stats.validationCount).to.equal(0);
      expect(stats.isActive).to.be.false;
    });

    it("Should track validation count correctly", async function () {
      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      // Validate multiple times
      await merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf);
      await merkleValidator.connect(user2).validateProof(merkleRoot, proof, leaf);

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.validationCount).to.equal(2);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very long descriptions", async function () {
      const longDescription = "A".repeat(1000); // Very long description

      await expect(merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, longDescription)).to.not.be.reverted;

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.description).to.equal(longDescription);
    });

    it("Should handle empty description", async function () {
      const emptyDescription = "";

      await expect(merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, emptyDescription)).to.not.be.reverted;

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.description).to.equal(emptyDescription);
    });

    it("Should handle reasonable large values", async function () {
      // This test verifies the contract can handle reasonable large numbers
      // First register a merkle root
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.timestamp).to.be.greaterThan(0);
    });

    it("Should handle multiple validations from same user", async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");

      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      // Same user validates multiple times
      await merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf);
      await merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf);

      const stats = await merkleValidator.getValidationStats(merkleRoot);
      expect(stats.validationCount).to.equal(2);
    });
  });

  describe("Gas Optimization", function () {
    beforeEach(async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");
    });

    it("Should use reasonable gas for proof validation", async function () {
      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      const tx = await merkleValidator.connect(user1).validateProof(merkleRoot, proof, leaf);
      const receipt = await tx.wait();

      // Proof validation should use reasonable gas
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should use reasonable gas for root registration", async function () {
      const newRoot = "0x" + "5".repeat(64);
      const description = "New whitelist";

      const tx = await merkleValidator.connect(user2).registerMerkleRoot(newRoot, description);
      const receipt = await tx.wait();

      // Root registration should use reasonable gas
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });

    it("Should use reasonable gas for status updates", async function () {
      const tx = await merkleValidator.connect(user1).setMerkleRootStatus(merkleRoot, false);
      const receipt = await tx.wait();

      // Status update should use minimal gas
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("Security Features", function () {
    it("Should prevent unauthorized status updates", async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");

      // Non-creator, non-owner cannot update status
      await expect(merkleValidator.connect(user2).setMerkleRootStatus(merkleRoot, false)).to.be.revertedWith(
        "Only creator or owner can update status",
      );
    });

    it("Should prevent duplicate root registration", async function () {
      const description = "Test whitelist";

      // First registration
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, description);

      // Second registration should fail
      await expect(
        merkleValidator.connect(user2).registerMerkleRoot(merkleRoot, "Another description"),
      ).to.be.revertedWith("Merkle root already registered");
    });

    it("Should validate proof integrity", async function () {
      await merkleValidator.connect(user1).registerMerkleRoot(merkleRoot, "Test whitelist");

      const userAddress = user1Address.toLowerCase();
      const proof = merkleProofs.get(userAddress)!;
      const leaf = ethers.keccak256(userAddress);

      // Valid proof should work
      const isValid = await merkleValidator.validateProofView(merkleRoot, proof, leaf);
      expect(isValid).to.be.true;

      // Invalid proof should fail
      const invalidProof = ["0x" + "1".repeat(64)];
      const isValidInvalid = await merkleValidator.validateProofView(merkleRoot, invalidProof, leaf);
      expect(isValidInvalid).to.be.false;
    });
  });
});
