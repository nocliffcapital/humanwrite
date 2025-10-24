'use client';

import { supportedChains, getChainById } from '@/lib/chains';
import { ChevronDown } from 'lucide-react';

interface ChainSelectProps {
  value: number;
  onChange: (chainId: number) => void;
}

export function ChainSelect({ value, onChange }: ChainSelectProps) {
  const selectedChain = getChainById(value);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
        {selectedChain && (
          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center p-0.5">
            <img
              src={selectedChain.logo}
              alt={selectedChain.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full pl-12 pr-10 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
        style={{
          backgroundImage: 'none',
        }}
      >
        <optgroup label="Mainnets" className="bg-gray-900">
          {supportedChains
            .filter((chain) => !chain.testnet)
            .map((chain) => (
              <option key={chain.id} value={chain.id} className="bg-gray-900">
                {chain.name}
              </option>
            ))}
        </optgroup>
        <optgroup label="Testnets" className="bg-gray-900">
          {supportedChains
            .filter((chain) => chain.testnet)
            .map((chain) => (
              <option key={chain.id} value={chain.id} className="bg-gray-900">
                {chain.name}
              </option>
            ))}
        </optgroup>
      </select>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}

