/**
 * Audit Log Model
 * Tracks all admin actions for compliance and security
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'kyc_approved',
      'kyc_rejected',
      'kyc_info_requested',
      'merchant_suspended',
      'merchant_unsuspended',
      'merchant_edited',
      'merchant_deleted',
      'payment_refunded',
      'payment_flagged',
      'settings_changed',
      'admin_login',
      'admin_logout',
      'export_data',
      'other'
    ]
  },
  targetType: {
    type: String,
    enum: ['merchant', 'kyc', 'payment', 'system'],
    required: true
  },
  targetId: {
    type: String
  },
  targetEmail: {
    type: String
  },
  targetName: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ timestamp: -1 });

// Helper method to create audit log
auditLogSchema.statics.logAction = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break main functionality
    return null;
  }
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;



