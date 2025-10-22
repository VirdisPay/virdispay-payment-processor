/**
 * VirdisPay Payment Widget Library
 * Professional crypto payment integration for websites
 * Version: 1.0.0
 */

(function(window) {
  'use strict';

  // Configuration
  const CONFIG = {
    apiBaseUrl: 'https://api.virdispay.com',
    widgetVersion: '1.0.0',
    defaultTheme: 'green',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedTokens: ['USDC', 'USDT', 'DAI'],
    defaultNetworks: ['polygon', 'ethereum', 'bsc']
  };

  // Theme configurations
  const THEMES = {
    green: {
      primary: '#28a745',
      secondary: '#20c997',
      background: '#ffffff',
      text: '#333333',
      border: '#e9ecef'
    },
    purple: {
      primary: '#667eea',
      secondary: '#764ba2',
      background: '#ffffff',
      text: '#333333',
      border: '#e9ecef'
    },
    dark: {
      primary: '#28a745',
      secondary: '#20c997',
      background: '#1a1a1a',
      text: '#ffffff',
      border: '#333333'
    },
    minimal: {
      primary: '#000000',
      secondary: '#666666',
      background: '#ffffff',
      text: '#333333',
      border: '#cccccc'
    }
  };

  // Widget types
  const WIDGET_TYPES = {
    BUTTON: 'button',
    EMBEDDED: 'embedded',
    MODAL: 'modal',
    HOSTED: 'hosted'
  };

  /**
   * VirdisPay Widget Class
   */
  class VirdisPayWidget {
    constructor(options = {}) {
      this.options = this.mergeOptions(options);
      this.paymentData = null;
      this.isLoading = false;
      this.element = null;
      this.modal = null;
      
      this.init();
    }

    /**
     * Merge default options with user options
     */
    mergeOptions(options) {
      const defaults = {
        type: WIDGET_TYPES.BUTTON,
        theme: CONFIG.defaultTheme,
        merchantId: null,
        amount: null,
        currency: 'USD',
        description: '',
        customerEmail: '',
        successUrl: null,
        cancelUrl: null,
        onSuccess: null,
        onError: null,
        onCancel: null,
        showAmount: true,
        showDescription: true,
        showNetworkInfo: true,
        showSavings: true,
        customCSS: null,
        buttonText: 'Pay with Crypto',
        buttonSize: 'medium',
        borderRadius: '8px',
        apiKey: null
      };

      return { ...defaults, ...options };
    }

    /**
     * Initialize the widget
     */
    init() {
      this.validateOptions();
      this.createElement();
      this.bindEvents();
      this.applyTheme();
      
      // Dispatch ready event
      this.dispatchEvent('virdispay:ready', {
        widget: this,
        type: this.options.type
      });
    }

    /**
     * Validate widget options
     */
    validateOptions() {
      if (!this.options.apiKey) {
        throw new Error('VirdisPay: apiKey is required. Get your API key from the merchant dashboard.');
      }

      if (!this.options.apiKey.startsWith('pk_')) {
        throw new Error('VirdisPay: invalid API key format. Use your public key (starts with pk_)');
      }
      
      if (!this.options.amount || this.options.amount <= 0) {
        throw new Error('VirdisPay: valid amount is required');
      }

      if (!CONFIG.supportedCurrencies.includes(this.options.currency)) {
        throw new Error(`VirdisPay: unsupported currency ${this.options.currency}`);
      }
    }

    /**
     * Create widget element
     */
    createElement() {
      const container = document.createElement('div');
      container.className = 'virdispay-widget';
      container.setAttribute('data-virdispay-widget', this.options.type);
      
      switch (this.options.type) {
        case WIDGET_TYPES.BUTTON:
          this.createButtonWidget(container);
          break;
        case WIDGET_TYPES.EMBEDDED:
          this.createEmbeddedWidget(container);
          break;
        case WIDGET_TYPES.MODAL:
          this.createModalWidget(container);
          break;
        case WIDGET_TYPES.HOSTED:
          this.createHostedWidget(container);
          break;
      }

      this.element = container;
    }

    /**
     * Create button widget
     */
    createButtonWidget(container) {
      const button = document.createElement('button');
      button.className = 'virdispay-button';
      button.innerHTML = this.getButtonHTML();
      
      container.appendChild(button);
    }

    /**
     * Create embedded widget
     */
    createEmbeddedWidget(container) {
      const widget = document.createElement('div');
      widget.className = 'virdispay-embedded';
      widget.innerHTML = this.getEmbeddedHTML();
      
      container.appendChild(widget);
    }

    /**
     * Create modal widget
     */
    createModalWidget(container) {
      const button = document.createElement('button');
      button.className = 'virdispay-modal-trigger';
      button.innerHTML = this.getButtonHTML();
      
      container.appendChild(button);
    }

    /**
     * Create hosted widget
     */
    createHostedWidget(container) {
      const link = document.createElement('a');
      link.className = 'virdispay-hosted-link';
      link.href = '#';
      link.innerHTML = this.getButtonHTML();
      
      container.appendChild(link);
    }

    /**
     * Get button HTML
     */
    getButtonHTML() {
      const sizeClass = `virdispay-button-${this.options.buttonSize}`;
      
      return `
        <span class="virdispay-button-content">
          <span class="virdispay-button-icon">🌿</span>
          <span class="virdispay-button-text">${this.options.buttonText}</span>
          ${this.options.showAmount ? `<span class="virdispay-button-amount">$${this.options.amount}</span>` : ''}
        </span>
        <span class="virdispay-button-loading" style="display: none;">
          <span class="virdispay-spinner"></span>
          Processing...
        </span>
      `;
    }

    /**
     * Get embedded widget HTML
     */
    getEmbeddedHTML() {
      return `
        <div class="virdispay-embedded-header">
          <div class="virdispay-logo">🌿 VirdisPay</div>
          <div class="virdispay-subtitle">Professional Crypto Payments</div>
        </div>
        
        <div class="virdispay-embedded-content">
          ${this.options.showDescription ? `<div class="virdispay-description">${this.options.description}</div>` : ''}
          
          <div class="virdispay-amount-section">
            <div class="virdispay-amount">$${this.options.amount} ${this.options.currency}</div>
            ${this.options.showSavings ? '<div class="virdispay-savings">💡 Ultra-low fees: ~$0.01</div>' : ''}
          </div>
          
          ${this.options.showNetworkInfo ? `
            <div class="virdispay-networks">
              <div class="virdispay-network-item">
                <span class="virdispay-network-icon">⚡</span>
                <span class="virdispay-network-name">Polygon</span>
                <span class="virdispay-network-fee">~$0.01</span>
              </div>
            </div>
          ` : ''}
          
          <div class="virdispay-payment-section">
            <button class="virdispay-pay-button">
              <span class="virdispay-button-icon">🌿</span>
              Pay with Crypto
            </button>
          </div>
        </div>
        
        <div class="virdispay-embedded-footer">
          <div class="virdispay-security">
            <span class="virdispay-security-icon">🔒</span>
            <span class="virdispay-security-text">Secure • Non-custodial • Cannabis-friendly</span>
          </div>
        </div>
      `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
      if (this.options.type === WIDGET_TYPES.MODAL) {
        this.bindModalEvents();
      } else {
        this.bindPaymentEvents();
      }
    }

    /**
     * Bind payment events
     */
    bindPaymentEvents() {
      const button = this.element.querySelector('.virdispay-button, .virdispay-pay-button, .virdispay-hosted-link');
      
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.initiatePayment();
        });
      }
    }

    /**
     * Bind modal events
     */
    bindModalEvents() {
      const trigger = this.element.querySelector('.virdispay-modal-trigger');
      
      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal();
        });
      }
    }

    /**
     * Apply theme styling
     */
    applyTheme() {
      const theme = THEMES[this.options.theme];
      if (!theme) return;

      const style = document.createElement('style');
      style.textContent = this.generateCSS(theme);
      
      // Remove existing theme styles
      const existingStyle = document.querySelector('style[data-virdispay-theme]');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      style.setAttribute('data-virdispay-theme', this.options.theme);
      document.head.appendChild(style);
    }

    /**
     * Generate CSS for theme
     */
    generateCSS(theme) {
      return `
        .virdispay-widget * {
          box-sizing: border-box;
        }
        
        .virdispay-button {
          background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: ${this.options.borderRadius};
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          min-width: 200px;
          justify-content: center;
        }
        
        .virdispay-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .virdispay-button:active {
          transform: translateY(0);
        }
        
        .virdispay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .virdispay-button-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .virdispay-button-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .virdispay-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: virdispay-spin 1s linear infinite;
        }
        
        @keyframes virdispay-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .virdispay-embedded {
          background: ${theme.background};
          border: 1px solid ${theme.border};
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          margin: 0 auto;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .virdispay-embedded-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .virdispay-logo {
          font-size: 24px;
          font-weight: 700;
          color: ${theme.primary};
          margin-bottom: 4px;
        }
        
        .virdispay-subtitle {
          color: ${theme.text};
          opacity: 0.7;
          font-size: 14px;
        }
        
        .virdispay-amount-section {
          text-align: center;
          margin: 20px 0;
        }
        
        .virdispay-amount {
          font-size: 32px;
          font-weight: 700;
          color: ${theme.primary};
          margin-bottom: 8px;
        }
        
        .virdispay-savings {
          color: ${theme.text};
          opacity: 0.7;
          font-size: 14px;
        }
        
        .virdispay-networks {
          margin: 20px 0;
        }
        
        .virdispay-network-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: ${theme.background};
          border: 1px solid ${theme.border};
          border-radius: 8px;
          margin-bottom: 8px;
        }
        
        .virdispay-network-icon {
          font-size: 20px;
        }
        
        .virdispay-network-name {
          flex: 1;
          font-weight: 600;
          color: ${theme.text};
        }
        
        .virdispay-network-fee {
          color: ${theme.text};
          opacity: 0.7;
          font-size: 14px;
        }
        
        .virdispay-payment-section {
          text-align: center;
          margin: 24px 0;
        }
        
        .virdispay-pay-button {
          background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 200px;
          justify-content: center;
        }
        
        .virdispay-pay-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .virdispay-embedded-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid ${theme.border};
        }
        
        .virdispay-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: ${theme.text};
          opacity: 0.7;
          font-size: 12px;
        }
        
        .virdispay-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        
        .virdispay-modal.active {
          opacity: 1;
          visibility: visible;
        }
        
        .virdispay-modal-content {
          background: ${theme.background};
          border-radius: 12px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          transform: scale(0.9);
          transition: transform 0.3s ease;
        }
        
        .virdispay-modal.active .virdispay-modal-content {
          transform: scale(1);
        }
        
        .virdispay-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: ${theme.text};
          opacity: 0.7;
        }
        
        .virdispay-modal-close:hover {
          opacity: 1;
        }
      `;
    }

    /**
     * Initiate payment process
     */
    async initiatePayment() {
      if (this.isLoading) return;
      
      this.setLoading(true);
      
      try {
        // Create payment request
        const paymentData = await this.createPaymentRequest();
        
        if (this.options.type === WIDGET_TYPES.HOSTED) {
          this.redirectToHostedCheckout(paymentData);
        } else if (this.options.type === WIDGET_TYPES.MODAL) {
          this.openModal(paymentData);
        } else {
          this.openPaymentModal(paymentData);
        }
        
      } catch (error) {
        this.handleError(error);
      } finally {
        this.setLoading(false);
      }
    }

    /**
     * Create payment request
     */
    async createPaymentRequest() {
      const requestData = {
        amount: this.options.amount,
        currency: this.options.currency,
        description: this.options.description,
        customerEmail: this.options.customerEmail,
        successUrl: this.options.successUrl,
        cancelUrl: this.options.cancelUrl,
        apiKey: this.options.apiKey
      };

      const response = await fetch(`${CONFIG.apiBaseUrl}/api/payments/widget/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.options.apiKey
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Payment request failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.paymentData = data.paymentRequest;
      
      return data.paymentRequest;
    }

    /**
     * Open payment modal
     */
    openPaymentModal(paymentData) {
      const modal = document.createElement('div');
      modal.className = 'virdispay-modal';
      modal.innerHTML = this.getPaymentModalHTML(paymentData);
      
      document.body.appendChild(modal);
      this.modal = modal;
      
      // Show modal
      setTimeout(() => modal.classList.add('active'), 10);
      
      // Bind modal events
      this.bindModalEvents();
    }

    /**
     * Get payment modal HTML
     */
    getPaymentModalHTML(paymentData) {
      return `
        <div class="virdispay-modal-content">
          <button class="virdispay-modal-close">&times;</button>
          
          <div class="virdispay-modal-header">
            <h2>Complete Payment</h2>
            <p>Pay with cryptocurrency securely</p>
          </div>
          
          <div class="virdispay-modal-body">
            <div class="virdispay-payment-summary">
              <div class="virdispay-payment-item">
                <span>Amount:</span>
                <span>$${paymentData.amount} ${paymentData.currency}</span>
              </div>
              <div class="virdispay-payment-item">
                <span>Description:</span>
                <span>${paymentData.description || 'Payment'}</span>
              </div>
              <div class="virdispay-payment-item">
                <span>Network:</span>
                <span>Polygon (Recommended)</span>
              </div>
              <div class="virdispay-payment-item">
                <span>Gas Fee:</span>
                <span>~$0.01</span>
              </div>
            </div>
            
            <div class="virdispay-wallet-section">
              <h3>Connect Wallet</h3>
              <button class="virdispay-wallet-button" id="virdispay-connect-metamask">
                <span class="virdispay-wallet-icon">🦊</span>
                Connect MetaMask
              </button>
            </div>
          </div>
          
          <div class="virdispay-modal-footer">
            <div class="virdispay-security-info">
              <span class="virdispay-security-icon">🔒</span>
              <span>Secure • Non-custodial • Cannabis-friendly</span>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Redirect to hosted checkout
     */
    redirectToHostedCheckout(paymentData) {
      const checkoutUrl = `${CONFIG.apiBaseUrl}/checkout/${paymentData.transactionId}`;
      window.open(checkoutUrl, '_blank');
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
      this.isLoading = loading;
      
      const button = this.element.querySelector('.virdispay-button, .virdispay-pay-button');
      if (button) {
        const content = button.querySelector('.virdispay-button-content');
        const loadingEl = button.querySelector('.virdispay-button-loading');
        
        if (loading) {
          content.style.display = 'none';
          loadingEl.style.display = 'flex';
          button.disabled = true;
        } else {
          content.style.display = 'flex';
          loadingEl.style.display = 'none';
          button.disabled = false;
        }
      }
    }

    /**
     * Handle errors
     */
    handleError(error) {
      console.error('VirdisPay Error:', error);
      
      if (this.options.onError) {
        this.options.onError(error);
      }
      
      this.dispatchEvent('virdispay:error', {
        error: error.message,
        widget: this
      });
    }

    /**
     * Dispatch custom events
     */
    dispatchEvent(eventName, detail) {
      const event = new CustomEvent(eventName, {
        detail: detail
      });
      window.dispatchEvent(event);
    }

    /**
     * Destroy widget
     */
    destroy() {
      if (this.modal) {
        this.modal.remove();
        this.modal = null;
      }
      
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
      
      // Remove theme styles
      const themeStyle = document.querySelector('style[data-virdispay-theme]');
      if (themeStyle) {
        themeStyle.remove();
      }
    }
  }

  /**
   * Auto-initialize widgets on page load
   */
  function autoInitialize() {
    const widgets = document.querySelectorAll('[data-virdispay-widget]');
    
    widgets.forEach(element => {
      const options = {
        type: element.dataset.virdispayWidget,
        merchantId: element.dataset.merchantId,
        amount: parseFloat(element.dataset.amount),
        currency: element.dataset.currency || 'USD',
        description: element.dataset.description || '',
        theme: element.dataset.theme || 'green',
        buttonText: element.dataset.buttonText || 'Pay with Crypto',
        buttonSize: element.dataset.buttonSize || 'medium'
      };
      
      new VirdisPayWidget(options);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
  } else {
    autoInitialize();
  }

  // Expose VirdisPay to global scope
  window.VirdisPay = {
    Widget: VirdisPayWidget,
    init: function(options) {
      return new VirdisPayWidget(options);
    },
    version: CONFIG.widgetVersion,
    config: CONFIG
  };

})(window);

