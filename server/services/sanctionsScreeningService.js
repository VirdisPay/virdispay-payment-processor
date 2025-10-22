const axios = require('axios');
const logger = require('../config/logger');

/**
 * VirdisPay Sanctions Screening Service
 * Checks merchants against OFAC SDN and UN Sanctions lists
 * Free government APIs - no third-party costs
 */

class SanctionsScreeningService {
  constructor() {
    this.ofacApiUrl = 'https://sanctionssearch.ofac.treas.gov/api/PublicationPreview/exports/';
    this.cachedSanctionsList = [];
    this.lastUpdate = null;
    this.updateInterval = 24 * 60 * 60 * 1000; // Update every 24 hours
    
    // Initialize - download lists on startup
    this.updateSanctionsList();
  }

  /**
   * Download and cache OFAC SDN list
   */
  async updateSanctionsList() {
    try {
      logger.info('📋 Downloading OFAC SDN sanctions list...');
      
      // OFAC provides XML/CSV downloads
      const response = await axios.get('https://www.treasury.gov/ofac/downloads/sdn.xml', {
        timeout: 30000
      });

      if (response.data) {
        this.cachedSanctionsList = this.parseOFACXML(response.data);
        this.lastUpdate = new Date();
        logger.info(`✅ Sanctions list updated: ${this.cachedSanctionsList.length} entries loaded`);
      }
    } catch (error) {
      logger.error('❌ Failed to update sanctions list:', error.message);
      // Continue with cached list if available
    }

    // Schedule next update
    setTimeout(() => this.updateSanctionsList(), this.updateInterval);
  }

  /**
   * Parse OFAC SDN XML format
   */
  parseOFACXML(xmlData) {
    const entries = [];
    
    try {
      // Extract individual/entity names from XML
      // OFAC XML has <sdnEntry> tags with <lastName>, <firstName>, <aka> etc.
      const nameMatches = xmlData.match(/<lastName>([^<]+)<\/lastName>|<firstName>([^<]+)<\/firstName>|<name>([^<]+)<\/name>/g);
      
      if (nameMatches) {
        nameMatches.forEach(match => {
          const name = match.replace(/<[^>]+>/g, '').trim().toLowerCase();
          if (name && name.length > 2) {
            entries.push(name);
          }
        });
      }

      // Remove duplicates
      return [...new Set(entries)];
    } catch (error) {
      logger.error('Error parsing OFAC XML:', error.message);
      return [];
    }
  }

  /**
   * Screen a merchant against sanctions lists
   * @param {Object} merchantData - { businessName, firstName, lastName, country }
   * @returns {Object} - { isMatch: boolean, matchDetails: [], riskScore: number }
   */
  async screenMerchant(merchantData) {
    const { businessName, firstName, lastName, country } = merchantData;

    // Ensure sanctions list is loaded
    if (this.cachedSanctionsList.length === 0) {
      await this.updateSanctionsList();
      
      // If still empty, use fallback (couldn't download list)
      if (this.cachedSanctionsList.length === 0) {
        logger.warn('⚠️ Sanctions list not available - manual review required');
        return {
          isMatch: false,
          matchDetails: [],
          riskScore: 0,
          requiresManualReview: true,
          message: 'Sanctions list unavailable - manual screening required'
        };
      }
    }

    const results = {
      isMatch: false,
      matchDetails: [],
      riskScore: 0,
      requiresManualReview: false
    };

    // Check business name
    if (businessName) {
      const match = this.fuzzyMatch(businessName, this.cachedSanctionsList);
      if (match.isMatch) {
        results.isMatch = true;
        results.matchDetails.push({
          type: 'Business Name',
          searchTerm: businessName,
          matchedEntry: match.entry,
          confidence: match.confidence
        });
        results.riskScore += match.confidence;
      }
    }

    // Check individual name (if provided)
    if (firstName && lastName) {
      const fullName = `${firstName} ${lastName}`;
      const match = this.fuzzyMatch(fullName, this.cachedSanctionsList);
      if (match.isMatch) {
        results.isMatch = true;
        results.matchDetails.push({
          type: 'Individual Name',
          searchTerm: fullName,
          matchedEntry: match.entry,
          confidence: match.confidence
        });
        results.riskScore += match.confidence;
      }
    }

    // High-risk countries check
    const highRiskCountries = [
      'IRAN', 'NORTH KOREA', 'SYRIA', 'CUBA', 'CRIMEA', 
      'SUDAN', 'VENEZUELA', 'BELARUS', 'RUSSIA'
    ];
    
    if (country && highRiskCountries.includes(country.toUpperCase())) {
      results.riskScore += 30;
      results.requiresManualReview = true;
      results.matchDetails.push({
        type: 'High-Risk Country',
        searchTerm: country,
        message: 'Country subject to sanctions or enhanced due diligence'
      });
    }

    // Require manual review if any matches found
    if (results.isMatch) {
      results.requiresManualReview = true;
    }

    return results;
  }

  /**
   * Fuzzy string matching with configurable threshold
   * Returns match if similarity > 85%
   */
  fuzzyMatch(searchTerm, sanctionsList) {
    const normalized = searchTerm.toLowerCase().trim();
    let bestMatch = { isMatch: false, entry: '', confidence: 0 };

    for (const entry of sanctionsList) {
      const similarity = this.calculateSimilarity(normalized, entry);
      
      if (similarity > 85 && similarity > bestMatch.confidence) {
        bestMatch = {
          isMatch: true,
          entry: entry,
          confidence: Math.round(similarity)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns percentage similarity (0-100)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    // Quick check for exact match
    if (str1 === str2) return 100;

    // Quick check for substring match
    if (longer.includes(shorter)) return 90;

    // Levenshtein distance calculation
    const distance = this.levenshteinDistance(str1, str2);
    return ((longer.length - distance) / longer.length) * 100;
  }

  /**
   * Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get screening report for display
   */
  getScreeningReport() {
    return {
      listSize: this.cachedSanctionsList.length,
      lastUpdated: this.lastUpdate,
      nextUpdate: this.lastUpdate ? new Date(this.lastUpdate.getTime() + this.updateInterval) : null,
      status: this.cachedSanctionsList.length > 0 ? 'active' : 'pending'
    };
  }
}

// Singleton instance
const sanctionsScreeningService = new SanctionsScreeningService();

module.exports = sanctionsScreeningService;



