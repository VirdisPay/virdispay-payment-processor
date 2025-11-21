# Update Admin Email to hello@virdispay.com (Production)

## Step 1: Get Your Production MongoDB URI from Render

1. Go to **https://dashboard.render.com**
2. Click on your **VirdisPay service**
3. Go to **Environment** tab (or **Environment Variables**)
4. Find the `MONGODB_URI` variable
5. **Copy the entire connection string** (it looks like `mongodb+srv://...`)

## Step 2: Run the Update Script

Run this command in PowerShell, replacing `YOUR_MONGODB_URI` with the actual URI from Render:

```powershell
node change-admin-email.js "YOUR_MONGODB_URI"
```

**Example:**
```powershell
node change-admin-email.js "mongodb+srv://hello_db_user:password@virdispay-cluster.qicmhbw.mongodb.net/virdispay-payments?appName=VirdisPay-Cluster"
```

## Step 3: Verify the Update

After running the script, you should see:
```
✅ Admin email updated from admin@virdispay.com to hello@virdispay.com
🎊 SUCCESS! You can now log in with:
   Email: hello@virdispay.com
   Password: Admin123!
```

## Step 4: Test Login

1. Go to: **https://virdispay-payment-processor.onrender.com/login**
2. Login with:
   - **Email:** `hello@virdispay.com`
   - **Password:** `Admin123!`

---

## Alternative: Update via MongoDB Atlas (If you have access)

If you have direct access to MongoDB Atlas:

1. Go to **https://cloud.mongodb.com/**
2. Navigate to your cluster → **Browse Collections**
3. Find the `users` collection
4. Find the user with email `admin@virdispay.com`
5. Edit the document and change `email` to `hello@virdispay.com`
6. Save the changes

---

## Troubleshooting

If you still get "Invalid credentials":

1. **Check the MongoDB URI** - Make sure you copied the entire string from Render
2. **Check IP Whitelist** - Your IP might need to be whitelisted in MongoDB Atlas
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address" → "Add Current IP Address"
3. **Verify the user exists** - The script will tell you if the admin user was found

