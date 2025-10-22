/**
 * VirdisPay E-commerce Integration SDK
 * Easy integration for any website or e-commerce platform
 */

class VirdisPaySDK {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.merchantId = config.merchantId;
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.widgetUrl = config.widgetUrl || 'http://localhost:3000';
  }

  /**
   * Initialize the VirdisPay widget on a page
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {number} options.amount - Payment amount
   * @param {string} options.currency - Currency (USDC, USDT, ETH, MATIC)
   * @param {string} options.orderId - Unique order identifier
   * @param {string} options.customerEmail - Customer email (optional)
   * @param {Function} options.onPaymentComplete - Callback for successful payment
   * @param {Function} options.onPaymentError - Callback for payment errors
   */
  init(options) {
    const {
      containerId,
      amount,
      currency,
      orderId,
      customerEmail,
      onPaymentComplete,
      onPaymentError
    } = options;

    // Validate required parameters
    if (!containerId || !amount || !currency || !orderId) {
      throw new Error('Missing required parameters: containerId, amount, currency, orderId');
    }

    // Find the container element
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with ID '${containerId}' not found`);
    }

    // Create the widget iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${this.widgetUrl}/widget?` + new URLSearchParams({
      amount: amount,
      currency: currency,
      orderId: orderId,
      customerEmail: customerEmail || '',
      merchantId: this.merchantId,
      apiKey: this.apiKey
    });
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    iframe.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';

    // Listen for messages from the widget
    window.addEventListener('message', (event) => {
      if (event.origin !== this.widgetUrl) return;

      switch (event.data.type) {
        case 'payment_complete':
          if (onPaymentComplete) {
            onPaymentComplete(event.data.paymentId);
          }
          break;
        case 'payment_error':
          if (onPaymentError) {
            onPaymentError(event.data.error);
          }
          break;
      }
    });

    // Clear container and add iframe
    container.innerHTML = '';
    container.appendChild(iframe);

    return iframe;
  }

  /**
   * Create a payment programmatically
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment response
   */
  async createPayment(paymentData) {
    const response = await fetch(`${this.baseUrl}/api/payments/create-ecommerce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        ...paymentData,
        merchantId: this.merchantId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create payment');
    }

    return data;
  }

  /**
   * Get payment status
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(paymentId) {
    const response = await fetch(`${this.baseUrl}/api/payments/status/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get payment status');
    }

    return data;
  }

  /**
   * Get supported currencies
   * @returns {Promise<Array>} List of supported currencies
   */
  async getCurrencies() {
    const response = await fetch(`${this.baseUrl}/api/payments/currencies`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get currencies');
    }

    return data.currencies;
  }

  /**
   * Create a simple payment button
   * @param {Object} options - Button options
   * @returns {HTMLElement} Button element
   */
  createPaymentButton(options) {
    const {
      text = 'Pay with Crypto',
      amount,
      currency,
      orderId,
      customerEmail,
      onPaymentComplete,
      onPaymentError
    } = options;

    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'virdispay-button';
    button.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    });

    // Handle click
    button.addEventListener('click', async () => {
      try {
        button.disabled = true;
        button.textContent = 'Creating payment...';

        const payment = await this.createPayment({
          amount,
          currency,
          orderId,
          customerEmail
        });

        // Open payment in new window
        const paymentWindow = window.open(
          payment.payment.paymentUrl,
          'VirdisPay',
          'width=500,height=700,scrollbars=yes,resizable=yes'
        );

        // Poll for payment completion
        const pollInterval = setInterval(async () => {
          try {
            const status = await this.getPaymentStatus(payment.payment.id);
            
            if (status.payment.status === 'completed') {
              clearInterval(pollInterval);
              paymentWindow.close();
              
              if (onPaymentComplete) {
                onPaymentComplete(payment.payment.id);
              }
            } else if (status.payment.status === 'failed') {
              clearInterval(pollInterval);
              paymentWindow.close();
              
              if (onPaymentError) {
                onPaymentError('Payment failed');
              }
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 3000);

        // Clean up if window is closed manually
        const checkClosed = setInterval(() => {
          if (paymentWindow.closed) {
            clearInterval(pollInterval);
            clearInterval(checkClosed);
            button.disabled = false;
            button.textContent = text;
          }
        }, 1000);

      } catch (error) {
        button.disabled = false;
        button.textContent = text;
        
        if (onPaymentError) {
          onPaymentError(error.message);
        }
      }
    });

    return button;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VirdisPaySDK;
} else if (typeof window !== 'undefined') {
  window.VirdisPaySDK = VirdisPaySDK;
}

// Auto-initialize if data attributes are present
document.addEventListener('DOMContentLoaded', () => {
  const virdisElements = document.querySelectorAll('[data-virdispay]');
  
  virdisElements.forEach(element => {
    const config = {
      apiKey: element.dataset.apiKey,
      merchantId: element.dataset.merchantId,
      baseUrl: element.dataset.baseUrl || 'http://localhost:5000',
      widgetUrl: element.dataset.widgetUrl || 'http://localhost:3000'
    };

    const sdk = new VirdisPaySDK(config);
    
    const options = {
      containerId: element.id,
      amount: parseFloat(element.dataset.amount),
      currency: element.dataset.currency,
      orderId: element.dataset.orderId,
      customerEmail: element.dataset.customerEmail
    };

    try {
      sdk.init(options);
    } catch (error) {
      console.error('VirdisPay initialization failed:', error);
    }
  });
});

