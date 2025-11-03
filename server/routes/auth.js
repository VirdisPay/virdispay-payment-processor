const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const KYCService = require('../services/kycService');
const { MerchantKYCStatus, Document } = require('../models/kyc');
const EmailService = require('../services/emailService');
const { 
  loginRateLimit, 
  registerRateLimit, 
  passwordResetRateLimit, 
  twoFARateLimit 
} = require('../middleware/rateLimiting');
const { validateEmail, validateString } = require('../utils/queryValidation');

const emailService = new EmailService();
const router = express.Router();

const kycService = new KYCService();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name required'),
  body('lastName').notEmpty().withMessage('Last name required'),
  body('businessName').notEmpty().withMessage('Business name required'),
  body('businessType').isIn(['hemp', 'cbd', 'cannabis', 'other']).withMessage('Invalid business type'),
      body('country').optional().isLength({ min: 2, max: 10 }).withMessage('Invalid country code'),
      body('state').optional().isLength({ min: 2, max: 10 }).withMessage('Invalid state code'),
      body('licenseNumber').optional().trim() // Optional - not all countries require licenses
  // walletAddress removed - now optional, set in profile later
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

/**
 * @route POST /api/auth/register
 * @desc Register a new merchant
 */
router.post('/register', registerRateLimit, validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

        const {
          email,
          password,
          firstName,
          lastName,
          businessName,
          businessType,
          country,
          state,
          licenseNumber
        } = req.body;

    // VALIDATION: Cannabis is illegal in UK
    if (country === 'GB' && businessType === 'cannabis') {
      return res.status(400).json({ 
        error: 'Cannabis is illegal in the UK. Please select "Hemp" or "CBD" for UK-based businesses.' 
      });
    }

    // Check if user already exists
    const existingUserQuery = [
      { email }
    ];
    
    // Only check license if provided (since it's optional)
    if (licenseNumber) {
      existingUserQuery.push({ licenseNumber });
    }
    
    const existingUser = await User.findOne({ 
      $or: existingUserQuery
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email, license number, or wallet address already exists' 
      });
    }

        // Create new user (walletAddress removed - optional now)
        const user = new User({
          email,
          password,
          firstName,
          lastName,
          businessName,
          businessType,
          country: country || 'GB', // Default to UK for CBD market
          state: state || undefined,
          licenseNumber: licenseNumber || undefined,
          // walletAddress removed - optional, set in profile later
          isVerified: false,
          kycStatus: 'pending'
        });

    await user.save();

    // Initialize KYC process for new merchant
    let riskAssessment = { level: 'medium', score: 50 }; // Default
    try {
      const merchantData = {
        id: user._id.toString(),
        businessName: user.businessName,
        businessType: user.businessType,
        country: user.country,
        expectedMonthlyVolume: 5000 // Default estimate
      };

      // Calculate initial risk assessment
      try {
        riskAssessment = await kycService.calculateRiskScore(merchantData);
      } catch (riskError) {
        console.error('Risk assessment error:', riskError);
        riskAssessment = { level: 'medium', score: 50 };
      }

      // Get verification requirements based on risk level
      const requirements = kycService.getVerificationRequirements(merchantData, riskAssessment.level);

      // Create KYC status record
      const kycStatus = new MerchantKYCStatus({
        merchantId: user._id.toString(),
        status: 'not_started',
        riskLevel: riskAssessment.level,
        documentsRequired: requirements.documents.length,
        documentsSubmitted: 0,
        documentsVerified: 0,
        verificationScore: 0
      });

      await kycStatus.save();

      // Update user with KYC requirements
      user.kycRequirements = requirements;
      await user.save();

    } catch (kycError) {
      console.error('KYC initialization error:', kycError);
      // Don't fail registration if KYC init fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send welcome email
    try {
      console.log(`📧 Attempting to send welcome email to ${user.email}...`);
      const emailResult = await emailService.sendWelcomeEmail(user.email, {
        firstName: user.firstName,
        businessName: user.businessName,
        kycStatus: user.kycStatus,
        nextSteps: [
          'Upload government-issued photo ID',
          'Upload business license',
          'Complete verification process'
        ]
      });
      if (emailResult.success) {
        console.log(`✅ Welcome email sent successfully to ${user.email}`);
      } else {
        console.error(`❌ Failed to send welcome email to ${user.email}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError.message);
      console.error('Full error:', emailError);
      // Don't fail registration if email fails
    }

    // Send admin notification for new merchant registration
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'hello@virdispay.com';
      console.log(`📧 Attempting to send admin notification to ${adminEmail}...`);
      const adminEmailResult = await emailService.sendAdminNewMerchantNotification(adminEmail, {
        id: user._id.toString(),
        businessName: user.businessName,
        email: user.email,
        businessType: user.businessType,
        country: user.country,
        state: user.state,
        licenseNumber: user.licenseNumber,
        registrationDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        kycStatus: user.kycStatus,
        riskLevel: riskAssessment.level
      });
      if (adminEmailResult.success) {
        console.log(`✅ Admin notification sent successfully to ${adminEmail} for new merchant: ${user.email}`);
      } else {
        console.error(`❌ Failed to send admin notification to ${adminEmail}:`, adminEmailResult.error);
      }
    } catch (adminEmailError) {
      console.error('❌ Failed to send admin notification:', adminEmailError.message);
      console.error('Full error:', adminEmailError);
      // Don't fail registration if admin email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please complete KYC verification.',
      token,
      user: {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        role: user.role,
        walletAddress: user.walletAddress
      },
      kycInfo: {
        status: 'not_started',
        riskLevel: 'medium',
        documentsRequired: 3,
        nextSteps: [
          'Upload government-issued photo ID',
          'Upload business license',
          'Complete verification process'
        ]
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login merchant
 */
router.post('/login', loginRateLimit, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // SECURITY: Validate and sanitize email input to prevent NoSQL injection
    const { email: rawEmail, password } = req.body;
    const email = validateEmail(rawEmail);

    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    // SECURITY: Always perform password comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist
    const dummyHash = '$2a$14$DummyHashToPreventTimingAttack1234567890123456789012345678';
    const userPassword = user ? user.password : dummyHash;
    
    // Always perform the comparison
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, userPassword);

    // Check all conditions AFTER password comparison
    if (!user || !isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        businessType: user.businessType,
        licenseNumber: user.licenseNumber,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 */
router.put('/profile', authMiddleware, [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('businessName').optional().notEmpty().withMessage('Business name cannot be empty'),
  body('walletAddress').optional().isEthereumAddress().withMessage('Valid Ethereum address required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const allowedUpdates = ['firstName', 'lastName', 'businessName', 'walletAddress'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        businessType: user.businessType,
        licenseNumber: user.licenseNumber,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @route POST /api/auth/upload-documents
 * @desc Upload KYC documents
 */
router.post('/upload-documents', authMiddleware, async (req, res) => {
  try {
    // TODO: Implement file upload with multer
    // This would handle document uploads for KYC verification
    
    const { documentType, documentUrl } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add document to user's verification documents
    user.verificationDocuments.push({
      type: documentType,
      url: documentUrl,
      uploadedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      documents: user.verificationDocuments
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 */
router.post('/change-password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * @route GET /api/auth/kyc-status
 * @desc Get current user's KYC status
 */
router.get('/kyc-status', authMiddleware, async (req, res) => {
  try {
    const merchantId = req.user.id;

    // Get KYC status
    const kycStatus = await MerchantKYCStatus.findOne({ merchantId });

    if (!kycStatus) {
      return res.status(404).json({
        success: false,
        message: 'KYC status not found'
      });
    }

    // Get user's uploaded documents (you'd implement this)
    const documents = await getMerchantDocuments(merchantId);

    // Calculate progress
    const progress = kycStatus.documentsRequired > 0 
      ? Math.round((kycStatus.documentsVerified / kycStatus.documentsRequired) * 100)
      : 0;

    res.json({
      success: true,
      kycStatus: {
        status: kycStatus.status,
        riskLevel: kycStatus.riskLevel,
        progress: progress,
        documentsRequired: kycStatus.documentsRequired,
        documentsSubmitted: kycStatus.documentsSubmitted,
        documentsVerified: kycStatus.documentsVerified,
        verificationScore: kycStatus.verificationScore,
        lastVerifiedAt: kycStatus.lastVerifiedAt,
        expiresAt: kycStatus.expiresAt,
        complianceNotes: kycStatus.complianceNotes
      },
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        originalName: doc.originalName,
        status: doc.status,
        verified: doc.verified,
        uploadedAt: doc.uploadedAt
      })),
      nextSteps: getNextSteps(kycStatus)
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status',
      error: error.message
    });
  }
});

// Helper functions
async function getMerchantDocuments(merchantId) {
  try {
    const documents = await Document.find({ userId: merchantId }).sort({ uploadedAt: -1 });
    return documents || [];
  } catch (error) {
    console.error('Error fetching merchant documents:', error);
    return [];
  }
}

function getNextSteps(kycStatus) {
  const steps = [];

  if (kycStatus.status === 'not_started') {
    steps.push('Upload required verification documents');
    steps.push('Complete identity verification');
  } else if (kycStatus.status === 'in_progress') {
    steps.push('Complete document upload');
    steps.push('Wait for document verification');
  } else if (kycStatus.status === 'pending_review') {
    steps.push('Awaiting manual compliance review');
    steps.push('Check back for updates');
  } else if (kycStatus.status === 'approved') {
    steps.push('KYC verification complete');
    steps.push('You can now process payments');
  } else if (kycStatus.status === 'rejected') {
    steps.push('Review compliance notes');
    steps.push('Upload additional required documents');
  } else if (kycStatus.status === 'expired') {
    steps.push('KYC verification has expired');
    steps.push('Re-submit verification documents');
  }

  return steps;
}

// Legacy middleware - replaced by authMiddleware
// Keeping for backward compatibility if needed

/**
 * @route POST /api/auth/kyc-status-update
 * @desc Update KYC status and send notification email
 */
router.post('/kyc-status-update', authMiddleware, async (req, res) => {
  try {
    const { status, riskLevel, progress, documentsRequired, documentsSubmitted, documentsVerified, complianceNotes } = req.body;
    const merchantId = req.user.id;

    // Update KYC status
    const kycStatus = await MerchantKYCStatus.findOneAndUpdate(
      { merchantId },
      {
        status,
        riskLevel,
        progress,
        documentsRequired,
        documentsSubmitted,
        documentsVerified,
        complianceNotes,
        lastVerifiedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Get merchant info
    const merchant = await User.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Send KYC status update email
    try {
      const nextSteps = getNextSteps({ status, riskLevel, progress });
      
      await emailService.sendKYCStatusUpdate(merchant.email, {
        merchantName: merchant.businessName,
        status,
        riskLevel,
        progress,
        documentsRequired,
        documentsSubmitted,
        documentsVerified,
        nextSteps,
        complianceNotes,
        estimatedProcessingTime: status === 'pending_review' ? '2-5 business days' : '1-2 business days'
      });
    } catch (emailError) {
      console.error('Failed to send KYC status update email:', emailError);
      // Don't fail the update if email fails
    }

    res.json({
      success: true,
      message: 'KYC status updated successfully',
      kycStatus
    });

  } catch (error) {
    console.error('KYC status update error:', error);
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

/**
 * @route POST /api/auth/send-compliance-alert
 * @desc Send compliance alert email
 */
router.post('/send-compliance-alert', authMiddleware, async (req, res) => {
  try {
    const { alertType, severity, description, actionRequired, deadline, contactInfo } = req.body;
    const merchantId = req.user.id;

    // Get merchant info
    const merchant = await User.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Send compliance alert email
    try {
      await emailService.sendComplianceAlert(merchant.email, {
        merchantName: merchant.businessName,
        alertType,
        severity,
        description,
        actionRequired,
        deadline,
        contactInfo
      });

      res.json({
        success: true,
        message: 'Compliance alert sent successfully'
      });
    } catch (emailError) {
      console.error('Failed to send compliance alert email:', emailError);
      res.status(500).json({ error: 'Failed to send compliance alert' });
    }

  } catch (error) {
    console.error('Compliance alert error:', error);
    res.status(500).json({ error: 'Failed to send compliance alert' });
  }
});

/**
 * @route POST /api/auth/test-email
 * @desc Test email configuration
 */
router.post('/test-email', authMiddleware, async (req, res) => {
  try {
    const merchantId = req.user.id;
    const merchant = await User.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const result = await emailService.testEmailConfiguration(merchant.email);

    res.json(result);

  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email test failed', 
      error: error.message 
    });
  }
});

// Request password reset
router.post('/forgot-password', passwordResetRateLimit, [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    console.log('🔐 Password reset request received for:', req.body.email);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success even if user doesn't exist (security best practice)
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token (crypto-random)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    // Log reset link to console for testing (remove in production)
    console.log('\n🔐 PASSWORD RESET REQUEST');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔗 Reset Link: ${resetUrl}`);
    console.log(`⏰ Expires: ${new Date(Date.now() + 3600000).toLocaleString()}\n`);
    
    // Send email (non-blocking)
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Request - VirdisPay',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Password Reset Request</h2>
            <p>Hello ${user.firstName},</p>
            <p>You requested to reset your password for your VirdisPay account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #7f8c8d; word-break: break-all;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px;">VirdisPay - Professional Crypto Payments</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Continue anyway - token is saved
    }
    
    res.json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password', passwordResetRateLimit, [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token, password } = req.body;
    
    // Hash the token to match database
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password reset token is invalid or has expired.' 
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Clear reset token
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await user.save();
    
    // Send confirmation email (non-blocking)
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Successful - VirdisPay',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Password Reset Successful</h2>
            <p>Hello ${user.firstName},</p>
            <p>Your password has been successfully reset.</p>
            <p>You can now log in with your new password.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
            <hr style="border: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px;">VirdisPay - Professional Crypto Payments</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
