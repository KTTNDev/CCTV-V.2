import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAQ0d7xu9QjdXFmw-NIH5quywZZ68VpRQc",
  authDomain: "db-rawaicctv.firebaseapp.com",
  projectId: "db-rawaicctv",
  storageBucket: "db-rawaicctv.firebasestorage.app",
  messagingSenderId: "280671694380",
  appId: "1:280671694380:web:82c8b96d0ecc1c0da8eb89",
  measurementId: "G-9GTGVXJ9X6"
};

// ป้องกันการ Initialize ซ้ำใน Next.js (Singleton Pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };