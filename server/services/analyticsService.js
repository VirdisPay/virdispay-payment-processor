/**
 * Analytics Service
 * Provides business intelligence and analytics for VirdisPay
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get revenue analytics for a merchant
  async getRevenueAnalytics(merchantId, period = '30d') {
    const cacheKey = `revenue_${merchantId}_${period}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const dateRange = this.getDateRange(period);
    
    const analytics = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          status: 'completed',
          timestamps: {
            completed: { $gte: dateRange.start, $lte: dateRange.end }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
          minTransaction: { $min: '$amount' },
          maxTransaction: { $max: '$amount' }
        }
      }
    ]);

    const result = analytics[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      minTransaction: 0,
      maxTransaction: 0
    };

    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  // Get transaction trends over time
  async getTransactionTrends(merchantId, period = '30d') {
    const dateRange = this.getDateRange(period);
    const groupBy = this.getGroupByPeriod(period);

    const trends = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          status: 'completed',
          timestamps: {
            completed: { $gte: dateRange.start, $lte: dateRange.end }
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy,
              date: '$timestamps.completed'
            }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return trends;
  }

  // Get customer analytics
  async getCustomerAnalytics(merchantId, period = '30d') {
    const dateRange = this.getDateRange(period);

    const customerData = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          status: 'completed',
          timestamps: {
            completed: { $gte: dateRange.start, $lte: dateRange.end }
          }
        }
      },
      {
        $group: {
          _id: '$customerEmail',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
          firstPurchase: { $min: '$timestamps.completed' },
          lastPurchase: { $max: '$timestamps.completed' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: { $cond: [{ $gt: ['$transactionCount', 1] }, 1, 0] }
          },
          averageCustomerValue: { $avg: '$totalSpent' },
          topCustomers: {
            $push: {
              email: '$_id',
              totalSpent: '$totalSpent',
              transactionCount: '$transactionCount'
            }
          }
        }
      }
    ]);

    const result = customerData[0] || {
      totalCustomers: 0,
      repeatCustomers: 0,
      averageCustomerValue: 0,
      topCustomers: []
    };

    // Sort and limit top customers
    result.topCustomers = result.topCustomers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return result;
  }

  // Get network performance analytics
  async getNetworkAnalytics(merchantId, period = '30d') {
    const dateRange = this.getDateRange(period);

    const networkData = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          status: 'completed',
          timestamps: {
            completed: { $gte: dateRange.start, $lte: dateRange.end }
          }
        }
      },
      {
        $group: {
          _id: '$blockchain',
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageGasFee: { $avg: '$actualGasUsed' },
          successRate: {
            $avg: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return networkData;
  }

  // Get payment method analytics
  async getPaymentMethodAnalytics(merchantId, period = '30d') {
    const dateRange = this.getDateRange(period);

    const paymentData = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          status: 'completed',
          timestamps: {
            completed: { $gte: dateRange.start, $lte: dateRange.end }
          }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return paymentData;
  }

  // Get compliance analytics
  async getComplianceAnalytics(merchantId, period = '30d') {
    const dateRange = this.getDateRange(period);

    const complianceData = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchantId,
          timestamps: {
            created: { $gte: dateRange.start, $lte: dateRange.end }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          kycVerified: {
            $sum: {
              $cond: [{ $eq: ['$compliance.kycVerified', true] }, 1, 0]
            }
          },
          amlChecked: {
            $sum: {
              $cond: [{ $eq: ['$compliance.amlChecked', true] }, 1, 0]
            }
          },
          highRiskTransactions: {
            $sum: {
              $cond: [
                { $gte: ['$compliance.riskScore', 70] }, 1, 0
              ]
            }
          }
        }
      }
    ]);

    const result = complianceData[0] || {
      totalTransactions: 0,
      kycVerified: 0,
      amlChecked: 0,
      highRiskTransactions: 0
    };

    result.kycRate = result.totalTransactions > 0 
      ? (result.kycVerified / result.totalTransactions * 100).toFixed(2)
      : 0;

    result.amlRate = result.totalTransactions > 0 
      ? (result.amlChecked / result.totalTransactions * 100).toFixed(2)
      : 0;

    result.riskRate = result.totalTransactions > 0 
      ? (result.highRiskTransactions / result.totalTransactions * 100).toFixed(2)
      : 0;

    return result;
  }

  // Get comprehensive dashboard data
  async getDashboardAnalytics(merchantId, period = '30d') {
    const [
      revenue,
      trends,
      customers,
      networks,
      paymentMethods,
      compliance
    ] = await Promise.all([
      this.getRevenueAnalytics(merchantId, period),
      this.getTransactionTrends(merchantId, period),
      this.getCustomerAnalytics(merchantId, period),
      this.getNetworkAnalytics(merchantId, period),
      this.getPaymentMethodAnalytics(merchantId, period),
      this.getComplianceAnalytics(merchantId, period)
    ]);

    return {
      revenue,
      trends,
      customers,
      networks,
      paymentMethods,
      compliance,
      period,
      generatedAt: new Date().toISOString()
    };
  }

  // Export data to CSV format
  async exportTransactionData(merchantId, period = '30d', format = 'csv') {
    const dateRange = this.getDateRange(period);
    
    const transactions = await Transaction.find({
      merchantId: merchantId,
      timestamps: {
        completed: { $gte: dateRange.start, $lte: dateRange.end }
      }
    }).sort({ 'timestamps.completed': -1 });

    if (format === 'csv') {
      return this.generateCSV(transactions);
    } else if (format === 'json') {
      return JSON.stringify(transactions, null, 2);
    }

    return transactions;
  }

  // Generate CSV from transaction data
  generateCSV(transactions) {
    const headers = [
      'Transaction ID',
      'Date',
      'Customer Email',
      'Amount',
      'Currency',
      'Network',
      'Status',
      'Gas Fee',
      'Description'
    ];

    const rows = transactions.map(tx => [
      tx.transactionId,
      tx.timestamps.completed?.toISOString() || '',
      tx.customerEmail,
      tx.amount,
      tx.currency,
      tx.blockchain,
      tx.status,
      tx.actualGasUsed || 0,
      tx.metadata?.description || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  // Helper methods
  getDateRange(period) {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
  }

  getGroupByPeriod(period) {
    switch (period) {
      case '7d':
        return '%Y-%m-%d';
      case '30d':
        return '%Y-%m-%d';
      case '90d':
        return '%Y-%m';
      case '1y':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = AnalyticsService;



