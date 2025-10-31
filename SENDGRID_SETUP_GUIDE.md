# Complete SendGrid Setup Guide for VirdisPay

## Step 1: Sign Up for SendGrid (2 minutes)

1. Go to: **https://signup.sendgrid.com/**
2. Click **"Start for free"** or **"Create Account"**
3. Fill in:
   - Email address
   - Password
   - Company name: **VirdisPay**
4. Complete signup form
5. **Verify your email** (check your inbox)

---

## Step 2: Complete Account Setup

1. After login, you may be asked to verify your email
2. You might be asked about your use case - select:
   - **"I'm a Developer"** or **"I send marketing and transactional emails"**
3. Complete any additional setup steps

---

## Step 3: Create API Key (IMPORTANT!)

1. In SendGrid dashboard, click **Settings** (left sidebar)
2. Click **API Keys**
3. Click **"Create API Key"** button (top right)
4. Fill in:
   - **Name:** `VirdisPay Production`
   - **API Key Permissions:** Select **"Full Access"** (or just "Mail Send" if you prefer)
5. Click **"Create & View"**
6. **COPY THE API KEY IMMEDIATELY!** 
   - ⚠️ You'll only see it once!
   - It looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it somewhere safe!

---

## Step 4: Verify Sender Identity (Optional but Recommended)

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in:
   - **From Email Address:** `noreply@virdispay.com` (or your domain email)
   - **From Name:** `VirdisPay`
   - **Reply To:** `support@virdispay.com`
   - Company info (address, etc.)
4. Click **"Create"**
5. Check your email and verify the sender
6. This allows you to send from your domain (better deliverability)

---

## Step 5: Add to Render Environment Variables

1. Go to **Render.com** → Your Service → **Environment Variables**
2. Add these new variables:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-actual-api-key-paste-here
SMTP_FROM=noreply@virdispay.com
SUPPORT_EMAIL=support@virdispay.com
```

**Important:**
- `SMTP_USER` must be exactly: **`apikey`** (not your email!)
- `SMTP_PASS` is your SendGrid API key you copied
- `SMTP_FROM` should match your verified sender email

---

## Step 6: Redeploy

1. After adding variables, Render will auto-redeploy
2. OR click **"Manual Deploy"**
3. Wait for deployment to complete
4. Check logs for: **"Email service ready to send messages"**

---

## Step 7: Test It!

### Test via API:
1. Register a new user (or use existing)
2. Login to get auth token
3. Test email endpoint:

```powershell
# Test email (replace YOUR_TOKEN with actual token)
Invoke-RestMethod -Uri "https://virdispay-payment-processor.onrender.com/api/auth/test-email" `
    -Method POST `
    -Headers @{Authorization="Bearer YOUR_TOKEN"} `
    -ContentType "application/json"
```

### Or test by registering a new merchant:
- New merchant signups automatically trigger welcome emails
- Admin notifications are sent to your ADMIN_EMAIL

---

## 📊 SendGrid Free Tier Limits:

- ✅ **100 emails/day** (perfect for starting!)
- ✅ **40,000 emails for first 30 days**
- ✅ **No credit card required**
- ✅ **Full API access**

---

## ✅ What Will Work:

After setup:
- ✅ Welcome emails (new merchants)
- ✅ Admin notifications (new signups)
- ✅ Payment confirmations
- ✅ Password resets
- ✅ KYC status updates
- ✅ Compliance alerts

---

**Start with Step 1 - Sign up for SendGrid, then I'll help you with the rest!**

