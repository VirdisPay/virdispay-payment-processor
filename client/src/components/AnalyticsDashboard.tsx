/**
 * AnalyticsDashboard Component
 * Comprehensive business intelligence dashboard for VirdisPay merchants
 */

import React, { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';

interface AnalyticsData {
  revenue: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    minTransaction: number;
    maxTransaction: number;
  };
  trends: Array<{
    _id: string;
    revenue: number;
    transactions: number;
    averageAmount: number;
  }>;
  customers: {
    totalCustomers: number;
    repeatCustomers: number;
    averageCustomerValue: number;
    topCustomers: Array<{
      email: string;
      totalSpent: number;
      transactionCount: number;
    }>;
  };
  networks: Array<{
    _id: string;
    totalRevenue: number;
    transactionCount: number;
    averageGasFee: number;
    successRate: number;
  }>;
  paymentMethods: Array<{
    _id: string;
    totalRevenue: number;
    transactionCount: number;
    averageAmount: number;
  }>;
  compliance: {
    totalTransactions: number;
    kycVerified: number;
    amlChecked: number;
    highRiskTransactions: number;
    kycRate: string;
    amlRate: string;
    riskRate: string;
  };
  period: string;
  generatedAt: string;
}

interface AnalyticsDashboardProps {
  token: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ token }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers' | 'networks'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/dashboard?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalyticsData(data.analytics);
    } catch (error) {
      console.error('Analytics load error:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/analytics/export?period=${selectedPeriod}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${selectedPeriod}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadAnalytics} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="analytics-dashboard">
        <div className="no-data-state">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="header-content">
          <h2>📊 Analytics Dashboard</h2>
          <p>Business intelligence and insights for your payment processing</p>
        </div>
        
        <div className="header-controls">
          <div className="period-selector">
            <label>Period:</label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="period-select"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          
          <div className="export-buttons">
            <button 
              onClick={() => exportData('csv')}
              className="export-button csv"
            >
              📄 Export CSV
            </button>
            <button 
              onClick={() => exportData('json')}
              className="export-button json"
            >
              📋 Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="analytics-tabs">
        {[
          { key: 'overview', label: 'Overview', icon: '📈' },
          { key: 'revenue', label: 'Revenue', icon: '💰' },
          { key: 'customers', label: 'Customers', icon: '👥' },
          { key: 'networks', label: 'Networks', icon: '🌐' }
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="analytics-content">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">💰</div>
              <div className="metric-content">
                <div className="metric-value">{formatCurrency(analyticsData.revenue.totalRevenue)}</div>
                <div className="metric-label">Total Revenue</div>
                <div className="metric-period">{getPeriodLabel(selectedPeriod)}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <div className="metric-value">{formatNumber(analyticsData.revenue.totalTransactions)}</div>
                <div className="metric-label">Total Transactions</div>
                <div className="metric-period">{getPeriodLabel(selectedPeriod)}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-value">{formatCurrency(analyticsData.revenue.averageTransaction)}</div>
                <div className="metric-label">Average Transaction</div>
                <div className="metric-period">{getPeriodLabel(selectedPeriod)}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <div className="metric-value">{formatNumber(analyticsData.customers.totalCustomers)}</div>
                <div className="metric-label">Total Customers</div>
                <div className="metric-period">{getPeriodLabel(selectedPeriod)}</div>
              </div>
            </div>
          </div>

          {/* Revenue Trends Chart */}
          <div className="chart-container">
            <h3>📈 Revenue Trends</h3>
            <div className="trends-chart">
              {analyticsData.trends.map((trend, index) => (
                <div key={trend._id} className="trend-bar">
                  <div 
                    className="trend-bar-fill"
                    style={{ 
                      height: `${(trend.revenue / Math.max(...analyticsData.trends.map(t => t.revenue))) * 100}%` 
                    }}
                  ></div>
                  <div className="trend-label">{trend._id}</div>
                  <div className="trend-value">{formatCurrency(trend.revenue)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Networks */}
          <div className="networks-overview">
            <h3>🌐 Network Performance</h3>
            <div className="networks-grid">
              {analyticsData.networks.map(network => (
                <div key={network._id} className="network-card">
                  <div className="network-name">{network._id}</div>
                  <div className="network-stats">
                    <div className="network-stat">
                      <span className="stat-label">Revenue:</span>
                      <span className="stat-value">{formatCurrency(network.totalRevenue)}</span>
                    </div>
                    <div className="network-stat">
                      <span className="stat-label">Transactions:</span>
                      <span className="stat-value">{formatNumber(network.transactionCount)}</span>
                    </div>
                    <div className="network-stat">
                      <span className="stat-label">Success Rate:</span>
                      <span className="stat-value">{(network.successRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="analytics-content">
          <div className="revenue-details">
            <h3>💰 Revenue Analytics</h3>
            
            <div className="revenue-stats">
              <div className="revenue-stat">
                <div className="stat-value">{formatCurrency(analyticsData.revenue.totalRevenue)}</div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="revenue-stat">
                <div className="stat-value">{formatCurrency(analyticsData.revenue.averageTransaction)}</div>
                <div className="stat-label">Average Transaction</div>
              </div>
              <div className="revenue-stat">
                <div className="stat-value">{formatCurrency(analyticsData.revenue.minTransaction)}</div>
                <div className="stat-label">Smallest Transaction</div>
              </div>
              <div className="revenue-stat">
                <div className="stat-value">{formatCurrency(analyticsData.revenue.maxTransaction)}</div>
                <div className="stat-label">Largest Transaction</div>
              </div>
            </div>

            <div className="payment-methods">
              <h4>Payment Methods</h4>
              <div className="payment-methods-list">
                {analyticsData.paymentMethods.map(method => (
                  <div key={method._id} className="payment-method-item">
                    <div className="method-name">{method._id}</div>
                    <div className="method-stats">
                      <span>{formatCurrency(method.totalRevenue)}</span>
                      <span>({formatNumber(method.transactionCount)} transactions)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="analytics-content">
          <div className="customer-details">
            <h3>👥 Customer Analytics</h3>
            
            <div className="customer-stats">
              <div className="customer-stat">
                <div className="stat-value">{formatNumber(analyticsData.customers.totalCustomers)}</div>
                <div className="stat-label">Total Customers</div>
              </div>
              <div className="customer-stat">
                <div className="stat-value">{formatNumber(analyticsData.customers.repeatCustomers)}</div>
                <div className="stat-label">Repeat Customers</div>
              </div>
              <div className="customer-stat">
                <div className="stat-value">{formatCurrency(analyticsData.customers.averageCustomerValue)}</div>
                <div className="stat-label">Average Customer Value</div>
              </div>
            </div>

            <div className="top-customers">
              <h4>Top Customers</h4>
              <div className="top-customers-list">
                {analyticsData.customers.topCustomers.map((customer, index) => (
                  <div key={customer.email} className="customer-item">
                    <div className="customer-rank">#{index + 1}</div>
                    <div className="customer-email">{customer.email}</div>
                    <div className="customer-value">{formatCurrency(customer.totalSpent)}</div>
                    <div className="customer-transactions">{customer.transactionCount} transactions</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Networks Tab */}
      {activeTab === 'networks' && (
        <div className="analytics-content">
          <div className="network-details">
            <h3>🌐 Network Performance</h3>
            
            <div className="networks-list">
              {analyticsData.networks.map(network => (
                <div key={network._id} className="network-item">
                  <div className="network-header">
                    <div className="network-name">{network._id}</div>
                    <div className="network-success-rate">
                      {(network.successRate * 100).toFixed(1)}% Success Rate
                    </div>
                  </div>
                  
                  <div className="network-stats">
                    <div className="network-stat">
                      <span className="stat-label">Total Revenue:</span>
                      <span className="stat-value">{formatCurrency(network.totalRevenue)}</span>
                    </div>
                    <div className="network-stat">
                      <span className="stat-label">Transactions:</span>
                      <span className="stat-value">{formatNumber(network.transactionCount)}</span>
                    </div>
                    <div className="network-stat">
                      <span className="stat-label">Average Gas Fee:</span>
                      <span className="stat-value">{network.averageGasFee.toFixed(6)} ETH</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="analytics-footer">
        <p>Data generated on {new Date(analyticsData.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;



