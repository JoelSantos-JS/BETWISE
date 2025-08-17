import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Em um aplicativo real, isso viria de suas variáveis de ambiente
const firebaseConfig = {
  "projectId": "betwise-dashboard-19l16",
  "appId": "1:143438143634:web:059e047733024da340c64b",
  "storageBucket": "betwise-dashboard-19l16.firebasestorage.app",
  "apiKey": "AIzaSyBTpEZ2WYDQgm-SEnRcGzVATKvTwFe3PsI",
  "authDomain": "betwise-dashboard-19l16.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "143438143634"
};

// Inicializa o Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
