const NetworkMonitorService = require('./NetworkMonitorService');
const { ethers } = require('ethers');

/**
 * Smart Routing Service
 * Handles intelligent payment routing across multiple blockchains
 */
class SmartRoutingService {
  constructor() {
    this.networkMonitor = NetworkMonitorService;
    this.routingHistory = new Map(); // Store routing decisions for analytics
    this.merchantPreferences = new Map(); // Store merchant-specific preferences
  }

  /**
   * Get optimal routing for a payment
   */
  async getOptimalRouting(paymentData, merchantId = null) {
    const {
      amount,
      currency,
      urgency = 'normal',
      customerPreferences = {}
    } = paymentData;

    // Get merchant preferences if available
    const merchantPrefs = merchantId ? this.getMerchantPreferences(merchantId) : {};

    // Get network recommendations
    const recommendations = this.networkMonitor.getRoutingRecommendations(amount, urgency);

    // Apply merchant preferences
    const finalRecommendation = this.applyMerchantPreferences(
      recommendations,
      merchantPrefs,
      customerPreferences
    );

    // Store routing decision for analytics
    this.storeRoutingDecision(merchantId, paymentData, finalRecommendation);

    return {
      ...finalRecommendation,
      routingId: this.generateRoutingId(),
      timestamp: new Date(),
      merchantId,
      paymentAmount: amount,
      currency
    };
  }

  /**
   * Apply merchant preferences to routing decision
   */
  applyMerchantPreferences(recommendations, merchantPrefs, customerPrefs) {
    let optimal = recommendations.optimal;

    // Check if merchant has network preferences
    if (merchantPrefs.preferredNetworks && merchantPrefs.preferredNetworks.length > 0) {
      const preferredNetwork = this.networkMonitor.getNetwork(merchantPrefs.preferredNetworks[0]);
      if (preferredNetwork && preferredNetwork.reliability > 0.8) {
        optimal = preferredNetwork;
      }
    }

    // Check if merchant has cost vs speed preferences
    if (merchantPrefs.priority === 'cost') {
      // Find cheapest network
      const cheapest = recommendations.alternatives
        .concat([recommendations.optimal])
        .reduce((min, network) => 
          network.estimatedCost < min.estimatedCost ? network : min
        );
      optimal = cheapest;
    } else if (merchantPrefs.priority === 'speed') {
      // Find fastest network
      const fastest = recommendations.alternatives
        .concat([recommendations.optimal])
        .reduce((fast, network) => {
          const speedOrder = { 'very-fast': 4, 'fast': 3, 'medium': 2, 'slow': 1 };
          return speedOrder[network.speed] > speedOrder[fast.speed] ? network : fast;
        });
      optimal = fastest;
    }

    // Check customer preferences (if they want to override)
    if (customerPrefs.network) {
      const customerNetwork = this.networkMonitor.getNetwork(customerPrefs.network);
      if (customerNetwork && customerNetwork.reliability > 0.7) {
        optimal = customerNetwork;
      }
    }

    return {
      ...recommendations,
      optimal,
      appliedPreferences: {
        merchant: merchantPrefs,
        customer: customerPrefs
      }
    };
  }

  /**
   * Get merchant preferences
   */
  getMerchantPreferences(merchantId) {
    return this.merchantPreferences.get(merchantId) || {
      priority: 'balanced', // 'cost', 'speed', 'balanced'
      preferredNetworks: [],
      maxGasPrice: null,
      minReliability: 0.8
    };
  }

  /**
   * Set merchant preferences
   */
  setMerchantPreferences(merchantId, preferences) {
    this.merchantPreferences.set(merchantId, {
      ...this.getMerchantPreferences(merchantId),
      ...preferences
    });
  }

  /**
   * Store routing decision for analytics
   */
  storeRoutingDecision(merchantId, paymentData, recommendation) {
    const routingId = this.generateRoutingId();
    const decision = {
      routingId,
      merchantId,
      timestamp: new Date(),
      paymentAmount: paymentData.amount,
      currency: paymentData.currency,
      selectedNetwork: recommendation.optimal.name,
      alternatives: recommendation.alternatives.map(n => n.name),
      savings: recommendation.savings,
      appliedPreferences: recommendation.appliedPreferences
    };

    this.routingHistory.set(routingId, decision);

    // Keep only last 1000 decisions to prevent memory issues
    if (this.routingHistory.size > 1000) {
      const oldestKey = this.routingHistory.keys().next().value;
      this.routingHistory.delete(oldestKey);
    }
  }

  /**
   * Generate unique routing ID
   */
  generateRoutingId() {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get routing analytics for a merchant
   */
  getRoutingAnalytics(merchantId, timeRange = '7d') {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const merchantDecisions = Array.from(this.routingHistory.values())
      .filter(decision => 
        decision.merchantId === merchantId &&
        decision.timestamp >= startDate
      );

    if (merchantDecisions.length === 0) {
      return {
        totalPayments: 0,
        totalSavings: 0,
        averageSavings: 0,
        networkUsage: {},
        recommendations: []
      };
    }

    // Calculate analytics
    const totalSavings = merchantDecisions.reduce((sum, decision) => 
      sum + (decision.savings?.amount || 0), 0
    );

    const networkUsage = merchantDecisions.reduce((usage, decision) => {
      usage[decision.selectedNetwork] = (usage[decision.selectedNetwork] || 0) + 1;
      return usage;
    }, {});

    const averageSavings = totalSavings / merchantDecisions.length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(merchantDecisions);

    return {
      totalPayments: merchantDecisions.length,
      totalSavings,
      averageSavings,
      networkUsage,
      recommendations,
      timeRange
    };
  }

  /**
   * Generate recommendations based on routing history
   */
  generateRecommendations(decisions) {
    const recommendations = [];

    // Check if merchant is using expensive networks
    const expensiveNetworks = ['Ethereum'];
    const expensiveUsage = decisions.filter(d => 
      expensiveNetworks.includes(d.selectedNetwork)
    ).length;

    if (expensiveUsage > decisions.length * 0.3) {
      recommendations.push({
        type: 'cost-optimization',
        message: 'Consider using Polygon for smaller payments to save on gas fees',
        impact: 'Could save up to 99% on transaction fees'
      });
    }

    // Check if merchant could benefit from speed optimization
    const slowNetworks = ['Ethereum'];
    const slowUsage = decisions.filter(d => 
      slowNetworks.includes(d.selectedNetwork)
    ).length;

    if (slowUsage > decisions.length * 0.5) {
      recommendations.push({
        type: 'speed-optimization',
        message: 'Consider using faster networks like Polygon or Arbitrum for better customer experience',
        impact: 'Could reduce payment confirmation time from 15+ seconds to 2 seconds'
      });
    }

    return recommendations;
  }

  /**
   * Get real-time network status
   */
  getNetworkStatus() {
    return {
      networks: this.networkMonitor.getAllNetworksStatus(),
      lastUpdate: new Date(),
      monitoring: this.networkMonitor.isMonitoring
    };
  }

  /**
   * Simulate routing for different scenarios
   */
  simulateRouting(scenarios) {
    return scenarios.map(scenario => {
      const recommendation = this.networkMonitor.getRoutingRecommendations(
        scenario.amount,
        scenario.urgency
      );
      
      return {
        scenario,
        recommendation,
        estimatedCost: recommendation.optimal.estimatedCost,
        estimatedTime: this.getEstimatedTime(recommendation.optimal.speed)
      };
    });
  }

  /**
   * Get estimated confirmation time
   */
  getEstimatedTime(speed) {
    const timeMap = {
      'very-fast': '1-2 seconds',
      'fast': '2-5 seconds',
      'medium': '5-15 seconds',
      'slow': '15+ seconds'
    };
    return timeMap[speed] || 'Unknown';
  }

  /**
   * Start the smart routing service
   */
  start() {
    this.networkMonitor.startMonitoring();
    console.log('🚀 Smart Routing Service started');
  }

  /**
   * Stop the smart routing service
   */
  stop() {
    this.networkMonitor.stopMonitoring();
    console.log('⏹️ Smart Routing Service stopped');
  }
}

// Export singleton instance
module.exports = new SmartRoutingService();



