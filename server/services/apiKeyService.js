const crypto = require('crypto');
const User = require('../models/User');

/**
 * API Key Service
 * Handles generation and validation of API keys for widget integration
 */

class ApiKeyService {
  /**
   * Generate a new API key pair for a merchant
   * @param {string} userId - The merchant's user ID
   * @returns {object} - { publicKey, secretKey }
   */
  async generateApiKeys(userId) {
    try {
      // Generate public key (visible to client-side)
      // Format: pk_live_[32 random chars] or pk_test_[32 random chars]
      const publicKey = `pk_live_${crypto.randomBytes(32).toString('hex')}`;
      
      // Generate secret key (server-side only)
      // Format: sk_live_[32 random chars] or sk_test_[32 random chars]
      const secretKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;

      // Update user with new API keys
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'apiKeys.publicKey': publicKey,
          'apiKeys.secretKey': secretKey,
          'apiKeys.createdAt': new Date()
        },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return {
        publicKey,
        secretKey,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error generating API keys:', error);
      throw error;
    }
  }

  /**
   * Regenerate API keys (in case of compromise)
   * @param {string} userId - The merchant's user ID
   * @returns {object} - { publicKey, secretKey }
   */
  async regenerateApiKeys(userId) {
    return this.generateApiKeys(userId);
  }

  /**
   * Validate a public API key
   * @param {string} publicKey - The public key to validate
   * @returns {object|null} - User object if valid, null otherwise
   */
  async validatePublicKey(publicKey) {
    try {
      if (!publicKey || !publicKey.startsWith('pk_')) {
        return null;
      }

      const user = await User.findOne({ 'apiKeys.publicKey': publicKey });
      
      if (user) {
        // Update last used timestamp
        user.apiKeys.lastUsed = new Date();
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('Error validating public key:', error);
      return null;
    }
  }

  /**
   * Validate a secret API key
   * @param {string} secretKey - The secret key to validate
   * @returns {object|null} - User object if valid, null otherwise
   */
  async validateSecretKey(secretKey) {
    try {
      if (!secretKey || !secretKey.startsWith('sk_')) {
        return null;
      }

      const user = await User.findOne({ 'apiKeys.secretKey': secretKey });
      
      if (user) {
        // Update last used timestamp
        user.apiKeys.lastUsed = new Date();
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('Error validating secret key:', error);
      return null;
    }
  }

  /**
   * Add a domain to the whitelist
   * @param {string} userId - The merchant's user ID
   * @param {string} domain - The domain to whitelist
   * @returns {object} - Updated user
   */
  async addAllowedDomain(userId, domain) {
    try {
      // Clean and normalize domain
      const cleanDomain = this.normalizeDomain(domain);

      // Check if domain already exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const exists = user.allowedDomains.some(d => d.domain === cleanDomain);
      if (exists) {
        throw new Error('Domain already exists in whitelist');
      }

      // Add domain to whitelist
      user.allowedDomains.push({
        domain: cleanDomain,
        addedAt: new Date(),
        verified: false
      });

      await user.save();
      return user;
    } catch (error) {
      console.error('Error adding domain:', error);
      throw error;
    }
  }

  /**
   * Remove a domain from the whitelist
   * @param {string} userId - The merchant's user ID
   * @param {string} domain - The domain to remove
   * @returns {object} - Updated user
   */
  async removeAllowedDomain(userId, domain) {
    try {
      const cleanDomain = this.normalizeDomain(domain);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $pull: {
            allowedDomains: { domain: cleanDomain }
          }
        },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error removing domain:', error);
      throw error;
    }
  }

  /**
   * Validate if a domain is whitelisted for a user
   * @param {string} userId - The merchant's user ID
   * @param {string} origin - The request origin to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  async validateDomain(userId, origin) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // Allow localhost for development
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return true;
      }

      // Extract domain from origin
      const domain = this.extractDomain(origin);
      if (!domain) {
        return false;
      }

      // Check if domain is in whitelist
      return user.allowedDomains.some(d => {
        // Exact match or subdomain match
        return d.domain === domain || domain.endsWith(`.${d.domain}`);
      });
    } catch (error) {
      console.error('Error validating domain:', error);
      return false;
    }
  }

  /**
   * Normalize a domain (remove protocol, www, trailing slashes)
   * @param {string} domain - The domain to normalize
   * @returns {string} - Normalized domain
   */
  normalizeDomain(domain) {
    if (!domain) return '';
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove www
    domain = domain.replace(/^www\./, '');
    
    // Remove trailing slash and path
    domain = domain.split('/')[0];
    
    // Remove port
    domain = domain.split(':')[0];
    
    // Lowercase
    domain = domain.toLowerCase().trim();
    
    return domain;
  }

  /**
   * Extract domain from origin URL
   * @param {string} origin - The origin URL
   * @returns {string|null} - Extracted domain or null
   */
  extractDomain(origin) {
    try {
      if (!origin) return null;
      
      const url = new URL(origin);
      return this.normalizeDomain(url.hostname);
    } catch (error) {
      // If URL parsing fails, try to normalize as-is
      return this.normalizeDomain(origin);
    }
  }

  /**
   * Get API key statistics for a user
   * @param {string} userId - The merchant's user ID
   * @returns {object} - API key stats
   */
  async getApiKeyStats(userId) {
    try {
      const user = await User.findById(userId).select('+apiKeys.secretKey');
      if (!user) {
        throw new Error('User not found');
      }

      return {
        hasKeys: !!(user.apiKeys?.publicKey && user.apiKeys?.secretKey),
        publicKey: user.apiKeys?.publicKey || null,
        createdAt: user.apiKeys?.createdAt || null,
        lastUsed: user.apiKeys?.lastUsed || null,
        allowedDomains: user.allowedDomains || []
      };
    } catch (error) {
      console.error('Error getting API key stats:', error);
      throw error;
    }
  }
}

module.exports = new ApiKeyService();



