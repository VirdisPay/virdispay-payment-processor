require('dotenv').config();

/**
 * Blockchain Configuration
 * Supports multiple blockchains with Polygon as primary (low gas fees)
 */

const blockchainConfig = {
  // Default blockchain to use
  defaultBlockchain: process.env.DEFAULT_BLOCKCHAIN || 'polygon',

  // Polygon Configuration (Primary - Ultra Low Gas Fees: $0.001-0.01)
  polygon: {
    name: 'Polygon',
    chainId: parseInt(process.env.POLYGON_CHAIN_ID) || 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    rpcUrlBackup: process.env.POLYGON_RPC_URL_BACKUP || 'https://rpc-mainnet.maticvigil.com',
    explorer: process.env.POLYGON_EXPLORER || 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    // Stablecoin addresses on Polygon
    stablecoins: {
      USDC: process.env.USDC_CONTRACT_POLYGON || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: process.env.USDT_CONTRACT_POLYGON || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      DAI: process.env.DAI_CONTRACT_POLYGON || '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    },
    // Contract addresses
    contracts: {
      paymentProcessor: process.env.PAYMENT_PROCESSOR_CONTRACT_POLYGON
    },
    // Gas settings
    gasSettings: {
      maxGasPrice: '500000000000', // 500 Gwei (very high for Polygon)
      gasLimit: '500000',
      averageGasCost: '0.01' // Average transaction cost in USD
    },
    // Confirmation requirements
    confirmations: {
      minimum: 30, // Faster on Polygon (2 second blocks)
      recommended: 60
    },
    // Features
    features: {
      fastFinality: true,
      lowGasFees: true,
      ethereumCompatible: true,
      recommended: true
    }
  },

  // Polygon Mumbai Testnet (for testing)
  polygonTestnet: {
    name: 'Polygon Mumbai Testnet',
    chainId: parseInt(process.env.POLYGON_TESTNET_CHAIN_ID) || 80001,
    rpcUrl: process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    explorer: process.env.POLYGON_TESTNET_EXPLORER || 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    stablecoins: {
      USDC: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23', // Mumbai USDC
      USDT: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832', // Mumbai USDT
      DAI: '0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F'  // Mumbai DAI
    },
    contracts: {
      paymentProcessor: process.env.PAYMENT_PROCESSOR_CONTRACT_POLYGON_TESTNET
    },
    gasSettings: {
      maxGasPrice: '100000000000',
      gasLimit: '500000',
      averageGasCost: '0.00' // Free on testnet
    },
    confirmations: {
      minimum: 10,
      recommended: 20
    },
    features: {
      testnet: true,
      faucetAvailable: true
    }
  },

  // Ethereum Mainnet (Optional - for large transactions only due to high gas)
  ethereum: {
    name: 'Ethereum',
    chainId: parseInt(process.env.ETHEREUM_CHAIN_ID) || 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    explorer: process.env.ETHEREUM_EXPLORER || 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    stablecoins: {
      USDC: process.env.USDC_CONTRACT_ETHEREUM || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      USDT: process.env.USDT_CONTRACT_ETHEREUM || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      DAI: process.env.DAI_CONTRACT_ETHEREUM || '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    },
    contracts: {
      paymentProcessor: process.env.PAYMENT_PROCESSOR_CONTRACT_ETHEREUM
    },
    gasSettings: {
      maxGasPrice: '100000000000', // 100 Gwei
      gasLimit: '500000',
      averageGasCost: '50.00' // High gas fees on Ethereum
    },
    confirmations: {
      minimum: 3,
      recommended: 12
    },
    features: {
      highSecurity: true,
      highGasFees: true,
      recommended: false, // Only for large transactions
      minimumAmount: 10000 // Only use for transactions > $10k
    }
  },

  // Binance Smart Chain (Optional alternative)
  bsc: {
    name: 'Binance Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    stablecoins: {
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    },
    gasSettings: {
      maxGasPrice: '10000000000', // 10 Gwei
      gasLimit: '500000',
      averageGasCost: '0.25'
    },
    confirmations: {
      minimum: 15,
      recommended: 30
    },
    features: {
      lowGasFees: true,
      fastFinality: true,
      recommended: false // Secondary option
    }
  }
};

/**
 * Get blockchain configuration
 * @param {string} blockchain - Blockchain name (polygon, ethereum, bsc)
 * @returns {object} Blockchain configuration
 */
function getBlockchainConfig(blockchain) {
  const chain = blockchain || blockchainConfig.defaultBlockchain;
  const config = blockchainConfig[chain];
  
  if (!config) {
    throw new Error(`Unsupported blockchain: ${chain}`);
  }
  
  return config;
}

/**
 * Get RPC URL for blockchain
 * @param {string} blockchain - Blockchain name
 * @returns {string} RPC URL
 */
function getRpcUrl(blockchain) {
  const config = getBlockchainConfig(blockchain);
  return config.rpcUrl;
}

/**
 * Get stablecoin address
 * @param {string} stablecoin - Stablecoin symbol (USDC, USDT, DAI)
 * @param {string} blockchain - Blockchain name
 * @returns {string} Contract address
 */
function getStablecoinAddress(stablecoin, blockchain) {
  const config = getBlockchainConfig(blockchain);
  const address = config.stablecoins[stablecoin];
  
  if (!address) {
    throw new Error(`Stablecoin ${stablecoin} not supported on ${blockchain}`);
  }
  
  return address;
}

/**
 * Get recommended blockchain for transaction
 * @param {number} amount - Transaction amount in USD
 * @returns {string} Recommended blockchain name
 */
function getRecommendedBlockchain(amount) {
  // For transactions < $10,000, use Polygon (low gas fees)
  if (amount < 10000) {
    return 'polygon';
  }
  
  // For large transactions, Ethereum provides more security
  // but you can still use Polygon if you prefer low fees
  return process.env.LARGE_TX_BLOCKCHAIN || 'polygon';
}

/**
 * Calculate estimated gas cost
 * @param {string} blockchain - Blockchain name
 * @returns {object} Gas cost estimation
 */
function estimateGasCost(blockchain) {
  const config = getBlockchainConfig(blockchain);
  return {
    blockchain: config.name,
    averageCost: config.gasSettings.averageGasCost,
    currency: 'USD',
    comparison: {
      polygon: '~$0.01',
      ethereum: '~$50.00',
      savings: blockchain === 'polygon' ? '99.98%' : '0%'
    }
  };
}

/**
 * Get all supported blockchains
 * @returns {array} List of supported blockchains
 */
function getSupportedBlockchains() {
  return Object.keys(blockchainConfig).filter(key => key !== 'defaultBlockchain');
}

/**
 * Validate blockchain is supported
 * @param {string} blockchain - Blockchain name
 * @returns {boolean} Is supported
 */
function isBlockchainSupported(blockchain) {
  return blockchain in blockchainConfig && blockchain !== 'defaultBlockchain';
}

module.exports = {
  blockchainConfig,
  getBlockchainConfig,
  getRpcUrl,
  getStablecoinAddress,
  getRecommendedBlockchain,
  estimateGasCost,
  getSupportedBlockchains,
  isBlockchainSupported
};



