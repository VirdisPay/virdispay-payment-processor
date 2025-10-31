const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * @route GET /api/profile
 * @desc Get user profile
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * @route PUT /api/profile
 * @desc Update user profile
 */
router.put('/', auth, async (req, res) => {
  try {
    const {
      subscriptionTier,
      walletAddress,
      walletMethod,
      hasCompletedOnboarding
    } = req.body;

    const updateData = {};
    
    if (subscriptionTier) {
      updateData.subscriptionTier = subscriptionTier;
    }
    
    if (walletAddress) {
      updateData.walletAddress = walletAddress;
    }
    
    if (walletMethod) {
      updateData.walletMethod = walletMethod;
    }
    
    if (hasCompletedOnboarding !== undefined) {
      updateData.hasCompletedOnboarding = hasCompletedOnboarding;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;

