import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBiFI05fIDz35Zk3n4nodHy9ZoYWqHOnZk",
  authDomain: "lin-buget-7972c.firebaseapp.com",
  projectId: "lin-buget-7972c",
  storageBucket: "lin-buget-7972c.firebasestorage.app",
  messagingSenderId: "451728257561",
  appId: "1:451728257561:web:836705a26e6c879d10f088"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
