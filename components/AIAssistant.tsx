'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import type { ParsedFunction } from '@/lib/abi';
import { analyzeUserIntent, type AIRecommendation } from '@/lib/ai-assistant';

interface AIAssistantProps {
  availableFunctions: ParsedFunction[];
  contractAddress: string;
  contractName?: string;
  onFunctionSelect: (functionName: string, params: Record<string, string>) => void;
}

export function AIAssistant({
  availableFunctions,
  contractAddress,
  contractName,
  onFunctionSelect,
}: AIAssistantProps) {
  const [userRequest, setUserRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!userRequest.trim()) return;

    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const result = await analyzeUserIntent(
        userRequest,
        availableFunctions,
        contractAddress,
        contractName
      );
      setRecommendation(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze request';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecommendation = () => {
    if (!recommendation) return;
    onFunctionSelect(recommendation.functionName, recommendation.parameterSuggestions);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/30 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
          Beta
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Describe what you want to do, and AI will recommend the right function to call.
      </p>

      {/* Input */}
      <div className="mb-4">
        <textarea
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder='e.g., "I want to withdraw my 350 staked tokens"'
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!userRequest.trim() || loading}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze Request
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mt-4 space-y-3">
          {/* Function & Confidence */}
          <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-400">Recommended Function</div>
              <div className={`text-xs font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                {recommendation.confidence.toUpperCase()} CONFIDENCE
              </div>
            </div>
            <div className="text-white font-mono text-sm mb-2">
              {recommendation.functionSignature}
            </div>
            <div className="text-sm text-gray-400">{recommendation.reasoning}</div>
          </div>

          {/* Parameters */}
          {Object.keys(recommendation.parameterSuggestions).length > 0 && (
            <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-400 mb-3">Suggested Parameters</div>
              <div className="space-y-2">
                {Object.entries(recommendation.parameterSuggestions).map(([param, value]) => (
                  <div key={param} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="text-blue-400 font-mono">{param}</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-white">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {recommendation.warnings.length > 0 && (
            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
                <div className="text-sm font-medium text-orange-300">Important Warnings</div>
              </div>
              <ul className="space-y-1 ml-7">
                {recommendation.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-orange-200">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply Button */}
          <button
            onClick={handleApplyRecommendation}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
          >
            Apply Recommendation
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

