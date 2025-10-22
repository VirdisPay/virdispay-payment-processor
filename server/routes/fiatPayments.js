const express = require('express');
const { body, validationResult } = require('express-validator');
const FiatPayment = require('../models/FiatPayment');
const FiatToCryptoService = require('../services/FiatToCryptoService');
const router = express.Router();

// Validation middleware
const validateFiatPayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('customerInfo.email').isEmail().withMessage('Valid email required'),
  body('customerInfo.name').notEmpty().withMessage('Customer name required'),
  body('targetStablecoin').optional().isIn(['USDC', 'USDT', 'DAI']).withMessage('Invalid stablecoin'),
  body('description').optional().isString().withMessage('Description must be a string')
];

/**
 * @route POST /api/fiat-payments/create
 * @desc Create a fiat payment request
 */
router.post('/create', validateFiatPayment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      amount,
      currency,
      customerInfo,
      description,
      products,
      targetStablecoin = 'USDC'
    } = req.body;

    // Get merchant from JWT token
    const merchantId = req.user.userId;

    // Create fiat payment
    const fiatPayment = await FiatToCryptoService.createFiatPayment(merchantId, {
      amount,
      currency,
      customerInfo,
      description,
      products,
      targetStablecoin,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      referrer: req.headers.referer
    });

    res.json({
      success: true,
      payment: {
        id: fiatPayment._id,
        paymentId: fiatPayment.paymentId,
        amount: fiatPayment.fiatAmount,
        currency: fiatPayment.fiatCurrency,
        stablecoinAmount: fiatPayment.stablecoinAmount,
        targetStablecoin: fiatPayment.targetStablecoin,
        exchangeRate: fiatPayment.exchangeRate,
        fees: fiatPayment.fees,
        status: fiatPayment.status
      },
      message: 'Fiat payment request created successfully'
    });

  } catch (error) {
    console.error('Create fiat payment error:', error);
    res.status(500).json({ error: 'Failed to create fiat payment request' });
  }
});

/**
 * @route POST /api/fiat-payments/process-stripe
 * @desc Process fiat payment with Stripe
 */
router.post('/process-stripe', [
  body('fiatPaymentId').notEmpty().withMessage('Fiat payment ID required'),
  body('paymentMethodId').notEmpty().withMessage('Payment method ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fiatPaymentId, paymentMethodId } = req.body;

    const result = await FiatToCryptoService.processStripePayment(fiatPaymentId, paymentMethodId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Payment processed successfully',
        payment: {
          id: result.fiatPayment._id,
          status: result.fiatPayment.status,
          paymentIntentId: result.paymentIntent.id,
          clientSecret: result.paymentIntent.client_secret
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Payment requires additional action',
        payment: {
          id: result.fiatPayment._id,
          status: result.fiatPayment.status,
          paymentIntentId: result.paymentIntent.id,
          clientSecret: result.paymentIntent.client_secret
        }
      });
    }

  } catch (error) {
    console.error('Stripe payment processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

/**
 * @route POST /api/fiat-payments/process-paypal
 * @desc Process fiat payment with PayPal
 */
router.post('/process-paypal', [
  body('fiatPaymentId').notEmpty().withMessage('Fiat payment ID required'),
  body('paypalOrderId').notEmpty().withMessage('PayPal order ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fiatPaymentId, paypalOrderId } = req.body;

    const result = await FiatToCryptoService.processPayPalPayment(fiatPaymentId, paypalOrderId);

    res.json({
      success: result.success,
      message: result.success ? 'Payment processed successfully' : 'Payment failed',
      payment: {
        id: result.fiatPayment._id,
        status: result.fiatPayment.status
      }
    });

  } catch (error) {
    console.error('PayPal payment processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

/**
 * @route GET /api/fiat-payments/status/:id
 * @desc Get fiat payment status
 */
router.get('/status/:id', async (req, res) => {
  try {
    const fiatPayment = await FiatPayment.findById(req.params.id);
    
    if (!fiatPayment) {
      return res.status(404).json({ error: 'Fiat payment not found' });
    }

    res.json({
      success: true,
      payment: {
        id: fiatPayment._id,
        paymentId: fiatPayment.paymentId,
        status: fiatPayment.status,
        amount: fiatPayment.fiatAmount,
        currency: fiatPayment.fiatCurrency,
        stablecoinAmount: fiatPayment.stablecoinAmount,
        targetStablecoin: fiatPayment.targetStablecoin,
        exchangeRate: fiatPayment.exchangeRate,
        fees: fiatPayment.fees,
        conversionStatus: fiatPayment.conversionDetails.conversionStatus,
        stablecoinTxHash: fiatPayment.conversionDetails.stablecoinTxHash,
        timestamps: fiatPayment.timestamps
      }
    });

  } catch (error) {
    console.error('Get fiat payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * @route GET /api/fiat-payments/history
 * @desc Get fiat payment history for merchant
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

    const history = await FiatToCryptoService.getFiatPaymentHistory(merchantId, {
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
    console.error('Get fiat payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

/**
 * @route GET /api/fiat-payments/stats
 * @desc Get fiat payment statistics for merchant
 */
router.get('/stats', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { period = '30d' } = req.query;

    const stats = await FiatToCryptoService.getFiatPaymentStats(merchantId, period);

    res.json({
      success: true,
      stats,
      period
    });

  } catch (error) {
    console.error('Get fiat payment stats error:', error);
    res.status(500).json({ error: 'Failed to get payment statistics' });
  }
});

/**
 * @route POST /api/fiat-payments/refund
 * @desc Process a refund for fiat payment
 */
router.post('/refund', [
  body('fiatPaymentId').notEmpty().withMessage('Fiat payment ID required'),
  body('reason').optional().isString().withMessage('Refund reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fiatPaymentId, reason } = req.body;

    const fiatPayment = await FiatPayment.findById(fiatPaymentId);
    if (!fiatPayment) {
      return res.status(404).json({ error: 'Fiat payment not found' });
    }

    if (fiatPayment.merchantId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized access to payment' });
    }

    if (fiatPayment.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed payments' });
    }

    // Update payment status
    fiatPayment.status = 'refunded';
    fiatPayment.refundInfo = {
      refunded: true,
      refundAmount: fiatPayment.fiatAmount,
      refundReason: reason || 'Merchant refund',
      refundedAt: new Date()
    };

    await fiatPayment.save();

    // TODO: Process actual refund through payment provider
    // This would involve calling Stripe/PayPal refund APIs

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        amount: fiatPayment.refundInfo.refundAmount,
        reason: fiatPayment.refundInfo.refundReason,
        processedAt: fiatPayment.refundInfo.refundedAt
      }
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * @route GET /api/fiat-payments/estimate
 * @desc Get payment estimate with fees
 */
router.get('/estimate', async (req, res) => {
  try {
    const { amount, currency, targetStablecoin = 'USDC' } = req.query;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    const exchangeRate = await FiatToCryptoService.getExchangeRate(currency, targetStablecoin);
    const stablecoinAmount = (parseFloat(amount) / exchangeRate).toFixed(6);
    const fees = FiatToCryptoService.calculateFiatPaymentFees(parseFloat(amount), currency);

    res.json({
      success: true,
      estimate: {
        fiatAmount: parseFloat(amount),
        fiatCurrency: currency,
        stablecoinAmount: parseFloat(stablecoinAmount),
        targetStablecoin,
        exchangeRate,
        fees,
        netStablecoinAmount: parseFloat(stablecoinAmount) - (fees.conversion / exchangeRate)
      }
    });

  } catch (error) {
    console.error('Payment estimate error:', error);
    res.status(500).json({ error: 'Failed to get payment estimate' });
  }
});

/**
 * @route GET /api/fiat-payments/supported-currencies
 * @desc Get supported fiat currencies and stablecoins
 */
router.get('/supported-currencies', async (req, res) => {
  try {
    const currencies = {
      fiat: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
      ],
      stablecoins: [
        { code: 'USDC', name: 'USD Coin', symbol: 'USDC' },
        { code: 'USDT', name: 'Tether', symbol: 'USDT' },
        { code: 'DAI', name: 'Dai Stablecoin', symbol: 'DAI' }
      ],
      paymentMethods: [
        { code: 'credit_card', name: 'Credit Card', icon: '💳' },
        { code: 'debit_card', name: 'Debit Card', icon: '💳' },
        { code: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
        { code: 'paypal', name: 'PayPal', icon: '🅿️' },
        { code: 'apple_pay', name: 'Apple Pay', icon: '🍎' },
        { code: 'google_pay', name: 'Google Pay', icon: '📱' }
      ]
    };

    res.json({
      success: true,
      currencies
    });

  } catch (error) {
    console.error('Get supported currencies error:', error);
    res.status(500).json({ error: 'Failed to get supported currencies' });
  }
});

module.exports = router;

