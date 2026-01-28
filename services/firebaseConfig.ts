/**
 * Firebase Configuration for Saucy AI
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAicHTuXhQcIb-IeL-J6AmSOqZVrAZRskw",
  authDomain: "saucy-ai.firebaseapp.com",
  projectId: "saucy-ai",
  storageBucket: "saucy-ai.firebasestorage.app",
  messagingSenderId: "1014453566642",
  appId: "1:1014453566642:web:3962e84d09b876345a1dab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
// Force account selection popup every time (allows switching accounts)
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
