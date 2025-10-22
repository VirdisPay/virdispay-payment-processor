import React, { useState, useEffect } from 'react';

interface NetworkStatus {
  key: string;
  name: string;
  gasPriceGwei: number;
  estimatedCost: number;
  speed: string;
  reliability: number;
  isOptimal: boolean;
}

interface RoutingAnalytics {
  totalPayments: number;
  totalSavings: number;
  averageSavings: number;
  networkUsage: Record<string, number>;
  recommendations: Array<{
    type: string;
    message: string;
    impact: string;
  }>;
}

interface SmartRoutingDashboardProps {
  merchantId: string;
}

const SmartRoutingDashboard: React.FC<SmartRoutingDashboardProps> = ({ merchantId }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>([]);
  const [analytics, setAnalytics] = useState<RoutingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadNetworkStatus();
    loadAnalytics();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadNetworkStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [merchantId, timeRange]);

  const loadNetworkStatus = async () => {
    try {
      const response = await fetch('/api/smart-routing/status');
      const data = await response.json();
      
      if (data.success) {
        setNetworkStatus(data.status.networks);
      }
    } catch (error) {
      console.error('Failed to load network status:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/smart-routing/analytics/${merchantId}?timeRange=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      setError('Failed to load routing analytics');
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'very-fast': return '#10b981'; // green
      case 'fast': return '#3b82f6'; // blue
      case 'medium': return '#f59e0b'; // yellow
      case 'slow': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'very-fast': return '⚡';
      case 'fast': return '🚀';
      case 'medium': return '⏱️';
      case 'slow': return '🐌';
      default: return '❓';
    }
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatSavings = (savings: number) => {
    if (savings < 0.01) return `$${savings.toFixed(4)}`;
    if (savings < 1) return `$${savings.toFixed(3)}`;
    return `$${savings.toFixed(2)}`;
  };

  return (
    <div className="smart-routing-dashboard">
      <div className="dashboard-header">
        <h2>🎯 Smart Payment Routing</h2>
        <p>Automatically route payments to the cheapest and fastest networks</p>
      </div>

      {/* Network Status */}
      <div className="network-status-section">
        <h3>🌐 Real-Time Network Status</h3>
        <div className="network-grid">
          {networkStatus.map((network) => (
            <div key={network.key} className={`network-card ${network.isOptimal ? 'optimal' : ''}`}>
              <div className="network-header">
                <h4>{network.name}</h4>
                {network.isOptimal && <span className="optimal-badge">OPTIMAL</span>}
              </div>
              <div className="network-stats">
                <div className="stat">
                  <span className="stat-label">Gas Price:</span>
                  <span className="stat-value">{network.gasPriceGwei?.toFixed(2) || 'N/A'} Gwei</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Est. Cost:</span>
                  <span className="stat-value">{formatCost(network.estimatedCost || 0)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Speed:</span>
                  <span 
                    className="stat-value speed-indicator"
                    style={{ color: getSpeedColor(network.speed) }}
                  >
                    {getSpeedIcon(network.speed)} {network.speed.replace('-', ' ')}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Reliability:</span>
                  <span className="stat-value">{(network.reliability * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <div className="analytics-section">
        <div className="analytics-header">
          <h3>📊 Routing Analytics</h3>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-selector"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading analytics...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : analytics ? (
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>💰 Total Savings</h4>
              <div className="savings-amount">
                {formatSavings(analytics.totalSavings)}
              </div>
              <p>Average: {formatSavings(analytics.averageSavings)} per payment</p>
            </div>

            <div className="analytics-card">
              <h4>📈 Payment Volume</h4>
              <div className="payment-count">
                {analytics.totalPayments}
              </div>
              <p>Payments processed</p>
            </div>

            <div className="analytics-card">
              <h4>🌐 Network Usage</h4>
              <div className="network-usage">
                {Object.entries(analytics.networkUsage).map(([network, count]) => (
                  <div key={network} className="usage-item">
                    <span className="network-name">{network}</span>
                    <span className="usage-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card recommendations">
              <h4>💡 Recommendations</h4>
              {analytics.recommendations.length > 0 ? (
                <div className="recommendations-list">
                  {analytics.recommendations.map((rec, index) => (
                    <div key={index} className="recommendation">
                      <div className="recommendation-message">{rec.message}</div>
                      <div className="recommendation-impact">{rec.impact}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No recommendations at this time. Your routing is optimized! 🎉</p>
              )}
            </div>
          </div>
        ) : (
          <div className="no-data">No analytics data available</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-button"
            onClick={() => loadNetworkStatus()}
          >
            🔄 Refresh Status
          </button>
          <button 
            className="action-button"
            onClick={() => loadAnalytics()}
          >
            📊 Refresh Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartRoutingDashboard;



