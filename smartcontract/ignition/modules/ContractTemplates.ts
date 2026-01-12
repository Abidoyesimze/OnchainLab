import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ContractTemplatesModule", (m) => {
  const contractTemplates = m.contract("ContractTemplates");

  return { contractTemplates };
});



