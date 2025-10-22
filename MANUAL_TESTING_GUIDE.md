# 🧪 VirdisPay Manual Testing Guide

## ✅ Testing Checklist - Complete These Before Launch

### 1️⃣ **User Registration & Authentication** (5 mins)

**Test Registration:**
- [ ] Go to http://localhost:3000
- [ ] Click "Create Account"
- [ ] Fill in all fields:
  - First Name: Test
  - Last Name: User
  - Email: test@example.com
  - Password: TestPass123!
  - Business Name: Test Cannabis Shop
  - Business Type: CBD (UK should block "Cannabis")
  - Country: United Kingdom
- [ ] Submit form
- [ ] ✅ Should redirect to login
- [ ] ❌ If UK + Cannabis → Should show error

**Test Login:**
- [ ] Enter the credentials you just created
- [ ] Click "Login"
- [ ] ✅ Should see dashboard with welcome message
- [ ] ✅ Should see wallet warning (no wallet yet)

**Test Logout:**
- [ ] Click "Logout" button
- [ ] ✅ Should return to login page

---

### 2️⃣ **Profile & Wallet Setup** (5 mins)

- [ ] Log back in
- [ ] Click "⚙️ Profile" tab
- [ ] Click "✏️ Edit Profile"
- [ ] Update your name/business details
- [ ] Scroll to "Payment Settings"
- [ ] Add test wallet address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5`
- [ ] Read the multi-chain support info
- [ ] ✅ Should see explanation of stablecoins (USDC, USDT, DAI)
- [ ] ✅ Should see explanation of blockchains (Polygon, Ethereum, BSC, Arbitrum)
- [ ] Click "💾 Save Changes"
- [ ] ✅ Should see success message
- [ ] ✅ Wallet warning at top should disappear

---

### 3️⃣ **Create Payment Request** (10 mins)

**Test Stablecoin Payment (Recommended):**
- [ ] Go to "💳 Create Payment" tab
- [ ] Fill in payment details:
  - Amount: 100
  - Currency: USDC (under "Stablecoins - Recommended")
  - Description: Test CBD Oil Purchase
  - Customer Email: customer@example.com
  - Customer Name: John Doe
- [ ] ✅ Should see stablecoins grouped separately from crypto
- [ ] ✅ Should see "$1.00" value indicator for stablecoins
- [ ] ✅ Should see helper text about price stability
- [ ] Click "Create Payment Request"
- [ ] ✅ Should see success message
- [ ] ✅ Should see payment in transactions list

**Test Crypto Payment:**
- [ ] Create another payment with Currency: ETH
- [ ] Amount: 0.05
- [ ] ✅ Should see it listed under "Cryptocurrencies (Price Volatile)"

**Test Multiple Currencies:**
- [ ] Try creating payments with:
  - [ ] USDC ($100)
  - [ ] USDT ($50)
  - [ ] DAI ($75)
  - [ ] ETH (0.05)
  - [ ] BTC (0.002)
- [ ] ✅ All should create successfully

---

### 4️⃣ **API Keys & Security** (10 mins)

- [ ] Go to "🔑 API Keys" tab
- [ ] ✅ Subtitle text should be dark and readable
- [ ] Click "Generate API Keys"
- [ ] ✅ Should see Public Key (pk_...)
- [ ] ✅ Should see Secret Key (sk_...) - only shown once!
- [ ] Copy and save the secret key somewhere safe
- [ ] Try regenerating keys
- [ ] ✅ Should ask for confirmation
- [ ] Add whitelisted domain:
  - Domain: https://myshop.com
  - [ ] Click "Add Domain"
  - [ ] ✅ Should appear in the list
- [ ] Try adding invalid domain (without https://)
  - [ ] ✅ Should show error
- [ ] Remove a domain
  - [ ] ✅ Should be removed from list

---

### 5️⃣ **Compliance & KYC** (10 mins)

- [ ] Go to "🛡️ Compliance" tab
- [ ] ✅ Should see "KYC Verification Not Started" section
- [ ] ✅ Should see ALL document upload forms:
  - [ ] 🆔 Government-Issued Photo ID
  - [ ] 🏠 Proof of Address
  - [ ] 📜 Certificate of Incorporation (for businesses)
  - [ ] 💼 Tax Registration (UK: UTR/VAT | US: EIN)
  - [ ] 👥 Beneficial Ownership (for businesses)
- [ ] ✅ All text should be dark and readable
- [ ] ✅ Each document should have clear descriptions
- [ ] Click "Refresh" button
- [ ] ✅ Should initialize KYC status
- [ ] ✅ Should now see KYC dashboard with:
  - Status cards
  - Risk assessment
  - Transaction limits
  - Document upload forms
  - Next steps

---

### 6️⃣ **Smart Routing Settings** (5 mins)

- [ ] Go to "⚙️ Routing Settings" tab
- [ ] ✅ All text should be dark and clearly visible (we just fixed this!)
- [ ] ✅ Should see three priority options:
  - [ ] 💰 Cost Optimized
  - [ ] ⚡ Speed Optimized
  - [ ] ⚖️ Balanced
- [ ] Click each option
- [ ] ✅ Should highlight with blue border and gradient background
- [ ] ✅ Hover effects should work
- [ ] Select preferred networks (Polygon, BSC, etc.)
- [ ] ✅ Checkboxes should work
- [ ] ✅ Selected networks should highlight
- [ ] Set maximum gas price: 50 Gwei
- [ ] Set minimum reliability: 95%
- [ ] Click "Save Preferences"
- [ ] ✅ Should see "✅ Preferences saved successfully!"

---

### 7️⃣ **Smart Routing Dashboard** (5 mins)

- [ ] Go to "🎯 Smart Routing" tab
- [ ] ✅ Should see current network conditions
- [ ] ✅ Should see fee comparisons (Polygon cheapest ~$0.001)
- [ ] ✅ Should see recommended network
- [ ] Click "🔄 Refresh Status"
- [ ] ✅ Should update network data
- [ ] Check routing analytics
- [ ] ✅ Should show routing decisions and savings

---

### 8️⃣ **Analytics Dashboard** (5 mins)

- [ ] Go to "📊 Analytics" tab
- [ ] ✅ Should see revenue charts
- [ ] ✅ Should see transaction trends
- [ ] Change time period (7 days, 30 days, etc.)
- [ ] ✅ Charts should update
- [ ] Check payment method breakdown
- [ ] ✅ Should show stablecoin vs crypto distribution
- [ ] Try "Export Data" buttons
- [ ] ✅ Should download CSV/JSON files

---

### 9️⃣ **Rate Limits** (5 mins)

- [ ] Go to "🛡️ Rate Limits" tab
- [ ] ✅ Should see your current tier (Free/Premium/Enterprise)
- [ ] ✅ Should see usage statistics
- [ ] ✅ Should see remaining requests
- [ ] Check different endpoint limits
- [ ] ✅ Auth, Payments, API endpoints should show separately

---

### 🔟 **Notifications** (5 mins)

- [ ] Look for notification bell (🔔) in top right of dashboard
- [ ] Click the bell
- [ ] ✅ Dropdown should appear on screen (not cut off)
- [ ] ✅ Should show notifications (or "No new notifications")
- [ ] Create a payment to trigger a notification
- [ ] ✅ Bell should show notification count
- [ ] Click a notification
- [ ] ✅ Should mark as read

---

### 1️⃣1️⃣ **Responsive Design** (5 mins)

- [ ] Resize browser window to mobile size (or press F12 → Toggle Device Toolbar)
- [ ] Check dashboard on mobile view:
  - [ ] ✅ Logo should be visible
  - [ ] ✅ Navigation tabs should stack or scroll
  - [ ] ✅ Forms should be readable
  - [ ] ✅ Buttons should be clickable
  - [ ] ✅ No horizontal scrolling

---

### 1️⃣2️⃣ **Website Integration Code** (10 mins)

- [ ] Go to http://localhost:3000 (marketing site, not dashboard)
- [ ] Scroll to "Integration" section
- [ ] ✅ Should see security notice about API keys
- [ ] Copy widget code example
- [ ] ✅ Should include `data-api-key="pk_..."`
- [ ] Check all integration methods:
  - [ ] JavaScript Widget
  - [ ] Hosted Checkout
  - [ ] Direct API
  - [ ] WooCommerce Plugin
- [ ] ✅ All code examples should show API key requirement

---

### 1️⃣3️⃣ **Marketing Website** (10 mins)

**Homepage (http://localhost:3000):**
- [ ] ✅ VirdisPay logo should be visible and correct size
- [ ] ✅ Tagline: "Professional Crypto Payments for the Cannabis Industry"
- [ ] ✅ Hero section should look good
- [ ] ✅ No dark grey boxes or weird artifacts
- [ ] ✅ "Built for Cannabis Industry" section should be clean
- [ ] ✅ Features section should display properly
- [ ] ✅ No "Trusted by" logos section (we removed it)
- [ ] Scroll to footer
- [ ] ✅ Contact info shows London, email "Coming Soon", no phone number
- [ ] ✅ No "24/7 Support" messaging

**Legal Pages:**
- [ ] Click "Privacy Policy" in footer
  - [ ] ✅ Should load policy page
  - [ ] ✅ DPO email: privacy@virdispay.com
- [ ] Click "Terms of Service"
  - [ ] ✅ Should load terms page
- [ ] Click "Cookie Policy"
  - [ ] ✅ Should load cookie page
  - [ ] ✅ DPO email: privacy@virdispay.com
- [ ] Click "Compliance"
  - [ ] ✅ Should load compliance page
  - [ ] ✅ DPO email: privacy@virdispay.com

**Blog:**
- [ ] Click "Blog" in navigation
- [ ] ✅ Hero section text should be dark and readable (we fixed this)
- [ ] ✅ Should see multiple articles about:
  - [ ] CBD payments
  - [ ] Cannabis industry
  - [ ] Crypto payments
  - [ ] Compliance
- [ ] Click an article
- [ ] ✅ Should load and be readable

---

### 1️⃣4️⃣ **Security Testing** (15 mins)

**Test Registration Validation:**
- [ ] Try registering with UK + Cannabis business type
  - [ ] ✅ Should show error/warning
- [ ] Try weak password
  - [ ] ✅ Should show error
- [ ] Try duplicate email
  - [ ] ✅ Should show error

**Test Login Security:**
- [ ] Try wrong password 3 times
  - [ ] ✅ Should track failed attempts
- [ ] Try SQL injection in email: `test@test.com' OR '1'='1`
  - [ ] ✅ Should fail safely

**Test API Key Security:**
- [ ] Try accessing `/api/payments/create` without API key
  - [ ] ✅ Should return 401 Unauthorized
- [ ] Try using wrong API key
  - [ ] ✅ Should return 401 Unauthorized

**Test Wallet Validation:**
- [ ] In Profile, try invalid wallet addresses:
  - [ ] `0x123` (too short)
  - [ ] `123456789` (no 0x prefix)
  - [ ] `test wallet` (not hex)
  - [ ] ✅ All should show validation errors

---

### 1️⃣5️⃣ **Performance Testing** (5 mins)

- [ ] Open browser DevTools (F12)
- [ ] Go to "Network" tab
- [ ] Reload dashboard
- [ ] ✅ Page should load in < 3 seconds
- [ ] Check API response times:
  - [ ] ✅ Login: < 500ms
  - [ ] ✅ Load KYC: < 1000ms
  - [ ] ✅ Create payment: < 500ms

---

### 1️⃣6️⃣ **Error Handling** (10 mins)

**Test Network Errors:**
- [ ] Stop the backend server (Ctrl+C in server terminal)
- [ ] Try creating a payment in dashboard
- [ ] ✅ Should show "Network error" message (not crash)
- [ ] Try logging in
- [ ] ✅ Should show error message
- [ ] Restart backend server

**Test Validation Errors:**
- [ ] Try creating payment with:
  - [ ] Amount: -100
  - [ ] ✅ Should reject negative amounts
  - [ ] Amount: 0
  - [ ] ✅ Should reject zero amounts
  - [ ] No customer email
  - [ ] ✅ Should require email

---

## 🎯 **Critical Path Testing** (Complete User Journey)

### Scenario: New Merchant Onboarding → First Payment

**Step 1: Register** (2 mins)
1. Create new merchant account
2. Verify email is sent (check server logs)
3. Log in

**Step 2: Setup Profile** (2 mins)
1. Go to Profile
2. Add wallet address
3. Save

**Step 3: Complete KYC** (3 mins)
1. Go to Compliance
2. Click Refresh to initialize
3. Review document requirements
4. Check risk level and limits

**Step 4: Generate API Keys** (2 mins)
1. Go to API Keys
2. Generate keys
3. Save secret key
4. Add your website domain

**Step 5: Configure Routing** (2 mins)
1. Go to Routing Settings
2. Select "Cost Optimized" (Polygon recommended)
3. Enable preferred networks
4. Save preferences

**Step 6: Create First Payment** (3 mins)
1. Go to Create Payment
2. Select **USDC** (stablecoin)
3. Amount: $50
4. Add customer details
5. Create payment
6. ✅ Should see payment in list

**Step 7: Check Analytics** (2 mins)
1. Go to Analytics
2. ✅ Should show $50 revenue
3. ✅ Should show 1 transaction
4. ✅ Should show USDC as payment method

---

## 🔍 **What to Look For**

### ✅ **Good Signs:**
- Clear, dark, readable text throughout
- No layout breaking or overflow
- Smooth transitions and hover effects
- Error messages are helpful
- Success messages appear when actions complete
- Forms validate properly
- Data saves correctly
- Stablecoins are clearly explained
- Multi-chain support is clear

### ❌ **Red Flags:**
- Light grey text that's hard to read
- Boxes/divs out of alignment
- Buttons not clickable
- Forms overflow their containers
- Error messages too vague
- Pages crash on errors
- Data doesn't save
- Unclear what stablecoins are
- Unclear what wallets work

---

## 📊 **Testing Priorities**

### **Must Test Before Launch:**
1. ✅ Registration (UK cannabis blocking)
2. ✅ Login/Logout
3. ✅ Wallet address setup
4. ✅ Create payment (stablecoins!)
5. ✅ API key generation
6. ✅ Security (API key validation)

### **Should Test Soon:**
1. ✅ KYC document upload flow
2. ✅ Smart routing preferences
3. ✅ Analytics dashboard
4. ✅ Email notifications (check server logs)
5. ✅ Rate limiting

### **Can Test Later:**
1. ✅ Mobile responsive design
2. ✅ Website integration code
3. ✅ Blog SEO
4. ✅ Legal pages

---

## 🐛 **Bug Reporting Template**

If you find issues, note down:

**What I Did:**
- (Steps to reproduce)

**What I Expected:**
- (Expected result)

**What Actually Happened:**
- (Actual result)

**Screenshot/Error:**
- (Console errors, screenshots)

---

## 🎯 **Key Things to Verify**

### **Stablecoin Clarity** (Our Recent Improvements):
- [ ] ✅ Payment form clearly shows "💵 Stablecoins (Price Stable - Recommended)"
- [ ] ✅ Each stablecoin shows "$1.00" value
- [ ] ✅ Helper text explains price stability benefit
- [ ] ✅ Profile explains stablecoins work on all chains

### **Text Visibility** (Recent Fixes):
- [ ] ✅ API Keys subtitle is dark and readable
- [ ] ✅ Routing Settings text is clear
- [ ] ✅ Compliance text is dark on backgrounds
- [ ] ✅ All form labels are readable

### **Document Requirements** (Recent Additions):
- [ ] ✅ Compliance shows all 5 document types
- [ ] ✅ Tax document shows UK/US/Other options
- [ ] ✅ Business docs only show for business accounts

---

## 🚀 **Production Readiness Checks**

Before going live, verify:

**Environment Variables:**
- [ ] `JWT_SECRET` is secure (not default)
- [ ] `MONGODB_URI` points to production database
- [ ] `CLIENT_URL` is your production domain
- [ ] Email credentials are configured

**Security:**
- [ ] HTTPS enabled on production domain
- [ ] CORS only allows your domain
- [ ] API keys are required for widget
- [ ] Rate limiting is active

**Compliance:**
- [ ] UK cannabis businesses are blocked
- [ ] KYC system is configured
- [ ] Transaction monitoring is enabled
- [ ] Legal pages are complete

**Payment Processing:**
- [ ] Wallet addresses are configured
- [ ] Blockchain RPC URLs are working
- [ ] Smart routing is enabled
- [ ] Fee collection is configured

---

## ✨ **Expected Results Summary**

After completing all tests, you should have:
- ✅ 1 registered merchant account
- ✅ Wallet address configured
- ✅ API keys generated
- ✅ 5+ test payment requests created
- ✅ KYC initialized
- ✅ Routing preferences saved
- ✅ Domain whitelisted
- ✅ Analytics showing data
- ✅ No critical errors in console
- ✅ All text clearly visible

---

**Time Required:** ~90 minutes for complete testing
**Priority Tests:** Items 1-6 (~45 minutes)

Start with the critical path testing (new merchant onboarding), then do the individual feature tests! 🎯
