# 🌐 Website Integration Guide

Easy integration options for adding VoodooHemp Payment Processor to any website.

---

## 🚀 Quick Start (3 Minutes)

### Method 1: Simple Button Widget

Add this to any HTML page:

```html
<!-- Step 1: Include the widget script -->
<script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>

<!-- Step 2: Add a payment button -->
<button class="voodoo-pay-button" 
        data-merchant-id="your_merchant_id"
        data-amount="99.99"
        data-currency="USD"
        data-description="Premium CBD Oil 30ml">
  Pay with Crypto
</button>
```

**That's it!** The button is styled automatically and opens a secure payment modal.

---

## 📋 Integration Methods

### 1. **Button Widget** (Easiest)
Perfect for: Product pages, landing pages, simple checkouts

### 2. **Hosted Checkout** (Redirect)
Perfect for: Shopping carts, complex checkouts

### 3. **API Integration** (Advanced)
Perfect for: Custom integrations, mobile apps, server-to-server

### 4. **E-commerce Plugins**
Perfect for: WordPress/WooCommerce, Shopify, Magento

---

## 🎨 Method 1: Button Widget

### Basic Button

```html
<script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>

<button class="voodoo-pay-button" 
        data-merchant-id="merchant_abc123"
        data-amount="49.99"
        data-currency="USD"
        data-description="CBD Tincture">
  Buy Now - $49.99
</button>
```

### With Customer Email (Pre-filled)

```html
<button class="voodoo-pay-button" 
        data-merchant-id="merchant_abc123"
        data-amount="99.99"
        data-description="Full Spectrum CBD Oil"
        data-customer-email="customer@example.com">
  Pay Now
</button>
```

### With Order ID and Metadata

```html
<button class="voodoo-pay-button" 
        data-merchant-id="merchant_abc123"
        data-amount="149.99"
        data-description="CBD Starter Pack"
        data-order-id="ORDER-12345"
        data-meta-product-id="CBD-001"
        data-meta-quantity="2"
        data-meta-color="natural">
  Complete Purchase
</button>
```

### Custom Styled Button

```html
<button class="voodoo-pay-button custom-style" 
        data-merchant-id="merchant_abc123"
        data-amount="29.99"
        data-no-icon="true"
        style="background: #10b981; color: white; padding: 15px 30px; border: none; border-radius: 4px; font-size: 18px; cursor: pointer;">
  Checkout Securely
</button>
```

### Multiple Products on One Page

```html
<!-- Product 1 -->
<div class="product">
  <h3>CBD Gummies</h3>
  <p>$24.99</p>
  <button class="voodoo-pay-button" 
          data-merchant-id="merchant_abc123"
          data-amount="24.99"
          data-description="CBD Gummies 30ct">
    Buy Now
  </button>
</div>

<!-- Product 2 -->
<div class="product">
  <h3>Hemp Extract</h3>
  <p>$39.99</p>
  <button class="voodoo-pay-button" 
          data-merchant-id="merchant_abc123"
          data-amount="39.99"
          data-description="Hemp Extract 15ml">
    Buy Now
  </button>
</div>
```

---

## 🔗 Method 2: Hosted Checkout (Redirect)

Redirect customers to a hosted checkout page:

### HTML Link

```html
<a href="https://pay.voodoohemp.com/checkout?merchant=merchant_abc123&amount=99.99&description=CBD%20Oil&currency=USD">
  Buy Now
</a>
```

### JavaScript Redirect

```html
<button onclick="checkoutWithVoodoo()">
  Proceed to Checkout
</button>

<script>
function checkoutWithVoodoo() {
  const params = new URLSearchParams({
    merchant: 'merchant_abc123',
    amount: '99.99',
    currency: 'USD',
    description: 'Premium CBD Oil',
    orderId: 'ORDER-12345',
    email: 'customer@example.com',
    returnUrl: 'https://yoursite.com/order-complete'
  });
  
  window.location.href = `https://pay.voodoohemp.com/checkout?${params.toString()}`;
}
</script>
```

### Form POST

```html
<form action="https://pay.voodoohemp.com/checkout" method="POST">
  <input type="hidden" name="merchant" value="merchant_abc123">
  <input type="hidden" name="amount" value="99.99">
  <input type="hidden" name="currency" value="USD">
  <input type="hidden" name="description" value="CBD Oil">
  <input type="hidden" name="orderId" value="ORDER-12345">
  
  <button type="submit">Checkout</button>
</form>
```

---

## 🔧 Method 3: API Integration

For custom integrations and server-side control.

### Step 1: Create Payment Session (Backend)

```javascript
// Node.js / Express example
const axios = require('axios');

app.post('/create-payment', async (req, res) => {
  try {
    const response = await axios.post('https://api.voodoohemp.com/api/payments/create-session', {
      merchantId: 'merchant_abc123',
      amount: 99.99,
      currency: 'USD',
      description: 'CBD Oil 30ml',
      customerEmail: req.body.email,
      orderId: req.body.orderId,
      metadata: {
        productId: 'CBD-001',
        quantity: 1
      }
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });

    res.json({ sessionId: response.data.sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Payment creation failed' });
  }
});
```

### Step 2: Redirect to Checkout (Frontend)

```javascript
// Create payment session
const response = await fetch('/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'customer@example.com',
    orderId: 'ORDER-12345'
  })
});

const { sessionId } = await response.json();

// Redirect to payment page
window.location.href = `https://pay.voodoohemp.com/payment/${sessionId}`;
```

### PHP Example

```php
<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.voodoohemp.com/api/payments/create-session",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    'merchantId' => 'merchant_abc123',
    'amount' => 99.99,
    'currency' => 'USD',
    'description' => 'CBD Oil',
    'customerEmail' => $_POST['email']
  ]),
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
  ]
]);

$response = curl_exec($curl);
$data = json_decode($response, true);
curl_close($curl);

// Redirect to checkout
header("Location: https://pay.voodoohemp.com/payment/{$data['sessionId']}");
?>
```

---

## 🛒 WordPress / WooCommerce Integration

### Option 1: Simple Product Button

Add to product page or post:

```html
[voodoo_payment merchant="merchant_abc123" amount="99.99" description="CBD Oil"]
```

### Option 2: WooCommerce Plugin (Coming Soon)

1. Install VoodooHemp plugin
2. Go to WooCommerce → Settings → Payments
3. Enable "VoodooHemp Crypto Payments"
4. Enter your Merchant ID
5. Save changes

---

## 🛍️ Shopify Integration

### Option 1: Custom Button (Shopify Pages)

Add to product description or page:

```html
<script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>

<button class="voodoo-pay-button" 
        data-merchant-id="merchant_abc123"
        data-amount="{{ product.price | divided_by: 100.0 }}"
        data-description="{{ product.title }}">
  Buy with Crypto
</button>
```

### Option 2: Shopify App (Coming Soon)

1. Install VoodooHemp app from Shopify App Store
2. Connect your VoodooHemp account
3. Enable crypto payments at checkout

---

## 💻 JavaScript API

### Initialize Widget Manually

```html
<script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>

<button id="custom-checkout">Custom Checkout</button>

<script>
document.getElementById('custom-checkout').addEventListener('click', function() {
  VoodooHemp.openPayment({
    merchantId: 'merchant_abc123',
    amount: 99.99,
    currency: 'USD',
    description: 'CBD Oil 30ml',
    customerEmail: 'customer@example.com'
  });
});
</script>
```

### Listen for Payment Events

```javascript
// Payment success
window.addEventListener('voodooPaymentSuccess', function(e) {
  console.log('Payment successful!', e.detail);
  // e.detail contains: transactionId, amount, currency
  
  // Update your UI
  alert('Thank you for your payment!');
  
  // Redirect to confirmation page
  window.location.href = '/order-confirmation?tx=' + e.detail.transactionId;
});

// Payment error
window.addEventListener('voodooPaymentError', function(e) {
  console.error('Payment failed:', e.detail.error);
  alert('Payment failed. Please try again.');
});

// Or use callback function
window.voodooPaymentCallback = function(status, data) {
  if (status === 'success') {
    console.log('Payment completed:', data);
  } else {
    console.log('Payment failed:', data);
  }
};
```

---

## 🎨 Customization

### Button Customization

```html
<!-- Custom text and styling -->
<button class="voodoo-pay-button custom-style" 
        data-merchant-id="merchant_abc123"
        data-amount="49.99"
        data-no-icon="true"
        style="
          background: linear-gradient(to right, #10b981, #059669);
          color: white;
          padding: 16px 32px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
        ">
  🌿 Secure Crypto Checkout
</button>
```

### Modal vs Redirect

```html
<!-- Open in modal (default) -->
<button class="voodoo-pay-button" 
        data-merchant-id="merchant_abc123"
        data-amount="99.99"
        data-checkout-method="modal">
  Pay in Modal
</button>

<!-- Redirect to hosted page -->
<button class="voodoo-pay-button" 
        data-merchant-id="merchant_abc123"
        data-amount="99.99"
        data-checkout-method="redirect">
  Redirect to Checkout
</button>
```

---

## 📱 Mobile-Friendly

All integration methods are automatically mobile-responsive:

- ✅ Modal adapts to screen size
- ✅ Buttons work on touch devices
- ✅ MetaMask mobile browser supported
- ✅ WalletConnect integration (coming soon)

---

## 🔐 Security Best Practices

### 1. Always Use HTTPS

```html
<!-- ✅ Good -->
<script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>

<!-- ❌ Bad -->
<script src="http://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>
```

### 2. Validate on Server

Never trust client-side amounts. Always verify on your server:

```javascript
// Backend verification
app.post('/webhook/payment-complete', async (req, res) => {
  const { transactionId, amount } = req.body;
  
  // Verify with VoodooHemp API
  const verification = await verifyPayment(transactionId);
  
  if (verification.amount === expectedAmount) {
    // Fulfill order
    fulfillOrder(orderId);
  }
});
```

### 3. Use Webhooks

Set up webhooks to receive payment notifications:

```javascript
// In your VoodooHemp dashboard, set webhook URL:
// https://yoursite.com/webhooks/voodoohemp

app.post('/webhooks/voodoohemp', (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment.completed') {
    // Update order status
    updateOrder(event.data.orderId, 'paid');
  }
  
  res.json({ received: true });
});
```

---

## 🎯 Complete Examples

### Example 1: Simple Product Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Buy CBD Oil</title>
  <script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>
</head>
<body>
  <div class="product">
    <img src="cbd-oil.jpg" alt="Premium CBD Oil">
    <h1>Premium CBD Oil - 30ml</h1>
    <p class="price">$99.99</p>
    <p>Full-spectrum hemp extract with 1000mg CBD</p>
    
    <button class="voodoo-pay-button" 
            data-merchant-id="merchant_abc123"
            data-amount="99.99"
            data-currency="USD"
            data-description="Premium CBD Oil 30ml 1000mg">
      Buy Now - Pay with Crypto
    </button>
    
    <p class="gas-notice">
      💡 Ultra-low fees: ~$0.01 transaction fee (vs $50+ with Ethereum)
    </p>
  </div>
</body>
</html>
```

### Example 2: Shopping Cart

```html
<!DOCTYPE html>
<html>
<head>
  <title>Shopping Cart</title>
  <script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>
</head>
<body>
  <div class="cart">
    <h2>Your Cart</h2>
    
    <div class="cart-items">
      <div class="item">
        <span>CBD Gummies</span>
        <span>$24.99</span>
      </div>
      <div class="item">
        <span>Hemp Extract</span>
        <span>$39.99</span>
      </div>
    </div>
    
    <div class="cart-total">
      <strong>Total: $64.98</strong>
    </div>
    
    <button class="voodoo-pay-button" 
            data-merchant-id="merchant_abc123"
            data-amount="64.98"
            data-currency="USD"
            data-description="Cart: CBD Gummies, Hemp Extract"
            data-order-id="CART-12345">
      Checkout with Crypto
    </button>
  </div>

  <script>
    // Listen for successful payment
    window.addEventListener('voodooPaymentSuccess', function(e) {
      // Clear cart
      localStorage.removeItem('cart');
      
      // Redirect to confirmation
      window.location.href = '/order-complete?tx=' + e.detail.transactionId;
    });
  </script>
</body>
</html>
```

---

## 🆘 Troubleshooting

### Button Not Appearing

**Check:**
1. Script is loaded: `<script src="https://pay.voodoohemp.com/js/voodoohemp-widget.js"></script>`
2. Button has required attributes: `data-merchant-id` and `data-amount`
3. Check browser console for errors

### Payment Modal Not Opening

**Check:**
1. JavaScript enabled
2. No ad blockers blocking the modal
3. Merchant ID is correct
4. Check browser console for errors

### MetaMask Not Connecting

**Check:**
1. MetaMask extension installed
2. On correct network (Polygon)
3. Wallet has MATIC for gas fees

---

## 📚 API Reference

### Button Attributes

| Attribute | Required | Description | Example |
|-----------|----------|-------------|---------|
| `data-merchant-id` | ✅ | Your merchant ID | `merchant_abc123` |
| `data-amount` | ✅ | Payment amount | `99.99` |
| `data-currency` | ❌ | Currency code | `USD` (default) |
| `data-description` | ❌ | Payment description | `CBD Oil 30ml` |
| `data-customer-email` | ❌ | Customer email | `customer@example.com` |
| `data-order-id` | ❌ | Order/invoice ID | `ORDER-12345` |
| `data-checkout-method` | ❌ | `modal` or `redirect` | `modal` (default) |
| `data-no-icon` | ❌ | Disable emoji icon | `true` |
| `data-meta-*` | ❌ | Custom metadata | `data-meta-sku="ABC123"` |

---

## 🎉 You're Ready!

Choose your integration method and start accepting crypto payments in minutes!

**Need help?** Contact support@voodoohemp.com

**Want a custom integration?** We can help! Reach out for enterprise solutions.



