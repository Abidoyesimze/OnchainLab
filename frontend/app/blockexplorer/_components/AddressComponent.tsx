import { BackButton } from "./BackButton";
import { ContractTabs } from "./ContractTabs";
import { Address, Balance } from "~~/components/ui";

export const AddressComponent = ({
  address,
  contractData,
}: {
  address: string;
  contractData: { bytecode: string; assembly: string } | null;
}) => {
  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-start mb-5">
          <BackButton />
        </div>
        
        {/* Address Header */}
        <div className="bg-[#1c2941] rounded-xl p-6 mb-6 border border-[#2a3b54] shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-emerald-400 mb-2">Address Details</h1>
              <Address address={address} format="long" onlyEnsOrAddress />
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Balance</div>
              <Balance address={address} className="text-lg font-semibold text-white" />
            </div>
          </div>
        </div>

        {/* Contract Information */}
        {contractData ? (
          <div className="bg-[#1c2941] rounded-xl p-6 mb-6 border border-[#2a3b54] shadow-xl">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Contract Information</h2>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="font-medium">This is a verified contract</span>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                Contract source code and bytecode are available for inspection.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#1c2941] rounded-xl p-6 mb-6 border border-[#2a3b54] shadow-xl">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Address Information</h2>
            <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="font-medium">External Address</span>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                This address is not a verified OnchainLab contract. It may be an external contract or EOA.
              </p>
            </div>
          </div>
        )}

        {/* Contract Tabs */}
        <ContractTabs address={address} contractData={contractData} />
      </div>
    </div>
  );
};
