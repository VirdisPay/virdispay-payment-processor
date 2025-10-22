# 💳 Payment Testing Guide

## 🎯 How to Test End-to-End Payment Flow

### **Overview:**
VirdisPay has a **merchant dashboard** where you create payment requests, and a **payment widget/checkout page** where customers pay. Here's how to test it:

---

## 📝 **Step 1: Create Test Accounts**

### **Admin Account** (Already exists):
- **Email:** `admin@virdispay.com`
- **Password:** `Admin123!`
- **Purpose:** Approve KYC submissions

### **Merchant Account** (Create new):
1. Go to `http://localhost:3000`
2. Click "Create Account"
3. Fill in:
   - **Email:** `merchant@test.com`
   - **Password:** `Test123!`
   - **Business Name:** `Test Cannabis Shop`
   - **Business Type:** `Hemp & CBD`
   - **Country:** `United States`
4. Register and login

### **Customer** (No account needed):
- Customers don't need accounts
- They just click payment links/buttons
- For testing, use **MetaMask wallet** or any Ethereum wallet

---

## 🔧 **Step 2: Setup Merchant Profile**

1. **Login as merchant** (`merchant@test.com`)
2. Click **"⚙️ Profile"** tab
3. Add **Test Wallet Address**: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5`
   - This is where customer payments will be sent
4. Click **"💾 Save Changes"**

---

## 📄 **Step 3: Upload KYC Documents** (Optional for Testing)

1. Go to **"🛡️ Compliance"** tab
2. Click **"Refresh"** button to initialize KYC
3. Upload any image/PDF files for:
   - Government ID
   - Proof of Address
4. Click **"📤 Submit for KYC Review"**

### **Approve KYC (as Admin)**:
1. Logout from merchant account
2. Login as **admin** (`admin@virdispay.com` / `Admin123!`)
3. Go to **"🛡️ KYC Review"** tab
4. Click **"✅ Approve"** on the merchant's KYC
5. Logout and login back as merchant

---

## 💰 **Step 4: Create a Payment Request**

1. Login as **merchant** (`merchant@test.com`)
2. Go to **"💳 Create Payment"** tab
3. Fill in the form:
   - **Amount:** `50` (USD)
   - **Currency:** `USDC` (stablecoin recommended)
   - **Description:** `Test CBD Oil Purchase`
   - **Customer Email:** `customer@example.com`
   - **Customer Name:** `John Doe`
   - **Phone:** `+1234567890`
4. Click **"Create Crypto Payment"**
5. ✅ You should see success message and transaction ID

---

## 🛒 **Step 5: Process the Payment (AS CUSTOMER)**

### **Option A: Using the Checkout Page** (Easiest)

Currently, the payment flow expects customers to use either:

1. **Hosted Checkout Page** - `http://localhost:3000/checkout.html`
2. **Payment Widget** on merchant's website
3. **Direct wallet transfer** to merchant's wallet address

### **🎮 For Testing - Simulated Payment:**

Since we don't have real crypto wallets with testnet tokens, here's how to **simulate** a payment:

#### **Method 1: Manual Transaction Update** (Backend Test)

Run this in a PowerShell terminal from the project root:

```powershell
# Create a test file to mark payment as completed
@"
const mongoose = require('mongoose');
require('dotenv').config();

async function completeTestPayment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Transaction = require('./server/models/Transaction');
    
    // Find the most recent pending transaction
    const transaction = await Transaction.findOne({ status: 'pending' })
      .sort({ createdAt: -1 });
    
    if (!transaction) {
      console.log('No pending transactions found');
      return;
    }
    
    // Simulate payment completion
    transaction.status = 'completed';
    transaction.txHash = '0xTEST' + Math.random().toString(36).substring(7);
    transaction.fromAddress = '0x' + Math.random().toString(36).substring(2, 15);
    transaction.timestamps.processed = new Date();
    transaction.timestamps.completed = new Date();
    
    await transaction.save();
    
    console.log('✅ Transaction completed!');
    console.log('Transaction ID:', transaction._id);
    console.log('Amount:', transaction.amount, transaction.currency);
    console.log('Status:', transaction.status);
    console.log('TxHash:', transaction.txHash);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

completeTestPayment();
"@ | Out-File -FilePath complete-payment-test.js -Encoding UTF8

# Run the script
node complete-payment-test.js

# Clean up
Remove-Item complete-payment-test.js
```

#### **Method 2: Using Postman/API Call**

You can also create an API endpoint to mark payments as complete for testing:

```bash
POST http://localhost:5000/api/payments/test/complete
Authorization: Bearer <your_merchant_token>
{
  "transactionId": "transaction_id_from_dashboard"
}
```

---

## 🔍 **Step 6: Verify Payment**

### **As Merchant:**
1. Go back to merchant dashboard
2. Go to **"💳 Create Payment"** tab
3. Scroll down to **"Recent Transactions"**
4. Click **"Refresh"** button
5. ✅ You should see the payment status updated to **"completed"**

### **As Admin:**
1. Login as admin
2. Go to **"💳 Payments"** tab
3. ✅ You should see the payment in the list
4. Go to **"💰 Revenue"** tab
5. ✅ Should show platform fees earned

---

## 🧪 **Full Test Scenarios**

### **Scenario 1: Successful Stablecoin Payment**
1. Merchant creates $100 USDC payment
2. Customer "pays" (simulate with script above)
3. Merchant sees payment in dashboard
4. Admin sees platform fee revenue

### **Scenario 2: Multiple Payments**
1. Create 5 different payments:
   - $50 USDC
   - $75 USDT
   - $100 DAI
   - 0.05 ETH
   - 0.002 BTC
2. Simulate completion for each
3. Check analytics dashboard
4. Verify revenue calculations

### **Scenario 3: KYC Required Flow**
1. Create merchant without KYC
2. Try to create large payment (>$5000)
3. Should be blocked or flagged
4. Upload KYC documents
5. Get admin approval
6. Retry payment creation

---

## 🎨 **Testing the Widget (Advanced)**

If you want to test the actual payment widget:

1. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Payment Widget</title>
</head>
<body>
    <h1>Test Store</h1>
    <p>Product: Premium CBD Oil - $50</p>
    
    <button 
        data-virdispay-widget="button"
        data-merchant-id="MERCHANT_ID_HERE"
        data-amount="50"
        data-currency="USDC"
        data-description="Premium CBD Oil"
        data-theme="green">
        Pay with Crypto
    </button>
    
    <script src="http://localhost:3000/js/virdispay-widget.js"></script>
</body>
</html>
```

2. Replace `MERCHANT_ID_HERE` with actual merchant MongoDB ID
3. Open this file in a browser
4. Click the button to test widget

---

## 📊 **Expected Results**

After completing all tests, you should see:

### **Merchant Dashboard:**
- ✅ Multiple transactions in "Recent Transactions"
- ✅ Payment statuses: pending → processing → completed
- ✅ Transaction details with amounts and currencies

### **Admin Dashboard:**
- ✅ All merchant payments visible
- ✅ Platform fee revenue calculated
- ✅ KYC submissions and approvals
- ✅ Payment analytics and charts

### **Database:**
- ✅ Transaction records with complete data
- ✅ Merchant balances updated
- ✅ Platform fee tracking
- ✅ Audit logs of admin actions

---

## 🚨 **Common Issues & Solutions**

### **Issue: "Wallet address required"**
- **Solution:** Add wallet address in Profile Settings first

### **Issue: "KYC verification required"**
- **Solution:** Upload KYC documents and get admin approval

### **Issue: "Payment not appearing in dashboard"**
- **Solution:** Click "Refresh" button in Recent Transactions

### **Issue: "Cannot connect to backend"**
- **Solution:** Make sure backend server is running on port 5000

---

## 🎯 **Quick Test Checklist**

- [ ] Create merchant account
- [ ] Add wallet address
- [ ] Upload KYC documents (optional)
- [ ] Create payment request
- [ ] Simulate payment completion
- [ ] Verify in merchant dashboard
- [ ] Login as admin
- [ ] Approve KYC (if submitted)
- [ ] Check payment in admin dashboard
- [ ] Verify platform fees calculated

---

## 💡 **Pro Tips**

1. **Use USDC for testing** - Stablecoins are easier to calculate ($1 = 1 USDC)
2. **Test different amounts** - Small ($10), medium ($100), large ($1000+)
3. **Check email logs** - Server should send email notifications (check console)
4. **Use MongoDB Compass** - View database records directly
5. **Clear browser cache** - If dashboard doesn't update

---

## 🔐 **Test Accounts Summary**

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| **Admin** | admin@virdispay.com | Admin123! | Approve KYC, view all data |
| **Merchant** | merchant@test.com | Test123! | Create payments, upload KYC |
| **Customer** | N/A | N/A | Makes payments (no account needed) |

---

## 📞 **Need Help?**

If payments aren't working:
1. Check browser console (F12) for errors
2. Check backend server logs
3. Verify MongoDB is connected
4. Ensure all environment variables are set

**Test Wallet Address:** `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5`

---

**Time Required:** 15-20 minutes for full test
**Difficulty:** Intermediate
**Prerequisites:** Both servers running, MongoDB connected

Happy testing! 🎉


