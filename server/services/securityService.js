/**
 * Security Service
 * Handles security features like 2FA, IP whitelisting, and fraud detection
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const EventEmitter = require('events');

class SecurityService extends EventEmitter {
  constructor() {
    super();
    this.failedAttempts = new Map(); // Track failed login attempts
    this.suspiciousActivity = new Map(); // Track suspicious activity
    this.ipWhitelist = new Map(); // IP whitelist per user
    this.deviceRegistry = new Map(); // Registered devices per user
    
    // Security thresholds
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.suspiciousThreshold = 3;
  }

  /**
   * Generate 2FA secret for user
   */
  generate2FASecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `VirdisPay (${userEmail})`,
      issuer: 'VirdisPay',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      console.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify 2FA token
   */
  verify2FA(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) of variance
    });
  }

  /**
   * Track failed login attempt
   */
  trackFailedAttempt(identifier, type = 'login') {
    const key = `${type}_${identifier}`;
    const now = Date.now();
    
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, {
        count: 0,
        lastAttempt: now,
        lockedUntil: null
      });
    }

    const attempt = this.failedAttempts.get(key);
    attempt.count += 1;
    attempt.lastAttempt = now;

    // Check if should be locked out
    if (attempt.count >= this.maxFailedAttempts) {
      attempt.lockedUntil = now + this.lockoutDuration;
      this.emit('account_locked', { identifier, type, lockedUntil: attempt.lockedUntil });
    }

    // Check for suspicious activity
    if (attempt.count >= this.suspiciousThreshold) {
      this.trackSuspiciousActivity(identifier, type, {
        failedAttempts: attempt.count,
        timeWindow: now - attempt.lastAttempt
      });
    }
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(identifier, type = 'login') {
    const key = `${type}_${identifier}`;
    const attempt = this.failedAttempts.get(key);
    
    if (!attempt || !attempt.lockedUntil) {
      return false;
    }

    if (Date.now() > attempt.lockedUntil) {
      // Lockout expired, reset
      attempt.lockedUntil = null;
      attempt.count = 0;
      return false;
    }

    return true;
  }

  /**
   * Reset failed attempts (on successful login)
   */
  resetFailedAttempts(identifier, type = 'login') {
    const key = `${type}_${identifier}`;
    this.failedAttempts.delete(key);
  }

  /**
   * Track suspicious activity
   */
  trackSuspiciousActivity(identifier, type, details) {
    const key = `${type}_${identifier}`;
    const now = Date.now();
    
    if (!this.suspiciousActivity.has(key)) {
      this.suspiciousActivity.set(key, {
        count: 0,
        lastActivity: now,
        activities: []
      });
    }

    const activity = this.suspiciousActivity.get(key);
    activity.count += 1;
    activity.lastActivity = now;
    activity.activities.push({
      timestamp: now,
      details,
      severity: this.calculateSeverity(details)
    });

    // Keep only last 10 activities
    if (activity.activities.length > 10) {
      activity.activities = activity.activities.slice(-10);
    }

    // Emit security alert if threshold exceeded
    if (activity.count >= this.suspiciousThreshold) {
      this.emit('suspicious_activity', {
        identifier,
        type,
        activity: activity.activities[activity.activities.length - 1]
      });
    }
  }

  /**
   * Calculate activity severity
   */
  calculateSeverity(details) {
    let severity = 'low';
    
    if (details.failedAttempts >= 10) {
      severity = 'high';
    } else if (details.failedAttempts >= 5) {
      severity = 'medium';
    }

    return severity;
  }

  /**
   * IP Whitelist Management
   */
  addIPToWhitelist(userId, ipAddress, label = '') {
    if (!this.ipWhitelist.has(userId)) {
      this.ipWhitelist.set(userId, new Set());
    }
    
    this.ipWhitelist.get(userId).add({
      ip: ipAddress,
      label,
      addedAt: Date.now()
    });

    this.emit('ip_whitelisted', { userId, ipAddress, label });
  }

  removeIPFromWhitelist(userId, ipAddress) {
    if (this.ipWhitelist.has(userId)) {
      const whitelist = this.ipWhitelist.get(userId);
      for (const entry of whitelist) {
        if (entry.ip === ipAddress) {
          whitelist.delete(entry);
          this.emit('ip_removed', { userId, ipAddress });
          break;
        }
      }
    }
  }

  isIPWhitelisted(userId, ipAddress) {
    if (!this.ipWhitelist.has(userId)) {
      return true; // No whitelist means all IPs allowed
    }

    const whitelist = this.ipWhitelist.get(userId);
    for (const entry of whitelist) {
      if (entry.ip === ipAddress) {
        return true;
      }
    }

    return false;
  }

  getIPWhitelist(userId) {
    return Array.from(this.ipWhitelist.get(userId) || []);
  }

  /**
   * Device Management
   */
  registerDevice(userId, deviceInfo) {
    const deviceId = this.generateDeviceId(deviceInfo);
    
    if (!this.deviceRegistry.has(userId)) {
      this.deviceRegistry.set(userId, new Map());
    }

    const device = {
      id: deviceId,
      ...deviceInfo,
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      trusted: false
    };

    this.deviceRegistry.get(userId).set(deviceId, device);
    
    this.emit('device_registered', { userId, device });
    return deviceId;
  }

  updateDeviceActivity(userId, deviceId, activity) {
    if (this.deviceRegistry.has(userId)) {
      const devices = this.deviceRegistry.get(userId);
      const device = devices.get(deviceId);
      
      if (device) {
        device.lastSeen = Date.now();
        device.lastActivity = activity;
        devices.set(deviceId, device);
      }
    }
  }

  trustDevice(userId, deviceId) {
    if (this.deviceRegistry.has(userId)) {
      const devices = this.deviceRegistry.get(userId);
      const device = devices.get(deviceId);
      
      if (device) {
        device.trusted = true;
        device.trustedAt = Date.now();
        devices.set(deviceId, device);
        
        this.emit('device_trusted', { userId, deviceId });
      }
    }
  }

  revokeDevice(userId, deviceId) {
    if (this.deviceRegistry.has(userId)) {
      const devices = this.deviceRegistry.get(userId);
      if (devices.has(deviceId)) {
        devices.delete(deviceId);
        this.emit('device_revoked', { userId, deviceId });
      }
    }
  }

  getDevices(userId) {
    if (!this.deviceRegistry.has(userId)) {
      return [];
    }

    return Array.from(this.deviceRegistry.get(userId).values());
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceId(deviceInfo) {
    const fingerprint = [
      deviceInfo.userAgent,
      deviceInfo.platform,
      deviceInfo.language,
      deviceInfo.timezone,
      deviceInfo.screenResolution
    ].join('|');

    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
  }

  /**
   * Fraud Detection
   */
  detectFraud(transactionData) {
    const riskFactors = [];
    let riskScore = 0;

    // Check for unusual transaction amounts
    if (transactionData.amount > 10000) {
      riskFactors.push('high_amount');
      riskScore += 30;
    }

    // Check for rapid transactions
    if (transactionData.rapidTransactions > 5) {
      riskFactors.push('rapid_transactions');
      riskScore += 25;
    }

    // Check for unusual locations
    if (transactionData.locationRisk === 'high') {
      riskFactors.push('unusual_location');
      riskScore += 20;
    }

    // Check for new device
    if (transactionData.newDevice) {
      riskFactors.push('new_device');
      riskScore += 15;
    }

    // Check for suspicious IP
    if (transactionData.suspiciousIP) {
      riskFactors.push('suspicious_ip');
      riskScore += 25;
    }

    const riskLevel = this.getRiskLevel(riskScore);

    return {
      riskScore,
      riskLevel,
      riskFactors,
      recommendedAction: this.getRecommendedAction(riskLevel)
    };
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action based on risk level
   */
  getRecommendedAction(riskLevel) {
    switch (riskLevel) {
      case 'high':
        return 'block_transaction';
      case 'medium':
        return 'require_additional_verification';
      default:
        return 'allow_transaction';
    }
  }

  /**
   * Generate security audit log entry
   */
  generateAuditLog(userId, action, details) {
    return {
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      deviceId: details.deviceId
    };
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      totalFailedAttempts: this.failedAttempts.size,
      totalSuspiciousActivities: this.suspiciousActivity.size,
      totalIPWhitelists: this.ipWhitelist.size,
      totalDevices: Array.from(this.deviceRegistry.values())
        .reduce((sum, devices) => sum + devices.size, 0)
    };
  }

  /**
   * Clean up old data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old failed attempts
    for (const [key, attempt] of this.failedAttempts) {
      if (now - attempt.lastAttempt > maxAge) {
        this.failedAttempts.delete(key);
      }
    }

    // Clean up old suspicious activity
    for (const [key, activity] of this.suspiciousActivity) {
      if (now - activity.lastActivity > maxAge) {
        this.suspiciousActivity.delete(key);
      }
    }
  }
}

module.exports = SecurityService;



