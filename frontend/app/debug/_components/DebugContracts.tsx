"use client";

import { useEffect, useMemo } from "react";
import { useSessionStorage } from "usehooks-ts";
import { BarsArrowUpIcon } from "@heroicons/react/20/solid";
import { ContractUI } from "~~/app/debug/_components/contract";
import { ContractName, GenericContract } from "~~/utils/core/contract";
import { useAllContracts } from "~~/utils/core/contractsData";

const selectedContractStorageKey = "onchainlab.selectedContract";

export function DebugContracts() {
  const contractsData = useAllContracts();
  const contractNames = useMemo(
    () =>
      Object.keys(contractsData).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      }) as ContractName[],
    [contractsData],
  );

  const [selectedContract, setSelectedContract] = useSessionStorage<ContractName>(
    selectedContractStorageKey,
    contractNames[0],
    { initializeWithValue: false },
  );

  useEffect(() => {
    if (!contractNames.includes(selectedContract)) {
      setSelectedContract(contractNames[0]);
    }
  }, [contractNames, selectedContract, setSelectedContract]);

  return (
    <div className="space-y-6">
      {contractNames.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-gray-300 mb-2">No Contracts Found</h3>
          <p className="text-gray-400">No deployed contracts available for debugging</p>
        </div>
      ) : (
        <>
          {contractNames.length > 1 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {contractNames.map(contractName => (
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    contractName === selectedContract
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "bg-[#0f1a2e] text-gray-300 hover:bg-[#1a2332] hover:text-white border border-[#2a3b54]"
                  }`}
                  key={contractName}
                  onClick={() => setSelectedContract(contractName)}
                >
                  <div className="flex items-center gap-2">
                    <span>{contractName}</span>
                    {(contractsData[contractName] as GenericContract)?.external && (
                      <BarsArrowUpIcon className="h-4 w-4 text-emerald-400" title="External contract" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {contractNames.map(contractName => (
            <div
              key={contractName}
              className={contractName === selectedContract ? "block" : "hidden"}
            >
              <ContractUI
                contractName={contractName}
                className=""
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
