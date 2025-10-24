'use client';

import { useState, useEffect } from 'react';
import {
  parseEther,
  parseGwei,
  parseUnits,
  formatEther,
  formatGwei,
  formatUnits,
} from 'viem';
import type { AbiParameter } from 'viem';
import { inferUnitType, type UnitType } from '@/lib/translate';
import { Calendar, Hash, Info } from 'lucide-react';

interface UnitInputProps {
  param: AbiParameter;
  value: string;
  onChange: (rawValue: string) => void;
  decimals?: number;
}

type TabType = 'raw' | 'wei' | 'gwei' | 'ether' | 'token' | 'bps' | 'timestamp' | 'text';

// Unit descriptions for tooltips
const UNIT_DESCRIPTIONS: Record<TabType, string> = {
  raw: 'The actual value stored on the blockchain (smallest unit)',
  wei: '1 Wei = 0.000000000000000001 ETH (smallest ETH unit)',
  gwei: '1 Gwei = 0.000000001 ETH (commonly used for gas prices)',
  ether: '1 ETH = 1,000,000,000 Gwei = 1,000,000,000,000,000,000 Wei',
  token: 'Human-readable token amount (e.g., 1.5 USDC)',
  bps: 'Basis points: 100 bps = 1%, 10000 bps = 100%',
  timestamp: 'Unix timestamp (seconds since Jan 1, 1970)',
  text: 'Convert readable text to bytes32 format',
};

export function UnitInput({ param, value, onChange, decimals }: UnitInputProps) {
  const unitType = inferUnitType(param);
  const [activeTab, setActiveTab] = useState<TabType>('raw');
  const [displayValue, setDisplayValue] = useState('');
  const [dateValue, setDateValue] = useState('');

  // Initialize tab based on unit type
  useEffect(() => {
    if (unitType === 'token') {
      // For token types, prefer Token tab if decimals available, otherwise Ether
      if (decimals !== undefined) {
        setActiveTab('token');
      } else {
        setActiveTab('ether');
      }
    } else if (unitType === 'bps') {
      setActiveTab('bps');
    } else if (unitType === 'timestamp') {
      setActiveTab('timestamp');
    } else if (unitType === 'bytes32-text') {
      setActiveTab('text');
    } else {
      setActiveTab('raw');
    }
  }, [unitType, decimals]);

  // Update display value when raw value or tab changes
  useEffect(() => {
    if (!value || value === '0') {
      setDisplayValue('');
      return;
    }

    try {
      switch (activeTab) {
        case 'ether':
          setDisplayValue(formatEther(BigInt(value)));
          break;
        case 'gwei':
          setDisplayValue(formatGwei(BigInt(value)));
          break;
        case 'token':
          if (decimals !== undefined) {
            setDisplayValue(formatUnits(BigInt(value), decimals));
          }
          break;
        case 'bps':
          const bps = Number(value);
          setDisplayValue((bps / 100).toFixed(2));
          break;
        case 'timestamp':
          if (value) {
            const date = new Date(Number(value) * 1000);
            setDateValue(date.toISOString().slice(0, 16));
          }
          break;
        case 'text':
          // Decode hex to text if possible
          if (value.startsWith('0x')) {
            try {
              const hex = value.slice(2);
              const text = Buffer.from(hex, 'hex')
                .toString('utf8')
                .replace(/\0/g, '');
              setDisplayValue(text);
            } catch {
              setDisplayValue('');
            }
          }
          break;
        default:
          setDisplayValue(value);
      }
    } catch {
      setDisplayValue('');
    }
  }, [value, activeTab, decimals]);

  const handleDisplayChange = (newDisplay: string) => {
    setDisplayValue(newDisplay);

    if (!newDisplay) {
      onChange('0');
      return;
    }

    try {
      let rawValue = '0';

      switch (activeTab) {
        case 'ether':
          rawValue = parseEther(newDisplay).toString();
          break;
        case 'gwei':
          rawValue = parseGwei(newDisplay).toString();
          break;
        case 'wei':
          rawValue = newDisplay;
          break;
        case 'token':
          if (decimals !== undefined) {
            rawValue = parseUnits(newDisplay, decimals).toString();
          }
          break;
        case 'bps':
          const percent = parseFloat(newDisplay);
          rawValue = Math.round(percent * 100).toString();
          break;
        case 'timestamp':
          // Keep raw value as is
          rawValue = value;
          break;
        case 'text':
          // Encode text to bytes32
          const hex = Buffer.from(newDisplay, 'utf8').toString('hex');
          rawValue = '0x' + hex.padEnd(64, '0');
          break;
        default:
          rawValue = newDisplay;
      }

      onChange(rawValue);
    } catch (error) {
      console.error('Conversion error:', error);
    }
  };

  const handleDateChange = (dateStr: string) => {
    setDateValue(dateStr);
    try {
      const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
      onChange(timestamp.toString());
    } catch {
      onChange('0');
    }
  };

  const availableTabs: TabType[] = ['raw'];
  
  if (param.type.startsWith('uint') || param.type.startsWith('int')) {
    if (unitType === 'token') {
      availableTabs.push('wei', 'gwei', 'ether');
      if (decimals !== undefined) {
        availableTabs.push('token');
      }
    } else if (unitType === 'bps') {
      availableTabs.push('bps');
    } else if (unitType === 'timestamp') {
      availableTabs.push('timestamp');
    }
  } else if (param.type === 'bytes32' && unitType === 'bytes32-text') {
    availableTabs.push('text');
  }

  const showTabs = availableTabs.length > 1;
  
  // Calculate all conversions for preview
  const getAllConversions = () => {
    if (!value || value === '0') return null;
    
    try {
      const conversions: Record<string, string> = {};
      const rawBigInt = BigInt(value);
      
      if (availableTabs.includes('wei')) {
        conversions.wei = value;
      }
      if (availableTabs.includes('gwei')) {
        conversions.gwei = formatGwei(rawBigInt);
      }
      if (availableTabs.includes('ether')) {
        conversions.ether = formatEther(rawBigInt);
      }
      if (availableTabs.includes('token') && decimals !== undefined) {
        conversions.token = formatUnits(rawBigInt, decimals);
      }
      if (availableTabs.includes('bps')) {
        conversions.bps = `${(Number(value) / 100).toFixed(2)}%`;
      }
      
      return conversions;
    } catch {
      return null;
    }
  };
  
  const conversions = getAllConversions();

  return (
    <div className="space-y-2">
      {showTabs && (
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              title={UNIT_DESCRIPTIONS[tab]}
              className={`group relative flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab === 'token' && decimals !== undefined
                ? `Token (${decimals}d)`
                : tab === 'bps'
                ? '%'
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-950 border border-gray-700 rounded text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                {UNIT_DESCRIPTIONS[tab]}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-950 border-r border-b border-gray-700 transform rotate-45"></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper text for current unit */}
      {showTabs && (
        <div className="bg-gray-900/50 border border-gray-700/30 rounded px-3 py-2 text-xs text-gray-400 flex items-start gap-2">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-blue-400" />
          <span>{UNIT_DESCRIPTIONS[activeTab]}</span>
        </div>
      )}

      <div className="relative">
        {activeTab === 'timestamp' ? (
          <div className="relative">
            <input
              type="datetime-local"
              value={dateValue}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <input
            type={activeTab === 'raw' ? 'text' : 'text'}
            value={displayValue}
            onChange={(e) => handleDisplayChange(e.target.value)}
            placeholder={
              activeTab === 'bps'
                ? 'e.g., 1.25 for 125 bps'
                : activeTab === 'text'
                ? 'Enter text'
                : activeTab === 'token'
                ? '0.0'
                : '0'
            }
            className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        )}
      </div>

      {/* Live conversion preview */}
      {conversions && showTabs && Object.keys(conversions).length > 1 && (
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium mb-2">
            <Info className="h-3 w-3" />
            <span>Live Conversion</span>
          </div>
          {Object.entries(conversions).map(([unit, convertedValue]) => (
            <div key={unit} className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">
                {unit === 'token' 
                  ? `Token (${decimals}d)` 
                  : unit.charAt(0).toUpperCase() + unit.slice(1)}:
              </span>
              <code className="text-blue-200 font-mono">{convertedValue}</code>
            </div>
          ))}
        </div>
      )}
      
      {/* Show raw value preview */}
      {activeTab !== 'raw' && value && value !== '0' && !conversions && (
        <div className="flex items-start gap-2 text-xs">
          <Hash className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-gray-500">Raw: </span>
            <code className="text-gray-400 break-all">{value}</code>
          </div>
        </div>
      )}
    </div>
  );
}

