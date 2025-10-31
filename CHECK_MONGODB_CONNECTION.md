# Check MongoDB Connection

## The Issue:
Registration hangs because MongoDB connection might be failing.

## Check Render Logs:

Look for these messages:
1. ✅ **"Connected to MongoDB"** - Good!
2. ❌ **"MongoDB connection error"** - Problem!
3. ❌ **"Could not connect to any servers"** - IP whitelist issue

## Common Issues:

### 1. MongoDB IP Whitelist Not Working
- Even though you added `0.0.0.0/0`, it might not be applied yet
- Wait 2-3 minutes after adding

### 2. Connection String Wrong
- Check environment variable: `MONGODB_URI`
- Should be: `mongodb+srv://hello_db_user:PA8Y825JufhQWYQw@virdispay-cluster.qicmhbw.mongodb.net/virdispay-payments?appName=VirdisPay-Cluster`

### 3. MongoDB Database User Issue
- Password might be wrong
- Username might be wrong

---

## Quick Fix - Check Logs:

Scroll through Render logs and look for MongoDB errors. What do you see?

