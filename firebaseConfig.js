import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1R4j2igTevAtKoCaZW5w7FWPVOCwXcW4",
  authDomain: "ai-solutions-bcbf9.firebaseapp.com",
  databaseURL: "https://ai-solutions-bcbf9-default-rtdb.firebaseio.com",
  projectId: "ai-solutions-bcbf9",
  storageBucket: "ai-solutions-bcbf9.firebasestorage.app",
  messagingSenderId: "308939235572",
  appId: "1:308939235572:web:abf66c3451e6f0c6157ea1",
  measurementId: "G-SRJPXQNX14"
};

// Initialize Firebase app if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Auth singleton
if (!global.firebaseAuth) {
  global.firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}
const auth = global.firebaseAuth;

// Initialize Firebase Analytics
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics may fail to initialize in some environments (e.g., React Native without proper setup)
  analytics = null;
}

export { auth, analytics };
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Helper function to determine user role from email
export const getUserRole = (email) => {
  if (!email || typeof email !== 'string') return 'client';
  if (email.indexOf('admin') !== -1) return 'admin';
  if (email.indexOf('staff') !== -1) return 'staff';
  return 'client';
};
