import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfileSettings.css';

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  country: string;
  walletAddress: string;
}

interface ProfileSettingsProps {
  onUpdateUser?: (user: any) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onUpdateUser }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfileData(response.data.user);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/profile`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setSaving(false);
      
      // Update parent component's user state
      if (onUpdateUser && response.data.user) {
        onUpdateUser(response.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-settings">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-settings">
        <div className="error">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="profile-settings">
      <div className="profile-header">
        <h2>⚙️ Profile Settings</h2>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className="btn btn-primary">
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Wallet Warning */}
      {!profileData.walletAddress && (
        <div className="wallet-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>Wallet Address Required</h3>
            <p>You need to add your crypto wallet address to receive payments. Add it below to start accepting transactions.</p>
          </div>
        </div>
      )}

      <div className="profile-sections">
        {/* Personal Information */}
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={profileData.firstName}
                onChange={handleChange}
                disabled={!editMode}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleChange}
                disabled={!editMode}
                className="form-input"
              />
            </div>

            <div className="form-field full-width">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                disabled
                className="form-input disabled"
              />
              <small>Email cannot be changed. Contact support if needed.</small>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="profile-section">
          <h3>Business Information</h3>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>Business Name</label>
              <input
                type="text"
                name="businessName"
                value={profileData.businessName}
                onChange={handleChange}
                disabled={!editMode}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label>Business Type</label>
              <select
                name="businessType"
                value={profileData.businessType}
                disabled
                className="form-input disabled"
              >
                <option value="hemp">Hemp</option>
                <option value="cbd">CBD</option>
                <option value="cannabis">Cannabis</option>
                <option value="other">Other</option>
              </select>
              <small>Business type cannot be changed after registration.</small>
            </div>

            <div className="form-field">
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={profileData.country}
                disabled
                className="form-input disabled"
              />
              <small>Country cannot be changed after registration.</small>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="profile-section">
          <h3>Payment Settings</h3>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>
                EVM Wallet Address (Ethereum-Compatible)
                {!profileData.walletAddress && <span className="required-badge">Required to receive payments</span>}
              </label>
              <input
                type="text"
                name="walletAddress"
                value={profileData.walletAddress || ''}
                onChange={handleChange}
                disabled={!editMode}
                className="form-input"
                placeholder="0x... (MetaMask, Trust Wallet, Coinbase Wallet, etc.)"
                pattern="^0x[a-fA-F0-9]{40}$"
              />
              <div className="wallet-help">
                <p><strong>💡 One Address for Everything:</strong> Your Ethereum address works for all payments:</p>
                
                <div style={{marginTop: '1rem'}}>
                  <p style={{fontWeight: '600', marginBottom: '0.5rem'}}>Supported Cryptocurrencies:</p>
                  <ul>
                    <li>💵 <strong>Stablecoins:</strong> USDC, USDT, DAI (all chains)</li>
                    <li>₿ <strong>Native Crypto:</strong> ETH, MATIC, BNB, ARB</li>
                  </ul>
                </div>

                <div style={{marginTop: '1rem'}}>
                  <p style={{fontWeight: '600', marginBottom: '0.5rem'}}>Supported Blockchains:</p>
                  <ul>
                    <li>✅ <strong>Polygon</strong> (Recommended - ultra-low fees ~$0.001)</li>
                    <li>✅ <strong>Ethereum</strong> (Most secure, higher fees)</li>
                    <li>✅ <strong>BSC</strong> (Binance Smart Chain - low fees)</li>
                    <li>✅ <strong>Arbitrum</strong> (Layer 2 - fast & cheap)</li>
                  </ul>
                </div>

                <div style={{marginTop: '1rem', padding: '1rem', background: '#f0f7ff', borderRadius: '8px'}}>
                  <p style={{margin: 0, color: '#333', fontSize: '0.9rem'}}>
                    <strong>📱 Example Wallets:</strong> MetaMask, Trust Wallet, Coinbase Wallet, Ledger, etc.
                    <br />
                    <strong>🔒 Security:</strong> VirdisPay never stores your private keys. We only need your public address.
                  </p>
                </div>

                {editMode && (
                  <p className="test-wallet" style={{marginTop: '1rem'}}>
                    <strong>🧪 For testing:</strong> Use <code>0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {editMode && (
          <div className="profile-actions">
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
            <button 
              onClick={() => {
                setEditMode(false);
                fetchProfile();
                setError('');
                setSuccess('');
              }} 
              className="btn btn-secondary"
              disabled={saving}
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;

