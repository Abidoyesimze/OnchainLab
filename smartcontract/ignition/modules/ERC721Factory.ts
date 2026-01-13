import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ERC721FactoryModule", (m) => {
  const erc721Factory = m.contract("ERC721Factory");

  return { erc721Factory };
});

