import React, { useState } from 'react';
import SubscriptionSelection from './SubscriptionSelection';
import WalletConnectionOnboarding from './WalletConnectionOnboarding';
import './OnboardingFlow.css';

interface User {
  id: string;
  email: string;
  businessName: string;
  businessType?: string;
  isVerified: boolean;
  kycStatus: string;
  role: string;
  walletAddress?: string;
  subscriptionTier?: string;
  walletMethod?: string;
  hasCompletedOnboarding?: boolean;
}

interface OnboardingFlowProps {
  user: User;
  onComplete: (userData: any) => void;
  onSkip: () => void;
}

type OnboardingStep = 'subscription' | 'wallet' | 'complete';

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ 
  user, 
  onComplete, 
  onSkip 
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('subscription');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletMethod, setWalletMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubscriptionSelect = (tier: string) => {
    setSelectedTier(tier);
    setCurrentStep('wallet');
  };

  const handleSubscriptionSkip = () => {
    setSelectedTier('free');
    setCurrentStep('wallet');
  };

  const handleWalletConnected = (address: string, method: string) => {
    setWalletAddress(address);
    setWalletMethod(method);
    setCurrentStep('complete');
  };

  const handleWalletSkip = () => {
    setCurrentStep('complete');
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Update user profile with selected tier and wallet
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '';
      
      const updateData: any = {
        subscriptionTier: selectedTier || 'free'
      };
      
      if (walletAddress) {
        updateData.walletAddress = walletAddress;
        updateData.walletMethod = walletMethod;
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onComplete(updatedUser.user || updatedUser);
      } else {
        console.error('Failed to update profile:', response.status, response.statusText);
        // Still complete onboarding even if profile update fails
        onComplete({
          ...user,
          subscriptionTier: selectedTier || 'free',
          walletAddress: walletAddress || user.walletAddress,
          walletMethod: walletMethod || user.walletMethod,
          hasCompletedOnboarding: true
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // Still complete onboarding even if profile update fails
      onComplete({
        ...user,
        subscriptionTier: selectedTier || 'free',
        walletAddress: walletAddress || user.walletAddress,
        walletMethod: walletMethod || user.walletMethod,
        hasCompletedOnboarding: true
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'subscription':
        return 'Choose Your Plan';
      case 'wallet':
        return 'Connect Your Wallet';
      case 'complete':
        return 'Setup Complete!';
      default:
        return 'Welcome to VirdisPay';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'subscription':
        return 'Select a subscription tier to get started with VirdisPay';
      case 'wallet':
        return 'Connect your crypto wallet to start accepting payments';
      case 'complete':
        return 'You\'re all set! Start accepting crypto payments today';
      default:
        return '';
    }
  };

  const getProgressPercentage = () => {
    switch (currentStep) {
      case 'subscription':
        return 33;
      case 'wallet':
        return 66;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="onboarding-flow">
      <div className="onboarding-container">
        {/* Progress Header */}
        <div className="onboarding-header">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <div className="step-indicator">
            <div className={`step ${currentStep === 'subscription' ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Plan</span>
            </div>
            <div className={`step ${currentStep === 'wallet' ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Wallet</span>
            </div>
            <div className={`step ${currentStep === 'complete' ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Complete</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="onboarding-content">
          {currentStep === 'subscription' && (
            <SubscriptionSelection
              onSelectTier={handleSubscriptionSelect}
              onSkip={handleSubscriptionSkip}
              businessName={user.businessName}
            />
          )}

          {currentStep === 'wallet' && (
            <WalletConnectionOnboarding
              onWalletConnected={handleWalletConnected}
              onSkip={handleWalletSkip}
              businessName={user.businessName}
            />
          )}

          {currentStep === 'complete' && (
            <div className="completion-step">
              <div className="completion-header">
                <div className="success-icon">🎉</div>
                <h2>Welcome to VirdisPay!</h2>
                <p>Your account is ready to start accepting crypto payments</p>
              </div>

              <div className="completion-summary">
                <h3>Setup Summary</h3>
                <div className="summary-item">
                  <span className="summary-label">Subscription Plan:</span>
                  <span className="summary-value">
                    {selectedTier === 'free' ? 'Free' : 
                     selectedTier === 'starter' ? 'Starter ($29/month)' :
                     selectedTier === 'professional' ? 'Professional ($99/month)' :
                     selectedTier === 'enterprise' ? 'Enterprise ($299/month)' : 'Free'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Transaction Fee:</span>
                  <span className="summary-value">
                    {selectedTier === 'free' ? '2.5%' : 
                     selectedTier === 'starter' ? '1.5%' :
                     selectedTier === 'professional' ? '1.0%' :
                     selectedTier === 'enterprise' ? '0.5%' : '2.5%'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Wallet Address:</span>
                  <span className="summary-value">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                  </span>
                </div>
              </div>

              <div className="completion-actions">
                <button 
                  className="complete-button"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Go to Dashboard'}
                </button>
                
                <button 
                  className="skip-button"
                  onClick={onSkip}
                >
                  Skip for now
                </button>
              </div>

              <div className="completion-footer">
                <h4>What's Next?</h4>
                <ul className="next-steps">
                  <li>📋 Complete KYC verification for full access</li>
                  <li>💳 Start creating payment requests</li>
                  <li>📊 Monitor your transactions in the dashboard</li>
                  <li>🔧 Customize your payment settings</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
