# How to Test Your API on Render

## Quick Test - Health Check

### Option 1: Browser
Just visit this URL:
```
https://virdispay-payment-processor.onrender.com/api/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "...",
  "service": "VirdisPay Payment Processor"
}
```

---

### Option 2: PowerShell (Windows)
```powershell
Invoke-RestMethod -Uri "https://virdispay-payment-processor.onrender.com/api/health"
```

---

### Option 3: curl (if you have it)
```bash
curl https://virdispay-payment-processor.onrender.com/api/health
```

---

## Test Other Endpoints

### Create User Account:
```powershell
$body = @{
    email = "test@example.com"
    password = "TestPassword123!"
    businessName = "Test Business"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://virdispay-payment-processor.onrender.com/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

---

## What This Tells You:
- ✅ **If health check works:** Server is running, routes are working
- ✅ **If you get JSON response:** API is responding correctly
- ✅ **If login screen shows:** Frontend is working, React build successful

---

**Try the health check URL first - it's the easiest test!**

