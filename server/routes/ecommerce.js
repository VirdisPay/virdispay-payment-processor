const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for e-commerce endpoints
const ecommerceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Create e-commerce payment
router.post('/create-ecommerce', ecommerceRateLimit, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isString().withMessage('Currency is required'),
  body('orderId').isString().withMessage('Order ID is required'),
  body('merchantId').isString().withMessage('Merchant ID is required'),
  body('customerEmail').optional().isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    console.log('🛒 E-commerce payment request received:', {
      amount: req.body.amount,
      currency: req.body.currency,
      orderId: req.body.orderId,
      merchantId: req.body.merchantId
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, currency, orderId, customerEmail, merchantId } = req.body;

    // Verify merchant exists
    const merchant = await User.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Get current crypto price
    const cryptoPrice = await getCryptoPrice(currency);
    if (!cryptoPrice) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency'
      });
    }

    const cryptoAmount = amount / cryptoPrice;
    const network = getNetworkForCurrency(currency);

    // Create transaction
    const transaction = new Transaction({
      merchantId: merchantId,
      amount: amount,
      currency: currency,
      network: network,
      cryptoAmount: cryptoAmount,
      merchantWallet: merchant.walletAddress,
      description: `E-commerce payment for order ${orderId}`,
      status: 'pending',
      orderId: orderId,
      customerEmail: customerEmail,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    await transaction.save();

    // Generate public payment URL
    const paymentUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/pay/${transaction._id}`;

    console.log('✅ E-commerce payment created:', {
      transactionId: transaction._id,
      orderId: orderId,
      amount: amount,
      currency: currency,
      cryptoAmount: cryptoAmount
    });

    res.json({
      success: true,
      payment: {
        id: transaction._id,
        amount: transaction.amount,
        currency: transaction.currency,
        network: transaction.network,
        amountInCrypto: transaction.cryptoAmount,
        merchantWallet: transaction.merchantWallet,
        description: transaction.description,
        status: transaction.status,
        paymentUrl: paymentUrl,
        orderId: transaction.orderId,
        customerEmail: transaction.customerEmail,
        expiresAt: transaction.expiresAt
      }
    });

  } catch (error) {
    console.error('❌ E-commerce payment creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
});

// Get payment status for e-commerce
router.get('/status/:paymentId', ecommerceRateLimit, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Transaction.findById(paymentId)
      .populate('merchantId', 'businessName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        network: payment.network,
        amountInCrypto: payment.cryptoAmount,
        status: payment.status,
        orderId: payment.orderId,
        customerEmail: payment.customerEmail,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        merchant: {
          businessName: payment.merchantId.businessName,
          email: payment.merchantId.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
});

// Webhook endpoint for payment confirmation
router.post('/webhook/:paymentId', ecommerceRateLimit, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, transactionHash, customerWallet } = req.body;

    const payment = await Transaction.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status
    payment.status = status;
    if (transactionHash) payment.transactionHash = transactionHash;
    if (customerWallet) payment.customerWallet = customerWallet;

    await payment.save();

    console.log('🔔 E-commerce webhook received:', {
      paymentId: paymentId,
      status: status,
      orderId: payment.orderId
    });

    // TODO: Send webhook to merchant's endpoint if configured
    // TODO: Send confirmation email to customer
    // TODO: Update order status in merchant's system

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

// Get supported currencies
router.get('/currencies', ecommerceRateLimit, async (req, res) => {
  try {
    const currencies = [
      { symbol: 'USDC', name: 'USD Coin', network: 'Polygon', icon: '💵' },
      { symbol: 'USDT', name: 'Tether USD', network: 'Polygon', icon: '💵' },
      { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum', icon: '⛽' },
      { symbol: 'MATIC', name: 'Polygon', network: 'Polygon', icon: '🔷' }
    ];

    res.json({
      success: true,
      currencies: currencies
    });

  } catch (error) {
    console.error('❌ Failed to get currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get currencies',
      error: error.message
    });
  }
});

// Helper function to get crypto price
async function getCryptoPrice(currency) {
  // This would typically fetch from a price API like CoinGecko
  // For now, return mock prices
  const prices = {
    'USDC': 1.00,
    'USDT': 1.00,
    'ETH': 2000.00,
    'MATIC': 0.80
  };

  return prices[currency] || null;
}

// Helper function to get network for currency
function getNetworkForCurrency(currency) {
  const networks = {
    'USDC': 'Polygon',
    'USDT': 'Polygon',
    'ETH': 'Ethereum',
    'MATIC': 'Polygon'
  };

  return networks[currency] || 'Polygon';
}

module.exports = router;

