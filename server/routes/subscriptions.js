const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');
const { auth, requireAdmin } = require('../middleware/auth');

// Get merchant's own subscription (merchant endpoint)
router.get('/my-subscription', auth, async (req, res) => {
  try {
    const result = await subscriptionService.getSubscription(req.user.id);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
});

// Change merchant's own plan
router.post('/change-plan', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['free', 'starter', 'professional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    
    const result = await subscriptionService.changePlan(req.user.id, plan);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ success: false, message: 'Failed to change plan' });
  }
});

// Admin: Get all subscriptions
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  try {
    const { status, plan } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;
    
    const subscriptions = await Subscription.find(query)
      .populate('merchantId', 'email businessName businessType')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

// Admin: Process all due subscriptions manually
router.post('/admin/process-billing', auth, requireAdmin, async (req, res) => {
  try {
    const results = await subscriptionService.processDueSubscriptions();
    res.json(results);
  } catch (error) {
    console.error('Error processing billing:', error);
    res.status(500).json({ success: false, message: 'Failed to process billing' });
  }
});

// Admin: Change merchant's plan
router.post('/admin/merchants/:merchantId/change-plan', auth, requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    
    const result = await subscriptionService.changePlan(req.params.merchantId, plan);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error changing merchant plan:', error);
    res.status(500).json({ success: false, message: 'Failed to change plan' });
  }
});

// Admin: Waive subscription fee
router.post('/admin/subscriptions/:id/waive', auth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    
    // Add waived payment to history
    subscription.billingHistory.push({
      date: new Date(),
      amount: subscription.amount,
      status: 'waived',
      notes: reason || 'Waived by admin'
    });
    
    // Update next billing date
    subscription.nextBillingDate = subscription.calculateNextBillingDate();
    subscription.currentPeriodStart = subscription.currentPeriodEnd;
    subscription.currentPeriodEnd = subscription.nextBillingDate;
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription fee waived',
      subscription
    });
  } catch (error) {
    console.error('Error waiving fee:', error);
    res.status(500).json({ success: false, message: 'Failed to waive fee' });
  }
});

module.exports = router;



