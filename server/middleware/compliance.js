/**
 * Compliance Middleware
 * Integrates KYC/AML checks into the payment flow
 */

const KYCService = require('../services/kycService');
const AMLService = require('../services/amlService');
const { MerchantKYCStatus, TransactionMonitoring } = require('../models/kyc');
const { AMLReport, ScreeningResult, MonitoringResult } = require('../models/aml');

const kycService = new KYCService();
const amlService = new AMLService();

/**
 * KYC Verification Middleware
 * Checks if merchant has completed KYC verification
 */
const requireKYCVerification = async (req, res, next) => {
    try {
        const merchantId = req.user.id;

        // Get KYC status
        const kycStatus = await MerchantKYCStatus.findOne({ merchantId });

        if (!kycStatus || kycStatus.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'KYC verification required',
                error: 'KYC_NOT_VERIFIED',
                kycStatus: kycStatus ? {
                    status: kycStatus.status,
                    riskLevel: kycStatus.riskLevel,
                    documentsRequired: kycStatus.documentsRequired,
                    documentsSubmitted: kycStatus.documentsSubmitted,
                    documentsVerified: kycStatus.documentsVerified
                } : null
            });
        }

        // Check if KYC has expired
        if (kycStatus.expiresAt && new Date() > kycStatus.expiresAt) {
            return res.status(403).json({
                success: false,
                message: 'KYC verification has expired',
                error: 'KYC_EXPIRED',
                kycStatus: {
                    status: kycStatus.status,
                    expiresAt: kycStatus.expiresAt
                }
            });
        }

        // Add KYC info to request
        req.kycStatus = kycStatus;
        next();

    } catch (error) {
        console.error('KYC verification middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'KYC verification check failed',
            error: error.message
        });
    }
};

/**
 * AML Screening Middleware
 * Performs AML checks on transactions
 */
const performAMLChecks = async (req, res, next) => {
    try {
        const { amount, currency, customerAddress } = req.body;
        const merchantId = req.user.id;

        // Get merchant data for screening
        const merchantData = await getMerchantData(merchantId);

        // Prepare transaction data
        const transactionData = {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            merchantId,
            amount: parseFloat(amount),
            currency,
            customerAddress,
            timestamp: new Date()
        };

        // Perform AML screening
        const screeningResults = await amlService.screenTransaction(transactionData, merchantData);

        // Get merchant transaction history for monitoring
        const merchantHistory = await getMerchantTransactionHistory(merchantId);

        // Perform transaction monitoring
        const monitoringResults = await amlService.monitorTransaction(transactionData, merchantHistory);

        // Generate comprehensive AML report
        const amlReport = amlService.generateAMLReport(screeningResults, monitoringResults);

        // Check if transaction should be blocked
        if (amlReport.overallRiskLevel === 'high' && amlReport.screeningResults.flagged) {
            return res.status(403).json({
                success: false,
                message: 'Transaction blocked due to compliance requirements',
                error: 'TRANSACTION_BLOCKED',
                amlReport: {
                    overallRiskLevel: amlReport.overallRiskLevel,
                    reason: amlReport.screeningResults.reason,
                    requiredActions: amlReport.requiredActions
                }
            });
        }

        // Save AML results
        await saveAMLResults(screeningResults, monitoringResults, amlReport);

        // Add AML info to request
        req.amlReport = amlReport;
        req.transactionData = transactionData;

        next();

    } catch (error) {
        console.error('AML checks middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'AML compliance check failed',
            error: error.message
        });
    }
};

/**
 * Risk-based Transaction Limits Middleware
 * Applies transaction limits based on KYC risk level
 */
const applyRiskBasedLimits = async (req, res, next) => {
    try {
        const { amount } = req.body;
        const merchantId = req.user.id;

        // Get KYC status
        const kycStatus = req.kycStatus || await MerchantKYCStatus.findOne({ merchantId });

        if (!kycStatus) {
            return res.status(500).json({
                success: false,
                message: 'Unable to determine risk level',
                error: 'RISK_ASSESSMENT_FAILED'
            });
        }

        // Define limits based on risk level
        const limits = {
            low: {
                daily: 50000,    // $50,000
                monthly: 500000, // $500,000
                single: 10000    // $10,000
            },
            medium: {
                daily: 25000,    // $25,000
                monthly: 250000, // $250,000
                single: 5000     // $5,000
            },
            high: {
                daily: 10000,    // $10,000
                monthly: 100000, // $100,000
                single: 2500     // $2,500
            }
        };

        const merchantLimits = limits[kycStatus.riskLevel] || limits.medium;

        // Check single transaction limit
        if (parseFloat(amount) > merchantLimits.single) {
            return res.status(403).json({
                success: false,
                message: 'Transaction exceeds single transaction limit',
                error: 'LIMIT_EXCEEDED',
                details: {
                    requestedAmount: parseFloat(amount),
                    limit: merchantLimits.single,
                    riskLevel: kycStatus.riskLevel
                }
            });
        }

        // Check daily limit
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayTransactions = await getDailyTransactionVolume(merchantId, todayStart);
        const totalToday = todayTransactions.reduce((sum, txn) => sum + txn.amount, 0);

        if (totalToday + parseFloat(amount) > merchantLimits.daily) {
            return res.status(403).json({
                success: false,
                message: 'Transaction would exceed daily limit',
                error: 'DAILY_LIMIT_EXCEEDED',
                details: {
                    requestedAmount: parseFloat(amount),
                    todayTotal: totalToday,
                    limit: merchantLimits.daily,
                    remaining: merchantLimits.daily - totalToday
                }
            });
        }

        // Check monthly limit
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthTransactions = await getMonthlyTransactionVolume(merchantId, monthStart);
        const totalMonth = monthTransactions.reduce((sum, txn) => sum + txn.amount, 0);

        if (totalMonth + parseFloat(amount) > merchantLimits.monthly) {
            return res.status(403).json({
                success: false,
                message: 'Transaction would exceed monthly limit',
                error: 'MONTHLY_LIMIT_EXCEEDED',
                details: {
                    requestedAmount: parseFloat(amount),
                    monthTotal: totalMonth,
                    limit: merchantLimits.monthly,
                    remaining: merchantLimits.monthly - totalMonth
                }
            });
        }

        // Add limits info to request
        req.transactionLimits = merchantLimits;
        req.currentUsage = {
            daily: totalToday,
            monthly: totalMonth
        };

        next();

    } catch (error) {
        console.error('Risk-based limits middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Risk assessment failed',
            error: error.message
        });
    }
};

/**
 * Enhanced Due Diligence Middleware
 * Applies additional checks for high-risk merchants
 */
const enhancedDueDiligence = async (req, res, next) => {
    try {
        const merchantId = req.user.id;
        const kycStatus = req.kycStatus || await MerchantKYCStatus.findOne({ merchantId });

        if (!kycStatus || kycStatus.riskLevel !== 'high') {
            return next(); // Skip for non-high-risk merchants
        }

        const { amount, customerAddress } = req.body;

        // Additional checks for high-risk merchants
        const additionalChecks = [];

        // Check for unusual transaction patterns
        if (parseFloat(amount) > 10000) {
            additionalChecks.push({
                type: 'large_transaction',
                status: 'pending',
                description: 'Large transaction requires additional verification'
            });
        }

        // Check customer address against high-risk jurisdictions
        if (customerAddress) {
            const addressRisk = await checkAddressRisk(customerAddress);
            if (addressRisk.riskLevel === 'high') {
                additionalChecks.push({
                    type: 'high_risk_address',
                    status: 'flagged',
                    description: 'Customer address in high-risk jurisdiction'
                });
            }
        }

        // Check for rapid succession transactions
        const recentTransactions = await getRecentTransactions(merchantId, 1); // Last hour
        if (recentTransactions.length >= 5) {
            additionalChecks.push({
                type: 'rapid_succession',
                status: 'flagged',
                description: 'Multiple transactions in rapid succession'
            });
        }

        // If any checks are flagged, require manual review
        const flaggedChecks = additionalChecks.filter(check => check.status === 'flagged');
        
        if (flaggedChecks.length > 0) {
            return res.status(403).json({
                success: false,
                message: 'Transaction requires enhanced due diligence review',
                error: 'ENHANCED_DUE_DILIGENCE_REQUIRED',
                details: {
                    riskLevel: kycStatus.riskLevel,
                    flaggedChecks: flaggedChecks,
                    additionalChecks: additionalChecks
                }
            });
        }

        // Add enhanced due diligence info to request
        req.enhancedDueDiligence = {
            checks: additionalChecks,
            riskLevel: kycStatus.riskLevel
        };

        next();

    } catch (error) {
        console.error('Enhanced due diligence middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Enhanced due diligence check failed',
            error: error.message
        });
    }
};

// Helper functions (you'd implement these with your database)

async function getMerchantData(merchantId) {
    // Implement database query to get merchant data
    return {
        id: merchantId,
        businessName: 'Sample Business',
        businessType: 'cbd-retail',
        country: 'US'
    };
}

async function getMerchantTransactionHistory(merchantId) {
    // Implement database query to get merchant transaction history
    return [];
}

async function saveAMLResults(screeningResults, monitoringResults, amlReport) {
    try {
        // Save screening results
        const screeningDoc = new ScreeningResult(screeningResults);
        await screeningDoc.save();

        // Save monitoring results
        const monitoringDoc = new MonitoringResult(monitoringResults);
        await monitoringDoc.save();

        // Save AML report
        amlReport.screeningResults = screeningDoc._id;
        amlReport.monitoringResults = monitoringDoc._id;
        const amlDoc = new AMLReport(amlReport);
        await amlDoc.save();

    } catch (error) {
        console.error('Failed to save AML results:', error);
    }
}

async function getDailyTransactionVolume(merchantId, startDate) {
    // Implement database query to get daily transaction volume
    return [];
}

async function getMonthlyTransactionVolume(merchantId, startDate) {
    // Implement database query to get monthly transaction volume
    return [];
}

async function checkAddressRisk(address) {
    // Implement address risk checking
    return { riskLevel: 'low' };
}

async function getRecentTransactions(merchantId, hours) {
    // Implement database query to get recent transactions
    return [];
}

module.exports = {
    requireKYCVerification,
    performAMLChecks,
    applyRiskBasedLimits,
    enhancedDueDiligence
};



