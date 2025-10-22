/**
 * Built-in AML (Anti-Money Laundering) Service
 * Handles transaction monitoring, sanctions screening, and suspicious activity detection
 */

const crypto = require('crypto');

class AMLService {
    constructor() {
        this.sanctionsLists = {
            // Simplified sanctions data - in production, you'd connect to OFAC, UN, EU lists
            individuals: new Set([
                'sanctioned_person_1',
                'sanctioned_person_2'
            ]),
            entities: new Set([
                'sanctioned_entity_1',
                'sanctioned_entity_2'
            ]),
            countries: new Set([
                'IR', 'KP', 'SY', 'CU', 'VE'
            ])
        };

        this.riskThresholds = {
            low: 1000,      // $1000
            medium: 10000,  // $10,000
            high: 50000     // $50,000
        };

        this.suspiciousPatterns = [
            'round_amounts',
            'just_below_threshold',
            'rapid_succession',
            'unusual_timing',
            'high_frequency',
            'structuring'
        ];
    }

    /**
     * Screen transaction against sanctions lists
     */
    async screenTransaction(transactionData, merchantData) {
        const screeningResults = {
            merchantId: merchantData.id,
            transactionId: transactionData.id,
            timestamp: new Date(),
            checks: {
                sanctions: await this.checkSanctions(merchantData, transactionData),
                pep: await this.checkPEP(merchantData), // Politically Exposed Person
                adverse_media: await this.checkAdverseMedia(merchantData)
            },
            riskLevel: 'low',
            flagged: false,
            reason: null
        };

        // Determine overall risk level
        const hasSanctions = screeningResults.checks.sanctions.flagged;
        const hasPEP = screeningResults.checks.pep.flagged;
        const hasAdverseMedia = screeningResults.checks.adverse_media.flagged;

        if (hasSanctions || hasPEP || hasAdverseMedia) {
            screeningResults.riskLevel = 'high';
            screeningResults.flagged = true;
            screeningResults.reason = 'Sanctions/PEP/Adverse Media match';
        }

        return screeningResults;
    }

    /**
     * Check against sanctions lists
     */
    async checkSanctions(merchantData, transactionData) {
        const result = {
            flagged: false,
            matches: [],
            reason: null
        };

        try {
            // Check individual sanctions
            const nameHash = this.generateNameHash(merchantData.businessName);
            if (this.sanctionsLists.individuals.has(nameHash)) {
                result.flagged = true;
                result.matches.push('individual_sanctions');
            }

            // Check entity sanctions
            if (this.sanctionsLists.entities.has(nameHash)) {
                result.flagged = true;
                result.matches.push('entity_sanctions');
            }

            // Check country sanctions
            if (this.sanctionsLists.countries.has(merchantData.country)) {
                result.flagged = true;
                result.matches.push('country_sanctions');
                result.reason = `Country ${merchantData.country} is subject to sanctions`;
            }

            // Check transaction counterparties (if available)
            if (transactionData.customerAddress) {
                const customerCountry = await this.getAddressCountry(transactionData.customerAddress);
                if (customerCountry && this.sanctionsLists.countries.has(customerCountry)) {
                    result.flagged = true;
                    result.matches.push('counterparty_country_sanctions');
                    result.reason = `Customer country ${customerCountry} is subject to sanctions`;
                }
            }

        } catch (error) {
            console.error('Sanctions screening error:', error);
            result.reason = 'Screening error occurred';
        }

        return result;
    }

    /**
     * Check for Politically Exposed Persons (PEP)
     */
    async checkPEP(merchantData) {
        const result = {
            flagged: false,
            matches: [],
            reason: null
        };

        try {
            // Simplified PEP check - in production, you'd connect to PEP databases
            const pepKeywords = ['minister', 'senator', 'mayor', 'judge', 'ambassador'];
            const businessName = merchantData.businessName.toLowerCase();
            
            for (const keyword of pepKeywords) {
                if (businessName.includes(keyword)) {
                    result.flagged = true;
                    result.matches.push('potential_pep');
                    result.reason = `Business name contains potential PEP indicator: ${keyword}`;
                    break;
                }
            }

            // Check owner/beneficial owner names if available
            if (merchantData.beneficialOwners) {
                for (const owner of merchantData.beneficialOwners) {
                    const ownerName = owner.name.toLowerCase();
                    for (const keyword of pepKeywords) {
                        if (ownerName.includes(keyword)) {
                            result.flagged = true;
                            result.matches.push('beneficial_owner_pep');
                            result.reason = `Beneficial owner name contains potential PEP indicator: ${keyword}`;
                            break;
                        }
                    }
                    if (result.flagged) break;
                }
            }

        } catch (error) {
            console.error('PEP screening error:', error);
            result.reason = 'PEP screening error occurred';
        }

        return result;
    }

    /**
     * Check for adverse media mentions
     */
    async checkAdverseMedia(merchantData) {
        const result = {
            flagged: false,
            matches: [],
            reason: null
        };

        try {
            // Simplified adverse media check - in production, you'd use news APIs
            const adverseKeywords = ['fraud', 'money laundering', 'terrorism', 'drug trafficking', 'corruption'];
            const businessName = merchantData.businessName.toLowerCase();
            
            for (const keyword of adverseKeywords) {
                if (businessName.includes(keyword)) {
                    result.flagged = true;
                    result.matches.push('adverse_media');
                    result.reason = `Business name contains adverse media indicator: ${keyword}`;
                    break;
                }
            }

        } catch (error) {
            console.error('Adverse media screening error:', error);
            result.reason = 'Adverse media screening error occurred';
        }

        return result;
    }

    /**
     * Monitor transaction for suspicious patterns
     */
    async monitorTransaction(transaction, merchantHistory) {
        const monitoringResults = {
            transactionId: transaction.id,
            merchantId: transaction.merchantId,
            timestamp: new Date(),
            patterns: [],
            riskScore: 0,
            flagged: false,
            reason: null
        };

        // Check for suspicious patterns
        const patterns = await this.detectSuspiciousPatterns(transaction, merchantHistory);
        monitoringResults.patterns = patterns;

        // Calculate risk score based on patterns
        monitoringResults.riskScore = this.calculatePatternRiskScore(patterns);
        
        // Flag if risk score exceeds threshold
        if (monitoringResults.riskScore > 70) {
            monitoringResults.flagged = true;
            monitoringResults.reason = 'Multiple suspicious patterns detected';
        }

        return monitoringResults;
    }

    /**
     * Detect suspicious transaction patterns
     */
    async detectSuspiciousPatterns(transaction, merchantHistory) {
        const patterns = [];

        // Round amounts pattern
        if (this.isRoundAmount(transaction.amount)) {
            patterns.push({
                type: 'round_amounts',
                severity: 'medium',
                description: 'Transaction amount is a round number',
                details: `Amount: ${transaction.amount}`
            });
        }

        // Just below threshold pattern
        if (this.isJustBelowThreshold(transaction.amount)) {
            patterns.push({
                type: 'just_below_threshold',
                severity: 'high',
                description: 'Transaction amount just below reporting threshold',
                details: `Amount: ${transaction.amount}`
            });
        }

        // Rapid succession pattern
        if (merchantHistory && this.isRapidSuccession(transaction, merchantHistory)) {
            patterns.push({
                type: 'rapid_succession',
                severity: 'high',
                description: 'Multiple transactions in rapid succession',
                details: `Time between transactions: ${this.getTimeBetweenTransactions(transaction, merchantHistory)} minutes`
            });
        }

        // Unusual timing pattern
        if (this.isUnusualTiming(transaction)) {
            patterns.push({
                type: 'unusual_timing',
                severity: 'low',
                description: 'Transaction at unusual time',
                details: `Time: ${transaction.timestamp}`
            });
        }

        // High frequency pattern
        if (merchantHistory && this.isHighFrequency(transaction, merchantHistory)) {
            patterns.push({
                type: 'high_frequency',
                severity: 'medium',
                description: 'Unusually high transaction frequency',
                details: `Transactions in last 24h: ${this.getRecentTransactionCount(merchantHistory)}`
            });
        }

        // Structuring pattern
        if (merchantHistory && this.isStructuring(transaction, merchantHistory)) {
            patterns.push({
                type: 'structuring',
                severity: 'high',
                description: 'Potential structuring to avoid reporting requirements',
                details: 'Multiple transactions just below thresholds'
            });
        }

        return patterns;
    }

    /**
     * Check if amount is a round number
     */
    isRoundAmount(amount) {
        return amount % 100 === 0 || amount % 1000 === 0;
    }

    /**
     * Check if amount is just below a threshold
     */
    isJustBelowThreshold(amount) {
        const thresholds = [10000, 50000, 100000]; // Common AML thresholds
        return thresholds.some(threshold => amount >= threshold * 0.95 && amount < threshold);
    }

    /**
     * Check for rapid succession transactions
     */
    isRapidSuccession(transaction, history) {
        const recentTransactions = history.filter(t => 
            new Date(t.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
        );
        return recentTransactions.length >= 3;
    }

    /**
     * Check for unusual timing
     */
    isUnusualTiming(transaction) {
        const hour = new Date(transaction.timestamp).getHours();
        return hour < 6 || hour > 22; // Outside normal business hours
    }

    /**
     * Check for high frequency transactions
     */
    isHighFrequency(transaction, history) {
        const recentCount = this.getRecentTransactionCount(history);
        return recentCount > 10; // More than 10 transactions in 24h
    }

    /**
     * Check for structuring pattern
     */
    isStructuring(transaction, history) {
        const recentTransactions = history.filter(t => 
            new Date(t.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
        );
        
        const structuringCount = recentTransactions.filter(t => 
            this.isJustBelowThreshold(t.amount)
        ).length;
        
        return structuringCount >= 3;
    }

    /**
     * Calculate risk score based on detected patterns
     */
    calculatePatternRiskScore(patterns) {
        let score = 0;
        
        patterns.forEach(pattern => {
            switch (pattern.severity) {
                case 'high':
                    score += 30;
                    break;
                case 'medium':
                    score += 15;
                    break;
                case 'low':
                    score += 5;
                    break;
            }
        });

        return Math.min(100, score);
    }

    /**
     * Get recent transaction count
     */
    getRecentTransactionCount(history) {
        return history.filter(t => 
            new Date(t.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
    }

    /**
     * Get time between transactions
     */
    getTimeBetweenTransactions(transaction, history) {
        const sortedHistory = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const lastTransaction = sortedHistory[0];
        
        if (!lastTransaction) return 0;
        
        const timeDiff = new Date(transaction.timestamp) - new Date(lastTransaction.timestamp);
        return Math.floor(timeDiff / (1000 * 60)); // minutes
    }

    /**
     * Generate name hash for screening
     */
    generateNameHash(name) {
        return crypto.createHash('sha256')
            .update(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Get country from wallet address (simplified)
     */
    async getAddressCountry(address) {
        // In production, you'd use IP geolocation or other methods
        // For now, return null as placeholder
        return null;
    }

    /**
     * Generate AML report
     */
    generateAMLReport(screeningResults, monitoringResults) {
        return {
            timestamp: new Date(),
            merchantId: screeningResults.merchantId,
            transactionId: screeningResults.transactionId,
            overallRiskLevel: this.calculateOverallRisk(screeningResults, monitoringResults),
            screeningResults,
            monitoringResults,
            recommendations: this.generateAMLRecommendations(screeningResults, monitoringResults),
            requiredActions: this.generateRequiredActions(screeningResults, monitoringResults)
        };
    }

    /**
     * Calculate overall risk level
     */
    calculateOverallRisk(screeningResults, monitoringResults) {
        let riskScore = 0;

        if (screeningResults.flagged) riskScore += 50;
        if (monitoringResults.flagged) riskScore += monitoringResults.riskScore * 0.5;

        if (riskScore >= 80) return 'high';
        if (riskScore >= 40) return 'medium';
        return 'low';
    }

    /**
     * Generate AML recommendations
     */
    generateAMLRecommendations(screeningResults, monitoringResults) {
        const recommendations = [];

        if (screeningResults.flagged) {
            recommendations.push('Block transaction due to sanctions/PEP/adverse media match');
            recommendations.push('Escalate to compliance team for manual review');
        }

        if (monitoringResults.flagged) {
            recommendations.push('Enhanced transaction monitoring required');
            recommendations.push('Consider additional documentation requirements');
        }

        if (recommendations.length === 0) {
            recommendations.push('Transaction appears normal - proceed with standard monitoring');
        }

        return recommendations;
    }

    /**
     * Generate required actions
     */
    generateRequiredActions(screeningResults, monitoringResults) {
        const actions = [];

        if (screeningResults.flagged) {
            actions.push({
                type: 'block_transaction',
                priority: 'high',
                description: 'Block transaction immediately'
            });
            actions.push({
                type: 'manual_review',
                priority: 'high',
                description: 'Manual compliance review required'
            });
        }

        if (monitoringResults.flagged) {
            actions.push({
                type: 'enhanced_monitoring',
                priority: 'medium',
                description: 'Implement enhanced transaction monitoring'
            });
        }

        return actions;
    }
}

module.exports = AMLService;



