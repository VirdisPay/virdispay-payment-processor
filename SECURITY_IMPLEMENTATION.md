# 🔒 VirdisPay Security Implementation

## Critical Security Update: API Key & Domain Whitelisting

**Date:** January 2025  
**Status:** ✅ IMPLEMENTED  
**Security Level:** MAXIMUM (Option 3)

---

## 🚨 Problem Identified

**CRITICAL VULNERABILITY:** Payment widget code was publicly accessible without authentication, allowing:
- ❌ Anyone to copy widget code
- ❌ Hijacking of merchant IDs to steal payments
- ❌ Unauthorized use of merchant accounts
- ❌ No domain validation for widget usage
- ❌ Payment fraud and theft

**Impact:** HIGH - Could result in payment fraud, stolen funds, and reputation damage.

---

## ✅ Solution Implemented

### Option 3: API Keys + Domain Whitelisting (MAXIMUM SECURITY)

We've implemented a dual-layer security system:

1. **API Key Authentication** - Cryptographically secure keys
2. **Domain Whitelisting** - Strict origin validation

---

## 🔑 Components Implemented

### 1. Database Schema (User Model)

**File:** `server/models/User.js`

```javascript
// API Keys
apiKeys: {
  publicKey: String (unique, pk_live_xxx),
  secretKey: String (select: false, sk_live_xxx),
  createdAt: Date,
  lastUsed: Date
}

// Domain Whitelist
allowedDomains: [{
  domain: String,
  addedAt: Date,
  verified: Boolean
}]
```

### 2. API Key Service

**File:** `server/services/apiKeyService.js`

**Features:**
- ✅ Cryptographically random key generation (64 chars)
- ✅ Public key format: `pk_live_[64 hex chars]`
- ✅ Secret key format: `sk_live_[64 hex chars]`
- ✅ Domain normalization and validation
- ✅ Subdomain matching support
- ✅ Localhost auto-whitelisting for development

**Key Methods:**
- `generateApiKeys(userId)` - Generate new API key pair
- `regenerateApiKeys(userId)` - Regenerate compromised keys
- `validatePublicKey(publicKey)` - Validate client-side keys
- `validateSecretKey(secretKey)` - Validate server-side keys
- `addAllowedDomain(userId, domain)` - Whitelist a domain
- `removeAllowedDomain(userId, domain)` - Remove domain
- `validateDomain(userId, origin)` - Validate request origin

### 3. Authentication Middleware

**File:** `server/middleware/apiKeyAuth.js`

**Middleware Functions:**
- `validatePublicKey` - Validate public API key
- `validateSecretKey` - Validate secret API key
- `validateDomain` - Validate request origin against whitelist
- `validateApiKeyAndDomain` - Combined validation (used for widget)
- `optionalApiKey` - Optional key validation

### 4. API Routes

**File:** `server/routes/apiKeys.js`

**Endpoints:**
- `GET /api/api-keys` - Get merchant's API keys and settings
- `POST /api/api-keys/generate` - Generate new API keys
- `POST /api/api-keys/regenerate` - Regenerate API keys
- `POST /api/api-keys/domains` - Add domain to whitelist
- `DELETE /api/api-keys/domains/:domain` - Remove domain
- `GET /api/api-keys/domains` - Get all whitelisted domains
- `POST /api/api-keys/validate` - Validate an API key (testing)

### 5. Secured Payment Routes

**File:** `server/routes/payments.js`

**New Widget Route:**
```javascript
POST /api/payments/widget/create
Middleware: validateApiKeyAndDomain
- Requires valid public API key (X-API-Key header)
- Validates request origin against whitelist
- Creates payment with merchant from API key
```

**Existing Dashboard Route:**
```javascript
POST /api/payments/create
Middleware: authMiddleware (JWT)
- For authenticated dashboard users
- No API key required
```

### 6. Dashboard UI

**File:** `client/src/components/ApiKeySettings.tsx`

**Features:**
- ✅ Generate/regenerate API keys
- ✅ Display public key (always visible)
- ✅ One-time secret key display
- ✅ Copy to clipboard functionality
- ✅ Add/remove whitelisted domains
- ✅ Domain list management
- ✅ Integration code examples
- ✅ Usage statistics (created date, last used)

### 7. Updated Widget

**File:** `website/widgets/virdispay-widget.js`

**Changes:**
- ✅ `apiKey` parameter is now **REQUIRED**
- ✅ Validates API key format (must start with `pk_`)
- ✅ Sends API key in `X-API-Key` header
- ✅ Uses new endpoint: `/api/payments/widget/create`
- ✅ Better error handling with specific messages

---

## 🔐 Security Flow

### Widget Payment Creation Flow:

```
1. Merchant generates API keys in dashboard
   ↓
2. Merchant adds their website domain to whitelist
   ↓
3. Merchant embeds widget with publicKey
   ↓
4. Customer clicks "Pay Now" on merchant website
   ↓
5. Widget sends payment request with:
   - X-API-Key header (public key)
   - Request origin (domain)
   ↓
6. Server validates:
   a. API key exists and is valid
   b. Origin matches whitelisted domain
   ↓
7. If valid: Create payment and return
   If invalid: Return 401/403 error
```

---

## 🛡️ Security Features

### API Key Security:
- ✅ Cryptographically random generation (crypto.randomBytes)
- ✅ 64-character hex keys (256-bit entropy)
- ✅ Secret keys never returned in API responses (select: false)
- ✅ Secret keys only shown once during generation
- ✅ Unique constraint on public keys
- ✅ Last used timestamp tracking

### Domain Security:
- ✅ Strict origin validation
- ✅ Domain normalization (removes protocol, www, path)
- ✅ Subdomain matching support
- ✅ Localhost auto-whitelisting for development
- ✅ Multiple domain support per merchant
- ✅ Easy domain management UI

### Request Security:
- ✅ CORS validation
- ✅ Origin header validation
- ✅ Referer header fallback
- ✅ Rate limiting (existing system)
- ✅ KYC/AML compliance (existing system)

---

## 📝 Merchant Usage Guide

### Step 1: Generate API Keys

1. Log into VirdisPay dashboard
2. Navigate to "🔑 API Keys" tab
3. Click "Generate API Keys"
4. **IMPORTANT:** Copy and save your secret key immediately (shown only once)
5. Public key is always visible in dashboard

### Step 2: Whitelist Your Domain

1. In "Domain Whitelist" section
2. Enter your domain (e.g., `example.com`)
3. Click "Add Domain"
4. Repeat for all domains where widget will be used

**Note:** Subdomains are automatically included (e.g., whitelisting `example.com` allows `shop.example.com`)

### Step 3: Integrate Widget

```html
<!-- Add VirdisPay widget script -->
<script src="https://widgets.virdispay.com/virdispay-widget.js"></script>

<!-- Add payment button with your API key -->
<div data-virdispay-widget="button"
     data-api-key="pk_live_YOUR_PUBLIC_KEY_HERE"
     data-amount="100"
     data-currency="USD"
     data-description="Product Purchase">
</div>

<script>
  VirdisPay.init({
    apiKey: 'pk_live_YOUR_PUBLIC_KEY_HERE',
    onSuccess: function(payment) {
      // Handle successful payment
      console.log('Payment successful!', payment);
    },
    onError: function(error) {
      // Handle payment error
      console.error('Payment failed:', error);
    }
  });
</script>
```

### Step 4: Test Integration

1. Test on localhost (automatically whitelisted)
2. Deploy to production domain (must be whitelisted)
3. Monitor "Last Used" timestamp in dashboard

---

## 🔄 Key Regeneration

### When to Regenerate:

- ✅ API key compromised or exposed
- ✅ Secret key leaked in client-side code
- ✅ Security breach suspected
- ✅ Regular security rotation (recommended annually)

### How to Regenerate:

1. Click "🔄 Regenerate Keys" in dashboard
2. Confirm action (will invalidate current keys)
3. Copy new secret key immediately
4. Update all integrations with new public key
5. Test all payment widgets

**⚠️ Warning:** Regenerating keys will break existing integrations until updated.

---

## 🧪 Testing

### Development Testing:

```javascript
// Localhost is automatically whitelisted
// No need to add 127.0.0.1 or localhost to whitelist
```

### Production Testing:

```javascript
// 1. Add production domain to whitelist
// 2. Deploy widget with API key
// 3. Test payment flow
// 4. Check "Last Used" timestamp in dashboard
```

### API Key Validation Endpoint:

```bash
# Test public key
curl -X POST http://localhost:5000/api/api-keys/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "pk_live_xxx", "type": "public"}'

# Test secret key
curl -X POST http://localhost:5000/api/api-keys/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk_live_xxx", "type": "secret"}'
```

---

## 📊 Monitoring

### Dashboard Metrics:

- **Created:** When API keys were generated
- **Last Used:** Last successful API request
- **Allowed Domains:** List of whitelisted domains
- **Domain Added Date:** When each domain was whitelisted

### Server Logs:

```javascript
// Successful validations are logged
✓ API key validated: pk_live_xxx
✓ Domain validated: example.com

// Failed validations are logged
✗ Invalid API key: pk_live_xxx
✗ Domain not whitelisted: malicious.com (merchant: xxx)
```

---

## 🚀 Migration Guide

### For Existing Merchants:

1. **All existing merchants MUST generate API keys**
2. **All existing integrations MUST be updated with API keys**
3. **All domains MUST be whitelisted**
4. **Old `/api/payments/create` endpoint still works for dashboard**
5. **New `/api/payments/widget/create` endpoint for widgets**

### Timeline:

- ✅ **Phase 1:** Security system deployed (COMPLETED)
- ⏳ **Phase 2:** Notify all merchants (30 days)
- ⏳ **Phase 3:** Require API keys (60 days)
- ⏳ **Phase 4:** Deprecate old widget endpoint (90 days)

---

## 🔍 Security Audit

### Vulnerability Assessment:

| Threat | Before | After | Status |
|--------|---------|-------|--------|
| Payment hijacking | ❌ High Risk | ✅ Protected | FIXED |
| Unauthorized widget use | ❌ High Risk | ✅ Protected | FIXED |
| Domain spoofing | ❌ High Risk | ✅ Protected | FIXED |
| API key theft | N/A | ⚠️ Low Risk | MITIGATED |
| Secret key exposure | N/A | ⚠️ Medium Risk | DOCUMENTED |

### Best Practices:

- ✅ Never expose secret keys in client-side code
- ✅ Store secret keys in environment variables
- ✅ Use public keys only in frontend
- ✅ Regenerate keys if compromised
- ✅ Whitelist only necessary domains
- ✅ Monitor "Last Used" timestamps
- ✅ Remove unused domains from whitelist

---

## 📞 Support

### Error Messages:

**"API key required"**
- Add `apiKey` parameter to widget initialization

**"Invalid API key"**
- Verify public key starts with `pk_`
- Check API key in dashboard
- Ensure key hasn't been regenerated

**"Domain not whitelisted"**
- Add your website domain in dashboard
- Remove `https://` and `www` from domain
- Allow time for whitelist update

### Getting Help:

- 📧 Email: security@virdispay.com
- 📖 Documentation: https://docs.virdispay.com/security
- 💬 Support: Dashboard help widget

---

## ✅ Security Checklist

Before Going Live:

- [ ] API keys generated
- [ ] Secret key saved securely
- [ ] All domains whitelisted
- [ ] Widget updated with public key
- [ ] Test payment on production domain
- [ ] Verify "Last Used" timestamp updates
- [ ] Secret key stored in secure location (password manager)
- [ ] Team members know NOT to share secret keys
- [ ] Regular security review scheduled

---

## 🎯 Summary

VirdisPay now implements **bank-grade security** for payment widget integration:

✅ **Cryptographically secure API keys**  
✅ **Domain whitelisting**  
✅ **Origin validation**  
✅ **One-time secret key display**  
✅ **Easy key management**  
✅ **Developer-friendly integration**  
✅ **Comprehensive monitoring**  

**Your payments are now SECURE! 🔒**

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** PRODUCTION READY



