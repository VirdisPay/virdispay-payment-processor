/**
 * VirDisPay Payment Widget
 * Easy integration for merchant websites
 * 
 * Usage:
 * <script src="https://pay.virdispay.com/js/virdispay-widget.js"></script>
 * <button class="virdis-pay-button" 
 *         data-merchant-id="your_merchant_id"
 *         data-amount="99.99"
 *         data-currency="USD"
 *         data-description="Premium CBD Oil">
 *   Pay with VirDisPay
 * </button>
 */

(function() {
  'use strict';

  // Configuration
  const VIRDIS_API = 'https://api.virdispay.com'; // Update with your production URL
  const VIRDIS_CHECKOUT = 'https://pay.virdispay.com'; // Update with your production URL

  // Widget Class
  class VirDisWidget {
    constructor() {
      this.initialized = false;
      this.init();
    }

    init() {
      if (this.initialized) return;
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupButtons());
      } else {
        this.setupButtons();
      }

      this.initialized = true;
    }

    setupButtons() {
      // Find all payment buttons
      const buttons = document.querySelectorAll('.virdis-pay-button, [data-virdis-pay]');
      
      buttons.forEach(button => {
        // Avoid duplicate listeners
        if (button.dataset.virdisInitialized) return;
        button.dataset.virdisInitialized = 'true';

        // Add click handler
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.handlePayment(button);
        });

        // Style the button
        this.styleButton(button);
      });
    }

    styleButton(button) {
      // Only apply default styles if not already styled
      if (!button.style.cssText && !button.className.includes('custom-style')) {
        button.style.cssText = `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        // Hover effect
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'translateY(-2px)';
          button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
        });

        button.addEventListener('mouseleave', () => {
          button.style.transform = 'translateY(0)';
          button.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        });
      }

      // Add icon if not present
      if (!button.innerHTML.includes('🌿') && !button.dataset.noIcon) {
        button.innerHTML = `🌿 ${button.innerHTML}`;
      }
    }

    async handlePayment(button) {
      try {
        // Get payment data from button attributes
        const paymentData = {
          merchantId: button.dataset.merchantId || button.dataset.virdisMerchantId,
          amount: parseFloat(button.dataset.amount || button.dataset.virdisAmount),
          currency: button.dataset.currency || button.dataset.virdisCurrency || 'USD',
          description: button.dataset.description || button.dataset.virdisDescription || 'Payment',
          customerEmail: button.dataset.customerEmail || '',
          orderId: button.dataset.orderId || '',
          metadata: this.getMetadata(button)
        };

        // Validate required fields
        if (!paymentData.merchantId) {
          throw new Error('Missing merchant ID. Please add data-merchant-id to the button.');
        }

        if (!paymentData.amount || paymentData.amount <= 0) {
          throw new Error('Invalid amount. Please add data-amount to the button.');
        }

        // Show loading state
        this.setButtonLoading(button, true);

        // Get checkout method
        const method = button.dataset.checkoutMethod || button.dataset.virdisMethod || 'modal';

        if (method === 'redirect') {
          // Redirect to hosted checkout page
          this.redirectToCheckout(paymentData);
        } else {
          // Open modal checkout
          await this.openModal(paymentData);
        }

      } catch (error) {
        console.error('VirDisPay Payment Error:', error);
        alert(`Payment Error: ${error.message}`);
        this.setButtonLoading(button, false);
      }
    }

    getMetadata(button) {
      const metadata = {};
      
      // Collect all data-meta-* attributes
      Array.from(button.attributes).forEach(attr => {
        if (attr.name.startsWith('data-meta-')) {
          const key = attr.name.replace('data-meta-', '');
          metadata[key] = attr.value;
        }
      });

      return metadata;
    }

    setButtonLoading(button, loading) {
      if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> Processing...`;
      } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
      }
    }

    redirectToCheckout(paymentData) {
      // Build checkout URL with parameters
      const params = new URLSearchParams({
        merchant: paymentData.merchantId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        description: paymentData.description,
        email: paymentData.customerEmail,
        orderId: paymentData.orderId,
        metadata: JSON.stringify(paymentData.metadata)
      });

      window.location.href = `${VIRDIS_CHECKOUT}/checkout?${params.toString()}`;
    }

    async openModal(paymentData) {
      // Create modal overlay
      const modal = this.createModal(paymentData);
      document.body.appendChild(modal);

      // Create payment iframe
      const iframe = await this.createPaymentIframe(paymentData);
      modal.querySelector('.virdis-modal-content').appendChild(iframe);

      // Show modal
      setTimeout(() => modal.classList.add('virdis-modal-show'), 10);

      // Listen for payment completion
      this.listenForPaymentCompletion(iframe, modal, paymentData);
    }

    createModal(paymentData) {
      const modal = document.createElement('div');
      modal.className = 'virdis-modal';
      modal.innerHTML = `
        <div class="virdis-modal-overlay"></div>
        <div class="virdis-modal-content">
          <div class="virdis-modal-header">
            <h3>🌿 VirDisPay Payment</h3>
            <button class="virdis-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="virdis-modal-body">
            <div class="virdis-modal-loading">
              <div class="virdis-spinner"></div>
              <p>Loading secure payment...</p>
            </div>
          </div>
        </div>
      `;

      // Add styles
      this.injectModalStyles();

      // Close button handler
      modal.querySelector('.virdis-modal-close').addEventListener('click', () => {
        this.closeModal(modal);
      });

      // Click outside to close
      modal.querySelector('.virdis-modal-overlay').addEventListener('click', () => {
        this.closeModal(modal);
      });

      return modal;
    }

    async createPaymentIframe(paymentData) {
      // Create payment session
      const sessionId = await this.createPaymentSession(paymentData);

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.className = 'virdis-payment-iframe';
      iframe.src = `${VIRDIS_CHECKOUT}/payment/${sessionId}`;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowtransparency', 'true');

      return iframe;
    }

    async createPaymentSession(paymentData) {
      try {
        const response = await fetch(`${VIRDIS_API}/api/payments/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
          throw new Error('Failed to create payment session');
        }

        const data = await response.json();
        return data.sessionId;
      } catch (error) {
        console.error('Session creation error:', error);
        throw new Error('Unable to start payment. Please try again.');
      }
    }

    listenForPaymentCompletion(iframe, modal, paymentData) {
      window.addEventListener('message', (event) => {
        // Verify origin
        if (!event.origin.includes('virdispay.com')) return;

        if (event.data.type === 'VIRDIS_PAYMENT_SUCCESS') {
          this.handlePaymentSuccess(event.data, modal, paymentData);
        } else if (event.data.type === 'VIRDIS_PAYMENT_CANCELLED') {
          this.closeModal(modal);
        } else if (event.data.type === 'VIRDIS_PAYMENT_ERROR') {
          this.handlePaymentError(event.data, modal);
        }
      });
    }

    handlePaymentSuccess(data, modal, paymentData) {
      // Show success message
      const modalBody = modal.querySelector('.virdis-modal-body');
      modalBody.innerHTML = `
        <div class="virdis-success">
          <div class="virdis-success-icon">✅</div>
          <h3>Payment Successful!</h3>
          <p>Transaction ID: ${data.transactionId}</p>
          <p class="virdis-gas-savings">Gas Fee: ~$0.01 (Saved $49.99!)</p>
          <button class="virdis-success-button" onclick="this.closest('.virdis-modal').remove()">
            Close
          </button>
        </div>
      `;

      // Trigger custom event
      const event = new CustomEvent('virdisPaymentSuccess', {
        detail: {
          transactionId: data.transactionId,
          amount: paymentData.amount,
          currency: paymentData.currency
        }
      });
      window.dispatchEvent(event);

      // Callback if provided
      if (window.virdisPaymentCallback) {
        window.virdisPaymentCallback('success', data);
      }
    }

    handlePaymentError(data, modal) {
      const modalBody = modal.querySelector('.virdis-modal-body');
      modalBody.innerHTML = `
        <div class="virdis-error">
          <div class="virdis-error-icon">❌</div>
          <h3>Payment Failed</h3>
          <p>${data.error || 'An error occurred. Please try again.'}</p>
          <button class="virdis-error-button" onclick="this.closest('.virdis-modal').remove()">
            Close
          </button>
        </div>
      `;

      // Trigger custom event
      const event = new CustomEvent('virdisPaymentError', {
        detail: { error: data.error }
      });
      window.dispatchEvent(event);
    }

    closeModal(modal) {
      modal.classList.remove('virdis-modal-show');
      setTimeout(() => modal.remove(), 300);
    }

    injectModalStyles() {
      // Check if styles already injected
      if (document.getElementById('virdis-modal-styles')) return;

      const styles = document.createElement('style');
      styles.id = 'virdis-modal-styles';
      styles.textContent = `
        .virdis-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999999;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .virdis-modal-show {
          opacity: 1;
          visibility: visible;
        }

        .virdis-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }

        .virdis-modal-content {
          position: relative;
          max-width: 500px;
          margin: 50px auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          animation: virdis-slide-up 0.3s ease;
        }

        @keyframes virdis-slide-up {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .virdis-modal-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .virdis-modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .virdis-modal-close {
          background: transparent;
          border: none;
          color: white;
          font-size: 32px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .virdis-modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .virdis-modal-body {
          padding: 30px;
          min-height: 400px;
        }

        .virdis-modal-loading {
          text-align: center;
          padding: 60px 20px;
        }

        .virdis-spinner {
          width: 50px;
          height: 50px;
          margin: 0 auto 20px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: virdis-spin 1s linear infinite;
        }

        @keyframes virdis-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .virdis-payment-iframe {
          width: 100%;
          height: 500px;
          border: none;
        }

        .virdis-success,
        .virdis-error {
          text-align: center;
          padding: 40px 20px;
        }

        .virdis-success-icon,
        .virdis-error-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .virdis-success h3,
        .virdis-error h3 {
          margin: 0 0 10px 0;
          font-size: 24px;
        }

        .virdis-gas-savings {
          color: #10b981;
          font-weight: 600;
          margin-top: 10px;
        }

        .virdis-success-button,
        .virdis-error-button {
          margin-top: 30px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .virdis-success-button:hover,
        .virdis-error-button:hover {
          transform: translateY(-2px);
        }

        @media (max-width: 600px) {
          .virdis-modal-content {
            margin: 20px;
            max-width: calc(100% - 40px);
          }
        }
      `;

      document.head.appendChild(styles);
    }
  }

  // Initialize widget
  window.VirDisPay = new VirDisWidget();

  // Public API
  window.VirDisPay.openPayment = function(paymentData) {
    const button = document.createElement('button');
    button.dataset.merchantId = paymentData.merchantId;
    button.dataset.amount = paymentData.amount;
    button.dataset.currency = paymentData.currency || 'USD';
    button.dataset.description = paymentData.description || 'Payment';
    button.dataset.customerEmail = paymentData.customerEmail || '';
    
    window.VirDisPay.handlePayment(button);
  };

})();
