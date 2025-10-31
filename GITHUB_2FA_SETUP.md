# How to Set Up 2FA on GitHub

## Step 1: Go to Security Settings
1. Go to: **https://github.com/settings/security**
2. Or: GitHub → Your Profile (top right) → **Settings** → **Password and authentication**

## Step 2: Enable Two-Factor Authentication
1. Scroll down to **"Two-factor authentication"**
2. Click **"Enable two-factor authentication"**
3. Choose your method:
   - **Option A: Authenticator App** (Recommended - Google Authenticator, Authy, etc.)
   - **Option B: SMS** (Text message)
   - **Option C: Security Key** (Physical key like YubiKey)

## Step 3: Follow Setup
- **For Authenticator App:**
  1. Download an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
  2. Scan the QR code GitHub shows
  3. Enter the 6-digit code to verify
  4. Save your recovery codes (IMPORTANT!)

- **For SMS:**
  1. Enter your phone number
  2. Verify with code sent via text
  3. Save recovery codes

## Step 4: Save Recovery Codes
**CRITICAL:** GitHub will show you recovery codes - **SAVE THESE SOMEWHERE SAFE!**
- If you lose your phone, you'll need these codes
- Store them in a password manager or secure file

## Step 5: Done!
Once 2FA is enabled, you can contact GitHub support.

---

**About the Flag:**
You're right - the flag only affects **third-party OAuth authorization**, not normal GitHub usage. That's why you don't see any warning when logging in normally. The flag specifically blocks:
- Authorizing apps like Railway, Render, etc.
- But you can still use GitHub for code, repos, etc.

This is actually good news - your account isn't fully blocked, just OAuth access is restricted!

