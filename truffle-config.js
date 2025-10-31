require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.POLYGON_PRIVATE_KEY;
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const POLYGON_TESTNET_RPC_URL = process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
  networks: {
    // Development network (Ganache)
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },

    // Polygon Mumbai Testnet (Recommended for testing)
    polygonMumbai: {
      provider: () => new HDWalletProvider(PRIVATE_KEY, POLYGON_TESTNET_RPC_URL),
      network_id: 80001,
      chainId: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 6000000,
      gasPrice: 10000000000, // 10 Gwei
      networkCheckTimeout: 100000
    },

    // Polygon Mainnet (Primary - Ultra Low Gas Fees: $0.001-0.01)
    polygon: {
      provider: () => new HDWalletProvider(PRIVATE_KEY, POLYGON_RPC_URL),
      network_id: 137,
      chainId: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 6000000,
      gasPrice: 50000000000, // 50 Gwei (adjust based on network congestion)
      networkCheckTimeout: 100000
    },

    // Polygon Mainnet with Dashboard (for Ledger)
    polygonDashboard: {
      host: "127.0.0.1",
      port: 24012,
      network_id: "*"
    },

    // Ethereum Mainnet (Optional - High Gas Fees: $20-200)
    ethereum: {
      provider: () => new HDWalletProvider(PRIVATE_KEY, ETHEREUM_RPC_URL),
      network_id: 1,
      chainId: 1,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 6000000,
      gasPrice: 50000000000, // 50 Gwei
      networkCheckTimeout: 100000
    },

    // Ethereum Goerli Testnet
    goerli: {
      provider: () => new HDWalletProvider(PRIVATE_KEY, `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`),
      network_id: 5,
      chainId: 5,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "paris"
      }
    }
  },

  // Truffle DB is currently disabled by default
  db: {
    enabled: false
  },

  // Contract verification on Polygonscan and Etherscan
  plugins: [
    'truffle-plugin-verify'
  ],

  api_keys: {
    polygonscan: POLYGON_API_KEY,
    etherscan: ETHERSCAN_API_KEY
  }
};

/*
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * 1. For Polygon Mumbai Testnet (Testing):
 *    truffle migrate --network polygonMumbai
 *    
 * 2. For Polygon Mainnet (Production - LOW GAS FEES):
 *    truffle migrate --network polygon
 *    
 * 3. For Ethereum Mainnet (Only if needed - HIGH GAS FEES):
 *    truffle migrate --network ethereum
 *    
 * 4. Verify contracts on Polygonscan:
 *    truffle run verify ContractName --network polygon
 *    
 * GAS FEE COMPARISON:
 * - Polygon: ~$0.01 per transaction (RECOMMENDED)
 * - Ethereum: ~$50+ per transaction (Only for large transactions)
 * 
 * SAVINGS: Using Polygon saves 99.98% on gas fees!
 */



