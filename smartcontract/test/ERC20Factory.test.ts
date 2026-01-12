import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20Factory } from "../typechain-types";

describe("ERC20Factory", function () {
  let erc20Factory: ERC20Factory;
  let owner: any;
  let user1: any;
  let user2: any;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    const ERC20FactoryFactory = await ethers.getContractFactory("ERC20Factory");
    erc20Factory = (await ERC20FactoryFactory.deploy()) as ERC20Factory;
    await erc20Factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await erc20Factory.owner()).to.equal(ownerAddress);
    });

    it("Should start with 0 tokens", async function () {
      expect(await erc20Factory.getTokenCount()).to.equal(0);
    });
  });

  describe("Token Creation", function () {
    it("Should create a new token successfully", async function () {
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = 1000000;
      const decimals = 18;

      const tx = await erc20Factory.connect(user1).createToken(tokenName, tokenSymbol, initialSupply, decimals);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "TokenCreated");

      expect(event).to.not.be.undefined;
      expect(await erc20Factory.getTokenCount()).to.equal(1);

      const tokens = await erc20Factory.getAllTokens();
      expect(tokens.length).to.equal(1);

      const userTokens = await erc20Factory.getTokensByCreator(user1Address);
      expect(userTokens.length).to.equal(1);
    });

    it("Should fail with empty name", async function () {
      await expect(erc20Factory.connect(user1).createToken("", "TEST", 1000000, 18)).to.be.revertedWith(
        "Name cannot be empty",
      );
    });

    it("Should fail with empty symbol", async function () {
      await expect(erc20Factory.connect(user1).createToken("Test Token", "", 1000000, 18)).to.be.revertedWith(
        "Symbol cannot be empty",
      );
    });

    it("Should fail with decimals > 18", async function () {
      await expect(erc20Factory.connect(user1).createToken("Test Token", "TEST", 1000000, 19)).to.be.revertedWith(
        "Decimals cannot exceed 18",
      );
    });
  });

  describe("Token Management", function () {
    let tokenAddress: string;

    beforeEach(async function () {
      const tx = await erc20Factory.connect(user1).createToken("Test Token", "TEST", 1000000, 18);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "TokenCreated");
      if (event) {
        const parsedEvent = erc20Factory.interface.parseLog(event as any)!;
        tokenAddress = parsedEvent.args[0];
        const tokenName = parsedEvent.args[1];
        const tokenSymbol = parsedEvent.args[2];
        const initialSupply = parsedEvent.args[3];
        const decimals = parsedEvent.args[4];

        expect(tokenAddress).to.not.equal(ethers.ZeroAddress);
        expect(tokenName).to.equal("Test Token");
        expect(tokenSymbol).to.equal("TEST");
        expect(initialSupply).to.equal(1000000);
        expect(decimals).to.equal(18);
      }
    });

    it("Should track created tokens correctly", async function () {
      const tokens = await erc20Factory.getAllTokens();
      expect(tokens).to.include(tokenAddress);
    });

    it("Should track token creators correctly", async function () {
      expect(await erc20Factory.tokenCreators(tokenAddress)).to.equal(user1Address);
    });

    it("Should allow users to create multiple tokens", async function () {
      await erc20Factory.connect(user1).createToken("Test Token 2", "TEST2", 500000, 18);

      expect(await erc20Factory.getTokenCount()).to.equal(2);

      const userTokens = await erc20Factory.getTokensByCreator(user1Address);
      expect(userTokens.length).to.equal(2);
    });
  });
});
