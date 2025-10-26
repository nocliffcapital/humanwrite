import type { Abi } from 'viem';
import { getChainById, getExplorerApiKey, getApiKeyEnvName } from './chains';

export interface ContractMetadata {
  abi: Abi;
  name?: string;
  implementation?: string;
  verified: boolean;
  isProxy?: boolean;
}

export interface ExplorerResponse {
  status: string;
  message: string;
  result: string;
}

/**
 * Get user's API key from localStorage (client-side only)
 */
function getUserApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('etherscan_api_key');
}

// Fetch ABI from Etherscan (Sourcify removed due to CORS issues)
export async function fetchAbi(
  address: string,
  chainId: number
): Promise<ContractMetadata> {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // Fetch directly from Etherscan
  return await fetchFromEtherscan(address, chainId, chain);
}

// Helper: Fetch from Etherscan-style explorers
async function fetchFromEtherscan(
  address: string,
  chainId: number,
  chain: any
): Promise<ContractMetadata> {
  // Only use user's localStorage API key if they provided one
  // Otherwise, let the server route inject its secure API key
  const userKey = getUserApiKey();
  const params = new URLSearchParams({
    chainid: chainId.toString(),
    module: 'contract',
    action: 'getsourcecode',
    address: address.toLowerCase(),
  });

  // Only add API key if user explicitly provided one via localStorage
  // Server will inject its own key if none is present
  if (userKey) {
    params.append('apikey', userKey);
    console.log('Using user-provided API key from localStorage');
  } else {
    console.log('No user API key - server will inject its own');
  }

  const explorerUrl = `${chain.explorerApiUrl}?${params.toString()}`;
  // Use our API proxy to avoid CORS issues
  const url = `/api/fetch-abi?url=${encodeURIComponent(explorerUrl)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('Etherscan API response:', {
      status: data.status,
      message: data.message,
      resultType: typeof data.result,
      resultPreview: typeof data.result === 'string' ? data.result.substring(0, 100) : data.result
    });

    // Check if our proxy returned an error
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Failed to fetch contract data');
    }

    if (data.status !== '1') {
      // Check if it's an API key issue
      if (data.result && typeof data.result === 'string' && data.result.includes('API Key')) {
        throw new Error(
          `${chain.explorerName} API key required. The v2 API requires an API key to work. ` +
          `Get one at ${chain.explorerUrl}/myapikey and add it to your .env.local file as ${getApiKeyEnvName(chainId)} ` +
          `or add it via Settings`
        );
      }
      throw new Error(data.message || data.result || 'Failed to fetch contract data');
    }

    // V2 API might return result differently
    let sourceData;
    if (typeof data.result === 'string') {
      const parsed = JSON.parse(data.result);
      sourceData = Array.isArray(parsed) ? parsed[0] : parsed;
    } else if (Array.isArray(data.result)) {
      sourceData = data.result[0];
    } else {
      sourceData = data.result;
    }

    // Check if contract is verified
    if (!sourceData.ABI || sourceData.ABI === 'Contract source code not verified') {
      // Check if contract has code
      const codeParams = new URLSearchParams({
        chainid: chainId.toString(),
        module: 'proxy',
        action: 'eth_getCode',
        address: address.toLowerCase(),
        tag: 'latest',
      });
      // Only add user key if provided, server will inject its own otherwise
      if (userKey) {
        codeParams.append('apikey', userKey);
      }
      const explorerCodeUrl = `${chain.explorerApiUrl}?${codeParams.toString()}`;
      const codeUrl = `/api/fetch-abi?url=${encodeURIComponent(explorerCodeUrl)}`;
      const codeResponse = await fetch(codeUrl);
      const codeData = await codeResponse.json();

      if (!codeResponse.ok || codeData.error) {
        throw new Error(codeData.error || 'Failed to check contract code');
      }

      if (codeData.result === '0x' || codeData.result === '0x0') {
        throw new Error('NO_CONTRACT_AT_ADDRESS'); // Special error code
      }

      throw new Error('CONTRACT_NOT_VERIFIED'); // Special error code
    }

    const abi: Abi = JSON.parse(sourceData.ABI);

    // Log ABI string length before parsing for debugging
    console.log(`[fetchAbi] ABI string length: ${sourceData.ABI.length} chars`);
    console.log(`[fetchAbi] Parsed ABI has ${abi.length} total items`);

    // Check if it's a proxy
    const isProxy = sourceData.Proxy === '1' ||
                    sourceData.Implementation !== '' ||
                    abi.some((item: any) =>
                      item.type === 'function' &&
                      (item.name === 'implementation' || item.name === 'upgradeTo')
                    );

    const metadata: ContractMetadata = {
      abi,
      name: sourceData.ContractName || undefined,
      implementation: sourceData.Implementation || undefined,
      verified: true,
      isProxy,
    };

    // Count function types for debugging
    const functionCounts = {
      total: abi.length,
      functions: abi.filter((i: any) => i.type === 'function').length,
      writeFunctions: abi.filter((i: any) =>
        i.type === 'function' &&
        (i.stateMutability === 'nonpayable' || i.stateMutability === 'payable')
      ).length,
      readFunctions: abi.filter((i: any) =>
        i.type === 'function' &&
        (i.stateMutability === 'view' || i.stateMutability === 'pure')
      ).length,
      events: abi.filter((i: any) => i.type === 'event').length,
    };

    console.log('[fetchAbi] Successfully fetched from Etherscan:', {
      contractName: sourceData.ContractName,
      isProxy,
      proxyFlag: sourceData.Proxy,
      implementation: sourceData.Implementation,
      functionCounts,
      abiStringLength: sourceData.ABI.length,
    });
    return metadata;
  } catch (error) {
    console.error('Etherscan fetch error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide specific error messages based on error type
    if (errorMsg === 'NO_CONTRACT_AT_ADDRESS') {
      throw new Error(
        'No contract found at this address. ' +
        'Please check that:\n' +
        '• The address is correct\n' +
        '• A contract is deployed at this address\n' +
        '• You\'re on the right network'
      );
    }
    
    if (errorMsg === 'CONTRACT_NOT_VERIFIED') {
      throw new Error(
        '📝 Contract found but not verified. ' +
        'This app requires verified contracts to show their functions. ' +
        'Please verify the contract on the block explorer first.'
      );
    }
    
    // For other errors, suggest API key
    throw new Error(
      `Failed to fetch contract ABI. ${errorMsg}\n\n` +
      `If this persists, try adding your API key in Settings.`
    );
  }
}

// Fetch implementation ABI if proxy
// NOTE: We use getsourcecode instead of getabi to avoid Etherscan's proxy auto-resolution bug
export async function fetchImplementationAbi(
  implementationAddress: string,
  chainId: number
): Promise<Abi | null> {
  try {
    console.log(`[fetchImplementationAbi] Fetching implementation contract ABI at ${implementationAddress}`);

    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Use getsourcecode instead of getabi to avoid Etherscan's proxy auto-resolution bug
    // getabi sometimes returns the proxy ABI even when requesting the implementation address
    const userKey = getUserApiKey();
    const params = new URLSearchParams({
      chainid: chainId.toString(),
      module: 'contract',
      action: 'getsourcecode',
      address: implementationAddress.toLowerCase(),
    });

    // Only add user key if provided, server will inject its own otherwise
    if (userKey) {
      params.append('apikey', userKey);
    }

    const explorerUrl = `${chain.explorerApiUrl}?${params.toString()}`;
    const proxyUrl = `/api/fetch-abi?url=${encodeURIComponent(explorerUrl)}`;

    console.log(`[fetchImplementationAbi] Requesting getsourcecode for implementation via Etherscan`);

    const response = await fetch(proxyUrl);
    const data = await response.json();

    console.log('[fetchImplementationAbi] getsourcecode response:', {
      ok: response.ok,
      status: data.status,
      message: data.message,
      resultType: typeof data.result,
    });

    if (!response.ok || data.error) {
      console.error('[fetchImplementationAbi] Request failed:', data.error || 'Unknown error');
      return null;
    }

    if (data.status !== '1') {
      console.warn('[fetchImplementationAbi] API returned status:', data.status, data.message);
      return null;
    }

    // Parse result (can be string or array)
    let sourceData;
    if (typeof data.result === 'string') {
      const parsed = JSON.parse(data.result);
      sourceData = Array.isArray(parsed) ? parsed[0] : parsed;
    } else if (Array.isArray(data.result)) {
      sourceData = data.result[0];
    } else {
      sourceData = data.result;
    }

    // Verify we got the IMPLEMENTATION, not the proxy
    if (sourceData.Proxy === '1') {
      console.error(`[fetchImplementationAbi] ❌ API BUG: getsourcecode returned PROXY data (${sourceData.ContractName}) when requesting implementation at ${implementationAddress}`);
      console.error(`[fetchImplementationAbi] This is an Etherscan API bug. Implementation address may not be verified.`);
      return null;
    }

    // Check if implementation is verified
    if (!sourceData.ABI || sourceData.ABI === 'Contract source code not verified') {
      console.warn('[fetchImplementationAbi] Implementation contract is not verified');
      return null;
    }

    // Parse the ABI
    const abi: Abi = JSON.parse(sourceData.ABI);

    const functionCount = abi.filter((i: any) => i.type === 'function').length;
    const writeCount = abi.filter((i: any) =>
      i.type === 'function' &&
      (i.stateMutability === 'nonpayable' || i.stateMutability === 'payable')
    ).length;

    console.log(`[fetchImplementationAbi] ✅ Successfully fetched implementation ABI:`, {
      contractName: sourceData.ContractName,
      totalItems: abi.length,
      functions: functionCount,
      writeFunctions: writeCount,
      isProxy: sourceData.Proxy,
    });

    return abi;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fetchImplementationAbi] Failed to fetch implementation ABI: ${errorMsg}`);
    return null;
  }
}

