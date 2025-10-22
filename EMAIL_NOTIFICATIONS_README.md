# 📧 VirdisPay Email Notification System

## Overview

The VirdisPay email notification system provides professional, automated email communications for merchants and customers throughout the payment process. Built with Node.js, Nodemailer, and Handlebars templates, it ensures reliable delivery of important notifications.

## ✨ Features

### 🎯 **Email Types**
- **Payment Confirmations** - Notify merchants when payments are received
- **Payment Receipts** - Send customers detailed transaction receipts
- **KYC Status Updates** - Track verification progress
- **Compliance Alerts** - Important regulatory notifications
- **Welcome Emails** - Onboard new merchants
- **Security Alerts** - Unusual activity notifications
- **System Maintenance** - Service updates

### 🛡️ **Professional Templates**
- **Responsive Design** - Works on all devices
- **Brand Consistency** - VirdisPay styling and branding
- **Rich Content** - Transaction details, blockchain links, compliance info
- **Print-Friendly** - Receipts can be printed for records

### ⚙️ **Smart Features**
- **Email Preferences** - Users control what they receive
- **Unsubscribe System** - One-click unsubscribe with tokens
- **Quiet Hours** - Respect user timezone preferences
- **Delivery Tracking** - Monitor email delivery statistics
- **Rate Limiting** - Prevent email spam
- **Error Handling** - Graceful failure recovery

## 🚀 Quick Start

### 1. **Environment Setup**

Add these variables to your `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@virdispay.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@virdispay.com

# Site Configuration
SITE_URL=https://virdispay.com
SUPPORT_EMAIL=support@virdispay.com
```

### 2. **Install Dependencies**

```bash
npm install nodemailer handlebars
```

### 3. **Test Email Configuration**

```bash
# Test email setup
curl -X POST http://localhost:5000/api/auth/test-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📋 API Endpoints

### **Email Preferences Management**

#### Get Email Preferences
```http
GET /api/email-preferences
Authorization: Bearer {token}
```

#### Update Email Preferences
```http
PUT /api/email-preferences
Authorization: Bearer {token}
Content-Type: application/json

{
  "notifications": {
    "paymentConfirmations": true,
    "kycStatusUpdates": true,
    "complianceAlerts": true
  },
  "frequency": "immediate",
  "format": "html",
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00",
    "timezone": "UTC"
  }
}
```

#### Unsubscribe (Token-based)
```http
POST /api/email-preferences/unsubscribe/{token}
Content-Type: application/json

{
  "notificationType": "paymentConfirmations" // Optional: specific type
}
```

### **KYC Status Updates**

#### Update KYC Status & Send Email
```http
POST /api/auth/kyc-status-update
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "riskLevel": "low",
  "progress": 100,
  "documentsRequired": 3,
  "documentsSubmitted": 3,
  "documentsVerified": 3,
  "complianceNotes": "All documents verified successfully"
}
```

#### Send Compliance Alert
```http
POST /api/auth/send-compliance-alert
Authorization: Bearer {token}
Content-Type: application/json

{
  "alertType": "Document Expiry Warning",
  "severity": "medium",
  "description": "Your business license expires in 30 days",
  "actionRequired": "Please upload updated license documents",
  "deadline": "2024-01-15",
  "contactInfo": "Contact compliance team at compliance@virdispay.com"
}
```

## 📧 Email Templates

### **Template Structure**
```
server/templates/email/
├── welcome.hbs                    # Welcome email for new merchants
├── payment-confirmation.hbs       # Payment received confirmation
├── payment-received.hbs          # Customer payment notification
├── kyc-status-update.hbs         # KYC verification updates
├── compliance-alert.hbs          # Compliance notifications
└── transaction-receipt.hbs       # Detailed transaction receipt
```

### **Template Variables**

Each template receives these standard variables:
```javascript
{
  // User Data
  merchantName: "Cannabis Co.",
  customerName: "John Doe",
  
  // Transaction Data
  amount: 150.00,
  currency: "USD",
  transactionId: "voodoo_1234567890_abc123",
  txHash: "0x1234...",
  network: "Polygon",
  gasFee: "0.01",
  
  // System Data
  siteUrl: "https://virdispay.com",
  supportEmail: "support@virdispay.com",
  currentYear: 2024,
  timestamp: "2024-01-01 12:00:00"
}
```

## 🔧 Configuration

### **Email Service Configuration**

```javascript
// server/config/email.js
module.exports = {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'noreply@virdispay.com',
      pass: 'your-app-password'
    }
  },
  
  from: {
    name: 'VirdisPay',
    address: 'noreply@virdispay.com'
  },
  
  site: {
    url: 'https://virdispay.com',
    supportEmail: 'support@virdispay.com'
  }
};
```

### **Email Preferences Model**

```javascript
// Default notification preferences
{
  notifications: {
    paymentConfirmations: true,
    paymentReceived: true,
    transactionReceipts: true,
    kycStatusUpdates: true,
    kycRequired: true,
    complianceAlerts: true,
    welcomeEmails: true,
    passwordReset: true,
    accountVerification: true,
    systemMaintenance: true,
    securityAlerts: true,
    marketingEmails: false,
    productUpdates: true,
    industryNews: false
  },
  
  frequency: 'immediate', // immediate, daily, weekly, never
  format: 'html',        // html, text, both
  language: 'en',
  timezone: 'UTC'
}
```

## 🎨 Customization

### **Adding New Email Templates**

1. **Create Template File**
```bash
# Create new template
touch server/templates/email/new-notification.hbs
```

2. **Add Template Content**
```html
<!DOCTYPE html>
<html>
<head>
    <title>{{subject}}</title>
    <style>/* Your styles */</style>
</head>
<body>
    <div class="container">
        <h1>{{title}}</h1>
        <p>{{message}}</p>
    </div>
</body>
</html>
```

3. **Add to Email Service**
```javascript
// server/services/emailService.js
async sendNewNotification(recipientEmail, data) {
  return await this.sendEmail('new-notification', recipientEmail, data);
}
```

### **Customizing Email Styling**

All templates use consistent CSS classes:
- `.container` - Main email container
- `.header` - Email header section
- `.logo` - VirdisPay logo styling
- `.content` - Main content area
- `.footer` - Email footer

## 📊 Monitoring & Analytics

### **Email Delivery Statistics**

```javascript
// Get email stats for admin
GET /api/email-preferences/stats
Authorization: Bearer {admin_token}

// Response
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "totalEmailsSent": 2847,
    "avgEmailsPerUser": 18.98
  },
  "notificationStats": [
    {
      "_id": "paymentConfirmations",
      "enabled": 145,
      "disabled": 5
    }
  ]
}
```

### **Delivery Tracking**

The system tracks:
- Total emails sent per user
- Last delivery status
- Delivery timestamps
- Unsubscribe rates
- Email preferences distribution

## 🛡️ Security & Compliance

### **Unsubscribe System**
- **Unique Tokens** - Each user gets a unique unsubscribe token
- **One-Click Unsubscribe** - Simple web interface
- **Granular Control** - Unsubscribe from specific notification types
- **Resubscribe Option** - Easy to re-enable notifications

### **Email Security**
- **Rate Limiting** - Prevents email spam
- **Input Validation** - Sanitizes all email content
- **Token Security** - Cryptographically secure unsubscribe tokens
- **GDPR Compliance** - Easy unsubscribe and data deletion

### **Privacy Features**
- **No Email Tracking** - No pixel tracking or read receipts
- **Minimal Data Collection** - Only necessary email preferences
- **Secure Storage** - Encrypted preference storage
- **Audit Trail** - Logs all email activities

## 🔧 Troubleshooting

### **Common Issues**

#### **SMTP Connection Failed**
```bash
# Check SMTP credentials
curl -X POST http://localhost:5000/api/auth/test-email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Template Not Found**
```bash
# Verify template files exist
ls -la server/templates/email/
```

#### **Email Not Sending**
1. Check SMTP configuration
2. Verify email preferences
3. Check quiet hours settings
4. Review server logs

### **Debug Mode**

Enable debug logging:
```javascript
// In emailService.js
this.transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Debug:', error);
  } else {
    console.log('SMTP Ready:', success);
  }
});
```

## 🚀 Production Deployment

### **Recommended SMTP Providers**

1. **SendGrid** (Recommended)
   - High deliverability
   - Analytics dashboard
   - Template editor

2. **Amazon SES**
   - Cost-effective
   - AWS integration
   - High volume support

3. **Mailgun**
   - Developer-friendly
   - API-first approach
   - Good documentation

### **Production Configuration**

```bash
# Production .env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@virdispay.com

SITE_URL=https://virdispay.com
SUPPORT_EMAIL=support@virdispay.com
```

### **Monitoring Setup**

1. **Email Delivery Monitoring**
   - Set up webhook endpoints for delivery events
   - Monitor bounce and complaint rates
   - Track open and click rates

2. **Performance Monitoring**
   - Monitor email queue processing times
   - Track template rendering performance
   - Alert on failed email deliveries

## 📈 Best Practices

### **Email Content**
- **Clear Subject Lines** - Descriptive and action-oriented
- **Mobile Responsive** - Test on all devices
- **Accessible Design** - Screen reader friendly
- **Brand Consistency** - Use VirdisPay colors and fonts

### **Delivery Optimization**
- **Warm Up IPs** - Gradually increase sending volume
- **List Hygiene** - Remove bounced emails
- **Segmentation** - Send relevant content to each user
- **A/B Testing** - Test subject lines and content

### **Compliance**
- **CAN-SPAM Compliance** - Include unsubscribe links
- **GDPR Compliance** - Respect user preferences
- **Industry Standards** - Follow email marketing best practices

## 🎯 Future Enhancements

### **Planned Features**
- **Email Templates Editor** - Admin interface for template editing
- **A/B Testing** - Test different email versions
- **Advanced Analytics** - Detailed email performance metrics
- **Automated Workflows** - Trigger emails based on user actions
- **Multi-language Support** - Localized email templates
- **Email Scheduling** - Send emails at optimal times

### **Integration Opportunities**
- **CRM Integration** - Sync with customer databases
- **Marketing Automation** - Advanced email campaigns
- **Analytics Integration** - Track email impact on conversions
- **Support Integration** - Automated support ticket creation

---

## 📞 Support

For questions about the email notification system:

- **Technical Issues**: Check server logs and SMTP configuration
- **Template Customization**: Review Handlebars documentation
- **Delivery Problems**: Contact your SMTP provider
- **Feature Requests**: Submit via GitHub issues

**VirdisPay Email System** - Professional crypto payment notifications for the cannabis industry 🌿



