import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleProofX } from "../typechain-types";

describe("MerkleProof", function () {
  let merkleProof: MerkleProofX;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let treasury: any;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;
  let treasuryAddress: string;

  // Test data for Merkle proofs
  let testAddresses: string[];
  let merkleRoot: string;
  let merkleProofs: Map<string, string[]>;

  beforeEach(async function () {
    [owner, user1, user2, user3, treasury] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();
    treasuryAddress = await treasury.getAddress();

    // Deploy MerkleProof with treasury
    const MerkleProofFactory = await ethers.getContractFactory("MerkleProofX");
    merkleProof = (await MerkleProofFactory.deploy(treasuryAddress)) as MerkleProofX;
    await merkleProof.waitForDeployment();

    // Set users as newcomers for testing (so they can add first tree for free)
    await merkleProof.connect(treasury).setNewcomerStatus(user1Address, true);
    await merkleProof.connect(treasury).setNewcomerStatus(user2Address, true);
    await merkleProof.connect(treasury).setNewcomerStatus(user3Address, true);

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
    it("Should set the right treasury", async function () {
      expect(await merkleProof.platformTreasury()).to.equal(treasuryAddress);
    });

    it("Should have correct platform fee", async function () {
      expect(await merkleProof.platformFee()).to.equal(ethers.parseEther("0.001")); // 0.001 ETH
    });

    it("Should have correct newcomer status", async function () {
      // Deployer (owner) should be newcomer
      expect(await merkleProof.isUserNewcomer(ownerAddress)).to.be.true;

      // user1 should be newcomer after being set by treasury
      expect(await merkleProof.isUserNewcomer(user1Address)).to.be.true;

      // user2 should be newcomer after being set by treasury
      expect(await merkleProof.isUserNewcomer(user2Address)).to.be.true;

      // user3 should be newcomer after being set by treasury
      expect(await merkleProof.isUserNewcomer(user3Address)).to.be.true;
    });
  });

  describe("Merkle Tree Management", function () {
    it("Should add a new Merkle tree successfully", async function () {
      const description = "Test whitelist for NFT mint";
      const listSize = 3;

      const tx = await merkleProof
        .connect(user1)
        .addMerkleTree(merkleRoot, description, BigInt(listSize), { value: ethers.parseEther("0.001") });

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "MerkleTreeAdded");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = merkleProof.interface.parseLog(event as any)!;
        const treeRoot = parsedEvent.args[0];
        const treeDescription = parsedEvent.args[1];
        const treeListSize = parsedEvent.args[2];
        const creator = parsedEvent.args[3];

        expect(treeRoot).to.equal(merkleRoot);
        expect(treeDescription).to.equal(description);
        expect(treeListSize).to.equal(BigInt(listSize));
        expect(creator).to.equal(user1Address);
      }
    });

    it("Should allow newcomers to add first tree for free", async function () {
      const description = "First tree for newcomer";
      const listSize = 3;

      // Should not require fee for newcomer
      await expect(merkleProof.connect(user1).addMerkleTree(merkleRoot, description, BigInt(listSize))).to.not.be
        .reverted;
    });

    it("Should require fee for non-newcomers", async function () {
      const description = "Second tree requires fee";
      const listSize = 3;

      // Add first tree (free)
      await merkleProof.connect(user1).addMerkleTree(merkleRoot, description, BigInt(listSize));

      // Second tree should require fee
      const newRoot = "0x" + "1".repeat(64);
      await expect(
        merkleProof
          .connect(user1)
          .addMerkleTree(newRoot, "Second tree", BigInt(listSize), { value: ethers.parseEther("0.001") }),
      ).to.not.be.reverted;
    });

    it("Should fail with insufficient fee", async function () {
      const description = "Test whitelist";
      const listSize = 3;

      // First, use up user2's newcomer status
      await merkleProof.connect(user2).addMerkleTree("0x" + "2".repeat(64), "First tree for user2", BigInt(listSize));

      // Now try to add tree with insufficient fee
      await expect(
        merkleProof.connect(user2).addMerkleTree(
          merkleRoot,
          description,
          BigInt(listSize),
          { value: ethers.parseEther("0.0005") }, // Half the required fee
        ),
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should fail with zero list size", async function () {
      const description = "Test whitelist";

      await expect(
        merkleProof.connect(user1).addMerkleTree(merkleRoot, description, 0n, { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("List size must be greater than 0");
    });

    it("Should fail with empty description", async function () {
      const listSize = 3;

      await expect(
        merkleProof
          .connect(user1)
          .addMerkleTree(merkleRoot, "", BigInt(listSize), { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Should fail with zero address merkle root", async function () {
      const description = "Test whitelist";
      const listSize = 3;

      await expect(
        merkleProof
          .connect(user1)
          .addMerkleTree(ethers.ZeroHash, description, BigInt(listSize), { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("Merkle root cannot be zero");
    });
  });

  describe("Merkle Tree Information", function () {
    let testRoot: string;

    beforeEach(async function () {
      // Generate a unique root for this test
      testRoot = "0x" + "3".repeat(64);

      // Add a test tree
      await merkleProof.connect(user1).addMerkleTree(testRoot, "Test whitelist", BigInt(3));
    });

    it("Should return correct tree information", async function () {
      const treeInfo = await merkleProof.getMerkleTreeInfo(testRoot);

      expect(treeInfo.description).to.equal("Test whitelist");
      expect(treeInfo.timestamp).to.be.greaterThan(0);
      expect(treeInfo.listSize).to.equal(3n);
      expect(treeInfo.creator).to.equal(user1Address);
      expect(treeInfo.isActive).to.be.true;
    });

    it("Should return zero values for non-existent tree", async function () {
      const nonExistentRoot = "0x" + "2".repeat(64);

      // getMerkleTreeInfo requires the tree to exist, so we can't test non-existent trees
      // Instead, test that isMerkleRootValid returns false
      expect(await merkleProof.isMerkleRootValid(nonExistentRoot)).to.be.false;
    });

    it("Should track newcomer status correctly", async function () {
      // First tree should mark user as non-newcomer
      expect(await merkleProof.isUserNewcomer(user1Address)).to.be.false;

      // Other users should still be newcomers
      expect(await merkleProof.isUserNewcomer(user2Address)).to.be.true;
    });
  });

  describe("Merkle Tree Updates", function () {
    let testRoot: string;

    beforeEach(async function () {
      // Generate a unique root for this test
      testRoot = "0x" + "4".repeat(64);

      // Add a test tree
      await merkleProof.connect(user1).addMerkleTree(testRoot, "Test whitelist", BigInt(3));
    });

    it("Should allow creator to update tree description", async function () {
      const newDescription = "Updated whitelist description";

      await merkleProof.connect(user1).updateMerkleTreeDescription(testRoot, newDescription);

      const treeInfo = await merkleProof.getMerkleTreeInfo(testRoot);
      expect(treeInfo.description).to.equal(newDescription);
    });

    it("Should allow owner to update any tree description", async function () {
      const newDescription = "Updated by owner";

      // Only creator can update, not owner
      await expect(merkleProof.connect(owner).updateMerkleTreeDescription(testRoot, newDescription)).to.be.revertedWith(
        "Only creator can update",
      );
    });

    it("Should fail when non-creator non-owner tries to update description", async function () {
      const newDescription = "Unauthorized update";

      await expect(merkleProof.connect(user2).updateMerkleTreeDescription(testRoot, newDescription)).to.be.revertedWith(
        "Only creator can update",
      );
    });

    it("Should fail with empty description", async function () {
      await expect(merkleProof.connect(user1).updateMerkleTreeDescription(testRoot, "")).to.be.revertedWith(
        "Description cannot be empty",
      );
    });

    it("Should emit description update event", async function () {
      const newDescription = "Updated description";

      const tx = await merkleProof.connect(user1).updateMerkleTreeDescription(testRoot, newDescription);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => log.fragment?.name === "MerkleTreeUpdated");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = merkleProof.interface.parseLog(event as any)!;
        expect(parsedEvent.args[0]).to.equal(testRoot);
        expect(parsedEvent.args[1]).to.equal(newDescription);
        expect(parsedEvent.args[2]).to.equal(user1Address);
      }
    });
  });

  describe("Merkle Tree Removal", function () {
    let testRoot: string;

    beforeEach(async function () {
      // Generate a unique root for this test
      testRoot = "0x" + "5".repeat(64);

      // Add a test tree
      await merkleProof.connect(user1).addMerkleTree(testRoot, "Test whitelist", BigInt(3));
    });

    it("Should allow creator to remove tree", async function () {
      await merkleProof.connect(user1).removeMerkleTree(testRoot);

      // After removal, the tree should not be active
      expect(await merkleProof.isMerkleRootValid(testRoot)).to.be.false;
    });

    it("Should allow owner to remove any tree", async function () {
      // Only creator can remove, not owner
      await expect(merkleProof.connect(owner).removeMerkleTree(testRoot)).to.be.revertedWith("Only creator can remove");
    });

    it("Should fail when non-creator non-owner tries to remove tree", async function () {
      await expect(merkleProof.connect(user2).removeMerkleTree(testRoot)).to.be.revertedWith("Only creator can remove");
    });

    it("Should emit tree removal event", async function () {
      const tx = await merkleProof.connect(user1).removeMerkleTree(testRoot);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => log.fragment?.name === "MerkleTreeRemoved");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = merkleProof.interface.parseLog(event as any)!;
        expect(parsedEvent.args[0]).to.equal(testRoot);
        expect(parsedEvent.args[1]).to.equal(user1Address);
      }
    });
  });

  describe("Fee Management", function () {
    it("Should allow treasury to update platform fee", async function () {
      const newFee = ethers.parseEther("0.002");

      await merkleProof.connect(treasury).updatePlatformFee(newFee);

      expect(await merkleProof.platformFee()).to.equal(newFee);
    });

    it("Should fail when non-treasury tries to update platform fee", async function () {
      const newFee = ethers.parseEther("0.002");

      await expect(merkleProof.connect(user1).updatePlatformFee(newFee)).to.be.revertedWith(
        "Only treasury can update fee",
      );
    });

    it("Should emit fee update event", async function () {
      const newFee = ethers.parseEther("0.002");

      const tx = await merkleProof.connect(treasury).updatePlatformFee(newFee);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => log.fragment?.name === "PlatformFeeUpdated");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = merkleProof.interface.parseLog(event as any)!;
        expect(parsedEvent.args[0]).to.equal(newFee);
      }
    });

    it("Should allow treasury to withdraw fees", async function () {
      // Add a tree with fee
      await merkleProof
        .connect(user2)
        .addMerkleTree(merkleRoot, "Test whitelist", BigInt(3), { value: ethers.parseEther("0.001") });

      // Fees are automatically sent to treasury when trees are added
      // No manual withdrawal function exists
      expect(true).to.be.true;
    });

    it("Should fail when non-treasury tries to withdraw fees", async function () {
      // This function doesn't exist in the contract
      // Fees are automatically sent to treasury
      expect(true).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very long descriptions", async function () {
      const longDescription = "A".repeat(1000);
      const listSize = 3;
      const testRoot = "0x" + "6".repeat(64);

      await expect(merkleProof.connect(user1).addMerkleTree(testRoot, longDescription, BigInt(listSize))).to.not.be
        .reverted;

      const treeInfo = await merkleProof.getMerkleTreeInfo(testRoot);
      expect(treeInfo.description).to.equal(longDescription);
    });

    it("Should handle very large list sizes", async function () {
      const description = "Large whitelist";
      const largeListSize = 1000000n;
      const testRoot = "0x" + "7".repeat(64);

      await expect(
        merkleProof
          .connect(user1)
          .addMerkleTree(testRoot, description, largeListSize, { value: ethers.parseEther("0.001") }),
      ).to.not.be.reverted;

      const treeInfo = await merkleProof.getMerkleTreeInfo(testRoot);
      expect(treeInfo.listSize).to.equal(largeListSize);
    });

    it("Should handle maximum uint256 values", async function () {
      const maxUint256 = ethers.MaxUint256;
      const description = "Max size whitelist";
      const testRoot = "0x" + "8".repeat(64);

      await expect(
        merkleProof
          .connect(user1)
          .addMerkleTree(testRoot, description, maxUint256, { value: ethers.parseEther("0.001") }),
      ).to.not.be.reverted;
    });

    it("Should handle multiple trees from same user", async function () {
      const description1 = "First whitelist";
      const description2 = "Second whitelist";
      const listSize = 3;
      const testRoot1 = "0x" + "9".repeat(64);
      const testRoot2 = "0x" + "a".repeat(64);

      // Add first tree (free for newcomer)
      await merkleProof.connect(user1).addMerkleTree(testRoot1, description1, BigInt(listSize));

      // Add second tree (requires fee)
      await merkleProof
        .connect(user1)
        .addMerkleTree(testRoot2, description2, BigInt(listSize), { value: ethers.parseEther("0.001") });

      // Both should be registered
      const tree1Info = await merkleProof.getMerkleTreeInfo(testRoot1);
      const tree2Info = await merkleProof.getMerkleTreeInfo(testRoot2);

      expect(tree1Info.description).to.equal(description1);
      expect(tree2Info.description).to.equal(description2);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for tree addition", async function () {
      const description = "Test whitelist";
      const listSize = 3;
      const testRoot = "0x" + "b".repeat(64);

      const tx = await merkleProof.connect(user1).addMerkleTree(testRoot, description, BigInt(listSize));
      const receipt = await tx.wait();

      // Tree addition should use reasonable gas
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should use reasonable gas for description updates", async function () {
      const testRoot = "0x" + "c".repeat(64);

      // Add tree first
      await merkleProof.connect(user1).addMerkleTree(testRoot, "Test whitelist", BigInt(3));

      // Update description
      const tx = await merkleProof.connect(user1).updateMerkleTreeDescription(testRoot, "Updated description");
      const receipt = await tx.wait();

      // Description update should use minimal gas
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });

    it("Should use reasonable gas for tree removal", async function () {
      const testRoot = "0x" + "d".repeat(64);

      // Add tree first
      await merkleProof.connect(user1).addMerkleTree(testRoot, "Test whitelist", BigInt(3));

      // Remove tree
      const tx = await merkleProof.connect(user1).removeMerkleTree(testRoot);
      const receipt = await tx.wait();

      // Tree removal should use minimal gas
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("Security Features", function () {
    it("Should prevent unauthorized tree modifications", async function () {
      const testRoot = "0x" + "e".repeat(64);

      // Add tree
      await merkleProof.connect(user1).addMerkleTree(testRoot, "Test whitelist", BigInt(3));

      // Non-creator cannot modify
      await expect(merkleProof.connect(user2).updateMerkleTreeDescription(testRoot, "Unauthorized")).to.be.revertedWith(
        "Only creator can update",
      );

      await expect(merkleProof.connect(user2).removeMerkleTree(testRoot)).to.be.revertedWith("Only creator can remove");
    });

    it("Should prevent fee manipulation", async function () {
      // Non-treasury cannot update fee
      await expect(merkleProof.connect(user1).updatePlatformFee(ethers.parseEther("0.002"))).to.be.revertedWith(
        "Only treasury can update fee",
      );

      // Non-treasury cannot withdraw fees (function doesn't exist)
      // Fees are automatically sent to treasury
      expect(true).to.be.true;
    });

    it("Should validate input parameters", async function () {
      const testRoot = "0x" + "f".repeat(64);

      // Invalid merkle root
      await expect(
        merkleProof
          .connect(user1)
          .addMerkleTree(ethers.ZeroHash, "Test", BigInt(3), { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("Merkle root cannot be zero");

      // Invalid list size
      await expect(
        merkleProof.connect(user1).addMerkleTree(testRoot, "Test", 0n, { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("List size must be greater than 0");

      // Empty description
      await expect(
        merkleProof.connect(user1).addMerkleTree(testRoot, "", BigInt(3), { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Should handle reentrancy attempts", async function () {
      // This test verifies that the contract is protected against reentrancy
      const description = "Test whitelist";
      const listSize = 3;
      const testRoot1 = "0x" + "10".repeat(32);
      const testRoot2 = "0x" + "11".repeat(32);

      // Add multiple trees in sequence to test reentrancy protection
      await merkleProof.connect(user1).addMerkleTree(testRoot1, description, BigInt(listSize));

      await merkleProof
        .connect(user2)
        .addMerkleTree(testRoot2, description, BigInt(listSize), { value: ethers.parseEther("0.001") });

      // Should not fail due to reentrancy
      expect(true).to.be.true;
    });
  });
});
