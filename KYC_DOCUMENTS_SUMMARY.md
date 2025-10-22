# 📄 VirdisPay KYC Document Requirements

## ✅ Updated Document System

Your KYC system now requires comprehensive documentation for proper compliance.

---

## 📋 **Required Documents by Tier**

### **TIER 1: Personal Identity (ALL Merchants)**

#### **1. Government-Issued Photo ID** ✅
**Required:** YES  
**Examples:**
- Passport
- Driver's License
- National ID Card

**Must show:**
- Full name
- Photo
- Date of birth
- Expiration date (not expired)

---

#### **2. Proof of Address** ✅
**Required:** YES  
**Examples:**
- Utility bill (electricity, gas, water)
- Bank statement
- Council tax bill
- Rental agreement

**Must show:**
- Your name
- Current address
- Dated within last 3 months
- From recognized provider

---

### **TIER 2: Business Verification (ALL Merchants)**

#### **3. Certificate of Incorporation** ✅
**Required:** YES  
**Examples:**
- Certificate of Incorporation (UK)
- Articles of Incorporation (US)
- Business Registration Certificate
- Company House extract (UK)

**Must show:**
- Company name
- Registration number
- Date of incorporation
- Registered address

---

#### **4. Tax ID Document** ✅
**Required:** YES  
**Examples:**
- VAT Registration Certificate (UK)
- EIN Letter (US)
- Tax Registration Document
- HMRC confirmation letter

**Must show:**
- Business name
- Tax ID number
- Registration date
- Tax authority stamp

---

### **TIER 3: UK-Specific (UK Merchants Only)**

#### **5. Beneficial Ownership Declaration** ✅
**Required:** YES (UK only)  
**Legal Basis:** UK Payment Services Regulations 2017

**Must include:**
- List of ALL beneficial owners (25%+ ownership)
- Full name of each owner
- Date of birth
- Nationality
- Percentage ownership
- Residential address

**Format:** Can be:
- PSC01 form (UK Companies House)
- Signed declaration letter
- Lawyer-certified document

---

### **TIER 4: Industry-Specific**

#### **6. Cannabis License** ✅
**Required:** YES (for cannabis businesses only)  
**Examples:**
- State Cannabis License (US)
- Cultivation License
- Dispensary License
- Distribution License

**Must show:**
- License number
- Business name
- License type
- Expiration date (valid)
- Issuing authority

---

### **TIER 5: Risk-Based (High-Risk Merchants)**

#### **7. Bank Statements** ✅
**Required:** For high-risk merchants  
**Details:**
- Last 3-6 months
- Shows business activity
- Matches business name
- No suspicious transactions

**Used for:**
- Source of funds verification
- Business activity validation
- Financial stability check

---

## 🎯 **Document Requirements by Merchant Type**

### **Low-Risk CBD Merchant (UK):**
1. Government ID
2. Proof of Address
3. Certificate of Incorporation
4. Tax ID Document
5. Beneficial Ownership Declaration

**Total: 5 documents**

---

### **Medium-Risk Hemp Business (US):**
1. Government ID
2. Proof of Address
3. Certificate of Incorporation
4. Tax ID Document (EIN)
5. Bank Statement (optional)

**Total: 4-5 documents**

---

### **High-Risk Cannabis Dispensary (US/Canada):**
1. Government ID
2. Proof of Address
3. Certificate of Incorporation
4. Tax ID Document
5. Cannabis License
6. Bank Statements (3-6 months)
7. Source of Funds Documentation

**Total: 7+ documents**

---

## ⚖️ **Legal Requirements by Region**

### **🇬🇧 United Kingdom:**
- Money Laundering Regulations 2017
- Payment Services Regulations 2017
- **Beneficial Ownership Disclosure** (mandatory for PSPs)
- FCA oversight for payment services
- GDPR compliance for data

### **🇺🇸 United States:**
- Bank Secrecy Act (BSA)
- USA PATRIOT Act
- FinCEN regulations
- State-specific cannabis licensing
- IRS verification (EIN required)

---

## 📊 **Document Scoring System**

Each document has a weight contributing to verification score:

| Document | Weight | Purpose |
|----------|--------|---------|
| Government ID | 25 points | Identity verification |
| Proof of Address | 15 points | Residence verification |
| Certificate of Incorporation | 20 points | Business legitimacy |
| Tax ID Document | 15 points | Tax compliance |
| Beneficial Ownership | 10 points | UK legal requirement |
| Cannabis License | 15 points | Industry authorization |
| Bank Statement | 15 points | Financial verification |

**Verification Thresholds:**
- Low Risk: 60+ points
- Medium Risk: 75+ points
- High Risk: 85+ points

---

## 🚀 **Implementation in Your System**

**Backend:**
- ✅ `server/models/kyc.js` - Updated with all document types
- ✅ `server/services/kycService.js` - Enhanced requirements logic
- ✅ Document validation and scoring
- ✅ Risk-based requirements
- ✅ Country-specific rules (UK beneficial ownership)

**Frontend:**
- ⏳ Need to update dashboard UI to show all document upload fields
- ⏳ Document type selector
- ⏳ Upload progress indicators
- ⏳ Requirement checklist

---

## 💡 **Recommended Next Steps:**

1. **Update Dashboard UI** - Show all document upload fields
2. **Add Document Type Labels** - Clear descriptions for each
3. **Progress Indicator** - Show which docs are uploaded
4. **Admin Review Interface** - For verifying documents
5. **Auto-rejection Rules** - For expired/invalid docs

---

**Would you like me to update the Compliance dashboard UI to show all these document upload fields with clear labels and instructions?** 📋

This will make it very clear to merchants exactly what they need to upload! ✨



