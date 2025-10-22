/**
 * Audit Logging Middleware
 * Automatically logs admin actions for compliance
 */

const AuditLog = require('../models/AuditLog');

/**
 * Create audit log entry
 */
const createAuditLog = async (req, action, targetType, targetId, details = {}) => {
  try {
    const logData = {
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: action,
      targetType: targetType,
      targetId: targetId,
      details: details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    };

    // Set severity based on action
    if (['merchant_suspended', 'merchant_deleted', 'kyc_rejected', 'bulk_action'].includes(action)) {
      logData.severity = 'high';
    } else if (['kyc_approved', 'merchant_unsuspended', 'document_verified'].includes(action)) {
      logData.severity = 'medium';
    } else {
      logData.severity = 'low';
    }

    await AuditLog.logAction(logData);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit failure shouldn't break the main action
  }
};

/**
 * Middleware to log admin actions
 */
const auditMiddleware = (action, targetType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only log if action was successful
      if (data.success) {
        const targetId = req.params.id || req.body.merchantId || req.body.userId;
        const details = {
          requestBody: req.body,
          targetEmail: data.merchant?.email || data.user?.email,
          targetName: data.merchant?.businessName || data.user?.businessName
        };
        
        createAuditLog(req, action, targetType, targetId, details);
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = {
  createAuditLog,
  auditMiddleware
};



