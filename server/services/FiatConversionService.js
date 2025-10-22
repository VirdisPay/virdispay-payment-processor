const axios = require('axios');
const ConversionTransaction = require('../models/ConversionTransaction');
const FiatConversion = require('../models/FiatConversion');
const Transaction = require('../models/Transaction');

class FiatConversionService {
  constructor() {
    this.exchangeRates = new Map();
    this.lastRateUpdate = null;
    this.rateUpdateInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get current exchange rates from multiple providers
   */
  async getExchangeRates() {
    const now = Date.now();
    
    // Return cached rates if they're still fresh
    if (this.lastRateUpdate && (now - this.lastRateUpdate) < this.rateUpdateInterval) {
      return this.exchangeRates;
    }

    try {
      // Get rates from CoinGecko API (free tier)
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'usd-coin,tether,dai,ethereum,bitcoin',
          vs_currencies: 'usd,eur,gbp,cad,aud',
          include_24hr_change: false
        },
        timeout: 10000
      });

      const rates = response.data;
      
      // Map the rates to our format
      this.exchangeRates.set('USDC', rates['usd-coin']);
      this.exchangeRates.set('USDT', rates['tether']);
      this.exchangeRates.set('DAI', rates['dai']);
      this.exchangeRates.set('ETH', rates['ethereum']);
      this.exchangeRates.set('BTC', rates['bitcoin']);
      
      this.lastRateUpdate = now;
      
      return this.exchangeRates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Return cached rates if available, otherwise throw error
      if (this.exchangeRates.size > 0) {
        return this.exchangeRates;
      }
      throw new Error('Unable to fetch exchange rates');
    }
  }

  /**
   * Convert crypto amount to fiat
   */
  async convertToFiat(cryptoAmount, cryptoCurrency, fiatCurrency = 'USD') {
    const rates = await this.getExchangeRates();
    const cryptoRate = rates.get(cryptoCurrency);
    
    if (!cryptoRate) {
      throw new Error(`Exchange rate not available for ${cryptoCurrency}`);
    }

    const fiatRate = cryptoRate[fiatCurrency.toLowerCase()];
    if (!fiatRate) {
      throw new Error(`Exchange rate not available for ${fiatCurrency}`);
    }

    const fiatAmount = parseFloat(cryptoAmount) * fiatRate;
    
    return {
      fiatAmount: Math.round(fiatAmount * 100) / 100, // Round to 2 decimal places
      exchangeRate: fiatRate,
      cryptoAmount,
      cryptoCurrency,
      fiatCurrency
    };
  }

  /**
   * Check if merchant has auto-conversion enabled
   */
  async shouldAutoConvert(merchantId, transactionAmount) {
    const conversionSettings = await FiatConversion.findOne({ 
      merchantId, 
      isActive: true 
    });

    if (!conversionSettings || !conversionSettings.autoConvert) {
      return false;
    }

    return transactionAmount >= conversionSettings.conversionThreshold;
  }

  /**
   * Process automatic conversion for a completed transaction
   */
  async processAutoConversion(transactionId) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Transaction not completed yet');
      }

      const conversionSettings = await FiatConversion.findOne({
        merchantId: transaction.merchantId,
        isActive: true
      });

      if (!conversionSettings || !conversionSettings.autoConvert) {
        return null; // No auto-conversion configured
      }

      // Check if crypto is supported for conversion
      const supportedCrypto = conversionSettings.supportedCryptos.find(
        crypto => crypto.crypto === transaction.currency && crypto.enabled
      );

      if (!supportedCrypto) {
        return null; // Crypto not supported for conversion
      }

      // Check conversion threshold
      if (transaction.amount < conversionSettings.conversionThreshold) {
        return null; // Below threshold
      }

      // Check conversion limits
      if (transaction.amount < conversionSettings.conversionSettings.minConversionAmount ||
          transaction.amount > conversionSettings.conversionSettings.maxConversionAmount) {
        return null; // Outside conversion limits
      }

      // Perform the conversion
      const conversion = await this.initiateConversion(
        transaction,
        conversionSettings,
        'automatic'
      );

      return conversion;

    } catch (error) {
      console.error('Auto conversion failed:', error);
      throw error;
    }
  }

  /**
   * Initiate a manual conversion
   */
  async initiateManualConversion(merchantId, transactionId, conversionSettings) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.merchantId.toString() !== merchantId) {
      throw new Error('Unauthorized access to transaction');
    }

    return await this.initiateConversion(transaction, conversionSettings, 'manual');
  }

  /**
   * Initiate conversion process
   */
  async initiateConversion(transaction, conversionSettings, method) {
    try {
      // Generate unique conversion ID
      const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get current exchange rate
      const conversion = await this.convertToFiat(
        transaction.cryptoAmount,
        transaction.currency,
        conversionSettings.preferredFiatCurrency
      );

      // Calculate fees
      const fees = this.calculateConversionFees(
        conversion.fiatAmount,
        transaction.currency,
        conversionSettings.preferredFiatCurrency
      );

      // Create conversion transaction
      const conversionTransaction = new ConversionTransaction({
        conversionId,
        merchantId: transaction.merchantId,
        originalTransactionId: transaction._id,
        cryptoAmount: transaction.cryptoAmount,
        cryptoCurrency: transaction.currency,
        fiatAmount: conversion.fiatAmount,
        fiatCurrency: conversionSettings.preferredFiatCurrency,
        exchangeRate: conversion.exchangeRate,
        conversionMethod: method,
        conversionProvider: 'coinbase', // Default provider
        fees,
        bankingDetails: {
          bankName: conversionSettings.bankingInfo.bankName,
          accountNumber: conversionSettings.bankingInfo.accountNumber,
          routingNumber: conversionSettings.bankingInfo.routingNumber,
          accountHolderName: conversionSettings.bankingInfo.accountHolderName,
          swiftCode: conversionSettings.bankingInfo.swiftCode,
          iban: conversionSettings.bankingInfo.iban
        },
        status: 'pending'
      });

      await conversionTransaction.save();

      // Process the conversion
      await this.executeConversion(conversionTransaction);

      return conversionTransaction;

    } catch (error) {
      console.error('Conversion initiation failed:', error);
      throw error;
    }
  }

  /**
   * Execute the actual conversion
   */
  async executeConversion(conversionTransaction) {
    try {
      // Update status to processing
      conversionTransaction.status = 'processing';
      conversionTransaction.timestamps.processed = new Date();
      await conversionTransaction.save();

      // Simulate conversion process (in real implementation, this would call external APIs)
      const success = await this.simulateConversion(conversionTransaction);

      if (success) {
        conversionTransaction.status = 'completed';
        conversionTransaction.timestamps.completed = new Date();
        conversionTransaction.payoutDetails = {
          payoutId: `payout_${Date.now()}`,
          payoutStatus: 'processing',
          estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
        };
      } else {
        conversionTransaction.status = 'failed';
        conversionTransaction.timestamps.failed = new Date();
        conversionTransaction.errorDetails = {
          code: 'CONVERSION_FAILED',
          message: 'Conversion process failed'
        };
      }

      await conversionTransaction.save();
      return conversionTransaction;

    } catch (error) {
      console.error('Conversion execution failed:', error);
      
      conversionTransaction.status = 'failed';
      conversionTransaction.timestamps.failed = new Date();
      conversionTransaction.errorDetails = {
        code: 'EXECUTION_ERROR',
        message: error.message
      };
      
      await conversionTransaction.save();
      throw error;
    }
  }

  /**
   * Simulate conversion process (replace with real API calls)
   */
  async simulateConversion(conversionTransaction) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 95% success rate
    return Math.random() > 0.05;
  }

  /**
   * Calculate risk score for a transaction
   */
  calculateRiskScore(amount, customerInfo = {}) {
    let riskScore = 0;
    
    // Amount-based risk scoring
    if (amount >= 100000) riskScore += 90;
    else if (amount >= 50000) riskScore += 60;
    else if (amount >= 10000) riskScore += 30;
    else if (amount >= 1000) riskScore += 10;
    else if (amount >= 100) riskScore += 0;
    
    // Customer information completeness
    if (!customerInfo.name) riskScore += 15;
    if (!customerInfo.phone) riskScore += 10;
    if (customerInfo.hasOwnProperty('email') && (customerInfo.email === null || customerInfo.email === '')) riskScore += 5;
    
    // Cap at 100
    return Math.min(riskScore, 100);
  }

  /**
   * Calculate conversion fees
   */
  calculateConversionFees(fiatAmount, cryptoCurrency, fiatCurrency) {
    const baseFeePercentage = 0.5; // 0.5% base fee
    const networkFee = 2.50; // Fixed network fee
    const bankingFee = fiatCurrency === 'USD' ? 0.25 : 1.50; // Banking fee varies by currency

    const conversionFee = fiatAmount * (baseFeePercentage / 100);
    const totalFees = conversionFee + networkFee + bankingFee;

    return {
      conversion: Math.round(conversionFee * 100) / 100,
      network: networkFee,
      banking: bankingFee,
      total: Math.round(totalFees * 100) / 100
    };
  }

  /**
   * Get conversion history for a merchant
   */
  async getConversionHistory(merchantId, options = {}) {
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
      query['timestamps.initiated'] = {};
      if (startDate) query['timestamps.initiated'].$gte = new Date(startDate);
      if (endDate) query['timestamps.initiated'].$lte = new Date(endDate);
    }

    const conversions = await ConversionTransaction.find(query)
      .sort({ 'timestamps.initiated': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('originalTransactionId', 'transactionId amount currency customerEmail');

    const total = await ConversionTransaction.countDocuments(query);

    return {
      conversions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  }

  /**
   * Get conversion statistics for a merchant
   */
  async getConversionStats(merchantId, period = '30d') {
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

    const stats = await ConversionTransaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          'timestamps.initiated': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalConversions: { $sum: 1 },
          totalFiatAmount: { $sum: '$fiatAmount' },
          totalFees: { $sum: '$fees.total' },
          completedConversions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedConversions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          avgProcessingTime: {
            $avg: {
              $cond: [
                { $ne: ['$timestamps.completed', null] },
                { $subtract: ['$timestamps.completed', '$timestamps.initiated'] },
                null
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalConversions: 0,
      totalFiatAmount: 0,
      totalFees: 0,
      completedConversions: 0,
      failedConversions: 0,
      avgProcessingTime: 0
    };
  }
}

module.exports = new FiatConversionService();
