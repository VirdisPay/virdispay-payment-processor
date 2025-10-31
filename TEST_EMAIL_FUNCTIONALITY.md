# Test Email Functionality

## The Logs Show:
- ✅ Server is running
- ✅ MongoDB connected
- ✅ 7 email templates loaded
- ⚠️ No "Email service ready" message appeared

## Possible Issues:
- Email verification happens async, might have failed silently
- Need to actually test sending an email

---

## Test Email - Register a New User

### Option 1: Register via Web Interface
1. Go to: **https://virdispay-payment-processor.onrender.com**
2. Click **"Sign Up"** or **"Register"**
3. Fill in:
   - Email: **test@example.com** (use a real email you can check)
   - Password: **TestPassword123!**
   - Business name: **Test Business**
4. Click **"Register"**

**You should receive:**
- ✅ Welcome email to test@example.com
- ✅ Admin notification to hello@virdispay.com

---

### Option 2: Check Recent Logs for Email Errors

Scroll through Render logs and look for:
- `Email service configuration error` - means SendGrid connection failed
- `Email sent successfully` - means it worked!
- Any SendGrid/SMTP error messages

---

## If Emails Aren't Working:

Possible causes:
1. **API key invalid** - double-check it's correct
2. **SendGrid needs domain verification** - might need additional setup
3. **Connection issue** - network/firewall

---

**Try registering a test user first and see if you get emails! Let me know what happens.**

