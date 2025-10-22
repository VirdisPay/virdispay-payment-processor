/**
 * Security Routes
 * Handles 2FA, IP whitelisting, device management, and security features
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const SecurityService = require('../services/securityService');
const User = require('../models/User');
const router = express.Router();

const securityService = new SecurityService();

/**
 * @route POST /api/security/2fa/setup
 * @desc Setup 2FA for user
 */
router.post('/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 2FA secret
    const { secret, qrCodeUrl } = securityService.generate2FASecret(user.email);
    
    // Generate QR code
    const qrCode = await securityService.generateQRCode(qrCodeUrl);

    // Store secret temporarily (not activated yet)
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({
      success: true,
      secret,
      qrCode,
      message: '2FA setup initiated. Verify with a token to activate.'
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * @route POST /api/security/2fa/verify
 * @desc Verify 2FA token and activate 2FA
 */
router.post('/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not setup' });
    }

    // Verify token
    const isValid = securityService.verify2FA(token, user.twoFactorSecret);

    if (!isValid) {
      securityService.trackFailedAttempt(userId, '2fa');
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    // Activate 2FA
    user.twoFactorEnabled = true;
    await user.save();

    securityService.resetFailedAttempts(userId, '2fa');

    res.json({
      success: true,
      message: '2FA activated successfully'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * @route POST /api/security/2fa/disable
 * @desc Disable 2FA for user
 */
router.post('/2fa/disable', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Verify token before disabling
    const isValid = securityService.verify2FA(token, user.twoFactorSecret);

    if (!isValid) {
      securityService.trackFailedAttempt(userId, '2fa');
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    securityService.resetFailedAttempts(userId, '2fa');

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * @route POST /api/security/2fa/validate
 * @desc Validate 2FA token for login
 */
router.post('/2fa/validate', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Check if account is locked
    if (securityService.isAccountLocked(userId, '2fa')) {
      return res.status(423).json({ error: 'Account temporarily locked due to too many failed attempts' });
    }

    // Verify token
    const isValid = securityService.verify2FA(token, user.twoFactorSecret);

    if (!isValid) {
      securityService.trackFailedAttempt(userId, '2fa');
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    securityService.resetFailedAttempts(userId, '2fa');

    res.json({
      success: true,
      message: '2FA token validated successfully'
    });

  } catch (error) {
    console.error('2FA validation error:', error);
    res.status(500).json({ error: 'Failed to validate 2FA token' });
  }
});

/**
 * @route GET /api/security/2fa/status
 * @desc Get 2FA status for user
 */
router.get('/2fa/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled || false,
      setupRequired: !user.twoFactorSecret && !user.twoFactorEnabled
    });

  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * @route POST /api/security/ip-whitelist
 * @desc Add IP to whitelist
 */
router.post('/ip-whitelist', authMiddleware, async (req, res) => {
  try {
    const { ipAddress, label } = req.body;
    const userId = req.user.id;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    securityService.addIPToWhitelist(userId, ipAddress, label);

    res.json({
      success: true,
      message: 'IP address added to whitelist'
    });

  } catch (error) {
    console.error('IP whitelist error:', error);
    res.status(500).json({ error: 'Failed to add IP to whitelist' });
  }
});

/**
 * @route GET /api/security/ip-whitelist
 * @desc Get IP whitelist for user
 */
router.get('/ip-whitelist', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const whitelist = securityService.getIPWhitelist(userId);

    res.json({
      success: true,
      whitelist
    });

  } catch (error) {
    console.error('Get IP whitelist error:', error);
    res.status(500).json({ error: 'Failed to get IP whitelist' });
  }
});

/**
 * @route DELETE /api/security/ip-whitelist/:ip
 * @desc Remove IP from whitelist
 */
router.delete('/ip-whitelist/:ip', authMiddleware, async (req, res) => {
  try {
    const { ip } = req.params;
    const userId = req.user.id;

    securityService.removeIPFromWhitelist(userId, ip);

    res.json({
      success: true,
      message: 'IP address removed from whitelist'
    });

  } catch (error) {
    console.error('Remove IP whitelist error:', error);
    res.status(500).json({ error: 'Failed to remove IP from whitelist' });
  }
});

/**
 * @route POST /api/security/devices/register
 * @desc Register a new device
 */
router.post('/devices/register', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      platform: req.body.platform,
      language: req.headers['accept-language'],
      timezone: req.body.timezone,
      screenResolution: req.body.screenResolution,
      ipAddress: req.ip
    };

    const deviceId = securityService.registerDevice(userId, deviceInfo);

    res.json({
      success: true,
      deviceId,
      message: 'Device registered successfully'
    });

  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * @route GET /api/security/devices
 * @desc Get registered devices for user
 */
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = securityService.getDevices(userId);

    res.json({
      success: true,
      devices
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

/**
 * @route POST /api/security/devices/:deviceId/trust
 * @desc Trust a device
 */
router.post('/devices/:deviceId/trust', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    securityService.trustDevice(userId, deviceId);

    res.json({
      success: true,
      message: 'Device trusted successfully'
    });

  } catch (error) {
    console.error('Trust device error:', error);
    res.status(500).json({ error: 'Failed to trust device' });
  }
});

/**
 * @route DELETE /api/security/devices/:deviceId
 * @desc Revoke a device
 */
router.delete('/devices/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    securityService.revokeDevice(userId, deviceId);

    res.json({
      success: true,
      message: 'Device revoked successfully'
    });

  } catch (error) {
    console.error('Revoke device error:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

/**
 * @route POST /api/security/fraud-check
 * @desc Check transaction for fraud
 */
router.post('/fraud-check', authMiddleware, async (req, res) => {
  try {
    const transactionData = req.body;
    const userId = req.user.id;

    const fraudCheck = securityService.detectFraud(transactionData);

    res.json({
      success: true,
      fraudCheck
    });

  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({ error: 'Failed to perform fraud check' });
  }
});

/**
 * @route GET /api/security/stats
 * @desc Get security statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = securityService.getSecurityStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({ error: 'Failed to get security statistics' });
  }
});

/**
 * @route POST /api/security/audit-log
 * @desc Log security event
 */
router.post('/audit-log', authMiddleware, async (req, res) => {
  try {
    const { action, details } = req.body;
    const userId = req.user.id;

    const auditLog = securityService.generateAuditLog(userId, action, {
      ...details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Here you would typically save to a database
    console.log('Security audit log:', auditLog);

    res.json({
      success: true,
      message: 'Audit log created'
    });

  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

module.exports = router;



