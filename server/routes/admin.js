const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { MerchantKYCStatus, Document } = require('../models/kyc');
const { auth, requireAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditLog');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const fs = require('fs').promises;

// Admin authentication check
router.get('/verify', auth, requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Debug endpoint - Check user KYC status in database
router.get('/debug/user/:email', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }
    
    const kycStatus = await MerchantKYCStatus.findOne({ merchantId: user._id });
    
    res.json({
      success: true,
      user: {
        email: user.email,
        businessName: user.businessName,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified
      },
      merchantKYCStatus: kycStatus ? {
        status: kycStatus.status,
        riskLevel: kycStatus.riskLevel,
        documentsSubmitted: kycStatus.documentsSubmitted,
        documentsVerified: kycStatus.documentsVerified
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fix endpoint - Sync user kycStatus with MerchantKYCStatus
router.post('/debug/sync-kyc/:email', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }
    
    const kycStatus = await MerchantKYCStatus.findOne({ merchantId: user._id });
    if (!kycStatus) {
      return res.json({ success: false, message: 'KYC status not found' });
    }
    
    // Sync user kycStatus with MerchantKYCStatus
    user.kycStatus = kycStatus.status;
    user.isVerified = kycStatus.status === 'approved';
    await user.save();
    
    res.json({
      success: true,
      message: 'KYC status synced',
      user: {
        email: user.email,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified
      },
      merchantKYCStatus: {
        status: kycStatus.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dashboard overview stats
router.get('/dashboard/stats', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if not specified
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get total merchants
    const totalMerchants = await User.countDocuments({ role: 'merchant' });
    const activeMerchants = await User.countDocuments({ 
      role: 'merchant',
      isVerified: true,
      kycStatus: 'approved'
    });
    
    // Get total payments and volume
    const payments = await Transaction.find({
      createdAt: { $gte: start, $lte: end }
    });
    
    const totalPayments = payments.length;
    const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const platformFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    
    // Get pending KYC reviews
    const pendingKYC = await MerchantKYCStatus.countDocuments({ status: 'pending' });
    
    // Calculate growth metrics
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousPayments = await Transaction.countDocuments({
      createdAt: { $gte: previousStart, $lt: start }
    });
    
    const paymentGrowth = previousPayments > 0 
      ? ((totalPayments - previousPayments) / previousPayments * 100).toFixed(1)
      : 0;
    
    res.json({
      success: true,
      stats: {
        merchants: {
          total: totalMerchants,
          active: activeMerchants,
          pendingVerification: totalMerchants - activeMerchants
        },
        payments: {
          total: totalPayments,
          volume: totalVolume,
          averageSize: totalPayments > 0 ? (totalVolume / totalPayments).toFixed(2) : 0,
          growth: paymentGrowth
        },
        revenue: {
          platformFees: platformFees,
          projectedMonthly: (platformFees / ((end - start) / (30 * 24 * 60 * 60 * 1000))).toFixed(2)
        },
        compliance: {
          pendingKYC: pendingKYC
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard stats',
      error: error.message 
    });
  }
});

// Get all merchants with pagination
router.get('/merchants', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const query = { role: 'merchant' };
    
    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { businessName: new RegExp(search, 'i') }
      ];
    }
    
    if (status) {
      if (status === 'active') query.isVerified = true;
      if (status === 'pending') query.isVerified = false;
      if (status === 'kyc-pending') query.kycStatus = 'pending';
      if (status === 'kyc-approved') query.kycStatus = 'approved';
    }
    
    const merchants = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    // Get payment stats for each merchant
    const merchantsWithStats = await Promise.all(merchants.map(async (merchant) => {
      const payments = await Transaction.find({ merchantId: merchant._id });
      const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
      
      return {
        ...merchant.toObject(),
        stats: {
          totalPayments: payments.length,
          totalVolume: totalVolume,
          platformFeesGenerated: totalFees,
          lastPayment: payments.length > 0 ? payments[payments.length - 1].createdAt : null
        }
      };
    }));
    
    res.json({
      success: true,
      merchants: merchantsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch merchants' });
  }
});

// Get single merchant details
router.get('/merchants/:id', auth, requireAdmin, async (req, res) => {
  try {
    const merchant = await User.findById(req.params.id).select('-password');
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }
    
    // Get payment history
    const payments = await Transaction.find({ merchantId: merchant._id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Get KYC data
    const kyc = await MerchantKYCStatus.findOne({ userId: merchant._id });
    
    // Calculate stats
    const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    
    // Log merchant details viewing for audit trail
    const { createAuditLog } = require('../middleware/auditLog');
    await createAuditLog(req, 'merchant_viewed', 'merchant', merchant._id, {
      merchantEmail: merchant.email,
      businessName: merchant.businessName,
      paymentsAccessed: payments.length
    });
    
    res.json({
      success: true,
      merchant: {
        ...merchant.toObject(),
        stats: {
          totalPayments: payments.length,
          totalVolume: totalVolume,
          platformFeesGenerated: totalFees,
          averagePaymentSize: payments.length > 0 ? (totalVolume / payments.length).toFixed(2) : 0
        }
      },
      payments,
      kyc
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch merchant' });
  }
});

// Get all payments across all merchants
router.get('/payments', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, merchantId, startDate, endDate } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (merchantId) query.merchantId = merchantId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await Transaction.find(query)
      .populate('merchantId', 'email businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// Get pending KYC submissions
router.get('/kyc/pending', auth, requireAdmin, async (req, res) => {
  try {
    const { Document } = require('../models/kyc');
    
    const pendingKYC = await MerchantKYCStatus.find({ 
      status: { $in: ['pending', 'pending_review', 'in_progress', 'flagged'] } 
    })
      .sort({ submittedAt: 1 });
    
    // Manually populate user data and documents
    const populatedKYC = await Promise.all(pendingKYC.map(async (kyc) => {
      const user = await User.findById(kyc.merchantId).select('email businessName businessType country');
      
      // Fetch documents for this merchant
      const documents = await Document.find({ userId: kyc.merchantId });
      
      return {
        ...kyc.toObject(),
        userId: user, // AdminDashboard expects userId field
        documents: documents.map(doc => ({
          id: doc.id,
          type: doc.type,
          originalName: doc.originalName,
          filename: doc.filename,
          uploadedAt: doc.uploadedAt,
          status: doc.status,
          verified: doc.verified,
          verificationScore: doc.verificationScore
        }))
      };
    }));
    
    res.json({
      success: true,
      kyc: populatedKYC // Changed from 'submissions' to 'kyc' to match AdminDashboard
    });
  } catch (error) {
    console.error('Error fetching pending KYC:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending KYC',
      error: error.message 
    });
  }
});

// Get single KYC submission for review
router.get('/kyc/:id', auth, requireAdmin, async (req, res) => {
  try {
    const kyc = await MerchantKYCStatus.findById(req.params.id)
      .populate('userId', 'email businessName businessType country createdAt');
    
    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC submission not found' });
    }
    
    res.json({
      success: true,
      kyc
    });
  } catch (error) {
    console.error('Error fetching KYC:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch KYC' });
  }
});

// Approve KYC submission
router.post('/kyc/:id/approve', auth, requireAdmin, auditMiddleware('kyc_approved', 'kyc'), async (req, res) => {
  try {
    const { notes } = req.body;
    
    const kyc = await MerchantKYCStatus.findById(req.params.id);
    
    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC submission not found' });
    }
    
    // Update KYC status
    console.log('✅ Approving KYC for merchant:', kyc.merchantId);
    kyc.status = 'approved';
    kyc.reviewedAt = new Date();
    kyc.reviewedBy = req.user.id;
    kyc.reviewNotes = notes;
    await kyc.save();
    console.log('✅ KYC status updated to approved');
    
    // Update user verification status
    const updatedUser = await User.findByIdAndUpdate(kyc.merchantId, {
      isVerified: true,
      kycStatus: 'approved'
    }, { new: true });
    console.log('✅ User updated:', updatedUser.email, 'kycStatus:', updatedUser.kycStatus, 'isVerified:', updatedUser.isVerified);
    
    // Send approval email notification (non-blocking)
    try {
      const emailService = require('../services/emailService');
      const user = await User.findById(kyc.merchantId);
      
      await emailService.sendEmail({
        to: user.email,
        subject: 'KYC Verification Approved - VirdisPay',
        template: 'kyc-approved',
        data: {
          businessName: user.businessName
        }
      });
      console.log('✅ Approval email sent');
    } catch (emailError) {
      console.warn('⚠️ Failed to send approval email:', emailError.message);
      // Don't fail the approval if email fails
    }
    
    res.json({
      success: true,
      message: 'KYC approved successfully',
      kyc
    });
  } catch (error) {
    console.error('Error approving KYC:', error);
    res.status(500).json({ success: false, message: 'Failed to approve KYC' });
  }
});

// Reject KYC submission
router.post('/kyc/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason required' });
    }
    
    const kyc = await MerchantKYCStatus.findById(req.params.id);
    
    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC submission not found' });
    }
    
    // Update KYC status
    kyc.status = 'rejected';
    kyc.reviewedAt = new Date();
    kyc.reviewedBy = req.user.id;
    kyc.rejectionReason = reason;
    kyc.reviewNotes = notes;
    await kyc.save();
    
    // Update user status
    await User.findByIdAndUpdate(kyc.merchantId, {
      kycStatus: 'rejected'
    });
    
    // Send rejection email (non-blocking)
    try {
      const emailService = require('../services/emailService');
      const user = await User.findById(kyc.merchantId);
      
      await emailService.sendEmail({
        to: user.email,
        subject: 'KYC Verification Update - VirdisPay',
        template: 'kyc-rejected',
        data: {
          businessName: user.businessName,
          reason: reason,
          notes: notes
        }
      });
      console.log('✅ Rejection email sent');
    } catch (emailError) {
      console.warn('⚠️ Failed to send rejection email:', emailError.message);
      // Don't fail the rejection if email fails
    }
    
    res.json({
      success: true,
      message: 'KYC rejected',
      kyc
    });
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    res.status(500).json({ success: false, message: 'Failed to reject KYC' });
  }
});

// View/Download KYC document
router.get('/kyc/document/:documentId', auth, requireAdmin, async (req, res) => {
  try {
    const document = await Document.findOne({ id: req.params.documentId });
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    // Check if file exists
    const filePath = path.resolve(document.filePath);
    
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }
    
    // Log document viewing for audit trail
    const { createAuditLog } = require('../middleware/auditLog');
    await createAuditLog(req, 'document_viewed', 'document', document.id, {
      documentType: document.type,
      filename: document.originalName,
      merchantId: document.userId
    });
    
    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    
    // Send file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error viewing document:', error);
    res.status(500).json({ success: false, message: 'Failed to load document' });
  }
});

// Verify/Approve a specific document
router.post('/kyc/document/:documentId/verify', auth, requireAdmin, auditMiddleware('document_verified'), async (req, res) => {
  try {
    const { verified, verificationScore, notes } = req.body;
    
    const document = await Document.findOne({ id: req.params.documentId });
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    // Update document verification status
    document.verified = verified !== undefined ? verified : true;
    document.verificationScore = verificationScore || 100;
    document.status = verified ? 'verified' : 'rejected';
    document.verifiedAt = new Date();
    
    await document.save();
    
    // Update KYC status verified count
    const kycStatus = await MerchantKYCStatus.findOne({ merchantId: document.userId });
    if (kycStatus) {
      const verifiedDocs = await Document.countDocuments({ userId: document.userId, verified: true });
      kycStatus.documentsVerified = verifiedDocs;
      await kycStatus.save();
    }
    
    res.json({
      success: true,
      message: 'Document verification updated',
      document: {
        id: document.id,
        verified: document.verified,
        verificationScore: document.verificationScore,
        status: document.status
      }
    });
    
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ success: false, message: 'Failed to verify document' });
  }
});

// Request more information from merchant
router.post('/kyc/:id/request-info', auth, requireAdmin, async (req, res) => {
  try {
    const { message, requiredDocuments } = req.body;
    
    const kyc = await MerchantKYCStatus.findById(req.params.id);
    
    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC submission not found' });
    }
    
    kyc.status = 'additional-info-required';
    kyc.additionalInfoRequest = {
      message,
      requiredDocuments,
      requestedAt: new Date(),
      requestedBy: req.user.id
    };
    await kyc.save();
    
    // Send email to merchant
    const emailService = require('../services/emailService');
    const user = await User.findById(kyc.userId);
    
    await emailService.sendEmail({
      to: user.email,
      subject: 'Additional Information Required - VirdisPay KYC',
      template: 'kyc-info-request',
      data: {
        businessName: user.businessName,
        message: message,
        requiredDocuments: requiredDocuments
      }
    });
    
    res.json({
      success: true,
      message: 'Information request sent',
      kyc
    });
  } catch (error) {
    console.error('Error requesting info:', error);
    res.status(500).json({ success: false, message: 'Failed to request info' });
  }
});

// Suspend merchant account
router.post('/merchants/:id/suspend', auth, requireAdmin, auditMiddleware('merchant_suspended', 'merchant'), async (req, res) => {
  try {
    const { reason } = req.body;
    const merchantId = req.params.id;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Suspension reason required' });
    }
    
    const merchant = await User.findById(merchantId);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }
    
    // Suspend account
    merchant.isActive = false;
    merchant.suspensionReason = reason;
    merchant.suspendedAt = new Date();
    merchant.suspendedBy = req.user.id;
    await merchant.save();
    
    // Send suspension email (non-blocking)
    try {
      const emailService = require('../services/emailService');
      await emailService.sendEmail({
        to: merchant.email,
        subject: 'Account Suspended - VirdisPay',
        template: 'account-suspended',
        data: {
          businessName: merchant.businessName,
          reason: reason
        }
      });
      console.log('✅ Suspension email sent');
    } catch (emailError) {
      console.warn('⚠️ Failed to send suspension email:', emailError.message);
      // Don't fail the suspension if email fails
    }
    
    console.log(`Admin ${req.user.email} suspended merchant ${merchant.email}: ${reason}`);
    
    res.json({
      success: true,
      message: 'Merchant account suspended',
      merchant: {
        id: merchant._id,
        email: merchant.email,
        businessName: merchant.businessName,
        isActive: merchant.isActive
      }
    });
  } catch (error) {
    console.error('Error suspending merchant:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend merchant' });
  }
});

// Unsuspend merchant account
router.post('/merchants/:id/unsuspend', auth, requireAdmin, auditMiddleware('merchant_unsuspended', 'merchant'), async (req, res) => {
  try {
    const merchantId = req.params.id;
    
    const merchant = await User.findById(merchantId);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }
    
    // Unsuspend account
    merchant.isActive = true;
    merchant.suspensionReason = null;
    merchant.suspendedAt = null;
    merchant.unsuspendedAt = new Date();
    merchant.unsuspendedBy = req.user.id;
    await merchant.save();
    
    // Send reactivation email (non-blocking)
    try {
      const emailService = require('../services/emailService');
      await emailService.sendEmail({
        to: merchant.email,
        subject: 'Account Reactivated - VirdisPay',
        template: 'account-reactivated',
        data: {
          businessName: merchant.businessName
        }
      });
      console.log('✅ Reactivation email sent');
    } catch (emailError) {
      console.warn('⚠️ Failed to send reactivation email:', emailError.message);
      // Don't fail the unsuspend if email fails
    }
    
    console.log(`Admin ${req.user.email} unsuspended merchant ${merchant.email}`);
    
    res.json({
      success: true,
      message: 'Merchant account reactivated',
      merchant: {
        id: merchant._id,
        email: merchant.email,
        businessName: merchant.businessName,
        isActive: merchant.isActive
      }
    });
  } catch (error) {
    console.error('Error unsuspending merchant:', error);
    res.status(500).json({ success: false, message: 'Failed to unsuspend merchant' });
  }
});

// Bulk email to merchants
router.post('/bulk-email', auth, requireAdmin, async (req, res) => {
  try {
    const { merchantIds, subject, message } = req.body;
    
    if (!merchantIds || merchantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No merchants selected' });
    }
    
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message required' });
    }
    
    const emailService = require('../services/emailService');
    let sentCount = 0;
    
    for (const merchantId of merchantIds) {
      try {
        const merchant = await User.findById(merchantId);
        if (merchant) {
          await emailService.sendEmail({
            to: merchant.email,
            subject: subject,
            template: 'admin-notification',
            data: {
              businessName: merchant.businessName,
              message: message
            }
          });
          sentCount++;
        }
      } catch (error) {
        console.error(`Failed to send email to merchant ${merchantId}:`, error);
      }
    }
    
    // Log bulk email action
    await AuditLog.logAction({
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: 'export_data',
      targetType: 'merchant',
      details: {
        subject,
        recipientCount: sentCount,
        totalSelected: merchantIds.length
      },
      severity: 'low'
    });
    
    res.json({
      success: true,
      message: `Email sent to ${sentCount} of ${merchantIds.length} merchants`,
      sentCount
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send bulk emails' });
  }
});

// Get audit logs
router.get('/audit-logs', auth, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, skip = 0, action, adminId, startDate, endDate } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('adminId', 'email businessName');
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      logs,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// Get platform revenue analytics
router.get('/revenue/analytics', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get all payments in date range
    const payments = await Transaction.find({
      createdAt: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('merchantId', 'businessName businessType');
    
    // Calculate totals
    const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPlatformFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    const totalGasFees = payments.reduce((sum, p) => sum + (p.gasFee || 0), 0);
    
    // Group by time period
    const grouped = {};
    payments.forEach(payment => {
      let key;
      const date = new Date(payment.createdAt);
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          volume: 0,
          fees: 0,
          count: 0
        };
      }
      
      grouped[key].volume += payment.amount || 0;
      grouped[key].fees += payment.platformFee || 0;
      grouped[key].count += 1;
    });
    
    // Group by industry
    const byIndustry = {};
    payments.forEach(payment => {
      const industry = payment.merchantId?.businessType || 'unknown';
      if (!byIndustry[industry]) {
        byIndustry[industry] = {
          volume: 0,
          fees: 0,
          count: 0
        };
      }
      byIndustry[industry].volume += payment.amount || 0;
      byIndustry[industry].fees += payment.platformFee || 0;
      byIndustry[industry].count += 1;
    });
    
    res.json({
      success: true,
      analytics: {
        summary: {
          totalVolume,
          totalPlatformFees,
          totalGasFees,
          averageTransactionSize: payments.length > 0 ? (totalVolume / payments.length).toFixed(2) : 0,
          transactionCount: payments.length
        },
        timeline: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
        byIndustry: Object.entries(byIndustry).map(([industry, stats]) => ({
          industry,
          ...stats
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
  }
});

// Get top merchants by volume
router.get('/merchants/top', auth, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, period = 30 } = req.query;
    
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    const topMerchants = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$merchantId',
          totalVolume: { $sum: '$amount' },
          totalFees: { $sum: '$platformFee' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalVolume: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    // Populate merchant details
    const merchantsWithDetails = await Promise.all(topMerchants.map(async (stat) => {
      const merchant = await User.findById(stat._id).select('email businessName businessType');
      return {
        merchant,
        stats: {
          totalVolume: stat.totalVolume,
          totalFees: stat.totalFees,
          paymentCount: stat.paymentCount
        }
      };
    }));
    
    res.json({
      success: true,
      topMerchants: merchantsWithDetails
    });
  } catch (error) {
    console.error('Error fetching top merchants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top merchants' });
  }
});

// Export data
router.get('/export/payments', auth, requireAdmin, async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await Transaction.find(query)
      .populate('merchantId', 'email businessName')
      .sort({ createdAt: -1 });
    
    if (format === 'csv') {
      // Log data export for audit trail
      const { createAuditLog } = require('../middleware/auditLog');
      await createAuditLog(req, 'data_exported', 'export', 'payments', {
        exportType: 'payments',
        recordCount: payments.length,
        dateRange: { startDate, endDate },
        format: 'csv'
      });
      
      const csv = [
        'Date,Merchant,Email,Amount,Currency,Platform Fee,Status,Network',
        ...payments.map(p => 
          `${p.createdAt.toISOString()},${p.merchantId?.businessName || 'N/A'},${p.merchantId?.email || 'N/A'},${p.amount},${p.currency},${p.platformFee},${p.status},${p.network}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        payments
      });
    }
  } catch (error) {
    console.error('Error exporting payments:', error);
    res.status(500).json({ success: false, message: 'Failed to export payments' });
  }
});

// Export merchants
router.get('/export/merchants', auth, requireAdmin, async (req, res) => {
  try {
    const merchants = await User.find({ role: 'merchant' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Log data export for audit trail
    const { createAuditLog } = require('../middleware/auditLog');
    await createAuditLog(req, 'data_exported', 'export', 'merchants', {
      exportType: 'merchants',
      recordCount: merchants.length,
      format: 'csv'
    });
    
    const csv = [
      'Business Name,Email,Type,Country,KYC Status,Verified,Created,Total Payments,Status',
      ...merchants.map(m => 
        `${m.businessName},${m.email},${m.businessType},${m.country},${m.kycStatus},${m.isVerified ? 'Yes' : 'No'},${m.createdAt.toISOString()},0,${m.isActive ? 'Active' : 'Suspended'}`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=merchants-${Date.now()}.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting merchants:', error);
    res.status(500).json({ success: false, message: 'Failed to export merchants' });
  }
});

// Export KYC submissions
router.get('/export/kyc', auth, requireAdmin, async (req, res) => {
  try {
    const kycSubmissions = await MerchantKYCStatus.find({})
      .sort({ submittedAt: -1 });
    
    // Populate merchant data
    const populatedKYC = await Promise.all(kycSubmissions.map(async (kyc) => {
      const user = await User.findById(kyc.merchantId).select('email businessName businessType country');
      return {
        ...kyc.toObject(),
        merchant: user
      };
    }));
    
    // Log data export for audit trail
    const { createAuditLog } = require('../middleware/auditLog');
    await createAuditLog(req, 'data_exported', 'export', 'kyc', {
      exportType: 'kyc_submissions',
      recordCount: populatedKYC.length,
      format: 'csv'
    });
    
    const csv = [
      'Business,Email,Status,Risk Level,Documents Submitted,Documents Verified,Submitted Date,Reviewed Date',
      ...populatedKYC.map(k => 
        `${k.merchant?.businessName || 'N/A'},${k.merchant?.email || 'N/A'},${k.status},${k.riskLevel},${k.documentsSubmitted || 0},${k.documentsVerified || 0},${k.submittedAt ? new Date(k.submittedAt).toISOString() : 'N/A'},${k.reviewedAt ? new Date(k.reviewedAt).toISOString() : 'N/A'}`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=kyc-submissions-${Date.now()}.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting KYC:', error);
    res.status(500).json({ success: false, message: 'Failed to export KYC data' });
  }
});

// Bulk KYC approval
router.post('/kyc/bulk-approve', auth, requireAdmin, async (req, res) => {
  try {
    const { kycIds, notes } = req.body;
    
    if (!kycIds || kycIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No KYC IDs provided' });
    }
    
    const results = { success: 0, failed: 0 };
    
    for (const kycId of kycIds) {
      try {
        const kyc = await MerchantKYCStatus.findById(kycId);
        if (kyc) {
          kyc.status = 'approved';
          kyc.reviewedAt = new Date();
          kyc.reviewedBy = req.user.id;
          kyc.reviewNotes = notes || 'Bulk approved';
          await kyc.save();
          
          await User.findByIdAndUpdate(kyc.merchantId, {
            isVerified: true,
            kycStatus: 'approved'
          });
          
          results.success++;
        }
      } catch (err) {
        console.error(`Failed to approve KYC ${kycId}:`, err);
        results.failed++;
      }
    }
    
    // Log bulk action
    const { createAuditLog } = require('../middleware/auditLog');
    await createAuditLog(req, 'bulk_action', 'kyc', 'multiple', {
      action: 'bulk_approve',
      totalCount: kycIds.length,
      successCount: results.success,
      failedCount: results.failed,
      kycIds: kycIds
    });
    
    res.json({
      success: true,
      message: `Bulk approval completed: ${results.success} succeeded, ${results.failed} failed`,
      results
    });
    
  } catch (error) {
    console.error('Error in bulk approval:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk approval' });
  }
});

// Bulk merchant suspend
router.post('/merchants/bulk-suspend', auth, requireAdmin, async (req, res) => {
  try {
    const { merchantIds, reason } = req.body;
    
    if (!merchantIds || merchantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No merchant IDs provided' });
    }
    
    const results = { success: 0, failed: 0 };
    
    for (const merchantId of merchantIds) {
      try {
        await User.findByIdAndUpdate(merchantId, {
          isActive: false,
          suspendedAt: new Date(),
          suspendedBy: req.user.id,
          suspensionReason: reason || 'Bulk suspended'
        });
        results.success++;
      } catch (err) {
        console.error(`Failed to suspend merchant ${merchantId}:`, err);
        results.failed++;
      }
    }
    
    // Log bulk action
    const { createAuditLog } = require('../middleware/auditLog');
    await createAuditLog(req, 'bulk_action', 'merchant', 'multiple', {
      action: 'bulk_suspend',
      totalCount: merchantIds.length,
      successCount: results.success,
      failedCount: results.failed,
      reason: reason,
      merchantIds: merchantIds
    });
    
    res.json({
      success: true,
      message: `Bulk suspend completed: ${results.success} succeeded, ${results.failed} failed`,
      results
    });
    
  } catch (error) {
    console.error('Error in bulk suspend:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk suspend' });
  }
});

module.exports = router;

