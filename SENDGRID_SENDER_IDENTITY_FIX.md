# Fix SendGrid Sender Identity Error

## Error Message:
```
550 The from address does not match a verified Sender Identity. Mail cannot be sent until this error is resolved.
```

## Solution:

You need to verify your sender email address in SendGrid.

### Option 1: Verify Single Sender (Easiest)

1. Go to SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Email Address**: `noreply@virdispay.com` (or whatever you set in `SMTP_FROM`)
   - **From Name**: `VirdisPay`
   - **Reply To**: `hello@virdispay.com`
   - **Company Address**: Your business address
   - **City**: Your city
   - **State**: Your state
   - **Country**: Your country
   - **ZIP Code**: Your ZIP
4. Click **Create**
5. Check your email inbox for the verification email
6. Click the verification link in the email

### Option 2: Use Your Personal Email (Temporary)

If you don't have `noreply@virdispay.com` set up, you can temporarily use your personal email:

1. In Render, update `SMTP_FROM` to your verified email (e.g., `hello@virdispay.com`)
2. Or use a Gmail address if you verified it in SendGrid

### Option 3: Domain Authentication (Recommended for Production)

For production, you should authenticate your entire domain:

1. Go to SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions
4. This allows you to send from any email address on your domain

## After Verification:

1. Make sure `SMTP_FROM` in Render matches your verified email
2. Restart your Render service (or wait for next deploy)
3. Test registration again

## Current SMTP_FROM Value:

Check in Render environment variables - it should match your verified sender identity.

