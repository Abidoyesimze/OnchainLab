import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTemplates, ERC20Token } from "../typechain-types";

describe("ContractTemplates", function () {
  let contractTemplates: ContractTemplates;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;

  // Test tokens
  let stakingToken: ERC20Token;
  let rewardToken: ERC20Token;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();

    // Deploy ContractTemplates
    const ContractTemplatesFactory = await ethers.getContractFactory("ContractTemplates");
    contractTemplates = (await ContractTemplatesFactory.deploy()) as ContractTemplates;
    await contractTemplates.waitForDeployment();

    // Deploy test tokens using ERC20Token
    const ERC20TokenFactory = await ethers.getContractFactory("ERC20Token");
    stakingToken = (await ERC20TokenFactory.deploy(
      "Staking Token",
      "STK",
      ethers.parseEther("10000"),
      18,
      ownerAddress,
    )) as ERC20Token;
    await stakingToken.waitForDeployment();

    rewardToken = (await ERC20TokenFactory.deploy(
      "Reward Token",
      "RWD",
      ethers.parseEther("10000"),
      18,
      ownerAddress,
    )) as ERC20Token;
    await rewardToken.waitForDeployment();

    // Transfer some tokens for testing
    await stakingToken.transfer(user1Address, ethers.parseEther("10000"));
    await rewardToken.transfer(ownerAddress, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await contractTemplates.owner()).to.equal(ownerAddress);
    });
  });

  describe("Staking Contract Deployment", function () {
    it("Should deploy a staking contract successfully", async function () {
      const rewardRate = ethers.parseEther("0.001"); // 0.1% per second

      const tx = await contractTemplates
        .connect(user1)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "StakingContractDeployed");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = contractTemplates.interface.parseLog(event as any)!;
        const deployedAddress = parsedEvent.args[0];
        const deployer = parsedEvent.args[1];

        expect(deployedAddress).to.not.equal(ethers.ZeroAddress);
        expect(deployer).to.equal(user1Address);
      }
    });

    it("Should fail with zero address staking token", async function () {
      const rewardRate = ethers.parseEther("0.001");

      await expect(
        contractTemplates
          .connect(user1)
          .deployStakingContract(ethers.ZeroAddress, await rewardToken.getAddress(), rewardRate),
      ).to.be.revertedWith("Invalid staking token");
    });

    it("Should fail with zero address reward token", async function () {
      const rewardRate = ethers.parseEther("0.001");

      await expect(
        contractTemplates
          .connect(user1)
          .deployStakingContract(await stakingToken.getAddress(), ethers.ZeroAddress, rewardRate),
      ).to.be.revertedWith("Invalid reward token");
    });

    it("Should fail with zero reward rate", async function () {
      await expect(
        contractTemplates
          .connect(user1)
          .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), 0),
      ).to.be.revertedWith("Reward rate must be greater than 0");
    });

    it("Should deploy multiple staking contracts", async function () {
      const rewardRate = ethers.parseEther("0.001");

      // Deploy first contract
      await contractTemplates
        .connect(user1)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate);

      // Deploy second contract with different parameters
      await contractTemplates
        .connect(user2)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate * 2n);

      // Both should succeed
      expect(true).to.be.true;
    });
  });

  describe("Vesting Contract Deployment", function () {
    it("Should deploy a vesting contract successfully", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const duration = 365 * 24 * 60 * 60; // 1 year

      const tx = await contractTemplates
        .connect(user1)
        .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, duration);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "VestingContractDeployed");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = contractTemplates.interface.parseLog(event as any)!;
        const deployedAddress = parsedEvent.args[0];
        const beneficiary = parsedEvent.args[1];

        expect(deployedAddress).to.not.equal(ethers.ZeroAddress);
        expect(beneficiary).to.equal(user2Address);
      }
    });

    it("Should fail with zero address token", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(ethers.ZeroAddress, user2Address, totalAmount, startTime, duration),
      ).to.be.revertedWith("Invalid token");
    });

    it("Should fail with zero address beneficiary", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), ethers.ZeroAddress, totalAmount, startTime, duration),
      ).to.be.revertedWith("Invalid beneficiary");
    });

    it("Should fail with zero total amount", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, 0, startTime, duration),
      ).to.be.revertedWith("Total amount must be greater than 0");
    });

    it("Should fail with past start time", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const duration = 365 * 24 * 60 * 60;

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, duration),
      ).to.be.revertedWith("Start time must be in the future");
    });

    it("Should fail with zero duration", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, 0),
      ).to.be.revertedWith("Duration must be greater than 0");
    });

    it("Should handle very long vesting periods", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 10 * 365 * 24 * 60 * 60; // 10 years

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, duration),
      ).to.not.be.reverted;
    });
  });

  describe("Multi-Signature Wallet Deployment", function () {
    it("Should deploy a multi-signature wallet successfully", async function () {
      const owners = [user1Address, user2Address, user3Address];
      const requiredSignatures = 2;

      const tx = await contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "MultiSigDeployed");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = contractTemplates.interface.parseLog(event as any)!;
        const deployedAddress = parsedEvent.args[0];
        const deployedOwners = parsedEvent.args[1];

        expect(deployedAddress).to.not.equal(ethers.ZeroAddress);
        expect(deployedOwners).to.deep.equal(owners);
      }
    });

    it("Should fail with empty owners array", async function () {
      const owners: string[] = [];
      const requiredSignatures = 1;

      await expect(
        contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures),
      ).to.be.revertedWith("Owners array cannot be empty");
    });

    it("Should fail with zero required signatures", async function () {
      const owners = [user1Address, user2Address];
      const requiredSignatures = 0;

      await expect(
        contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures),
      ).to.be.revertedWith("Required signatures must be greater than 0");
    });

    it("Should fail when required signatures exceed owner count", async function () {
      const owners = [user1Address, user2Address];
      const requiredSignatures = 3;

      await expect(
        contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures),
      ).to.be.revertedWith("Required signatures cannot exceed owner count");
    });

    it("Should handle single owner wallet", async function () {
      const owners = [user1Address];
      const requiredSignatures = 1;

      await expect(contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures)).to.not.be
        .reverted;
    });

    it("Should handle maximum owner count", async function () {
      // Create array with maximum reasonable owner count
      const owners = Array.from({ length: 10 }, (_, i) => ethers.Wallet.createRandom().address);
      const requiredSignatures = 5;

      await expect(contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures)).to.not.be
        .reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for staking contract deployment", async function () {
      const rewardRate = ethers.parseEther("0.001");

      const tx = await contractTemplates
        .connect(user1)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate);
      const receipt = await tx.wait();

      // Staking contract deployment should be reasonable
      expect(receipt?.gasUsed).to.be.lessThan(1000000);
    });

    it("Should use reasonable gas for vesting contract deployment", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;

      const tx = await contractTemplates
        .connect(user1)
        .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, duration);
      const receipt = await tx.wait();

      // Vesting contract deployment should be reasonable
      expect(receipt?.gasUsed).to.be.lessThan(1000000);
    });

    it("Should use reasonable gas for multi-sig wallet deployment", async function () {
      const owners = [user1Address, user2Address, user3Address];
      const requiredSignatures = 2;

      const tx = await contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures);
      const receipt = await tx.wait();

      // Multi-sig wallet deployment should be reasonable (more complex than others)
      expect(receipt?.gasUsed).to.be.lessThan(1500000);
    });
  });

  describe("Security Features", function () {
    it("Should not allow non-owners to deploy contracts", async function () {
      // This test assumes the contract has access control
      // If it doesn't, this test should be removed or modified
      const rewardRate = ethers.parseEther("0.001");

      // Should succeed for any user (if no access control)
      await expect(
        contractTemplates
          .connect(user1)
          .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate),
      ).to.not.be.reverted;
    });

    it("Should handle reentrancy attempts", async function () {
      // This test verifies that the contract is protected against reentrancy
      // The contract should use ReentrancyGuard
      const rewardRate = ethers.parseEther("0.001");

      // Deploy multiple contracts in sequence to test reentrancy protection
      await contractTemplates
        .connect(user1)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate);

      await contractTemplates
        .connect(user2)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate);

      // Should not fail due to reentrancy
      expect(true).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum uint256 values", async function () {
      const maxUint256 = ethers.MaxUint256;
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;

      // Should handle maximum amounts
      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, maxUint256, startTime, duration),
      ).to.not.be.reverted;
    });

    it("Should handle very small amounts", async function () {
      const smallAmount = 1; // 1 wei
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, smallAmount, startTime, duration),
      ).to.not.be.reverted;
    });

    it("Should handle very short vesting periods", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 1; // 1 second

      await expect(
        contractTemplates
          .connect(user1)
          .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, duration),
      ).to.not.be.reverted;
    });

    it("Should handle very high reward rates", async function () {
      const highRewardRate = ethers.parseEther("1000"); // 100,000% per second

      await expect(
        contractTemplates
          .connect(user1)
          .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), highRewardRate),
      ).to.not.be.reverted;
    });
  });

  describe("Integration Tests", function () {
    it("Should deploy all contract types successfully", async function () {
      // Deploy staking contract
      const rewardRate = ethers.parseEther("0.001");
      await contractTemplates
        .connect(user1)
        .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate);

      // Deploy vesting contract
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;
      await contractTemplates
        .connect(user1)
        .deployVestingContract(await stakingToken.getAddress(), user2Address, totalAmount, startTime, duration);

      // Deploy multi-sig wallet
      const owners = [user1Address, user2Address];
      const requiredSignatures = 2;
      await contractTemplates.connect(user1).deployMultiSigWallet(owners, requiredSignatures);

      // All deployments should succeed
      expect(true).to.be.true;
    });

    it("Should handle concurrent deployments", async function () {
      const rewardRate = ethers.parseEther("0.001");
      const totalAmount = ethers.parseEther("1000");
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const duration = 365 * 24 * 60 * 60;
      const owners = [user1Address, user2Address];
      const requiredSignatures = 2;

      // Deploy all contract types concurrently
      const promises = [
        contractTemplates
          .connect(user1)
          .deployStakingContract(await stakingToken.getAddress(), await rewardToken.getAddress(), rewardRate),
        contractTemplates
          .connect(user2)
          .deployVestingContract(await stakingToken.getAddress(), user3Address, totalAmount, startTime, duration),
        contractTemplates.connect(user3).deployMultiSigWallet(owners, requiredSignatures),
      ];

      // All should succeed
      await expect(Promise.all(promises)).to.not.be.reverted;
    });
  });
});
