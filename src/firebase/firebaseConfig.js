import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "你的key",
  authDomain: "你的domain",
  projectId: "你的projectId",
  storageBucket: "你的storage",
  messagingSenderId: "你的id",
  appId: "你的appId"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
