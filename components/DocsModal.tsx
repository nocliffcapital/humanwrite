'use client';

import { X, Code, Shield, Zap, Database, Link as LinkIcon, GitBranch, CheckCircle2, Settings } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsModal({ isOpen, onClose }: DocsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 max-w-4xl w-full shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Technical Documentation</h2>
            <p className="text-blue-100 text-sm mt-1">How Human Write Contract Works</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
            aria-label="Close documentation"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-gray-300">
          {/* Overview */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-400" />
              Overview
            </h3>
            <p className="leading-relaxed">
              Human Write Contract is a next-generation interface for interacting with smart contracts. 
              It translates complex blockchain interactions into human-readable formats with built-in safety checks, 
              free transaction simulation, and intelligent input helpers.
            </p>
          </section>

          {/* Architecture */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-400" />
              Architecture
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-white mb-2">Frontend Stack</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Next.js 15</strong> - React framework with server-side rendering</li>
                  <li>• <strong>TypeScript</strong> - Type-safe development</li>
                  <li>• <strong>Tailwind CSS</strong> - Modern utility-first styling</li>
                  <li>• <strong>Jotai</strong> - Lightweight state management</li>
                </ul>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-white mb-2">Blockchain Integration</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>wagmi v2</strong> - React hooks for Ethereum</li>
                  <li>• <strong>viem</strong> - TypeScript interface for Ethereum</li>
                  <li>• <strong>Zod</strong> - Runtime type validation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-blue-400 mb-2">Multi-Chain Support</h4>
                <p className="text-sm">
                  Supports 9 networks including Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, 
                  Avalanche, and their testnets. Works without API keys via Sourcify fallback.
                </p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-purple-400 mb-2">ENS Resolution</h4>
                <p className="text-sm">
                  Resolves Ethereum Name Service addresses on Ethereum mainnet and Sepolia testnet.
                </p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-green-400 mb-2">Free Simulation</h4>
                <p className="text-sm">
                  Uses viem&apos;s <code className="bg-gray-900 px-1 rounded">simulateContract</code> to 
                  test transactions client-side before sending.
                </p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-red-400 mb-2">Safety Guards</h4>
                <p className="text-sm">
                  Detects dangerous functions (transfer, withdraw, etc.) and requires extra confirmation.
                </p>
              </div>
            </div>
          </section>

          {/* ABI Fetching */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-green-400" />
              Smart ABI Fetching
            </h3>
            <p className="leading-relaxed mb-3">
              The app uses a <strong>multi-source fallback system</strong> to fetch contract ABIs, 
              ensuring maximum availability without requiring API keys:
            </p>
            
            {/* Fallback Strategy */}
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-500/30 mb-4">
              <h4 className="font-semibold text-green-300 mb-3">Smart Fetch Strategy (Sourcify First!):</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">1.</span>
                  <div>
                    <strong className="text-white">Sourcify</strong> (decentralized, IPFS-based)
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Free, no API key needed, great coverage
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <div>
                    <strong className="text-white flex items-center gap-1">
                      Your API Key 
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        (if added in 
                        <Settings className="h-3 w-3" />
                        Settings)
                      </span>
                    </strong>
                    <p className="text-xs text-gray-400 mt-1">Unlimited requests, works when Sourcify doesn&apos;t have it</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">3.</span>
                  <div>
                    <strong className="text-white">Built-in API Key</strong> (server-side fallback)
                    <p className="text-xs text-gray-400 mt-1">Shared rate limit, last resort</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* How It Works */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <h4 className="font-semibold text-white mb-2">Fetch Process:</h4>
              <ol className="space-y-2 text-sm">
                <li>1. User enters contract address and selects network</li>
                <li>2. <strong className="text-green-400">Tries Sourcify first</strong> (free, decentralized, no API key)</li>
                <li>3. If Sourcify doesn&apos;t have it, tries Etherscan-family explorers</li>
                <li>4. Uses your API key (if provided), then built-in key</li>
                <li>5. Response includes ABI, contract name, verification status</li>
                <li>6. Proxy detection checks EIP-1967/1822 slots</li>
                <li>7. If proxy, fetches implementation ABI automatically</li>
              </ol>
            </div>

            {/* API Key Storage */}
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30 mt-4">
              <h4 className="font-semibold text-yellow-300 mb-2">API Key Storage</h4>
              <p className="text-sm text-yellow-200">
                Your API key is stored in browser <code className="bg-gray-900 px-1 rounded">localStorage</code> - 
                it stays on your device, persists across sessions, and is never sent to our servers. 
                Only used when calling blockchain explorers.
              </p>
            </div>
          </section>

          {/* Unit Translation */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Code className="h-5 w-5 text-orange-400" />
              Smart Input Translation
            </h3>
            <p className="leading-relaxed mb-3">
              The app intelligently detects parameter types and provides appropriate helpers:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <strong className="text-white">Amount Parameters</strong>
                <p className="text-xs mt-1">Detects: amount, value, balance</p>
                <p className="text-xs text-gray-400">→ Converts ETH ↔ Wei automatically</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <strong className="text-white">Percentage</strong>
                <p className="text-xs mt-1">Detects: rate, fee, percent</p>
                <p className="text-xs text-gray-400">→ Converts % ↔ basis points</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <strong className="text-white">Timestamps</strong>
                <p className="text-xs mt-1">Detects: deadline, timestamp</p>
                <p className="text-xs text-gray-400">→ Converts dates ↔ Unix time</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <strong className="text-white">Bytes32</strong>
                <p className="text-xs mt-1">Detects: bytes32, hash</p>
                <p className="text-xs text-gray-400">→ Converts text ↔ bytes32</p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              Security Features
            </h3>
            <div className="space-y-3">
              <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-300 mb-2">Dangerous Function Detection</h4>
                <p className="text-sm mb-2">
                  Functions like <code className="bg-gray-900 px-1 rounded">transfer</code>, 
                  <code className="bg-gray-900 px-1 rounded ml-1">withdraw</code>, 
                  <code className="bg-gray-900 px-1 rounded ml-1">approve</code> trigger extra warnings.
                </p>
                <p className="text-xs text-red-200">
                  Users must type &quot;I understand&quot; before executing these functions.
                </p>
              </div>

              <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                <h4 className="font-semibold text-green-300 mb-2">Network Mismatch Warning</h4>
                <p className="text-sm">
                  If your wallet is on a different network than the contract, you&apos;ll get a warning 
                  before attempting any transaction.
                </p>
              </div>

              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                <h4 className="font-semibold text-blue-300 mb-2">Input Validation</h4>
                <p className="text-sm">
                  All inputs are validated with Zod schemas before submission. Invalid addresses, 
                  amounts, or types are caught before hitting the blockchain.
                </p>
              </div>
            </div>
          </section>

          {/* Open Source */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-cyan-400" />
              Open Source & Privacy
            </h3>
            <div className="space-y-3">
              <p className="leading-relaxed">
                This project is built with open-source technologies and follows Web3 best practices. 
                All contract interactions happen client-side after ABI fetching.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <h4 className="font-semibold text-green-400 text-sm mb-1">✓ Private Keys</h4>
                  <p className="text-xs text-gray-400">Never leave your wallet - only you control them</p>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <h4 className="font-semibold text-green-400 text-sm mb-1">✓ API Keys</h4>
                  <p className="text-xs text-gray-400">Stored locally in your browser, never on servers</p>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <h4 className="font-semibold text-green-400 text-sm mb-1">✓ Transactions</h4>
                  <p className="text-xs text-gray-400">Simulated & signed entirely in your browser</p>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <h4 className="font-semibold text-green-400 text-sm mb-1">✓ No Tracking</h4>
                  <p className="text-xs text-gray-400">No analytics, cookies, or data collection</p>
                </div>
              </div>
            </div>
          </section>
        </div>

          {/* Footer */}
          <div className="p-6 bg-gray-900/50 rounded-b-2xl border-t border-gray-700/50">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all font-semibold"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

