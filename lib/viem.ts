import { createPublicClient, createWalletClient, http, custom } from 'viem';
import type { Chain, PublicClient, WalletClient } from 'viem';
import { getChainById } from './chains';

// Create public client for a chain
export function getPublicClient(chainId: number): PublicClient {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain: chain as Chain,
    transport: http(),
  });
}

// Create wallet client (for browser wallet)
export function getWalletClient(chainId: number): WalletClient | null {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const chain = getChainById(chainId);
  if (!chain) {
    return null;
  }

  return createWalletClient({
    chain: chain as Chain,
    transport: custom(window.ethereum),
  });
}

