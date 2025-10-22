# 🔍 VirdisPay Security Audit - Additional Findings

**Date:** January 2025  
**Auditor:** AI Security Review  
**Status:** 8 RISKS IDENTIFIED

---

## ⚠️ CRITICAL RISKS (Fix Immediately)

### 1. **Hardcoded JWT Secret in Production**

**Location:** Multiple files
- `server/middleware/auth.js` line 32
- `server/routes/auth.js` line 232
- `server/index.js` line 92
- `server/routes/transactions.js` line 18
- `server/routes/merchants.js` line 18

**Problem:**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
```

**Risk:** If `JWT_SECRET` environment variable is not set, it falls back to a **publicly known default** `'your-secret-key'`. An attacker can:
- Generate valid JWT tokens
- Access any user account
- Bypass all authentication

**Impact:** **CRITICAL** - Complete authentication bypass

**Fix:**
```javascript
// NEVER use fallback secrets in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
const decoded = jwt.verify(token, JWT_SECRET);
```

---

### 2. **MongoDB Injection Vulnerability**

**Location:** Throughout the codebase
- Any route using `User.findOne({ email })`  
- Any route using `Transaction.find({})`

**Problem:**
```javascript
// Vulnerable to NoSQL injection
const user = await User.findOne({ email });
```

**Risk:** If `email` comes from user input without proper validation, an attacker can inject:
```javascript
// Attack: Send email as object instead of string
{
  "email": { "$ne": null }
}
// This returns the FIRST user in database (likely admin!)
```

**Impact:** **CRITICAL** - Authentication bypass, data exposure

**Fix:**
- Already partially protected by `express-mongo-sanitize` middleware ✅
- But should add explicit validation:
```javascript
const { email } = req.body;
if (typeof email !== 'string') {
  return res.status(400).json({ error: 'Invalid email format' });
}
const user = await User.findOne({ email: String(email) });
```

**Status:** Partially mitigated ⚠️

---

### 3. **Weak Password Hashing Salt Rounds**

**Location:** `server/models/User.js` line 170

**Problem:**
```javascript
const salt = await bcrypt.genSalt(12);
```

**Risk:** 12 rounds was secure in 2015, but with modern hardware (especially GPUs):
- 12 rounds = ~10-20 hashes/second
- Should be 14+ rounds for current standards

**Impact:** **MEDIUM** - Passwords more vulnerable to brute force if database leaks

**Recommendation:**
```javascript
const salt = await bcrypt.genSalt(14); // Better: 14-16 rounds
```

---

## 🔶 HIGH RISKS (Fix Soon)

### 4. **CORS Misconfiguration Risk**

**Location:** `server/index.js` line 28-31

**Problem:**
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
```

**Risk:** If `CLIENT_URL` is not set in production:
- Accepts requests from `http://localhost:3000` ONLY
- BUT doesn't reject other origins with credentials
- Could allow credential-stealing attacks

**Impact:** **HIGH** - CSRF attacks, session hijacking

**Fix:**
```javascript
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.WEBSITE_URL,
  'https://virdispay.com',
  'https://app.virdispay.com'
].filter(Boolean);

if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  maxAge: 86400 // 24 hours
}));
```

---

### 5. **Missing HTTP Security Headers**

**Location:** `server/index.js`

**Problem:** Using `helmet()` without configuration

**Current:**
```javascript
app.use(helmet());
```

**Risk:** Default Helmet config doesn't:
- Set strict Content-Security-Policy
- Enable HSTS (HTTP Strict Transport Security)
- Set proper frame options

**Impact:** **HIGH** - XSS, clickjacking, man-in-the-middle attacks

**Fix:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://widgets.virdispay.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.virdispay.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));
```

---

### 6. **Timing Attack on Password Comparison**

**Location:** `server/routes/auth.js` lines 210-222

**Problem:**
```javascript
const user = await User.findOne({ email }).select('+password');
if (!user) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

const isPasswordValid = await user.comparePassword(password);
if (!isPasswordValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

**Risk:** 
- If user doesn't exist: Fast response
- If user exists but wrong password: Slow response (bcrypt comparison)
- Attacker can enumerate valid email addresses by timing

**Impact:** **MEDIUM** - Email enumeration

**Fix:**
```javascript
const user = await User.findOne({ email }).select('+password');

// ALWAYS do password comparison even if user doesn't exist
const password = user ? user.password : '$2a$12$dummyHashToPreventTiming';
const isValid = await bcrypt.compare(candidatePassword, password);

if (!user || !isValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

---

## 🔷 MEDIUM RISKS (Fix When Possible)

### 7. **No Request Size Limits on File Uploads**

**Location:** KYC document uploads

**Problem:** While you have `express.json({ limit: '10mb' })`, file uploads might bypass this

**Risk:**
- DoS attack by uploading huge files
- Server storage exhaustion
- Memory overflow

**Impact:** **MEDIUM** - Denial of Service

**Fix:** Add multer limits
```javascript
const upload = multer({
  storage: multerS3(...),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific file types
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

### 8. **Missing Input Sanitization on Some Routes**

**Location:** Multiple routes don't use `express-validator`

**Problem:** Some routes accept user input without validation:
- Description fields
- Metadata fields  
- Custom fields

**Risk:**
- XSS if data is displayed without escaping
- NoSQL injection on unvalidated fields

**Impact:** **MEDIUM** - XSS, data corruption

**Fix:** Add validation to ALL routes that accept user input

---

## 📊 Risk Summary

| Risk | Severity | Impact | Status |
|------|----------|--------|--------|
| Hardcoded JWT Secret | CRITICAL | Auth Bypass | ❌ NOT FIXED |
| MongoDB Injection | CRITICAL | Data Breach | ⚠️ PARTIAL |
| Weak Password Hashing | MEDIUM | Password Cracking | ⚠️ COULD IMPROVE |
| CORS Misconfiguration | HIGH | CSRF Attacks | ❌ NOT FIXED |
| Missing Security Headers | HIGH | XSS, Clickjacking | ⚠️ PARTIAL |
| Timing Attack | MEDIUM | Email Enumeration | ❌ NOT FIXED |
| No File Size Limits | MEDIUM | DoS | ❌ NOT FIXED |
| Missing Input Sanitization | MEDIUM | XSS | ⚠️ PARTIAL |

---

## ✅ What's Already Secure

Your platform already has excellent security in several areas:

1. ✅ **API Key Authentication** - Properly implemented
2. ✅ **Domain Whitelisting** - Excellent protection
3. ✅ **Rate Limiting** - Comprehensive system
4. ✅ **KYC/AML Compliance** - Well-implemented
5. ✅ **2FA Support** - Available for users
6. ✅ **Password Hashing** - Using bcrypt (just increase rounds)
7. ✅ **JWT Expiration** - 7 days is reasonable
8. ✅ **Helmet Protection** - Enabled (needs tuning)
9. ✅ **HPP Protection** - Enabled
10. ✅ **Mongo Sanitization** - Enabled

---

## 🚀 Recommended Action Plan

### **Phase 1: Critical Fixes (Do NOW)**
1. Fix hardcoded JWT secret fallbacks
2. Add JWT_SECRET validation on startup
3. Strengthen MongoDB query validation

### **Phase 2: High Priority (This Week)**
1. Improve CORS configuration
2. Enhance Helmet security headers
3. Fix timing attack on login

### **Phase 3: Medium Priority (This Month)**
1. Add file upload size limits
2. Increase bcrypt rounds to 14
3. Add comprehensive input validation

### **Phase 4: Ongoing**
1. Regular security audits
2. Dependency updates (npm audit)
3. Penetration testing before launch

---

## 🔒 Additional Recommendations

### **Environment Variables**
Create a startup validation script:
```javascript
// server/config/validateEnv.js
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'NODE_ENV'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`FATAL ERROR: ${varName} environment variable is not set`);
    process.exit(1);
  }
});

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}
```

### **Logging & Monitoring**
- ✅ Already have winston logging
- Add: Failed login attempt monitoring
- Add: API key usage monitoring (already done!)
- Add: Suspicious activity alerts

### **Database Security**
- Enable MongoDB authentication
- Use connection string with credentials
- Limit database user permissions
- Enable audit logging

### **Deployment Security**
- Use HTTPS only (no HTTP)
- Set secure cookies: `httpOnly`, `secure`, `sameSite`
- Enable database backups
- Implement secrets rotation

---

## 📝 Security Checklist Before Launch

- [ ] All environment variables set
- [ ] JWT_SECRET is 64+ random characters
- [ ] MongoDB has authentication enabled
- [ ] HTTPS enforced on all endpoints
- [ ] CORS properly configured for production domains
- [ ] Helmet headers properly configured
- [ ] Rate limiting tested and working
- [ ] File upload limits implemented
- [ ] Input validation on all routes
- [ ] Error messages don't leak sensitive info
- [ ] Security headers verified (securityheaders.com)
- [ ] Penetration testing completed
- [ ] Bug bounty program considered

---

## 🎯 Overall Security Rating

**Current:** 🟡 **B- (Good, but needs improvements)**

**After Fixes:** 🟢 **A+ (Excellent, production-ready)**

---

**Your platform has strong security fundamentals! The identified issues are fixable and common in early-stage development. Fix the critical items and you'll have bank-grade security.**

---

**Last Updated:** January 2025  
**Next Review:** Before Production Launch



