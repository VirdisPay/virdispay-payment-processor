import React, { useState } from 'react';
import './WalletConnectionOnboarding.css';

interface WalletConnectionOnboardingProps {
  onWalletConnected: (walletAddress: string, walletMethod: string) => void;
  onSkip: () => void;
  businessName: string;
}

const WalletConnectionOnboarding: React.FC<WalletConnectionOnboardingProps> = ({ 
  onWalletConnected, 
  onSkip, 
  businessName 
}) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletMethod, setWalletMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connectTrustWallet = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Check if Trust Wallet is available
        if (window.ethereum.isTrust) {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletMethod('trust');
            onWalletConnected(accounts[0], 'trust');
            return;
          }
        }
        
        // Try other wallets if Trust Wallet not available
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletMethod('other');
          onWalletConnected(accounts[0], 'other');
        }
      } else {
        setError('No wallet detected. Please install Trust Wallet or enter your wallet address manually.');
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError('Wallet connection failed. Please try manual entry or install Trust Wallet.');
    } finally {
      setLoading(false);
    }
  };

  const connectMetaMask = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletMethod('metamask');
          onWalletConnected(accounts[0], 'metamask');
        }
      } else {
        setError('MetaMask not detected. Please install MetaMask or enter your wallet address manually.');
      }
    } catch (err) {
      console.error('MetaMask connection failed:', err);
      setError('MetaMask connection failed. Please try manual entry or install MetaMask.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    if (walletAddress && walletAddress.startsWith('0x') && walletAddress.length === 42) {
      setWalletMethod('manual');
      onWalletConnected(walletAddress, 'manual');
    } else {
      setError('Please enter a valid Ethereum wallet address (0x...)');
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="wallet-onboarding">
      <div className="wallet-container">
        <div className="wallet-header">
          <h2>Connect Your Wallet</h2>
          <p>Welcome to VirdisPay, <strong>{businessName}</strong>! Connect your crypto wallet to start accepting payments.</p>
          <p className="wallet-subtitle">
            🔒 <strong>Non-custodial:</strong> You keep full control of your private keys and funds
          </p>
        </div>

        <div className="wallet-options">
          <div className="wallet-option">
            <div className="wallet-icon">🛡️</div>
            <h3>Trust Wallet</h3>
            <p>Recommended for mobile and desktop</p>
            <button 
              className="wallet-button primary"
              onClick={connectTrustWallet}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Trust Wallet'}
            </button>
          </div>

          <div className="wallet-option">
            <div className="wallet-icon">🦊</div>
            <h3>MetaMask</h3>
            <p>Popular browser extension</p>
            <button 
              className="wallet-button secondary"
              onClick={connectMetaMask}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        </div>

        <div className="wallet-divider">
          <span>or</span>
        </div>

        <div className="manual-entry">
          <h3>Enter Wallet Address Manually</h3>
          <p>If you prefer to enter your wallet address manually:</p>
          
          <div className="input-group">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="wallet-input"
            />
            <button
              onClick={handleManualEntry}
              className="wallet-button manual"
              disabled={!walletAddress || loading}
            >
              Use This Address
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {walletAddress && walletMethod && (
          <div className="wallet-success">
            <div className="success-icon">✅</div>
            <div className="success-content">
              <h4>Wallet Connected Successfully!</h4>
              <p className="wallet-address">
                <strong>Address:</strong> {walletAddress}
              </p>
              <p className="wallet-method">
                <strong>Method:</strong> {walletMethod === 'trust' ? 'Trust Wallet' : 
                                        walletMethod === 'metamask' ? 'MetaMask' : 'Manual Entry'}
              </p>
            </div>
          </div>
        )}

        <div className="wallet-actions">
          <button 
            className="skip-button"
            onClick={handleSkip}
          >
            Skip for now (Add wallet later)
          </button>
        </div>

        <div className="wallet-footer">
          <h4>Why Connect a Wallet?</h4>
          <ul className="benefits-list">
            <li>✅ <strong>Receive payments directly</strong> - Funds go straight to your wallet</li>
            <li>✅ <strong>No custody risk</strong> - We never hold your private keys</li>
            <li>✅ <strong>Instant settlements</strong> - No waiting for bank transfers</li>
            <li>✅ <strong>Global access</strong> - Accept payments from anywhere in the world</li>
          </ul>
          
          <div className="security-note">
            <p>
              <strong>🔒 Security:</strong> Your wallet address is stored securely and encrypted. 
              We never have access to your private keys or funds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionOnboarding;

