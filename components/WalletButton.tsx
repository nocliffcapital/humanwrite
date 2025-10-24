'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet } from 'lucide-react';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Only render after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches server HTML
    return (
      <div className="w-32 h-10 bg-gray-800 rounded-lg animate-pulse" />
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white rounded-xl transition-all shadow-lg border border-gray-700/50"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="font-mono text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  // Show only the first available connector (usually injected/MetaMask)
  const primaryConnector = connectors[0];
  
  if (!primaryConnector) {
    return null;
  }

  return (
    <button
      onClick={() => connect({ connector: primaryConnector })}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500/25"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </button>
  );
}

