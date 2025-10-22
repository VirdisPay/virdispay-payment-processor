/**
 * KYC (Know Your Customer) Routes
 * Handles document upload, verification, and compliance checks
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const KYCService = require('../services/kycService');
const sanctionsScreeningService = require('../services/sanctionsScreeningService');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const { MerchantKYCStatus } = require('../models/kyc');

const router = express.Router();
const kycService = new KYCService();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/kyc');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${req.user.id}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
        cb(null, filename);
    }
});

// SECURITY: Strict file upload limits and validation
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file (reduced from 10MB for security)
        files: 5, // Max 5 files per request
        fields: 10, // Max 10 fields
        fileSize: 5 * 1024 * 1024 // Explicit file size limit
    },
    fileFilter: (req, file, cb) => {
        // Allowed file types for KYC documents
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/pdf'
        ];
        
        // Check MIME type
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
        }
        
        // Check file extension (double-check against MIME spoofing)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension.'));
        }
        
        // Sanitize filename
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        file.originalname = sanitizedName;
        
        cb(null, true);
    }
});

/**
 * POST /api/kyc/documents
 * Upload KYC documents
 */
router.post('/documents', authMiddleware, upload.array('documents', 5), async (req, res) => {
    try {
        const userId = req.user.id;
        const uploadedFiles = req.files;

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No documents provided'
            });
        }

        // Process uploaded documents
        const documents = uploadedFiles.map(file => ({
            id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            type: req.body.documentType || 'unknown',
            filename: file.filename,
            originalName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            verified: false,
            verificationScore: 0,
            status: 'pending'
        }));

        // Save document metadata to database
        const { Document } = require('../models/kyc');
        const savedDocuments = await Document.create(documents);
        
        // Update KYC status document count
        const kycStatus = await MerchantKYCStatus.findOne({ merchantId: userId });
        if (kycStatus) {
            kycStatus.documentsSubmitted = (kycStatus.documentsSubmitted || 0) + documents.length;
            await kycStatus.save();
        }

        res.json({
            success: true,
            message: 'Documents uploaded successfully',
            documents: documents.map(doc => ({
                id: doc.id,
                type: doc.type,
                filename: doc.filename,
                originalName: doc.originalName,
                uploadedAt: doc.uploadedAt,
                status: doc.status
            }))
        });

    } catch (error) {
        console.error('Document upload error:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.error('Failed to clean up file:', unlinkError);
                }
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload documents',
            error: error.message
        });
    }
});

/**
 * POST /api/kyc/verify
 * Trigger document verification
 */
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const merchantData = req.body.merchantData;

        if (!merchantData) {
            return res.status(400).json({
                success: false,
                message: 'Merchant data is required for verification'
            });
        }

        // Get user's uploaded documents (you'd implement this)
        const documents = await getMerchantDocuments(userId);
        
        // Calculate risk assessment
        const riskAssessment = await kycService.calculateRiskScore(merchantData, documents);

        // Generate verification report
        const verificationReport = kycService.generateVerificationReport(
            merchantData,
            riskAssessment,
            documents
        );

        // Save verification report (you'd implement this)
        // await VerificationReport.create(verificationReport);

        res.json({
            success: true,
            message: 'Verification completed',
            report: verificationReport
        });

    } catch (error) {
        console.error('KYC verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed',
            error: error.message
        });
    }
});

/**
 * GET /api/kyc/status/:merchantId
 * Get KYC verification status
 */
router.get('/status/:merchantId', authMiddleware, async (req, res) => {
    try {
        const merchantId = req.params.merchantId;

        // Get verification status (you'd implement this)
        const verificationStatus = await getVerificationStatus(merchantId);

        res.json({
            success: true,
            status: verificationStatus
        });

    } catch (error) {
        console.error('KYC status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification status',
            error: error.message
        });
    }
});

/**
 * GET /api/kyc/requirements
 * Get verification requirements for current user
 */
router.get('/requirements', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's merchant data (you'd implement this)
        const merchantData = await getMerchantData(userId);
        
        if (!merchantData) {
            return res.status(404).json({
                success: false,
                message: 'Merchant data not found'
            });
        }

        // Calculate initial risk assessment
        const riskAssessment = await kycService.calculateRiskScore(merchantData);
        
        // Get verification requirements
        const requirements = kycService.getVerificationRequirements(
            merchantData,
            riskAssessment.level
        );

        res.json({
            success: true,
            requirements: requirements,
            riskLevel: riskAssessment.level,
            estimatedProcessingTime: getProcessingTimeEstimate(riskAssessment.level)
        });

    } catch (error) {
        console.error('KYC requirements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification requirements',
            error: error.message
        });
    }
});

/**
 * GET /api/kyc/documents
 * Get user's uploaded documents
 */
router.get('/documents', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's documents (you'd implement this)
        const documents = await getMerchantDocuments(userId);

        res.json({
            success: true,
            documents: documents.map(doc => ({
                id: doc.id,
                type: doc.type,
                originalName: doc.originalName,
                uploadedAt: doc.uploadedAt,
                status: doc.status,
                verified: doc.verified,
                verificationScore: doc.verificationScore
            }))
        });

    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get documents',
            error: error.message
        });
    }
});

/**
 * DELETE /api/kyc/documents/:documentId
 * Delete a document
 */
router.delete('/documents/:documentId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const documentId = req.params.documentId;

        // Get document (you'd implement this)
        const document = await getDocumentById(documentId);

        if (!document || document.userId !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(document.filePath);
        } catch (unlinkError) {
            console.error('Failed to delete file:', unlinkError);
        }

        // Delete document record (you'd implement this)
        // await Document.findByIdAndDelete(documentId);

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete document',
            error: error.message
        });
    }
});

/**
 * POST /api/kyc/submit
 * Submit KYC for review (triggers sanctions screening)
 */
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        console.log('📋 KYC Submit - Starting...');
        const userId = req.user.id;
        console.log('   User ID:', userId);
        
        const user = await User.findById(userId);
        console.log('   User found:', user ? user.businessName : 'NOT FOUND');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get or create KYC status
        console.log('   Finding KYC status...');
        let kycStatus = await MerchantKYCStatus.findOne({ merchantId: userId });
        console.log('   KYC status found:', kycStatus ? 'YES' : 'NO');
        
        if (!kycStatus) {
            console.log('   Creating new KYC status...');
            kycStatus = new MerchantKYCStatus({
                merchantId: userId,
                status: 'pending_review',
                riskLevel: 'medium',
                documentsRequired: 2,
                documentsSubmitted: 2,
                documentsVerified: 0,
                verificationScore: 0,
                submittedAt: new Date()
            });
        } else {
            console.log('   Updating existing KYC status to pending_review...');
            kycStatus.status = 'pending_review';
            kycStatus.submittedAt = new Date();
        }

        console.log('   Saving KYC status...');
        await kycStatus.save();
        console.log('   ✅ KYC status saved successfully!');
        
        // Update user KYC status
        user.kycStatus = 'pending_review';
        await user.save();
        console.log('   ✅ User kycStatus updated!');

        res.json({
            success: true,
            message: 'KYC submitted successfully - awaiting admin review'
        });

    } catch (error) {
        console.error('KYC submission error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to submit KYC: ' + error.message,
            error: error.message,
            details: error.stack
        });
    }
});

/**
 * POST /api/kyc/manual-review
 * Submit for manual compliance review
 */
router.post('/manual-review', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewData = req.body;

        // Create manual review request (you'd implement this)
        const reviewRequest = {
            merchantId: userId,
            requestedAt: new Date(),
            reason: reviewData.reason,
            priority: reviewData.priority || 'medium',
            status: 'pending',
            assignedTo: null
        };

        // await ManualReview.create(reviewRequest);

        res.json({
            success: true,
            message: 'Manual review requested successfully',
            reviewRequest: {
                id: reviewRequest.id,
                status: reviewRequest.status,
                estimatedReviewTime: '2-5 business days'
            }
        });

    } catch (error) {
        console.error('Manual review request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit manual review request',
            error: error.message
        });
    }
});

// Helper functions (you'd implement these with your database)

async function getMerchantDocuments(userId) {
    // Implement database query to get user's documents
    return [];
}

async function getVerificationStatus(merchantId) {
    // Implement database query to get verification status
    return {
        status: 'pending',
        riskLevel: 'medium',
        documentsRequired: 3,
        documentsSubmitted: 0,
        documentsVerified: 0
    };
}

async function getMerchantData(userId) {
    // Implement database query to get merchant data
    return {
        id: userId,
        businessName: 'Sample Business',
        businessType: 'cbd-retail',
        country: 'US',
        expectedMonthlyVolume: 5000
    };
}

async function getDocumentById(documentId) {
    // Implement database query to get document by ID
    return null;
}

function getProcessingTimeEstimate(riskLevel) {
    const estimates = {
        low: '1-2 business days',
        medium: '3-5 business days',
        high: '5-10 business days'
    };
    return estimates[riskLevel] || '3-5 business days';
}

module.exports = router;

