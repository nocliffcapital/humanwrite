import type { Abi, AbiFunction } from 'viem';

export interface ParsedFunction extends AbiFunction {
  signature: string;
  displayName: string;
  isDangerous: boolean;
  notice?: string;
}

// Dangerous function patterns
// Note: These should be specific to avoid false positives
const DANGEROUS_PATTERNS = [
  'transferownership',
  'setowner',
  'upgradeto',
  'upgradetoandcall',
  'setguardian',
  'settreasury',
  'emergencywithdraw',
  'selfdestruct',
  'destroy',
  'initialize',
  'reinitialize',
  'setadmin',
  'renounceownership',
  'transfercontrol',
  'setimplementation',
];

// Check if function is dangerous
export function isDangerousFunction(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[_\s]/g, '');
  
  // Exact match or starts with pattern (more specific)
  return DANGEROUS_PATTERNS.some((pattern) => {
    // Exact match after normalization
    if (normalized === pattern) return true;
    
    // Starts with pattern (e.g., "initializeProxy" starts with "initialize")
    if (normalized.startsWith(pattern)) return true;
    
    return false;
  });
}

// Parse write functions from ABI
export function parseWriteFunctions(abi: Abi): ParsedFunction[] {
  const writeFunctions = abi.filter(
    (item): item is AbiFunction =>
      item.type === 'function' &&
      (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable')
  );

  return writeFunctions.map((func) => {
    // Create function signature
    const paramTypes = func.inputs.map((input) => input.type).join(',');
    const signature = `${func.name}(${paramTypes})`;

    // Create display name (handle overloads)
    const displayName = paramTypes ? `${func.name}(${paramTypes})` : func.name;

    return {
      ...func,
      signature,
      displayName,
      isDangerous: isDangerousFunction(func.name),
    };
  });
}

// Parse read functions from ABI
export function parseReadFunctions(abi: Abi): ParsedFunction[] {
  const readFunctions = abi.filter(
    (item): item is AbiFunction =>
      item.type === 'function' &&
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
  );

  return readFunctions.map((func) => {
    const paramTypes = func.inputs.map((input) => input.type).join(',');
    const signature = `${func.name}(${paramTypes})`;
    const displayName = paramTypes ? `${func.name}(${paramTypes})` : func.name;

    return {
      ...func,
      signature,
      displayName,
      isDangerous: false,
    };
  });
}

// Get common ERC-20/ERC-721 read functions
export const COMMON_READ_FUNCTIONS = [
  'name',
  'symbol',
  'decimals',
  'totalSupply',
  'owner',
  'paused',
  'version',
  'balanceOf',
  'allowance',
];

// Filter for key read functions
export function getKeyReadFunctions(abi: Abi): ParsedFunction[] {
  const readFunctions = parseReadFunctions(abi);
  
  return readFunctions.filter((func) => {
    // Check if it's a common read function with no inputs (or simple inputs)
    const isCommon = COMMON_READ_FUNCTIONS.includes(func.name);
    const hasSimpleInputs = func.inputs.length === 0 || 
                           (func.inputs.length <= 2 && func.inputs.every(i => 
                             i.type === 'address' || i.type === 'uint256'
                           ));
    
    return isCommon && hasSimpleInputs;
  });
}

// Group overloaded functions
export function groupOverloadedFunctions(
  functions: ParsedFunction[]
): Map<string, ParsedFunction[]> {
  const grouped = new Map<string, ParsedFunction[]>();

  functions.forEach((func) => {
    const existing = grouped.get(func.name) || [];
    existing.push(func);
    grouped.set(func.name, existing);
  });

  return grouped;
}

