'use client';

import { getAddress, type Abi } from 'viem';
import { ExternalLink, Copy, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { ContractMetadata } from '@/lib/explorers';
import type { ProxyInfo } from '@/lib/proxy';
import { getChainById } from '@/lib/chains';
import { useState, useEffect } from 'react';
import { SecurityAudit } from './SecurityAudit';
import { usePublicClient, useAccount } from 'wagmi';
import { getKeyReadFunctions, type ParsedFunction } from '@/lib/abi';

interface ContractSummaryProps {
  address: string;
  chainId: number;
  metadata?: ContractMetadata;
  proxyInfo?: ProxyInfo;
}

interface ReadResult {
  name: string;
  value: string;
  error?: string;
}

export function ContractSummary({
  address,
  chainId,
  metadata,
  proxyInfo,
}: ContractSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [keyReadsOpen, setKeyReadsOpen] = useState(false);
  const [keyReadResults, setKeyReadResults] = useState<ReadResult[]>([]);
  const [loadingKeyReads, setLoadingKeyReads] = useState(false);
  
  const chain = getChainById(chainId);
  const checksummedAddress = getAddress(address);
  const publicClient = usePublicClient({ chainId });
  const { address: userAddress } = useAccount();
  
  const keyFunctions = metadata?.abi ? getKeyReadFunctions(metadata.abi) : [];
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Fetch token name and symbol for main display
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!publicClient || !metadata?.abi) return;
      
      try {
        const nameData = await publicClient.readContract({
          address: checksummedAddress,
          abi: metadata.abi,
          functionName: 'name',
        });
        setTokenName(nameData as string);
      } catch {
        // Not a token or name() not available
      }
      
      try {
        const symbolData = await publicClient.readContract({
          address: checksummedAddress,
          abi: metadata.abi,
          functionName: 'symbol',
        });
        setTokenSymbol(symbolData as string);
      } catch {
        // Not a token or symbol() not available
      }
    };
    
    fetchTokenInfo();
  }, [publicClient, metadata?.abi, checksummedAddress]);

  const explorerUrl = chain
    ? `${chain.explorerUrl}/address/${checksummedAddress}`
    : '#';
    
  // Fetch key reads when expanded
  useEffect(() => {
    if (keyReadsOpen && keyFunctions.length > 0 && !loadingKeyReads && metadata?.abi) {
      fetchKeyReads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyReadsOpen]);
  
  const fetchKeyReads = async () => {
    if (!publicClient || !metadata?.abi) return;

    setLoadingKeyReads(true);
    const newResults: ReadResult[] = [];

    for (const func of keyFunctions) {
      try {
        let args: any[] = [];
        
        if (func.name === 'balanceOf' && userAddress && func.inputs.length === 1) {
          args = [userAddress];
        } else if (func.inputs.length > 0) {
          continue;
        }

        const data = await publicClient.readContract({
          address: checksummedAddress,
          abi: metadata.abi,
          functionName: func.name,
          args,
        });

        newResults.push({
          name: func.name,
          value: formatValue(data, func),
        });
      } catch (error) {
        newResults.push({
          name: func.name,
          value: '',
          error: 'Failed',
        });
      }
    }

    setKeyReadResults(newResults);
    setLoadingKeyReads(false);
  };
  
  const formatValue = (value: any, func: ParsedFunction): string => {
    if (value === null || value === undefined) return 'null';

    if (func.name === 'decimals' || func.name === 'totalSupply') {
      return value.toString();
    }

    if (func.name === 'paused') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'bigint') {
      const str = value.toString();
      if (str.length > 18) {
        const intPart = str.slice(0, -18) || '0';
        const decPart = str.slice(-18, -18 + 4);
        return `${intPart}.${decPart}...`;
      }
      return str;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      if (value.length > 42 && value.startsWith('0x')) {
        return `${value.slice(0, 10)}...${value.slice(-8)}`;
      }
      return value;
    }

    return String(value);
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 shadow-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Contract Overview</h2>
        {/* Security Audit Button */}
        {metadata?.abi && (
          <SecurityAudit
            address={checksummedAddress}
            chainId={chainId}
            contractName={metadata.name}
            abi={metadata.abi}
          />
        )}
      </div>

      {/* Proxy Warning */}
      {proxyInfo?.isProxy && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-yellow-200 font-medium text-sm mb-1">Proxy: {proxyInfo.proxyType}</p>
              {proxyInfo.implementation && (
                <code className="text-yellow-300/80 text-xs font-mono break-all">
                  {proxyInfo.implementation}
                </code>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact Layout */}
      <div className="space-y-2.5 text-sm">
        {/* Row 1: Name and Network */}
        <div className="grid grid-cols-2 gap-6">
          {/* Contract Name */}
          {metadata?.name && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 whitespace-nowrap w-16">Name:</span>
              <span className="text-white font-mono font-medium">{metadata.name}</span>
            </div>
          )}

          {/* Network */}
          <div className="flex items-center gap-3 justify-end">
            <span className="text-gray-400 whitespace-nowrap">Network:</span>
            <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs font-medium flex items-center gap-1.5">
              {chain?.logo && (
                <img
                  src={chain.logo}
                  alt={chain.name}
                  className="w-3 h-3 rounded-full object-contain bg-white/10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {chain?.name}
            </span>
          </div>
        </div>

        {/* Row 1.5: Token Name and Symbol (if available) */}
        {(tokenName || tokenSymbol) && (
          <div className="grid grid-cols-2 gap-6">
            {/* Token Name */}
            {tokenName && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 whitespace-nowrap w-16">Token:</span>
                <span className="text-blue-300 font-medium">{tokenName}</span>
              </div>
            )}

            {/* Token Symbol */}
            {tokenSymbol && (
              <div className="flex items-center gap-3 justify-end">
                <span className="text-gray-400 whitespace-nowrap">Symbol:</span>
                <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs font-mono font-medium">
                  {tokenSymbol}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Row 2: Address */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 whitespace-nowrap w-16">Address:</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <code className="text-white font-mono text-xs bg-gray-900 px-2 py-1 rounded truncate">
              {checksummedAddress}
            </code>
            <button
              onClick={() => copyToClipboard(checksummedAddress)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
              title="Copy address"
            >
              {copied ? (
                <span className="text-green-400 text-xs">✓</span>
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
              title="View on explorer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </a>
          </div>
        </div>

        {/* Row 3: Verification */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 whitespace-nowrap w-16">Verified:</span>
          {metadata?.verified ? (
            <span className="inline-flex items-center gap-1 text-green-400 text-xs">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              {chain?.explorerName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-400 text-xs">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              No
            </span>
          )}
        </div>
      </div>

      {/* Key Reads Section */}
      {keyFunctions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <button
            onClick={() => setKeyReadsOpen(!keyReadsOpen)}
            className="flex items-center justify-between w-full text-left group"
          >
            <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              Quick Info {keyReadResults.length > 0 && `(${keyReadResults.length})`}
            </span>
            {keyReadsOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-all" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-all" />
            )}
          </button>

          {keyReadsOpen && (
            <div className="mt-3 space-y-1.5">
              {loadingKeyReads ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              ) : keyReadResults.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {keyReadResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/30"
                    >
                      <div className="text-xs text-gray-400 mb-1">{result.name}</div>
                      {result.error ? (
                        <div className="text-xs text-red-400">{result.error}</div>
                      ) : (
                        <div className="text-sm text-white font-mono truncate" title={result.value}>
                          {result.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">No data available</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

