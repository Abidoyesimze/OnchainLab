import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MerkleValidatorModule", (m) => {
  const merkleValidator = m.contract("MerkleProofValidator");

  return { merkleValidator };
});



