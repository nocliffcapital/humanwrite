'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { getAddress, type Address } from 'viem';
import { Loader2, Wallet, BookOpen, Github, Twitter, Settings, PenLine, Search, Package } from 'lucide-react';
import { AddressInput } from '@/components/AddressInput';
import { ChainSelect } from '@/components/ChainSelect';
import { ContractSummary } from '@/components/ContractSummary';
import { FunctionCard } from '@/components/FunctionCard';
import { WalletButton } from '@/components/WalletButton';
import { DocsModal } from '@/components/DocsModal';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import { fetchAbi, fetchImplementationAbi, type ContractMetadata } from '@/lib/explorers';
import { detectProxyFull, type ProxyInfo } from '@/lib/proxy';
import { parseWriteFunctions } from '@/lib/abi';
import { getChainById } from '@/lib/chains';
import { mainnet } from 'wagmi/chains';

// Cache key for localStorage
const CACHE_KEY = 'hwc_loaded_contract';

export default function Home() {
  const [contractInput, setContractInput] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number>(mainnet.id);
  const [resolvedAddress, setResolvedAddress] = useState<Address | null>(null);
  const [metadata, setMetadata] = useState<ContractMetadata | null>(null);
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openFunctionIndex, setOpenFunctionIndex] = useState<number | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  const [functionSearch, setFunctionSearch] = useState('');

  const publicClient = usePublicClient({ chainId: selectedChainId });

  const chain = getChainById(selectedChainId);

  // Load cached contract on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        console.log('Restored cached contract:', data.address);
        
        setContractInput(data.address);
        setSelectedChainId(data.chainId);
        setResolvedAddress(data.address as Address);
        setMetadata(data.metadata);
        setProxyInfo(data.proxyInfo || null);
        setRestoredFromCache(true);
        
        // Auto-hide cache indicator after 3 seconds
        setTimeout(() => setRestoredFromCache(false), 3000);
      }
    } catch (err) {
      console.error('Failed to load cached contract:', err);
      localStorage.removeItem(CACHE_KEY);
    }
  }, []);

  // Save to cache whenever contract data changes
  useEffect(() => {
    if (!resolvedAddress || !metadata) return;
    
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData = {
        address: resolvedAddress,
        chainId: selectedChainId,
        metadata,
        proxyInfo,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Cached contract data');
    } catch (err) {
      console.error('Failed to cache contract:', err);
    }
  }, [resolvedAddress, metadata, proxyInfo, selectedChainId]);

  // Reset when chain changes (but only clear UI, not cache)
  useEffect(() => {
    setResolvedAddress(null);
    setMetadata(null);
    setProxyInfo(null);
    setError(null);
    setFunctionSearch(''); // Clear search when changing chains
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY); // Clear cache on chain change
    }
  }, [selectedChainId]);
  
  // Reset search when contract changes
  useEffect(() => {
    setFunctionSearch('');
  }, [resolvedAddress]);
  
  // Clear cache function
  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
    setContractInput('');
    setResolvedAddress(null);
    setMetadata(null);
    setProxyInfo(null);
    setError(null);
    setOpenFunctionIndex(null);
    console.log('Cleared contract cache');
  };

  // Load contract
  const handleLoad = async () => {
    if (!contractInput.trim() || !publicClient) return;

    setLoading(true);
    setError(null);
    setMetadata(null);
    setProxyInfo(null);
    setResolvedAddress(null);

    try {
      let address: Address;

      // Check if ENS
      if (contractInput.endsWith('.eth')) {
        if (!chain?.supportsENS) {
          throw new Error('ENS is not supported on this network');
        }

        // Resolve ENS
        const resolved = await publicClient.getEnsAddress({
          name: contractInput,
        });

        if (!resolved) {
          throw new Error('ENS name could not be resolved');
        }

        address = resolved;
      } else {
        // Validate address
        try {
          address = getAddress(contractInput);
        } catch {
          throw new Error('Invalid address format. Please enter a valid Ethereum address (0x...)');
        }
      }

      setResolvedAddress(address);

      // Fetch ABI and metadata
      const contractMetadata = await fetchAbi(address, selectedChainId);
      
      // Detect proxy
      const proxy = await detectProxyFull(publicClient, address);
      setProxyInfo(proxy);

      // If proxy detected, ALWAYS use implementation ABI (this is where the real functions are!)
      const implementationAddress = proxy.implementation || contractMetadata.implementation;
      if (proxy.isProxy && implementationAddress) {
        try {
          console.log(`Proxy detected - fetching implementation ABI from ${implementationAddress}`);
          const implAbi = await fetchImplementationAbi(implementationAddress, selectedChainId);
          if (implAbi) {
            // Replace proxy ABI with implementation ABI (this has the actual contract functions)
            contractMetadata.abi = implAbi;
            console.log('Using implementation ABI for write functions');
          }
        } catch (err) {
          console.warn('Could not fetch implementation ABI, using proxy ABI:', err);
        }
      }

      setMetadata(contractMetadata);
    } catch (err: any) {
      setError(err.message || 'Failed to load contract');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const writeFunctions = metadata ? parseWriteFunctions(metadata.abi) : [];
  
  // Filter functions based on search query
  const filteredWriteFunctions = writeFunctions.filter(func => {
    if (!functionSearch.trim()) return true;
    const searchLower = functionSearch.toLowerCase();
    return (
      func.name.toLowerCase().includes(searchLower) ||
      func.signature.toLowerCase().includes(searchLower) ||
      func.displayName.toLowerCase().includes(searchLower)
    );
  });

  const canLoad =
    contractInput.trim() &&
    (contractInput.startsWith('0x') || contractInput.endsWith('.eth'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 border-b border-gray-800/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <PenLine className="h-5 w-5 text-blue-400" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Human Write Contract
              </h1>
            </div>

            {/* Settings & Wallet */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-all group"
                aria-label="Settings"
                title="API Settings"
              >
                <Settings className="h-5 w-5 text-gray-400 group-hover:text-blue-400 group-hover:rotate-90 transition-all" />
              </button>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Load Contract</h2>
            <p className="text-gray-400 text-sm">Enter a verified contract address to interact with its functions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contract Address or ENS
              </label>
              <AddressInput
                value={contractInput}
                onChange={setContractInput}
                supportsENS={chain?.supportsENS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
              <ChainSelect value={selectedChainId} onChange={setSelectedChainId} />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLoad}
              disabled={!canLoad || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-blue-500/25 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading Contract...
                </>
              ) : (
                'Load Contract'
              )}
            </button>
            
            {(resolvedAddress || contractInput) && (
              <button
                onClick={clearCache}
                disabled={loading}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                title="Clear loaded contract"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cache Restored Indicator */}
          {restoredFromCache && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-green-300 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <Package className="h-4 w-4" />
                Contract restored from cache
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
              <p className="text-red-200 text-sm font-medium whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>

        {/* Contract Info & Functions */}
        {resolvedAddress && metadata && (
          <div className="space-y-6">
            {/* Contract Summary with Key Reads */}
            <ContractSummary
              address={resolvedAddress}
              chainId={selectedChainId}
              metadata={metadata}
              proxyInfo={proxyInfo || undefined}
            />

            {/* Write Functions */}
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h2 className="text-2xl font-bold text-white">
                    Write Functions
                  </h2>
                  {/* Search Bar */}
                  {writeFunctions.length > 0 && (
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={functionSearch}
                        onChange={(e) => setFunctionSearch(e.target.value)}
                        placeholder="Search functions..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {functionSearch && (
                        <button
                          onClick={() => setFunctionSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm">
                  Interact with state-changing functions on this contract
                  {functionSearch && (
                    <span className="ml-2 text-blue-400">
                      ({filteredWriteFunctions.length} of {writeFunctions.length} shown)
                    </span>
                  )}
                </p>
              </div>

              {writeFunctions.length > 0 ? (
                filteredWriteFunctions.length > 0 ? (
                <div className="space-y-4">
                  {filteredWriteFunctions.map((func, idx) => (
                    <div
                      key={`${func.name}-${idx}`}
                      className={`transition-opacity duration-200 ${
                        openFunctionIndex !== null && openFunctionIndex !== idx
                          ? 'opacity-40'
                          : 'opacity-100'
                      }`}
                    >
                      <FunctionCard
                        func={func}
                        contractAddress={resolvedAddress}
                        abi={metadata.abi}
                        chainId={selectedChainId}
                        isOpen={openFunctionIndex === idx}
                        onToggle={() => setOpenFunctionIndex(openFunctionIndex === idx ? null : idx)}
                      />
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <Search className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium mb-2">
                      No functions match &quot;{functionSearch}&quot;
                    </p>
                    <button
                      onClick={() => setFunctionSearch('')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Clear search
                    </button>
                  </div>
                )
              ) : (
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-medium">
                    No write functions found in this contract
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !resolvedAddress && !error && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-2xl mb-6 border border-blue-500/20">
              <Wallet className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              No Contract Loaded
            </h2>
            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
              Enter a contract address or ENS name above, select a network, and click
              &quot;Load Contract&quot; to get started.
            </p>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1.5 bg-blue-500/10 text-blue-300 rounded-lg text-xs font-medium border border-blue-500/20">
                Multi-chain
              </span>
              <span className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-lg text-xs font-medium border border-purple-500/20">
                ENS Support
              </span>
              <span className="px-3 py-1.5 bg-green-500/10 text-green-300 rounded-lg text-xs font-medium border border-green-500/20">
                Free Simulation
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
                      <PenLine className="h-4 w-4 text-blue-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-white font-bold">Human Write Contract</h3>
                  </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                A human-readable interface for interacting with smart contracts across 
                multiple chains with built-in safety features and free simulation.
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Multi-chain support (9 networks)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  ENS name resolution
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  Free transaction simulation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                  Dangerous function warnings
                </li>
              </ul>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <div className="space-y-3">
                <button
                  onClick={() => setShowDocs(true)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-all group"
                >
                  <BookOpen className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Technical Documentation</span>
                </button>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-all group"
                >
                  <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>View on GitHub</span>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-all group"
                >
                  <Twitter className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Follow Updates</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Human Write Contract. Built for Web3.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Next.js 15</span>
              <span>•</span>
              <span>wagmi v2</span>
              <span>•</span>
              <span>viem</span>
              <span>•</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ApiKeySettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <DocsModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
}

