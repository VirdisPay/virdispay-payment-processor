const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const jwt = require('jsonwebtoken');
    // SECURITY: No fallback! JWT_SECRET must be set in environment
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get transaction history for a merchant
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      sortBy = 'created',
      sortOrder = 'desc'
    } = req.query;

    const query = { merchantId: req.user.userId };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query['timestamps.created'] = {};
      if (startDate) query['timestamps.created'].$gte = new Date(startDate);
      if (endDate) query['timestamps.created'].$lte = new Date(endDate);
    }

    const sortOptions = {};
    sortOptions[`timestamps.${sortBy}`] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('merchantId', 'businessName email');

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get a specific transaction
router.get('/:transactionId', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      merchantId: req.user.userId
    }).populate('merchantId', 'businessName email');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Get transaction statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    const now = new Date();
    
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

    const stats = await Transaction.aggregate([
      {
        $match: {
          merchantId: req.user.userId,
          'timestamps.created': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalFees: { $sum: '$fees.total' },
          avgTransactionAmount: { $avg: '$amount' },
          avgProcessingTime: {
            $avg: {
              $cond: [
                { $ne: ['$timestamps.completed', null] },
                { $subtract: ['$timestamps.completed', '$timestamps.created'] },
                null
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      totalFees: 0,
      avgTransactionAmount: 0,
      avgProcessingTime: 0
    };

    res.json({ stats: result });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ error: 'Failed to fetch transaction statistics' });
  }
});

// Get transaction status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    res.status(500).json({ error: 'Failed to fetch transaction status' });
  }
});

// Update transaction status (for webhook processing)
router.patch('/:transactionId/status', authenticateToken, async (req, res) => {
  try {
    const { status, txHash, confirmationCount, blockNumber } = req.body;

    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      merchantId: req.user.userId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update transaction fields
    if (status) transaction.status = status;
    if (txHash) transaction.txHash = txHash;
    if (confirmationCount !== undefined) transaction.confirmationCount = confirmationCount;
    if (blockNumber) transaction.blockNumber = blockNumber;

    // Update timestamps based on status
    if (status === 'completed') {
      transaction.timestamps.completed = new Date();
    } else if (status === 'failed') {
      transaction.timestamps.failed = new Date();
    } else if (status === 'processing') {
      transaction.timestamps.processed = new Date();
    }

    await transaction.save();

    res.json({ 
      message: 'Transaction status updated successfully',
      transaction 
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

// Get transactions by status
router.get('/status/:status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const transactions = await Transaction.find({
      merchantId: req.user.userId,
      status: status
    })
    .sort({ 'timestamps.created': -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments({
      merchantId: req.user.userId,
      status: status
    });

    res.json({
      transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions by status:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;

