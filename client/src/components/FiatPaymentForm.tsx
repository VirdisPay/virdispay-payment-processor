import React, { useState, useEffect } from 'react';

interface FiatPaymentData {
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
}

interface FiatPaymentFormProps {
  paymentData: any;
  onBack: () => void;
}

const FiatPaymentForm: React.FC<FiatPaymentFormProps> = ({ paymentData, onBack }) => {
  const [formData, setFormData] = useState<FiatPaymentData>({
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
    targetStablecoin: 'USDC'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  useEffect(() => {
    loadSupportedCurrencies();
    if (formData.amount > 0) {
      getPaymentEstimate();
    }
  }, [formData.amount, formData.currency, formData.targetStablecoin]);

  const loadSupportedCurrencies = async () => {
    try {
      const response = await fetch('/api/fiat-payments/supported-currencies');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.currencies.paymentMethods);
      }
    } catch (error) {
      console.error('Failed to load supported currencies:', error);
    }
  };

  const getPaymentEstimate = async () => {
    if (formData.amount <= 0) return;

    try {
      const response = await fetch(
        `/api/fiat-payments/estimate?amount=${formData.amount}&currency=${formData.currency}&targetStablecoin=${formData.targetStablecoin}`
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
      const response = await fetch('/api/fiat-payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Payment request created successfully!');
        // Redirect to payment processing
        setTimeout(() => {
          // In a real implementation, you would redirect to Stripe/PayPal checkout
          console.log('Redirecting to payment processor...', data.payment);
        }, 2000);
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="fiat-payment-form">
      <div className="payment-header">
        <button onClick={onBack} className="back-button">← Back</button>
        <h2>Pay with Fiat Currency</h2>
        <p>Pay with your credit card, bank account, or digital wallet</p>
      </div>

      <div className="payment-content">
        <div className="payment-details">
          <div className="merchant-info">
            <h3>{paymentData?.merchantInfo?.businessName || 'Merchant'}</h3>
            <p>Payment Request</p>
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

          <div className="form-section">
            <h3>Payment Method</h3>
            <div className="payment-methods">
              {paymentMethods.map((method) => (
                <div key={method.code} className="payment-method-option">
                  <label className="payment-method-label">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.code}
                      checked={selectedPaymentMethod === method.code}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    />
                    <span className="method-icon">{method.icon}</span>
                    <span className="method-name">{method.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

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
            disabled={loading || !selectedPaymentMethod}
          >
            {loading ? 'Creating Payment...' : `Pay ${formatCurrency(formData.amount, formData.currency)}`}
          </button>
        </div>

        <div className="payment-footer">
          <div className="security-info">
            <p>🔒 Your payment is secured by industry-standard encryption</p>
            <p>💱 Automatic conversion to {formData.targetStablecoin} for the merchant</p>
            <p>✅ Compliant with hemp and cannabis industry regulations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiatPaymentForm;

