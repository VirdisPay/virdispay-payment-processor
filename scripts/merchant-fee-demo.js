// VirdisPay Merchant Fee System Demo
// This demonstrates how fees are calculated automatically per merchant

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
    console.log('🚀 VirdisPay Merchant Fee System Initialized');
  }

  // Set merchant subscription tier (called when merchant signs up/upgrades)
  setMerchantSubscription(merchantAddress, subscriptionTier) {
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
    
    console.log(`✅ Merchant ${merchantAddress} set to ${subscriptionTier} tier (${(feeRate/100).toFixed(1)}%)`);
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
  processPayment(merchantAddress, customerAddress, tokenAddress, amount) {
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
    
    // In production, this would call the actual smart contract
    console.log(`✅ Payment processed successfully!`);
    console.log(`💰 Platform fee (${feeInfo.feeAmount} tokens) sent to treasury`);
    
    return {
      success: true,
      feeInfo: feeInfo
    };
  }

  // List all merchants and their tiers
  listMerchants() {
    console.log(`📋 Current Merchants:`);
    for (const [address, info] of merchantFees) {
      console.log(`   ${address}: ${info.tier} (${info.feePercentage})`);
    }
  }
}

// Demo function
function demonstrateSystem() {
  const feeManager = new MerchantFeeManager();
  
  console.log(`\n🚀 VirdisPay Merchant Fee System Demo`);
  console.log(`=====================================`);
  
  // Simulate merchants signing up
  console.log(`\n📝 Merchants Signing Up:`);
  feeManager.setMerchantSubscription('0x1234567890123456789012345678901234567890', 'free');
  feeManager.setMerchantSubscription('0x2345678901234567890123456789012345678901', 'starter');
  feeManager.setMerchantSubscription('0x3456789012345678901234567890123456789012', 'professional');
  feeManager.setMerchantSubscription('0x4567890123456789012345678901234567890123', 'enterprise');
  
  console.log(`\n📋 Merchant List:`);
  feeManager.listMerchants();
  
  console.log(`\n💳 Processing Sample Payments:`);
  console.log(`===============================`);
  
  // Process payments with automatic fee calculation
  feeManager.processPayment('0x1234567890123456789012345678901234567890', '0xcustomer1', '0xUSDC', 1000);
  console.log('');
  
  feeManager.processPayment('0x2345678901234567890123456789012345678901', '0xcustomer2', '0xUSDC', 1000);
  console.log('');
  
  feeManager.processPayment('0x3456789012345678901234567890123456789012', '0xcustomer3', '0xUSDC', 1000);
  console.log('');
  
  feeManager.processPayment('0x4567890123456789012345678901234567890123', '0xcustomer4', '0xUSDC', 1000);
  
  console.log(`\n✅ System working! Fees calculated automatically based on subscription tier.`);
  console.log(`\n🎯 Key Benefits:`);
  console.log(`   ✅ Fully automated - no manual intervention needed`);
  console.log(`   ✅ Works 24/7 - even when you're away`);
  console.log(`   ✅ Per-merchant rates - each has their own fee`);
  console.log(`   ✅ Scalable - handles thousands of merchants`);
  console.log(`   ✅ Revenue collected automatically to your Ledger wallet`);
}

// Run demo
demonstrateSystem();

