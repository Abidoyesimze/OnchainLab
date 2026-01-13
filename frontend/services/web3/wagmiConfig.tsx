import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { createConfig } from "wagmi";
import { targetNetworks, pollingInterval, rpcOverrides } from "~~/config/networks";
import { getAlchemyHttpUrl } from "~~/utils/core";

// Use only the target networks (EVM-compatible)
export const enabledChains = targetNetworks;

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    let rpcFallbacks = [http()];

    const rpcOverrideUrl = rpcOverrides[chain.id];
    if (rpcOverrideUrl) {
      rpcFallbacks = [http(rpcOverrideUrl), http()];
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey = !alchemyApiKey;
        // If using default API key, we prioritize the default RPC
        rpcFallbacks = isUsingDefaultKey ? [http(), http(alchemyHttpUrl)] : [http(alchemyHttpUrl), http()];
      }
    }

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      pollingInterval: pollingInterval,
    });
  },
});
