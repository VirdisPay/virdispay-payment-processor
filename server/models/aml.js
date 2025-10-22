/**
 * AML (Anti-Money Laundering) Database Models
 */

const mongoose = require('mongoose');

// Screening Result Schema
const screeningResultSchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    transactionId: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    checks: {
        sanctions: {
            flagged: {
                type: Boolean,
                default: false
            },
            matches: [String],
            reason: String
        },
        pep: {
            flagged: {
                type: Boolean,
                default: false
            },
            matches: [String],
            reason: String
        },
        adverse_media: {
            flagged: {
                type: Boolean,
                default: false
            },
            matches: [String],
            reason: String
        }
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    flagged: {
        type: Boolean,
        default: false
    },
    reason: String
}, {
    timestamps: true
});

// Monitoring Result Schema
const monitoringResultSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        index: true
    },
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    patterns: [{
        type: {
            type: String,
            enum: ['round_amounts', 'just_below_threshold', 'rapid_succession', 'unusual_timing', 'high_frequency', 'structuring']
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        description: String,
        details: String
    }],
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    flagged: {
        type: Boolean,
        default: false
    },
    reason: String
}, {
    timestamps: true
});

// AML Report Schema
const amlReportSchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    transactionId: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    overallRiskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    },
    screeningResults: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScreeningResult'
    },
    monitoringResults: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MonitoringResult'
    },
    recommendations: [String],
    requiredActions: [{
        type: {
            type: String,
            enum: ['block_transaction', 'manual_review', 'enhanced_monitoring', 'additional_documentation']
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent']
        },
        description: String,
        completed: {
            type: Boolean,
            default: false
        },
        completedAt: Date,
        completedBy: String
    }],
    status: {
        type: String,
        enum: ['pending', 'in_review', 'resolved', 'escalated'],
        default: 'pending'
    },
    reviewedBy: String, // Admin user ID
    reviewedAt: Date,
    reviewNotes: String
}, {
    timestamps: true
});

// Suspicious Activity Report Schema
const suspiciousActivityReportSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        index: true
    },
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    reportedBy: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    details: String,
    reportedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'investigating', 'resolved', 'false_positive'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignedTo: String, // Admin user ID
    assignedAt: Date,
    investigationNotes: String,
    outcome: {
        type: String,
        enum: ['confirmed_suspicious', 'false_positive', 'requires_further_investigation']
    },
    resolvedAt: Date,
    resolvedBy: String
}, {
    timestamps: true
});

// Whitelist Entry Schema
const whitelistEntrySchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    address: {
        type: String,
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    expiryDate: Date,
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked'],
        default: 'active'
    },
    addedBy: {
        type: String,
        required: true
    },
    revokedAt: Date,
    revokedBy: String,
    revokeReason: String
}, {
    timestamps: true
});

// Compliance Report Schema
const complianceReportSchema = new mongoose.Schema({
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    period: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        }
    },
    totalTransactions: {
        type: Number,
        default: 0
    },
    flaggedTransactions: {
        type: Number,
        default: 0
    },
    suspiciousActivities: {
        type: Number,
        default: 0
    },
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    complianceStatus: {
        type: String,
        enum: ['compliant', 'non_compliant', 'under_review', 'requires_action'],
        default: 'compliant'
    },
    recommendations: [String],
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: String // Admin user ID
}, {
    timestamps: true
});

// Transaction Monitoring Schema
const transactionMonitoringSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    merchantId: {
        type: String,
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    customerAddress: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    flagged: {
        type: Boolean,
        default: false
    },
    flagReason: String,
    monitoringStatus: {
        type: String,
        enum: ['monitoring', 'flagged', 'cleared', 'escalated'],
        default: 'monitoring'
    },
    lastChecked: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create indexes for better performance
screeningResultSchema.index({ merchantId: 1, timestamp: -1 });
screeningResultSchema.index({ flagged: 1, riskLevel: 1 });
monitoringResultSchema.index({ merchantId: 1, timestamp: -1 });
monitoringResultSchema.index({ flagged: 1, riskScore: -1 });
amlReportSchema.index({ merchantId: 1, timestamp: -1 });
amlReportSchema.index({ overallRiskLevel: 1, status: 1 });
suspiciousActivityReportSchema.index({ merchantId: 1, reportedAt: -1 });
suspiciousActivityReportSchema.index({ status: 1, priority: -1 });
whitelistEntrySchema.index({ merchantId: 1, status: 1 });
whitelistEntrySchema.index({ address: 1, status: 1 });
complianceReportSchema.index({ merchantId: 1, period: 1 });
transactionMonitoringSchema.index({ merchantId: 1, timestamp: -1 });
transactionMonitoringSchema.index({ flagged: 1, riskScore: -1 });

// Create models
const ScreeningResult = mongoose.model('ScreeningResult', screeningResultSchema);
const MonitoringResult = mongoose.model('MonitoringResult', monitoringResultSchema);
const AMLReport = mongoose.model('AMLReport', amlReportSchema);
const SuspiciousActivityReport = mongoose.model('SuspiciousActivityReport', suspiciousActivityReportSchema);
const WhitelistEntry = mongoose.model('WhitelistEntry', whitelistEntrySchema);
const ComplianceReport = mongoose.model('ComplianceReport', complianceReportSchema);
const TransactionMonitoring = mongoose.model('TransactionMonitoring', transactionMonitoringSchema);

module.exports = {
    ScreeningResult,
    MonitoringResult,
    AMLReport,
    SuspiciousActivityReport,
    WhitelistEntry,
    ComplianceReport,
    TransactionMonitoring
};



