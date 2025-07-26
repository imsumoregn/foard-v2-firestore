
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "foard-functional-dashboard",
  appId: "1:875482805126:web:743acd5a0c78383360f207",
  storageBucket: "foard-functional-dashboard.firebasestorage.app",
  apiKey: "AIzaSyDTsuDx0h5-1pZDgWwWh91cpDoarCdEkKc",
  authDomain: "foard-functional-dashboard.firebaseapp.com",
  messagingSenderId: "875482805126",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
