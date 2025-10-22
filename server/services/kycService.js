/**
 * Built-in KYC (Know Your Customer) Service
 * Handles document verification, identity checks, and risk assessment
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class KYCService {
    constructor() {
        this.riskFactors = {
            // Geographic risk factors
            highRiskCountries: ['AF', 'IR', 'KP', 'SY', 'MM', 'LR', 'SD', 'ZW', 'CU', 'VE'],
            mediumRiskCountries: ['RU', 'CN', 'TR', 'PK', 'BD', 'LK', 'KH', 'LA', 'MY', 'TH'],
            
            // Business type risk factors
            highRiskBusinessTypes: ['cannabis-retail', 'cannabis-dispensary', 'cannabis-distributor'],
            mediumRiskBusinessTypes: ['cbd-retail', 'hemp-processing', 'cannabis-cultivation'],
            lowRiskBusinessTypes: ['cbd-manufacturing', 'hemp-farming', 'cbd-online'],
            
            // Document verification weights
            documentWeights: {
                government_id: 25,              // Photo ID
                proof_of_address: 15,           // Address verification
                certificate_incorporation: 20,   // Business registration
                tax_document: 15,               // Tax ID/VAT
                beneficial_ownership: 10,        // UBO declaration
                business_license: 10,           // General license
                cannabis_license: 15,           // Cannabis-specific
                bank_statement: 15,             // Financial verification
                other: 5                        // Additional docs
            }
        };
        
        this.verificationThresholds = {
            low: 60,
            medium: 75,
            high: 85
        };
    }

    /**
     * Calculate risk score for a merchant
     */
    async calculateRiskScore(merchantData, documents = []) {
        let riskScore = 0;
        const riskFactors = [];

        // Geographic risk assessment
        const countryRisk = this.assessGeographicRisk(merchantData.country);
        riskScore += countryRisk.score;
        riskFactors.push(...countryRisk.factors);

        // Business type risk assessment
        const businessRisk = this.assessBusinessRisk(merchantData.businessType);
        riskScore += businessRisk.score;
        riskFactors.push(...businessRisk.factors);

        // Document verification assessment
        const documentRisk = await this.assessDocumentRisk(documents);
        riskScore += documentRisk.score;
        riskFactors.push(...documentRisk.factors);

        // Transaction volume risk (if available)
        if (merchantData.expectedMonthlyVolume) {
            const volumeRisk = this.assessVolumeRisk(merchantData.expectedMonthlyVolume);
            riskScore += volumeRisk.score;
            riskFactors.push(...volumeRisk.factors);
        }

        // Determine risk level
        let riskLevel = 'low';
        if (riskScore >= 70) riskLevel = 'high';
        else if (riskScore >= 40) riskLevel = 'medium';

        return {
            score: Math.min(100, Math.max(0, riskScore)),
            level: riskLevel,
            factors: riskFactors,
            requiresManualReview: riskScore >= 60
        };
    }

    /**
     * Assess geographic risk
     */
    assessGeographicRisk(country) {
        const factors = [];
        let score = 0;

        if (this.riskFactors.highRiskCountries.includes(country)) {
            score += 30;
            factors.push({
                type: 'geographic',
                severity: 'high',
                message: `Country ${country} is classified as high-risk jurisdiction`
            });
        } else if (this.riskFactors.mediumRiskCountries.includes(country)) {
            score += 15;
            factors.push({
                type: 'geographic',
                severity: 'medium',
                message: `Country ${country} is classified as medium-risk jurisdiction`
            });
        } else {
            factors.push({
                type: 'geographic',
                severity: 'low',
                message: `Country ${country} is classified as low-risk jurisdiction`
            });
        }

        return { score, factors };
    }

    /**
     * Assess business type risk
     */
    assessBusinessRisk(businessType) {
        const factors = [];
        let score = 0;

        if (this.riskFactors.highRiskBusinessTypes.includes(businessType)) {
            score += 25;
            factors.push({
                type: 'business',
                severity: 'high',
                message: `Business type '${businessType}' requires enhanced due diligence`
            });
        } else if (this.riskFactors.mediumRiskBusinessTypes.includes(businessType)) {
            score += 10;
            factors.push({
                type: 'business',
                severity: 'medium',
                message: `Business type '${businessType}' requires standard due diligence`
            });
        } else {
            factors.push({
                type: 'business',
                severity: 'low',
                message: `Business type '${businessType}' is low-risk`
            });
        }

        return { score, factors };
    }

    /**
     * Assess document verification risk
     */
    async assessDocumentRisk(documents) {
        const factors = [];
        let score = 0;

        if (!documents || documents.length === 0) {
            score += 50;
            factors.push({
                type: 'document',
                severity: 'high',
                message: 'No verification documents provided'
            });
            return { score, factors };
        }

        let verificationScore = 0;
        const requiredDocs = ['government_id', 'business_license'];

        for (const doc of documents) {
            if (requiredDocs.includes(doc.type)) {
                const docVerification = await this.verifyDocument(doc);
                verificationScore += docVerification.score * (this.riskFactors.documentWeights[doc.type] / 100);
                
                if (!docVerification.valid) {
                    factors.push({
                        type: 'document',
                        severity: 'high',
                        message: `${doc.type} verification failed: ${docVerification.reason}`
                    });
                }
            }
        }

        // Check if all required documents are present and verified
        const missingDocs = requiredDocs.filter(docType => 
            !documents.some(doc => doc.type === docType && doc.verified)
        );

        if (missingDocs.length > 0) {
            score += 30;
            factors.push({
                type: 'document',
                severity: 'high',
                message: `Missing required documents: ${missingDocs.join(', ')}`
            });
        }

        // Reduce score based on verification quality
        score += (100 - verificationScore) * 0.3;

        return { score, factors };
    }

    /**
     * Assess transaction volume risk
     */
    assessVolumeRisk(monthlyVolume) {
        const factors = [];
        let score = 0;

        if (monthlyVolume > 100000) {
            score += 20;
            factors.push({
                type: 'volume',
                severity: 'high',
                message: 'High transaction volume requires enhanced monitoring'
            });
        } else if (monthlyVolume > 10000) {
            score += 10;
            factors.push({
                type: 'volume',
                severity: 'medium',
                message: 'Medium transaction volume requires standard monitoring'
            });
        } else {
            factors.push({
                type: 'volume',
                severity: 'low',
                message: 'Low transaction volume poses minimal risk'
            });
        }

        return { score, factors };
    }

    /**
     * Verify individual document
     */
    async verifyDocument(document) {
        try {
            // Basic document validation
            if (!document.filePath || !document.fileSize) {
                return { valid: false, score: 0, reason: 'Invalid document file' };
            }

            // Check file size (max 10MB)
            if (document.fileSize > 10 * 1024 * 1024) {
                return { valid: false, score: 0, reason: 'Document file too large' };
            }

            // Check file type
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(document.mimeType)) {
                return { valid: false, score: 0, reason: 'Invalid file type' };
            }

            // Basic content validation (placeholder for more sophisticated checks)
            const contentValidation = await this.validateDocumentContent(document);
            
            return {
                valid: contentValidation.valid,
                score: contentValidation.score,
                reason: contentValidation.reason || 'Document verified'
            };

        } catch (error) {
            console.error('Document verification error:', error);
            return { valid: false, score: 0, reason: 'Verification failed due to technical error' };
        }
    }

    /**
     * Validate document content (basic implementation)
     */
    async validateDocumentContent(document) {
        // This is a simplified validation - in production, you'd use OCR, ML models, etc.
        
        // Check if file exists and is readable
        try {
            await fs.access(document.filePath);
            
            // Basic file integrity check
            const stats = await fs.stat(document.filePath);
            if (stats.size === 0) {
                return { valid: false, score: 0, reason: 'Empty document file' };
            }

            // For now, assume all accessible documents are valid
            // In production, you'd implement:
            // - OCR text extraction
            // - Document authenticity checks
            // - Data extraction and validation
            // - Cross-reference with databases
            
            return { valid: true, score: 85, reason: 'Document content appears valid' };

        } catch (error) {
            return { valid: false, score: 0, reason: 'Document file not accessible' };
        }
    }

    /**
     * Generate verification requirements for a merchant
     */
    getVerificationRequirements(merchantData, riskLevel) {
        const requirements = {
            documents: [],
            checks: [],
            timeframe: 'standard'
        };

        // TIER 1: Base requirements (ALL merchants)
        requirements.documents.push(
            { type: 'government_id', required: true, description: 'Government-issued photo ID (Passport, Driver\'s License, or National ID)' },
            { type: 'proof_of_address', required: true, description: 'Proof of Address (Utility bill, bank statement, or council tax - less than 3 months old)' }
        );

        // TIER 2: Business verification (ALL merchants)
        requirements.documents.push(
            { type: 'certificate_incorporation', required: true, description: 'Certificate of Incorporation or Business Registration' },
            { type: 'tax_document', required: true, description: 'Tax ID / VAT Registration / EIN Document' }
        );

        // TIER 3: UK-specific requirement
        if (merchantData.country === 'GB') {
            requirements.documents.push(
                { type: 'beneficial_ownership', required: true, description: 'Beneficial Ownership Declaration (UK PSR 2017 requirement - list all owners with 25%+ stake)' }
            );
        }

        // TIER 4: Cannabis-specific requirements
        if (merchantData.businessType && merchantData.businessType.includes('cannabis')) {
            requirements.documents.push(
                { type: 'cannabis_license', required: true, description: 'Valid Cannabis Business License (State/Federal)' }
            );
        }

        // TIER 5: Risk-based additional requirements
        if (riskLevel === 'high') {
            requirements.documents.push(
                { type: 'bank_statement', required: true, description: 'Bank Statements (Last 3-6 months showing business activity)' }
            );
            requirements.checks.push('enhanced_due_diligence');
            requirements.checks.push('source_of_funds_verification');
            requirements.checks.push('beneficial_owner_verification');
            requirements.timeframe = 'extended';
        } else if (riskLevel === 'medium') {
            requirements.documents.push(
                { type: 'bank_statement', required: false, description: 'Bank Statement (Optional but recommended)' }
            );
            requirements.checks.push('standard_due_diligence');
        } else {
            requirements.checks.push('basic_verification');
        }

        return requirements;
    }

    /**
     * Check if merchant meets verification threshold
     */
    meetsVerificationThreshold(riskScore, riskLevel) {
        const threshold = this.verificationThresholds[riskLevel] || 75;
        return riskScore >= threshold;
    }

    /**
     * Generate verification report
     */
    generateVerificationReport(merchantData, riskAssessment, documents) {
        return {
            merchantId: merchantData.id,
            timestamp: new Date(),
            riskScore: riskAssessment.score,
            riskLevel: riskAssessment.level,
            verificationStatus: this.meetsVerificationThreshold(riskAssessment.score, riskAssessment.level) ? 'approved' : 'pending',
            documentsSubmitted: documents.length,
            documentsVerified: documents.filter(d => d.verified).length,
            riskFactors: riskAssessment.factors,
            requirements: this.getVerificationRequirements(merchantData, riskAssessment.level),
            recommendations: this.generateRecommendations(riskAssessment),
            nextSteps: this.generateNextSteps(riskAssessment, documents)
        };
    }

    /**
     * Generate risk mitigation recommendations
     */
    generateRecommendations(riskAssessment) {
        const recommendations = [];

        if (riskAssessment.level === 'high') {
            recommendations.push(
                'Implement enhanced transaction monitoring',
                'Require additional documentation',
                'Conduct manual review by compliance team',
                'Consider enhanced due diligence procedures'
            );
        } else if (riskAssessment.level === 'medium') {
            recommendations.push(
                'Implement standard transaction monitoring',
                'Regular compliance reviews',
                'Monitor for unusual transaction patterns'
            );
        }

        return recommendations;
    }

    /**
     * Generate next steps for verification
     */
    generateNextSteps(riskAssessment, documents) {
        const steps = [];

        if (!this.meetsVerificationThreshold(riskAssessment.score, riskAssessment.level)) {
            steps.push('Submit additional required documents');
            steps.push('Complete enhanced verification process');
        }

        if (riskAssessment.requiresManualReview) {
            steps.push('Awaiting manual compliance review');
        }

        if (steps.length === 0) {
            steps.push('Verification complete - ready for approval');
        }

        return steps;
    }
}

module.exports = KYCService;

