import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBiFI05fIDz35Zk3n4nodHy9ZoYWqHOnZk",
  authDomain: "lin-buget-7972c.firebaseapp.com",
  projectId: "lin-buget-7972c",
  storageBucket: "lin-buget-7972c.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'linbei-family-app';
