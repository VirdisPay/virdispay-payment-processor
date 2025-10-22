import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { switchToPolygon, isOnPolygon, estimateGasCost, POLYGON_MAINNET } from '../utils/blockchain';

const PublicPaymentPage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletMethod, setWalletMethod] = useState<'metamask' | 'coinbase' | 'manual' | 'other' | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch payment data on mount
  useEffect(() => {
    fetchPaymentData();
  }, [paymentId]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/payments/public/${paymentId}`);
      const data = await response.json();

      if (data.success) {
        setPaymentData(data.payment);
        setPaymentStatus(data.payment.status);
      } else {
        setError(data.message || 'Payment not found');
      }
    } catch (err) {
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const connectMetaMask = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed. Please install MetaMask browser extension.');
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
      setError('');

      // Try to switch to optimal network
      try {
        await switchToPolygon();
      } catch (switchError) {
        console.log('Network switch optional:', switchError);
      }
    } catch (err) {
      setError('Failed to connect MetaMask. Please try again.');
    }
  };

  const connectCoinbaseWallet = async () => {
    try {
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
    } catch (err) {
      setError('Failed to connect Coinbase Wallet. Please try again.');
    }
  };

  const connectOtherWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        setWalletMethod('other');
        setShowWalletOptions(false);
        setError('');
      } else {
        setError('No wallet detected. Please install a Web3 wallet extension.');
      }
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleManualConnect = () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }
    
    setWalletConnected(true);
    setWalletAddress(manualAddress);
    setWalletMethod('manual');
    setShowManualEntry(false);
    setShowWalletOptions(false);
    setError('');
  };

  const processPayment = async () => {
    try {
      setProcessing(true);
      setError('');

      // Update payment with wallet address
      const updateResponse = await fetch(`${API_URL}/api/payments/${paymentData.id}/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          customerWallet: walletAddress,
          paymentMethod: walletMethod 
        })
      });

      const updateData = await updateResponse.json();

      if (!updateData.success) {
        throw new Error(updateData.message || 'Failed to update payment');
      }

      // If using browser wallet, initiate blockchain transaction
      if (walletMethod !== 'manual' && typeof window.ethereum !== 'undefined') {
        try {
          const transactionParameters = {
            to: paymentData.merchantWallet,
            from: walletAddress,
            value: '0x' + Math.floor(parseFloat(paymentData.amountInCrypto) * 1e18).toString(16),
            data: '0x'
          };

          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
          });

          setTxHash(txHash);
          setPaymentStatus('completed');
          
          alert('✅ Payment submitted successfully!');
        } catch (txError: any) {
          if (txError.code === 4001) {
            setError('Transaction cancelled by user');
          } else {
            setError('Transaction failed: ' + txError.message);
          }
          setProcessing(false);
          return;
        }
      } else {
        // Manual payment - show instructions
        setPaymentStatus('processing');
        alert('✅ Wallet address saved! Please send the payment manually to the merchant wallet address shown below.');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '16px', 
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)' 
        }}>
          <div style={{ fontSize: '48px', textAlign: 'center' }}>⏳</div>
          <h2 style={{ margin: '20px 0 0 0', textAlign: 'center' }}>Loading Payment...</h2>
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '16px', 
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px' }}>❌</div>
          <h2 style={{ margin: '20px 0 10px 0', color: '#e74c3c' }}>Payment Not Found</h2>
          <p style={{ margin: 0, color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '60px 40px', 
          borderRadius: '16px', 
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>✅</div>
          <h1 style={{ margin: '0 0 10px 0', color: '#27ae60', fontSize: '32px' }}>Payment Successful!</h1>
          <p style={{ margin: '0 0 30px 0', color: '#666', fontSize: '16px' }}>
            Your payment has been submitted to the blockchain
          </p>
          
          {txHash && (
            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: '#555' }}>
                Transaction Hash:
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: '#3498db', 
                wordBreak: 'break-all',
                fontFamily: 'monospace'
              }}>
                {txHash}
              </p>
            </div>
          )}

          <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>
            You can close this page now
          </p>
        </div>
      </div>
    );
  }

  // Generate QR code URL (replace localhost with local IP for mobile access)
  const getQRCodeUrl = () => {
    const url = window.location.href;
    // If localhost, replace with local network IP for mobile scanning
    if (url.includes('localhost')) {
      return url.replace('localhost', '192.168.0.13');
    }
    return url;
  };
  
  const currentUrl = getQRCodeUrl();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>Payment Request</h1>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Secure crypto payment powered by VirdisPay
          </p>
        </div>

        {/* Payment Details */}
        <div style={{ padding: '30px' }}>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '25px', 
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <span style={{ fontSize: '16px', color: '#666' }}>Amount:</span>
              <span style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
                ${paymentData?.amount?.toFixed(2)}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '15px 0',
              borderTop: '1px solid #e0e0e0'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Currency:</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#3498db' }}>
                {paymentData?.currency}{paymentData?.network ? ` (${paymentData.network})` : ''}
              </span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '15px 0',
              borderTop: '1px solid #e0e0e0'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Crypto Amount:</span>
              <span style={{ fontSize: '16px', fontWeight: '600' }}>
                {paymentData?.amountInCrypto ? parseFloat(paymentData.amountInCrypto).toFixed(6) : '0.000000'} {paymentData?.currency}
              </span>
            </div>

            {paymentData?.description && (
              <div style={{ 
                padding: '15px 0',
                borderTop: '1px solid #e0e0e0'
              }}>
                <span style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '5px' }}>
                  Description:
                </span>
                <span style={{ fontSize: '14px', color: '#2c3e50' }}>
                  {paymentData.description}
                </span>
              </div>
            )}
          </div>

          {/* QR Code Section for Mobile */}
          {!walletConnected && (
            <>
              <div style={{
                background: '#f0f7ff',
                padding: '25px',
                borderRadius: '12px',
                border: '2px solid #3498db',
                marginBottom: '25px',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '18px' }}>
                  📱 Scan with Mobile Wallet
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
                  Open this page in your mobile wallet app
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  marginBottom: '15px'
                }}>
                  <QRCodeSVG 
                    value={currentUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                  Works with Trust Wallet, MetaMask Mobile, and more
                </p>
              </div>

              {/* OR Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '25px',
                gap: '15px'
              }}>
                <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
                <span style={{ color: '#999', fontSize: '14px', fontWeight: '600' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
              </div>
            </>
          )}

          {/* Wallet Connection Section */}
          {!walletConnected ? (
            showWalletOptions ? (
              <div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50', textAlign: 'center' }}>
                  Choose Your Wallet
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* MetaMask */}
                  <button 
                    onClick={connectMetaMask} 
                    style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, #f6851b 0%, #e2761b 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <span style={{ fontSize: '24px' }}>🦊</span>
                    MetaMask
                  </button>

                  {/* Coinbase Wallet */}
                  <button 
                    onClick={connectCoinbaseWallet} 
                    style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, #0052ff 0%, #0041cc 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <span style={{ fontSize: '24px' }}>💙</span>
                    Coinbase Wallet
                  </button>

                  {/* Trust Wallet / Other */}
                  <button 
                    onClick={connectOtherWallet} 
                    style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, #3375bb 0%, #2a5f9c 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <span style={{ fontSize: '24px' }}>🔷</span>
                    Trust Wallet / Other
                  </button>

                  {/* Manual Entry */}
                  <button 
                    onClick={() => {
                      setShowManualEntry(true);
                      setShowWalletOptions(false);
                    }} 
                    style={{
                      padding: '16px 20px',
                      background: 'white',
                      color: '#3498db',
                      border: '2px solid #3498db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#3498db';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#3498db';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>✍️</span>
                    Enter Wallet Address Manually
                  </button>
                </div>

                <button 
                  onClick={() => setShowWalletOptions(false)}
                  style={{
                    width: '100%',
                    marginTop: '15px',
                    padding: '12px',
                    background: 'transparent',
                    color: '#999',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Back
                </button>
              </div>
            ) : showManualEntry ? (
              <div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50' }}>
                  Enter Your Wallet Address
                </h3>
                
                <input
                  type="text"
                  placeholder="0x..."
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />

                <button 
                  onClick={handleManualConnect}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '10px'
                  }}
                >
                  Connect
                </button>

                <button 
                  onClick={() => {
                    setShowManualEntry(false);
                    setShowWalletOptions(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'transparent',
                    color: '#999',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Back to wallet options
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowWalletOptions(true)}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🔗 Connect Wallet to Pay
              </button>
            )
          ) : (
            <div>
              {/* Wallet Connected */}
              <div style={{ 
                background: '#d4edda', 
                padding: '20px', 
                borderRadius: '12px',
                marginBottom: '25px',
                border: '2px solid #28a745'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#155724' }}>
                    Wallet Connected
                  </span>
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#155724',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {walletAddress}
                </p>
              </div>

              {/* Payment Instructions */}
              {walletMethod === 'manual' ? (
                <div style={{ 
                  background: '#fff3cd', 
                  padding: '20px', 
                  borderRadius: '12px',
                  marginBottom: '25px',
                  border: '1px solid #ffc107'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#856404', fontSize: '16px' }}>
                    ⚠️ Manual Payment Instructions
                  </h4>
                  <ol style={{ margin: '0', paddingLeft: '20px', color: '#856404', fontSize: '14px' }}>
                    <li style={{ marginBottom: '10px' }}>
                      Send <strong>{paymentData?.amountInCrypto} {paymentData?.currency}</strong> to the merchant wallet below
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                      Use <strong>{paymentData?.network}</strong> network
                    </li>
                    <li>Payment will be confirmed once transaction is detected on the blockchain</li>
                  </ol>
                  
                  <div style={{ 
                    background: 'white', 
                    padding: '15px', 
                    borderRadius: '8px',
                    marginTop: '15px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#666' }}>
                      MERCHANT WALLET ADDRESS:
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      color: '#2c3e50',
                      fontWeight: '600'
                    }}>
                      {paymentData?.merchantWallet}
                    </p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={processPayment}
                  disabled={processing}
                  style={{
                    width: '100%',
                    padding: '18px',
                    background: processing ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                    marginBottom: '15px'
                  }}
                >
                  {processing ? '⏳ Processing...' : '💰 Send Payment'}
                </button>
              )}

              <button 
                onClick={() => {
                  setWalletConnected(false);
                  setWalletAddress('');
                  setWalletMethod(null);
                  setShowWalletOptions(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  color: '#999',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Disconnect Wallet
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{ 
              background: '#f8d7da', 
              color: '#721c24',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '20px',
              fontSize: '14px',
              border: '1px solid #f5c6cb'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Security Notice */}
          <div style={{ 
            marginTop: '30px', 
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
              🔒 Secure payment powered by blockchain technology
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
              This payment processor is compliant with hemp and cannabis industry regulations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPaymentPage;

