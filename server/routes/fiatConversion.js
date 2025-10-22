const express = require('express');
const { body, validationResult } = require('express-validator');
const FiatConversion = require('../models/FiatConversion');
const ConversionTransaction = require('../models/ConversionTransaction');
const FiatConversionService = require('../services/FiatConversionService');
const router = express.Router();

// Validation middleware
const validateConversionSettings = [
  body('autoConvert').isBoolean().withMessage('Auto convert must be boolean'),
  body('conversionThreshold').isNumeric().withMessage('Conversion threshold must be a number'),
  body('preferredFiatCurrency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid fiat currency'),
  body('bankingInfo.accountType').optional().isIn(['checking', 'savings', 'business']).withMessage('Invalid account type'),
  body('bankingInfo.bankName').optional().notEmpty().withMessage('Bank name required'),
  body('bankingInfo.accountNumber').optional().notEmpty().withMessage('Account number required'),
  body('bankingInfo.routingNumber').optional().notEmpty().withMessage('Routing number required'),
  body('bankingInfo.accountHolderName').optional().notEmpty().withMessage('Account holder name required')
];

/**
 * @route GET /api/fiat-conversion/settings
 * @desc Get merchant's fiat conversion settings
 */
router.get('/settings', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    
    const settings = await FiatConversion.findOne({ merchantId });
    
    if (!settings) {
      return res.json({
        success: true,
        settings: null,
        message: 'No conversion settings configured'
      });
    }

    // Remove sensitive banking details for security
    const safeSettings = {
      ...settings.toObject(),
      bankingInfo: {
        accountType: settings.bankingInfo.accountType,
        bankName: settings.bankingInfo.bankName,
        accountHolderName: settings.bankingInfo.accountHolderName,
        // Don't expose account numbers, routing numbers, etc.
      }
    };

    res.json({
      success: true,
      settings: safeSettings
    });

  } catch (error) {
    console.error('Get conversion settings error:', error);
    res.status(500).json({ error: 'Failed to get conversion settings' });
  }
});

/**
 * @route POST /api/fiat-conversion/settings
 * @desc Create or update fiat conversion settings
 */
router.post('/settings', validateConversionSettings, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const merchantId = req.user.userId;
    const {
      autoConvert,
      conversionThreshold,
      preferredFiatCurrency,
      bankingInfo,
      conversionSettings,
      supportedCryptos
    } = req.body;

    // Validate banking info if auto-convert is enabled
    if (autoConvert && (!bankingInfo || !bankingInfo.bankName || !bankingInfo.accountNumber)) {
      return res.status(400).json({ 
        error: 'Banking information required for auto-conversion' 
      });
    }

    const settings = await FiatConversion.findOneAndUpdate(
      { merchantId },
      {
        autoConvert,
        conversionThreshold,
        preferredFiatCurrency,
        bankingInfo: autoConvert ? bankingInfo : {},
        conversionSettings: conversionSettings || {},
        supportedCryptos: supportedCryptos || [],
        isActive: true
      },
      { 
        upsert: true, 
        new: true, 
        runValidators: true 
      }
    );

    res.json({
      success: true,
      message: 'Conversion settings updated successfully',
      settings: {
        autoConvert: settings.autoConvert,
        conversionThreshold: settings.conversionThreshold,
        preferredFiatCurrency: settings.preferredFiatCurrency,
        isActive: settings.isActive
      }
    });

  } catch (error) {
    console.error('Update conversion settings error:', error);
    res.status(500).json({ error: 'Failed to update conversion settings' });
  }
});

/**
 * @route POST /api/fiat-conversion/convert/:transactionId
 * @desc Manually convert a specific transaction to fiat
 */
router.post('/convert/:transactionId', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { transactionId } = req.params;

    // Get merchant's conversion settings
    const conversionSettings = await FiatConversion.findOne({ 
      merchantId, 
      isActive: true 
    });

    if (!conversionSettings) {
      return res.status(400).json({ 
        error: 'Conversion settings not configured. Please set up your banking information first.' 
      });
    }

    if (!conversionSettings.autoConvert) {
      return res.status(400).json({ 
        error: 'Auto-conversion is disabled. Please enable it in your settings.' 
      });
    }

    // Initiate manual conversion
    const conversion = await FiatConversionService.initiateManualConversion(
      merchantId,
      transactionId,
      conversionSettings
    );

    res.json({
      success: true,
      message: 'Conversion initiated successfully',
      conversion: {
        conversionId: conversion.conversionId,
        fiatAmount: conversion.fiatAmount,
        fiatCurrency: conversion.fiatCurrency,
        fees: conversion.fees,
        status: conversion.status,
        estimatedArrival: conversion.payoutDetails?.estimatedArrival
      }
    });

  } catch (error) {
    console.error('Manual conversion error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate conversion' });
  }
});

/**
 * @route GET /api/fiat-conversion/history
 * @desc Get conversion history for merchant
 */
router.get('/history', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      startDate, 
      endDate 
    } = req.query;

    const history = await FiatConversionService.getConversionHistory(merchantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate
    });

    res.json({
      success: true,
      ...history
    });

  } catch (error) {
    console.error('Get conversion history error:', error);
    res.status(500).json({ error: 'Failed to get conversion history' });
  }
});

/**
 * @route GET /api/fiat-conversion/stats
 * @desc Get conversion statistics for merchant
 */
router.get('/stats', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { period = '30d' } = req.query;

    const stats = await FiatConversionService.getConversionStats(merchantId, period);

    res.json({
      success: true,
      stats,
      period
    });

  } catch (error) {
    console.error('Get conversion stats error:', error);
    res.status(500).json({ error: 'Failed to get conversion statistics' });
  }
});

/**
 * @route GET /api/fiat-conversion/rates
 * @desc Get current exchange rates
 */
router.get('/rates', async (req, res) => {
  try {
    const rates = await FiatConversionService.getExchangeRates();
    
    // Convert Map to object for JSON response
    const ratesObject = {};
    for (const [crypto, rates] of rates.entries()) {
      ratesObject[crypto] = rates;
    }

    res.json({
      success: true,
      rates: ratesObject,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to get exchange rates' });
  }
});

/**
 * @route POST /api/fiat-conversion/estimate
 * @desc Estimate conversion amount and fees
 */
router.post('/estimate', [
  body('cryptoAmount').isNumeric().withMessage('Crypto amount must be a number'),
  body('cryptoCurrency').isIn(['USDC', 'USDT', 'DAI', 'ETH', 'BTC']).withMessage('Invalid crypto currency'),
  body('fiatCurrency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid fiat currency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cryptoAmount, cryptoCurrency, fiatCurrency } = req.body;

    // Get conversion estimate
    const conversion = await FiatConversionService.convertToFiat(
      cryptoAmount,
      cryptoCurrency,
      fiatCurrency
    );

    // Calculate fees
    const fees = FiatConversionService.calculateConversionFees(
      conversion.fiatAmount,
      cryptoCurrency,
      fiatCurrency
    );

    res.json({
      success: true,
      estimate: {
        cryptoAmount,
        cryptoCurrency,
        fiatAmount: conversion.fiatAmount,
        fiatCurrency,
        exchangeRate: conversion.exchangeRate,
        fees,
        netAmount: conversion.fiatAmount - fees.total
      }
    });

  } catch (error) {
    console.error('Conversion estimate error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversion estimate' });
  }
});

/**
 * @route PUT /api/fiat-conversion/settings/toggle
 * @desc Toggle auto-conversion on/off
 */
router.put('/settings/toggle', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { enabled } = req.body;

    const settings = await FiatConversion.findOneAndUpdate(
      { merchantId },
      { autoConvert: enabled },
      { new: true }
    );

    if (!settings) {
      return res.status(404).json({ error: 'Conversion settings not found' });
    }

    res.json({
      success: true,
      message: `Auto-conversion ${enabled ? 'enabled' : 'disabled'}`,
      autoConvert: settings.autoConvert
    });

  } catch (error) {
    console.error('Toggle auto-conversion error:', error);
    res.status(500).json({ error: 'Failed to toggle auto-conversion' });
  }
});

/**
 * @route DELETE /api/fiat-conversion/settings
 * @desc Delete conversion settings
 */
router.delete('/settings', async (req, res) => {
  try {
    const merchantId = req.user.userId;

    await FiatConversion.findOneAndUpdate(
      { merchantId },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Conversion settings disabled'
    });

  } catch (error) {
    console.error('Delete conversion settings error:', error);
    res.status(500).json({ error: 'Failed to delete conversion settings' });
  }
});

module.exports = router;

