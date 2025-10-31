import React, { useState } from 'react';
import './SubscriptionSelection.css';

interface SubscriptionSelectionProps {
  onSelectTier: (tier: string) => void;
  onSkip: () => void;
  businessName: string;
}

const SubscriptionSelection: React.FC<SubscriptionSelectionProps> = ({ 
  onSelectTier, 
  onSkip, 
  businessName 
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('');

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      fee: '2.5%',
      volume: 'Up to $10,000/month',
      features: [
        'Basic payment processing',
        'Standard support',
        'Basic analytics',
        'Email notifications'
      ],
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      fee: '1.5%',
      volume: 'Up to $100,000/month',
      features: [
        'Everything in Free',
        'Priority support',
        'Advanced analytics',
        'API access',
        'Custom branding'
      ],
      popular: true
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$99',
      fee: '1.0%',
      volume: 'Up to $500,000/month',
      features: [
        'Everything in Starter',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced reporting',
        'White-label options'
      ],
      popular: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      fee: '0.5%',
      volume: 'Unlimited',
      features: [
        'Everything in Professional',
        '24/7 phone support',
        'Custom development',
        'SLA guarantees',
        'On-premise deployment'
      ],
      popular: false
    }
  ];

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId);
  };

  const handleContinue = () => {
    if (selectedTier) {
      onSelectTier(selectedTier);
    }
  };

  return (
    <div className="subscription-selection">
      <div className="subscription-container">
        <div className="subscription-header">
          <h2>Choose Your Plan</h2>
          <p>Welcome to VirdisPay, <strong>{businessName}</strong>! Select a subscription tier to get started.</p>
          <p className="subscription-subtitle">
            💡 <strong>Save 75% vs traditional high-risk processors</strong> - No hidden fees, no setup costs
          </p>
        </div>

        <div className="tiers-grid">
          {tiers.map((tier) => (
            <div 
              key={tier.id}
              className={`tier-card ${selectedTier === tier.id ? 'selected' : ''} ${tier.popular ? 'popular' : ''}`}
              onClick={() => handleSelectTier(tier.id)}
            >
              {tier.popular && <div className="popular-badge">Most Popular</div>}
              
              <div className="tier-header">
                <h3>{tier.name}</h3>
                <div className="tier-pricing">
                  <span className="price">{tier.price}</span>
                  <span className="period">/month</span>
                </div>
                <div className="tier-fee">
                  <span className="fee-rate">{tier.fee}</span>
                  <span className="fee-label">transaction fee</span>
                </div>
              </div>

              <div className="tier-volume">
                <span className="volume-text">{tier.volume}</span>
              </div>

              <ul className="tier-features">
                {tier.features.map((feature, index) => (
                  <li key={index}>
                    <span className="feature-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="tier-savings">
                <span className="savings-text">
                  Save ${tier.id === 'free' ? '7,500' : tier.id === 'starter' ? '8,500' : tier.id === 'professional' ? '9,000' : '9,500'} 
                  vs traditional processors
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="subscription-actions">
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!selectedTier}
          >
            Continue with {selectedTier ? tiers.find(t => t.id === selectedTier)?.name : 'Plan'}
          </button>
          
          <button 
            className="skip-button"
            onClick={onSkip}
          >
            Skip for now (Free tier)
          </button>
        </div>

        <div className="subscription-footer">
          <p>
            <strong>No commitment:</strong> You can upgrade or downgrade at any time. 
            All plans include the same core features with different fee rates and support levels.
          </p>
          <p>
            <strong>Questions?</strong> Contact us at <a href="mailto:hello@virdispay.com">hello@virdispay.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSelection;

