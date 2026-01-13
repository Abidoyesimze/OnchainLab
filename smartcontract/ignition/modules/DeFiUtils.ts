import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeFiUtilsModule", (m) => {
  const deFiUtils = m.contract("DeFiUtils");

  return { deFiUtils };
});

