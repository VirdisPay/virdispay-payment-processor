const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const apiKeyService = require('../services/apiKeyService');

/**
 * @route   GET /api/api-keys
 * @desc    Get merchant's API keys and settings
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const stats = await apiKeyService.getApiKeyStats(req.user.userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
});

/**
 * @route   POST /api/api-keys/generate
 * @desc    Generate new API keys for merchant
 * @access  Private
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const keys = await apiKeyService.generateApiKeys(req.user.userId);
    
    res.json({
      success: true,
      message: 'API keys generated successfully',
      data: {
        publicKey: keys.publicKey,
        secretKey: keys.secretKey,
        createdAt: keys.createdAt
      }
    });
  } catch (error) {
    console.error('Error generating API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API keys'
    });
  }
});

/**
 * @route   POST /api/api-keys/regenerate
 * @desc    Regenerate API keys (in case of compromise)
 * @access  Private
 */
router.post('/regenerate', auth, async (req, res) => {
  try {
    const keys = await apiKeyService.regenerateApiKeys(req.user.userId);
    
    res.json({
      success: true,
      message: 'API keys regenerated successfully. Please update your integrations with the new keys.',
      data: {
        publicKey: keys.publicKey,
        secretKey: keys.secretKey,
        createdAt: keys.createdAt
      }
    });
  } catch (error) {
    console.error('Error regenerating API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate API keys'
    });
  }
});

/**
 * @route   POST /api/api-keys/domains
 * @desc    Add a domain to whitelist
 * @access  Private
 */
router.post('/domains', auth, async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    const user = await apiKeyService.addAllowedDomain(req.user.userId, domain);
    
    res.json({
      success: true,
      message: 'Domain added to whitelist',
      data: {
        allowedDomains: user.allowedDomains
      }
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add domain'
    });
  }
});

/**
 * @route   DELETE /api/api-keys/domains/:domain
 * @desc    Remove a domain from whitelist
 * @access  Private
 */
router.delete('/domains/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const user = await apiKeyService.removeAllowedDomain(req.user.userId, domain);
    
    res.json({
      success: true,
      message: 'Domain removed from whitelist',
      data: {
        allowedDomains: user.allowedDomains
      }
    });
  } catch (error) {
    console.error('Error removing domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove domain'
    });
  }
});

/**
 * @route   GET /api/api-keys/domains
 * @desc    Get all whitelisted domains
 * @access  Private
 */
router.get('/domains', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        allowedDomains: user.allowedDomains || []
      }
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domains'
    });
  }
});

/**
 * @route   POST /api/api-keys/validate
 * @desc    Validate an API key (for testing)
 * @access  Public
 */
router.post('/validate', async (req, res) => {
  try {
    const { apiKey, type = 'public' } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    let user;
    if (type === 'public') {
      user = await apiKeyService.validatePublicKey(apiKey);
    } else if (type === 'secret') {
      user = await apiKeyService.validateSecretKey(apiKey);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid key type. Use "public" or "secret"'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    res.json({
      success: true,
      message: 'API key is valid',
      data: {
        merchantId: user._id,
        businessName: user.businessName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate API key'
    });
  }
});

module.exports = router;



