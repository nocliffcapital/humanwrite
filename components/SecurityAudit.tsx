'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, Loader2, Sparkles, X, ChevronDown, ChevronUp, Building2, Users, Scale, List, Lightbulb, FileText, BarChart3 } from 'lucide-react';
import type { Abi } from 'viem';
import { quickAuditABI, aiAuditContract, fetchContractSource, calculateRiskScore, detectContractContext, type AuditFinding, type AuditReport } from '@/lib/contract-audit';

interface SecurityAuditProps {
  address: string;
  chainId: number;
  contractName?: string;
  abi: Abi;
}

export function SecurityAudit({ address, chainId, contractName, abi }: SecurityAuditProps) {
  const [showModal, setShowModal] = useState(false);
  const [quickFindings, setQuickFindings] = useState<AuditFinding[] | null>(null);
  const [aiReport, setAiReport] = useState<AuditReport | null>(null);
  const [isRunningQuick, setIsRunningQuick] = useState(false);
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [expandedFunctionLists, setExpandedFunctionLists] = useState<Set<number>>(new Set());

  const runQuickScan = () => {
    setIsRunningQuick(true);
    setError(null);
    
    try {
      const findings = quickAuditABI(abi, contractName);
      setQuickFindings(findings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick scan failed');
    } finally {
      setIsRunningQuick(false);
    }
  };

  const runAIAudit = async () => {
    setIsRunningAI(true);
    setError(null);

    try {
      // Check for API key
      const hasOpenAIKey = typeof window !== 'undefined' && localStorage.getItem('openai_api_key');
      if (!hasOpenAIKey) {
        throw new Error('API key required for advanced analysis. Add it in Settings to continue.');
      }

      // Fetch source code
      const sourceCode = await fetchContractSource(address, chainId);
      
      if (!sourceCode) {
        throw new Error('Could not fetch contract source code. Contract may not be verified.');
      }

      // Run AI audit
      const report = await aiAuditContract(
        contractName || 'Unknown Contract',
        sourceCode,
        abi
      );

      setAiReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI audit failed');
    } finally {
      setIsRunningAI(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    if (!quickFindings) {
      runQuickScan();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-900/30 border-red-500/50';
      case 'high':
        return 'text-orange-400 bg-orange-900/30 border-orange-500/50';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
      case 'low':
        return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'info':
        return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
      case 'low':
        return <Info className="h-4 w-4" />;
      case 'info':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const toggleFinding = (index: number) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFindings(newExpanded);
  };

  const toggleFunctionList = (index: number) => {
    const newExpanded = new Set(expandedFunctionLists);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFunctionLists(newExpanded);
  };

  const quickScore = quickFindings ? calculateRiskScore(quickFindings) : null;

  if (!showModal) {
    return (
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-medium text-sm whitespace-nowrap"
        title="Run security audit on this contract"
      >
        <Shield className="h-4 w-4" />
        Security Audit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 max-w-4xl w-full shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Security Audit</h2>
                <p className="text-purple-100 text-sm mt-1">
                  {contractName || address.slice(0, 10) + '...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
              aria-label="Close audit"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Quick Scan Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-400" />
                    Quick Scan
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Instant analysis of common patterns (no API key needed)
                  </p>
                </div>
                {quickScore !== null && (
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(quickScore)}`}>
                      {quickScore}
                    </div>
                    <div className="text-xs text-gray-400">Risk Score</div>
                  </div>
                )}
              </div>

              {!quickFindings && (
                <button
                  onClick={runQuickScan}
                  disabled={isRunningQuick}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRunningQuick ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Run Quick Scan
                    </>
                  )}
                </button>
              )}

              {quickFindings && quickFindings.length > 0 && (
                <>
                  {/* Trust Model Banner - Show the first finding (contract context) prominently */}
                  {quickFindings[0] && quickFindings[0].category === 'Contract Type' && (
                    <div className={`rounded-xl p-4 border-2 ${
                      quickFindings[0].description.includes('Institutional') 
                        ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-500/50'
                        : quickFindings[0].description.includes('Centralized')
                        ? 'bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-500/50'
                        : quickFindings[0].description.includes('Hybrid')
                        ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50'
                        : 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/50'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                          {quickFindings[0].description.includes('Institutional') ? (
                            <Building2 className="h-5 w-5 text-blue-300" />
                          ) : quickFindings[0].description.includes('Centralized') ? (
                            <Users className="h-5 w-5 text-orange-300" />
                          ) : (
                            <Scale className="h-5 w-5 text-purple-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-1">{quickFindings[0].title}</h4>
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                            {quickFindings[0].description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                  {quickFindings
                    .filter((_, idx) => idx !== 0 || quickFindings[0].category !== 'Contract Type') // Skip first if it's contract type (shown above)
                    .map((finding, idx) => (
                    <div key={idx} className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
                      <button
                        onClick={() => toggleFinding(idx)}
                        className="w-full p-3 flex items-center justify-between hover:bg-gray-700/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getSeverityColor(finding.severity)}`}>
                            {getSeverityIcon(finding.severity)}
                            {finding.severity.toUpperCase()}
                          </span>
                          <span className="text-white text-sm font-medium">{finding.title}</span>
                        </div>
                        {expandedFindings.has(idx) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      
                      {expandedFindings.has(idx) && (
                        <div className="p-4 border-t border-gray-700/50 space-y-2">
                          <p className="text-sm text-gray-300">{finding.description}</p>
                          
                          {/* Show function list if there are multiple functions */}
                          {finding.functions && finding.functions.length > 3 && (
                            <div className="mt-3">
                              <button
                                onClick={() => toggleFunctionList(idx)}
                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-400 transition-all group"
                              >
                                <List className="h-3 w-3" />
                                <span>
                                  {expandedFunctionLists.has(idx) 
                                    ? 'Hide all functions' 
                                    : `See all ${finding.functions.length} functions`}
                                </span>
                                {expandedFunctionLists.has(idx) ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                              
                              {expandedFunctionLists.has(idx) && (
                                <div className="mt-2 bg-gray-900/50 rounded p-3 border border-gray-700/30">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {finding.functions.map((funcName, funcIdx) => (
                                      <div
                                        key={funcIdx}
                                        className="relative group"
                                      >
                                        <div className="text-xs font-mono text-blue-300 bg-gray-800/50 px-2 py-1 rounded cursor-help hover:bg-gray-800 transition-all">
                                          {funcName}
                                        </div>
                                        {/* Tooltip */}
                                        {finding.functionDetails?.[funcName] && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-950 border border-blue-500/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                                            <div className="text-xs font-mono text-blue-200">
                                              {finding.functionDetails[funcName]}
                                            </div>
                                            {/* Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-950 border-r border-b border-blue-500/50 transform rotate-45"></div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {finding.recommendation && (
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 mt-2">
                              <p className="text-xs font-medium text-blue-300 mb-1 flex items-center gap-1">
                                <Lightbulb className="h-3 w-3" />
                                Recommendation:
                              </p>
                              <p className="text-xs text-blue-200">{finding.recommendation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                </>
              )}
            </div>

            {/* AI Audit Section */}
            <div className="border-t border-gray-700/50 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    AI Deep Audit
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Comprehensive source code analysis (requires OpenAI API key)
                  </p>
                </div>
                {aiReport && (
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(aiReport.score)}`}>
                      {aiReport.score}
                    </div>
                    <div className="text-xs text-gray-400">Security Score</div>
                  </div>
                )}
              </div>

              {!aiReport && (
                <button
                  onClick={runAIAudit}
                  disabled={isRunningAI}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRunningAI ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing source code...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run AI Audit (uses GPT-4)
                    </>
                  )}
                </button>
              )}

              {aiReport && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <p className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Summary
                    </p>
                    <p className="text-sm text-gray-400">{aiReport.summary}</p>
                  </div>

                  {/* Findings */}
                  {aiReport.findings && aiReport.findings.length > 0 && (
                    <div className="space-y-2">
                      {aiReport.findings.map((finding, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
                          <button
                            onClick={() => toggleFinding(1000 + idx)} // Offset to avoid collision with quick findings
                            className="w-full p-3 flex items-center justify-between hover:bg-gray-700/30 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getSeverityColor(finding.severity)}`}>
                                {getSeverityIcon(finding.severity)}
                                {finding.severity.toUpperCase()}
                              </span>
                              <span className="text-white text-sm font-medium">{finding.title}</span>
                            </div>
                            {expandedFindings.has(1000 + idx) ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          
                          {expandedFindings.has(1000 + idx) && (
                            <div className="p-4 border-t border-gray-700/50 space-y-2">
                              <p className="text-sm text-gray-300">{finding.description}</p>
                              
                              {/* Show function list if there are multiple functions */}
                              {finding.functions && finding.functions.length > 3 && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => toggleFunctionList(1000 + idx)}
                                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-purple-400 transition-all group"
                                  >
                                    <List className="h-3 w-3" />
                                    <span>
                                      {expandedFunctionLists.has(1000 + idx) 
                                        ? 'Hide all functions' 
                                        : `See all ${finding.functions.length} functions`}
                                    </span>
                                    {expandedFunctionLists.has(1000 + idx) ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                  
                                  {expandedFunctionLists.has(1000 + idx) && (
                                    <div className="mt-2 bg-gray-900/50 rounded p-3 border border-gray-700/30">
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {finding.functions.map((funcName, funcIdx) => (
                                          <div
                                            key={funcIdx}
                                            className="relative group"
                                          >
                                            <div className="text-xs font-mono text-purple-300 bg-gray-800/50 px-2 py-1 rounded cursor-help hover:bg-gray-800 transition-all">
                                              {funcName}
                                            </div>
                                            {/* Tooltip */}
                                            {finding.functionDetails?.[funcName] && (
                                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-950 border border-purple-500/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                                                <div className="text-xs font-mono text-purple-200">
                                                  {finding.functionDetails[funcName]}
                                                </div>
                                                {/* Arrow */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-950 border-r border-b border-purple-500/50 transform rotate-45"></div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {finding.recommendation && (
                                <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3 mt-2">
                                  <p className="text-xs font-medium text-purple-300 mb-1 flex items-center gap-1">
                                    <Lightbulb className="h-3 w-3" />
                                    Recommendation:
                                  </p>
                                  <p className="text-xs text-purple-200">{finding.recommendation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-900/50 rounded-b-2xl border-t border-gray-700/50">
            {/* Score Interpretation Guide */}
            {quickFindings && quickFindings.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Understanding Risk Scores:
                </p>
                <p className="text-xs text-blue-200 leading-relaxed">
                  {quickFindings[0]?.description.includes('Institutional') ? (
                    <>
                      <strong>Institutional tokens like USDC/USDT</strong> will show centralized control features (pause, freeze, blacklist). 
                      These are <strong>intentional security mechanisms</strong> for compliance, not vulnerabilities. 
                      Your risk assessment should focus on trusting the <strong>issuing entity</strong> (Circle, Tether, etc.), not just the code.
                    </>
                  ) : quickFindings[0]?.description.includes('Centralized') ? (
                    <>
                      This contract has significant owner privileges. <strong>Trust in the owner is critical.</strong> 
                      Research the team, their history, and what powers they have. Centralized control can be legitimate for certain projects.
                    </>
                  ) : quickFindings[0]?.description.includes('Hybrid') ? (
                    <>
                      This contract balances decentralization with some admin controls. 
                      Evaluate what powers the admin has and whether you trust them with those powers.
                    </>
                  ) : (
                    <>
                      This appears to be a decentralized contract. Security depends primarily on code quality and design. 
                      No single entity can pause or modify the contract.
                    </>
                  )}
                </p>
              </div>
            )}
            
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-200 flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Disclaimer:</strong> This audit is for informational purposes only. It does not guarantee the security of the contract. 
                  Always conduct thorough due diligence and consider professional audits for high-value interactions.
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

