/**
 * Platform Fee Collection Service
 * Handles automatic fee deduction and collection for the platform
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Platform fee configuration
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

// Fee structure by subscription tier
const FEE_STRUCTURE = {
  free: 0.015,      // 1.5% for free tier
  starter: 0.01,    // 1% for starter
  professional: 0.01,  // 1% for professional
  enterprise: 0.01  // 1% for enterprise
};

class PlatformFeeService {
  /**
   * Calculate platform fee for a payment based on merchant's subscription tier
   */
  async calculateFee(amount, merchantId) {
    try {
      // Get merchant's subscription to determine fee percentage
      const Subscription = require('../models/Subscription');
      const subscription = await Subscription.findOne({ merchantId });
      
      const plan = subscription?.plan || 'free';
      const feePercentage = FEE_STRUCTURE[plan] || FEE_STRUCTURE.free;
      
      const fee = amount * feePercentage;
      
      return {
        fee: parseFloat(fee.toFixed(6)),
        percentage: feePercentage * 100,
        plan: plan,
        merchantReceives: amount - fee
      };
    } catch (error) {
      console.error('Error calculating fee:', error);
      // Default to free tier fee if error
      const fee = amount * FEE_STRUCTURE.free;
      return {
        fee: parseFloat(fee.toFixed(6)),
        percentage: FEE_STRUCTURE.free * 100,
        plan: 'free',
        merchantReceives: amount - fee
      };
    }
  }

  /**
   * Process platform fee collection
   * This is called when a payment is completed
   */
  async collectFee(payment) {
    try {
      const feeCalc = await this.calculateFee(payment.amount, payment.merchantId);
      
      // Update payment with fee information
      payment.platformFee = feeCalc.fee;
      payment.platformFeePercentage = feeCalc.percentage;
      payment.merchantPlan = feeCalc.plan;
      payment.merchantAmount = feeCalc.merchantReceives;
      payment.platformWallet = PLATFORM_WALLET_ADDRESS;
      
      await payment.save();
      
      console.log(`✅ Platform fee collected: $${feeCalc.fee} (${feeCalc.percentage}% - ${feeCalc.plan} plan) from payment ${payment._id}`);
      
      return {
        success: true,
        fee: feeCalc.fee,
        percentage: feeCalc.percentage,
        plan: feeCalc.plan,
        merchantReceives: feeCalc.merchantReceives
      };
    } catch (error) {
      console.error('Error collecting platform fee:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get total fees collected in a date range
   */
  async getFeesCollected(startDate, endDate) {
    try {
      const query = {
        status: 'completed',
        platformFee: { $exists: true, $gt: 0 }
      };
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      
      const payments = await Transaction.find(query);
      
      const totalFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
      const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paymentCount = payments.length;
      
      // Group by merchant
      const byMerchant = {};
      payments.forEach(payment => {
        const merchantId = payment.merchantId?.toString();
        if (!byMerchant[merchantId]) {
          byMerchant[merchantId] = {
            volume: 0,
            fees: 0,
            count: 0
          };
        }
        byMerchant[merchantId].volume += payment.amount || 0;
        byMerchant[merchantId].fees += payment.platformFee || 0;
        byMerchant[merchantId].count += 1;
      });
      
      // Group by currency
      const byCurrency = {};
      payments.forEach(payment => {
        const currency = payment.currency || 'USDC';
        if (!byCurrency[currency]) {
          byCurrency[currency] = {
            volume: 0,
            fees: 0,
            count: 0
          };
        }
        byCurrency[currency].volume += payment.amount || 0;
        byCurrency[currency].fees += payment.platformFee || 0;
        byCurrency[currency].count += 1;
      });
      
      return {
        success: true,
        summary: {
          totalFees,
          totalVolume,
          paymentCount,
          averageFee: paymentCount > 0 ? (totalFees / paymentCount).toFixed(4) : 0,
          feePercentage: totalVolume > 0 ? ((totalFees / totalVolume) * 100).toFixed(2) : 0
        },
        byMerchant,
        byCurrency,
        platformWallet: PLATFORM_WALLET_ADDRESS
      };
    } catch (error) {
      console.error('Error getting fees collected:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get fees collected per merchant
   */
  async getMerchantFees(merchantId, startDate, endDate) {
    try {
      const query = {
        merchantId,
        status: 'completed',
        platformFee: { $exists: true, $gt: 0 }
      };
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      
      const payments = await Transaction.find(query);
      
      const totalFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
      const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      return {
        success: true,
        merchantId,
        totalFees,
        totalVolume,
        paymentCount: payments.length,
        averageFee: payments.length > 0 ? (totalFees / payments.length).toFixed(4) : 0
      };
    } catch (error) {
      console.error('Error getting merchant fees:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate fee collection report
   */
  async generateFeeReport(startDate, endDate) {
    try {
      const feesData = await this.getFeesCollected(startDate, endDate);
      
      if (!feesData.success) {
        throw new Error(feesData.error);
      }
      
      // Get merchant details
      const merchantIds = Object.keys(feesData.byMerchant);
      const merchants = await User.find({
        _id: { $in: merchantIds }
      }).select('email businessName businessType');
      
      const merchantMap = {};
      merchants.forEach(m => {
        merchantMap[m._id.toString()] = m;
      });
      
      // Create detailed report
      const merchantReport = Object.entries(feesData.byMerchant).map(([merchantId, stats]) => {
        const merchant = merchantMap[merchantId];
        return {
          merchantId,
          businessName: merchant?.businessName || 'Unknown',
          email: merchant?.email || 'Unknown',
          businessType: merchant?.businessType || 'Unknown',
          ...stats
        };
      }).sort((a, b) => b.fees - a.fees);
      
      return {
        success: true,
        period: {
          start: startDate || 'All time',
          end: endDate || 'Now'
        },
        summary: feesData.summary,
        merchants: merchantReport,
        byCurrency: feesData.byCurrency,
        platformWallet: PLATFORM_WALLET_ADDRESS,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating fee report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get platform wallet balance (would need Web3 integration)
   */
  async getPlatformWalletBalance() {
    // TODO: Implement Web3 integration to check actual wallet balance
    return {
      success: true,
      wallet: PLATFORM_WALLET_ADDRESS,
      message: 'Web3 integration required to check actual balance',
      note: 'Fees are automatically sent to this wallet with each payment'
    };
  }
}

module.exports = new PlatformFeeService();
