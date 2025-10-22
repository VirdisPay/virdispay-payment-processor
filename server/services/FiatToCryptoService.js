const axios = require('axios');
const FiatPayment = require('../models/FiatPayment');
const Transaction = require('../models/Transaction');
const FiatConversionService = require('./FiatConversionService');

class FiatToCryptoService {
  constructor() {
    this.stripe = null;
    this.paypal = null;
    this.initializeProviders();
  }

  /**
   * Initialize payment providers
   */
  initializeProviders() {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      this.stripe = stripe;
    }

    // Initialize PayPal
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.paypal = {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        mode: process.env.PAYPAL_MODE || 'sandbox'
      };
    }
  }

  /**
   * Create a fiat payment request
   */
  async createFiatPayment(merchantId, paymentData) {
    try {
      const {
        amount,
        currency,
        customerInfo,
        description,
        products,
        targetStablecoin = 'USDC'
      } = paymentData;

      // Generate unique payment ID
      const paymentId = `fiat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get current exchange rate
      const exchangeRate = await this.getExchangeRate(currency, targetStablecoin);
      const stablecoinAmount = (amount / exchangeRate).toFixed(6);

      // Calculate fees
      const fees = this.calculateFiatPaymentFees(amount, currency);

      // Create fiat payment record
      const fiatPayment = new FiatPayment({
        paymentId,
        merchantId,
        customerInfo,
        fiatAmount: amount,
        fiatCurrency: currency,
        targetStablecoin,
        exchangeRate,
        stablecoinAmount,
        paymentMethod: 'credit_card', // Default, will be updated based on actual payment
        paymentProvider: 'stripe', // Default provider
        fees,
        compliance: {
          amlChecked: amount < 10000, // $10,000 threshold
          kycVerified: amount < 5000, // $5,000 threshold
          riskScore: this.calculateRiskScore(amount, customerInfo)
        },
        metadata: {
          description,
          products,
          userAgent: paymentData.userAgent,
          ipAddress: paymentData.ipAddress,
          referrer: paymentData.referrer
        }
      });

      await fiatPayment.save();

      return fiatPayment;

    } catch (error) {
      console.error('Create fiat payment error:', error);
      throw error;
    }
  }

  /**
   * Process fiat payment with Stripe
   */
  async processStripePayment(fiatPaymentId, paymentMethodId) {
    try {
      const fiatPayment = await FiatPayment.findById(fiatPaymentId);
      if (!fiatPayment) {
        throw new Error('Fiat payment not found');
      }

      // Update payment method
      fiatPayment.paymentMethod = 'credit_card';
      fiatPayment.paymentProvider = 'stripe';
      fiatPayment.status = 'processing';
      fiatPayment.timestamps.paymentInitiated = new Date();
      await fiatPayment.save();

      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      // Create payment intent with Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(fiatPayment.fiatAmount * 100), // Convert to cents
        currency: fiatPayment.fiatCurrency.toLowerCase(),
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        return_url: `${process.env.CLIENT_URL}/payment/return`,
        metadata: {
          fiatPaymentId: fiatPayment._id.toString(),
          merchantId: fiatPayment.merchantId.toString(),
          targetStablecoin: fiatPayment.targetStablecoin
        }
      });

      // Update with Stripe details
      fiatPayment.providerDetails = {
        paymentIntentId: paymentIntent.id,
        paymentMethodId: paymentMethodId
      };

      if (paymentIntent.status === 'succeeded') {
        fiatPayment.status = 'completed';
        fiatPayment.timestamps.paymentCompleted = new Date();
        await fiatPayment.save();

        // Trigger stablecoin conversion
        await this.convertToStablecoin(fiatPayment._id);
      } else if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure authentication
        fiatPayment.status = 'processing';
      } else {
        fiatPayment.status = 'failed';
        fiatPayment.timestamps.failed = new Date();
      }

      await fiatPayment.save();

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntent,
        fiatPayment
      };

    } catch (error) {
      console.error('Stripe payment error:', error);
      
      // Update payment status to failed
      await FiatPayment.findByIdAndUpdate(fiatPaymentId, {
        status: 'failed',
        timestamps: { failed: new Date() }
      });

      throw error;
    }
  }

  /**
   * Process fiat payment with PayPal
   */
  async processPayPalPayment(fiatPaymentId, paypalOrderId) {
    try {
      const fiatPayment = await FiatPayment.findById(fiatPaymentId);
      if (!fiatPayment) {
        throw new Error('Fiat payment not found');
      }

      // Update payment method
      fiatPayment.paymentMethod = 'paypal';
      fiatPayment.paymentProvider = 'paypal';
      fiatPayment.status = 'processing';
      fiatPayment.timestamps.paymentInitiated = new Date();
      await fiatPayment.save();

      // Verify PayPal order (simplified - in production, use PayPal SDK)
      const paypalVerified = await this.verifyPayPalOrder(paypalOrderId, fiatPayment.fiatAmount);
      
      if (paypalVerified) {
        fiatPayment.status = 'completed';
        fiatPayment.timestamps.paymentCompleted = new Date();
        fiatPayment.providerDetails.sessionId = paypalOrderId;
        await fiatPayment.save();

        // Trigger stablecoin conversion
        await this.convertToStablecoin(fiatPayment._id);
      } else {
        fiatPayment.status = 'failed';
        fiatPayment.timestamps.failed = new Date();
        await fiatPayment.save();
      }

      return {
        success: paypalVerified,
        fiatPayment
      };

    } catch (error) {
      console.error('PayPal payment error:', error);
      throw error;
    }
  }

  /**
   * Convert fiat payment to stablecoin for merchant
   */
  async convertToStablecoin(fiatPaymentId) {
    try {
      const fiatPayment = await FiatPayment.findById(fiatPaymentId);
      if (!fiatPayment) {
        throw new Error('Fiat payment not found');
      }

      if (fiatPayment.status !== 'completed') {
        throw new Error('Fiat payment not completed');
      }

      // Update conversion status
      fiatPayment.conversionDetails.conversionStatus = 'processing';
      fiatPayment.timestamps.conversionInitiated = new Date();
      await fiatPayment.save();

      // Simulate stablecoin purchase/conversion
      const conversionResult = await this.simulateStablecoinConversion(fiatPayment);

      if (conversionResult.success) {
        // Update conversion details
        fiatPayment.conversionDetails = {
          ...fiatPayment.conversionDetails,
          conversionStatus: 'completed',
          stablecoinTxHash: conversionResult.txHash,
          stablecoinAmount: fiatPayment.stablecoinAmount,
          gasUsed: conversionResult.gasUsed,
          gasPrice: conversionResult.gasPrice,
          blockNumber: conversionResult.blockNumber
        };
        fiatPayment.timestamps.conversionCompleted = new Date();
        await fiatPayment.save();

        // Create corresponding crypto transaction for merchant
        await this.createMerchantTransaction(fiatPayment);

        console.log(`Fiat payment ${fiatPayment.paymentId} converted to ${fiatPayment.stablecoinAmount} ${fiatPayment.targetStablecoin}`);
      } else {
        fiatPayment.conversionDetails.conversionStatus = 'failed';
        fiatPayment.timestamps.failed = new Date();
        await fiatPayment.save();
      }

      return conversionResult;

    } catch (error) {
      console.error('Stablecoin conversion error:', error);
      
      await FiatPayment.findByIdAndUpdate(fiatPaymentId, {
        'conversionDetails.conversionStatus': 'failed',
        timestamps: { failed: new Date() }
      });

      throw error;
    }
  }

  /**
   * Simulate stablecoin conversion (replace with real implementation)
   */
  async simulateStablecoinConversion(fiatPayment) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: Math.floor(Math.random() * 100000) + 50000,
        gasPrice: '20000000000', // 20 gwei
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000
      };
    } else {
      return { success: false };
    }
  }

  /**
   * Create merchant transaction record
   */
  async createMerchantTransaction(fiatPayment) {
    try {
      const transaction = new Transaction({
        transactionId: `voodoo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchantId: fiatPayment.merchantId,
        customerEmail: fiatPayment.customerInfo.email,
        amount: fiatPayment.fiatAmount,
        currency: fiatPayment.targetStablecoin,
        cryptoAmount: fiatPayment.stablecoinAmount,
        exchangeRate: fiatPayment.exchangeRate,
        status: 'completed',
        paymentMethod: 'stablecoin',
        blockchain: 'ethereum',
        fromAddress: 'fiat_conversion_system',
        toAddress: 'merchant_wallet', // This would be the merchant's wallet
        txHash: fiatPayment.conversionDetails.stablecoinTxHash,
        gasUsed: fiatPayment.conversionDetails.gasUsed,
        gasPrice: fiatPayment.conversionDetails.gasPrice,
        blockNumber: fiatPayment.conversionDetails.blockNumber,
        confirmationCount: 3,
        requiredConfirmations: 3,
        fees: {
          network: 0,
          processing: fiatPayment.fees.total,
          total: fiatPayment.fees.total
        },
        metadata: {
          description: fiatPayment.metadata.description,
          customerInfo: fiatPayment.customerInfo,
          products: fiatPayment.metadata.products,
          fiatPaymentId: fiatPayment._id
        },
        compliance: fiatPayment.compliance,
        timestamps: {
          created: fiatPayment.timestamps.created,
          processed: fiatPayment.timestamps.paymentCompleted,
          completed: fiatPayment.timestamps.conversionCompleted
        }
      });

      await transaction.save();
      return transaction;

    } catch (error) {
      console.error('Create merchant transaction error:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate for fiat to stablecoin
   */
  async getExchangeRate(fiatCurrency, stablecoin) {
    try {
      // For stablecoins, the rate is usually close to 1:1 with USD
      // In a real implementation, you'd fetch from an exchange API
      const rates = {
        'USDC': { USD: 1.0, EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35 },
        'USDT': { USD: 1.0, EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35 },
        'DAI': { USD: 1.0, EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35 }
      };

      return rates[stablecoin][fiatCurrency] || 1.0;

    } catch (error) {
      console.error('Get exchange rate error:', error);
      return 1.0; // Fallback rate
    }
  }

  /**
   * Calculate fees for fiat payment
   */
  calculateFiatPaymentFees(amount, currency) {
    const baseFeePercentage = 2.9; // 2.9% base fee (similar to Stripe)
    const fixedFee = currency === 'USD' ? 0.30 : 0.50; // Fixed fee per transaction
    const conversionFee = 0.5; // 0.5% for fiat to crypto conversion

    const processingFee = (amount * baseFeePercentage / 100) + fixedFee;
    const conversionFeeAmount = amount * conversionFee / 100;
    const totalFees = processingFee + conversionFeeAmount;

    return {
      paymentProcessing: Math.round(processingFee * 100) / 100,
      conversion: Math.round(conversionFeeAmount * 100) / 100,
      network: 0, // No network fee for fiat payments
      total: Math.round(totalFees * 100) / 100
    };
  }

  /**
   * Calculate risk score for compliance
   */
  calculateRiskScore(amount, customerInfo) {
    let score = 0;
    
    if (amount > 1000) score += 10;
    if (amount > 5000) score += 20;
    if (amount > 10000) score += 30;
    
    // Add risk factors based on customer info
    if (!customerInfo.name) score += 15;
    if (!customerInfo.phone) score += 10;
    if (!customerInfo.address) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Verify PayPal order (simplified implementation)
   */
  async verifyPayPalOrder(orderId, expectedAmount) {
    // In a real implementation, you would:
    // 1. Call PayPal API to verify the order
    // 2. Check the amount matches
    // 3. Verify the payment status
    // For now, we'll simulate this
    return Math.random() > 0.1; // 90% success rate
  }

  /**
   * Get fiat payment history
   */
  async getFiatPaymentHistory(merchantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate
    } = options;

    const query = { merchantId };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query['timestamps.created'] = {};
      if (startDate) query['timestamps.created'].$gte = new Date(startDate);
      if (endDate) query['timestamps.created'].$lte = new Date(endDate);
    }

    const payments = await FiatPayment.find(query)
      .sort({ 'timestamps.created': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('merchantId', 'businessName email');

    const total = await FiatPayment.countDocuments(query);

    return {
      payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  }

  /**
   * Get fiat payment statistics
   */
  async getFiatPaymentStats(merchantId, period = '30d') {
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await FiatPayment.aggregate([
      {
        $match: {
          merchantId: merchantId,
          'timestamps.created': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalFiatAmount: { $sum: '$fiatAmount' },
          totalFees: { $sum: '$fees.total' },
          completedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          avgProcessingTime: {
            $avg: {
              $cond: [
                { $ne: ['$timestamps.conversionCompleted', null] },
                { $subtract: ['$timestamps.conversionCompleted', '$timestamps.created'] },
                null
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalPayments: 0,
      totalFiatAmount: 0,
      totalFees: 0,
      completedPayments: 0,
      failedPayments: 0,
      avgProcessingTime: 0
    };
  }
}

module.exports = new FiatToCryptoService();

