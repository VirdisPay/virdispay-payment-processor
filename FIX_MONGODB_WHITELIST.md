# Fix MongoDB Atlas IP Whitelist

## The Problem:
```
MongoDB connection error: Could not connect to any servers in your MongoDB Atlas cluster. 
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

## The Solution:

### Step 1: Go to MongoDB Atlas
1. Go to: **https://cloud.mongodb.com/**
2. Login to your account
3. Click on your cluster: **VirdisPay-Cluster**

### Step 2: Add Network Access
1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` (allows all IPs)
   - OR click **"Add Current IP Address"** if you prefer
4. Click **"Confirm"**

### Step 3: Wait
- MongoDB Atlas needs 1-2 minutes to apply the change
- Your Render app should automatically reconnect

---

## After Fixing:
Your Render app should automatically reconnect to MongoDB once IP is whitelisted!

---

**Note:** For production, you might want to use Render's specific IP ranges instead of "Allow from Anywhere", but for now this works!

