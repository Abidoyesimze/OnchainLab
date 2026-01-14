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
    // Configure timeout (15 seconds) for RPC requests
    const httpConfig = { timeout: 15000 };
    let rpcFallbacks = [http(httpConfig)];

    const rpcOverrideUrls = rpcOverrides[chain.id];
    if (rpcOverrideUrls && Array.isArray(rpcOverrideUrls)) {
      // Create fallback transports for each RPC endpoint with timeout
      rpcFallbacks = rpcOverrideUrls.map(url => http(url, httpConfig));
      // Add default as final fallback
      rpcFallbacks.push(http(httpConfig));
    } else if (typeof rpcOverrideUrls === 'string') {
      // Backward compatibility: single string URL
      rpcFallbacks = [http(rpcOverrideUrls, httpConfig), http(httpConfig)];
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey = !alchemyApiKey;
        // If using default API key, we prioritize the default RPC
        rpcFallbacks = isUsingDefaultKey 
          ? [http(httpConfig), http(alchemyHttpUrl, httpConfig)] 
          : [http(alchemyHttpUrl, httpConfig), http(httpConfig)];
      }
    }

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      pollingInterval: pollingInterval,
    });
  },
});
