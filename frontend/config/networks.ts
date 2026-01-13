import * as chains from "viem/chains";

// Define Mantle Sepolia Testnet chain
export const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia Testnet",
  network: "mantle-sepolia",
  nativeCurrency: {
    name: "Mantle Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.mantle.xyz"] },
    public: { http: ["https://rpc.sepolia.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.sepolia.mantle.xyz" },
  },
  testnet: true,
} as const;

export const targetNetworks = [mantleSepolia] as const;

export const pollingInterval = 30000;

export const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64";

export const rpcOverrides: Record<number, string> = {
  [mantleSepolia.id]: "https://rpc.sepolia.mantle.xyz",
};
