"use client";

import { useState } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { Abi, AbiFunction } from "abitype";
import { Address, TransactionReceipt } from "viem";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import {
  ContractInput,
  TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { IntegerInput } from "~~/components/ui";
import { useTargetNetwork } from "~~/hooks/core/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/core";

type WriteOnlyFunctionFormProps = {
  abi: Abi;
  abiFunction: AbiFunction;
  onChange: () => void;
  contractAddress: Address;
  inheritedFrom?: string;
};

// Helper function to convert ethers receipt to viem format
const convertEthersReceiptToViem = (receipt: ethers.ContractTransactionReceipt): TransactionReceipt => {
  return {
    blockHash: receipt.blockHash,
    blockNumber: BigInt(receipt.blockNumber),
    contractAddress: receipt.contractAddress || null,
    cumulativeGasUsed: BigInt(receipt.gasUsed),
    effectiveGasPrice: receipt.gasPrice ? BigInt(receipt.gasPrice.toString()) : BigInt(0),
    from: receipt.from,
    gasUsed: BigInt(receipt.gasUsed.toString()),
    logs: receipt.logs.map(log => ({
      address: log.address,
      topics: log.topics as `0x${string}`[],
      data: log.data as `0x${string}`,
      blockNumber: BigInt(log.blockNumber),
      blockHash: log.blockHash as `0x${string}`,
      transactionHash: log.transactionHash as `0x${string}`,
      transactionIndex: log.index,
      logIndex: log.index,
      removed: log.removed || false,
    })),
    logsBloom: receipt.logsBloom as `0x${string}`,
    status: receipt.status === 1 ? "success" : "reverted",
    to: receipt.to || null,
    transactionHash: receipt.hash as `0x${string}`,
    transactionIndex: receipt.index,
    type: "legacy",
  } as TransactionReceipt;
};

export const WriteOnlyFunctionForm = ({
  abi,
  abiFunction,
  onChange,
  contractAddress,
  inheritedFrom,
}: WriteOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
  const [txValue, setTxValue] = useState<string>("");
  const { chain, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [isPending, setIsPending] = useState(false);
  const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();

  const writeDisabled = !isConnected || !chain || chain?.id !== targetNetwork.id;

  const handleWrite = async () => {
    if (!window.ethereum) {
      notification.error("MetaMask or wallet provider not found");
      return;
    }

    if (!isConnected) {
      notification.error("Please connect your wallet");
      return;
    }

    setIsPending(true);
    setDisplayedTxResult(undefined);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi as ethers.InterfaceAbi, signer);
      const args = getParsedContractFunctionArgs(form);
      const value = txValue ? BigInt(txValue) : BigInt(0);

      // Estimate gas first (optional, for better UX)
      try {
        await contract[abiFunction.name].estimateGas(...args, { value });
      } catch (estimateError: any) {
        const parsedError = getParsedError(estimateError);
        notification.error(parsedError);
        throw estimateError;
      }

      // Execute the transaction
      const tx = await contract[abiFunction.name](...args, { value });
      const receipt = await tx.wait();

      // Convert ethers receipt to viem format
      const viemReceipt = convertEthersReceiptToViem(receipt);
      setDisplayedTxResult(viemReceipt);

      onChange();
      notification.success("Transaction successful!");
    } catch (error: any) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
      console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", error);
    } finally {
      setIsPending(false);
    }
  };

  const transformedFunction = transformAbiFunction(abiFunction);
  const inputs = transformedFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={updatedFormValue => {
          setDisplayedTxResult(undefined);
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });
  const zeroInputs = inputs.length === 0 && abiFunction.stateMutability !== "payable";

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div className={`flex gap-3 ${zeroInputs ? "flex-row justify-between items-center" : "flex-col"}`}>
        <p className="font-medium my-0 break-words">
          {abiFunction.name}
          <InheritanceTooltip inheritedFrom={inheritedFrom} />
        </p>
        {inputs}
        {abiFunction.stateMutability === "payable" ? (
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center ml-2">
              <span className="text-xs font-medium mr-2 leading-none">payable value</span>
              <span className="block text-xs font-extralight leading-none">wei</span>
            </div>
            <IntegerInput
              value={txValue}
              onChange={updatedTxValue => {
                setDisplayedTxResult(undefined);
                setTxValue(updatedTxValue);
              }}
              placeholder="value (wei)"
            />
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          {!zeroInputs && (
            <div className="grow basis-0">{displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}</div>
          )}
          <div
            className={`flex ${
              writeDisabled &&
              "tooltip tooltip-bottom tooltip-secondary before:content-[attr(data-tip)] before:-translate-x-1/3 before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <button className="btn btn-secondary btn-sm" disabled={writeDisabled || isPending} onClick={handleWrite}>
              {isPending && <span className="loading loading-spinner loading-xs"></span>}
              Send 💸
            </button>
          </div>
        </div>
      </div>
      {zeroInputs && displayedTxResult ? (
        <div className="grow basis-0">
          <TxReceipt txResult={displayedTxResult} />
        </div>
      ) : null}
    </div>
  );
};
