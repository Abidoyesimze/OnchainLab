import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ContractAnalyzerModule", (m) => {
  const contractAnalyzer = m.contract("ContractAnalyzer");

  return { contractAnalyzer };
});



