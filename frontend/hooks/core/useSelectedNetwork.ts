import { targetNetworks } from "~~/config/networks";
import { useGlobalState } from "~~/services/store/store";
import { AllowedChainIds, ChainWithAttributes, NETWORKS_EXTRA_DATA } from "~~/utils/core";

/**
 * Given a chainId, retrieves the network object from config/networks,
 * if not found default to network set by `useTargetNetwork` hook
 */
export function useSelectedNetwork(chainId?: AllowedChainIds): ChainWithAttributes {
  const globalTargetNetwork = useGlobalState(({ targetNetwork }) => targetNetwork);
  const targetNetwork = targetNetworks.find(targetNetwork => targetNetwork.id === chainId);

  if (targetNetwork) {
    return { ...targetNetwork, ...NETWORKS_EXTRA_DATA[targetNetwork.id] };
  }

  return globalTargetNetwork;
}
