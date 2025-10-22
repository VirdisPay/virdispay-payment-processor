import React, { useState, useEffect } from 'react';
import CryptoCheckoutWidget from './CryptoCheckoutWidget';
import './WidgetPage.css';

const WidgetPage: React.FC = () => {
  const [config, setConfig] = useState({
    amount: 0,
    currency: 'USDC',
    orderId: '',
    customerEmail: '',
    merchantId: '',
    apiKey: ''
  });

  useEffect(() => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    
    setConfig({
      amount: parseFloat(urlParams.get('amount') || '0'),
      currency: urlParams.get('currency') || 'USDC',
      orderId: urlParams.get('orderId') || '',
      customerEmail: urlParams.get('customerEmail') || '',
      merchantId: urlParams.get('merchantId') || '',
      apiKey: urlParams.get('apiKey') || ''
    });

    // Send ready message to parent window
    window.parent.postMessage({ type: 'widget_ready' }, '*');
  }, []);

  const handlePaymentComplete = (paymentId: string) => {
    // Notify parent window
    window.parent.postMessage({
      type: 'payment_complete',
      paymentId: paymentId
    }, '*');
  };

  const handlePaymentError = (error: string) => {
    // Notify parent window
    window.parent.postMessage({
      type: 'payment_error',
      error: error
    }, '*');
  };

  if (!config.merchantId || !config.apiKey) {
    return (
      <div className="widget-page">
        <div className="widget-error">
          <h3>❌ Configuration Error</h3>
          <p>Missing required parameters: merchantId, apiKey</p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-page">
      <CryptoCheckoutWidget
        amount={config.amount}
        currency={config.currency}
        orderId={config.orderId}
        customerEmail={config.customerEmail}
        merchantId={config.merchantId}
        apiKey={config.apiKey}
        onPaymentComplete={handlePaymentComplete}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
};

export default WidgetPage;

