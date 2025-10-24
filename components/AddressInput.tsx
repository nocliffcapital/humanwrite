'use client';

import { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { FileCode2 } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  supportsENS?: boolean;
}

export function AddressInput({
  value,
  onChange,
  placeholder = 'Enter contract address or ENS name',
  supportsENS = false,
}: AddressInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!value) {
      setIsValid(null);
      return;
    }

    // Check if valid address
    if (value.startsWith('0x')) {
      setIsValid(isAddress(value));
    } else if (value.endsWith('.eth') && supportsENS) {
      setIsValid(true); // Will be validated when resolved
    } else {
      setIsValid(false);
    }
  }, [value, supportsENS]);

  const getBorderColor = () => {
    if (isValid === null) return 'border-gray-700';
    if (isValid) return 'border-green-500';
    return 'border-red-500';
  };

  return (
    <div className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <FileCode2 className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-3 bg-gray-900 text-white rounded-xl border ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
        />
      </div>
      {/* Fixed height container to prevent layout shift */}
      <div className="min-h-[24px] mt-1">
        {isValid === false && (
          <p className="text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
            {value.endsWith('.eth') && !supportsENS
              ? 'ENS not supported on this network'
              : 'Invalid address format'}
          </p>
        )}
      </div>
    </div>
  );
}

