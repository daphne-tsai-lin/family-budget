import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// 💡 引入了離線快取模組
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBiFI05fIDz35Zk3n4nodHy9ZoYWqHOnZk",
  authDomain: "lin-buget-7972c.firebaseapp.com",
  projectId: "lin-buget-7972c",
  storageBucket: "lin-buget-7972c.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 💡 啟動離線持久化快取 (Offline Persistence)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'linbei-family-app';
export default app;
