# Deploy to Fly.io (No GitHub Needed!)

Fly.io is perfect because it deploys directly from your local code - **NO GitHub OAuth required!**

## Step 1: Install Fly CLI

Run in PowerShell:
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

Or download from: https://fly.io/docs/hands-on/install-flyctl/

## Step 2: Sign Up

1. Go to: **https://fly.io** 
2. Sign up with **email** (not GitHub!)
3. Confirm your email

## Step 3: Login via CLI

```powershell
fly auth login
```

This will open browser - login with email/password.

## Step 4: Create Fly.io App

In your project directory:
```powershell
fly launch
```

This will:
- Create a new Fly app
- Generate `fly.toml` config file
- Ask questions about your app

**When it asks:**
- App name: `virdispay` (or your choice)
- Region: Choose closest to you
- Postgres/Redis: Say No (we'll use MongoDB separately)

## Step 5: Configure for Your App

Fly will create a `fly.toml` file. We need to update it for your Node.js app:

**Update `fly.toml`:**
```toml
app = "virdispay"
primary_region = "iad"

[build]

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

## Step 6: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build React app
RUN cd client && npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
```

## Step 7: Set Environment Variables

```powershell
fly secrets set NODE_ENV=production
fly secrets set MONGODB_URI=<your-mongodb-uri>
fly secrets set JWT_SECRET=<your-jwt-secret>
fly secrets set CLIENT_URL=https://virdispay.fly.dev
# ... add all your env variables
```

## Step 8: Deploy!

```powershell
fly deploy
```

This will:
- Build your Docker image
- Push to Fly.io
- Deploy your app
- Give you a URL: `https://virdispay.fly.dev`

## Step 9: Add MongoDB

Use MongoDB Atlas (free tier):
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update `MONGODB_URI` secret in Fly.io

---

## 🎉 That's It!

Your app will be live at: `https://your-app-name.fly.dev`

**No GitHub OAuth needed at all!** 🚀

---

## Quick Commands

```powershell
# Deploy
fly deploy

# View logs
fly logs

# Open dashboard
fly dashboard

# Set secret
fly secrets set KEY=value

# Check status
fly status
```

---

Want me to help you set this up step by step?

