import type { Abi } from 'viem';
import { getChainById, getExplorerApiKey, getApiKeyEnvName } from './chains';
import { fetchFromSourcify } from './sourcify';

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

// Fetch ABI with smart fallback: Sourcify first (free!), then Etherscan
export async function fetchAbi(
  address: string,
  chainId: number
): Promise<ContractMetadata> {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // STRATEGY 1: Try Sourcify first (free, no API key required!)
  try {
    console.log('Trying Sourcify (free, no API key needed)...');
    const metadata = await fetchFromSourcify(address, chainId);
    console.log('Successfully fetched from Sourcify');
    return metadata;
  } catch (sourcifyError) {
    console.log('Sourcify failed, trying Etherscan...', sourcifyError);
    
    // STRATEGY 2: Fall back to Etherscan with API key
    return await fetchFromEtherscan(address, chainId, chain);
  }
}

// Helper: Fetch from Etherscan-style explorers
async function fetchFromEtherscan(
  address: string,
  chainId: number,
  chain: any
): Promise<ContractMetadata> {
  // Try user's API key first, then built-in key
  const userKey = getUserApiKey();
  const apiKey = userKey || getExplorerApiKey(chainId);
  const params = new URLSearchParams({
    chainid: chainId.toString(),
    module: 'contract',
    action: 'getsourcecode',
    address: address.toLowerCase(),
  });

  if (apiKey) {
    params.append('apikey', apiKey);
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
      if (apiKey) {
        codeParams.append('apikey', apiKey);
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

    console.log('Successfully fetched from Etherscan:', {
      contractName: sourceData.ContractName,
      isProxy,
      proxyFlag: sourceData.Proxy,
      implementation: sourceData.Implementation,
      functionCounts,
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

// Fetch implementation ABI if proxy (try direct ABI endpoint first)
export async function fetchImplementationAbi(
  implementationAddress: string,
  chainId: number
): Promise<Abi | null> {
  try {
    console.log(`Fetching implementation contract ABI at ${implementationAddress}`);
    
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    // Try direct ABI fetch using getabi action (might bypass proxy auto-resolution)
    const userKey = getUserApiKey();
    const apiKey = userKey || getExplorerApiKey(chainId);
    
    const abiParams = new URLSearchParams({
      chainid: chainId.toString(),
      module: 'contract',
      action: 'getabi',
      address: implementationAddress.toLowerCase(),
    });
    
    if (apiKey) {
      abiParams.append('apikey', apiKey);
    }
    
    const abiUrl = `${chain.explorerApiUrl}?${abiParams.toString()}`;
    const proxyUrl = `/api/fetch-abi?url=${encodeURIComponent(abiUrl)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (response.ok && data.status === '1' && data.result) {
      // getabi returns ABI as a JSON string
      const abi: Abi = JSON.parse(data.result);
      console.log(`Successfully fetched implementation ABI with ${abi.length} items via getabi action`);
      return abi;
    }
    
    // Fallback to getsourcecode if getabi doesn't work
    console.log('getabi failed, trying getsourcecode for implementation');
    const metadata = await fetchAbi(implementationAddress, chainId);
    
    // Check if we got proxy data back (indicates API auto-resolution issue)
    if (metadata.isProxy) {
      console.warn('⚠️ Implementation address returned proxy data - this is an Etherscan API issue');
    }
    
    console.log(`Successfully fetched implementation ABI with ${metadata.abi.length} items`);
    return metadata.abi;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch implementation ABI: ${errorMsg}`);
    
    // Don't throw, but return null so caller can decide to use proxy ABI as fallback
    return null;
  }
}

