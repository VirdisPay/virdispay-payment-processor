/**
 * Dynamic Fee Service
 * Handles fee updates based on merchant subscription tier
 */

const { ethers } = require('ethers');

// Fee structure in basis points (matches website pricing)
const FEE_STRUCTURE_BP = {
  free: 250,        // 2.5% (250 basis points)
  starter: 150,     // 1.5% (150 basis points)
  professional: 100, // 1.0% (100 basis points)
  enterprise: 50    // 0.5% (50 basis points)
};

class DynamicFeeService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.ownerWallet = null;
  }

  /**
   * Initialize the service with blockchain connection
   */
  async initialize() {
    try {
      // Initialize provider
      this.provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
      
      // Initialize owner wallet
      this.ownerWallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, this.provider);
      
      // Initialize contract
      const contractAddress = process.env.SMART_CONTRACT_ADDRESS;
      const contractABI = require('../contracts/abi/VoodooHempPaymentProcessor.json');
      this.contract = new ethers.Contract(contractAddress, contractABI, this.ownerWallet);
      
      console.log('✅ Dynamic Fee Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing Dynamic Fee Service:', error);
      return false;
    }
  }

  /**
   * Update platform fee based on merchant's subscription tier
   */
  async updateFeeForMerchant(merchantId, subscriptionPlan) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const feeBasisPoints = FEE_STRUCTURE_BP[subscriptionPlan] || FEE_STRUCTURE_BP.free;
      
      // Update smart contract fee
      const tx = await this.contract.setPlatformFeePercentage(feeBasisPoints);
      await tx.wait();
      
      console.log(`✅ Updated platform fee to ${feeBasisPoints} basis points (${(feeBasisPoints/100).toFixed(1)}%) for ${subscriptionPlan} plan`);
      
      return {
        success: true,
        feeBasisPoints,
        percentage: (feeBasisPoints / 100).toFixed(1),
        plan: subscriptionPlan,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('❌ Error updating platform fee:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current platform fee from smart contract
   */
  async getCurrentFee() {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const feeBasisPoints = await this.contract.platformFeePercentage();
      const percentage = (feeBasisPoints / 100).toFixed(1);
      
      return {
        success: true,
        feeBasisPoints: feeBasisPoints.toString(),
        percentage: `${percentage}%`
      };
    } catch (error) {
      console.error('❌ Error getting current fee:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update fee for a specific payment based on merchant's plan
   */
  async updateFeeForPayment(payment) {
    try {
      const Subscription = require('../models/Subscription');
      const subscription = await Subscription.findOne({ merchantId: payment.merchantId });
      const plan = subscription?.plan || 'free';
      
      return await this.updateFeeForMerchant(payment.merchantId, plan);
    } catch (error) {
      console.error('❌ Error updating fee for payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DynamicFeeService();


