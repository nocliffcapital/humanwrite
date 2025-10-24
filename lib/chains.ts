import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  avalanche,
  sepolia,
  avalancheFuji,
} from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

export interface ChainConfig extends Chain {
  explorerUrl: string;
  explorerApiUrl: string;
  explorerName: string;
  supportsENS?: boolean;
  logo: string;
  color: string;
}

// Get API key from env for a specific chain
// Checks both server-side (preferred) and client-side (fallback) env vars
const getApiKey = (keyName: string): string => {
  // Try server-side env var first (more secure)
  const serverKey = process.env[keyName];
  if (serverKey) return serverKey;
  
  // Fallback to client-side env var (if exposed via NEXT_PUBLIC_)
  const clientKey = process.env[`NEXT_PUBLIC_${keyName}`];
  return clientKey || '';
};

// Get RPC URL from env or use default
const getRpc = (envKey: string, defaultRpc: string): string => {
  const customRpc = process.env[`NEXT_PUBLIC_${envKey}`];
  return customRpc || defaultRpc;
};

export const chainConfigs: Record<number, ChainConfig> = {
  // Ethereum Mainnet
  [mainnet.id]: {
    ...mainnet,
    rpcUrls: {
      default: {
        http: [getRpc('ETH_RPC', 'https://eth.llamarpc.com')],
      },
      public: {
        http: [getRpc('ETH_RPC', 'https://eth.llamarpc.com')],
      },
    },
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerName: 'Etherscan',
    supportsENS: true,
    logo: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
    color: '#627EEA',
  },
  // Base
  [base.id]: {
    ...base,
    rpcUrls: {
      default: {
        http: [getRpc('BASE_RPC', 'https://mainnet.base.org')],
      },
      public: {
        http: [getRpc('BASE_RPC', 'https://mainnet.base.org')],
      },
    },
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/v2/api',
    explorerName: 'BaseScan',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
    color: '#0052FF',
  },
  // Arbitrum
  [arbitrum.id]: {
    ...arbitrum,
    rpcUrls: {
      default: {
        http: [getRpc('ARB_RPC', 'https://arb1.arbitrum.io/rpc')],
      },
      public: {
        http: [getRpc('ARB_RPC', 'https://arb1.arbitrum.io/rpc')],
      },
    },
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/v2/api',
    explorerName: 'Arbiscan',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
    color: '#28A0F0',
  },
  // Optimism
  [optimism.id]: {
    ...optimism,
    rpcUrls: {
      default: {
        http: [getRpc('OPT_RPC', 'https://mainnet.optimism.io')],
      },
      public: {
        http: [getRpc('OPT_RPC', 'https://mainnet.optimism.io')],
      },
    },
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/v2/api',
    explorerName: 'Optimistic Etherscan',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
    color: '#FF0420',
  },
  // Polygon
  [polygon.id]: {
    ...polygon,
    rpcUrls: {
      default: {
        http: [getRpc('POLYGON_RPC', 'https://polygon-rpc.com')],
      },
      public: {
        http: [getRpc('POLYGON_RPC', 'https://polygon-rpc.com')],
      },
    },
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/v2/api',
    explorerName: 'PolygonScan',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
    color: '#8247E5',
  },
  // BSC
  [bsc.id]: {
    ...bsc,
    rpcUrls: {
      default: {
        http: [getRpc('BSC_RPC', 'https://bsc-dataseed.binance.org')],
      },
      public: {
        http: [getRpc('BSC_RPC', 'https://bsc-dataseed.binance.org')],
      },
    },
    explorerUrl: 'https://bscscan.com',
    explorerApiUrl: 'https://api.bscscan.com/v2/api',
    explorerName: 'BscScan',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg',
    color: '#F3BA2F',
  },
  // Avalanche C-Chain
  [avalanche.id]: {
    ...avalanche,
    rpcUrls: {
      default: {
        http: [getRpc('AVAX_RPC', 'https://api.avax.network/ext/bc/C/rpc')],
      },
      public: {
        http: [getRpc('AVAX_RPC', 'https://api.avax.network/ext/bc/C/rpc')],
      },
    },
    explorerUrl: 'https://snowtrace.io',
    explorerApiUrl: 'https://api.snowtrace.io/v2/api',
    explorerName: 'SnowTrace',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg',
    color: '#E84142',
  },
  // Sepolia Testnet
  [sepolia.id]: {
    ...sepolia,
    rpcUrls: {
      default: {
        http: [getRpc('SEPOLIA_RPC', 'https://rpc.sepolia.org')],
      },
      public: {
        http: [getRpc('SEPOLIA_RPC', 'https://rpc.sepolia.org')],
      },
    },
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/v2/api',
    explorerName: 'Etherscan',
    supportsENS: true,
    logo: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
    color: '#627EEA',
  },
  // Avalanche Fuji Testnet
  [avalancheFuji.id]: {
    ...avalancheFuji,
    rpcUrls: {
      default: {
        http: [getRpc('FUJI_RPC', 'https://api.avax-test.network/ext/bc/C/rpc')],
      },
      public: {
        http: [getRpc('FUJI_RPC', 'https://api.avax-test.network/ext/bc/C/rpc')],
      },
    },
    explorerUrl: 'https://testnet.snowtrace.io',
    explorerApiUrl: 'https://api-testnet.snowtrace.io/v2/api',
    explorerName: 'SnowTrace',
    logo: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg',
    color: '#E84142',
  },
};

export const supportedChains = Object.values(chainConfigs);

// Get API key for a specific chain
export const getApiKeyEnvName = (chainId: number): string => {
  const nameMap: Record<number, string> = {
    [mainnet.id]: 'ETHERSCAN_KEY',
    [base.id]: 'BASESCAN_KEY',
    [arbitrum.id]: 'ARBISCAN_KEY',
    [optimism.id]: 'OPTIMISTIC_ETHERSCAN_KEY',
    [polygon.id]: 'POLYGONSCAN_KEY',
    [bsc.id]: 'BSCSCAN_KEY',
    [avalanche.id]: 'SNOWTRACE_KEY',
    [sepolia.id]: 'ETHERSCAN_KEY',
    [avalancheFuji.id]: 'SNOWTRACE_KEY',
  };
  return nameMap[chainId] || 'API_KEY';
};

export const getExplorerApiKey = (chainId: number): string => {
  // Avalanche uses a different API system (SnowTrace)
  if (chainId === avalanche.id || chainId === avalancheFuji.id) {
    return getApiKey('SNOWTRACE_KEY');
  }
  
  // All Etherscan-family explorers use the same API key
  // Try chain-specific key first, then fall back to ETHERSCAN_KEY
  const chainSpecificKeys: Record<number, string> = {
    [mainnet.id]: 'ETHERSCAN_KEY',
    [base.id]: 'BASESCAN_KEY',
    [arbitrum.id]: 'ARBISCAN_KEY',
    [optimism.id]: 'OPTIMISTIC_ETHERSCAN_KEY',
    [polygon.id]: 'POLYGONSCAN_KEY',
    [bsc.id]: 'BSCSCAN_KEY',
    [sepolia.id]: 'ETHERSCAN_KEY',
  };
  
  const specificKey = chainSpecificKeys[chainId];
  if (specificKey) {
    const key = getApiKey(specificKey);
    // If chain-specific key not found, fall back to ETHERSCAN_KEY
    return key || getApiKey('ETHERSCAN_KEY');
  }
  
  return getApiKey('ETHERSCAN_KEY');
};

export const getChainById = (chainId: number): ChainConfig | undefined => {
  return chainConfigs[chainId];
};

