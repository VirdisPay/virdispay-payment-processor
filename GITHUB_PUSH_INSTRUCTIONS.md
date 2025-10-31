# How to Push to GitHub with Flagged Account

Since your GitHub account is flagged, here are your options:

## Option 1: Use Personal Access Token (Easiest)

### Step 1: Create a Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: "VirdisPay Deployment"
4. Select scopes:
   - ✅ **repo** (full control of private repositories)
5. Click **"Generate token"**
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

### Step 2: Push Using Token
When you run `git push`, use your token as the password:
- **Username**: Your GitHub username
- **Password**: Paste your Personal Access Token

```powershell
git push origin master
```

---

## Option 2: Use SSH (More Secure)

### Step 1: Generate SSH Key (if you don't have one)
```powershell
ssh-keygen -t ed25519 -C "your-email@example.com"
```
Press Enter to accept default location.
Press Enter twice for no passphrase (or set one if you prefer).

### Step 2: Copy Your Public Key
```powershell
cat ~/.ssh/id_ed25519.pub
```
Or on Windows:
```powershell
type C:\Users\ASHLE\.ssh\id_ed25519.pub
```
**Copy the entire output**

### Step 3: Add SSH Key to GitHub
1. Go to: https://github.com/settings/keys
2. Click **"New SSH key"**
3. Paste your public key
4. Click **"Add SSH key"**

### Step 4: Switch Remote to SSH
```powershell
git remote set-url origin git@github.com:VirdisPay/virdispay-payment-processor.git
```

### Step 5: Push
```powershell
git push origin master
```

---

## Option 3: Contact GitHub Support

If your account is flagged due to a misunderstanding:
1. Go to: https://support.github.com
2. Explain the situation
3. They usually resolve flags within 24-48 hours

---

## Quick Test

After setting up, test your connection:
```powershell
# For HTTPS with token:
git ls-remote origin

# For SSH:
ssh -T git@github.com
```

---

**Recommended**: Use Option 1 (Personal Access Token) - it's the quickest solution!

