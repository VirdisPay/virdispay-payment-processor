import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import SmartRoutingDashboard from './SmartRoutingDashboard';
import ApiKeySettings from './ApiKeySettings';
import ProfileSettings from './ProfileSettings';
import SmartRoutingPreferences from './SmartRoutingPreferences';
import NotificationCenter from './NotificationCenter';
import AnalyticsDashboard from './AnalyticsDashboard';
import RateLimitDashboard from './RateLimitDashboard';
import './MerchantDashboard.css';

interface User {
  id: string;
  email: string;
  businessName: string;
  businessType?: string; // individual, business, cannabis, cbd
  isVerified: boolean;
  kycStatus: string;
  role: string;
  walletAddress?: string; // Optional - can be added in profile
}

interface KYCStatus {
  status: string;
  riskLevel: string;
  progress: number;
  documentsRequired: number;
  documentsSubmitted: number;
  documentsVerified: number;
  verificationScore: number;
  lastVerifiedAt?: string;
  expiresAt?: string;
  complianceNotes?: string;
}

interface Document {
  id: string;
  type: string;
  originalName: string;
  status: string;
  verified: boolean;
  uploadedAt: string;
}

interface MerchantDashboardProps {
  user: User | null;
  onLogout: () => void;
  onPaymentRequest: (paymentData: any) => void;
  onUpdateUser: (user: User) => void;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerInfo: {
    name: string;
    phone: string;
  };
}

const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ user, onLogout, onPaymentRequest, onUpdateUser }) => {
  const [paymentForm, setPaymentForm] = useState<PaymentRequest>({
    amount: 0,
    currency: 'USDC',
    description: '',
    customerEmail: '',
    customerInfo: {
      name: '',
      phone: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'routing' | 'routing-preferences' | 'compliance' | 'api-keys' | 'analytics' | 'rate-limits' | 'profile'>('payments');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');

  useEffect(() => {
    // Load recent transactions and KYC status
    loadRecentTransactions();
    loadKYCStatus();
    
    // Get auth token for notifications
    const token = localStorage.getItem('token');
    setAuthToken(token);
  }, []);

  const loadRecentTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/payments/merchant/${user?.id}?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadKYCStatus = async () => {
    setKycLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/kyc-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKycStatus(data.kycStatus);
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load KYC status:', error);
    } finally {
      setKycLoading(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and PDF files are allowed');
      e.target.value = ''; // Reset input
      return;
    }

    try {
      setKycLoading(true);
      
      const formData = new FormData();
      formData.append('documents', file);
      formData.append('documentType', documentType);

      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/kyc/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${documentType} uploaded successfully!`);
        // Reload KYC status to show updated documents
        await loadKYCStatus();
        e.target.value = ''; // Reset input
      } else {
        alert(`❌ Upload failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Failed to upload document. Please try again.');
    } finally {
      setKycLoading(false);
    }
  };

  const submitKYCForReview = async () => {
    if (!window.confirm('Submit all documents for KYC review?')) return;

    try {
      setKycLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/kyc/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ KYC submitted for review! You will be notified once verification is complete.');
        await loadKYCStatus();
      } else {
        alert(`❌ Submission failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('❌ Failed to submit KYC. Please try again.');
    } finally {
      setKycLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!window.confirm('Delete this document?')) return;

    try {
      setKycLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/kyc/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Document deleted');
        await loadKYCStatus();
      } else {
        alert(`❌ Delete failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Failed to delete document');
    } finally {
      setKycLoading(false);
    }
  };

  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('customerInfo.')) {
      const field = name.split('.')[1];
      setPaymentForm(prev => ({
        ...prev,
        customerInfo: {
          ...prev.customerInfo,
          [field]: value
        }
      }));
    } else {
      setPaymentForm(prev => ({
        ...prev,
        [name]: name === 'amount' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentForm)
      });

      const data = await response.json();

      if (response.ok) {
        // Generate public payment URL
        const publicPaymentUrl = `${window.location.origin}/pay/${data.paymentRequest.transactionId}`;
        
        // Show payment link modal with QR code
        setShowPaymentModal(true);
        setPaymentLink(publicPaymentUrl);
        
        // Reload transactions
        loadRecentTransactions();
        
        // Reset form
        setPaymentForm({
          amount: 0,
          currency: 'USDC',
          description: '',
          customerEmail: '',
          customerInfo: {
            name: '',
            phone: ''
          }
        });
      } else {
        setError(data.error || 'Failed to create payment request');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'kyc-approved';
      case 'pending_review': return 'kyc-pending';
      case 'in_progress': return 'kyc-progress';
      case 'rejected': return 'kyc-rejected';
      case 'expired': return 'kyc-expired';
      default: return 'kyc-not-started';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'risk-low';
      case 'medium': return 'risk-medium';
      case 'high': return 'risk-high';
      default: return 'risk-unknown';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Welcome, {user?.businessName}</h2>
          <div className="user-status">
            <p>
              Status: <span className={`status-badge ${user?.isVerified ? 'verified' : 'pending'}`}>
                {user?.isVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </p>
            {kycStatus && (
              <p>
                KYC: <span className={`kyc-badge ${getKYCStatusColor(kycStatus.status)}`}>
                  {kycStatus.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`risk-badge ${getRiskLevelColor(kycStatus.riskLevel)}`}>
                  {kycStatus.riskLevel.toUpperCase()} RISK
                </span>
              </p>
            )}
          </div>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          {/* Notification Center */}
          {authToken && (
            <NotificationCenter token={authToken} />
          )}
          {/* Profile Button */}
          <button 
            onClick={() => setActiveTab('profile')} 
            className="profile-button"
            style={{
              padding: '0.75rem 1.25rem',
              background: activeTab === 'profile' ? '#3498db' : 'transparent',
              color: activeTab === 'profile' ? 'white' : '#2c3e50',
              border: '2px solid #3498db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'profile') {
                e.currentTarget.style.background = '#ecf0f1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'profile') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            ⚙️ Profile
          </button>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </div>

      {/* Wallet Address Warning */}
      {!user?.walletAddress && (
        <div className="wallet-setup-alert">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <h3>Wallet Address Required</h3>
            <p>Add your crypto wallet address to start receiving payments.</p>
            <button onClick={() => setActiveTab('profile')} className="alert-action-btn">
              ⚙️ Add Wallet in Profile
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        {/* Tab Navigation */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💳 Create Payment
          </button>
          <button 
            className={`tab-button ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            🛡️ Compliance
            {kycStatus && kycStatus.status !== 'approved' && (
              <span className="tab-badge">!</span>
            )}
          </button>
          <button 
            className={`tab-button ${activeTab === 'routing' ? 'active' : ''}`}
            onClick={() => setActiveTab('routing')}
          >
            🎯 Smart Routing
          </button>
          <button 
            className={`tab-button ${activeTab === 'routing-preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('routing-preferences')}
          >
            ⚙️ Routing Settings
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button 
            className={`tab-button ${activeTab === 'rate-limits' ? 'active' : ''}`}
            onClick={() => setActiveTab('rate-limits')}
          >
            🛡️ Rate Limits
          </button>
          <button 
            className={`tab-button ${activeTab === 'api-keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-keys')}
          >
            🔑 API Keys
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'payments' && (
          <div className="dashboard-grid">
          <div className="payment-form-section">
            <div className="section-header">
              <h3>Create Payment Request</h3>
              <p>Generate a payment link for your customers</p>
            </div>

            <form onSubmit={handleCreatePayment} className="payment-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="amount">Amount (USD)</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFormChange}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Payment Currency</label>
                  <select
                    id="currency"
                    name="currency"
                    value={paymentForm.currency}
                    onChange={handlePaymentFormChange}
                    required
                  >
                    <optgroup label="💵 Stablecoins (Price Stable - Recommended)">
                      <option value="USDC">USDC - USD Coin ($1.00)</option>
                      <option value="USDT">USDT - Tether ($1.00)</option>
                      <option value="DAI">DAI - Dai Stablecoin ($1.00)</option>
                    </optgroup>
                    <optgroup label="₿ Cryptocurrencies (Price Volatile)">
                      <option value="ETH">ETH - Ethereum</option>
                      <option value="BTC">BTC - Bitcoin</option>
                    </optgroup>
                  </select>
                  <small style={{display: 'block', marginTop: '0.5rem', color: '#666', fontSize: '0.85rem'}}>
                    💡 <strong>Stablecoins</strong> maintain a stable $1.00 value, protecting you from crypto price volatility
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={paymentForm.description}
                  onChange={handlePaymentFormChange}
                  placeholder="Payment description"
                />
              </div>

              <div className="form-group">
                <label htmlFor="customerEmail">Customer Email</label>
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={paymentForm.customerEmail}
                  onChange={handlePaymentFormChange}
                  required
                  placeholder="customer@example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="customerInfo.name">Customer Name</label>
                  <input
                    type="text"
                    id="customerInfo.name"
                    name="customerInfo.name"
                    value={paymentForm.customerInfo.name}
                    onChange={handlePaymentFormChange}
                    placeholder="Customer name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="customerInfo.phone">Phone Number</label>
                  <input
                    type="tel"
                    id="customerInfo.phone"
                    name="customerInfo.phone"
                    value={paymentForm.customerInfo.phone}
                    onChange={handlePaymentFormChange}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="payment-options">
                <button type="submit" className="create-payment-button" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Crypto Payment'}
                </button>
                <div className="payment-info">
                  <p>💡 <strong>Non-Custodial:</strong> You keep your private keys</p>
                  <p>🌿 <strong>Cannabis-Friendly:</strong> No banking restrictions</p>
                  <p>⚡ <strong>Ultra-Low Fees:</strong> 99.98% savings with Polygon</p>
                </div>
              </div>
            </form>
          </div>

          <div className="recent-transactions-section">
            <div className="section-header">
              <h3>Recent Transactions</h3>
              <button onClick={loadRecentTransactions} className="refresh-button">Refresh</button>
            </div>

            <div className="transactions-list">
              {recentTransactions.length === 0 ? (
                <p className="no-transactions">No recent transactions</p>
              ) : (
                recentTransactions.map((transaction: any) => (
                  <div key={transaction._id} className="transaction-item">
                    <div className="transaction-info">
                      <div className="transaction-amount">
                        ${transaction.amount} {transaction.currency}
                      </div>
                      <div className="transaction-customer">
                        {transaction.customerEmail}
                      </div>
                      <div className="transaction-date">
                        {new Date(transaction.timestamps.created).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`transaction-status ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'routing' && (
          <SmartRoutingDashboard merchantId={user?.id || ''} />
        )}

        {activeTab === 'routing-preferences' && (
          <SmartRoutingPreferences onSave={(preferences) => {
            console.log('Routing preferences saved:', preferences);
          }} />
        )}

        {activeTab === 'analytics' && authToken && (
          <AnalyticsDashboard token={authToken} />
        )}

        {activeTab === 'rate-limits' && authToken && (
          <RateLimitDashboard 
            token={authToken} 
            isAdmin={user?.role === 'admin'} 
          />
        )}

        {activeTab === 'api-keys' && (
          <ApiKeySettings />
        )}

        {activeTab === 'profile' && (
          <ProfileSettings onUpdateUser={onUpdateUser} />
        )}

        {activeTab === 'compliance' && (
          <div className="compliance-dashboard">
            <div className="compliance-header">
              <div>
                <h3>🛡️ Compliance Dashboard</h3>
                <p>Manage your KYC verification and compliance status</p>
              </div>
              <button onClick={loadKYCStatus} className="refresh-button" disabled={kycLoading}>
                {kycLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {kycLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading compliance status...</p>
              </div>
            ) : kycStatus ? (
              <div className="compliance-content">
                {/* KYC Status Overview */}
                <div className="compliance-overview">
                  <div className="status-card">
                    <h4>KYC Verification Status</h4>
                    <div className="status-info">
                      <div className={`status-indicator ${getKYCStatusColor(kycStatus.status)}`}>
                        {kycStatus.status.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${kycStatus.progress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">{kycStatus.progress}% Complete</p>
                    </div>
                  </div>

                  <div className="risk-card">
                    <h4>Risk Assessment</h4>
                    <div className={`risk-indicator ${getRiskLevelColor(kycStatus.riskLevel)}`}>
                      {kycStatus.riskLevel.toUpperCase()} RISK
                    </div>
                    <p className="risk-description">
                      {kycStatus.riskLevel === 'low' && 'Your business presents low compliance risk.'}
                      {kycStatus.riskLevel === 'medium' && 'Standard compliance monitoring applies.'}
                      {kycStatus.riskLevel === 'high' && 'Enhanced due diligence and monitoring required.'}
                    </p>
                  </div>

                  <div className="limits-card">
                    <h4>Transaction Limits</h4>
                    <div className="limits-info">
                      <div className="limit-item">
                        <span className="limit-label">Single Transaction:</span>
                        <span className="limit-value">
                          {kycStatus.riskLevel === 'low' && '$10,000'}
                          {kycStatus.riskLevel === 'medium' && '$5,000'}
                          {kycStatus.riskLevel === 'high' && '$2,500'}
                        </span>
                      </div>
                      <div className="limit-item">
                        <span className="limit-label">Daily Limit:</span>
                        <span className="limit-value">
                          {kycStatus.riskLevel === 'low' && '$50,000'}
                          {kycStatus.riskLevel === 'medium' && '$25,000'}
                          {kycStatus.riskLevel === 'high' && '$10,000'}
                        </span>
                      </div>
                      <div className="limit-item">
                        <span className="limit-label">Monthly Limit:</span>
                        <span className="limit-value">
                          {kycStatus.riskLevel === 'low' && '$500,000'}
                          {kycStatus.riskLevel === 'medium' && '$250,000'}
                          {kycStatus.riskLevel === 'high' && '$100,000'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="documents-section">
                  <h4>📄 Verification Documents</h4>
                  <div className="documents-overview">
                    <div className="document-stats">
                      <div className="stat">
                        <span className="stat-number">{kycStatus.documentsVerified}</span>
                        <span className="stat-label">Verified</span>
                      </div>
                      <div className="stat">
                        <span className="stat-number">{kycStatus.documentsSubmitted}</span>
                        <span className="stat-label">Submitted</span>
                      </div>
                      <div className="stat">
                        <span className="stat-number">{kycStatus.documentsRequired}</span>
                        <span className="stat-label">Required</span>
                      </div>
                    </div>
                  </div>

                  <div className="documents-list">
                    {/* Required Documents */}
                    <div className="required-documents-section">
                      <h5 style={{marginBottom: '1rem', color: '#666'}}>Required Documents:</h5>
                      
                      {/* Government ID */}
                      <div className="document-upload-item">
                        <div className="document-info">
                          <span className="document-type">🆔 GOVERNMENT-ISSUED PHOTO ID</span>
                          <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                            Passport, driver's license, or national ID card
                          </p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleDocumentUpload(e, 'government_id')}
                          disabled={kycLoading}
                          style={{marginTop: '0.5rem', padding: '0.5rem'}}
                        />
                      </div>

                      {/* Proof of Address */}
                      <div className="document-upload-item">
                        <div className="document-info">
                          <span className="document-type">🏠 PROOF OF ADDRESS</span>
                          <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                            Utility bill, bank statement, or lease agreement (within last 3 months)
                          </p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleDocumentUpload(e, 'proof_of_address')}
                          disabled={kycLoading}
                          style={{marginTop: '0.5rem', padding: '0.5rem'}}
                        />
                      </div>

                      {/* Business License (if applicable) */}
                      {user?.businessType !== 'individual' && (
                        <>
                          <div className="document-upload-item">
                            <div className="document-info">
                              <span className="document-type">📜 CERTIFICATE OF INCORPORATION</span>
                              <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                                Company registration certificate or articles of incorporation
                              </p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*,.pdf"
                              onChange={(e) => handleDocumentUpload(e, 'business_license')}
                              disabled={kycLoading}
                              style={{marginTop: '0.5rem', padding: '0.5rem'}}
                            />
                          </div>

                          <div className="document-upload-item">
                            <div className="document-info">
                              <span className="document-type">💼 TAX REGISTRATION</span>
                              <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                                UK: UTR/VAT certificate | US: EIN letter | Other: Tax registration document
                              </p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*,.pdf"
                              onChange={(e) => handleDocumentUpload(e, 'tax_registration')}
                              disabled={kycLoading}
                              style={{marginTop: '0.5rem', padding: '0.5rem'}}
                            />
                          </div>

                          <div className="document-upload-item">
                            <div className="document-info">
                              <span className="document-type">👥 BENEFICIAL OWNERSHIP</span>
                              <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                                List of all individuals owning 25%+ of the business
                              </p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*,.pdf"
                              onChange={(e) => handleDocumentUpload(e, 'beneficial_ownership')}
                              disabled={kycLoading}
                              style={{marginTop: '0.5rem', padding: '0.5rem'}}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Uploaded Documents */}
                    {documents.length > 0 && (
                      <div style={{marginTop: '2rem'}}>
                        <h5 style={{marginBottom: '1rem', color: '#666'}}>Uploaded Documents:</h5>
                        {documents.map((doc) => (
                          <div key={doc.id} className="document-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="document-info">
                              <span className="document-type">{doc.type.replace('_', ' ').toUpperCase()}</span>
                              <span className="document-name">{doc.originalName}</span>
                              <span className="document-date">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div className={`document-status ${doc.verified ? 'verified' : 'pending'}`}>
                                {doc.verified ? '✅ Verified' : '⏳ Pending'}
                              </div>
                              {!doc.verified && (
                                <button 
                                  onClick={() => deleteDocument(doc.id)}
                                  disabled={kycLoading}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Submit for Review Button */}
                        {kycStatus.status !== 'approved' && kycStatus.status !== 'pending_review' && documents.length >= 2 && (
                          <button
                            onClick={submitKYCForReview}
                            disabled={kycLoading}
                            style={{
                              marginTop: '1.5rem',
                              padding: '1rem 2rem',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              width: '100%'
                            }}
                          >
                            📤 Submit for KYC Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Steps */}
                <div className="next-steps-section">
                  <h4>📋 Next Steps</h4>
                  <div className="steps-list">
                    {kycStatus.status === 'not_started' && (
                      <>
                        <div className="step-item">
                          <span className="step-number">1</span>
                          <span className="step-text">Upload government-issued photo ID</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <span className="step-text">Upload business license or registration</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-text">Complete verification process</span>
                        </div>
                      </>
                    )}
                    {kycStatus.status === 'in_progress' && (
                      <>
                        <div className="step-item completed">
                          <span className="step-number">✓</span>
                          <span className="step-text">Documents uploaded</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <span className="step-text">Awaiting document verification</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-text">Complete final review</span>
                        </div>
                      </>
                    )}
                    {kycStatus.status === 'pending_review' && (
                      <>
                        <div className="step-item completed">
                          <span className="step-number">✓</span>
                          <span className="step-text">Documents verified</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <span className="step-text">Under manual compliance review</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-text">Awaiting final approval</span>
                        </div>
                      </>
                    )}
                    {kycStatus.status === 'approved' && (
                      <>
                        <div className="step-item completed">
                          <span className="step-number">✓</span>
                          <span className="step-text">KYC verification complete</span>
                        </div>
                        <div className="step-item completed">
                          <span className="step-number">✓</span>
                          <span className="step-text">Ready to process payments</span>
                        </div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-text">Monitor transaction compliance</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Compliance Notes */}
                {kycStatus.complianceNotes && (
                  <div className="compliance-notes">
                    <h4>📝 Compliance Notes</h4>
                    <div className="notes-content">
                      <p>{kycStatus.complianceNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-kyc-status">
                <h4>📋 KYC Verification Not Started</h4>
                <p>Upload your documents to begin the verification process.</p>
                
                <div className="document-upload-section" style={{marginTop: '2rem', textAlign: 'left'}}>
                  <h4>📄 Upload Required Documents</h4>
                  <p>Please upload the following documents to verify your identity and business:</p>
                  
                  <div className="upload-form" style={{marginTop: '1.5rem'}}>
                    {/* Government ID */}
                    <div className="document-upload-item">
                      <div className="document-info">
                        <span className="document-type">🆔 GOVERNMENT-ISSUED PHOTO ID</span>
                        <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                          Passport, driver's license, or national ID card
                        </p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocumentUpload(e, 'government_id')}
                        disabled={kycLoading}
                        style={{marginTop: '0.5rem', padding: '0.5rem'}}
                      />
                    </div>

                    {/* Proof of Address */}
                    <div className="document-upload-item">
                      <div className="document-info">
                        <span className="document-type">🏠 PROOF OF ADDRESS</span>
                        <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                          Utility bill, bank statement, or lease agreement (within last 3 months)
                        </p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocumentUpload(e, 'proof_of_address')}
                        disabled={kycLoading}
                        style={{marginTop: '0.5rem', padding: '0.5rem'}}
                      />
                    </div>

                    {/* Business Documents (if applicable) */}
                    {user?.businessType !== 'individual' && (
                      <>
                        <div className="document-upload-item">
                          <div className="document-info">
                            <span className="document-type">📜 CERTIFICATE OF INCORPORATION</span>
                            <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                              Company registration certificate or articles of incorporation
                            </p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleDocumentUpload(e, 'business_license')}
                            disabled={kycLoading}
                            style={{marginTop: '0.5rem', padding: '0.5rem'}}
                          />
                        </div>

                        <div className="document-upload-item">
                          <div className="document-info">
                            <span className="document-type">💼 TAX REGISTRATION</span>
                            <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                              UK: UTR/VAT certificate | US: EIN letter | Other: Tax registration document
                            </p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleDocumentUpload(e, 'tax_registration')}
                            disabled={kycLoading}
                            style={{marginTop: '0.5rem', padding: '0.5rem'}}
                          />
                        </div>

                        <div className="document-upload-item">
                          <div className="document-info">
                            <span className="document-type">👥 BENEFICIAL OWNERSHIP</span>
                            <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0'}}>
                              List of all individuals owning 25%+ of the business
                            </p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleDocumentUpload(e, 'beneficial_ownership')}
                            disabled={kycLoading}
                            style={{marginTop: '0.5rem', padding: '0.5rem'}}
                          />
                        </div>
                      </>
                    )}
                    
                    <p style={{marginTop: '1.5rem', padding: '1rem', background: '#f0f7ff', borderRadius: '8px', color: '#333'}}>
                      <strong>💡 Tip:</strong> Upload at least 2 documents to submit for KYC review. Documents will auto-save as you upload them.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Payment Link Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Payment Request Created!</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p>Share this link with your customer to receive payment:</p>
              
              <div className="payment-link-container">
                <input 
                  type="text" 
                  value={paymentLink} 
                  readOnly 
                  className="payment-link-input"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button 
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentLink);
                    alert('✅ Payment link copied to clipboard!');
                  }}
                >
                  📋 Copy Link
                </button>
              </div>

              <div className="qr-code-section">
                <h4>📱 QR Code for Mobile</h4>
                <div className="qr-code-container">
                  <QRCodeSVG
                    value={paymentLink}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="qr-instructions">
                  Customers can scan this QR code with their mobile wallet to pay instantly
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button primary"
                onClick={() => {
                  navigator.clipboard.writeText(paymentLink);
                  setShowPaymentModal(false);
                  alert('✅ Payment link copied to clipboard!');
                }}
              >
                Copy & Close
              </button>
              <button 
                className="modal-button secondary"
                onClick={() => setShowPaymentModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;
