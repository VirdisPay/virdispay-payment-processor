/**
 * Blockchain utility functions for multi-chain support
 * Primarily uses Polygon for ultra-low gas fees ($0.001-0.01)
 */

export interface BlockchainNetwork {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet?: boolean;
}

// Polygon Mainnet (Primary - Ultra Low Gas Fees)
export const POLYGON_MAINNET: BlockchainNetwork = {
  chainId: '0x89', // 137 in hex
  chainName: 'Polygon Mainnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  },
  rpcUrls: [
    'https://polygon-rpc.com',
    'https://rpc-mainnet.maticvigil.com'
  ],
  blockExplorerUrls: ['https://polygonscan.com']
};

// Polygon Mumbai Testnet (for testing)
export const POLYGON_TESTNET: BlockchainNetwork = {
  chainId: '0x13881', // 80001 in hex
  chainName: 'Polygon Mumbai Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  },
  rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
  blockExplorerUrls: ['https://mumbai.polygonscan.com'],
  isTestnet: true
};

// Ethereum Mainnet (Optional - for large transactions only)
export const ETHEREUM_MAINNET: BlockchainNetwork = {
  chainId: '0x1', // 1 in hex
  chainName: 'Ethereum Mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.infura.io/v3/YOUR_PROJECT_ID'],
  blockExplorerUrls: ['https://etherscan.io']
};

// Default network (Polygon for low fees)
export const DEFAULT_NETWORK = POLYGON_MAINNET;

/**
 * Switch MetaMask to Polygon network
 */
export async function switchToPolygon(): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch to Polygon
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_MAINNET.chainId }]
    });
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add Polygon network to MetaMask
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [POLYGON_MAINNET]
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Polygon network:', addError);
        throw new Error('Failed to add Polygon network to MetaMask');
      }
    } else {
      console.error('Failed to switch to Polygon:', switchError);
      throw new Error('Failed to switch to Polygon network');
    }
  }
}

/**
 * Switch to Ethereum Mainnet
 */
export async function switchToEthereum(): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ETHEREUM_MAINNET.chainId }]
    });
    return true;
  } catch (error) {
    console.error('Failed to switch to Ethereum:', error);
    throw new Error('Failed to switch to Ethereum network');
  }
}

/**
 * Switch to specific network
 */
export async function switchNetwork(network: BlockchainNetwork): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }]
    });
    return true;
  } catch (switchError: any) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network]
        });
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        throw new Error(`Failed to add ${network.chainName} to MetaMask`);
      }
    } else {
      console.error('Failed to switch network:', switchError);
      throw new Error(`Failed to switch to ${network.chainName}`);
    }
  }
}

/**
 * Get current chain ID from MetaMask
 */
export async function getCurrentChainId(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return chainId;
}

/**
 * Check if currently on Polygon
 */
export async function isOnPolygon(): Promise<boolean> {
  try {
    const chainId = await getCurrentChainId();
    return chainId === POLYGON_MAINNET.chainId;
  } catch {
    return false;
  }
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window.ethereum !== 'undefined';
}

/**
 * Get recommended network based on transaction amount
 */
export function getRecommendedNetwork(amount: number): BlockchainNetwork {
  // For transactions < $10,000, use Polygon (ultra-low fees)
  if (amount < 10000) {
    return POLYGON_MAINNET;
  }
  
  // For large transactions, can still use Polygon (or Ethereum if preferred)
  return POLYGON_MAINNET; // Still recommend Polygon even for large amounts
}

/**
 * Estimate gas cost for transaction
 */
export function estimateGasCost(network: BlockchainNetwork): { cost: string; savings: string } {
  if (network.chainId === POLYGON_MAINNET.chainId) {
    return {
      cost: '$0.01',
      savings: 'Save 99.98% vs Ethereum!'
    };
  } else if (network.chainId === ETHEREUM_MAINNET.chainId) {
    return {
      cost: '$50+',
      savings: 'Consider using Polygon to save 99.98%!'
    };
  }
  return { cost: 'Unknown', savings: '' };
}

/**
 * Get blockchain explorer URL for transaction
 */
export function getExplorerUrl(txHash: string, network: BlockchainNetwork): string {
  const baseUrl = network.blockExplorerUrls[0];
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get blockchain explorer URL for address
 */
export function getAddressExplorerUrl(address: string, network: BlockchainNetwork): string {
  const baseUrl = network.blockExplorerUrls[0];
  return `${baseUrl}/address/${address}`;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}



