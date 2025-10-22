import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { switchToPolygon, isOnPolygon, estimateGasCost, POLYGON_MAINNET } from '../utils/blockchain';

interface NetworkRecommendation {
  optimal: {
    name: string;
    estimatedCost: number;
    speed: string;
  };
  alternatives: Array<{
    name: string;
    estimatedCost: number;
    speed: string;
  }>;
  savings: {
    amount: number;
    percentage: number;
  };
  recommendation: string;
}

interface PaymentFormProps {
  paymentData: any;
  onBack: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ paymentData, onBack }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isPolygonNetwork, setIsPolygonNetwork] = useState(false);
  const [gasCost, setGasCost] = useState({ cost: '$0.01', savings: 'Ultra-low fees on Polygon!' });
  const [routingRecommendation, setRoutingRecommendation] = useState<NetworkRecommendation | null>(null);
  const [showRoutingDetails, setShowRoutingDetails] = useState(false);
  const [walletMethod, setWalletMethod] = useState<'metamask' | 'coinbase' | 'manual' | 'other' | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(true);

  useEffect(() => {
    // Check if MetaMask is available
    if (typeof window.ethereum !== 'undefined') {
      checkWalletConnection();
    }
    
    // Get smart routing recommendation
    getRoutingRecommendation();
  }, [paymentData]);

  const getRoutingRecommendation = async () => {
    try {
      const response = await fetch('/api/smart-routing/optimal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: paymentData.currency,
          urgency: 'normal'
        })
      });

      const data = await response.json();
      if (data.success) {
        setRoutingRecommendation(data.routing);
      }
    } catch (error) {
      console.error('Failed to get routing recommendation:', error);
    }
  };

  const checkWalletConnection = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        
        // Check if on Polygon network
        const onPolygon = await isOnPolygon();
        setIsPolygonNetwork(onPolygon);
        
        // Update gas cost estimate
        const gasEstimate = estimateGasCost(POLYGON_MAINNET);
        setGasCost(gasEstimate);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectMetaMask = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed. Please install MetaMask extension to continue.');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      setWalletMethod('metamask');
      setShowWalletOptions(false);
      
      // Auto-switch to Polygon for ultra-low gas fees
      try {
        await switchToPolygon();
        setIsPolygonNetwork(true);
        setError('');
      } catch (switchError: any) {
        setError('Please switch to Polygon network in MetaMask for lower gas fees ($0.01 vs $50+)');
        setIsPolygonNetwork(false);
      }
    } catch (error) {
      setError('Failed to connect MetaMask. Please try again.');
    }
  };

  const connectCoinbaseWallet = async () => {
    try {
      // Check if Coinbase Wallet is available
      if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        setWalletMethod('coinbase');
        setShowWalletOptions(false);
        setError('');
      } else {
        setError('Coinbase Wallet extension not detected. Please install it to continue.');
        window.open('https://www.coinbase.com/wallet', '_blank');
      }
    } catch (error) {
      setError('Failed to connect Coinbase Wallet. Please try again.');
    }
  };

  const connectOtherWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          setError('Please open this page in your wallet\'s browser (Trust Wallet, Rainbow, etc.)');
        } else {
          setError('No wallet detected. Please install a Web3 wallet extension.');
        }
        return;
      }

      // Detect which wallet is being used
      const provider = window.ethereum;
      let walletName = 'Web3 Wallet';
      
      if (provider.isTrust) {
        walletName = 'Trust Wallet';
      } else if (provider.isMetaMask && !provider.isTrust && !provider.isCoinbaseWallet) {
        walletName = 'MetaMask';
      } else if (provider.isCoinbaseWallet) {
        walletName = 'Coinbase Wallet';
      }
      
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      setWalletMethod('other');
      setShowWalletOptions(false);
      
      // Try to switch to Polygon
      try {
        await switchToPolygon();
        setIsPolygonNetwork(true);
        setError('');
      } catch (switchError: any) {
        setError(`Connected via ${walletName}. Please switch to Polygon network for lower gas fees.`);
        setIsPolygonNetwork(false);
      }
    } catch (error) {
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const connectManualAddress = () => {
    if (!manualAddress || !manualAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    
    setWalletConnected(true);
    setWalletAddress(manualAddress);
    setWalletMethod('manual');
    setShowWalletOptions(false);
    setError('');
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setWalletMethod(null);
    setShowWalletOptions(true);
    setManualAddress('');
    setError('');
  };
  
  const handleSwitchToPolygon = async () => {
    try {
      setLoading(true);
      await switchToPolygon();
      setIsPolygonNetwork(true);
      setError('');
      setLoading(false);
    } catch (error: any) {
      setError('Failed to switch to Polygon. Please switch manually in MetaMask.');
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!walletConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // This is a simplified example - in a real implementation, you would:
      // 1. Create the transaction with the correct parameters
      // 2. Sign and send the transaction
      // 3. Get the transaction hash
      // 4. Send the hash to your backend

      // For demo purposes, we'll simulate a transaction
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      setTxHash(mockTxHash);

      // Send transaction hash to backend
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId: paymentData.transactionId,
          txHash: mockTxHash,
          fromAddress: walletAddress
        })
      });

      if (response.ok) {
        // Payment processing initiated
        console.log('Payment processing started');
      } else {
        setError('Failed to process payment');
      }
    } catch (error) {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <button onClick={onBack} className="back-button">← Back</button>
          <h2>Complete Payment</h2>
        </div>

        <div className="payment-details">
          <div className="merchant-info">
            <h3>{paymentData.merchantInfo.businessName}</h3>
            <p>Payment Request</p>
          </div>

          <div className="payment-amount">
            <div className="amount-display">
              <span className="amount">{formatAmount(paymentData.amount, paymentData.currency)}</span>
              <span className="currency">{paymentData.currency}</span>
            </div>
            <div className="crypto-amount">
              ≈ {paymentData.cryptoAmount} {paymentData.currency}
            </div>
          </div>

          <div className="exchange-rate">
            <p>Exchange Rate: 1 {paymentData.currency} = ${paymentData.exchangeRate}</p>
          </div>

          {/* Smart Routing Recommendation */}
          {routingRecommendation && (
            <div className="smart-routing-info">
              <div className="routing-header">
                <h4>🎯 Smart Routing Recommendation</h4>
                <button 
                  className="routing-details-toggle"
                  onClick={() => setShowRoutingDetails(!showRoutingDetails)}
                >
                  {showRoutingDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              <div className="optimal-network">
                <div className="network-badge optimal">
                  <span className="network-name">{routingRecommendation.optimal.name}</span>
                  <span className="network-cost">${routingRecommendation.optimal.estimatedCost.toFixed(4)}</span>
                  <span className="network-speed">{routingRecommendation.optimal.speed}</span>
                </div>
                
                {routingRecommendation.savings.amount > 0 && (
                  <div className="savings-info">
                    <span className="savings-amount">
                      💰 Save ${routingRecommendation.savings.amount.toFixed(4)} ({routingRecommendation.savings.percentage.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>

              {showRoutingDetails && (
                <div className="routing-details">
                  <p className="recommendation-text">{routingRecommendation.recommendation}</p>
                  
                  {routingRecommendation.alternatives.length > 0 && (
                    <div className="alternative-networks">
                      <h5>Alternative Networks:</h5>
                      {routingRecommendation.alternatives.map((alt, index) => (
                        <div key={index} className="alternative-network">
                          <span className="network-name">{alt.name}</span>
                          <span className="network-cost">${alt.estimatedCost.toFixed(4)}</span>
                          <span className="network-speed">{alt.speed}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR Code Section for Mobile Wallets */}
        {!walletConnected && (
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #3498db',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>📱 Scan to Pay with Mobile Wallet</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
              Open your mobile wallet app and scan this QR code
            </p>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e0e0e0'
              }}>
                <QRCodeSVG 
                  value={window.location.href.replace('localhost', '192.168.0.13')}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
            
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '15px'
            }}>
              <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                ✅ Works with Trust Wallet, MetaMask Mobile, Coinbase Wallet, and more
              </p>
              <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                💡 Scan the QR code to open this payment page in your mobile wallet browser
              </p>
            </div>
          </div>
        )}

        {/* OR Divider */}
        {!walletConnected && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '30px',
            gap: '20px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
            <span style={{ color: '#999', fontSize: '14px', fontWeight: '600' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
          </div>
        )}

        <div className="wallet-section">
          <h3>Connect Your Wallet</h3>
          
          {!walletConnected ? (
            showWalletOptions ? (
              <div className="wallet-options">
                <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
                  Or choose your preferred desktop wallet connection method
                </p>
                
                {/* MetaMask */}
                <button 
                  onClick={connectMetaMask} 
                  className="wallet-option-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 20px',
                    marginBottom: '12px',
                    background: '#fff',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f6851b';
                    e.currentTarget.style.background = '#fff9f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>🦊</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>MetaMask</div>
                      <div style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}>
                        Most popular Web3 wallet
                      </div>
                    </div>
                  </div>
                  <span style={{ color: '#3498db', fontSize: '20px' }}>→</span>
                </button>

                {/* Coinbase Wallet */}
                <button 
                  onClick={connectCoinbaseWallet} 
                  className="wallet-option-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 20px',
                    marginBottom: '12px',
                    background: '#fff',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0052ff';
                    e.currentTarget.style.background = '#f0f5ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>💙</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>Coinbase Wallet</div>
                      <div style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}>
                        Trusted by millions
                      </div>
                    </div>
                  </div>
                  <span style={{ color: '#3498db', fontSize: '20px' }}>→</span>
                </button>

                {/* Trust Wallet / Other Wallets */}
                <button 
                  onClick={connectOtherWallet} 
                  className="wallet-option-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    background: '#fff',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3498db';
                    e.currentTarget.style.background = '#f0f8ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>🔷</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>Trust Wallet / Other</div>
                      <div style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}>
                        WalletConnect compatible wallets
                      </div>
                    </div>
                  </div>
                  <span style={{ color: '#3498db', fontSize: '20px' }}>→</span>
                </button>

                {/* Manual Address Entry */}
                <div style={{
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px dashed #cbd5e0'
                }}>
                  <div style={{ marginBottom: '12px', fontWeight: '600', color: '#555' }}>
                    ✍️ Or enter your wallet address manually:
                  </div>
                  <input
                    type="text"
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      marginBottom: '12px',
                      border: '1px solid #cbd5e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={connectManualAddress}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#2c3e50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      transition: 'background 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#34495e'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#2c3e50'}
                  >
                    Continue with this Address
                  </button>
                  <p style={{ marginTop: '12px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                    Works with any EVM-compatible wallet (Trust, Rainbow, Ledger, etc.)
                  </p>
                </div>

                <p style={{ 
                  marginTop: '20px', 
                  fontSize: '13px', 
                  color: '#999', 
                  textAlign: 'center',
                  padding: '12px',
                  background: '#f0f8ff',
                  borderRadius: '8px'
                }}>
                  💡 <strong>Don't have a wallet?</strong> Download <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" style={{color: '#3498db'}}>MetaMask</a> or <a href="https://trustwallet.com" target="_blank" rel="noopener noreferrer" style={{color: '#3498db'}}>Trust Wallet</a> - it's free!
                </p>
              </div>
            ) : null
          ) : (
            <div className="wallet-connected">
              <div className="wallet-info" style={{
                background: '#f0fdf4',
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid #86efac',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                      ✅ Wallet Connected
                      {walletMethod === 'metamask' && ' (MetaMask)'}
                      {walletMethod === 'coinbase' && ' (Coinbase Wallet)'}
                      {walletMethod === 'manual' && ' (Manual Address)'}
                    </p>
                    <p className="wallet-address" style={{ 
                      margin: 0, 
                      fontFamily: 'monospace', 
                      fontSize: '13px',
                      color: '#15803d'
                    }}>
                      {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                    </p>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              
              <div className="payment-actions">
                <button 
                  onClick={processPayment} 
                  className="process-payment-button"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: loading ? '#95a5a6' : '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    fontWeight: '700',
                    transition: 'background 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.background = '#229954';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.background = '#27ae60';
                  }}
                >
                  {loading ? 'Processing...' : `Pay ${formatAmount(paymentData.amount, paymentData.currency)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {txHash && (
          <div className="transaction-info">
            <h4>Transaction Submitted</h4>
            <p>Transaction Hash: {txHash}</p>
            <p>Your payment is being processed. You can track the status using the transaction hash.</p>
          </div>
        )}

        <div className="payment-footer">
          <p className="security-note">
            🔒 Your payment is secured by blockchain technology
          </p>
          <p className="compliance-note">
            This payment processor is compliant with hemp and cannabis industry regulations
          </p>
        </div>
      </div>
    </div>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default PaymentForm;
