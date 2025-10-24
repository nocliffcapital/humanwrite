'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { usePublicClient, useAccount } from 'wagmi';
import type { Abi, Address } from 'viem';
import { getKeyReadFunctions, type ParsedFunction } from '@/lib/abi';

interface KeyReadsProps {
  address: Address;
  abi: Abi;
  chainId: number;
}

interface ReadResult {
  name: string;
  value: string;
  error?: string;
}

export function KeyReads({ address, abi, chainId }: KeyReadsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<ReadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const publicClient = usePublicClient({ chainId });
  const { address: userAddress } = useAccount();

  const keyFunctions = getKeyReadFunctions(abi);

  useEffect(() => {
    if (isOpen && keyFunctions.length > 0 && !loading) {
      fetchKeyReads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, address, abi]);

  const fetchKeyReads = async () => {
    if (!publicClient) return;

    setLoading(true);
    const newResults: ReadResult[] = [];

    for (const func of keyFunctions) {
      try {
        // Determine args based on function
        let args: any[] = [];
        
        if (func.name === 'balanceOf' && userAddress && func.inputs.length === 1) {
          args = [userAddress];
        } else if (func.name === 'allowance' && userAddress && func.inputs.length === 2) {
          // Skip allowance for now (needs spender input)
          continue;
        } else if (func.inputs.length > 0) {
          // Skip functions that require inputs
          continue;
        }

        const data = await publicClient.readContract({
          address,
          abi,
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
          error: 'Failed to read',
        });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  const formatValue = (value: any, func: ParsedFunction): string => {
    if (value === null || value === undefined) return 'null';

    // Handle specific function types
    if (func.name === 'decimals' || func.name === 'totalSupply') {
      return value.toString();
    }

    if (func.name === 'paused') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'bigint') {
      // For large numbers, show in readable format
      const str = value.toString();
      if (str.length > 18) {
        const decimals = str.length - 18;
        const intPart = str.slice(0, -18) || '0';
        const decPart = str.slice(-18, -18 + 4);
        return `${intPart}.${decPart}... (${str.length} digits)`;
      }
      return str;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  };

  if (keyFunctions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700/50 shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-all rounded-xl"
      >
        <h2 className="text-lg font-bold text-white">Key Reads</h2>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-700">
          {loading && results.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-400 mt-2">Loading contract data...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-3">
                  <label className="text-sm text-gray-400 block mb-1">
                    {result.name}()
                  </label>
                  {result.error ? (
                    <p className="text-red-400 text-sm">{result.error}</p>
                  ) : (
                    <p className="text-white font-mono text-sm break-all">
                      {result.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">
              No key read functions found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

