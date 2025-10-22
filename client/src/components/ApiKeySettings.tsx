import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ApiKeySettings.css';

interface ApiKeyData {
  hasKeys: boolean;
  publicKey: string | null;
  createdAt: string | null;
  lastUsed: string | null;
  allowedDomains: Array<{
    domain: string;
    addedAt: string;
    verified: boolean;
  }>;
}

const ApiKeySettings: React.FC = () => {
  const [apiKeyData, setApiKeyData] = useState<ApiKeyData | null>(null);
  const [secretKey, setSecretKey] = useState<string>('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setApiKeyData(response.data.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch API keys');
      setLoading(false);
    }
  };

  const generateApiKeys = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/api-keys/generate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSecretKey(response.data.data.secretKey);
      setShowSecretKey(true);
      setSuccess('API keys generated successfully! Please save your secret key now - it won\'t be shown again.');
      
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate API keys');
      setLoading(false);
    }
  };

  const regenerateApiKeys = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API keys? This will invalidate your current keys and break existing integrations until you update them.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/api-keys/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSecretKey(response.data.data.secretKey);
      setShowSecretKey(true);
      setSuccess('API keys regenerated successfully! Please update your integrations with the new keys.');
      
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate API keys');
      setLoading(false);
    }
  };

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDomain.trim()) {
      setError('Please enter a domain');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/api-keys/domains`,
        { domain: newDomain },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Domain added successfully');
      setNewDomain('');
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add domain');
    }
  };

  const removeDomain = async (domain: string) => {
    if (!window.confirm(`Are you sure you want to remove ${domain} from your whitelist?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/api-keys/domains/${encodeURIComponent(domain)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Domain removed successfully');
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove domain');
    }
  };

  const copyToClipboard = (text: string, type: 'public' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'public') {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (loading && !apiKeyData) {
    return (
      <div className="api-key-settings">
        <div className="loading">Loading API settings...</div>
      </div>
    );
  }

  return (
    <div className="api-key-settings">
      <h2>🔑 API Keys & Domain Security</h2>
      <p className="subtitle">Manage your API keys and whitelisted domains for widget integration</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* API Keys Section */}
      <div className="settings-section">
        <h3>API Keys</h3>
        
        {!apiKeyData?.hasKeys ? (
          <div className="no-keys">
            <p>You haven't generated API keys yet. Generate keys to integrate the VirdisPay widget on your website.</p>
            <button onClick={generateApiKeys} className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate API Keys'}
            </button>
          </div>
        ) : (
          <div className="keys-display">
            {/* Public Key */}
            <div className="key-item">
              <label>Public Key (Client-Side)</label>
              <div className="key-input-group">
                <input 
                  type="text" 
                  value={apiKeyData.publicKey || ''} 
                  readOnly 
                  className="key-input"
                />
                <button 
                  onClick={() => copyToClipboard(apiKeyData.publicKey || '', 'public')}
                  className="btn btn-sm btn-copy"
                >
                  {copiedPublic ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <small>Use this key in your website's frontend code</small>
            </div>

            {/* Secret Key */}
            {showSecretKey && secretKey && (
              <div className="key-item secret-key-warning">
                <label>Secret Key (Server-Side)</label>
                <div className="key-input-group">
                  <input 
                    type="text" 
                    value={secretKey} 
                    readOnly 
                    className="key-input"
                  />
                  <button 
                    onClick={() => copyToClipboard(secretKey, 'secret')}
                    className="btn btn-sm btn-copy"
                  >
                    {copiedSecret ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <div className="warning-box">
                  <strong>⚠️ Important:</strong> Save this secret key now! It won't be shown again. Store it securely and never expose it in client-side code.
                </div>
              </div>
            )}

            {/* Key Info */}
            <div className="key-info">
              <div className="info-item">
                <span className="label">Created:</span>
                <span className="value">{apiKeyData.createdAt ? new Date(apiKeyData.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Last Used:</span>
                <span className="value">{apiKeyData.lastUsed ? new Date(apiKeyData.lastUsed).toLocaleString() : 'Never'}</span>
              </div>
            </div>

            <button onClick={regenerateApiKeys} className="btn btn-warning" disabled={loading}>
              🔄 Regenerate Keys
            </button>
          </div>
        )}
      </div>

      {/* Domain Whitelist Section */}
      {apiKeyData?.hasKeys && (
        <div className="settings-section">
          <h3>Domain Whitelist</h3>
          <p>Add the domains where your payment widget is installed. Only whitelisted domains can process payments.</p>

          <form onSubmit={addDomain} className="add-domain-form">
            <div className="form-group">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com (without https://)"
                className="form-control"
              />
              <button type="submit" className="btn btn-primary">
                ➕ Add Domain
              </button>
            </div>
          </form>

          <div className="domains-list">
            {apiKeyData.allowedDomains && apiKeyData.allowedDomains.length > 0 ? (
              apiKeyData.allowedDomains.map((domainItem, index) => (
                <div key={index} className="domain-item">
                  <div className="domain-info">
                    <span className="domain-name">{domainItem.domain}</span>
                    <span className="domain-date">
                      Added {new Date(domainItem.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeDomain(domainItem.domain)}
                    className="btn btn-sm btn-danger"
                  >
                    🗑️ Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="no-domains">
                <p>No domains added yet. Add your website domain to start accepting payments.</p>
                <small>💡 Tip: localhost is automatically whitelisted for development</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integration Example */}
      {apiKeyData?.hasKeys && (
        <div className="settings-section">
          <h3>Integration Example</h3>
          <p>Copy this code to integrate VirdisPay on your website:</p>
          <pre className="code-block">
{`<!-- Add this to your HTML -->
<script src="https://widgets.virdispay.com/virdispay-widget.js"></script>

<div data-virdispay-widget="button"
     data-api-key="${apiKeyData.publicKey}"
     data-amount="100"
     data-currency="USD"
     data-description="Product Purchase">
</div>

<script>
  VirdisPay.init({
    apiKey: '${apiKeyData.publicKey}',
    onSuccess: function(payment) {
      console.log('Payment successful!', payment);
    },
    onError: function(error) {
      console.error('Payment failed:', error);
    }
  });
</script>`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiKeySettings;



