# SendGrid Domain Authentication Setup

## Why Domain Authentication?

Instead of verifying a single email address, Domain Authentication verifies your entire domain (`virdispay.com`). This:
- ✅ Allows sending from ANY email on your domain (noreply@, hello@, support@, etc.)
- ✅ Much better deliverability (less spam)
- ✅ Builds domain reputation
- ✅ More professional setup
- ✅ Enables link branding (links use your domain, not sendgrid.net)

## Step-by-Step Setup

### 1. Start Domain Authentication in SendGrid

1. Go to **SendGrid Dashboard** → **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Choose **"Domain Authentication"** (not subdomain)
4. Enter your domain: `virdispay.com`
5. Click **"Next"**

### 2. Add DNS Records

SendGrid will show you DNS records to add. You'll need to add these to your domain's DNS settings:

**Records you'll need to add:**
- **CNAME records** (3-4 records for domain authentication)
- **CNAME records** (2 records for link branding - optional but recommended)

**Where to add them:**
- Go to your domain registrar (where you bought virdispay.com)
- Or your DNS provider (Cloudflare, Route 53, etc.)
- Find DNS/DNS Management section
- Add the CNAME records SendGrid provides

### 3. Verify Domain

1. After adding DNS records, wait 5-10 minutes for DNS propagation
2. Go back to SendGrid → **"Verify"** button
3. SendGrid will check if DNS records are correct
4. If verified ✅, you're done!

### 4. Update Email Configuration (if needed)

Once domain is authenticated, you can:
- Keep using `hello@virdispay.com` as `SMTP_FROM` (already set)
- Or change to `noreply@virdispay.com` (no need to verify separately)
- Any email on your domain will work!

## Important Notes

**DNS Propagation:**
- DNS changes can take 5 minutes to 48 hours
- Usually works within 10-30 minutes
- Check DNS propagation: https://dnschecker.org

**If Verification Fails:**
- Make sure CNAME records are exactly as shown (no typos)
- Wait longer for DNS propagation
- Check that you added records to the correct domain
- Make sure TTL is set correctly (usually 3600 or auto)

## After Setup

Once verified:
- ✅ You can send from any email on virdispay.com
- ✅ Emails will be less likely to go to spam
- ✅ Better sender reputation over time
- ✅ You can remove Single Sender Verification (optional)

## Link Branding (Optional but Recommended)

While setting up Domain Authentication, SendGrid may also offer **Link Branding**:
- This rewrites tracking links to use your domain
- Makes emails look more professional
- Requires 2 additional CNAME records
- Highly recommended for production

---

**Need help?** If you're not sure where your DNS is managed, check:
- Your domain registrar's website
- Or use: https://whois.net to find your DNS provider


