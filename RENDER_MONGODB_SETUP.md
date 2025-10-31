# How to Get MongoDB on Render.com

## Step 1: Add MongoDB Service

1. In your **Render dashboard**, click **"New +"**
2. Select **"MongoDB"**
3. Configure:
   - **Name:** `virdispay-mongodb` (or your choice)
   - **Database Name:** `virdispay-payments` (or your choice)
   - **Region:** Oregon (US West) - same as your web service
   - **Plan:** **Free** ($0/month) - for now

4. Click **"Create Database"**

## Step 2: Get Connection String

1. Wait for MongoDB to finish creating (~2-3 minutes)
2. Click on your MongoDB service
3. Look for **"Internal Database URL"** or **"Connection String"**
4. It looks like:
   ```
   mongodb://virdispay-mongodb:27017
   ```
   Or:
   ```
   mongodb+srv://username:password@host/database
   ```

5. **Copy this connection string**

## Step 3: Add to Environment Variables

In your **web service** → **Environment Variables**:

**Add:**
```
MONGODB_URI=<paste-the-connection-string-here>
```

For example:
```
MONGODB_URI=mongodb://virdispay-mongodb:27017/virdispay-payments
```

---

## Alternative: Use MongoDB Atlas (Free Tier)

If you prefer external MongoDB:

1. Go to: **https://www.mongodb.com/cloud/atlas**
2. Sign up for free
3. Create a free cluster
4. Get connection string
5. Add to Render environment variables

---

**After adding MongoDB, your app can connect to the database!** ✅

