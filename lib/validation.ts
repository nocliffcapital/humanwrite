import { z } from 'zod';
import { isAddress, isHex } from 'viem';

// Ethereum address validation
export const addressSchema = z
  .string()
  .refine((val) => isAddress(val), {
    message: 'Invalid Ethereum address',
  });

// ENS name validation (basic)
export const ensSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-]+\.eth$/, 'Invalid ENS name');

// Address or ENS
export const addressOrEnsSchema = z.string().refine(
  (val) => {
    // Check if it's a valid address
    if (val.startsWith('0x')) {
      return isAddress(val);
    }
    // Check if it looks like ENS
    return val.endsWith('.eth');
  },
  { message: 'Invalid address or ENS name' }
);

// Hex string validation
export const hexSchema = z.string().refine(
  (val) => isHex(val),
  { message: 'Invalid hex string' }
);

// Bytes32 validation
export const bytes32Schema = z.string().refine(
  (val) => {
    if (!isHex(val)) return false;
    // Must be 66 chars: 0x + 64 hex chars
    return val.length === 66;
  },
  { message: 'Invalid bytes32 (must be 0x + 64 hex characters)' }
);

// Dynamic bytes validation
export const bytesSchema = z.string().refine(
  (val) => isHex(val),
  { message: 'Invalid bytes (must be hex string starting with 0x)' }
);

// Uint validation (as string to handle large numbers)
export const uintSchema = z.string().refine(
  (val) => {
    // Check if it's a valid number string
    return /^\d+$/.test(val);
  },
  { message: 'Must be a positive integer' }
);

// Int validation (as string to handle large numbers)
export const intSchema = z.string().refine(
  (val) => {
    // Check if it's a valid integer string (can be negative)
    return /^-?\d+$/.test(val);
  },
  { message: 'Must be an integer' }
);

// Boolean validation
export const boolSchema = z.boolean();

// Create validation schema based on Solidity type
export const createSchemaForType = (solidityType: string): z.ZodSchema => {
  // Address type
  if (solidityType === 'address') {
    return addressSchema;
  }

  // Boolean type
  if (solidityType === 'bool') {
    return boolSchema;
  }

  // Bytes types
  if (solidityType === 'bytes32') {
    return bytes32Schema;
  }
  if (solidityType === 'bytes') {
    return bytesSchema;
  }
  if (solidityType.match(/^bytes\d+$/)) {
    const size = parseInt(solidityType.replace('bytes', ''));
    return z.string().refine(
      (val) => {
        if (!isHex(val)) return false;
        // Must be 0x + (size * 2) hex chars
        return val.length === 2 + size * 2;
      },
      { message: `Invalid ${solidityType} (must be 0x + ${size * 2} hex characters)` }
    );
  }

  // Uint types
  if (solidityType.match(/^uint\d*$/)) {
    return uintSchema;
  }

  // Int types
  if (solidityType.match(/^int\d*$/)) {
    return intSchema;
  }

  // String type
  if (solidityType === 'string') {
    return z.string();
  }

  // Array types - for now, accept JSON string
  if (solidityType.endsWith('[]')) {
    return z.string().refine(
      (val) => {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      },
      { message: 'Must be a valid JSON array' }
    );
  }

  // Default: string
  return z.string();
};

// Validate a value against a Solidity type
export const validateValue = (value: any, solidityType: string): boolean => {
  try {
    const schema = createSchemaForType(solidityType);
    schema.parse(value);
    return true;
  } catch {
    return false;
  }
};

