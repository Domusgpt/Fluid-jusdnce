# RhythmLoop AI - Firebase & Stripe Integration Guide

This application is designed to work with Firebase (Auth, Firestore, Storage) and Stripe for payments.
Currently, the frontend runs in "Local/Demo Mode" using memory state.

## 1. Firebase Setup

### A. Create Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Create a new project "RhythmLoop AI".
3. Enable **Google Analytics** (Optional).

### B. Authentication
1. Go to **Build > Authentication**.
2. Click **Get Started**.
3. Enable **Google** provider.
4. Enable **Email/Password** provider.

### C. Firestore Database
1. Go to **Build > Firestore Database**.
2. Create Database (Start in **Production Mode**).
3. **Data Structure**:
   *   `users` (Collection)
       *   `{uid}` (Document)
           *   `credits`: number
           *   `email`: string
           *   `tier`: 'free' | 'pro'
           *   `createdAt`: timestamp

### D. Storage
1. Go to **Build > Storage**.
2. Create bucket.
3. Configure CORS to allow your domain (or localhost during dev).

---

## 2. Stripe Integration (Payments)

The easiest way is to use the **"Run Payments with Stripe"** Firebase Extension.

1. Go to **Extensions** in Firebase Console.
2. Install **"Run Payments with Stripe"**.
3. It will ask for your Stripe API keys (from [dashboard.stripe.com](https://dashboard.stripe.com)).
4. **Configuration**:
   *   Collection path: `customers`
   *   Sync products: `products`

### Workflow
1. When a user logs in, creating a document in `users/{uid}`.
2. When they click "Buy Credits", your frontend creates a Checkout Session document in `customers/{uid}/checkout_sessions`.
3. The Extension listens to this, calls Stripe, and writes a `url` field back to that document.
4. Your frontend redirects `window.location.href` to that URL.
5. On success, Stripe webhook updates the user's credit balance in Firestore.

---

## 3. Frontend Implementation Steps

1. **Install SDKs**:
   ```bash
   npm install firebase @stripe/stripe-js
   ```

2. **Initialize Firebase**:
   Create `src/services/firebase.ts`:
   ```typescript
   import { initializeApp } from "firebase/app";
   import { getAuth, GoogleAuthProvider } from "firebase/auth";
   import { getFirestore } from "firebase/firestore";

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   export const googleProvider = new GoogleAuthProvider();
   ```

3. **Update `App.tsx`**:
   *   Replace `handleLogin` mock with `signInWithPopup(auth, googleProvider)`.
   *   Add a `useEffect` to listen to `onAuthStateChanged`.
   *   Add a `useEffect` to listen to `onSnapshot` of `doc(db, 'users', user.uid)` to update `credits` in real-time.

---

## 4. Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only allow backend (Cloud Functions/Stripe) to write credits
      allow write: if false; 
    }
  }
}
```
