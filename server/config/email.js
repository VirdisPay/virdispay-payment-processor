/**
 * Email Configuration
 * Environment variables for email service
 */

module.exports = {
  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'noreply@virdispay.com',
      pass: process.env.SMTP_PASS || 'your-app-password'
    },
    tls: {
      rejectUnauthorized: false
    }
  },

  // Email Settings
  from: {
    name: 'VirdisPay',
    address: process.env.SMTP_FROM || 'noreply@virdispay.com'
  },

  // Site Configuration
  site: {
    url: process.env.SITE_URL || 'https://virdispay.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@virdispay.com'
  },

  // Email Templates Configuration
  templates: {
    directory: './templates/email',
    defaultSubject: 'VirdisPay Notification',
    batchSize: 10,
    rateLimitDelay: 1000 // milliseconds between batches
  },

  // Email Types and Subjects
  subjects: {
    'payment-confirmation': 'Payment Confirmation - ${{amount}} {{currency}}',
    'payment-received': 'Payment Received - ${{amount}} {{currency}}',
    'kyc-status-update': 'KYC Verification Status Update',
    'kyc-required': 'KYC Verification Required',
    'compliance-alert': 'Compliance Alert - Action Required',
    'transaction-receipt': 'Transaction Receipt - ${{amount}} {{currency}}',
    'welcome': 'Welcome to VirdisPay',
    'password-reset': 'Reset Your VirdisPay Password',
    'account-verification': 'Verify Your VirdisPay Account',
    'system-maintenance': 'Scheduled System Maintenance',
    'security-alert': 'Security Alert - Unusual Activity Detected'
  },

  // Email Priority Levels
  priority: {
    'payment-confirmation': 'high',
    'payment-received': 'high',
    'compliance-alert': 'high',
    'security-alert': 'high',
    'kyc-status-update': 'medium',
    'transaction-receipt': 'medium',
    'welcome': 'low',
    'system-maintenance': 'low'
  }
};



