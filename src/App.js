import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db, appId } from './firebase/config';

// 假設你把各個畫面拆分到 views 資料夾後引入
// import LoginView from './views/LoginView';
// import RoomView from './views/RoomView';
// ...

export default function App() {
  // 1. 全局共用狀態 (登入、房間資訊、資料)
  const [user, setUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [view, setView] = useState('login');
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [records, setRecords] = useState([]);
  
  // 2. Firebase 監聽邏輯 (保留你原本的 useEffect)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !activeRoomId) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId);
    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) setCurrentRoom({ id: snapshot.id, ...snapshot.data() });
    });
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
    const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const roomRecords = allData.filter(exp => exp.roomId === activeRoomId).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setRecords(roomRecords);
    });
    return () => { unsubscribeRoom(); unsubscribeExpenses(); };
  }, [user, activeRoomId]);

  // 3. 畫面渲染管理 (大幅簡化結構)
  const renderView = () => {
    if (!user) return <div className="p-6 text-center text-gray-500">魔法連線中...</div>;

    switch (view) {
      case 'login':
        return <LoginView setView={setView} user={user} ... />;
      case 'create':
        return <CreateRoomView setView={setView} user={user} ... />;
      case 'room':
        return <RoomView records={records} currentRoom={currentRoom} setView={setView} ... />;
      case 'accounts':
        return <AccountsView records={records} currentRoom={currentRoom} setView={setView} ... />;
      case 'analysis':
        return <AnalysisView records={records} currentRoom={currentRoom} setView={setView} ... />;
      case 'settings':
        return <SettingsView currentRoom={currentRoom} setView={setView} ... />;
      default:
        return <LoginView setView={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 sm:py-4 flex justify-center items-center font-sans text-[16px]">
      <div className={`w-full ${view === 'login' || view === 'create' ? 'max-w-[400px]' : 'max-w-[460px]'} min-h-screen sm:min-h-0 sm:h-[800px] bg-[#FFFBF0] flex flex-col relative sm:rounded-[2.5rem] sm:border-[6px] sm:border-gray-800 shadow-2xl overflow-hidden transition-all duration-500`}>
        {renderView()}
      </div>
    </div>
  );
}
