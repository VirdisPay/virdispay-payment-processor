/**
 * Email Notification Service
 * Handles all email communications for VirdisPay
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = {};
        this.initializeTransporter();
        this.loadTemplates();
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        // Use environment variables for email configuration
        const smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'noreply@virdispay.com',
                pass: process.env.SMTP_PASS || 'your-app-password'
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        console.log('📧 Initializing email service...');
        console.log('SMTP Host:', smtpConfig.host);
        console.log('SMTP Port:', smtpConfig.port);
        console.log('SMTP Secure:', smtpConfig.secure);
        console.log('SMTP User:', smtpConfig.auth.user);
        console.log('SMTP Pass:', smtpConfig.auth.pass ? `${smtpConfig.auth.pass.substring(0, 5)}...` : 'NOT SET');
        console.log('SMTP From:', process.env.SMTP_FROM || 'NOT SET');

        this.transporter = nodemailer.createTransport(smtpConfig);

        // Verify connection configuration
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email service configuration error:', error.message);
                console.error('Full error:', error);
            } else {
                console.log('✅ Email service ready to send messages');
            }
        });
    }

    /**
     * Load email templates
     */
    async loadTemplates() {
        try {
            const templatesDir = path.join(__dirname, '../templates/email');
            const templateFiles = await fs.readdir(templatesDir);
            
            for (const file of templateFiles) {
                if (file.endsWith('.hbs')) {
                    const templateName = file.replace('.hbs', '');
                    const templatePath = path.join(templatesDir, file);
                    const templateContent = await fs.readFile(templatePath, 'utf8');
                    this.templates[templateName] = handlebars.compile(templateContent);
                }
            }
            
            console.log(`Loaded ${Object.keys(this.templates).length} email templates`);
        } catch (error) {
            console.error('Error loading email templates:', error);
        }
    }

    /**
     * Send email with template
     */
    async sendEmail(templateName, recipientEmail, data, options = {}) {
        try {
            const template = this.templates[templateName];
            if (!template) {
                throw new Error(`Email template '${templateName}' not found`);
            }

            // Prepare email data
            const emailData = {
                ...data,
                siteUrl: process.env.SITE_URL || 'https://virdispay.com',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@virdispay.com',
                currentYear: new Date().getFullYear(),
                timestamp: new Date().toISOString()
            };

            // Render template
            const html = template(emailData);

            // Email options
            const mailOptions = {
                from: {
                    name: 'VirdisPay',
                    address: process.env.SMTP_FROM || 'noreply@virdispay.com'
                },
                to: recipientEmail,
                subject: options.subject || this.getDefaultSubject(templateName, emailData),
                html: html,
                text: this.generateTextVersion(html),
                ...options
            };

            // Send email
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully: ${templateName} to ${recipientEmail}`);
            
            return {
                success: true,
                messageId: result.messageId,
                template: templateName,
                recipient: recipientEmail
            };

        } catch (error) {
            console.error(`Failed to send email ${templateName} to ${recipientEmail}:`, error);
            return {
                success: false,
                error: error.message,
                template: templateName,
                recipient: recipientEmail
            };
        }
    }

    /**
     * Get default subject for template
     */
    getDefaultSubject(templateName, data) {
        const subjects = {
            'payment-confirmation': `Payment Confirmation - $${data.amount} ${data.currency}`,
            'payment-received': `Payment Received - $${data.amount} ${data.currency}`,
            'kyc-status-update': 'KYC Verification Status Update',
            'kyc-required': 'KYC Verification Required',
            'compliance-alert': 'Compliance Alert - Action Required',
            'transaction-receipt': `Transaction Receipt - $${data.amount} ${data.currency}`,
            'welcome': 'Welcome to VirdisPay',
            'password-reset': 'Reset Your VirdisPay Password',
            'account-verification': 'Verify Your VirdisPay Account',
            'system-maintenance': 'Scheduled System Maintenance',
            'security-alert': 'Security Alert - Unusual Activity Detected'
        };

        return subjects[templateName] || 'VirdisPay Notification';
    }

    /**
     * Generate text version from HTML
     */
    generateTextVersion(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/&amp;/g, '&') // Replace HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    /**
     * Send payment confirmation email
     */
    async sendPaymentConfirmation(merchantEmail, paymentData) {
        return await this.sendEmail('payment-confirmation', merchantEmail, {
            merchantName: paymentData.merchantName,
            amount: paymentData.amount,
            currency: paymentData.currency,
            transactionId: paymentData.transactionId,
            customerEmail: paymentData.customerEmail,
            description: paymentData.description,
            network: paymentData.network,
            gasFee: paymentData.gasFee,
            savings: paymentData.savings,
            txHash: paymentData.txHash,
            timestamp: paymentData.timestamp
        });
    }

    /**
     * Send payment received email to customer
     */
    async sendPaymentReceived(customerEmail, paymentData) {
        return await this.sendEmail('payment-received', customerEmail, {
            customerName: paymentData.customerName,
            merchantName: paymentData.merchantName,
            amount: paymentData.amount,
            currency: paymentData.currency,
            transactionId: paymentData.transactionId,
            description: paymentData.description,
            network: paymentData.network,
            gasFee: paymentData.gasFee,
            txHash: paymentData.txHash,
            timestamp: paymentData.timestamp
        });
    }

    /**
     * Send KYC status update email
     */
    async sendKYCStatusUpdate(merchantEmail, kycData) {
        return await this.sendEmail('kyc-status-update', merchantEmail, {
            merchantName: kycData.merchantName,
            status: kycData.status,
            riskLevel: kycData.riskLevel,
            progress: kycData.progress,
            documentsRequired: kycData.documentsRequired,
            documentsSubmitted: kycData.documentsSubmitted,
            documentsVerified: kycData.documentsVerified,
            nextSteps: kycData.nextSteps,
            complianceNotes: kycData.complianceNotes,
            estimatedProcessingTime: kycData.estimatedProcessingTime
        });
    }

    /**
     * Send KYC required notification
     */
    async sendKYCRequired(merchantEmail, kycData) {
        return await this.sendEmail('kyc-required', merchantEmail, {
            merchantName: kycData.merchantName,
            riskLevel: kycData.riskLevel,
            documentsRequired: kycData.documentsRequired,
            requirements: kycData.requirements,
            deadline: kycData.deadline,
            consequences: kycData.consequences
        });
    }

    /**
     * Send compliance alert
     */
    async sendComplianceAlert(merchantEmail, alertData) {
        return await this.sendEmail('compliance-alert', merchantEmail, {
            merchantName: alertData.merchantName,
            alertType: alertData.alertType,
            severity: alertData.severity,
            description: alertData.description,
            actionRequired: alertData.actionRequired,
            deadline: alertData.deadline,
            contactInfo: alertData.contactInfo
        });
    }

    /**
     * Send transaction receipt
     */
    async sendTransactionReceipt(customerEmail, receiptData) {
        return await this.sendEmail('transaction-receipt', customerEmail, {
            customerName: receiptData.customerName,
            merchantName: receiptData.merchantName,
            amount: receiptData.amount,
            currency: receiptData.currency,
            transactionId: receiptData.transactionId,
            description: receiptData.description,
            network: receiptData.network,
            gasFee: receiptData.gasFee,
            txHash: receiptData.txHash,
            timestamp: receiptData.timestamp,
            merchantContact: receiptData.merchantContact
        });
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(merchantEmail, userData) {
        return await this.sendEmail('welcome', merchantEmail, {
            firstName: userData.firstName,
            businessName: userData.businessName,
            loginUrl: `${process.env.SITE_URL || 'https://virdispay.com'}/login`,
            dashboardUrl: `${process.env.SITE_URL || 'https://virdispay.com'}/dashboard`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@virdispay.com',
            kycStatus: userData.kycStatus,
            nextSteps: userData.nextSteps
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(userEmail, resetData) {
        return await this.sendEmail('password-reset', userEmail, {
            firstName: resetData.firstName,
            resetLink: resetData.resetLink,
            expiryTime: resetData.expiryTime,
            ipAddress: resetData.ipAddress,
            userAgent: resetData.userAgent
        });
    }

    /**
     * Send system maintenance notification
     */
    async sendSystemMaintenance(recipientEmails, maintenanceData) {
        const results = [];
        
        for (const email of recipientEmails) {
            const result = await this.sendEmail('system-maintenance', email, {
                scheduledTime: maintenanceData.scheduledTime,
                estimatedDuration: maintenanceData.estimatedDuration,
                affectedServices: maintenanceData.affectedServices,
                alternativeContact: maintenanceData.alternativeContact
            });
            results.push(result);
        }
        
        return results;
    }

    /**
     * Send security alert
     */
    async sendSecurityAlert(merchantEmail, securityData) {
        return await this.sendEmail('security-alert', merchantEmail, {
            merchantName: securityData.merchantName,
            alertType: securityData.alertType,
            timestamp: securityData.timestamp,
            ipAddress: securityData.ipAddress,
            userAgent: securityData.userAgent,
            location: securityData.location,
            actionTaken: securityData.actionTaken,
            recommendedActions: securityData.recommendedActions,
            contactSupport: securityData.contactSupport
        });
    }

    /**
     * Send admin notification for new merchant registration
     */
    async sendAdminNewMerchantNotification(adminEmail, merchantData) {
        return await this.sendEmail('admin-new-merchant', adminEmail, {
            merchantName: merchantData.businessName,
            merchantEmail: merchantData.email,
            businessType: merchantData.businessType,
            country: merchantData.country,
            state: merchantData.state,
            licenseNumber: merchantData.licenseNumber,
            registrationDate: merchantData.registrationDate,
            kycStatus: merchantData.kycStatus,
            riskLevel: merchantData.riskLevel,
            adminDashboardUrl: `${process.env.SITE_URL || 'https://virdispay.com'}/admin`,
            merchantProfileUrl: `${process.env.SITE_URL || 'https://virdispay.com'}/admin/merchants/${merchantData.id}`
        });
    }

    /**
     * Send bulk emails
     */
    async sendBulkEmails(templateName, recipients, data, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 10;
        
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchPromises = batch.map(recipient => 
                this.sendEmail(templateName, recipient.email, {
                    ...data,
                    ...recipient.personalData
                }, options)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    /**
     * Test email configuration
     */
    async testEmailConfiguration(testEmail) {
        try {
            const result = await this.sendEmail('welcome', testEmail, {
                firstName: 'Test',
                businessName: 'Test Business',
                loginUrl: 'https://virdispay.com/login',
                dashboardUrl: 'https://virdispay.com/dashboard',
                supportEmail: 'support@virdispay.com',
                kycStatus: 'pending',
                nextSteps: ['Complete KYC verification', 'Upload documents']
            });

            return {
                success: result.success,
                message: result.success ? 'Email configuration test successful' : 'Email configuration test failed',
                details: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'Email configuration test failed',
                error: error.message
            };
        }
    }
}

module.exports = EmailService;

