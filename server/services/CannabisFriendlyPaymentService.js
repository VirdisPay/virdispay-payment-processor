const axios = require('axios');
const FiatPayment = require('../models/FiatPayment');
const Transaction = require('../models/Transaction');
const FiatConversionService = require('./FiatConversionService');

class CannabisFriendlyPaymentService {
  constructor() {
    this.cannabisFriendlyProviders = {
      canpay: {
        name: 'CanPay',
        website: 'https://canpay.com',
        fees: {
          setup: 0,
          transaction: 0.025, // 2.5%
          monthly: 0
        },
        supported: ['ACH', 'Bank Transfer']
      },
      dutchie: {
        name: 'Dutchie Pay',
        website: 'https://dutchie.com',
        fees: {
          setup: 0,
          transaction: 0.029, // 2.9%
          monthly: 0
        },
        supported: ['ACH', 'Bank Transfer', 'Credit Card']
      },
      greenrush: {
        name: 'GreenRush',
        website: 'https://greenrush.com',
        fees: {
          setup: 0,
          transaction: 0.02, // 2%
          monthly: 0
        },
        supported: ['ACH', 'Bank Transfer']
      }
    };
  }

  /**
   * Create a cannabis-friendly fiat payment
   */
  async createCannabisFriendlyPayment(merchantId, paymentData) {
    try {
      const {
        amount,
        currency,
        customerInfo,
        description,
        products,
        targetStablecoin = 'USDC',
        paymentMethod = 'ACH'
      } = paymentData;

      // Generate unique payment ID
      const paymentId = `cannabis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get current exchange rate
      const exchangeRate = await this.getExchangeRate(currency, targetStablecoin);
      const stablecoinAmount = (amount / exchangeRate).toFixed(6);

      // Calculate fees (much lower than Stripe/PayPal)
      const fees = this.calculateCannabisFriendlyFees(amount, currency, paymentMethod);

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
        paymentMethod,
        paymentProvider: 'cannabis_friendly',
        fees,
        compliance: {
          amlChecked: amount < 10000, // $10,000 threshold
          kycVerified: amount < 5000, // $5,000 threshold
          riskScore: this.calculateRiskScore(amount, customerInfo),
          cannabisCompliant: true // Mark as cannabis-friendly
        },
        metadata: {
          description,
          products,
          cannabisFriendly: true,
          industryCompliant: true
        }
      });

      await fiatPayment.save();

      return fiatPayment;

    } catch (error) {
      console.error('Create cannabis-friendly payment error:', error);
      throw error;
    }
  }

  /**
   * Process ACH bank transfer (no third-party fees)
   */
  async processACHTransfer(fiatPaymentId, bankDetails) {
    try {
      const fiatPayment = await FiatPayment.findById(fiatPaymentId);
      if (!fiatPayment) {
        throw new Error('Fiat payment not found');
      }

      // Update payment method
      fiatPayment.paymentMethod = 'ACH';
      fiatPayment.paymentProvider = 'internal_ach';
      fiatPayment.status = 'processing';
      fiatPayment.timestamps.paymentInitiated = new Date();
      fiatPayment.providerDetails = {
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        routingNumber: bankDetails.routingNumber,
        accountHolderName: bankDetails.accountHolderName
      };
      await fiatPayment.save();

      // Simulate ACH processing (in production, integrate with banking APIs)
      const achResult = await this.simulateACHProcessing(fiatPayment, bankDetails);

      if (achResult.success) {
        fiatPayment.status = 'completed';
        fiatPayment.timestamps.paymentCompleted = new Date();
        fiatPayment.providerDetails.paymentIntentId = achResult.transactionId;
        await fiatPayment.save();

        // Trigger stablecoin conversion
        await this.convertToStablecoin(fiatPayment._id);
      } else {
        fiatPayment.status = 'failed';
        fiatPayment.timestamps.failed = new Date();
        fiatPayment.errorDetails = {
          code: 'ACH_FAILED',
          message: achResult.error
        };
        await fiatPayment.save();
      }

      return {
        success: achResult.success,
        fiatPayment,
        transactionId: achResult.transactionId
      };

    } catch (error) {
      console.error('ACH processing error:', error);
      
      await FiatPayment.findByIdAndUpdate(fiatPaymentId, {
        status: 'failed',
        timestamps: { failed: new Date() },
        errorDetails: {
          code: 'ACH_ERROR',
          message: error.message
        }
      });

      throw error;
    }
  }

  /**
   * Process cannabis-friendly payment processor
   */
  async processCannabisFriendlyPayment(fiatPaymentId, provider, paymentData) {
    try {
      const fiatPayment = await FiatPayment.findById(fiatPaymentId);
      if (!fiatPayment) {
        throw new Error('Fiat payment not found');
      }

      const providerConfig = this.cannabisFriendlyProviders[provider];
      if (!providerConfig) {
        throw new Error('Unsupported cannabis-friendly provider');
      }

      // Update payment details
      fiatPayment.paymentMethod = paymentData.paymentMethod || 'ACH';
      fiatPayment.paymentProvider = provider;
      fiatPayment.status = 'processing';
      fiatPayment.timestamps.paymentInitiated = new Date();
      await fiatPayment.save();

      // Simulate cannabis-friendly payment processing
      const paymentResult = await this.simulateCannabisFriendlyProcessing(
        fiatPayment, 
        provider, 
        paymentData
      );

      if (paymentResult.success) {
        fiatPayment.status = 'completed';
        fiatPayment.timestamps.paymentCompleted = new Date();
        fiatPayment.providerDetails = {
          paymentIntentId: paymentResult.transactionId,
          provider: provider,
          providerTransactionId: paymentResult.providerTransactionId
        };
        await fiatPayment.save();

        // Trigger stablecoin conversion
        await this.convertToStablecoin(fiatPayment._id);
      } else {
        fiatPayment.status = 'failed';
        fiatPayment.timestamps.failed = new Date();
        fiatPayment.errorDetails = {
          code: 'CANNABIS_PAYMENT_FAILED',
          message: paymentResult.error
        };
        await fiatPayment.save();
      }

      return {
        success: paymentResult.success,
        fiatPayment,
        transactionId: paymentResult.transactionId
      };

    } catch (error) {
      console.error('Cannabis-friendly payment error:', error);
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

        console.log(`Cannabis-friendly payment ${fiatPayment.paymentId} converted to ${fiatPayment.stablecoinAmount} ${fiatPayment.targetStablecoin}`);
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
   * Simulate ACH processing (replace with real banking API)
   */
  async simulateACHProcessing(fiatPayment, bankDetails) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 98% success rate for ACH
    const success = Math.random() > 0.02;
    
    if (success) {
      return {
        success: true,
        transactionId: `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processingTime: '1-3 business days'
      };
    } else {
      return {
        success: false,
        error: 'Insufficient funds or invalid account information'
      };
    }
  }

  /**
   * Simulate cannabis-friendly payment processing
   */
  async simulateCannabisFriendlyProcessing(fiatPayment, provider, paymentData) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate 95% success rate for cannabis-friendly providers
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        transactionId: `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerTransactionId: `${provider}_tx_${Math.random().toString(36).substr(2, 12)}`,
        processingTime: '1-2 business days'
      };
    } else {
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  /**
   * Simulate stablecoin conversion
   */
  async simulateStablecoinConversion(fiatPayment) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 98% success rate
    const success = Math.random() > 0.02;
    
    if (success) {
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: Math.floor(Math.random() * 50000) + 30000,
        gasPrice: '15000000000', // 15 gwei
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
        fromAddress: 'cannabis_fiat_conversion',
        toAddress: 'merchant_wallet',
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
          fiatPaymentId: fiatPayment._id,
          cannabisFriendly: true
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
   * Calculate cannabis-friendly fees (much lower than Stripe/PayPal)
   */
  calculateCannabisFriendlyFees(amount, currency, paymentMethod) {
    let baseFeePercentage = 0;
    let fixedFee = 0;

    switch (paymentMethod) {
      case 'ACH':
        baseFeePercentage = 0.5; // 0.5% for ACH
        fixedFee = 0.25; // $0.25 fixed fee
        break;
      case 'Bank Transfer':
        baseFeePercentage = 0.3; // 0.3% for bank transfer
        fixedFee = 0.50; // $0.50 fixed fee
        break;
      case 'Credit Card':
        baseFeePercentage = 1.5; // 1.5% for credit card (much lower than Stripe)
        fixedFee = 0.30; // $0.30 fixed fee
        break;
      default:
        baseFeePercentage = 0.5;
        fixedFee = 0.25;
    }

    const processingFee = (amount * baseFeePercentage / 100) + fixedFee;
    const conversionFee = amount * 0.25 / 100; // 0.25% conversion fee
    const totalFees = processingFee + conversionFee;

    return {
      paymentProcessing: Math.round(processingFee * 100) / 100,
      conversion: Math.round(conversionFee * 100) / 100,
      network: 0, // No network fee for fiat payments
      total: Math.round(totalFees * 100) / 100
    };
  }

  /**
   * Get exchange rate for fiat to stablecoin
   */
  async getExchangeRate(fiatCurrency, stablecoin) {
    try {
      // For stablecoins, the rate is usually close to 1:1 with USD
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
   * Get cannabis-friendly payment providers
   */
  getCannabisFriendlyProviders() {
    return this.cannabisFriendlyProviders;
  }

  /**
   * Get payment statistics
   */
  async getCannabisFriendlyStats(merchantId, period = '30d') {
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
          'timestamps.created': { $gte: startDate },
          'metadata.cannabisFriendly': true
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

module.exports = new CannabisFriendlyPaymentService();

