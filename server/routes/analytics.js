/**
 * Analytics Routes
 * Provides business intelligence and analytics endpoints
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const AnalyticsService = require('../services/analyticsService');
const router = express.Router();

const analyticsService = new AnalyticsService();

/**
 * @route GET /api/analytics/dashboard
 * @desc Get comprehensive dashboard analytics
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const analytics = await analyticsService.getDashboardAnalytics(merchantId, period);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to load dashboard analytics' });
  }
});

/**
 * @route GET /api/analytics/revenue
 * @desc Get revenue analytics
 */
router.get('/revenue', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const revenue = await analyticsService.getRevenueAnalytics(merchantId, period);

    res.json({
      success: true,
      revenue
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to load revenue analytics' });
  }
});

/**
 * @route GET /api/analytics/trends
 * @desc Get transaction trends over time
 */
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const trends = await analyticsService.getTransactionTrends(merchantId, period);

    res.json({
      success: true,
      trends
    });

  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({ error: 'Failed to load trends analytics' });
  }
});

/**
 * @route GET /api/analytics/customers
 * @desc Get customer analytics
 */
router.get('/customers', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const customers = await analyticsService.getCustomerAnalytics(merchantId, period);

    res.json({
      success: true,
      customers
    });

  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ error: 'Failed to load customer analytics' });
  }
});

/**
 * @route GET /api/analytics/networks
 * @desc Get network performance analytics
 */
router.get('/networks', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const networks = await analyticsService.getNetworkAnalytics(merchantId, period);

    res.json({
      success: true,
      networks
    });

  } catch (error) {
    console.error('Network analytics error:', error);
    res.status(500).json({ error: 'Failed to load network analytics' });
  }
});

/**
 * @route GET /api/analytics/payment-methods
 * @desc Get payment method analytics
 */
router.get('/payment-methods', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const paymentMethods = await analyticsService.getPaymentMethodAnalytics(merchantId, period);

    res.json({
      success: true,
      paymentMethods
    });

  } catch (error) {
    console.error('Payment method analytics error:', error);
    res.status(500).json({ error: 'Failed to load payment method analytics' });
  }
});

/**
 * @route GET /api/analytics/compliance
 * @desc Get compliance analytics
 */
router.get('/compliance', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const merchantId = req.user.id;

    const compliance = await analyticsService.getComplianceAnalytics(merchantId, period);

    res.json({
      success: true,
      compliance
    });

  } catch (error) {
    console.error('Compliance analytics error:', error);
    res.status(500).json({ error: 'Failed to load compliance analytics' });
  }
});

/**
 * @route GET /api/analytics/export
 * @desc Export transaction data
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { period = '30d', format = 'csv' } = req.query;
    const merchantId = req.user.id;

    const exportData = await analyticsService.exportTransactionData(merchantId, period, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${period}_${Date.now()}.csv"`);
      res.send(exportData);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${period}_${Date.now()}.json"`);
      res.send(exportData);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * @route POST /api/analytics/cache/clear
 * @desc Clear analytics cache
 */
router.post('/cache/clear', authMiddleware, async (req, res) => {
  try {
    analyticsService.clearCache();

    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;



