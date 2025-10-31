# Setup MongoDB Atlas (Free) for Render

Since Render doesn't have MongoDB as a managed service, we'll use MongoDB Atlas (free tier).

## Step 1: Sign Up for MongoDB Atlas

1. Go to: **https://www.mongodb.com/cloud/atlas**
2. Click **"Try Free"** or **"Sign Up"**
3. Sign up with email (or GitHub if you want)
4. Choose **"Free"** tier

## Step 2: Create a Free Cluster

1. After signup, click **"Build a Database"**
2. Select **"M0 FREE"** tier (free forever)
3. Choose:
   - **Cloud Provider:** AWS (or any)
   - **Region:** Choose closest to you (Oregon/us-west-2 is good)
   - **Cluster Name:** `your-cluster-name` (or your choice)
4. Click **"Create Cluster"**
5. Wait 3-5 minutes for cluster to be created

## Step 3: Create Database User

1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `your-username` (create your own username)
5. Password: Generate or create strong password (SAVE THIS!)
6. Database User Privileges: **"Atlas Admin"** or **"Read and write to any database"**
7. Click **"Add User"**

## Step 4: Set Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
   - Or add Render's IP ranges if you want to be more secure
4. Click **"Confirm"**

## Step 5: Get Connection String

1. Go to **"Database"** (left sidebar)
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**
5. Version: **5.5 or later**
6. Copy the connection string!

It looks like:
```
mongodb+srv://your-username:<password>@your-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Step 6: Replace Password in Connection String

In the connection string you copied, replace:
- `<password>` with the password you created in Step 3

For example:
```
mongodb+srv://your-username:your-password@your-cluster.xxxxx.mongodb.net/your-database?retryWrites=true&w=majority
```

## Step 7: Add to Render Environment Variables

In your Render web service → Environment Variables:

**Add:**
```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.xxxxx.mongodb.net/your-database?retryWrites=true&w=majority
```

(Replace with your actual connection string from Step 5!)

---

## ✅ That's It!

Your MongoDB Atlas connection string is ready to use in Render!

---

**Note:** MongoDB Atlas free tier includes:
- 512 MB storage
- Shared cluster
- Perfect for development/small apps

