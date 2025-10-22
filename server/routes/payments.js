const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const FiatConversionService = require('../services/FiatConversionService');
const { getBlockchainConfig, getRpcUrl, getRecommendedBlockchain, estimateGasCost } = require('../config/blockchain');
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const authMiddleware = require('../middleware/auth');
const { 
  requireKYCVerification, 
  performAMLChecks, 
  applyRiskBasedLimits, 
  enhancedDueDiligence 
} = require('../middleware/compliance');
const { 
  validateApiKeyAndDomain,
  validatePublicKey,
  optionalApiKey 
} = require('../middleware/apiKeyAuth');
const EmailService = require('../services/emailService');
const { 
  paymentCreateRateLimit, 
  paymentProcessRateLimit, 
  paymentStatusRateLimit 
} = require('../middleware/rateLimiting');
const router = express.Router();

const emailService = new EmailService();

// Initialize Web3 and ethers with Polygon (default)
const defaultBlockchain = process.env.DEFAULT_BLOCKCHAIN || 'polygon';
const polygonRpcUrl = getRpcUrl('polygon');
const web3 = new Web3(polygonRpcUrl);
const provider = new ethers.JsonRpcProvider(polygonRpcUrl);

// Multi-chain support: Initialize providers for different blockchains
const providers = {
  polygon: new ethers.JsonRpcProvider(getRpcUrl('polygon')),
  ethereum: new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID'),
  polygonTestnet: new ethers.JsonRpcProvider(getRpcUrl('polygonTestnet'))
};

// Get provider for specific blockchain
function getProvider(blockchain = 'polygon') {
  return providers[blockchain] || providers.polygon;
}

// Validation middleware
const validatePayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['USDC', 'USDT', 'DAI', 'ETH', 'BTC']).withMessage('Invalid currency'),
  body('customerEmail').isEmail().withMessage('Valid email required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('customerInfo.name').optional().isString().withMessage('Customer name must be a string'),
  body('customerInfo.phone').optional().isString().withMessage('Phone must be a string')
];

/**
 * @route POST /api/payments/widget/create
 * @desc Create a new payment request from widget (requires API key + domain validation)
 */
router.post('/widget/create', 
  validateApiKeyAndDomain, // Validate API key AND domain
  paymentCreateRateLimit,
  requireKYCVerification,
  performAMLChecks,
  applyRiskBasedLimits,
  enhancedDueDiligence,
  validatePayment, 
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      amount,
      currency,
      customerEmail,
      description,
      customerInfo,
      products,
      customerAddress
    } = req.body;

    // Merchant is already attached by API key validation middleware
    const merchant = req.merchant;
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // VALIDATION: Check if merchant has wallet address configured
    if (!merchant.walletAddress) {
      return res.status(400).json({ 
        error: 'Wallet address required',
        message: 'Please add your crypto wallet address in Profile Settings before creating payments.'
      });
    }

    // Generate unique transaction ID
    const transactionId = `vp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get current exchange rate
    const exchangeRate = await getExchangeRate(currency);
    const cryptoAmount = (amount / exchangeRate).toFixed(8);

    // Create transaction record
    const transaction = new Transaction({
      transactionId,
      merchantId: merchant._id,
      customerEmail,
      amount,
      currency,
      cryptoAmount,
      exchangeRate,
      paymentMethod: currency === 'ETH' || currency === 'BTC' ? 'crypto' : 'stablecoin',
      blockchain: getBlockchainForCurrency(currency),
      fromAddress: 'pending',
      toAddress: merchant.walletAddress,
      metadata: {
        description,
        customerInfo,
        products,
        apiKeyUsed: req.apiKey,
        origin: req.validatedOrigin
      },
      compliance: {
        amlChecked: true,
        kycVerified: true,
        riskScore: req.amlReport?.overallRiskLevel === 'high' ? 80 : 
                   req.amlReport?.overallRiskLevel === 'medium' ? 50 : 20,
        amlReport: req.amlReport,
        enhancedDueDiligence: req.enhancedDueDiligence,
        transactionLimits: req.transactionLimits
      }
    });

    await transaction.save();

    // Generate payment request data
    const paymentRequest = {
      transactionId: transaction._id,
      amount,
      currency,
      cryptoAmount,
      exchangeRate,
      merchantInfo: {
        businessName: merchant.businessName,
        walletAddress: merchant.walletAddress
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    res.json({
      success: true,
      paymentRequest,
      message: 'Payment request created successfully'
    });

  } catch (error) {
    console.error('Widget payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

/**
 * @route POST /api/payments/create
 * @desc Create a new payment request (dashboard/authenticated route)
 */
router.post('/create', 
  authMiddleware,
  paymentCreateRateLimit,
  requireKYCVerification,
  performAMLChecks,
  applyRiskBasedLimits,
  enhancedDueDiligence,
  validatePayment, 
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      amount,
      currency,
      customerEmail,
      description,
      customerInfo,
      products,
      customerAddress
    } = req.body;

    // Merchant data is already validated by auth and KYC middleware
    const merchantId = req.user.id;
    const merchant = await User.findById(merchantId);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // VALIDATION: Check if merchant has wallet address configured
    if (!merchant.walletAddress) {
      return res.status(400).json({ 
        error: 'Wallet address required',
        message: 'Please add your crypto wallet address in Profile Settings before creating payments.'
      });
    }

    // Generate unique transaction ID
    const transactionId = `voodoo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get current exchange rate
    const exchangeRate = await getExchangeRate(currency);
    const cryptoAmount = (amount / exchangeRate).toFixed(8);

    // Create transaction record
    const transaction = new Transaction({
      transactionId,
      merchantId,
      customerEmail,
      amount,
      currency,
      cryptoAmount,
      exchangeRate,
      paymentMethod: currency === 'ETH' || currency === 'BTC' ? 'crypto' : 'stablecoin',
      blockchain: getBlockchainForCurrency(currency),
      fromAddress: 'pending', // Will be set when customer initiates payment
      toAddress: merchant.walletAddress,
      metadata: {
        description,
        customerInfo,
        products
      },
      compliance: {
        amlChecked: true, // Already checked by AML middleware
        kycVerified: true, // Already verified by KYC middleware
        riskScore: req.amlReport?.overallRiskLevel === 'high' ? 80 : 
                   req.amlReport?.overallRiskLevel === 'medium' ? 50 : 20,
        amlReport: req.amlReport,
        enhancedDueDiligence: req.enhancedDueDiligence,
        transactionLimits: req.transactionLimits
      }
    });

    await transaction.save();

    // Generate payment request data for frontend
    const paymentRequest = {
      transactionId: transaction._id,
      amount,
      currency,
      cryptoAmount,
      exchangeRate,
      merchantInfo: {
        businessName: merchant.businessName,
        walletAddress: merchant.walletAddress
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    // Send payment confirmation email to merchant
    try {
      await emailService.sendPaymentConfirmation(merchant.email, {
        merchantName: merchant.businessName,
        amount,
        currency,
        transactionId: transaction._id,
        customerEmail,
        description,
        network: transaction.blockchain,
        gasFee: '0.01', // Estimated
        savings: '99.98% vs Ethereum',
        txHash: 'Pending',
        timestamp: new Date().toLocaleString()
      });
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
      // Don't fail the payment creation if email fails
    }

    // Send real-time notification
    try {
      const notificationService = req.app.get('notificationService');
      if (notificationService) {
        notificationService.emit('payment:created', {
          merchantId: merchant._id.toString(),
          paymentId: transaction._id,
          amount,
          currency,
          customerEmail,
          description
        });
      }
    } catch (notificationError) {
      console.error('Failed to send payment created notification:', notificationError);
    }

    res.json({
      success: true,
      paymentRequest,
      message: 'Payment request created successfully'
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

/**
 * @route POST /api/payments/process
 * @desc Process a payment with crypto transaction
 */
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const { transactionId, txHash, fromAddress } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    // Verify transaction on blockchain
    const txReceipt = await verifyTransaction(txHash, fromAddress, transaction);
    
    if (!txReceipt.success) {
      return res.status(400).json({ error: 'Transaction verification failed' });
    }

    // Update transaction with blockchain data
    transaction.txHash = txHash;
    transaction.fromAddress = fromAddress;
    transaction.status = 'processing';
    transaction.gasUsed = txReceipt.gasUsed;
    transaction.gasPrice = txReceipt.gasPrice;
    transaction.blockNumber = txReceipt.blockNumber;
    transaction.timestamps.processed = new Date();

    await transaction.save();

    // Get merchant info for emails
    const merchant = await User.findById(transaction.merchantId);

    // Send payment received email to customer
    try {
      await emailService.sendPaymentReceived(transaction.customerEmail, {
        customerName: transaction.metadata?.customerInfo?.name || 'Customer',
        merchantName: merchant?.businessName || 'Merchant',
        amount: transaction.amount,
        currency: transaction.currency,
        transactionId: transaction._id,
        description: transaction.metadata?.description,
        network: transaction.blockchain,
        gasFee: (txReceipt.gasUsed * txReceipt.gasPrice / Math.pow(10, 18)).toFixed(8),
        txHash,
        timestamp: new Date().toLocaleString()
      });
    } catch (emailError) {
      console.error('Failed to send payment received email:', emailError);
    }

    // Send transaction receipt email to customer
    try {
      await emailService.sendTransactionReceipt(transaction.customerEmail, {
        customerName: transaction.metadata?.customerInfo?.name || 'Customer',
        merchantName: merchant?.businessName || 'Merchant',
        amount: transaction.amount,
        currency: transaction.currency,
        transactionId: transaction._id,
        description: transaction.metadata?.description,
        network: transaction.blockchain,
        gasFee: (txReceipt.gasUsed * txReceipt.gasPrice / Math.pow(10, 18)).toFixed(8),
        txHash,
        timestamp: new Date().toLocaleString(),
        merchantContact: merchant?.email
      });
    } catch (emailError) {
      console.error('Failed to send transaction receipt email:', emailError);
    }

    // Send real-time notification for payment processed
    try {
      const notificationService = req.app.get('notificationService');
      if (notificationService) {
        notificationService.emit('payment:processed', {
          merchantId: transaction.merchantId.toString(),
          paymentId: transaction._id,
          amount: transaction.amount,
          currency: transaction.currency,
          network: transaction.blockchain,
          txHash
        });
      }
    } catch (notificationError) {
      console.error('Failed to send payment processed notification:', notificationError);
    }

    // Start monitoring for confirmations
    monitorTransactionConfirmations(transactionId);

    res.json({
      success: true,
      message: 'Payment processing initiated',
      transaction: {
        id: transaction._id,
        status: transaction.status,
        txHash: transaction.txHash,
        confirmations: 0,
        requiredConfirmations: transaction.requiredConfirmations
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

/**
 * @route GET /api/payments/status/:id
 * @desc Get payment status
 */
router.get('/status/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get current confirmation count
    if (transaction.txHash) {
      const currentBlock = await web3.eth.getBlockNumber();
      const txBlock = transaction.blockNumber;
      const confirmations = currentBlock - txBlock;
      
      transaction.confirmationCount = confirmations;
      
      // Check if transaction is confirmed
      if (confirmations >= transaction.requiredConfirmations && transaction.status === 'processing') {
        transaction.status = 'completed';
        transaction.timestamps.completed = new Date();
        await transaction.save();

        // Check if auto-conversion should be triggered
        try {
          const shouldConvert = await FiatConversionService.shouldAutoConvert(
            transaction.merchantId,
            transaction.amount
          );
          
          if (shouldConvert) {
            // Trigger auto-conversion in background
            FiatConversionService.processAutoConversion(transaction._id)
              .then(conversion => {
                if (conversion) {
                  console.log(`Auto-conversion initiated for transaction ${transaction._id}`);
                }
              })
              .catch(error => {
                console.error(`Auto-conversion failed for transaction ${transaction._id}:`, error);
              });
          }
        } catch (error) {
          console.error('Auto-conversion check failed:', error);
        }
      }
    }

    res.json({
      transactionId: transaction._id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      cryptoAmount: transaction.cryptoAmount,
      txHash: transaction.txHash,
      confirmations: transaction.confirmationCount,
      requiredConfirmations: transaction.requiredConfirmations,
      createdAt: transaction.timestamps.created,
      completedAt: transaction.timestamps.completed
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * @route POST /api/payments/refund
 * @desc Process a refund
 */
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed transactions' });
    }

    // Update transaction status
    transaction.status = 'refunded';
    transaction.refundInfo = {
      refunded: true,
      refundAmount: transaction.amount,
      refundReason: reason,
      refundedAt: new Date()
    };

    await transaction.save();

    // TODO: Implement actual refund on blockchain
    // This would involve sending crypto back to the original sender

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refundAmount: transaction.amount
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * @route GET /api/payments/merchant/:merchantId
 * @desc Get all payments for a merchant
 */
router.get('/merchant/:merchantId', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    const query = { merchantId: req.params.merchantId };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query['timestamps.created'] = {};
      if (startDate) query['timestamps.created'].$gte = new Date(startDate);
      if (endDate) query['timestamps.created'].$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ 'timestamps.created': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get merchant payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// Helper functions
async function getExchangeRate(currency) {
  // TODO: Implement real exchange rate API
  const rates = {
    'USDC': 1.0,
    'USDT': 1.0,
    'DAI': 1.0,
    'ETH': 2000, // Example rate
    'BTC': 45000 // Example rate
  };
  return rates[currency] || 1;
}

function getBlockchainForCurrency(currency) {
  const blockchainMap = {
    'USDC': 'ethereum',
    'USDT': 'ethereum',
    'DAI': 'ethereum',
    'ETH': 'ethereum',
    'BTC': 'bitcoin'
  };
  return blockchainMap[currency] || 'ethereum';
}

function calculateRiskScore(amount, customerInfo) {
  let score = 0;
  
  if (amount > 10000) score += 30;
  if (amount > 50000) score += 20;
  if (amount > 100000) score += 30;
  
  // Add more risk factors based on customer info
  if (!customerInfo?.name) score += 10;
  if (!customerInfo?.phone) score += 10;
  
  return Math.min(score, 100);
}

async function verifyTransaction(txHash, fromAddress, transaction) {
  try {
    const tx = await web3.eth.getTransaction(txHash);
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    
    return {
      success: receipt.status,
      gasUsed: receipt.gasUsed,
      gasPrice: tx.gasPrice,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Transaction verification error:', error);
    return { success: false };
  }
}

async function monitorTransactionConfirmations(transactionId) {
  // This would be implemented as a background job
  // to monitor blockchain confirmations
  console.log(`Monitoring confirmations for transaction ${transactionId}`);
}

/**
 * @route GET /api/payments/public/:paymentId
 * @desc Get payment details for public payment page (NO AUTH REQUIRED)
 */
router.get('/public/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Find payment by _id (paymentId is the _id)
    const payment = await Transaction.findById(paymentId)
      .populate('merchantId', 'businessName email walletAddress');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    // Return limited payment data (no sensitive merchant info)
    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        network: payment.network,
        amountInCrypto: payment.cryptoAmount,
        merchantWallet: payment.merchantWallet,
        description: payment.description,
        status: payment.status,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        customerName: payment.customerInfo?.name,
        merchantName: payment.merchantId?.businessName
      }
    });

  } catch (error) {
    console.error('Error fetching public payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load payment information' 
    });
  }
});

/**
 * @route POST /api/payments/:paymentId/wallet
 * @desc Update payment with customer wallet address (NO AUTH REQUIRED)
 */
router.post('/:paymentId/wallet', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { customerWallet, paymentMethod } = req.body;

    if (!customerWallet || !/^0x[a-fA-F0-9]{40}$/.test(customerWallet)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // Find payment by _id (paymentId is the _id)
    const payment = await Transaction.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment is no longer available'
      });
    }

    // Update payment with customer wallet
    payment.customerWallet = customerWallet;
    payment.paymentMethod = paymentMethod || 'wallet';
    payment.status = 'processing';
    await payment.save();

    res.json({
      success: true,
      message: 'Wallet address saved successfully',
      payment: {
        id: payment._id,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Error updating payment wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update payment' 
    });
  }
});

module.exports = router;
