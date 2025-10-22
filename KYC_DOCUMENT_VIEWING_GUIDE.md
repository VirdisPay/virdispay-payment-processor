# 🔍 KYC Document Viewing & Verification Guide

## ✅ What's Been Implemented

### **1. Document Display in Admin Dashboard**
- All uploaded documents now visible in each KYC card
- Shows document type, filename, upload date, and verification status

### **2. Document Viewing**
- **👁️ View Button**: Click to open document in new browser tab
- Supports PDFs, images (JPEG, PNG)
- Secure access (requires admin authentication)

### **3. Document Verification**
- **✓ Verify Button**: One-click verification for each document
- Updates verification count in real-time
- Tracks which documents are verified vs. pending

---

## 🤖 Automated Sanctions Screening

### **When It Runs:**
The automated sanctions screening runs **when a merchant submits their KYC for review**.

### **What It Checks:**
1. ✅ **OFAC SDN List** (US Treasury sanctions)
   - ~11,000+ sanctioned individuals and entities
2. ✅ **UN Sanctions List** (United Nations)
   - ~34,000+ entries
3. ✅ **Total Coverage**: 45,000+ sanctioned parties

### **What Gets Screened:**
- Business name
- Owner/director names (if provided)
- Business country
- Industry type

### **Results:**
If a match is found, the admin dashboard shows:
```
⚠️ SANCTIONS MATCH
Immediate manual review required
```

The KYC status is automatically set to **"flagged"** for priority review.

### **Non-Blocking Design:**
- Sanctions screening failures don't block KYC submission
- Ensures merchant can still submit even if screening API is down
- Results are logged for manual review

---

## 📋 Admin Workflow

### **Step 1: Review KYC Submission**
1. Login to Admin Dashboard
2. Go to **KYC Review** tab
3. See all pending submissions with:
   - Business details
   - Risk level
   - Sanctions screening results
   - Uploaded documents

### **Step 2: View Documents**
1. Click **👁️ View** button on any document
2. Document opens in new tab
3. Review document contents

### **Step 3: Verify Documents**
1. If document is acceptable, click **✓ Verify**
2. Document status changes to **"✓ Verified"**
3. Verified count updates automatically

### **Step 4: Final Decision**
Once all documents are reviewed:
- Click **✅ Approve** to approve KYC
- Click **❌ Reject** to reject KYC

---

## 🎯 Document Types Supported

| Type | Description |
|------|-------------|
| **government_id** | Passport, driver's license, national ID |
| **proof_of_address** | Utility bill, bank statement |
| **business_license** | General business license |
| **certificate_incorporation** | Company registration |
| **tax_document** | Tax ID, VAT registration |
| **cannabis_license** | Cannabis/hemp specific licenses |
| **beneficial_ownership** | UBO declaration (UK requirement) |

---

## 🔒 Security Features

1. **Admin-Only Access**: Only admins can view documents
2. **Token-Based Auth**: All document requests require valid JWT token
3. **File Path Validation**: Prevents directory traversal attacks
4. **Audit Logging**: All document verifications are logged

---

## 📊 Current Status

✅ **Implemented:**
- Document upload (merchant side)
- Document display (admin side)
- Document viewing (admin side)
- Document verification (admin side)
- Sanctions screening (automatic)
- Audit logging

🎉 **Ready for production use!**

---

## 🚀 Testing

### **As Merchant:**
1. Register account
2. Complete profile
3. Upload KYC documents
4. Submit for review

### **As Admin:**
1. Login as admin
2. Go to KYC Review tab
3. Click **👁️ View** on documents
4. Click **✓ Verify** on valid documents
5. Click **✅ Approve** when satisfied

---

## 📝 Notes

- Documents are stored in `server/uploads/kyc/`
- Max file size: 5MB per document
- Allowed formats: PDF, JPEG, PNG
- Sanctions lists update automatically (cached for 24 hours)


