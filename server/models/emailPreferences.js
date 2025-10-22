/**
 * Email Preferences Model
 * Stores user email notification preferences
 */

const mongoose = require('mongoose');

const emailPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Email notification preferences
  notifications: {
    // Payment notifications
    paymentConfirmations: {
      type: Boolean,
      default: true
    },
    paymentReceived: {
      type: Boolean,
      default: true
    },
    transactionReceipts: {
      type: Boolean,
      default: true
    },

    // KYC/Compliance notifications
    kycStatusUpdates: {
      type: Boolean,
      default: true
    },
    kycRequired: {
      type: Boolean,
      default: true
    },
    complianceAlerts: {
      type: Boolean,
      default: true
    },

    // Account notifications
    welcomeEmails: {
      type: Boolean,
      default: true
    },
    passwordReset: {
      type: Boolean,
      default: true
    },
    accountVerification: {
      type: Boolean,
      default: true
    },

    // System notifications
    systemMaintenance: {
      type: Boolean,
      default: true
    },
    securityAlerts: {
      type: Boolean,
      default: true
    },

    // Marketing emails (if applicable)
    marketingEmails: {
      type: Boolean,
      default: false
    },
    productUpdates: {
      type: Boolean,
      default: true
    },
    industryNews: {
      type: Boolean,
      default: false
    }
  },

  // Email frequency preferences
  frequency: {
    type: String,
    enum: ['immediate', 'daily', 'weekly', 'never'],
    default: 'immediate'
  },

  // Unsubscribe token for email links
  unsubscribeToken: {
    type: String,
    required: true,
    unique: true
  },

  // Email format preferences
  format: {
    type: String,
    enum: ['html', 'text', 'both'],
    default: 'html'
  },

  // Language preference
  language: {
    type: String,
    default: 'en'
  },

  // Timezone for email scheduling
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Quiet hours (when not to send emails)
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00' // 10 PM
    },
    end: {
      type: String,
      default: '08:00' // 8 AM
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },

  // Last email sent timestamp
  lastEmailSent: {
    type: Date
  },

  // Email delivery statistics
  stats: {
    totalEmailsSent: {
      type: Number,
      default: 0
    },
    lastDeliveryStatus: {
      type: String,
      enum: ['delivered', 'bounced', 'failed', 'pending']
    },
    lastDeliveryTimestamp: {
      type: Date
    }
  },

  // Compliance and audit fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
emailPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate unsubscribe token
emailPreferencesSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

// Index for efficient queries
emailPreferencesSchema.index({ userId: 1 });
emailPreferencesSchema.index({ unsubscribeToken: 1 });

// Static methods
emailPreferencesSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

emailPreferencesSchema.statics.findByUnsubscribeToken = function(token) {
  return this.findOne({ unsubscribeToken: token });
};

emailPreferencesSchema.statics.getUsersForNotification = function(notificationType) {
  const query = {};
  query[`notifications.${notificationType}`] = true;
  
  return this.find(query).populate('userId', 'email businessName firstName lastName');
};

// Instance methods
emailPreferencesSchema.methods.canReceiveNotification = function(notificationType) {
  return this.notifications[notificationType] === true;
};

emailPreferencesSchema.methods.updateDeliveryStats = function(status) {
  this.stats.totalEmailsSent += 1;
  this.stats.lastDeliveryStatus = status;
  this.stats.lastDeliveryTimestamp = new Date();
  this.lastEmailSent = new Date();
};

emailPreferencesSchema.methods.isQuietHours = function() {
  if (!this.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const timezone = this.quietHours.timezone || 'UTC';
  
  // Convert current time to user's timezone
  const userTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // Parse quiet hours
  const [startHour, startMinute] = this.quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = this.quietHours.end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
};

emailPreferencesSchema.methods.getUnsubscribeUrl = function() {
  const baseUrl = process.env.SITE_URL || 'https://virdispay.com';
  return `${baseUrl}/unsubscribe/${this.unsubscribeToken}`;
};

module.exports = mongoose.model('EmailPreferences', emailPreferencesSchema);



