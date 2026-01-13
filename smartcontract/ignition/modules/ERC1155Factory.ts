import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ERC1155FactoryModule", (m) => {
  const erc1155Factory = m.contract("ERC1155Factory");

  return { erc1155Factory };
});

