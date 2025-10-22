import React, { useState, useEffect } from 'react';

interface ConversionTransaction {
  _id: string;
  conversionId: string;
  cryptoAmount: string;
  cryptoCurrency: string;
  fiatAmount: number;
  fiatCurrency: string;
  status: string;
  fees: {
    total: number;
    conversion: number;
    network: number;
    banking: number;
  };
  timestamps: {
    initiated: string;
    processed?: string;
    completed?: string;
    failed?: string;
  };
  payoutDetails?: {
    payoutStatus: string;
    estimatedArrival?: string;
    actualArrival?: string;
  };
}

interface ConversionStats {
  totalConversions: number;
  totalFiatAmount: number;
  totalFees: number;
  completedConversions: number;
  failedConversions: number;
  avgProcessingTime: number;
}

const FiatConversionDashboard: React.FC = () => {
  const [conversions, setConversions] = useState<ConversionTransaction[]>([]);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Load conversion history
      const historyResponse = await fetch('/api/fiat-conversion/history?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setConversions(historyData.conversions);
      }

      // Load statistics
      const statsResponse = await fetch(`/api/fiat-conversion/stats?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      setError('Failed to load conversion data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProcessingTime = (conversion: ConversionTransaction) => {
    if (conversion.timestamps.completed) {
      const start = new Date(conversion.timestamps.initiated).getTime();
      const end = new Date(conversion.timestamps.completed).getTime();
      const hours = Math.round((end - start) / (1000 * 60 * 60));
      return `${hours}h`;
    }
    return 'N/A';
  };

  if (loading) {
    return <div className="loading">Loading conversion data...</div>;
  }

  return (
    <div className="fiat-conversion-dashboard">
      <div className="dashboard-header">
        <h2>Fiat Conversion Dashboard</h2>
        <div className="period-selector">
          <label>Period:</label>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Conversions</h3>
            <div className="stat-value">{stats.totalConversions}</div>
            <div className="stat-label">Conversions processed</div>
          </div>

          <div className="stat-card">
            <h3>Total Fiat Amount</h3>
            <div className="stat-value">{formatCurrency(stats.totalFiatAmount, 'USD')}</div>
            <div className="stat-label">Converted to fiat</div>
          </div>

          <div className="stat-card">
            <h3>Total Fees</h3>
            <div className="stat-value">{formatCurrency(stats.totalFees, 'USD')}</div>
            <div className="stat-label">Conversion fees</div>
          </div>

          <div className="stat-card">
            <h3>Success Rate</h3>
            <div className="stat-value">
              {stats.totalConversions > 0 
                ? `${Math.round((stats.completedConversions / stats.totalConversions) * 100)}%`
                : '0%'
              }
            </div>
            <div className="stat-label">Successful conversions</div>
          </div>

          <div className="stat-card">
            <h3>Avg Processing Time</h3>
            <div className="stat-value">
              {stats.avgProcessingTime > 0 
                ? `${Math.round(stats.avgProcessingTime / (1000 * 60 * 60))}h`
                : 'N/A'
              }
            </div>
            <div className="stat-label">Time to complete</div>
          </div>
        </div>
      )}

      {/* Recent Conversions */}
      <div className="conversions-section">
        <div className="section-header">
          <h3>Recent Conversions</h3>
          <button onClick={loadData} className="refresh-button">Refresh</button>
        </div>

        <div className="conversions-list">
          {conversions.length === 0 ? (
            <div className="no-conversions">
              <p>No conversions found for the selected period.</p>
            </div>
          ) : (
            conversions.map((conversion) => (
              <div key={conversion._id} className="conversion-item">
                <div className="conversion-info">
                  <div className="conversion-amount">
                    {conversion.cryptoAmount} {conversion.cryptoCurrency} → {formatCurrency(conversion.fiatAmount, conversion.fiatCurrency)}
                  </div>
                  <div className="conversion-details">
                    <span className="conversion-id">ID: {conversion.conversionId}</span>
                    <span className="conversion-date">{formatDate(conversion.timestamps.initiated)}</span>
                    <span className="conversion-fees">Fees: {formatCurrency(conversion.fees.total, conversion.fiatCurrency)}</span>
                  </div>
                  {conversion.payoutDetails && (
                    <div className="payout-info">
                      <span className="payout-status">
                        Payout: {conversion.payoutDetails.payoutStatus}
                      </span>
                      {conversion.payoutDetails.estimatedArrival && (
                        <span className="estimated-arrival">
                          Est. arrival: {formatDate(conversion.payoutDetails.estimatedArrival)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="conversion-status">
                  <div className={`status-badge ${getStatusColor(conversion.status)}`}>
                    {conversion.status}
                  </div>
                  <div className="processing-time">
                    {getProcessingTime(conversion)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversion Estimate Tool */}
      <div className="estimate-section">
        <h3>Conversion Estimate</h3>
        <ConversionEstimator />
      </div>
    </div>
  );
};

// Conversion Estimator Component
const ConversionEstimator: React.FC = () => {
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDC');
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = async () => {
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fiat-conversion/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cryptoAmount: parseFloat(cryptoAmount),
          cryptoCurrency,
          fiatCurrency
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEstimate(data.estimate);
      }
    } catch (error) {
      console.error('Estimate failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="conversion-estimator">
      <div className="estimator-form">
        <div className="form-row">
          <div className="form-group">
            <label>Crypto Amount</label>
            <input
              type="number"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>From</label>
            <select value={cryptoCurrency} onChange={(e) => setCryptoCurrency(e.target.value)}>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="DAI">DAI</option>
              <option value="ETH">ETH</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
          <div className="form-group">
            <label>To</label>
            <select value={fiatCurrency} onChange={(e) => setFiatCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          <button onClick={handleEstimate} disabled={loading || !cryptoAmount}>
            {loading ? 'Calculating...' : 'Estimate'}
          </button>
        </div>
      </div>

      {estimate && (
        <div className="estimate-result">
          <div className="estimate-amount">
            <strong>{cryptoAmount} {cryptoCurrency}</strong> = <strong>{estimate.fiatAmount.toFixed(2)} {fiatCurrency}</strong>
          </div>
          <div className="estimate-details">
            <div>Exchange Rate: 1 {cryptoCurrency} = {estimate.exchangeRate.toFixed(4)} {fiatCurrency}</div>
            <div>Fees: {estimate.fees.total.toFixed(2)} {fiatCurrency}</div>
            <div className="net-amount">Net Amount: {estimate.netAmount.toFixed(2)} {fiatCurrency}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiatConversionDashboard;

