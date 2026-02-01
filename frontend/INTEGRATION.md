# Frontend-Server Integration Guide

## Overview

The frontend has been fully integrated with the backend server and includes:

1. ✅ **Freighter Wallet Integration** - No more manual private key entry
2. ✅ **Test Data Constants** - Pre-configured identity data for easy testing
3. ✅ **Lookup Page** - Verify other users' identities
4. ✅ **Updated Dashboard** - Real-time user verification status
5. ✅ **Updated Verify Page** - Streamlined registration flow

---

## 🚀 Quick Start

### Prerequisites

- **Freighter Wallet** browser extension installed ([Download Here](https://www.freighter.app/))
- Backend server running on `http://localhost:3001`
- Node.js and npm/pnpm installed

### Installation

1. **Install dependencies:**
```bash
cd frontend
npm install
# or
pnpm install
```

2. **Set up environment variables:**
```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local if needed (default: http://localhost:3001)
```

3. **Run the development server:**
```bash
npm run dev
# or
pnpm dev
```

4. **Open your browser:**
```
http://localhost:3000
```

---

## 📁 New Files Created

### 1. **Wallet Utilities** (`lib/wallet.ts`)
Handles all Freighter wallet interactions:
- `isFreighterInstalled()` - Check if Freighter is available
- `connectWallet()` - Connect and get user's public key
- `signTransactionWithFreighter()` - Sign transactions with Freighter
- `disconnectWallet()` - Clear wallet state

### 2. **Constants** (`lib/constants.ts`)
Pre-configured test data and API endpoints:
- `TEST_IDENTITY_DATA` - Sample identity for quick testing
- `DOCUMENT_TYPES` - Document type mappings
- `GENDER_OPTIONS` - Gender option mappings
- `API_ENDPOINTS` - Backend API URLs

### 3. **Lookup Page** (`app/lookup/page.tsx`)
New page to verify other users:
- Search by Stellar address
- View verification status
- See verified attributes (age, document type, etc.)
- Display commitment hash

---

## 🎯 Page Flows

### **Verify Page** (`/verify`)

**Flow:**
1. User clicks "Connect Freighter Wallet"
2. Freighter prompts for connection approval
3. Frontend displays wallet address
4. User reviews pre-filled test data
5. User clicks "Register Identity on Chain"
6. Backend generates ZK proof and submits to blockchain
7. Success screen shows transaction hash and verified attributes

**No more:**
- ❌ Manual private key entry
- ❌ Document upload/camera capture (for now - using test data)
- ❌ Manual data entry

### **Dashboard Page** (`/dashboard`)

**Flow:**
1. User connects wallet
2. Dashboard fetches user's verification status from backend
3. Displays:
   - Verification status (Verified/Not Verified)
   - Number of documents registered
   - Verified attributes (age 18+, 21+, document type, gender)
   - Commitment hash

### **Lookup Page** (`/lookup`)

**Flow:**
1. User enters any Stellar address
2. Clicks "Search"
3. Backend checks blockchain for verification
4. Displays:
   - ✅ User verified or ❌ Not verified
   - Document count
   - Verified attributes
   - Registration timestamp
   - Commitment hash

---

## 🔑 Key Features

### **Freighter Wallet Integration**

Instead of asking for private keys, the app now uses Freighter wallet:

```typescript
// Example: Connect wallet
import { connectWallet } from "@/lib/wallet";

const result = await connectWallet();
if (result.connected) {
  console.log("Connected:", result.publicKey);
}
```

### **Test Data**

For quick testing, identity data is pre-configured:

```typescript
import { TEST_IDENTITY_DATA } from "@/lib/constants";

// Pre-filled with:
// - Name: RAJESH KUMAR
// - DOB: 15/03/1995
// - Gender: Male
// - Document: Aadhaar Card
// - Age requirement: 18+
```

### **API Integration**

All pages now communicate with the backend:

```typescript
import { API_ENDPOINTS } from "@/lib/constants";

// Register identity
await fetch(API_ENDPOINTS.REGISTER, {
  method: "POST",
  body: JSON.stringify({ userAddress, identityData })
});

// Lookup user
await fetch(`${API_ENDPOINTS.USER}/${address}`);
```

---

## 🛠️ Backend Updates

The server has been updated to work with Freighter wallet:

### **Changes:**
1. **No longer requires `userSecret`** in `/api/register` endpoint
2. Admin signs transactions on behalf of users (for free first registration)
3. Returns verified attributes in response

### **API Response Format:**

```json
{
  "success": true,
  "txnHash": "abc123...",
  "commitment": "def456...",
  "nullifier": "ghi789...",
  "docCount": 1,
  "paymentRequired": false,
  "verifiedAttributes": {
    "ageOver18": true,
    "ageOver21": true,
    "documentType": "Aadhaar Card",
    "documentTypeCode": 4,
    "genderVerified": false
  }
}
```

---

## 🧪 Testing Workflow

1. **Install Freighter Wallet:**
   - Install from [freighter.app](https://www.freighter.app/)
   - Create or import a Stellar testnet account
   - Fund it with testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator)

2. **Start Backend Server:**
```bash
cd ../server
node server.js
```

3. **Start Frontend:**
```bash
cd frontend
npm run dev
```

4. **Test Registration:**
   - Navigate to `/verify`
   - Connect Freighter wallet
   - Click "Register Identity on Chain"
   - Approve in Freighter if prompted
   - Wait for confirmation

5. **Test Dashboard:**
   - Navigate to `/dashboard`
   - Connect wallet
   - View your verification status

6. **Test Lookup:**
   - Navigate to `/lookup`
   - Enter your address (or any other verified address)
   - Click Search
   - View verification details

---

## 🔧 Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (`.env`)
```env
ADMIN_SECRET=SXXX...              # Admin Stellar secret key
CONTRACT_ID=CXXX...               # Soroban contract ID
RPC_URL=https://soroban-testnet.stellar.org:443
PORT=3001
```

---

## 📝 TODO / Future Enhancements

- [ ] Add actual document upload/OCR integration
- [ ] Implement payment flow for 2nd+ documents via Freighter
- [ ] Add transaction history to dashboard
- [ ] Add export verification certificate feature
- [ ] Add QR code sharing for verified identity
- [ ] Add multi-language support
- [ ] Add dark/light theme toggle (already has theme provider)

---

## 🐛 Troubleshooting

### **Freighter wallet not detected**
- Make sure Freighter extension is installed
- Refresh the page
- Check if Freighter is enabled for the site

### **Connection failed**
- Check backend server is running
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for errors

### **Transaction failed**
- Ensure admin account has XLM balance
- Check contract is deployed correctly
- Verify `CONTRACT_ID` in backend `.env`

### **Proof generation failed**
- Check WASM and ZKEY files exist in `circuits/` folder
- Verify test data format in `constants.ts`

---

## 📚 Additional Resources

- [Freighter API Docs](https://docs.freighter.app/)
- [Stellar SDK Docs](https://stellar.github.io/js-stellar-sdk/)
- [Soroban Docs](https://soroban.stellar.org/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## 🎉 Summary

Your frontend is now fully integrated with:
- ✅ Freighter wallet for secure key management
- ✅ Backend API for ZK proof generation
- ✅ Test data for quick testing
- ✅ Lookup functionality for verifying others
- ✅ Real-time dashboard updates

Happy testing! 🚀
