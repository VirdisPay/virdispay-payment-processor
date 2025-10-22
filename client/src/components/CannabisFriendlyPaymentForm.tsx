import React, { useState, useEffect } from 'react';

interface CannabisPaymentData {
  amount: number;
  currency: string;
  customerInfo: {
    email: string;
    name: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  description: string;
  targetStablecoin: string;
  paymentMethod: string;
}

interface CannabisFriendlyPaymentFormProps {
  paymentData: any;
  onBack: () => void;
}

const CannabisFriendlyPaymentForm: React.FC<CannabisFriendlyPaymentFormProps> = ({ paymentData, onBack }) => {
  const [formData, setFormData] = useState<CannabisPaymentData>({
    amount: paymentData?.amount || 0,
    currency: paymentData?.currency || 'USD',
    customerInfo: {
      email: paymentData?.customerEmail || '',
      name: paymentData?.customerInfo?.name || '',
      phone: paymentData?.customerInfo?.phone || '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      }
    },
    description: paymentData?.description || '',
    targetStablecoin: 'USDC',
    paymentMethod: 'ACH'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountHolderName: ''
  });

  useEffect(() => {
    loadProviders();
    if (formData.amount > 0) {
      getPaymentEstimate();
    }
  }, [formData.amount, formData.currency, formData.targetStablecoin, formData.paymentMethod]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/cannabis-payments/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(Object.values(data.providers));
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const getPaymentEstimate = async () => {
    if (formData.amount <= 0) return;

    try {
      const response = await fetch(
        `/api/cannabis-payments/estimate?amount=${formData.amount}&currency=${formData.currency}&targetStablecoin=${formData.targetStablecoin}&paymentMethod=${formData.paymentMethod}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEstimate(data.estimate);
      }
    } catch (error) {
      console.error('Failed to get estimate:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('customerInfo.')) {
      const field = name.split('.')[1];
      if (field === 'address') {
        const addressField = name.split('.')[2];
        setFormData(prev => ({
          ...prev,
          customerInfo: {
            ...prev.customerInfo,
            address: {
              ...prev.customerInfo.address!,
              [addressField]: value
            }
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          customerInfo: {
            ...prev.customerInfo,
            [field]: value
          }
        }));
      }
    } else if (name.startsWith('bankDetails.')) {
      const field = name.split('.')[1];
      setBankDetails(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'amount' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleCreatePayment = async () => {
    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.customerInfo.email || !formData.customerInfo.name) {
      setError('Please fill in all required customer information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cannabis-payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Cannabis-friendly payment request created successfully!');
        // Store payment ID for processing
        localStorage.setItem('currentPaymentId', data.payment.id);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create payment request');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessACH = async () => {
    const paymentId = localStorage.getItem('currentPaymentId');
    if (!paymentId) {
      setError('No payment found. Please create a payment first.');
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.routingNumber) {
      setError('Please fill in all bank details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cannabis-payments/process-ach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fiatPaymentId: paymentId,
          bankDetails
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('ACH transfer initiated successfully! Processing time: 1-3 business days.');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to process ACH transfer');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessProvider = async () => {
    const paymentId = localStorage.getItem('currentPaymentId');
    if (!paymentId) {
      setError('No payment found. Please create a payment first.');
      return;
    }

    if (!selectedProvider) {
      setError('Please select a payment provider');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cannabis-payments/process-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fiatPaymentId: paymentId,
          provider: selectedProvider,
          paymentData: {
            paymentMethod: formData.paymentMethod,
            amount: formData.amount,
            currency: formData.currency
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Payment processed successfully through ${selectedProvider}!`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to process payment');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="cannabis-payment-form">
      <div className="payment-header">
        <button onClick={onBack} className="back-button">← Back</button>
        <h2>🌿 Cannabis-Friendly Payment</h2>
        <p>Industry-compliant payment processing for hemp & cannabis businesses</p>
      </div>

      <div className="payment-content">
        <div className="compliance-banner">
          <div className="compliance-info">
            <h3>✅ Cannabis Industry Compliant</h3>
            <p>This payment system is specifically designed for hemp, CBD, and cannabis businesses</p>
            <div className="compliance-features">
              <span>🌿 Hemp & CBD Friendly</span>
              <span>🏛️ Regulatory Compliant</span>
              <span>💰 Lower Fees</span>
              <span>🔒 Secure Processing</span>
            </div>
          </div>
        </div>

        <div className="payment-details">
          <div className="merchant-info">
            <h3>{paymentData?.merchantInfo?.businessName || 'Merchant'}</h3>
            <p>Cannabis-Friendly Payment Request</p>
          </div>

          <div className="amount-section">
            <div className="amount-input">
              <label htmlFor="amount">Amount</label>
              <div className="amount-input-group">
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="currency-select"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="amount-field"
                />
              </div>
            </div>

            <div className="payment-method-selection">
              <label htmlFor="paymentMethod">Payment Method</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
              >
                <option value="ACH">ACH Bank Transfer (Lowest Fees)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            {estimate && (
              <div className="conversion-preview">
                <div className="conversion-amount">
                  <span className="fiat-amount">
                    {formatCurrency(estimate.fiatAmount, formData.currency)}
                  </span>
                  <span className="conversion-arrow">→</span>
                  <span className="stablecoin-amount">
                    {estimate.stablecoinAmount} {formData.targetStablecoin}
                  </span>
                </div>
                <div className="conversion-details">
                  <div>Exchange Rate: 1 {formData.currency} = {estimate.exchangeRate.toFixed(4)} {formData.targetStablecoin}</div>
                  <div>Fees: {formatCurrency(estimate.fees.total, formData.currency)}</div>
                  <div className="net-amount">
                    Net: {estimate.netStablecoinAmount.toFixed(6)} {formData.targetStablecoin}
                  </div>
                  {estimate.savings && (
                    <div className="savings-info">
                      <div className="savings-vs-stripe">
                        💰 Save {formatCurrency(estimate.savings.vsStripe, formData.currency)} vs Stripe
                      </div>
                      <div className="savings-vs-paypal">
                        💰 Save {formatCurrency(estimate.savings.vsPayPal, formData.currency)} vs PayPal
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="payment-form">
          <div className="form-section">
            <h3>Customer Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customerInfo.name">Full Name *</label>
                <input
                  type="text"
                  id="customerInfo.name"
                  name="customerInfo.name"
                  value={formData.customerInfo.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="customerInfo.email">Email Address *</label>
                <input
                  type="email"
                  id="customerInfo.email"
                  name="customerInfo.email"
                  value={formData.customerInfo.email}
                  onChange={handleInputChange}
                  required
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customerInfo.phone">Phone Number</label>
                <input
                  type="tel"
                  id="customerInfo.phone"
                  name="customerInfo.phone"
                  value={formData.customerInfo.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Payment description"
                />
              </div>
            </div>
          </div>

          {formData.paymentMethod === 'ACH' && (
            <div className="form-section">
              <h3>Bank Account Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bankDetails.bankName">Bank Name *</label>
                  <input
                    type="text"
                    id="bankDetails.bankName"
                    name="bankDetails.bankName"
                    value={bankDetails.bankName}
                    onChange={handleInputChange}
                    required
                    placeholder="Your bank name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bankDetails.accountHolderName">Account Holder Name *</label>
                  <input
                    type="text"
                    id="bankDetails.accountHolderName"
                    name="bankDetails.accountHolderName"
                    value={bankDetails.accountHolderName}
                    onChange={handleInputChange}
                    required
                    placeholder="Name on account"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bankDetails.accountNumber">Account Number *</label>
                  <input
                    type="text"
                    id="bankDetails.accountNumber"
                    name="bankDetails.accountNumber"
                    value={bankDetails.accountNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="Account number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bankDetails.routingNumber">Routing Number *</label>
                  <input
                    type="text"
                    id="bankDetails.routingNumber"
                    name="bankDetails.routingNumber"
                    value={bankDetails.routingNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="Routing number"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Stablecoin Selection</h3>
            <div className="stablecoin-selection">
              <label htmlFor="targetStablecoin">Convert to:</label>
              <select
                id="targetStablecoin"
                name="targetStablecoin"
                value={formData.targetStablecoin}
                onChange={handleInputChange}
              >
                <option value="USDC">USDC - USD Coin</option>
                <option value="USDT">USDT - Tether</option>
                <option value="DAI">DAI - Dai Stablecoin</option>
              </select>
              <p className="stablecoin-info">
                Your payment will be converted to {formData.targetStablecoin} and sent to the merchant
              </p>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="payment-actions">
          <button 
            onClick={handleCreatePayment} 
            className="create-payment-button"
            disabled={loading}
          >
            {loading ? 'Creating Payment...' : `Create Cannabis-Friendly Payment`}
          </button>

          {localStorage.getItem('currentPaymentId') && (
            <div className="processing-options">
              {formData.paymentMethod === 'ACH' && (
                <button 
                  onClick={handleProcessACH} 
                  className="process-ach-button"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Process ACH Transfer'}
                </button>
              )}

              <div className="provider-selection">
                <label>Or use a cannabis-friendly provider:</label>
                <select 
                  value={selectedProvider} 
                  onChange={(e) => setSelectedProvider(e.target.value)}
                >
                  <option value="">Select Provider</option>
                  {providers.map((provider) => (
                    <option key={provider.name} value={provider.name.toLowerCase().replace(' ', '')}>
                      {provider.name} ({provider.fees.transaction * 100}% fee)
                    </option>
                  ))}
                </select>
                {selectedProvider && (
                  <button 
                    onClick={handleProcessProvider} 
                    className="process-provider-button"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : `Process with ${selectedProvider}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="payment-footer">
          <div className="cannabis-benefits">
            <h4>🌿 Why Cannabis-Friendly Payments?</h4>
            <ul>
              <li>✅ <strong>Industry Compliant:</strong> Designed specifically for hemp & cannabis businesses</li>
              <li>💰 <strong>Lower Fees:</strong> Save 50-70% compared to Stripe/PayPal</li>
              <li>🏛️ <strong>Regulatory Support:</strong> Built-in compliance features</li>
              <li>🔒 <strong>Secure:</strong> Bank-level security with cannabis industry expertise</li>
              <li>⚡ <strong>Fast Settlement:</strong> Quick conversion to stablecoins</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CannabisFriendlyPaymentForm;



