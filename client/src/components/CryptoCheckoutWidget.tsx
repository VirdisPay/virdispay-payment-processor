import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './CryptoCheckoutWidget.css';

interface CryptoCheckoutWidgetProps {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail?: string;
  onPaymentComplete?: (paymentId: string) => void;
  onPaymentError?: (error: string) => void;
  merchantId: string;
  apiKey: string;
}

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  network?: string;
  amountInCrypto: number;
  merchantWallet: string;
  description: string;
  status: string;
  paymentUrl: string;
}

const CryptoCheckoutWidget: React.FC<CryptoCheckoutWidgetProps> = ({
  amount,
  currency,
  orderId,
  customerEmail,
  onPaymentComplete,
  onPaymentError,
  merchantId,
  apiKey
}) => {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletMethod, setWalletMethod] = useState<'metamask' | 'coinbase' | 'other' | 'manual' | null>(null);

  // Create payment request
  const createPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock response for testing
      const mockPayment = {
        id: 'test-payment-123',
        amount: amount,
        currency: currency,
        network: 'Polygon',
        amountInCrypto: amount, // 1:1 for testing
        merchantWallet: '0x1234567890123456789012345678901234567890',
        description: `Payment for Order ${orderId}`,
        status: 'pending',
        paymentUrl: `http://localhost:3000/pay/test-payment-123`
      };

      setPaymentData(mockPayment);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update customer wallet address
  const updateWalletAddress = async () => {
    if (!paymentData || !walletAddress) return;

    try {
      const response = await fetch(`/api/payments/public/${paymentData.id}/wallet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerWallet: walletAddress
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update wallet address');
      }
    } catch (err) {
      console.error('Failed to update wallet address:', err);
    }
  };

  // Check payment status
  const checkPaymentStatus = async () => {
    if (!paymentData) return;

    try {
      const response = await fetch(`/api/payments/public/${paymentData.id}`);
      const data = await response.json();

      if (data.payment.status === 'completed') {
        onPaymentComplete?.(paymentData.id);
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
    }
  };

  // Wallet connection functions
  const connectMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletMethod('metamask');
        }
      } catch (err) {
        console.error('MetaMask connection failed:', err);
      }
    } else {
      alert('MetaMask is not installed. Please install MetaMask or enter your wallet address manually.');
    }
  };

  const connectCoinbaseWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletMethod('coinbase');
        }
      } catch (err) {
        console.error('Coinbase Wallet connection failed:', err);
      }
    } else {
      alert('Coinbase Wallet is not installed. Please install Coinbase Wallet or enter your wallet address manually.');
    }
  };

  const connectOtherWallet = async () => {
    // Try Trust Wallet first, then fall back to other wallets
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Check if Trust Wallet is available
        if (window.ethereum.isTrust) {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletMethod('other');
            return;
          }
        }
        
        // If Trust Wallet not available, try other wallets
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletMethod('other');
        }
      } catch (err) {
        console.error('Wallet connection failed:', err);
        alert('Wallet connection failed. Please try manual entry or install Trust Wallet.');
      }
    } else {
      alert('No wallet detected. Please install Trust Wallet or enter your wallet address manually.');
    }
  };

  // Initialize payment on component mount
  useEffect(() => {
    createPayment();
  }, []);

  // Poll for payment status
  useEffect(() => {
    if (!paymentData) return;

    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [paymentData]);

  // Update wallet address when it changes
  useEffect(() => {
    if (walletAddress && paymentData) {
      updateWalletAddress();
    }
  }, [walletAddress, paymentData]);

  if (loading) {
    return (
      <div className="crypto-checkout-widget">
        <div className="checkout-loading">
          <div className="spinner"></div>
          <p>Creating payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crypto-checkout-widget">
        <div className="checkout-error">
          <h3>❌ Payment Error</h3>
          <p>{error}</p>
          <button onClick={createPayment} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="crypto-checkout-widget">
        <div className="checkout-error">
          <h3>❌ Payment Not Found</h3>
          <p>Failed to load payment information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-checkout-widget">
      <div className="checkout-header">
        <h3>💳 Pay with Crypto</h3>
        <div className="payment-amount">
          <span className="fiat-amount">${amount.toFixed(2)} {currency}</span>
          <span className="crypto-amount">
            {paymentData.amountInCrypto.toFixed(6)} {paymentData.currency}
            {paymentData.network && ` (${paymentData.network})`}
          </span>
        </div>
      </div>

      <div className="checkout-content">
        {/* QR Code */}
        <div className="qr-section">
          <h4>📱 Scan QR Code</h4>
          <div className="qr-code">
            <QRCodeSVG value={paymentData.paymentUrl} size={200} />
          </div>
          <p className="qr-instructions">
            Scan with your mobile wallet to pay instantly
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="wallet-section">
          <h4>🔗 Connect Wallet</h4>
          <div className="wallet-buttons">
            <button 
              onClick={connectMetaMask} 
              className={`wallet-btn ${walletMethod === 'metamask' ? 'active' : ''}`}
            >
              🦊 MetaMask
            </button>
            <button 
              onClick={connectCoinbaseWallet} 
              className={`wallet-btn ${walletMethod === 'coinbase' ? 'active' : ''}`}
            >
              🔵 Coinbase
            </button>
            <button 
              onClick={connectOtherWallet} 
              className={`wallet-btn ${walletMethod === 'other' ? 'active' : ''}`}
            >
              🛡️ Trust Wallet
            </button>
          </div>

          {/* Manual Address Entry */}
          <div className="manual-entry">
            <label>Or enter wallet address manually:</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="wallet-input"
            />
            <button 
              onClick={() => setWalletMethod('manual')}
              className="wallet-btn"
              style={{ marginTop: '8px', width: '100%' }}
            >
              ✅ Use This Address
            </button>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="payment-instructions">
          <h4>📋 Payment Instructions</h4>
          <ol>
            <li>Connect your wallet or scan the QR code</li>
            <li>Send exactly <strong>{paymentData.amountInCrypto.toFixed(6)} {paymentData.currency}</strong> to:</li>
            <li className="merchant-wallet">
              <code>{paymentData.merchantWallet}</code>
            </li>
            {walletAddress && walletMethod === 'manual' && (
              <li style={{ color: '#27ae60', fontWeight: 'bold' }}>
                ✅ Your wallet: {walletAddress}
              </li>
            )}
            <li>Payment will be confirmed automatically</li>
          </ol>
        </div>

        {/* Status */}
        <div className="payment-status">
          <div className={`status-indicator ${paymentData.status}`}>
            {paymentData.status === 'pending' && (
              <button 
                onClick={() => {
                  setPaymentData(prev => prev ? {...prev, status: 'completed'} : null);
                  onPaymentComplete?.(paymentData?.id || 'test-payment-123');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  fontSize: 'inherit',
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '6px',
                  width: '100%'
                }}
              >
                ⏳ Click to Simulate Payment
              </button>
            )}
            {paymentData.status === 'completed' && '✅ Payment completed!'}
            {paymentData.status === 'failed' && '❌ Payment failed'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoCheckoutWidget;
