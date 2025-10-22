const express = require('express');
const { body, validationResult } = require('express-validator');
const FiatPayment = require('../models/FiatPayment');
const CannabisFriendlyPaymentService = require('../services/CannabisFriendlyPaymentService');
const router = express.Router();

// Validation middleware
const validateCannabisPayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('customerInfo.email').isEmail().withMessage('Valid email required'),
  body('customerInfo.name').notEmpty().withMessage('Customer name required'),
  body('targetStablecoin').optional().isIn(['USDC', 'USDT', 'DAI']).withMessage('Invalid stablecoin'),
  body('paymentMethod').optional().isIn(['ACH', 'Bank Transfer', 'Credit Card']).withMessage('Invalid payment method')
];

/**
 * @route POST /api/cannabis-payments/create
 * @desc Create a cannabis-friendly fiat payment request
 */
router.post('/create', validateCannabisPayment, async (req, res) => {
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
      targetStablecoin = 'USDC',
      paymentMethod = 'ACH'
    } = req.body;

    // Get merchant from JWT token
    const merchantId = req.user.userId;

    // Create cannabis-friendly payment
    const fiatPayment = await CannabisFriendlyPaymentService.createCannabisFriendlyPayment(merchantId, {
      amount,
      currency,
      customerInfo,
      description,
      products,
      targetStablecoin,
      paymentMethod,
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
        status: fiatPayment.status,
        cannabisFriendly: true
      },
      message: 'Cannabis-friendly payment request created successfully'
    });

  } catch (error) {
    console.error('Create cannabis payment error:', error);
    res.status(500).json({ error: 'Failed to create cannabis-friendly payment request' });
  }
});

/**
 * @route POST /api/cannabis-payments/process-ach
 * @desc Process ACH bank transfer (no third-party fees)
 */
router.post('/process-ach', [
  body('fiatPaymentId').notEmpty().withMessage('Fiat payment ID required'),
  body('bankDetails.bankName').notEmpty().withMessage('Bank name required'),
  body('bankDetails.accountNumber').notEmpty().withMessage('Account number required'),
  body('bankDetails.routingNumber').notEmpty().withMessage('Routing number required'),
  body('bankDetails.accountHolderName').notEmpty().withMessage('Account holder name required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fiatPaymentId, bankDetails } = req.body;

    const result = await CannabisFriendlyPaymentService.processACHTransfer(fiatPaymentId, bankDetails);

    res.json({
      success: result.success,
      message: result.success ? 'ACH transfer initiated successfully' : 'ACH transfer failed',
      payment: {
        id: result.fiatPayment._id,
        status: result.fiatPayment.status,
        transactionId: result.transactionId
      }
    });

  } catch (error) {
    console.error('ACH processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process ACH transfer' });
  }
});

/**
 * @route POST /api/cannabis-payments/process-provider
 * @desc Process payment through cannabis-friendly provider
 */
router.post('/process-provider', [
  body('fiatPaymentId').notEmpty().withMessage('Fiat payment ID required'),
  body('provider').isIn(['canpay', 'dutchie', 'greenrush']).withMessage('Invalid provider'),
  body('paymentData').notEmpty().withMessage('Payment data required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fiatPaymentId, provider, paymentData } = req.body;

    const result = await CannabisFriendlyPaymentService.processCannabisFriendlyPayment(
      fiatPaymentId, 
      provider, 
      paymentData
    );

    res.json({
      success: result.success,
      message: result.success ? 'Payment processed successfully' : 'Payment failed',
      payment: {
        id: result.fiatPayment._id,
        status: result.fiatPayment.status,
        transactionId: result.transactionId
      }
    });

  } catch (error) {
    console.error('Cannabis-friendly payment processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

/**
 * @route GET /api/cannabis-payments/providers
 * @desc Get available cannabis-friendly payment providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = CannabisFriendlyPaymentService.getCannabisFriendlyProviders();

    res.json({
      success: true,
      providers
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to get payment providers' });
  }
});

/**
 * @route GET /api/cannabis-payments/status/:id
 * @desc Get cannabis payment status
 */
router.get('/status/:id', async (req, res) => {
  try {
    const fiatPayment = await FiatPayment.findById(req.params.id);
    
    if (!fiatPayment) {
      return res.status(404).json({ error: 'Payment not found' });
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
        timestamps: fiatPayment.timestamps,
        cannabisFriendly: fiatPayment.metadata.cannabisFriendly
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * @route GET /api/cannabis-payments/history
 * @desc Get cannabis payment history for merchant
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

    const query = { 
      merchantId,
      'metadata.cannabisFriendly': true
    };
    
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

    res.json({
      success: true,
      payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

/**
 * @route GET /api/cannabis-payments/stats
 * @desc Get cannabis payment statistics for merchant
 */
router.get('/stats', async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { period = '30d' } = req.query;

    const stats = await CannabisFriendlyPaymentService.getCannabisFriendlyStats(merchantId, period);

    res.json({
      success: true,
      stats,
      period
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Failed to get payment statistics' });
  }
});

/**
 * @route GET /api/cannabis-payments/estimate
 * @desc Get cannabis payment estimate with fees
 */
router.get('/estimate', async (req, res) => {
  try {
    const { amount, currency, targetStablecoin = 'USDC', paymentMethod = 'ACH' } = req.query;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    const exchangeRate = await CannabisFriendlyPaymentService.getExchangeRate(currency, targetStablecoin);
    const stablecoinAmount = (parseFloat(amount) / exchangeRate).toFixed(6);
    const fees = CannabisFriendlyPaymentService.calculateCannabisFriendlyFees(
      parseFloat(amount), 
      currency, 
      paymentMethod
    );

    res.json({
      success: true,
      estimate: {
        fiatAmount: parseFloat(amount),
        fiatCurrency: currency,
        stablecoinAmount: parseFloat(stablecoinAmount),
        targetStablecoin,
        exchangeRate,
        fees,
        netStablecoinAmount: parseFloat(stablecoinAmount) - (fees.conversion / exchangeRate),
        cannabisFriendly: true,
        savings: {
          vsStripe: (parseFloat(amount) * 0.029 + 0.30) - fees.total,
          vsPayPal: (parseFloat(amount) * 0.034 + 0.30) - fees.total
        }
      }
    });

  } catch (error) {
    console.error('Payment estimate error:', error);
    res.status(500).json({ error: 'Failed to get payment estimate' });
  }
});

/**
 * @route POST /api/cannabis-payments/refund
 * @desc Process a refund for cannabis payment
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
      return res.status(404).json({ error: 'Payment not found' });
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
 * @route GET /api/cannabis-payments/compliance
 * @desc Get cannabis industry compliance information
 */
router.get('/compliance', async (req, res) => {
  try {
    const compliance = {
      cannabisFriendly: true,
      industryCompliant: true,
      supportedIndustries: [
        'Hemp',
        'CBD',
        'Cannabis (where legal)',
        'Cannabis-adjacent products',
        'Hemp-derived products'
      ],
      complianceFeatures: [
        'AML/KYC verification',
        'Risk scoring',
        'Transaction monitoring',
        'Regulatory reporting',
        'Industry-specific compliance'
      ],
      legalStatus: {
        hemp: 'Fully supported',
        cbd: 'Fully supported',
        cannabis: 'Supported where legal',
        cannabisAdjacent: 'Fully supported'
      }
    };

    res.json({
      success: true,
      compliance
    });

  } catch (error) {
    console.error('Get compliance info error:', error);
    res.status(500).json({ error: 'Failed to get compliance information' });
  }
});

module.exports = router;



