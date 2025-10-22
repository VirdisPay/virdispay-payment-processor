/**
 * KYC (Know Your Customer) Database Models
 */

const mongoose = require('mongoose');

// Document Schema
const documentSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'government_id',           // Passport, driver's license, national ID
            'proof_of_address',        // Utility bill, bank statement, council tax
            'business_license',        // General business license
            'certificate_incorporation', // Company registration, articles of incorporation
            'tax_document',            // Tax ID, VAT registration, EIN
            'bank_statement',          // Bank account verification
            'cannabis_license',        // Cannabis/hemp specific licenses
            'beneficial_ownership',    // UBO declaration (UK requirement)
            'other'                    // Additional documents
        ]
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'expired'],
        default: 'pending'
    },
    rejectionReason: {
        type: String
    },
    verifiedAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Verification Report Schema
const verificationReportSchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    riskLevel: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high']
    },
    verificationStatus: {
        type: String,
        required: true,
        enum: ['pending', 'approved', 'rejected', 'under_review']
    },
    documentsSubmitted: {
        type: Number,
        default: 0
    },
    documentsVerified: {
        type: Number,
        default: 0
    },
    riskFactors: [{
        type: {
            type: String,
            enum: ['geographic', 'business', 'document', 'volume']
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        message: String
    }],
    requirements: {
        documents: [{
            type: String,
            required: Boolean,
            description: String
        }],
        checks: [String],
        timeframe: String
    },
    recommendations: [String],
    nextSteps: [String],
    reviewedBy: {
        type: String // Admin user ID
    },
    reviewedAt: {
        type: Date
    },
    reviewNotes: {
        type: String
    }
}, {
    timestamps: true
});

// Manual Review Schema
const manualReviewSchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in_review', 'completed', 'cancelled'],
        default: 'pending'
    },
    assignedTo: {
        type: String // Admin user ID
    },
    assignedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    reviewNotes: {
        type: String
    },
    outcome: {
        type: String,
        enum: ['approved', 'rejected', 'requires_more_info']
    }
}, {
    timestamps: true
});

// Merchant KYC Status Schema
const merchantKYCStatusSchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'expired', 'flagged'],
        default: 'not_started'
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    lastVerifiedAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    },
    documentsRequired: {
        type: Number,
        default: 0
    },
    documentsSubmitted: {
        type: Number,
        default: 0
    },
    documentsVerified: {
        type: Number,
        default: 0
    },
    verificationScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    complianceNotes: {
        type: String
    },
    lastReviewBy: {
        type: String // Admin user ID
    },
    lastReviewAt: {
        type: Date
    },
    submittedAt: {
        type: Date
    },
    sanctionsScreening: {
        checkedAt: Date,
        isMatch: Boolean,
        matchDetails: [{
            type: String,
            searchTerm: String,
            matchedEntry: String,
            confidence: Number,
            message: String
        }],
        riskScore: Number,
        requiresManualReview: Boolean
    }
}, {
    timestamps: true
});

// Create indexes for better performance
documentSchema.index({ userId: 1, type: 1 });
documentSchema.index({ status: 1, uploadedAt: -1 });
verificationReportSchema.index({ merchantId: 1, createdAt: -1 });
manualReviewSchema.index({ status: 1, priority: -1, requestedAt: -1 });
merchantKYCStatusSchema.index({ status: 1, riskLevel: 1 });

// Create models
const Document = mongoose.model('Document', documentSchema);
const VerificationReport = mongoose.model('VerificationReport', verificationReportSchema);
const ManualReview = mongoose.model('ManualReview', manualReviewSchema);
const MerchantKYCStatus = mongoose.model('MerchantKYCStatus', merchantKYCStatusSchema);

module.exports = {
    Document,
    VerificationReport,
    ManualReview,
    MerchantKYCStatus
};

