import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MerkleProofModule", (m) => {
  // Treasury address - set via parameter during deployment or use deployer's address
  // Example: npx hardhat ignition deploy --network mantleSepolia ignition/modules/MerkleProof.ts --parameters '{"MerkleProofModule":{"treasury":"0x..."}}'
  // If not provided, you'll need to set it manually. For now, using deployer as default.
  const deployer = m.getAccount(0);
  const treasury = m.getParameter("treasury", deployer);

  const merkleProof = m.contract("MerkleProofX", [treasury]);

  return { merkleProof };
});

