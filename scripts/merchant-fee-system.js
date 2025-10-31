const { ethers } = require('ethers');
require('dotenv').config();

// Contract configuration
const CONTRACT_ADDRESS = '0x50bD2E580c6C01723F622E3Ea4160FA29FBf4F3A';
const RPC_URL = 'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';

// Fee structure (in basis points)
const FEE_STRUCTURE = {
  free: 250,      // 2.5%
  starter: 150,   // 1.5%
  professional: 100,  // 1.0%
  enterprise: 50   // 0.5%
};

// Merchant database (in production, this would be in your database)
const merchantFees = new Map();

class MerchantFeeManager {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    
    // Contract ABI for fee management
    this.contractABI = [
      "function processPayment(address token, uint256 amount, address merchant, address customer) external returns (uint256)",
      "function calculatePlatformFee(uint256 amount, address merchant) external view returns (uint256)",
      "function getMerchantFeeRate(address merchant) external view returns (uint256)",
      "function setMerchantFeeRate(address merchant, uint256 feeRate) external",
      "function owner() external view returns (address)"
    ];
    
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, this.contractABI, this.wallet);
  }

  // Set merchant subscription tier (called when merchant signs up/upgrades)
  async setMerchantSubscription(merchantAddress, subscriptionTier) {
    try {
      console.log(`🎯 Setting ${merchantAddress} to ${subscriptionTier} tier...`);
      
      const feeRate = FEE_STRUCTURE[subscriptionTier];
      if (!feeRate) {
        throw new Error(`Invalid subscription tier: ${subscriptionTier}`);
      }
      
      // Store in local database
      merchantFees.set(merchantAddress, {
        tier: subscriptionTier,
        feeRate: feeRate,
        feePercentage: (feeRate / 100).toFixed(1) + '%'
      });
      
      // Update contract (if contract supports per-merchant fees)
      try {
        const tx = await this.contract.setMerchantFeeRate(merchantAddress, feeRate);
        await tx.wait();
        console.log(`✅ Contract updated for ${merchantAddress}: ${(feeRate/100).toFixed(1)}%`);
      } catch (error) {
        console.log(`⚠️  Contract update failed (using local calculation): ${error.message}`);
      }
      
      console.log(`✅ Merchant ${merchantAddress} set to ${subscriptionTier} tier (${(feeRate/100).toFixed(1)}%)`);
      
    } catch (error) {
      console.error(`❌ Error setting merchant subscription:`, error.message);
    }
  }

  // Calculate fee for a payment (called automatically during payment processing)
  calculateFee(merchantAddress, paymentAmount) {
    const merchant = merchantFees.get(merchantAddress);
    
    if (!merchant) {
      // Default to free tier if merchant not found
      console.log(`⚠️  Merchant ${merchantAddress} not found, using free tier (2.5%)`);
      return {
        feeAmount: (paymentAmount * 250) / 10000, // 2.5%
        feeRate: 250,
        tier: 'free'
      };
    }
    
    const feeAmount = (paymentAmount * merchant.feeRate) / 10000;
    
    return {
      feeAmount: feeAmount,
      feeRate: merchant.feeRate,
      tier: merchant.tier,
      feePercentage: merchant.feePercentage
    };
  }

  // Process payment with automatic fee calculation
  async processPayment(merchantAddress, customerAddress, tokenAddress, amount) {
    try {
      console.log(`💳 Processing payment for merchant ${merchantAddress}...`);
      
      // Calculate fee automatically
      const feeInfo = this.calculateFee(merchantAddress, amount);
      
      console.log(`📊 Payment Details:`);
      console.log(`   Amount: ${amount} tokens`);
      console.log(`   Merchant: ${merchantAddress}`);
      console.log(`   Tier: ${feeInfo.tier}`);
      console.log(`   Fee Rate: ${feeInfo.feePercentage}`);
      console.log(`   Fee Amount: ${feeInfo.feeAmount} tokens`);
      console.log(`   Net to Merchant: ${amount - feeInfo.feeAmount} tokens`);
      
      // In production, this would call the actual contract
      console.log(`✅ Payment processed successfully!`);
      console.log(`💰 Platform fee (${feeInfo.feeAmount} tokens) sent to treasury`);
      
      return {
        success: true,
        feeInfo: feeInfo
      };
      
    } catch (error) {
      console.error(`❌ Payment processing failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // List all merchants and their tiers
  listMerchants() {
    console.log(`📋 Current Merchants:`);
    for (const [address, info] of merchantFees) {
      console.log(`   ${address}: ${info.tier} (${info.feePercentage})`);
    }
  }
}

// Example usage
async function demonstrateSystem() {
  const feeManager = new MerchantFeeManager();
  
  console.log(`🚀 VirdisPay Merchant Fee System Demo`);
  console.log(`=====================================`);
  
  // Simulate merchants signing up
  await feeManager.setMerchantSubscription('0x1234567890123456789012345678901234567890', 'free');
  await feeManager.setMerchantSubscription('0x2345678901234567890123456789012345678901', 'starter');
  await feeManager.setMerchantSubscription('0x3456789012345678901234567890123456789012', 'professional');
  await feeManager.setMerchantSubscription('0x4567890123456789012345678901234567890123', 'enterprise');
  
  console.log(`\n📋 Merchant List:`);
  feeManager.listMerchants();
  
  console.log(`\n💳 Processing Sample Payments:`);
  
  // Process payments with automatic fee calculation
  await feeManager.processPayment('0x1234567890123456789012345678901234567890', '0xcustomer1', '0xUSDC', 1000);
  await feeManager.processPayment('0x2345678901234567890123456789012345678901', '0xcustomer2', '0xUSDC', 1000);
  await feeManager.processPayment('0x3456789012345678901234567890123456789012', '0xcustomer3', '0xUSDC', 1000);
  await feeManager.processPayment('0x4567890123456789012345678901234567890123', '0xcustomer4', '0xUSDC', 1000);
  
  console.log(`\n✅ System working! Fees calculated automatically based on subscription tier.`);
}

// Run demo
demonstrateSystem();

