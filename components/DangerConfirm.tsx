'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { getDangerHint } from '@/lib/translate';

interface DangerConfirmProps {
  functionName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DangerConfirm({
  functionName,
  isOpen,
  onClose,
  onConfirm,
}: DangerConfirmProps) {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'CONFIRM';
  const canConfirm = confirmText === requiredText;

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setConfirmText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-red-500/50 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Dangerous Operation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 font-medium mb-2">
              You are about to call: <code className="text-red-200">{functionName}()</code>
            </p>
            <p className="text-red-300/80 text-sm">
              {getDangerHint(functionName)}
            </p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Warning:
            </p>
            <ul className="text-yellow-300/80 text-sm space-y-1 list-disc list-inside">
              <li>This action may be irreversible</li>
              <li>Could affect funds or contract functionality</li>
              <li>Double-check all parameters</li>
              <li>Only proceed if you understand the consequences</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Type <span className="text-white font-bold">{requiredText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={requiredText}
              className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25 font-semibold"
            >
              I Understand, Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

