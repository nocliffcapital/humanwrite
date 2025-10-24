'use client';

import { useState, useEffect } from 'react';
import { Settings, X, Key, Save, Sparkles } from 'lucide-react';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const [etherscanKey, setEtherscanKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved keys from localStorage
    if (typeof window !== 'undefined') {
      const storedEtherscan = localStorage.getItem('etherscan_api_key');
      const storedOpenAI = localStorage.getItem('openai_api_key');
      if (storedEtherscan) setEtherscanKey(storedEtherscan);
      if (storedOpenAI) setOpenaiKey(storedOpenAI);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      // Save Etherscan key
      if (etherscanKey.trim()) {
        localStorage.setItem('etherscan_api_key', etherscanKey.trim());
      } else {
        localStorage.removeItem('etherscan_api_key');
      }
      
      // Save OpenAI key
      if (openaiKey.trim()) {
        localStorage.setItem('openai_api_key', openaiKey.trim());
      } else {
        localStorage.removeItem('openai_api_key');
      }
      
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">API Settings</h2>
              <p className="text-blue-100 text-sm mt-1">Optional: Add your own API keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
            aria-label="Close settings"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-200 text-sm leading-relaxed">
              <strong>Optional:</strong> Add API keys to unlock enhanced features:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-blue-300">
              <li className="flex items-center gap-2">
                <Key className="h-3 w-3" />
                <strong>Etherscan:</strong> Unlimited ABI fetching (free to get)
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                <strong>OpenAI:</strong> AI-powered transaction analysis & security audits
              </li>
            </ul>
          </div>

          {/* Etherscan API Key */}
          <div>
            <label className="flex items-center gap-2 text-white font-semibold mb-2">
              <Key className="h-4 w-4 text-blue-400" />
              Etherscan API Key
            </label>
            <input
              type="text"
              value={etherscanKey}
              onChange={(e) => setEtherscanKey(e.target.value)}
              placeholder="Your Etherscan API key (optional)"
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
            />
            <p className="mt-2 text-xs text-gray-400">
              Get your free API key at{' '}
              <a
                href="https://etherscan.io/myapikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                etherscan.io/myapikey
              </a>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Note: One Etherscan key usually works for all Etherscan-family explorers
              (BaseScan, Arbiscan, etc.)
            </p>
          </div>

          {/* OpenAI API Key */}
          <div>
            <label className="flex items-center gap-2 text-white font-semibold mb-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              OpenAI API Key (AI Analysis)
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-... (optional)"
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-sm"
            />
            <p className="mt-2 text-xs text-gray-400">
              Get your API key at{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                platform.openai.com/api-keys
              </a>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Enables AI-powered transaction analysis & full contract security audits. Uses GPT-4 for audits (~$0.02-0.05 per audit).
            </p>
          </div>

          {/* Saved Indicator */}
          {saved && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-sm font-medium">Settings saved!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-900/50 rounded-b-2xl border-t border-gray-700/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

