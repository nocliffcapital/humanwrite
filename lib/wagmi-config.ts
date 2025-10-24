'use client';

import { createConfig, http } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { supportedChains } from './chains';

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains as any,
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
    coinbaseWallet({
      appName: 'Human Write Contract',
    }),
  ],
  transports: supportedChains.reduce((acc, chain) => {
    acc[chain.id] = http();
    return acc;
  }, {} as Record<number, ReturnType<typeof http>>),
});

