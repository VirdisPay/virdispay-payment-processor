/**
 * RateLimitDashboard Component
 * Provides rate limiting monitoring and management interface
 */

import React, { useState, useEffect } from 'react';
import './RateLimitDashboard.css';

interface RateLimitStatus {
  endpoint: string;
  tier: string;
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
  window: number;
  windowMinutes: number;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
}

interface RateLimitConfig {
  [endpoint: string]: {
    requests: number;
    window: number;
    windowMinutes: number;
    tier: string;
  };
}

interface RateLimitStats {
  totalKeys: number;
  activeLimits: {
    [endpoint: string]: {
      totalRequests: number;
      uniqueCount: number;
    };
  };
  violations: number;
  whitelistedIPs: number;
  blacklistedIPs: number;
}

interface RateLimitDashboardProps {
  token: string;
  isAdmin?: boolean;
}

const RateLimitDashboard: React.FC<RateLimitDashboardProps> = ({ token, isAdmin = false }) => {
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [rateLimitConfig, setRateLimitConfig] = useState<RateLimitConfig | null>(null);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState('general');
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'stats' | 'management'>('status');

  useEffect(() => {
    loadRateLimitData();
  }, [selectedEndpoint]);

  const loadRateLimitData = async () => {
    try {
      setLoading(true);
      
      // Load rate limit status
      const statusResponse = await fetch(`/api/rate-limit/status?endpoint=${selectedEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setRateLimitStatus(statusData.rateLimit);
      }

      // Load rate limit configuration
      const configResponse = await fetch('/api/rate-limit/limits', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setRateLimitConfig(configData.limits);
      }

      // Load admin stats if user is admin
      if (isAdmin) {
        const statsResponse = await fetch('/api/rate-limit/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setRateLimitStats(statsData.stats);
        }
      }

    } catch (error) {
      console.error('Rate limit data load error:', error);
      setError('Failed to load rate limit data');
    } finally {
      setLoading(false);
    }
  };

  const resetRateLimit = async (identifier: string, endpoint: string) => {
    try {
      const response = await fetch('/api/rate-limit/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, endpoint })
      });

      if (response.ok) {
        alert('Rate limit reset successfully');
        loadRateLimitData();
      } else {
        const errorData = await response.json();
        alert(`Failed to reset rate limit: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Reset rate limit error:', error);
      alert('Failed to reset rate limit');
    }
  };

  const addToWhitelist = async (ip: string) => {
    try {
      const response = await fetch('/api/rate-limit/whitelist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip })
      });

      if (response.ok) {
        alert('IP added to whitelist successfully');
        loadRateLimitData();
      } else {
        const errorData = await response.json();
        alert(`Failed to add IP to whitelist: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Add to whitelist error:', error);
      alert('Failed to add IP to whitelist');
    }
  };

  const addToBlacklist = async (ip: string, reason: string) => {
    try {
      const response = await fetch('/api/rate-limit/blacklist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip, reason })
      });

      if (response.ok) {
        alert('IP added to blacklist successfully');
        loadRateLimitData();
      } else {
        const errorData = await response.json();
        alert(`Failed to add IP to blacklist: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Add to blacklist error:', error);
      alert('Failed to add IP to blacklist');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (60 * 1000));
    const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getProgressPercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return '#dc3545'; // Red
    if (percentage >= 70) return '#ffc107'; // Yellow
    return '#28a745'; // Green
  };

  if (loading) {
    return (
      <div className="rate-limit-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading rate limit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rate-limit-dashboard">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadRateLimitData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rate-limit-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>🛡️ Rate Limiting Dashboard</h2>
          <p>Monitor and manage API rate limits</p>
        </div>
        
        <div className="header-controls">
          <div className="endpoint-selector">
            <label>Endpoint:</label>
            <select 
              value={selectedEndpoint} 
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="endpoint-select"
            >
              <option value="general">General API</option>
              <option value="auth">Authentication</option>
              <option value="payments">Payments</option>
              <option value="analytics">Analytics</option>
              <option value="compliance">Compliance</option>
              <option value="security">Security</option>
              <option value="upload">Upload</option>
            </select>
          </div>
          
          <button onClick={loadRateLimitData} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="rate-limit-tabs">
        {[
          { key: 'status', label: 'Status', icon: '📊' },
          { key: 'config', label: 'Configuration', icon: '⚙️' },
          ...(isAdmin ? [
            { key: 'stats', label: 'Statistics', icon: '📈' },
            { key: 'management', label: 'Management', icon: '🔧' }
          ] : [])
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

      {/* Status Tab */}
      {activeTab === 'status' && rateLimitStatus && (
        <div className="rate-limit-content">
          <div className="status-overview">
            <h3>📊 Rate Limit Status</h3>
            
            <div className="status-cards">
              <div className="status-card">
                <div className="status-icon">🎯</div>
                <div className="status-content">
                  <div className="status-value">{rateLimitStatus.remaining}</div>
                  <div className="status-label">Requests Remaining</div>
                  <div className="status-sublabel">out of {rateLimitStatus.limit}</div>
                </div>
              </div>

              <div className="status-card">
                <div className="status-icon">⏰</div>
                <div className="status-content">
                  <div className="status-value">{formatTime(rateLimitStatus.resetTime)}</div>
                  <div className="status-label">Reset Time</div>
                  <div className="status-sublabel">Window: {rateLimitStatus.windowMinutes} minutes</div>
                </div>
              </div>

              <div className="status-card">
                <div className="status-icon">👤</div>
                <div className="status-content">
                  <div className="status-value">{rateLimitStatus.tier}</div>
                  <div className="status-label">User Tier</div>
                  <div className="status-sublabel">Endpoint: {rateLimitStatus.endpoint}</div>
                </div>
              </div>
            </div>

            <div className="progress-section">
              <h4>Usage Progress</h4>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${getProgressPercentage(rateLimitStatus.current, rateLimitStatus.limit)}%`,
                      backgroundColor: getProgressColor(getProgressPercentage(rateLimitStatus.current, rateLimitStatus.limit))
                    }}
                  ></div>
                </div>
                <div className="progress-text">
                  {rateLimitStatus.current} / {rateLimitStatus.limit} requests used
                </div>
              </div>
            </div>

            {rateLimitStatus.isWhitelisted && (
              <div className="whitelist-notice">
                ✅ Your IP is whitelisted - rate limits do not apply
              </div>
            )}

            {rateLimitStatus.isBlacklisted && (
              <div className="blacklist-notice">
                ❌ Your IP is blacklisted - access is restricted
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && rateLimitConfig && (
        <div className="rate-limit-content">
          <div className="config-overview">
            <h3>⚙️ Rate Limit Configuration</h3>
            
            <div className="config-grid">
              {Object.entries(rateLimitConfig).map(([endpoint, config]) => (
                <div key={endpoint} className="config-card">
                  <div className="config-header">
                    <div className="config-endpoint">{endpoint}</div>
                    <div className="config-tier">{config.tier}</div>
                  </div>
                  
                  <div className="config-details">
                    <div className="config-item">
                      <span className="config-label">Requests:</span>
                      <span className="config-value">{config.requests}</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Window:</span>
                      <span className="config-value">{config.windowMinutes} minutes</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Per Minute:</span>
                      <span className="config-value">{Math.round(config.requests / config.windowMinutes)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Tab (Admin Only) */}
      {activeTab === 'stats' && isAdmin && rateLimitStats && (
        <div className="rate-limit-content">
          <div className="stats-overview">
            <h3>📈 Rate Limiting Statistics</h3>
            
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">🗝️</div>
                <div className="stat-content">
                  <div className="stat-value">{rateLimitStats.totalKeys}</div>
                  <div className="stat-label">Active Rate Limits</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{rateLimitStats.whitelistedIPs}</div>
                  <div className="stat-label">Whitelisted IPs</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">❌</div>
                <div className="stat-content">
                  <div className="stat-value">{rateLimitStats.blacklistedIPs}</div>
                  <div className="stat-label">Blacklisted IPs</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-content">
                  <div className="stat-value">{rateLimitStats.violations}</div>
                  <div className="stat-label">Violations</div>
                </div>
              </div>
            </div>

            <div className="endpoint-stats">
              <h4>Endpoint Activity</h4>
              <div className="endpoint-stats-list">
                {Object.entries(rateLimitStats.activeLimits).map(([endpoint, stats]) => (
                  <div key={endpoint} className="endpoint-stat-item">
                    <div className="endpoint-name">{endpoint}</div>
                    <div className="endpoint-stats-details">
                      <span>{stats.totalRequests} total requests</span>
                      <span>{stats.uniqueCount} unique users</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Tab (Admin Only) */}
      {activeTab === 'management' && isAdmin && (
        <div className="rate-limit-content">
          <div className="management-overview">
            <h3>🔧 Rate Limiting Management</h3>
            
            <div className="management-sections">
              <div className="management-section">
                <h4>Reset Rate Limits</h4>
                <div className="management-form">
                  <input 
                    type="text" 
                    placeholder="User ID or IP Address"
                    className="management-input"
                    id="reset-identifier"
                  />
                  <input 
                    type="text" 
                    placeholder="Endpoint (e.g., auth, payments)"
                    className="management-input"
                    id="reset-endpoint"
                  />
                  <button 
                    onClick={() => {
                      const identifier = (document.getElementById('reset-identifier') as HTMLInputElement).value;
                      const endpoint = (document.getElementById('reset-endpoint') as HTMLInputElement).value;
                      if (identifier && endpoint) {
                        resetRateLimit(identifier, endpoint);
                      }
                    }}
                    className="management-button reset"
                  >
                    Reset Rate Limit
                  </button>
                </div>
              </div>

              <div className="management-section">
                <h4>IP Whitelist Management</h4>
                <div className="management-form">
                  <input 
                    type="text" 
                    placeholder="IP Address"
                    className="management-input"
                    id="whitelist-ip"
                  />
                  <button 
                    onClick={() => {
                      const ip = (document.getElementById('whitelist-ip') as HTMLInputElement).value;
                      if (ip) {
                        addToWhitelist(ip);
                      }
                    }}
                    className="management-button whitelist"
                  >
                    Add to Whitelist
                  </button>
                </div>
              </div>

              <div className="management-section">
                <h4>IP Blacklist Management</h4>
                <div className="management-form">
                  <input 
                    type="text" 
                    placeholder="IP Address"
                    className="management-input"
                    id="blacklist-ip"
                  />
                  <input 
                    type="text" 
                    placeholder="Reason"
                    className="management-input"
                    id="blacklist-reason"
                  />
                  <button 
                    onClick={() => {
                      const ip = (document.getElementById('blacklist-ip') as HTMLInputElement).value;
                      const reason = (document.getElementById('blacklist-reason') as HTMLInputElement).value;
                      if (ip) {
                        addToBlacklist(ip, reason || 'Manual blacklist');
                      }
                    }}
                    className="management-button blacklist"
                  >
                    Add to Blacklist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLimitDashboard;


