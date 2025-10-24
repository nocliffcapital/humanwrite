import type { Abi } from 'viem';
import type { ContractMetadata } from './explorers';

// Sourcify chain IDs mapping (they use different IDs for some chains)
const SOURCIFY_CHAIN_MAP: Record<number, number> = {
  1: 1,        // Ethereum Mainnet
  8453: 8453,  // Base
  42161: 42161, // Arbitrum
  10: 10,      // Optimism
  137: 137,    // Polygon
  56: 56,      // BSC
  43114: 43114, // Avalanche
  11155111: 11155111, // Sepolia
  43113: 43113, // Avalanche Fuji
};

interface SourcifyFile {
  name: string;
  path: string;
  content?: string;
}

interface SourcifyResponse {
  files: SourcifyFile[];
  status: string;
}

/**
 * Fetch ABI from Sourcify (decentralized verification platform)
 * No API key required!
 */
export async function fetchFromSourcify(
  address: string,
  chainId: number
): Promise<ContractMetadata> {
  const sourcifyChainId = SOURCIFY_CHAIN_MAP[chainId];
  
  if (!sourcifyChainId) {
    throw new Error(`Chain ${chainId} not supported by Sourcify`);
  }

  // Sourcify API endpoint
  const url = `https://repo.sourcify.dev/contracts/full_match/${sourcifyChainId}/${address.toLowerCase()}/`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      // Try partial match if full match fails
      const partialUrl = `https://repo.sourcify.dev/contracts/partial_match/${sourcifyChainId}/${address.toLowerCase()}/`;
      const partialResponse = await fetch(partialUrl);
      
      if (!partialResponse.ok) {
        throw new Error('Contract not verified on Sourcify');
      }
      
      return await parseSourcifyResponse(partialResponse, address);
    }
    
    return await parseSourcifyResponse(response, address);
  } catch (error) {
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to fetch from Sourcify'
    );
  }
}

async function parseSourcifyResponse(
  response: Response,
  address: string
): Promise<ContractMetadata> {
  // Sourcify returns a directory listing, we need to find the metadata.json
  const text = await response.text();
  
  // Try to get the metadata.json file
  const metadataUrl = response.url + 'metadata.json';
  const metadataResponse = await fetch(metadataUrl);
  
  if (!metadataResponse.ok) {
    throw new Error('Could not find contract metadata');
  }
  
  const metadata = await metadataResponse.json();
  
  // Extract ABI from metadata
  const abi = metadata.output?.abi;
  
  if (!abi || !Array.isArray(abi)) {
    throw new Error('Invalid ABI in Sourcify metadata');
  }

  // Get contract name from metadata
  const contractName = metadata.settings?.compilationTarget
    ? Object.values(metadata.settings.compilationTarget)[0] as string
    : undefined;

  return {
    abi: abi as Abi,
    name: contractName || 'Unknown Contract',
    verified: true,
  };
}

