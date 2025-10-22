import React, { useState, useEffect } from 'react';

interface RoutingPreferences {
  priority: 'cost' | 'speed' | 'balanced';
  preferredNetworks: string[];
  maxGasPrice: number | null;
  minReliability: number;
}

interface SmartRoutingPreferencesProps {
  onSave: (preferences: RoutingPreferences) => void;
}

const SmartRoutingPreferences: React.FC<SmartRoutingPreferencesProps> = ({ onSave }) => {
  const [preferences, setPreferences] = useState<RoutingPreferences>({
    priority: 'balanced',
    preferredNetworks: [],
    maxGasPrice: null,
    minReliability: 0.8
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/smart-routing/preferences');
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/smart-routing/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();
      
      if (data.success) {
        setSaved(true);
        onSave(preferences);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = (priority: 'cost' | 'speed' | 'balanced') => {
    setPreferences(prev => ({ ...prev, priority }));
  };

  const handleNetworkToggle = (network: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredNetworks: prev.preferredNetworks.includes(network)
        ? prev.preferredNetworks.filter(n => n !== network)
        : [...prev.preferredNetworks, network]
    }));
  };

  const handleMaxGasPriceChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      maxGasPrice: value ? parseFloat(value) : null
    }));
  };

  const handleMinReliabilityChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      minReliability: parseFloat(value)
    }));
  };

  const networks = [
    { key: 'polygon', name: 'Polygon', description: 'Ultra-low fees, fast confirmations' },
    { key: 'ethereum', name: 'Ethereum', description: 'High security, expensive fees' },
    { key: 'bsc', name: 'BSC', description: 'Low fees, medium speed' },
    { key: 'arbitrum', name: 'Arbitrum', description: 'Very fast, low fees' }
  ];

  return (
    <div className="smart-routing-preferences">
      <div className="preferences-header">
        <h2>⚙️ Smart Routing Preferences</h2>
        <p>Customize how your payments are routed across different networks</p>
      </div>

      <div className="preferences-form">
        {/* Priority Setting */}
        <div className="preference-section">
          <h3>🎯 Routing Priority</h3>
          <p>Choose what's most important for your payments</p>
          <div className="priority-options">
            <div 
              className={`priority-option ${preferences.priority === 'cost' ? 'selected' : ''}`}
              onClick={() => handlePriorityChange('cost')}
            >
              <div className="priority-icon">💰</div>
              <div className="priority-content">
                <h4>Cost Optimized</h4>
                <p>Always choose the cheapest network, even if slower</p>
              </div>
            </div>
            <div 
              className={`priority-option ${preferences.priority === 'speed' ? 'selected' : ''}`}
              onClick={() => handlePriorityChange('speed')}
            >
              <div className="priority-icon">⚡</div>
              <div className="priority-content">
                <h4>Speed Optimized</h4>
                <p>Always choose the fastest network, even if more expensive</p>
              </div>
            </div>
            <div 
              className={`priority-option ${preferences.priority === 'balanced' ? 'selected' : ''}`}
              onClick={() => handlePriorityChange('balanced')}
            >
              <div className="priority-icon">⚖️</div>
              <div className="priority-content">
                <h4>Balanced</h4>
                <p>Find the best balance between cost and speed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preferred Networks */}
        <div className="preference-section">
          <h3>🌐 Preferred Networks</h3>
          <p>Select networks you want to prioritize (optional)</p>
          <div className="network-options">
            {networks.map((network) => (
              <div 
                key={network.key}
                className={`network-option ${preferences.preferredNetworks.includes(network.key) ? 'selected' : ''}`}
                onClick={() => handleNetworkToggle(network.key)}
              >
                <input
                  type="checkbox"
                  checked={preferences.preferredNetworks.includes(network.key)}
                  onChange={() => handleNetworkToggle(network.key)}
                />
                <div className="network-content">
                  <h4>{network.name}</h4>
                  <p>{network.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="preference-section">
          <h3>🔧 Advanced Settings</h3>
          <div className="advanced-settings">
            <div className="setting-group">
              <label htmlFor="maxGasPrice">Maximum Gas Price (Gwei)</label>
              <input
                id="maxGasPrice"
                type="number"
                value={preferences.maxGasPrice || ''}
                onChange={(e) => handleMaxGasPriceChange(e.target.value)}
                placeholder="Leave empty for no limit"
                min="0"
                step="0.1"
              />
              <small>Reject networks with gas prices above this limit</small>
            </div>

            <div className="setting-group">
              <label htmlFor="minReliability">Minimum Reliability (%)</label>
              <input
                id="minReliability"
                type="number"
                value={preferences.minReliability}
                onChange={(e) => handleMinReliabilityChange(e.target.value)}
                min="0"
                max="100"
                step="1"
              />
              <small>Only use networks with reliability above this threshold</small>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="preferences-actions">
          <button 
            className="save-button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
          {saved && (
            <div className="save-success">
              ✅ Preferences saved successfully!
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <h3>💡 How Smart Routing Works</h3>
        <div className="help-content">
          <div className="help-item">
            <h4>🎯 Automatic Optimization</h4>
            <p>Our system continuously monitors network conditions and automatically routes your payments to the optimal network based on your preferences.</p>
          </div>
          <div className="help-item">
            <h4>💰 Cost Savings</h4>
            <p>Smart routing can save you up to 99% on transaction fees by avoiding expensive networks like Ethereum for small payments.</p>
          </div>
          <div className="help-item">
            <h4>⚡ Speed Optimization</h4>
            <p>Payments are routed to networks with the fastest confirmation times, improving customer experience.</p>
          </div>
          <div className="help-item">
            <h4>🛡️ Reliability</h4>
            <p>Networks are continuously monitored for reliability, and payments are only routed to stable networks.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartRoutingPreferences;



