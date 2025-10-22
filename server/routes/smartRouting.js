const express = require('express');
const { body, validationResult } = require('express-validator');
const SmartRoutingService = require('../services/SmartRoutingService');
const router = express.Router();

// Validation middleware
const validateRoutingRequest = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['USDC', 'USDT', 'DAI', 'ETH', 'BTC']).withMessage('Invalid currency'),
  body('urgency').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid urgency level')
];

const validateMerchantPreferences = [
  body('priority').optional().isIn(['cost', 'speed', 'balanced']).withMessage('Invalid priority'),
  body('preferredNetworks').optional().isArray().withMessage('Preferred networks must be an array'),
  body('maxGasPrice').optional().isNumeric().withMessage('Max gas price must be a number'),
  body('minReliability').optional().isNumeric().withMessage('Min reliability must be a number')
];

/**
 * @route POST /api/smart-routing/optimal
 * @desc Get optimal routing for a payment
 */
router.post('/optimal', validateRoutingRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency, urgency, customerPreferences } = req.body;
    const merchantId = req.user?.userId; // From auth middleware

    const routing = await SmartRoutingService.getOptimalRouting({
      amount,
      currency,
      urgency,
      customerPreferences
    }, merchantId);

    res.json({
      success: true,
      routing,
      message: 'Optimal routing calculated successfully'
    });

  } catch (error) {
    console.error('Smart routing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to calculate optimal routing' 
    });
  }
});

/**
 * @route GET /api/smart-routing/status
 * @desc Get current network status
 */
router.get('/status', async (req, res) => {
  try {
    const status = SmartRoutingService.getNetworkStatus();
    
    res.json({
      success: true,
      status,
      message: 'Network status retrieved successfully'
    });

  } catch (error) {
    console.error('Network status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get network status' 
    });
  }
});

/**
 * @route GET /api/smart-routing/analytics/:merchantId
 * @desc Get routing analytics for a merchant
 */
router.get('/analytics/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { timeRange = '7d' } = req.query;

    const analytics = SmartRoutingService.getRoutingAnalytics(merchantId, timeRange);

    res.json({
      success: true,
      analytics,
      message: 'Routing analytics retrieved successfully'
    });

  } catch (error) {
    console.error('Routing analytics error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get routing analytics' 
    });
  }
});

/**
 * @route POST /api/smart-routing/preferences
 * @desc Set merchant routing preferences
 */
router.post('/preferences', validateMerchantPreferences, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const merchantId = req.user?.userId;
    if (!merchantId) {
      return res.status(401).json({ 
        success: false,
        error: 'Merchant ID required' 
      });
    }

    const preferences = req.body;
    SmartRoutingService.setMerchantPreferences(merchantId, preferences);

    res.json({
      success: true,
      message: 'Routing preferences updated successfully',
      preferences
    });

  } catch (error) {
    console.error('Routing preferences error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update routing preferences' 
    });
  }
});

/**
 * @route GET /api/smart-routing/preferences
 * @desc Get merchant routing preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const merchantId = req.user?.userId;
    if (!merchantId) {
      return res.status(401).json({ 
        success: false,
        error: 'Merchant ID required' 
      });
    }

    const preferences = SmartRoutingService.getMerchantPreferences(merchantId);

    res.json({
      success: true,
      preferences,
      message: 'Routing preferences retrieved successfully'
    });

  } catch (error) {
    console.error('Get routing preferences error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get routing preferences' 
    });
  }
});

/**
 * @route POST /api/smart-routing/simulate
 * @desc Simulate routing for different scenarios
 */
router.post('/simulate', async (req, res) => {
  try {
    const { scenarios } = req.body;

    if (!scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({ 
        success: false,
        error: 'Scenarios array required' 
      });
    }

    const simulations = SmartRoutingService.simulateRouting(scenarios);

    res.json({
      success: true,
      simulations,
      message: 'Routing simulation completed successfully'
    });

  } catch (error) {
    console.error('Routing simulation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to simulate routing' 
    });
  }
});

/**
 * @route GET /api/smart-routing/recommendations
 * @desc Get routing recommendations for different payment amounts
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { amount = 100, urgency = 'normal' } = req.query;

    const recommendations = SmartRoutingService.networkMonitor.getRoutingRecommendations(
      parseFloat(amount),
      urgency
    );

    res.json({
      success: true,
      recommendations,
      message: 'Routing recommendations retrieved successfully'
    });

  } catch (error) {
    console.error('Routing recommendations error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get routing recommendations' 
    });
  }
});

module.exports = router;



