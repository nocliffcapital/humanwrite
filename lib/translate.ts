import type { AbiParameter } from 'viem';

export type UnitType =
  | 'raw'
  | 'wei'
  | 'gwei'
  | 'ether'
  | 'token'
  | 'bps'
  | 'percent'
  | 'timestamp'
  | 'bytes32-text'
  | 'none';

export interface ParamHint {
  unitType: UnitType;
  label: string;
  example: string;
  description?: string;
}

// Parameter name patterns for different unit types
// NOTE: Order matters! More specific patterns should come first.
// These use word boundaries to avoid false positives.

// Parameters that should NEVER be treated as special types (checked FIRST)
const RAW_ONLY_PATTERNS = [
  'decimals', 'precision', 'scale', 'nonce', 'id', 'index', 
  'length', 'count', 'size', 'iteration', 'round', 'epoch',
  'version', 'type', 'status', 'state', 'mode', 'flag'
];

// Amount/value patterns - these should show token converter by default
const AMOUNT_PATTERNS = [
  'amount', 'value', 'qty', 'quantity', 'wad', 'shares', 'assets', 
  'tokens', 'balance', 'supply'
];

// Fee/rate patterns - avoid catching address suffixes like 'transferee'
const FEE_PATTERNS = [
  'feebps', 'bps', 'basispoints', 'feerate', 
  'interestrate', 'apr', 'apy'
];

// Timestamp patterns - be specific to avoid catching unrelated words
const TIMESTAMP_PATTERNS = [
  'deadline', 'timestamp', 'unlocktime', 'locktime', 
  'starttime', 'endtime', 'expiry', 'expires', 'maturity',
  'vestingend', 'vestingstart'
];

const ADDRESS_PATTERNS = ['address', 'to', 'from', 'recipient', 'sender', 'spender', 'owner'];

// Helper: Check if parameter name matches a pattern
// Uses smart matching to avoid false positives
function matchesPattern(name: string, patterns: string[]): boolean {
  const nameLower = name.toLowerCase();
  
  return patterns.some(pattern => {
    // Exact match
    if (nameLower === pattern) return true;
    
    // Pattern at start of name (e.g., "amount" matches "amountIn")
    if (nameLower.startsWith(pattern)) {
      // Make sure next char is uppercase or underscore (word boundary)
      const nextChar = name[pattern.length];
      return !nextChar || nextChar === nextChar.toUpperCase() || nextChar === '_';
    }
    
    // Pattern at end of name (e.g., "amount" matches "swapAmount")
    if (nameLower.endsWith(pattern)) {
      // Make sure previous char is uppercase or underscore (word boundary)
      const prevChar = name[name.length - pattern.length - 1];
      return !prevChar || prevChar === prevChar.toUpperCase() || prevChar === '_';
    }
    
    // Pattern in middle with word boundaries (e.g., "amount" matches "max_amount_in")
    if (nameLower.includes('_' + pattern + '_')) return true;
    if (nameLower.includes('_' + pattern)) {
      const afterPattern = name[nameLower.indexOf('_' + pattern) + pattern.length + 1];
      return !afterPattern || afterPattern === afterPattern.toUpperCase();
    }
    
    // Check for camelCase word boundary (e.g., "amount" in "maxAmountOut")
    const camelPattern = new RegExp(`[A-Z]${pattern}(?=[A-Z]|$)`, 'i');
    if (camelPattern.test(name)) return true;
    
    return false;
  });
}

// Infer unit type from parameter name and type
export function inferUnitType(param: AbiParameter): UnitType {
  const name = param.name?.toLowerCase() || '';
  const type = param.type;

  // Address type
  if (type === 'address') {
    return 'none';
  }

  // Bytes32 - could be text
  if (type === 'bytes32') {
    return 'bytes32-text';
  }

  // For uint/int types
  if (type.startsWith('uint') || type.startsWith('int')) {
    // First check if this should be raw-only (decimals, nonce, etc.)
    // Use simple includes for RAW_ONLY since we want to be strict
    if (RAW_ONLY_PATTERNS.some((p) => name.includes(p))) {
      return 'raw';
    }
    
    // Check for timestamp (use smart matching)
    if (matchesPattern(param.name || '', TIMESTAMP_PATTERNS)) {
      return 'timestamp';
    }

    // Check for BPS/fee (use smart matching)
    if (matchesPattern(param.name || '', FEE_PATTERNS)) {
      return 'bps';
    }

    // Check for amount/value (use smart matching)
    if (matchesPattern(param.name || '', AMOUNT_PATTERNS)) {
      return 'token'; // Default to token, will show converter
    }

    return 'raw';
  }

  return 'none';
}

// Get contextual hint for a parameter based on function name
function getContextualHint(param: AbiParameter, functionName?: string): string | undefined {
  const paramName = param.name?.toLowerCase() || '';
  const funcName = functionName?.toLowerCase() || '';
  
  // Contextual hints based on function + parameter combinations
  if (funcName.includes('increment') || funcName.includes('increase')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `📈 This will INCREASE by the amount you enter. Example: Entering 100 will add 100 to the current value.`;
    }
  }
  
  if (funcName.includes('decrement') || funcName.includes('decrease')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `📉 This will DECREASE by the amount you enter. Example: Entering 100 will subtract 100 from the current value.`;
    }
  }
  
  if (funcName.includes('set') && !funcName.includes('reset')) {
    if (paramName.includes('value') || paramName.includes('amount')) {
      return `This will SET a value to exactly what you enter. Example: Entering 100 will make it 100 (not add to existing).`;
    }
  }
  
  if (funcName.includes('approve')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `This is the MAXIMUM amount the spender can transfer from your balance. Use a large number for unlimited approval.`;
    }
    if (paramName.includes('spender') || paramName.includes('address')) {
      return `The address that will be allowed to spend your tokens on your behalf.`;
    }
  }
  
  if (funcName.includes('transfer')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `The exact amount that will be sent. This amount will leave your wallet.`;
    }
    if (paramName.includes('to') || paramName.includes('recipient')) {
      return `The wallet address that will receive the tokens/assets.`;
    }
    if (paramName.includes('from') || paramName.includes('sender')) {
      return `The wallet address that tokens will be taken from (must have approved you).`;
    }
  }
  
  if (funcName.includes('mint')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `This will CREATE new tokens. Entering 100 will mint 100 new tokens.`;
    }
    if (paramName.includes('to') || paramName.includes('recipient')) {
      return `The wallet address that will receive the newly minted tokens.`;
    }
  }
  
  if (funcName.includes('burn')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `This will PERMANENTLY DESTROY tokens. Entering 100 will remove 100 tokens from circulation forever.`;
    }
  }
  
  if (funcName.includes('withdraw')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `The amount you want to take out. This will be removed from the contract and sent to you.`;
    }
  }
  
  if (funcName.includes('deposit') || funcName.includes('stake')) {
    if (paramName.includes('amount') || paramName.includes('value')) {
      return `The amount you want to put in. This will be locked in the contract.`;
    }
  }
  
  return undefined;
}

// Get parameter hint
export function getParamHint(param: AbiParameter, functionName?: string): ParamHint {
  const unitType = inferUnitType(param);
  const name = param.name || 'value';
  
  // Try to get contextual hint first
  const contextualDesc = getContextualHint(param, functionName);

  switch (unitType) {
    case 'token':
      return {
        unitType,
        label: name,
        example: '100.0',
        description: contextualDesc || 'Token amount (will be converted based on decimals)',
      };
    case 'bps':
      return {
        unitType,
        label: name,
        example: '125 (1.25%)',
        description: contextualDesc || 'Basis points (100 bps = 1%)',
      };
    case 'timestamp':
      return {
        unitType,
        label: name,
        example: '2024-12-31 23:59:59',
        description: contextualDesc || 'Date/time (will be converted to Unix timestamp)',
      };
    case 'bytes32-text':
      return {
        unitType,
        label: name,
        example: 'hello',
        description: contextualDesc || 'Text (will be encoded to bytes32)',
      };
    default:
      return {
        unitType,
        label: name,
        example: getExampleForType(param.type),
        description: contextualDesc || getDescriptionForType(param.type),
      };
  }
}

// Get example value for a type
function getExampleForType(type: string): string {
  if (type === 'address') return '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  if (type === 'bool') return 'true';
  if (type.startsWith('uint') || type.startsWith('int')) return '100';
  
  // Specific examples for bytes types
  if (type === 'bytes32') {
    return '0x48656c6c6f000000000000000000000000000000000000000000000000000000 or "Hello"';
  }
  if (type === 'bytes4') {
    return '0x12345678';
  }
  if (type === 'bytes') {
    return '0x1234567890abcdef';
  }
  if (type.match(/^bytes\d+$/)) {
    const size = parseInt(type.replace('bytes', ''), 10);
    const hexExample = '0x' + '12'.repeat(Math.min(size, 4));
    return hexExample + (size > 4 ? '...' : '');
  }
  
  if (type === 'string') return 'Hello, World!';
  if (type.endsWith('[]')) return '["value1", "value2"]';
  return '';
}

// Get description for a type
function getDescriptionForType(type: string): string {
  if (type === 'address') return 'Ethereum address (42 chars starting with 0x) or ENS name';
  if (type === 'bool') return 'Boolean: true or false';
  if (type.startsWith('uint')) return 'Unsigned integer (positive whole numbers only, no decimals)';
  if (type.startsWith('int')) return 'Signed integer (can be negative, no decimals)';
  
  // Specific descriptions for bytes types
  if (type === 'bytes32') {
    return 'Exactly 32 bytes: 0x + 64 hex chars, or plain text (will be encoded & padded)';
  }
  if (type.match(/^bytes\d+$/)) {
    const size = parseInt(type.replace('bytes', ''), 10);
    return `Exactly ${size} bytes: 0x + ${size * 2} hex characters`;
  }
  if (type === 'bytes') {
    return 'Variable-length bytes: 0x followed by hex characters (pairs)';
  }
  
  if (type === 'string') return 'Any text string (UTF-8)';
  if (type.endsWith('[]')) return 'Array in JSON format';
  return '';
}

// Human-readable function labels
export const FUNCTION_LABELS: Record<string, string> = {
  'approve(address,uint256)': 'Approve spender to spend your tokens',
  'transfer(address,uint256)': 'Transfer tokens to another address',
  'transferFrom(address,address,uint256)': 'Transfer tokens from one address to another',
  'mint(address,uint256)': 'Mint new tokens',
  'burn(uint256)': 'Burn your tokens',
  'stake(uint256)': 'Stake tokens',
  'unstake(uint256)': 'Unstake tokens',
  'claim()': 'Claim rewards',
  'withdraw(uint256)': 'Withdraw amount',
  'deposit(uint256)': 'Deposit amount',
  'swap(uint256,uint256,address[],address,uint256)': 'Swap tokens',
};

// Get human label for function
export function getFunctionLabel(signature: string, name: string): string {
  return FUNCTION_LABELS[signature] || name;
}

// Format hints for dangerous functions
export const DANGER_HINTS: Record<string, string> = {
  transferownership: 'Transfer contract ownership. This is irreversible!',
  upgradeto: 'Upgrade contract implementation. Could break functionality!',
  pause: 'Pause contract. Users may be unable to interact!',
  emergencywithdraw: 'Emergency withdrawal. May affect contract state!',
  selfdestruct: 'DESTROY CONTRACT PERMANENTLY. Cannot be undone!',
};

export function getDangerHint(functionName: string): string {
  const normalized = functionName.toLowerCase().replace(/[_\s]/g, '');
  for (const [pattern, hint] of Object.entries(DANGER_HINTS)) {
    if (normalized.includes(pattern)) {
      return hint;
    }
  }
  return 'This function modifies critical contract state. Proceed with caution!';
}

