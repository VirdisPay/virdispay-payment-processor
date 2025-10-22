import React, { useState, useEffect } from 'react';

interface BankingInfo {
  accountType: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  swiftCode?: string;
  iban?: string;
}

interface ConversionSettings {
  autoConvert: boolean;
  conversionThreshold: number;
  preferredFiatCurrency: string;
  bankingInfo: BankingInfo;
  conversionSettings: {
    slippageTolerance: number;
    minConversionAmount: number;
    maxConversionAmount: number;
    conversionDelay: number;
  };
  supportedCryptos: Array<{
    crypto: string;
    enabled: boolean;
  }>;
}

const FiatConversionSettings: React.FC = () => {
  const [settings, setSettings] = useState<ConversionSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fiat-conversion/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        } else {
          // Initialize with default settings
          setSettings({
            autoConvert: false,
            conversionThreshold: 100,
            preferredFiatCurrency: 'USD',
            bankingInfo: {
              accountType: 'business',
              bankName: '',
              accountNumber: '',
              routingNumber: '',
              accountHolderName: ''
            },
            conversionSettings: {
              slippageTolerance: 0.5,
              minConversionAmount: 10,
              maxConversionAmount: 10000,
              conversionDelay: 0
            },
            supportedCryptos: [
              { crypto: 'USDC', enabled: true },
              { crypto: 'USDT', enabled: true },
              { crypto: 'DAI', enabled: true },
              { crypto: 'ETH', enabled: false },
              { crypto: 'BTC', enabled: false }
            ]
          });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fiat-conversion/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoConvert = async () => {
    if (!settings) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fiat-conversion/settings/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !settings.autoConvert })
      });

      if (response.ok) {
        setSettings(prev => prev ? { ...prev, autoConvert: !prev.autoConvert } : null);
        setSuccess(`Auto-conversion ${!settings.autoConvert ? 'enabled' : 'disabled'}`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError('Failed to toggle auto-conversion');
    }
  };

  const updateSettings = (updates: Partial<ConversionSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateBankingInfo = (updates: Partial<BankingInfo>) => {
    setSettings(prev => prev ? {
      ...prev,
      bankingInfo: { ...prev.bankingInfo, ...updates }
    } : null);
  };

  const updateConversionSettings = (updates: Partial<ConversionSettings['conversionSettings']>) => {
    setSettings(prev => prev ? {
      ...prev,
      conversionSettings: { ...prev.conversionSettings, ...updates }
    } : null);
  };

  const toggleCryptoSupport = (crypto: string) => {
    setSettings(prev => prev ? {
      ...prev,
      supportedCryptos: prev.supportedCryptos.map(c => 
        c.crypto === crypto ? { ...c, enabled: !c.enabled } : c
      )
    } : null);
  };

  if (!settings) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="fiat-conversion-settings">
      <div className="settings-header">
        <h2>Fiat Conversion Settings</h2>
        <p>Configure automatic crypto-to-fiat conversion for your payments</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-grid">
        {/* Auto-Conversion Toggle */}
        <div className="settings-section">
          <div className="section-header">
            <h3>Auto-Conversion</h3>
            <button 
              onClick={handleToggleAutoConvert}
              className={`toggle-button ${settings.autoConvert ? 'enabled' : 'disabled'}`}
            >
              {settings.autoConvert ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          {settings.autoConvert && (
            <div className="auto-conversion-info">
              <p>✅ Payments will be automatically converted to fiat and deposited to your bank account</p>
            </div>
          )}
        </div>

        {/* Conversion Threshold */}
        <div className="settings-section">
          <h3>Conversion Threshold</h3>
          <div className="form-group">
            <label htmlFor="threshold">Minimum amount (USD) to trigger auto-conversion</label>
            <input
              type="number"
              id="threshold"
              value={settings.conversionThreshold}
              onChange={(e) => updateSettings({ conversionThreshold: parseFloat(e.target.value) })}
              min="1"
              step="0.01"
            />
          </div>
        </div>

        {/* Preferred Currency */}
        <div className="settings-section">
          <h3>Preferred Fiat Currency</h3>
          <div className="form-group">
            <label htmlFor="currency">Currency for conversions</label>
            <select
              id="currency"
              value={settings.preferredFiatCurrency}
              onChange={(e) => updateSettings({ preferredFiatCurrency: e.target.value })}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
          </div>
        </div>

        {/* Banking Information */}
        {settings.autoConvert && (
          <div className="settings-section">
            <h3>Banking Information</h3>
            <div className="banking-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="accountType">Account Type</label>
                  <select
                    id="accountType"
                    value={settings.bankingInfo.accountType}
                    onChange={(e) => updateBankingInfo({ accountType: e.target.value })}
                  >
                    <option value="business">Business</option>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="bankName">Bank Name</label>
                  <input
                    type="text"
                    id="bankName"
                    value={settings.bankingInfo.bankName}
                    onChange={(e) => updateBankingInfo({ bankName: e.target.value })}
                    placeholder="Your bank name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="accountNumber">Account Number</label>
                  <input
                    type="text"
                    id="accountNumber"
                    value={settings.bankingInfo.accountNumber}
                    onChange={(e) => updateBankingInfo({ accountNumber: e.target.value })}
                    placeholder="Account number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="routingNumber">Routing Number</label>
                  <input
                    type="text"
                    id="routingNumber"
                    value={settings.bankingInfo.routingNumber}
                    onChange={(e) => updateBankingInfo({ routingNumber: e.target.value })}
                    placeholder="Routing number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="accountHolderName">Account Holder Name</label>
                <input
                  type="text"
                  id="accountHolderName"
                  value={settings.bankingInfo.accountHolderName}
                  onChange={(e) => updateBankingInfo({ accountHolderName: e.target.value })}
                  placeholder="Name on account"
                />
              </div>

              {settings.preferredFiatCurrency !== 'USD' && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="swiftCode">SWIFT Code</label>
                    <input
                      type="text"
                      id="swiftCode"
                      value={settings.bankingInfo.swiftCode || ''}
                      onChange={(e) => updateBankingInfo({ swiftCode: e.target.value })}
                      placeholder="SWIFT code"
                    />
                  </div>

                  {settings.preferredFiatCurrency === 'EUR' && (
                    <div className="form-group">
                      <label htmlFor="iban">IBAN</label>
                      <input
                        type="text"
                        id="iban"
                        value={settings.bankingInfo.iban || ''}
                        onChange={(e) => updateBankingInfo({ iban: e.target.value })}
                        placeholder="IBAN"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversion Settings */}
        <div className="settings-section">
          <h3>Conversion Settings</h3>
          <div className="conversion-settings">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="minAmount">Minimum Conversion Amount (USD)</label>
                <input
                  type="number"
                  id="minAmount"
                  value={settings.conversionSettings.minConversionAmount}
                  onChange={(e) => updateConversionSettings({ minConversionAmount: parseFloat(e.target.value) })}
                  min="1"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxAmount">Maximum Conversion Amount (USD)</label>
                <input
                  type="number"
                  id="maxAmount"
                  value={settings.conversionSettings.maxConversionAmount}
                  onChange={(e) => updateConversionSettings({ maxConversionAmount: parseFloat(e.target.value) })}
                  min="100"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="slippage">Slippage Tolerance (%)</label>
                <input
                  type="number"
                  id="slippage"
                  value={settings.conversionSettings.slippageTolerance}
                  onChange={(e) => updateConversionSettings({ slippageTolerance: parseFloat(e.target.value) })}
                  min="0"
                  max="5"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="delay">Conversion Delay (hours)</label>
                <input
                  type="number"
                  id="delay"
                  value={settings.conversionSettings.conversionDelay}
                  onChange={(e) => updateConversionSettings({ conversionDelay: parseInt(e.target.value) })}
                  min="0"
                  max="24"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Supported Cryptocurrencies */}
        <div className="settings-section">
          <h3>Supported Cryptocurrencies</h3>
          <div className="crypto-selection">
            {settings.supportedCryptos.map((crypto) => (
              <div key={crypto.crypto} className="crypto-option">
                <label className="crypto-checkbox">
                  <input
                    type="checkbox"
                    checked={crypto.enabled}
                    onChange={() => toggleCryptoSupport(crypto.crypto)}
                  />
                  <span className="crypto-name">{crypto.crypto}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          onClick={handleSave} 
          className="save-button"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default FiatConversionSettings;

