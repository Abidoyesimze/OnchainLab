import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("YourContractModule", (m) => {
  // Owner address - set via parameter during deployment or use deployer's address
  // Example: npx hardhat ignition deploy --network mantleSepolia ignition/modules/YourContract.ts --parameters '{"YourContractModule":{"owner":"0x..."}}'
  // If not provided, deployer will be the owner
  const deployer = m.getAccount(0);
  const owner = m.getParameter("owner", deployer);

  const yourContract = m.contract("YourContract", [owner]);

  return { yourContract };
});

