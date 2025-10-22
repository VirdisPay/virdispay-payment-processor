# 🛒 VirdisPay E-commerce Integration

Complete crypto payment integration for any e-commerce platform. Add "Pay with Crypto" buttons to your checkout in minutes!

## 🚀 Quick Start

### 1. Include the SDK

```html
<script src="https://cdn.virdispay.com/sdk/VirdisPaySDK.js"></script>
```

### 2. Initialize VirdisPay

```javascript
const virdisPay = new VirdisPaySDK({
    apiKey: 'your-api-key-here',
    merchantId: 'your-merchant-id-here',
    baseUrl: 'https://api.virdispay.com',
    widgetUrl: 'https://checkout.virdispay.com'
});
```

### 3. Add Payment Button

```javascript
const paymentButton = virdisPay.createPaymentButton({
    text: 'Pay with Crypto',
    amount: 99.00,
    currency: 'USDC',
    orderId: 'order-123',
    customerEmail: 'customer@example.com',
    onPaymentComplete: (paymentId) => {
        console.log('Payment completed:', paymentId);
        // Redirect to success page
    },
    onPaymentError: (error) => {
        console.error('Payment failed:', error);
    }
});

document.getElementById('payment-container').appendChild(paymentButton);
```

## 🎯 Integration Examples

### Shopify Integration
- **File**: `shopify-integration.html`
- **Features**: Multiple payment options, crypto widget, order summary
- **Usage**: Copy the code and customize for your Shopify store

### WooCommerce Integration
- **File**: `woocommerce-integration.php`
- **Features**: WordPress plugin, payment gateway, order management
- **Usage**: Upload to your WordPress site and activate

### Simple HTML Integration
- **File**: `simple-integration.html`
- **Features**: Basic implementation, payment buttons, widget
- **Usage**: Perfect for custom websites and simple stores

## 🔧 API Endpoints

### Create Payment
```javascript
POST /api/payments/create-ecommerce
{
    "amount": 99.00,
    "currency": "USDC",
    "orderId": "order-123",
    "customerEmail": "customer@example.com",
    "merchantId": "merchant-id"
}
```

### Get Payment Status
```javascript
GET /api/payments/status/{paymentId}
```

### Webhook for Order Confirmation
```javascript
POST /api/payments/webhook/{paymentId}
{
    "status": "completed",
    "transactionHash": "0x...",
    "customerWallet": "0x..."
}
```

## 💡 Supported Currencies

- **USDC** - USD Coin (Polygon)
- **USDT** - Tether USD (Polygon)
- **ETH** - Ethereum (Ethereum)
- **MATIC** - Polygon (Polygon)

## 🎨 Customization

### Widget Styling
The crypto payment widget automatically adapts to your site's design. You can also customize colors and styling:

```css
.crypto-checkout-widget {
    --primary-color: #3498db;
    --success-color: #27ae60;
    --error-color: #e74c3c;
}
```

### Payment Button Styling
```css
.virdispay-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}
```

## 🔒 Security Features

- **API Key Authentication** - Secure API access
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Sanitize all inputs
- **HTTPS Only** - Encrypted communication
- **Webhook Verification** - Secure order confirmation

## 📱 Mobile Support

- **Responsive Design** - Works on all devices
- **QR Code Scanning** - Easy mobile payments
- **Touch-Friendly** - Optimized for mobile
- **Wallet Integration** - Connect mobile wallets

## 🛠️ Advanced Features

### Real-time Price Conversion
```javascript
const currencies = await virdisPay.getCurrencies();
// Returns current crypto prices and supported currencies
```

### Payment Status Polling
```javascript
const status = await virdisPay.getPaymentStatus(paymentId);
// Check payment status programmatically
```

### Custom Webhooks
```javascript
// Configure webhook URL in your merchant dashboard
// Receive real-time payment notifications
```

## 🚀 Deployment

### Development
```bash
# Start the development servers
npm run dev
```

### Production
```bash
# Build for production
npm run build

# Deploy to your hosting provider
npm run deploy
```

## 📞 Support

- **Documentation**: [docs.virdispay.com](https://docs.virdispay.com)
- **Support**: [support@virdispay.com](mailto:support@virdispay.com)
- **Discord**: [discord.gg/virdispay](https://discord.gg/virdispay)

## 🎉 Success Stories

> "VirdisPay integration took just 15 minutes and increased our crypto payment conversion by 300%!" 
> 
> — Sarah, E-commerce Store Owner

> "The widget is beautiful and our customers love the QR code feature for mobile payments."
> 
> — Mike, Shopify Store Owner

---

**Ready to accept crypto payments?** [Get started now!](https://virdispay.com/signup)

