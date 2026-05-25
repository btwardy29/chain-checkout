"use client";

import { createConfig, http } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, sepolia],
  connectors: [
    injected({
      shimDisconnect: true,
      target() {
        return {
          id: "injected",
          name: "Browser wallet",
          provider: typeof window !== "undefined" ? window.ethereum : undefined
        };
      }
    })
  ],
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http()
  },
  ssr: true
});
