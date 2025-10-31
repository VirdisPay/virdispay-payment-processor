# Setup Email Notifications for VirdisPay

Your app already has email functionality built in - we just need to configure SMTP!

## Email Service Options

### Option 1: Gmail (Easiest - Free) ⭐
### Option 2: SendGrid (Professional - Free Tier)
### Option 3: Mailgun (Business - Free Tier)
### Option 4: AWS SES (Enterprise - Very Cheap)

---

## 🚀 **RECOMMENDED: Gmail (Quick Setup)**

### Step 1: Enable 2FA on Gmail
1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Name it: **VirdisPay**
5. Click **Generate**
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 3: Add to Render Environment Variables

In Render → Your Service → Environment Variables, add:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=noreply@virdispay.com
SUPPORT_EMAIL=support@virdispay.com
```

Replace:
- `your-email@gmail.com` with your Gmail address
- `your-16-char-app-password` with the app password (no spaces)

---

## 🎯 **Alternative: SendGrid (More Professional)**

### Step 1: Sign Up
1. Go to: https://signup.sendgrid.com/
2. Create free account
3. Verify your email

### Step 2: Create API Key
1. Go to: Settings → API Keys
2. Click **Create API Key**
3. Name: **VirdisPay Production**
4. Permissions: **Full Access** or **Mail Send**
5. **Copy the API key** (you'll only see it once!)

### Step 3: Add to Render Environment Variables

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key-here
SMTP_FROM=noreply@virdispay.com
SUPPORT_EMAIL=support@virdispay.com
```

**Note:** `SMTP_USER` is literally `apikey` (not your email)
`SMTP_PASS` is your SendGrid API key

---

## 📧 **What Emails Will Be Sent:**

✅ Welcome email (new merchant signup)
✅ Admin notification (new merchant registered)
✅ Payment confirmation
✅ Password reset
✅ KYC status updates
✅ Compliance alerts
✅ Security alerts

---

## ✅ **After Adding Variables:**

1. **Redeploy** your service in Render (or it will auto-redeploy)
2. **Test** by registering a new user
3. **Check logs** for "Email service ready to send messages"

---

## 🧪 **Test Email Configuration:**

After adding variables, you can test via API:

```powershell
# Login first, get token, then:
Invoke-RestMethod -Uri "https://virdispay-payment-processor.onrender.com/api/auth/test-email" `
    -Method POST `
    -Headers @{Authorization="Bearer YOUR_TOKEN"} `
    -ContentType "application/json"
```

---

**Which email service do you want to use? Gmail is easiest to start with!**

