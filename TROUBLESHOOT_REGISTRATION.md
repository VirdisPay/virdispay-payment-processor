# Troubleshoot Registration Error

## Network Error Usually Means:
1. **Server not responding** - but we know it's running
2. **CORS issue** - frontend can't connect to backend
3. **Route not found** - registration endpoint not working
4. **API URL mismatch** - frontend calling wrong URL

---

## Check 1: Is Registration Route Working?

Let's test the registration API directly:

### Test in PowerShell:
```powershell
$body = @{
    email = "test@example.com"
    password = "TestPassword123!"
    businessName = "Test Business"
    businessType = "other"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://virdispay-payment-processor.onrender.com/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**What does this return?**
- If it works: Creates user, returns response
- If error: Tells us what's wrong

---

## Check 2: View Browser Console

1. Open your browser
2. Go to https://virdispay-payment-processor.onrender.com
3. Press **F12** (Developer Tools)
4. Click **"Console"** tab
5. Try registering again
6. **What errors do you see?**

Common errors:
- `Failed to fetch` - CORS or server issue
- `404 Not Found` - wrong API URL
- `500 Internal Server Error` - server-side error

---

**Try the PowerShell test first, then check browser console. What do you see?**

