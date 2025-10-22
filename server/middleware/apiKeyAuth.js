const apiKeyService = require('../services/apiKeyService');

/**
 * API Key Authentication Middleware
 * Validates API keys and domain whitelist for widget requests
 */

/**
 * Validate public API key for client-side widget requests
 */
const validatePublicKey = async (req, res, next) => {
  try {
    // Get public key from header or query
    const publicKey = req.headers['x-api-key'] || 
                      req.query.apiKey || 
                      req.body.apiKey;

    if (!publicKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Validate the public key
    const user = await apiKeyService.validatePublicKey(publicKey);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Attach user to request
    req.merchant = user;
    req.apiKey = publicKey;
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Validate secret API key for server-side API requests
 */
const validateSecretKey = async (req, res, next) => {
  try {
    // Get secret key from header
    const secretKey = req.headers['x-secret-key'] || 
                      req.headers['authorization']?.replace('Bearer ', '');

    if (!secretKey) {
      return res.status(401).json({
        success: false,
        error: 'Secret key required'
      });
    }

    // Validate the secret key
    const user = await apiKeyService.validateSecretKey(secretKey);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid secret key'
      });
    }

    // Attach user to request
    req.merchant = user;
    req.secretKey = secretKey;
    
    next();
  } catch (error) {
    console.error('Secret key validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Validate domain whitelist for widget requests
 */
const validateDomain = async (req, res, next) => {
  try {
    // Get origin from request
    const origin = req.headers.origin || 
                   req.headers.referer || 
                   req.get('origin') || 
                   req.get('referer');

    // Check if merchant is already attached (from API key validation)
    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        error: 'Merchant authentication required'
      });
    }

    // Validate domain
    const isValid = await apiKeyService.validateDomain(req.merchant._id, origin);
    
    if (!isValid) {
      console.warn(`Domain validation failed for merchant ${req.merchant._id}: ${origin}`);
      return res.status(403).json({
        success: false,
        error: 'Domain not whitelisted. Please add this domain in your dashboard settings.'
      });
    }

    // Attach validated origin to request
    req.validatedOrigin = origin;
    
    next();
  } catch (error) {
    console.error('Domain validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Combined middleware: Validate API key AND domain
 */
const validateApiKeyAndDomain = [validatePublicKey, validateDomain];

/**
 * Optional API key validation (doesn't fail if missing)
 */
const optionalApiKey = async (req, res, next) => {
  try {
    const publicKey = req.headers['x-api-key'] || 
                      req.query.apiKey || 
                      req.body.apiKey;

    if (publicKey) {
      const user = await apiKeyService.validatePublicKey(publicKey);
      if (user) {
        req.merchant = user;
        req.apiKey = publicKey;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue
    next();
  }
};

module.exports = {
  validatePublicKey,
  validateSecretKey,
  validateDomain,
  validateApiKeyAndDomain,
  optionalApiKey
};



