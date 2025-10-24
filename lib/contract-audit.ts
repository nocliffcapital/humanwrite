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

  // Track function categories to avoid duplicates
  const dangerousFuncs: string[] = [];
  const ownershipFuncs: string[] = [];
  const upgradeFuncs: string[] = [];
  const emergencyFuncs: string[] = [];
  const withdrawalFuncs: string[] = [];
  let hasTokenApproval = false;
  
  // Store function details for tooltips
  const functionDetails: Record<string, string> = {};

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
  
  // First pass: collect all matching functions
  for (const item of abiItems) {
    if (item.type !== 'function') continue;
    
    const funcName = item.name?.toLowerCase() || '';
    const signature = getFunctionSignature(item);
    
    // Check for self-destruct
    if (['selfdestruct', 'suicide', 'delegatecall'].some(d => funcName.includes(d))) {
      dangerousFuncs.push(item.name);
      functionDetails[item.name] = signature;
    }
    
    // Check for ownership transfer
    if (funcName.includes('transferownership') || funcName.includes('setowner') || funcName.includes('renounceownership')) {
      ownershipFuncs.push(item.name);
      functionDetails[item.name] = signature;
    }
    
    // Check for upgrade mechanisms (be specific to avoid false positives)
    if (
      funcName.includes('upgradeto') || 
      funcName.includes('setimplementation') || 
      funcName.includes('upgradeimplementation') ||
      (funcName.includes('upgrade') && !funcName.includes('upgradeable')) // 'upgrade' but not 'upgradeable'
    ) {
      upgradeFuncs.push(item.name);
      functionDetails[item.name] = signature;
    }
    
    // Check for emergency functions (be specific to avoid catching view functions)
    // Avoid catching 'unpause' (opposite of pause), 'pauser' (view), 'isPaused' (view)
    if (
      funcName === 'pause' || 
      funcName === 'freeze' ||
      funcName === 'emergency' ||
      funcName.includes('blacklist') || 
      funcName.includes('emergencystop') ||
      funcName.includes('pausetrading') ||
      funcName.includes('freezeaccount')
    ) {
      emergencyFuncs.push(item.name);
      functionDetails[item.name] = signature;
    }
    
    // Check for withdrawal functions
    if (funcName.includes('withdraw') && item.stateMutability !== 'view' && item.stateMutability !== 'pure') {
      const hasAddressParam = item.inputs?.some((i: any) => i.type === 'address');
      if (hasAddressParam || funcName.includes('rescue') || funcName.includes('recover')) {
        withdrawalFuncs.push(item.name);
        functionDetails[item.name] = signature;
      }
    }
    
    // Check for token approvals
    if (funcName === 'approve' || funcName === 'increaseallowance') {
      hasTokenApproval = true;
    }
  }
  
  // Second pass: create consolidated findings
  if (dangerousFuncs.length > 0) {
    findings.push({
      severity: 'critical',
      category: 'Dangerous Functions',
      title: `Critical: ${dangerousFuncs.length} dangerous function${dangerousFuncs.length > 1 ? 's' : ''}`,
      description: `This contract contains dangerous functions: ${dangerousFuncs.join(', ')}. These can permanently destroy the contract or execute arbitrary code.`,
      recommendation: 'Verify that these functions have proper access controls and understand the implications before interacting.',
      functions: dangerousFuncs,
      functionDetails,
    });
  }
  
  if (ownershipFuncs.length > 0) {
    findings.push({
      severity: context.isInstitutional ? 'info' : 'high',
      category: 'Ownership',
      title: `Ownership controls (${ownershipFuncs.length} function${ownershipFuncs.length > 1 ? 's' : ''})`,
      description: context.isInstitutional
        ? `This contract has ownership controls: ${ownershipFuncs.slice(0, 3).join(', ')}${ownershipFuncs.length > 3 ? ` +${ownershipFuncs.length - 3} more` : ''}. For institutional stablecoins, this is expected and necessary for regulatory compliance.`
        : `This contract has ownership functions: ${ownershipFuncs.slice(0, 3).join(', ')}${ownershipFuncs.length > 3 ? ` +${ownershipFuncs.length - 3} more` : ''}. The owner likely has elevated privileges.`,
      recommendation: context.isInstitutional
        ? 'This is normal for regulated stablecoins. Verify the owner is the legitimate issuing entity.'
        : 'Verify the current owner and understand what powers they have.',
      functions: ownershipFuncs,
      functionDetails,
    });
  }
  
  if (upgradeFuncs.length > 0) {
    findings.push({
      severity: context.isInstitutional ? 'info' : 'high',
      category: 'Upgradability',
      title: `Upgradeable contract (${upgradeFuncs.length} function${upgradeFuncs.length > 1 ? 's' : ''})`,
      description: context.isInstitutional
        ? `This contract is upgradeable via: ${upgradeFuncs.slice(0, 3).join(', ')}${upgradeFuncs.length > 3 ? ` +${upgradeFuncs.length - 3} more` : ''}. For institutional tokens, this allows bug fixes and regulatory updates.`
        : `This contract is upgradeable via: ${upgradeFuncs.slice(0, 3).join(', ')}${upgradeFuncs.length > 3 ? ` +${upgradeFuncs.length - 3} more` : ''}. The implementation can be changed by the owner.`,
      recommendation: context.isInstitutional
        ? 'Upgradability is standard for institutional tokens. Monitor announcements from the issuer for upgrade notifications.'
        : 'This means the contract logic can change. Monitor for upgrades and review new implementations.',
      functions: upgradeFuncs,
      functionDetails,
    });
  }
  
  if (emergencyFuncs.length > 0) {
    findings.push({
      severity: context.isInstitutional ? 'info' : 'medium',
      category: 'Emergency Controls',
      title: context.isInstitutional ? `Emergency controls (${emergencyFuncs.length} function${emergencyFuncs.length > 1 ? 's' : ''})` : `Emergency controls (${emergencyFuncs.length} function${emergencyFuncs.length > 1 ? 's' : ''})`,
      description: context.isInstitutional
        ? `This contract has emergency controls: ${emergencyFuncs.slice(0, 3).join(', ')}${emergencyFuncs.length > 3 ? ` +${emergencyFuncs.length - 3} more` : ''}. These are regulatory requirements for compliant stablecoins to prevent illicit use.`
        : `This contract has emergency mechanisms: ${emergencyFuncs.slice(0, 3).join(', ')}${emergencyFuncs.length > 3 ? ` +${emergencyFuncs.length - 3} more` : ''}. These can pause or restrict functionality.`,
      recommendation: context.isInstitutional
        ? 'These controls protect users from theft and meet AML/KYC requirements. This is expected for regulated tokens.'
        : 'Understand who can trigger these and what they affect.',
      functions: emergencyFuncs,
      functionDetails,
    });
  }
  
  if (withdrawalFuncs.length > 0) {
    findings.push({
      severity: 'medium',
      category: 'Fund Controls',
      title: `Withdrawal functions (${withdrawalFuncs.length} function${withdrawalFuncs.length > 1 ? 's' : ''})`,
      description: `This contract has fund withdrawal functions: ${withdrawalFuncs.slice(0, 3).join(', ')}${withdrawalFuncs.length > 3 ? ` +${withdrawalFuncs.length - 3} more` : ''}. Check access controls.`,
      recommendation: 'Verify who can call these functions and under what conditions.',
      functions: withdrawalFuncs,
      functionDetails,
    });
  }
  
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
  if (findings.length === 1) {
    findings.push({
      severity: 'info',
      category: 'Quick Scan',
      title: 'No obvious red flags detected',
      description: 'The quick scan did not detect common dangerous patterns in the ABI.',
      recommendation: 'This is a good sign, but consider running a full AI audit for comprehensive analysis.',
    });
  }
  
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

