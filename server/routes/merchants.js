const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
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

// Get merchant dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const merchant = await User.findById(req.user.userId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ merchantId: req.user.userId })
      .sort({ 'timestamps.created': -1 })
      .limit(10)
      .select('transactionId amount currency status timestamps.created customerEmail');

    // Get transaction statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Transaction.aggregate([
      {
        $match: {
          merchantId: req.user.userId,
          'timestamps.created': { $gte: thirtyDaysAgo }
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
          totalFees: { $sum: '$fees.total' }
        }
      }
    ]);

    const dashboardData = {
      merchant: {
        id: merchant._id,
        businessName: merchant.businessName,
        email: merchant.email,
        isVerified: merchant.isVerified,
        kycStatus: merchant.kycStatus,
        walletAddress: merchant.walletAddress
      },
      recentTransactions,
      stats: stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        totalFees: 0
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get merchant profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const merchant = await User.findById(req.user.userId)
      .select('-password -verificationDocuments');

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.json({ merchant });
  } catch (error) {
    console.error('Error fetching merchant profile:', error);
    res.status(500).json({ error: 'Failed to fetch merchant profile' });
  }
});

// Update merchant profile
router.put('/profile', authenticateToken, [
  body('businessName').optional().trim().isLength({ min: 2, max: 100 }),
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('walletAddress').optional().matches(/^0x[a-fA-F0-9]{40}$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { businessName, firstName, lastName, walletAddress } = req.body;
    const updateData = {};

    if (businessName) updateData.businessName = businessName;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (walletAddress) updateData.walletAddress = walletAddress;

    const merchant = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationDocuments');

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      merchant 
    });
  } catch (error) {
    console.error('Error updating merchant profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get merchant settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const merchant = await User.findById(req.user.userId)
      .select('businessName email businessType licenseNumber walletAddress isVerified kycStatus');

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.json({ settings: merchant });
  } catch (error) {
    console.error('Error fetching merchant settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get merchant analytics
router.get('/analytics', authenticateToken, async (req, res) => {
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

    // Transaction volume over time
    const volumeData = await Transaction.aggregate([
      {
        $match: {
          merchantId: req.user.userId,
          'timestamps.created': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamps.created' },
            month: { $month: '$timestamps.created' },
            day: { $dayOfMonth: '$timestamps.created' }
          },
          dailyVolume: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Currency breakdown
    const currencyBreakdown = await Transaction.aggregate([
      {
        $match: {
          merchantId: req.user.userId,
          'timestamps.created': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$currency',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Status breakdown
    const statusBreakdown = await Transaction.aggregate([
      {
        $match: {
          merchantId: req.user.userId,
          'timestamps.created': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      volumeData,
      currencyBreakdown,
      statusBreakdown,
      period
    });
  } catch (error) {
    console.error('Error fetching merchant analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

