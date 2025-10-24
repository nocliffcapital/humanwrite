'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Loader2, CheckCircle2, ExternalLink, ArrowRightLeft, CheckCheck, TrendingUp, TrendingDown, Info, Sparkles, Shield, Lightbulb, Settings } from 'lucide-react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import type { Address, Abi } from 'viem';
import { parseEther, encodeFunctionData, formatEther, formatUnits } from 'viem';
import type { ParsedFunction } from '@/lib/abi';
import { ParamField } from './ParamField';
import { DangerConfirm } from './DangerConfirm';
import { getFunctionLabel } from '@/lib/translate';
import { getChainById } from '@/lib/chains';
import { analyzeWithAI, type AIAnalysis } from '@/lib/ai-analysis';

interface FunctionCardProps {
  func: ParsedFunction;
  contractAddress: Address;
  abi: Abi;
  chainId: number;
  isOpen: boolean;
  onToggle: () => void;
}

interface SimulationInsight {
  type: 'transfer' | 'approval' | 'balance_change' | 'state_change' | 'return_value' | 'info';
  icon: 'transfer' | 'check' | 'up' | 'down' | 'info';
  title: string;
  description: string;
  value?: string;
}

interface SimulationResult {
  success: boolean;
  gas?: bigint;
  error?: string;
  insights?: SimulationInsight[];
  returnValue?: any;
}

export function FunctionCard({ func, contractAddress, abi, chainId, isOpen, onToggle }: FunctionCardProps) {
  const [params, setParams] = useState<Record<number, any>>({});
  const [ethValue, setEthValue] = useState('0');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [tokenDecimals, setTokenDecimals] = useState<number | undefined>();
  const [tokenSymbol, setTokenSymbol] = useState<string | undefined>();
  
  const cardRef = React.useRef<HTMLDivElement>(null);

  const { address: userAddress, chain: connectedChain } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const chain = getChainById(chainId);
  const isCorrectChain = connectedChain?.id === chainId;
  const humanLabel = getFunctionLabel(func.signature, func.displayName);
  
  // Scroll to card when opened
  useEffect(() => {
    if (isOpen && cardRef.current) {
      // Small delay to ensure the card has expanded
      setTimeout(() => {
        const cardTop = cardRef.current?.getBoundingClientRect().top || 0;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const offset = 80; // Offset from top of screen (accounts for header)
        
        window.scrollTo({
          top: scrollTop + cardTop - offset,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [isOpen]);

  // Initialize params
  useEffect(() => {
    const initialParams: Record<number, any> = {};
    func.inputs.forEach((input, idx) => {
      if (input.type === 'bool') {
        initialParams[idx] = false;
      } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
        initialParams[idx] = '0';
      } else {
        initialParams[idx] = '';
      }
    });
    setParams(initialParams);
  }, [func]);

  // Try to fetch decimals and symbol if this looks like a token contract
  useEffect(() => {
    if (isOpen && publicClient) {
      fetchTokenInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractAddress]);

  const fetchTokenInfo = async () => {
    if (!publicClient) return;
    
    // Fetch decimals
    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'decimals',
      });
      setTokenDecimals(Number(result));
    } catch {
      // Not an ERC-20 or decimals not available
    }
    
    // Fetch symbol
    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'symbol',
      });
      setTokenSymbol(result as string);
    } catch {
      // Symbol not available
    }
  };

  const handleParamChange = (index: number, value: any) => {
    setParams((prev) => ({ ...prev, [index]: value }));
    setSimulation(null); // Clear simulation when params change
  };

  const prepareArgs = () => {
    return func.inputs.map((input, idx) => {
      const value = params[idx];
      
      // Handle different types
      if (input.type === 'bool') {
        return Boolean(value);
      }
      
      if (input.type.startsWith('uint') || input.type.startsWith('int')) {
        return BigInt(value || '0');
      }

      if (input.type.endsWith('[]')) {
        try {
          return JSON.parse(value || '[]');
        } catch {
          return [];
        }
      }

      return value;
    });
  };

  // Generate human-readable insights from simulation - works for ANY contract!
  const generateInsights = (returnValue: any, args: any[]): SimulationInsight[] => {
    const insights: SimulationInsight[] = [];

    // Parse ALL parameters intelligently (works for any function)
    func.inputs.forEach((input, idx) => {
      const arg = args[idx];
      const paramName = (input.name || '').toLowerCase();
      const paramType = input.type.toLowerCase();

      // ADDRESS parameters
      if (paramType === 'address') {
        if (arg && typeof arg === 'string' && arg !== '0x0000000000000000000000000000000000000000') {
          const addressLabel = 
            paramName.includes('to') || paramName.includes('recipient') || paramName.includes('receiver') ? 'Sending to' :
            paramName.includes('from') || paramName.includes('sender') ? 'Sending from' :
            paramName.includes('spender') ? 'Granting permission to' :
            paramName.includes('owner') ? 'Owner address' :
            paramName.includes('account') || paramName.includes('user') ? 'Account' :
            'Interacting with';
          
          const isYourAddress = arg.toLowerCase() === userAddress?.toLowerCase();
          
          insights.push({
            type: 'info',
            icon: 'info',
            title: `${input.name || 'Address'} ${isYourAddress ? '(You)' : ''}`,
            description: `${addressLabel}: ${arg.slice(0, 6)}...${arg.slice(-4)}`,
          });
        }
      }
      
      // AMOUNT/VALUE parameters (uint, int)
      else if (paramType.startsWith('uint') || paramType.startsWith('int')) {
        if (arg && arg !== 0n && arg !== '0') {
          const isAmount = paramName.includes('amount') || paramName.includes('value') || 
                          paramName.includes('quantity') || paramName.includes('balance');
          const isTime = paramName.includes('time') || paramName.includes('deadline') || 
                        paramName.includes('timestamp') || paramName.includes('duration');
          const isPercentage = paramName.includes('percent') || paramName.includes('rate') || 
                              paramName.includes('fee') || paramName.includes('bps');
          
          let formattedValue: string;
          let description: string;
          
          if (isTime) {
            // Format as timestamp/duration
            const numValue = Number(arg);
            if (numValue > 1000000000 && numValue < 10000000000) {
              // Looks like a unix timestamp
              formattedValue = new Date(numValue * 1000).toLocaleString();
              description = `Time: ${formattedValue}`;
            } else {
              formattedValue = numValue.toString();
              description = `Duration: ${formattedValue} seconds`;
            }
          } else if (isPercentage) {
            // Show as percentage
            formattedValue = (Number(arg) / 100).toString() + '%';
            description = `${input.name || 'Percentage'}: ${formattedValue}`;
          } else if (isAmount) {
            // Format as token amount with symbol
            const decimals = tokenDecimals || 18;
            const symbol = tokenSymbol || '';
            try {
              const numericValue = formatUnits(BigInt(arg), decimals);
              formattedValue = symbol ? `${numericValue} ${symbol}` : numericValue;
              description = `${input.name || 'Amount'}: ${formattedValue}`;
              
              // Check if it's max uint (unlimited approval)
              if (arg === BigInt(2 ** 256 - 1) || arg.toString().includes('115792089237316195423570985008687907853269984665640564039457')) {
                formattedValue = symbol ? `∞ (Unlimited ${symbol})` : '∞ (Unlimited)';
                description = `${input.name || 'Amount'}: UNLIMITED`;
                
                insights.push({
                  type: 'info',
                  icon: 'info',
                  title: 'Unlimited Amount Detected',
                  description: 'This sets an unlimited/maximum value. Ensure this is intentional.',
                });
              }
            } catch {
              formattedValue = arg.toString();
              description = `${input.name || 'Value'}: ${formattedValue}`;
            }
          } else {
            // Generic number
            formattedValue = arg.toString();
            description = `${input.name || 'Value'}: ${formattedValue}`;
          }
          
          insights.push({
            type: 'state_change',
            icon: 'info',
            title: input.name || 'Parameter',
            description,
            value: formattedValue,
          });
        }
      }
      
      // BOOLEAN parameters
      else if (paramType === 'bool') {
        insights.push({
          type: 'info',
          icon: arg ? 'check' : 'info',
          title: input.name || 'Boolean',
          description: arg ? 'True (Enabled)' : 'False (Disabled)',
        });
      }
      
      // STRING parameters
      else if (paramType === 'string') {
        if (arg && arg.length > 0) {
          const preview = arg.length > 50 ? arg.slice(0, 50) + '...' : arg;
          insights.push({
            type: 'info',
            icon: 'info',
            title: input.name || 'Text',
            description: `"${preview}"`,
          });
        }
      }
      
      // BYTES parameters
      else if (paramType.startsWith('bytes')) {
        if (arg && arg !== '0x') {
          const byteLength = arg.length > 2 ? (arg.length - 2) / 2 : 0;
          insights.push({
            type: 'info',
            icon: 'info',
            title: input.name || 'Data',
            description: `${byteLength} bytes of data`,
            value: arg.slice(0, 10) + '...',
          });
        }
      }
      
      // ARRAY parameters
      else if (paramType.includes('[]')) {
        if (Array.isArray(arg)) {
          insights.push({
            type: 'info',
            icon: 'info',
            title: input.name || 'Array',
            description: `Array with ${arg.length} item${arg.length !== 1 ? 's' : ''}`,
          });
        }
      }
    });

    // Add ETH value transfer if payable
    if (func.stateMutability === 'payable' && ethValue !== '0') {
      insights.push({
        type: 'transfer',
        icon: 'transfer',
        title: 'ETH Transfer',
        description: `You will send ${ethValue} ETH to this contract`,
      });
    }

    // Add return value if function has outputs
    if (returnValue !== undefined && func.outputs && func.outputs.length > 0) {
      let formattedReturn = String(returnValue);
      
      // Format based on output type
      const outputType = func.outputs[0].type;
      const outputName = func.outputs[0].name || 'Result';
      
      if (outputType.startsWith('uint') || outputType.startsWith('int')) {
        try {
          // Try to format as readable number
          const numValue = BigInt(returnValue);
          if (numValue > 1000000n) {
            // Might be a token amount
            const decimals = tokenDecimals || 18;
            const symbol = tokenSymbol || '';
            const numericValue = formatUnits(numValue, decimals);
            formattedReturn = symbol ? `${numericValue} ${symbol}` : numericValue;
          } else {
            formattedReturn = numValue.toString();
          }
        } catch {
          formattedReturn = returnValue.toString();
        }
      } else if (outputType === 'bool') {
        formattedReturn = returnValue ? 'True' : 'False';
      } else if (outputType === 'address') {
        formattedReturn = `${returnValue.slice(0, 6)}...${returnValue.slice(-4)}`;
      } else if (outputType.startsWith('bytes')) {
        formattedReturn = `${returnValue.slice(0, 10)}... (${(returnValue.length - 2) / 2} bytes)`;
      }
      
      insights.push({
        type: 'return_value',
        icon: 'info',
        title: `Returns: ${outputName}`,
        description: formattedReturn,
      });
    }

    // If no parameters and no return value, add generic success message
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        icon: 'check',
        title: 'Transaction Will Execute',
        description: 'This function will execute successfully on-chain',
      });
    }

    return insights;
  };

  const handleSimulate = async () => {
    if (!publicClient || !userAddress) return;

    setIsSimulating(true);
    setSimulation(null);
    setAiAnalysis(null);
    setAiError(null);

    try {
      const args = prepareArgs();
      const value = func.stateMutability === 'payable' ? parseEther(ethValue) : 0n;

      const result = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: func.name,
        args,
        value,
        account: userAddress,
      });

      // Generate insights based on function and args
      const insights = generateInsights(result.result, args);

      setSimulation({
        success: true,
        gas: result.request.gas,
        returnValue: result.result,
        insights,
      });

      // After successful simulation, try AI analysis (optional)
      triggerAIAnalysis(args);
    } catch (error: any) {
      setSimulation({
        success: false,
        error: error.shortMessage || error.message || 'Simulation failed',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Trigger AI analysis in background (non-blocking)
  const triggerAIAnalysis = async (args: any[]) => {
    // Check if OpenAI key is available
    const hasOpenAIKey = typeof window !== 'undefined' && localStorage.getItem('openai_api_key');
    if (!hasOpenAIKey) return;

    setIsAnalyzingWithAI(true);
    setAiError(null);

    try {
      const paramNames = func.inputs.map(input => input.name || 'param');
      const natspec = undefined; // NatSpec not available in parsed function

      const analysis = await analyzeWithAI(
        func.name,
        func.signature,
        args,
        paramNames,
        natspec
      );

      if (analysis) {
        setAiAnalysis(analysis);
      } else {
        setAiError('AI analysis failed. Check your API key in Settings.');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiError(error instanceof Error ? error.message : 'AI analysis failed');
    } finally {
      setIsAnalyzingWithAI(false);
    }
  };

  const handleSend = async () => {
    if (!walletClient || !userAddress) return;

    // Show danger confirm for dangerous functions
    if (func.isDangerous && !showDangerConfirm) {
      setShowDangerConfirm(true);
      return;
    }

    await executeSend();
  };

  const executeSend = async () => {
    if (!walletClient || !userAddress) return;

    setIsSending(true);
    setTxHash(null);

    try {
      const args = prepareArgs();
      const value = func.stateMutability === 'payable' ? parseEther(ethValue) : undefined;

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName: func.name,
        args,
        value,
        account: userAddress,
        chain: walletClient.chain,
      });

      setTxHash(hash);
      setShowDangerConfirm(false);

      // Wait for confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
    } catch (error: any) {
      console.error('Transaction error:', error);
      alert(error.shortMessage || error.message || 'Transaction failed');
    } finally {
      setIsSending(false);
    }
  };

  const canSimulate = userAddress && isCorrectChain;
  const canSend = userAddress && isCorrectChain && !isSending;

  return (
    <>
      <div 
        ref={cardRef}
        className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border shadow-xl hover:shadow-2xl transition-all ${
          isOpen 
            ? 'border-blue-500/50 ring-2 ring-blue-500/20 shadow-blue-500/10' 
            : 'border-gray-700/50'
        }`}
      >
        <button
          onClick={onToggle}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-all rounded-xl"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-white font-medium">{func.name}</h3>
            {func.isDangerous && (
              <span className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                DANGER
              </span>
            )}
            {func.stateMutability === 'payable' && (
              <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs font-medium">
                PAYABLE
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div className="p-4 border-t border-gray-700 space-y-4">
            {/* Function Description */}
            <div>
              <p className="text-gray-400 text-sm">{humanLabel}</p>
              <code className="text-xs text-gray-500 font-mono">{func.signature}</code>
            </div>

            {/* ETH Value Input (if payable) */}
            {func.stateMutability === 'payable' && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  ETH Value to Send
                </label>
                <input
                  type="text"
                  value={ethValue}
                  onChange={(e) => setEthValue(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono"
                />
                <p className="mt-1 text-xs text-yellow-300/70">
                  Amount in ETH (e.g., 0.1)
                </p>
              </div>
            )}

            {/* Parameters */}
            {func.inputs.length > 0 && (
              <div className="space-y-3">
                {func.inputs.map((input, idx) => (
                  <ParamField
                    key={idx}
                    param={input}
                    index={idx}
                    value={params[idx]}
                    onChange={(value) => handleParamChange(idx, value)}
                    decimals={tokenDecimals}
                    functionName={func.name} // Pass function name for contextual hints
                  />
                ))}
              </div>
            )}

            {/* Calldata Preview */}
            <div className="bg-gray-900 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">Calldata Preview</label>
              <code className="text-xs text-gray-400 font-mono break-all">
                {(() => {
                  try {
                    const args = prepareArgs();
                    return encodeFunctionData({
                      abi,
                      functionName: func.name,
                      args,
                    });
                  } catch {
                    return '0x...';
                  }
                })()}
              </code>
            </div>

            {/* Simulation & AI Analysis - Side by Side */}
            {simulation && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Simulation Result */}
                <div
                  className={`rounded-xl p-4 ${
                    simulation.success
                      ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30'
                      : 'bg-gradient-to-br from-red-900/20 to-rose-900/20 border border-red-500/30'
                  }`}
                >
                  {simulation.success ? (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <p className="text-green-300 font-semibold text-sm">Simulation Success</p>
                        </div>
                        {simulation.gas && (
                          <div className="text-xs text-green-300/60">
                            Gas: {Number(simulation.gas).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Insights */}
                      {simulation.insights && simulation.insights.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-green-400/70 uppercase tracking-wider">
                            What will happen:
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {simulation.insights.map((insight, idx) => {
                              const Icon = 
                                insight.icon === 'transfer' ? ArrowRightLeft :
                                insight.icon === 'check' ? CheckCheck :
                                insight.icon === 'up' ? TrendingUp :
                                insight.icon === 'down' ? TrendingDown :
                                Info;
                              
                              return (
                                <div 
                                  key={idx}
                                  className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-700/30"
                                >
                                  <div className="flex items-start gap-2">
                                    <Icon className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-white">
                                        {insight.title}
                                      </p>
                                      <p className="text-xs text-gray-300 mt-0.5">
                                        {insight.description}
                                      </p>
                                      {insight.value && (
                                        <code className="text-xs text-green-400 bg-gray-900 px-1.5 py-0.5 rounded mt-1 inline-block">
                                          {insight.value}
                                        </code>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-500/20 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <p className="text-red-300 font-semibold text-sm">Simulation Failed</p>
                      </div>

                      {/* Error Message */}
                      <div className="bg-red-900/30 rounded-lg p-3 border border-red-700/30">
                        <p className="text-xs font-medium text-red-300 mb-1">Error Details:</p>
                        <p className="text-xs text-red-200/90 leading-relaxed">{simulation.error}</p>
                      </div>

                      {/* Helpful Tips */}
                      <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/30">
                        <p className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Troubleshooting Tips:
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-400">
                          <li className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>Double-check all parameter values</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>Ensure you have sufficient token balances</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>Verify any required approvals are in place</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>Check if you meet contract-specific requirements</span>
                          </li>
                        </ul>
                      </div>

                      {/* Warning Badge */}
                      <div className="flex items-center gap-2 text-xs text-red-300/70">
                        <div className="flex-1 h-px bg-red-500/20"></div>
                        <span>Transaction would revert on-chain</span>
                        <div className="flex-1 h-px bg-red-500/20"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: AI Analysis */}
                <div className="rounded-xl p-4 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30">
                  {(isAnalyzingWithAI || aiAnalysis || aiError) && simulation?.success ? (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        {isAnalyzingWithAI ? (
                          <>
                            <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                            <p className="text-purple-300 font-semibold text-sm">AI Analyzing...</p>
                          </>
                        ) : aiError ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            <p className="text-yellow-300 font-semibold text-sm">AI Unavailable</p>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <p className="text-purple-300 font-semibold text-sm">AI Analysis</p>
                          </>
                        )}
                      </div>

                      {/* Error Message */}
                      {aiError && !isAnalyzingWithAI && (
                        <div className="bg-yellow-900/20 rounded-lg p-2.5 border border-yellow-700/30">
                          <p className="text-xs text-yellow-200">{aiError}</p>
                          <p className="text-xs text-yellow-300/70 mt-1 flex items-center gap-1">
                            <Settings className="h-3 w-3" />
                            Add API key in Settings
                          </p>
                        </div>
                      )}

                      {aiAnalysis && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {/* Summary */}
                          {aiAnalysis.summary && (
                            <div className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-700/30">
                              <p className="text-xs font-medium text-purple-300 mb-1">Summary</p>
                              <p className="text-xs text-gray-300">{aiAnalysis.summary}</p>
                            </div>
                          )}

                          {/* Risks */}
                          {aiAnalysis.risks && aiAnalysis.risks.length > 0 && (
                            <div className="bg-gray-900/40 rounded-lg p-2.5 border border-red-700/30">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Shield className="h-3.5 w-3.5 text-red-400" />
                                <p className="text-xs font-medium text-red-300">Security</p>
                              </div>
                              <ul className="space-y-1">
                                {aiAnalysis.risks.map((risk, idx) => (
                                  <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5">•</span>
                                    <span>{risk}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recommendations */}
                          {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                            <div className="bg-gray-900/40 rounded-lg p-2.5 border border-blue-700/30">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                                <p className="text-xs font-medium text-blue-300">Recommendations</p>
                              </div>
                              <ul className="space-y-1">
                                {aiAnalysis.recommendations.map((rec, idx) => (
                                  <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Explanation */}
                          {aiAnalysis.explanation && aiAnalysis.explanation !== aiAnalysis.summary && (
                            <div className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-700/30">
                              <p className="text-xs font-medium text-purple-300 mb-1">Expected Outcome</p>
                              <p className="text-xs text-gray-300">{aiAnalysis.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                      <Sparkles className="h-8 w-8 text-purple-400/30 mb-2" />
                      <p className="text-xs text-purple-300/50">
                        {simulation?.success ? 'Add OpenAI key in Settings for AI analysis' : 'Run simulation to enable AI analysis'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transaction Hash */}
            {txHash && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-300 font-medium">Transaction Sent</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-blue-300/70 text-sm font-mono break-all">
                        {txHash}
                      </code>
                      {chain && (
                        <a
                          href={`${chain.explorerUrl}/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSimulate}
                disabled={!canSimulate || isSimulating}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  'Simulate'
                )}
              </button>

              {!isCorrectChain && userAddress ? (
                <button
                  onClick={() => switchChain?.({ chainId })}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Switch to {chain?.name}
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    func.isDangerous
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Transaction'
                  )}
                </button>
              )}
            </div>

            {!userAddress && (
              <p className="text-yellow-300 text-sm text-center">
                Connect your wallet to interact with this contract
              </p>
            )}
          </div>
        )}
      </div>

      <DangerConfirm
        functionName={func.name}
        isOpen={showDangerConfirm}
        onClose={() => setShowDangerConfirm(false)}
        onConfirm={executeSend}
      />
    </>
  );
}

