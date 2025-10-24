'use client';

import { useState, useEffect } from 'react';
import type { AbiParameter } from 'viem';
import { UnitInput } from './UnitInput';
import { getParamHint } from '@/lib/translate';
import { createSchemaForType } from '@/lib/validation';
import { HelpCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import { isAddress, isHex } from 'viem';

interface ParamFieldProps {
  param: AbiParameter;
  index: number;
  value: any;
  onChange: (value: any) => void;
  decimals?: number;
  functionName?: string; // Add function name for context
}

// Get constraint info for a type
function getTypeConstraints(type: string, textMode?: boolean): string | null {
  if (type === 'address') return 'A wallet address (like 0x1234...) or ENS name (like vitalik.eth)';
  if (type === 'bytes32') {
    if (textMode) {
      return 'Text Mode: Just type your text (up to 32 characters). It will be automatically converted to the correct format.';
    }
    return 'Hex Mode: Enter 0x followed by exactly 64 hexadecimal characters (0-9, a-f). Or switch to Text Mode for easier input!';
  }
  if (type === 'bytes') return 'Hex data starting with 0x (e.g., 0x1234abcd)';
  if (type.match(/^bytes\d+$/)) {
    const size = parseInt(type.replace('bytes', ''), 10);
    return `Hex data: 0x followed by exactly ${size * 2} hex characters`;
  }
  if (type.startsWith('uint')) return 'A positive whole number (e.g., 100, 1000, no decimals or negative values)';
  if (type.startsWith('int')) return 'Any whole number, positive or negative (e.g., -50, 0, 100, no decimals)';
  if (type === 'string') return 'Any text you want';
  if (type.endsWith('[]')) {
    const baseType = type.replace('[]', '');
    if (baseType.startsWith('uint') || baseType.startsWith('int')) {
      return 'Smart Input: Just type numbers separated by commas (e.g., "1, 2, 3"). Brackets added automatically!';
    }
    return 'Smart Input: Just type items separated by commas (e.g., "item1, item2, item3"). Quotes and brackets added automatically!';
  }
  return null;
}

// Validate input based on type
function validateInput(value: string, type: string): { valid: boolean; error?: string } {
  if (!value || value === '') {
    return { valid: true }; // Empty is OK, required check is elsewhere
  }

  // Address validation
  if (type === 'address') {
    if (!value.startsWith('0x') || value.length !== 42) {
      return { valid: false, error: 'Address must be 42 characters starting with 0x' };
    }
    if (!isAddress(value)) {
      return { valid: false, error: 'Invalid address checksum' };
    }
  }

  // Bytes validation
  if (type.startsWith('bytes')) {
    if (type === 'bytes32') {
      // Allow text (will be encoded) or hex
      if (value.startsWith('0x')) {
        if (value.length !== 66) { // 0x + 64 hex chars
          return { valid: false, error: `bytes32 requires exactly 66 chars (0x + 64 hex). Current: ${value.length}` };
        }
        if (!isHex(value)) {
          return { valid: false, error: 'Invalid hex format' };
        }
      }
      // If not hex, assume text - will be padded/encoded
    } else if (type === 'bytes') {
      if (!value.startsWith('0x')) {
        return { valid: false, error: 'Bytes must start with 0x' };
      }
      if (!isHex(value)) {
        return { valid: false, error: 'Invalid hex format' };
      }
    } else {
      // bytesN (fixed size)
      const size = parseInt(type.replace('bytes', ''), 10);
      const expectedLength = 2 + size * 2; // 0x + N*2 hex chars
      
      if (!value.startsWith('0x')) {
        return { valid: false, error: `${type} must start with 0x` };
      }
      if (value.length !== expectedLength) {
        return { valid: false, error: `${type} requires exactly ${expectedLength} chars (0x + ${size * 2} hex). Current: ${value.length}` };
      }
      if (!isHex(value)) {
        return { valid: false, error: 'Invalid hex format' };
      }
    }
  }

  // Integer validation
  if (type.startsWith('uint') || type.startsWith('int')) {
    if (value.includes('.')) {
      return { valid: false, error: 'Integers cannot have decimal points' };
    }
    const num = BigInt(value);
    if (type.startsWith('uint') && num < 0n) {
      return { valid: false, error: 'uint must be positive' };
    }
  }

  return { valid: true };
}

export function ParamField({
  param,
  index,
  value,
  onChange,
  decimals,
  functionName,
}: ParamFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [textMode, setTextMode] = useState(false); // For bytes32 text input
  const [arrayDisplayValue, setArrayDisplayValue] = useState(''); // For array input display
  
  const hint = getParamHint(param, functionName); // Pass function name for context
  const paramName = param.name || `param${index}`;
  const constraints = getTypeConstraints(param.type, textMode);
  
  // Check if this is a bytes32 field (special handling for text conversion)
  const isBytes32 = param.type === 'bytes32';
  
  // Sync arrayDisplayValue when value is externally cleared
  useEffect(() => {
    if (param.type.endsWith('[]') && (!value || value === '')) {
      setArrayDisplayValue('');
    }
  }, [value, param.type]);

  // Helper to convert text to bytes32 hex
  const textToBytes32 = (text: string): string => {
    // Convert text to hex
    const hexString = Array.from(text)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    
    // Pad to 64 chars (32 bytes)
    const paddedHex = hexString.padEnd(64, '0');
    
    return '0x' + paddedHex;
  };
  
  // Handler for text mode input
  const handleTextModeChange = (text: string) => {
    if (text === '') {
      onChange('');
    } else {
      // Automatically convert to bytes32
      onChange(textToBytes32(text));
    }
  };

  useEffect(() => {
    // Validate on change
    if (value !== '' && value !== null && value !== undefined) {
      // Custom validation
      const validation = validateInput(value.toString(), param.type);
      
      if (!validation.valid) {
        setError(validation.error || 'Invalid value');
        setWarning(null);
      } else {
        setError(null);
        
        // Set warnings for common issues
        if (param.type === 'bytes32' && !value.startsWith('0x') && value.length > 32) {
          setWarning('Text will be truncated to 32 bytes');
        } else if (param.type === 'address' && value.length === 42 && !isAddress(value)) {
          setWarning('Address checksum may be invalid');
        } else {
          setWarning(null);
        }
      }
    } else {
      setError(null);
      setWarning(null);
    }
  }, [value, param.type]);

  // Check if this param should use UnitInput
  const useUnitInput =
    hint.unitType !== 'none' &&
    (param.type.startsWith('uint') ||
      param.type.startsWith('int') ||
      param.type === 'bytes32');

  // Smart array parser: converts "item1, item2, item3" to ["item1", "item2", "item3"]
  const parseArrayInput = (input: string): string => {
    if (!input || input.trim() === '') return '';
    
    const trimmed = input.trim();
    
    // If it already looks like valid JSON (starts with [ and ends with ]), keep it as-is
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        JSON.parse(trimmed); // Validate it's valid JSON
        return trimmed;
      } catch {
        // Invalid JSON, fall through to smart parsing
      }
    }
    
    // Otherwise, treat as comma-separated list and auto-format
    // Split by comma and trim each item
    const items = trimmed.split(',').map(item => item.trim()).filter(item => item !== '');
    
    // Detect if items are numbers (for number arrays like uint256[])
    const baseType = param.type.replace('[]', '');
    const isNumberArray = baseType.startsWith('uint') || baseType.startsWith('int');
    const isAddressArray = baseType === 'address';
    
    if (isNumberArray) {
      // For number arrays, don't add quotes
      return `[${items.join(', ')}]`;
    } else {
      // For string/address/bytes arrays, wrap each item in quotes
      const quotedItems = items.map(item => {
        // If item is already quoted, don't double-quote
        if ((item.startsWith('"') && item.endsWith('"')) || 
            (item.startsWith("'") && item.endsWith("'"))) {
          return item;
        }
        return `"${item}"`;
      });
      return `[${quotedItems.join(', ')}]`;
    }
  };

  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Convert based on type
    if (param.type === 'bool') {
      onChange(newValue === 'true');
    } else if (param.type === 'address') {
      onChange(newValue);
    } else if (param.type.startsWith('uint') || param.type.startsWith('int')) {
      onChange(newValue);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          {paramName}
          <span className="ml-2 text-gray-500 font-mono text-xs">
            {param.type}
          </span>
        </label>
        {hint.description && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-500 hover:text-gray-300"
              type="button"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 z-10 w-64 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs text-gray-300">
                {hint.description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode Toggle for bytes32 */}
      {isBytes32 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">Input Mode:</span>
          <button
            type="button"
            onClick={() => {
              setTextMode(false);
              onChange(''); // Clear on mode switch
            }}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              !textMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Hex
          </button>
          <button
            type="button"
            onClick={() => {
              setTextMode(true);
              onChange(''); // Clear on mode switch
            }}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              textMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📝 Text (Easy)
          </button>
        </div>
      )}

      {/* Constraints Info */}
      {constraints && !error && !warning && (
        <div className="flex items-start gap-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">{constraints}</p>
        </div>
      )}

      {useUnitInput ? (
        <UnitInput
          param={param}
          value={value || '0'}
          onChange={onChange}
          decimals={decimals}
        />
      ) : param.type === 'bool' ? (
        <select
          value={value?.toString() || 'false'}
          onChange={(e) => onChange(e.target.value === 'true')}
          className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      ) : param.type.endsWith('[]') ? (
        <div className="space-y-2">
          <textarea
            value={arrayDisplayValue}
            onChange={(e) => {
              const userInput = e.target.value;
              setArrayDisplayValue(userInput);
              
              // Parse and update the actual value
              const parsed = parseArrayInput(userInput);
              onChange(parsed);
            }}
            placeholder={`Just type: item1, item2, item3 (quotes and brackets added automatically!)`}
            rows={3}
            className={`w-full px-4 py-2 bg-gray-900 text-white border ${
              error ? 'border-red-500' : 'border-gray-700'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm`}
          />
          {value && value.trim() && value !== arrayDisplayValue && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <p className="text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Formatted JSON:
              </p>
              <code className="text-xs text-green-400">{value}</code>
            </div>
          )}
        </div>
      ) : isBytes32 && textMode ? (
        // Special text mode for bytes32
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={value ? 
                // Try to decode hex back to text for display
                (value.startsWith('0x') ? 
                  (() => {
                    try {
                      const hex = value.slice(2).replace(/0+$/, ''); // Remove padding
                      return hex.match(/.{1,2}/g)?.map((byte: string) =>
                        String.fromCharCode(parseInt(byte, 16))
                      ).join('') || '';
                    } catch {
                      return '';
                    }
                  })()
                  : value)
                : ''
              }
              onChange={(e) => handleTextModeChange(e.target.value)}
              placeholder="Type your text here (e.g., Hello World)"
              maxLength={32}
              className={`w-full px-4 py-2 bg-gray-900 text-white border ${
                error ? 'border-red-500' : warning ? 'border-yellow-500' : 'border-gray-700'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className="absolute right-2 top-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {value && value.startsWith('0x') ? 
                Math.ceil((value.length - 2) / 2) : 0} / 32 chars
            </div>
          </div>
          {value && (
            <div className="text-xs text-gray-400 p-2 bg-gray-800/50 rounded font-mono break-all">
              <span className="text-gray-500">Converted to:</span> {value}
            </div>
          )}
        </div>
      ) : (
        // Default input for other types
        <div className="relative">
          <input
            type="text"
            value={value || ''}
            onChange={handleBasicChange}
            placeholder={hint.example}
            className={`w-full px-4 py-2 bg-gray-900 text-white border ${
              error ? 'border-red-500' : warning ? 'border-yellow-500' : 'border-gray-700'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
          />
          {/* Character counter for bytes types */}
          {param.type.startsWith('bytes') && value && !textMode && (
            <div className="absolute right-2 top-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {value.length} chars
              {param.type.match(/^bytes\d+$/) && (
                <span className="ml-1">
                  / {2 + parseInt(param.type.replace('bytes', ''), 10) * 2}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Warning Message */}
      {warning && !error && (
        <div className="flex items-start gap-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300">{warning}</p>
        </div>
      )}
    </div>
  );
}

