const axios = require('axios');
const { ethers } = require('ethers');

/**
 * Network Monitor Service
 * Monitors real-time gas prices and network conditions across multiple blockchains
 */
class NetworkMonitorService {
  constructor() {
    this.networks = {
      polygon: {
        name: 'Polygon',
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        nativeCurrency: 'MATIC',
        explorer: 'https://polygonscan.com',
        provider: null,
        lastUpdate: null,
        gasPrice: null,
        gasPriceGwei: null,
        estimatedCost: null,
        speed: 'fast',
        reliability: 0.99
      },
      ethereum: {
        name: 'Ethereum',
        chainId: 1,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        nativeCurrency: 'ETH',
        explorer: 'https://etherscan.io',
        provider: null,
        lastUpdate: null,
        gasPrice: null,
        gasPriceGwei: null,
        estimatedCost: null,
        speed: 'slow',
        reliability: 0.95
      },
      bsc: {
        name: 'BSC',
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed1.binance.org/',
        nativeCurrency: 'BNB',
        explorer: 'https://bscscan.com',
        provider: null,
        lastUpdate: null,
        gasPrice: null,
        gasPriceGwei: null,
        estimatedCost: null,
        speed: 'medium',
        reliability: 0.98
      },
      arbitrum: {
        name: 'Arbitrum',
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        nativeCurrency: 'ETH',
        explorer: 'https://arbiscan.io',
        provider: null,
        lastUpdate: null,
        gasPrice: null,
        gasPriceGwei: null,
        estimatedCost: null,
        speed: 'very-fast',
        reliability: 0.97
      }
    };

    this.updateInterval = 30000; // Update every 30 seconds
    this.isMonitoring = false;
    this.monitorInterval = null;

    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize Web3 providers for each network
   */
  initializeProviders() {
    Object.keys(this.networks).forEach(networkKey => {
      const network = this.networks[networkKey];
      try {
        network.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      } catch (error) {
        console.error(`Failed to initialize provider for ${network.name}:`, error);
      }
    });
  }

  /**
   * Start monitoring network conditions
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🚀 Starting network monitoring...');

    // Initial update
    this.updateAllNetworks();

    // Set up periodic updates
    this.monitorInterval = setInterval(() => {
      this.updateAllNetworks();
    }, this.updateInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('⏹️ Network monitoring stopped');
  }

  /**
   * Update all network conditions
   */
  async updateAllNetworks() {
    const updatePromises = Object.keys(this.networks).map(networkKey => 
      this.updateNetwork(networkKey)
    );

    try {
      await Promise.allSettled(updatePromises);
    } catch (error) {
      console.error('Error updating networks:', error);
    }
  }

  /**
   * Update specific network conditions
   */
  async updateNetwork(networkKey) {
    const network = this.networks[networkKey];
    if (!network.provider) return;

    try {
      // Get current gas price
      const gasPrice = await network.provider.getFeeData();
      const gasPriceGwei = ethers.formatUnits(gasPrice.gasPrice, 'gwei');

      // Calculate estimated cost for a standard ERC20 transfer
      const gasLimit = 21000; // Standard transfer
      const gasCostWei = gasPrice.gasPrice * BigInt(gasLimit);
      const gasCostEth = ethers.formatEther(gasCostWei);

      // Get current token prices (simplified - in production, use real API)
      const tokenPrices = await this.getTokenPrices();
      const nativePrice = tokenPrices[network.nativeCurrency] || 1;

      // Calculate estimated cost in USD
      const estimatedCost = parseFloat(gasCostEth) * nativePrice;

      // Update network data
      network.gasPrice = gasPrice.gasPrice;
      network.gasPriceGwei = parseFloat(gasPriceGwei);
      network.estimatedCost = estimatedCost;
      network.lastUpdate = new Date();

      // Update speed based on gas price
      network.speed = this.calculateSpeed(networkKey, network.gasPriceGwei);

      console.log(`📊 ${network.name}: ${network.gasPriceGwei.toFixed(2)} Gwei, $${estimatedCost.toFixed(4)}`);

    } catch (error) {
      console.error(`Failed to update ${network.name}:`, error);
      network.reliability = Math.max(0.5, network.reliability - 0.1);
    }
  }

  /**
   * Get current token prices (simplified)
   */
  async getTokenPrices() {
    try {
      // In production, use a real price API like CoinGecko
      return {
        ETH: 2000, // $2000
        MATIC: 0.8, // $0.80
        BNB: 300, // $300
        USD: 1
      };
    } catch (error) {
      console.error('Failed to get token prices:', error);
      return {
        ETH: 2000,
        MATIC: 0.8,
        BNB: 300,
        USD: 1
      };
    }
  }

  /**
   * Calculate network speed based on gas price
   */
  calculateSpeed(networkKey, gasPriceGwei) {
    switch (networkKey) {
      case 'polygon':
        return gasPriceGwei < 50 ? 'very-fast' : 'fast';
      case 'ethereum':
        return gasPriceGwei < 20 ? 'fast' : gasPriceGwei < 50 ? 'medium' : 'slow';
      case 'bsc':
        return gasPriceGwei < 10 ? 'fast' : 'medium';
      case 'arbitrum':
        return 'very-fast';
      default:
        return 'medium';
    }
  }

  /**
   * Get optimal network for a payment
   */
  getOptimalNetwork(amount, urgency = 'normal', preferences = {}) {
    const networks = Object.values(this.networks).filter(network => 
      network.lastUpdate && 
      network.reliability > 0.8 &&
      Date.now() - network.lastUpdate.getTime() < 60000 // Data less than 1 minute old
    );

    if (networks.length === 0) {
      return this.networks.polygon; // Fallback to Polygon
    }

    // Score each network
    const scoredNetworks = networks.map(network => {
      let score = 0;

      // Cost factor (lower is better)
      const costScore = Math.max(0, 100 - (network.estimatedCost * 1000));
      score += costScore * 0.4;

      // Speed factor
      const speedScores = {
        'very-fast': 100,
        'fast': 80,
        'medium': 60,
        'slow': 40
      };
      score += speedScores[network.speed] * 0.3;

      // Reliability factor
      score += network.reliability * 100 * 0.2;

      // Urgency factor
      if (urgency === 'high') {
        const urgencyScores = {
          'very-fast': 50,
          'fast': 30,
          'medium': 10,
          'slow': 0
        };
        score += urgencyScores[network.speed] * 0.1;
      }

      // Amount-based routing
      if (amount < 100) {
        // Small payments: prioritize cost
        score += costScore * 0.2;
      } else if (amount > 1000) {
        // Large payments: prioritize reliability
        score += network.reliability * 100 * 0.2;
      }

      return {
        network,
        score
      };
    });

    // Sort by score and return the best
    scoredNetworks.sort((a, b) => b.score - a.score);
    return scoredNetworks[0].network;
  }

  /**
   * Get all network statuses
   */
  getAllNetworksStatus() {
    return Object.keys(this.networks).map(key => ({
      key,
      ...this.networks[key],
      isOptimal: false // Will be set by caller
    }));
  }

  /**
   * Get network by key
   */
  getNetwork(key) {
    return this.networks[key];
  }

  /**
   * Get routing recommendations
   */
  getRoutingRecommendations(amount, urgency = 'normal') {
    const optimal = this.getOptimalNetwork(amount, urgency);
    const allNetworks = this.getAllNetworksStatus();

    return {
      optimal,
      alternatives: allNetworks
        .filter(n => n.key !== optimal.name.toLowerCase())
        .sort((a, b) => a.estimatedCost - b.estimatedCost)
        .slice(0, 3),
      savings: this.calculateSavings(optimal, allNetworks),
      recommendation: this.getRecommendationText(optimal, amount)
    };
  }

  /**
   * Calculate potential savings
   */
  calculateSavings(optimal, allNetworks) {
    const mostExpensive = allNetworks.reduce((max, network) => 
      network.estimatedCost > max.estimatedCost ? network : max
    );

    if (mostExpensive.estimatedCost <= optimal.estimatedCost) {
      return { amount: 0, percentage: 0 };
    }

    const savings = mostExpensive.estimatedCost - optimal.estimatedCost;
    const percentage = (savings / mostExpensive.estimatedCost) * 100;

    return {
      amount: savings,
      percentage: percentage
    };
  }

  /**
   * Get recommendation text
   */
  getRecommendationText(optimal, amount) {
    if (amount < 100) {
      return `For small payments like $${amount}, ${optimal.name} offers the best value with ultra-low fees.`;
    } else if (amount > 1000) {
      return `For large payments like $${amount}, ${optimal.name} provides the best balance of cost and reliability.`;
    } else {
      return `${optimal.name} is optimal for this payment amount with ${optimal.speed} confirmation times.`;
    }
  }
}

// Export singleton instance
module.exports = new NetworkMonitorService();



