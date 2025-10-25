import type { Abi } from 'viem';
import { getChainById } from './chains';

export interface AuditFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation?: string;
  functions?: string[]; // Full list of functions for this finding
  functionDetails?: Record<string, string>; // Function name -> signature/details
}

// Pattern configuration with context awareness
interface PatternConfig {
  patterns: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  severityIfInstitutional?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  recommendation: string;
  recommendationIfInstitutional?: string;
}

const DANGEROUS_PATTERN_CONFIGS: PatternConfig[] = [
  // ALWAYS CRITICAL - Destructive operations
  {
    patterns: ['selfdestruct', 'suicide', 'destroy', 'kill'],
    severity: 'critical',
    category: 'Destructive Operations',
    description: 'This contract can be permanently destroyed, erasing all code and sending funds to an address.',
    recommendation: '⚠️ EXTREME RISK: This function can permanently destroy the contract. Verify strict access controls and whether this is ever necessary.',
  },
  
  // ALWAYS CRITICAL - Arbitrary code execution
  {
    patterns: ['delegatecall', 'callcode'],
    severity: 'critical',
    category: 'Arbitrary Code Execution',
    description: 'This contract can execute arbitrary code from other contracts, which could bypass all security checks.',
    recommendation: '⚠️ HIGH RISK: delegatecall can execute malicious code. Only safe if target address is immutable and trusted.',
  },
  
  // Ownership & Access Control
  {
    patterns: [
      'transferownership', 'setowner', 'addowner', 'removeowner', 
      'changeowner', 'renounceownership', 'claimownership', 'acceptownership'
    ],
    severity: 'high',
    severityIfInstitutional: 'info',
    category: 'Ownership Controls',
    description: 'This contract has ownership transfer functions. The owner likely has elevated privileges.',
    recommendation: 'Verify the current owner address and understand what powers they have. Monitor for ownership changes.',
    recommendationIfInstitutional: 'Standard ownership controls for regulated entities. Verify the owner is the legitimate issuing organization.',
  },
  
  // Admin Functions
  {
    patterns: [
      'setadmin', 'addadmin', 'removeadmin', 'grantadmin', 
      'revokeadmin', 'setmoderator', 'setoperator'
    ],
    severity: 'high',
    severityIfInstitutional: 'info',
    category: 'Admin Controls',
    description: 'This contract has administrator management functions. Admins likely have special privileges.',
    recommendation: 'Verify who the current admins are and what powers they have. Multiple admins increase attack surface.',
    recommendationIfInstitutional: 'Multi-admin setup is standard for institutional operations. Verify the admin addresses belong to the legitimate organization.',
  },
  
  // Upgrade Mechanisms
  {
    patterns: [
      'upgradeto', 'upgradetoandcall', 'setimplementation', 
      'updateimplementation', 'changeimplementation', 'setbeacon', 'upgradebeacon'
    ],
    severity: 'high',
    severityIfInstitutional: 'info',
    category: 'Upgrade Mechanisms',
    description: 'This contract is upgradeable. The implementation logic can be completely replaced.',
    recommendation: '⚠️ The contract logic can change at any time. Monitor for upgrades and review new implementations before continuing to use.',
    recommendationIfInstitutional: 'Upgradability is standard for institutional tokens to fix bugs and add features. Monitor official channels for upgrade announcements.',
  },
  
  // Initialization (can be dangerous if re-callable)
  {
    patterns: ['initialize', 'reinitialize', 'setup', 'init', 'configure'],
    severity: 'medium',
    severityIfInstitutional: 'info',
    category: 'Initialization',
    description: 'This contract has initialization functions. If callable multiple times, it could reset critical state.',
    recommendation: 'Verify that initialization is protected by the "initializer" modifier or can only be called once.',
    recommendationIfInstitutional: 'Standard for proxy contracts. Initialization should be one-time only.',
  },
  
  // Guardian/Emergency Controls
  {
    patterns: [
      'setguardian', 'addguardian', 'removeguardian', 
      'emergencywithdraw', 'emergencystop', 'emergencypause', 
      'emergencyunpause', 'emergencyexit', 'shutdown', 'halt'
    ],
    severity: 'high',
    severityIfInstitutional: 'info',
    category: 'Emergency Controls',
    description: 'This contract has emergency functions that can halt operations or withdraw funds.',
    recommendation: 'Understand who can trigger emergencies and what they affect. Could be used to freeze your assets or halt operations.',
    recommendationIfInstitutional: 'Emergency controls are required for regulatory compliance and user protection. Verify they\'re controlled by the legitimate entity.',
  },
  
  // Pause/Freeze (context-dependent)
  {
    patterns: ['pause', 'unpause', 'freeze', 'unfreeze', 'setpauser', 'freezeaccount'],
    severity: 'medium',
    severityIfInstitutional: 'info',
    category: 'Pause/Freeze Controls',
    description: 'This contract can be paused or have accounts frozen, stopping transfers or operations.',
    recommendation: 'Understand who can pause and what happens when paused. Your assets could be temporarily or permanently frozen.',
    recommendationIfInstitutional: 'Pause/freeze controls are regulatory requirements for compliant stablecoins to prevent illicit activity and protect users.',
  },
  
  // Treasury & Fund Management
  {
    patterns: [
      'settreasury', 'setfeerecipient', 'setfeecollector',
      'withdraw', 'withdrawfunds', 'withdrawtoken', 'withdraweth',
      'rescue', 'rescuetokens', 'recovertoken', 'sweep', 'drain', 'skim'
    ],
    severity: 'medium',
    category: 'Fund Controls',
    description: 'This contract has functions to withdraw or redirect funds.',
    recommendation: 'Verify these functions have proper access controls and understand who can withdraw what. Could be used to drain contract funds.',
  },
  
  // Role Management (Access Control)
  {
    patterns: [
      'grantrole', 'revokerole', 'setrole', 'addrole', 'removerole'
    ],
    severity: 'medium',
    severityIfInstitutional: 'info',
    category: 'Role Management',
    description: 'This contract uses role-based access control. Roles can be granted or revoked.',
    recommendation: 'Verify who has the DEFAULT_ADMIN_ROLE or equivalent. They can grant themselves any permission.',
    recommendationIfInstitutional: 'Role-based access control is a security best practice for institutional contracts.',
  },
  
  // Minting & Burning
  {
    patterns: ['mint', 'mintto', 'batchmint', 'burn', 'burnfrom'],
    severity: 'medium',
    severityIfInstitutional: 'info',
    category: 'Supply Control',
    description: 'This contract can mint new tokens or burn existing ones, affecting total supply.',
    recommendation: 'Check who can mint and whether there are supply caps. Unlimited minting could devalue your holdings.',
    recommendationIfInstitutional: 'Minting/burning is necessary for stablecoins to maintain their peg. Should be controlled by the legitimate issuer.',
  },
  
  // Whitelist/Blacklist
  {
    patterns: [
      'setwhitelist', 'addtowhitelist', 'removefromwhitelist',
      'setblacklist', 'blacklist', 'unblacklist', 'addblacklist', 'removeblacklist'
    ],
    severity: 'medium',
    severityIfInstitutional: 'info',
    category: 'Access Lists',
    description: 'This contract maintains whitelists or blacklists that can restrict who can interact with it.',
    recommendation: 'Your address could be blacklisted, preventing you from transferring or accessing your tokens.',
    recommendationIfInstitutional: 'Blacklisting is required for AML/KYC compliance and to prevent illicit use. This protects legitimate users.',
  },
  
  // Parameter Changes (Fee manipulation, etc.)
  {
    patterns: [
      'setfee', 'updatefee', 'setfeerate', 'setmaxfee',
      'setlimit', 'setthreshold', 'setminimum', 'setmaximum',
      'setrate', 'setprice', 'setslippage'
    ],
    severity: 'low',
    category: 'Parameter Controls',
    description: 'This contract allows changing operational parameters like fees, rates, or limits.',
    recommendation: 'Parameters could be changed unfavorably (e.g., fees increased to 100%). Check if changes are time-locked or governance-controlled.',
  },
  
  // Proxy & Delegation
  {
    patterns: ['setdelegate', 'setproxy', 'updateproxy'],
    severity: 'high',
    category: 'Delegation',
    description: 'This contract can delegate calls to other addresses.',
    recommendation: 'Delegation could be used to bypass access controls. Verify the delegate address is trusted and immutable.',
  },
  
  // Oracle & Price Feeds
  {
    patterns: ['setoracle', 'updateoracle', 'setpricefeed', 'updateprice', 'setprice'],
    severity: 'medium',
    category: 'Oracle Controls',
    description: 'This contract relies on oracles for price data, and the oracle address can be changed.',
    recommendation: 'A malicious oracle could manipulate prices and drain funds. Verify the oracle is decentralized and trusted.',
  },
  
  // Time-locks & Delays
  {
    patterns: ['setdelay', 'settimelock', 'executetimelock', 'canceltimelock'],
    severity: 'low',
    category: 'Timelock',
    description: 'This contract has timelock functionality for delayed execution.',
    recommendation: 'Timelocks are generally a positive security feature, giving users time to exit before changes take effect.',
  },
  
  // Backend/Server Control
  {
    patterns: ['setbackend', 'setserver', 'setsigner', 'setvalidator', 'setrelayer'],
    severity: 'medium',
    category: 'Backend Controls',
    description: 'This contract relies on off-chain components (backend, relayer, etc.) that can be changed.',
    recommendation: 'Backend controls introduce centralization. Verify the backend operators are trustworthy.',
  },
];

export interface AuditReport {
  score: number; // 0-100
  findings: AuditFinding[];
  summary: string;
  timestamp: number;
  contractType?: 'token' | 'defi' | 'nft' | 'governance' | 'proxy' | 'unknown';
  trustModel?: 'decentralized' | 'centralized' | 'hybrid';
}

export interface ContractContext {
  type: 'token' | 'defi' | 'nft' | 'governance' | 'proxy' | 'unknown';
  trustModel: 'decentralized' | 'centralized' | 'hybrid';
  explanation: string;
  isInstitutional: boolean;
}

/**
 * Detect contract type and trust model from ABI
 */
export function detectContractContext(abi: Abi, contractName?: string): ContractContext {
  const abiItems = abi as any[];
  const functionNames = abiItems
    .filter(item => item.type === 'function')
    .map(item => item.name?.toLowerCase() || '');
  
  // Check if it's a token contract
  const hasTransfer = functionNames.includes('transfer');
  const hasApprove = functionNames.includes('approve');
  const hasBalanceOf = functionNames.includes('balanceof');
  const isToken = hasTransfer && hasApprove && hasBalanceOf;
  
  // Check for centralized control
  const hasOwnership = functionNames.some(n => n.includes('owner') || n.includes('admin'));
  const hasPause = functionNames.some(n => n.includes('pause') || n.includes('freeze'));
  const hasUpgrade = functionNames.some(n => n.includes('upgrade') || n.includes('setimplementation'));
  const hasBlacklist = functionNames.some(n => n.includes('blacklist') || n.includes('freeze'));
  
  const centralizedControls = [hasOwnership, hasPause, hasUpgrade, hasBlacklist].filter(Boolean).length;
  
  // Check for NFT
  const hasTokenURI = functionNames.includes('tokenuri');
  const hasOwnerOf = functionNames.includes('ownerof');
  const isNFT = hasTokenURI && hasOwnerOf;
  
  // Check for governance
  const hasPropose = functionNames.some(n => n.includes('propose'));
  const hasVote = functionNames.some(n => n.includes('vote'));
  const isGovernance = hasPropose && hasVote;
  
  // Detect institutional stablecoins
  const name = contractName?.toLowerCase() || '';
  const isInstitutional = 
    name.includes('usdc') || 
    name.includes('usdt') || 
    name.includes('tether') ||
    name.includes('circle') ||
    name.includes('paxos') ||
    name.includes('busd');
  
  // Determine type
  let type: ContractContext['type'] = 'unknown';
  if (isNFT) type = 'nft';
  else if (isGovernance) type = 'governance';
  else if (hasUpgrade) type = 'proxy';
  else if (isToken) type = 'token';
  else if (functionNames.some(n => n.includes('swap') || n.includes('liquidity'))) type = 'defi';
  
  // Determine trust model
  let trustModel: ContractContext['trustModel'];
  let explanation: string;
  
  if (isInstitutional) {
    trustModel = 'centralized';
    explanation = 
      'Institutional Stablecoin: This is a regulated, centralized stablecoin (like USDC/USDT). ' +
      'Centralized controls (pause, freeze, blacklist) are intentional security features required for compliance. ' +
      'The security depends on trusting the issuing entity (Circle, Tether, etc.), not just the code. ' +
      'These mechanisms protect users from theft and meet regulatory requirements.';
  } else if (centralizedControls >= 3) {
    trustModel = 'centralized';
    explanation = 
      'Centralized Control: This contract has significant owner/admin privileges. ' +
      'Security depends heavily on trusting the contract owner. Verify the owner identity and their track record. ' +
      'Centralized control can be legitimate for certain use cases (company tokens, institutional products).';
  } else if (centralizedControls >= 1) {
    trustModel = 'hybrid';
    explanation = 
      'Hybrid Model: This contract has some centralized controls but also autonomous features. ' +
      'Review what powers the owner has and decide if you trust them. ' +
      'Many legitimate projects use this model for emergency situations or upgrades.';
  } else {
    trustModel = 'decentralized';
    explanation = 
      'Decentralized: This contract appears to have minimal centralized control. ' +
      'Security depends primarily on the code quality and design. ' +
      'No owner can pause, upgrade, or modify the contract behavior.';
  }
  
  return {
    type,
    trustModel,
    explanation,
    isInstitutional,
  };
}

/**
 * Quick static analysis of ABI - no API key needed
 */
export function quickAuditABI(abi: Abi, contractName?: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  
  // Detect contract context first
  const context = detectContractContext(abi, contractName);

  // Track findings by category to consolidate them
  const categoryMatches = new Map<string, {
    config: PatternConfig;
    functions: string[];
    functionDetails: Record<string, string>;
  }>();
  
  let hasTokenApproval = false;

  const abiItems = abi as any[];
  
  // Helper to create function signature
  const getFunctionSignature = (item: any): string => {
    if (!item.inputs || item.inputs.length === 0) {
      return `${item.name}()`;
    }
    const params = item.inputs.map((input: any) => {
      const paramName = input.name || 'param';
      return `${input.type} ${paramName}`;
    }).join(', ');
    return `${item.name}(${params})`;
  };
  
  // Scan all functions against all pattern configs
  for (const item of abiItems) {
    if (item.type !== 'function') continue;
    
    const funcName = item.name?.toLowerCase() || '';
    const signature = getFunctionSignature(item);
    
    // Check against all pattern configs
    for (const config of DANGEROUS_PATTERN_CONFIGS) {
      // Check if function name matches any pattern
      const matchesPattern = config.patterns.some(pattern => {
        // Exact match or contains (for compound function names)
        return funcName === pattern || funcName.includes(pattern);
      });
      
      if (matchesPattern) {
        // Add to category matches
        if (!categoryMatches.has(config.category)) {
          categoryMatches.set(config.category, {
            config,
            functions: [],
            functionDetails: {},
          });
        }
        
        const match = categoryMatches.get(config.category)!;
        match.functions.push(item.name);
        match.functionDetails[item.name] = signature;
      }
    }
    
    // Check for token approvals (not in dangerous patterns, but useful info)
    if (funcName === 'approve' || funcName === 'increaseallowance') {
      hasTokenApproval = true;
    }
  }
  
  // Convert category matches to findings
  for (const [category, match] of categoryMatches) {
    const { config, functions, functionDetails } = match;
    
    // Determine severity based on context
    const severity = context.isInstitutional && config.severityIfInstitutional
      ? config.severityIfInstitutional
      : config.severity;
    
    // Determine recommendation based on context
    const recommendation = context.isInstitutional && config.recommendationIfInstitutional
      ? config.recommendationIfInstitutional
      : config.recommendation;
    
    // Create consolidated finding
    const funcList = functions.slice(0, 5).join(', ') + (functions.length > 5 ? ` +${functions.length - 5} more` : '');
    
    findings.push({
      severity,
      category,
      title: `${category} (${functions.length} function${functions.length > 1 ? 's' : ''})`,
      description: `${config.description} Found: ${funcList}`,
      recommendation,
      functions,
      functionDetails,
    });
  }
  
  // Add token approval info if relevant
  if (hasTokenApproval) {
    findings.push({
      severity: 'info',
      category: 'Token Permissions',
      title: 'Token approval available',
      description: 'This is a token contract with approve/increaseAllowance functions. Be careful with unlimited approvals.',
      recommendation: 'Only approve the exact amount you need, not unlimited amounts.',
    });
  }
  
  // Add context as first finding (educational)
  findings.unshift({
    severity: 'info',
    category: 'Contract Type',
    title: `${context.type.toUpperCase()} - ${context.trustModel.toUpperCase()} Trust Model`,
    description: context.explanation,
  });
  
  // If no issues found (other than context), that's good!
  if (findings.length === 1 || (findings.length === 2 && hasTokenApproval)) {
    findings.push({
      severity: 'info',
      category: 'Quick Scan',
      title: '✅ No obvious red flags detected',
      description: 'The quick scan did not detect common dangerous patterns in the ABI.',
      recommendation: 'This is a good sign, but consider running a full AI audit for comprehensive analysis.',
    });
  }
  
  // Sort findings by severity (critical -> high -> medium -> low -> info)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => {
    // Keep context first
    if (a.category === 'Contract Type') return -1;
    if (b.category === 'Contract Type') return 1;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  return findings;
}

/**
 * Fetch contract source code from explorer
 */
export async function fetchContractSource(
  address: string,
  chainId: number
): Promise<string | null> {
  const chain = getChainById(chainId);
  if (!chain) return null;

  try {
    // Try to get API key from localStorage (client-side)
    const userKey = typeof window !== 'undefined' ? localStorage.getItem('etherscan_api_key') : null;
    
    const params = new URLSearchParams({
      chainid: chainId.toString(),
      module: 'contract',
      action: 'getsourcecode',
      address: address.toLowerCase(),
    });

    if (userKey) {
      params.append('apikey', userKey);
    }

    const explorerUrl = `${chain.explorerApiUrl}?${params.toString()}`;
    const url = `/api/fetch-abi?url=${encodeURIComponent(explorerUrl)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.result) {
      let sourceData;
      if (typeof data.result === 'string') {
        const parsed = JSON.parse(data.result);
        sourceData = Array.isArray(parsed) ? parsed[0] : parsed;
      } else if (Array.isArray(data.result)) {
        sourceData = data.result[0];
      } else {
        sourceData = data.result;
      }

      return sourceData.SourceCode || null;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch source code:', error);
    return null;
  }
}

/**
 * AI-powered deep audit using OpenAI
 */
export async function aiAuditContract(
  contractName: string,
  sourceCode: string,
  abi: Abi
): Promise<AuditReport> {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('openai_api_key') : null;

  if (!apiKey) {
    throw new Error('OpenAI API key required for AI audit');
  }

  // Truncate source code if too long (GPT-4 has limits)
  let code = sourceCode;
  if (code.length > 50000) {
    code = code.substring(0, 50000) + '\n\n... [code truncated for length] ...';
  }

  const prompt = `You are an expert smart contract security auditor. Analyze the following Solidity contract for security vulnerabilities, bugs, and best practice violations.

Contract Name: ${contractName}

Source Code:
\`\`\`solidity
${code}
\`\`\`

Provide a comprehensive security audit including:
1. **Security Score** (0-100, where 100 is most secure)
2. **Critical Issues** - Vulnerabilities that could lead to loss of funds or control
3. **High Risk Issues** - Significant concerns that need immediate attention
4. **Medium Risk Issues** - Issues that should be addressed
5. **Low Risk Issues** - Minor concerns and improvements
6. **Best Practices** - Code quality and optimization suggestions
7. **Overall Summary** - Brief assessment of the contract's security posture

Focus on:
- Reentrancy vulnerabilities
- Access control issues
- Integer overflow/underflow
- Front-running risks
- Centralization risks
- Upgrade mechanisms and their security
- Token approval patterns
- Emergency functions and their abuse potential
- Gas optimization issues that could lead to DoS
- Logic bugs in complex calculations

Format your response as JSON with this structure:
{
  "score": <number 0-100>,
  "summary": "<brief overall assessment>",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "<vulnerability type>",
      "title": "<short title>",
      "description": "<detailed explanation>",
      "recommendation": "<how to fix or mitigate>"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use GPT-4 for better security analysis
        messages: [
          {
            role: 'system',
            content: 'You are an expert smart contract security auditor with deep knowledge of Solidity, EVM, and common vulnerabilities. You provide thorough, actionable security assessments. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent, focused analysis
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const auditResult = JSON.parse(content);

    return {
      score: auditResult.score || 0,
      summary: auditResult.summary || 'Analysis complete',
      findings: auditResult.findings || [],
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('AI audit error:', error);
    throw error;
  }
}

/**
 * Calculate risk score based on findings
 * Note: For institutional contracts, "info" level findings don't affect score
 */
export function calculateRiskScore(findings: AuditFinding[]): number {
  let score = 100;
  
  // Check if this is an institutional contract (first finding will tell us)
  const isInstitutional = findings[0]?.description.includes('Institutional Stablecoin');
  
  for (const finding of findings) {
    // Skip "info" level findings for institutional contracts
    // (ownership, pause, etc. are expected features, not risks)
    if (isInstitutional && finding.severity === 'info') {
      continue;
    }
    
    switch (finding.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 8;
        break;
      case 'low':
        score -= 3;
        break;
      case 'info':
        score -= 0;
        break;
    }
  }
  
  return Math.max(0, score);
}

