import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY || "AIzaSyBTpEZ2WYDQgm-SEnRcGzVATKvTwFe3PsI",
  authDomain: "betwise-dashboard-19l16.firebaseapp.com",
  projectId: "betwise-dashboard-19l16",
  storageBucket: "betwise-dashboard-19l16.firebasestorage.app",
  messagingSenderId: "143438143634",
  appId: "1:143438143634:web:059e047733024da340c64b"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
