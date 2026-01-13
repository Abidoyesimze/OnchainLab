import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ERC20FactoryModule", (m) => {
  const erc20Factory = m.contract("ERC20Factory");

  return { erc20Factory };
});

