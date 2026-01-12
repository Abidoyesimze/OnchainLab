import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractAnalyzer } from "../typechain-types";

describe("ContractAnalyzer", function () {
  let contractAnalyzer: ContractAnalyzer;
  let owner: any;
  let user1: any;
  let testContract: any;
  let ownerAddress: string;
  let user1Address: string;
  let testContractAddress: string;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();

    // Deploy ContractAnalyzer
    const ContractAnalyzerFactory = await ethers.getContractFactory("ContractAnalyzer");
    contractAnalyzer = (await ContractAnalyzerFactory.deploy()) as ContractAnalyzer;
    await contractAnalyzer.waitForDeployment();

    // Deploy a simple test contract for analysis
    const TestContractFactory = await ethers.getContractFactory("ERC20Factory");
    testContract = await TestContractFactory.deploy();
    await testContract.waitForDeployment();
    testContractAddress = await testContract.getAddress();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await contractAnalyzer.owner()).to.equal(ownerAddress);
    });
  });

  describe("Contract Analysis", function () {
    it("Should analyze a contract successfully", async function () {
      const tx = await contractAnalyzer.analyzeContract(testContractAddress);
      const receipt = await tx.wait();

      // Find the ContractAnalyzed event
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "ContractAnalyzed");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = contractAnalyzer.interface.parseLog(event as any)!;
        const analysis = parsedEvent.args[1]; // The analysis struct is the second argument
        expect(analysis.isContract).to.be.true;
        expect(analysis.codeSize).to.be.greaterThan(0);
        expect(analysis.estimatedDeploymentGas).to.be.greaterThan(21000);
        expect(analysis.contractSize).to.be.greaterThan(0);
      }
    });

    it("Should handle non-contract addresses", async function () {
      const tx = await contractAnalyzer.analyzeContract(user1Address);
      const receipt = await tx.wait();

      // Find the ContractAnalyzed event
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "ContractAnalyzed");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = contractAnalyzer.interface.parseLog(event as any)!;
        const analysis = parsedEvent.args[1]; // The analysis struct is the second argument
        expect(analysis.isContract).to.be.false;
        expect(analysis.codeSize).to.equal(0);
        expect(analysis.estimatedDeploymentGas).to.equal(0);
      }
    });

    it("Should fail with zero address", async function () {
      await expect(contractAnalyzer.analyzeContract(ethers.ZeroAddress)).to.be.revertedWith("Invalid contract address");
    });
  });

  describe("Basic Contract Info", function () {
    it("Should get basic contract information", async function () {
      const [codeSize, balance, isContract] = await contractAnalyzer.getBasicInfo(testContractAddress);

      expect(isContract).to.be.true;
      expect(codeSize).to.be.greaterThan(0);
      expect(balance).to.equal(0); // New contract has no balance
    });
  });

  describe("Deployment Cost Calculation", function () {
    it("Should calculate deployment cost correctly", async function () {
      const codeSize = 1000; // 1KB
      const gasPrice = ethers.parseEther("0.000000001"); // 1 gwei

      const deploymentCost = await contractAnalyzer.calculateDeploymentCost(codeSize, gasPrice);

      // Expected: (21000 + 1000 * 200) * gasPrice
      const expectedGas = BigInt(21000 + 1000 * 200);
      const expectedCost = expectedGas * gasPrice;

      expect(deploymentCost).to.equal(expectedCost);
    });
  });

  describe("Function Detection", function () {
    it("Should detect if contract has functions", async function () {
      const functionSelector = ethers.id("createToken(string,string,uint256,uint8)").slice(0, 10);

      const hasFunction = await contractAnalyzer.hasFunction(testContractAddress, functionSelector);

      // Basic check - if contract has code, assume it has functions
      expect(hasFunction).to.be.true;
    });
  });

  describe("Gas Estimation", function () {
    it("Should estimate gas for valid function calls", async function () {
      // Use a view function instead of a state-changing function
      const functionData = testContract.interface.encodeFunctionData("getTokenCount", []);

      const functionSelector = functionData.slice(0, 10);

      const tx = await contractAnalyzer.estimateGas(testContractAddress, functionSelector, functionData);

      const receipt = await tx.wait();

      // Find the GasEstimated event
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "GasEstimated");

      expect(event).to.not.be.undefined;

      if (event) {
        const parsedEvent = contractAnalyzer.interface.parseLog(event as any)!;
        const estimate = parsedEvent.args[2]; // The estimate struct is the third argument
        expect(estimate.success).to.be.true;
        expect(estimate.gasPrice).to.be.greaterThan(0);
      }
    });
  });
});
