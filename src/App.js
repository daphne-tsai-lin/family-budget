import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Copy, Trash2, X, Send } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, collection, writeBatch, deleteField, setDoc, query, where, deleteDoc } from 'firebase/firestore';

import { auth, db, appId } from './firebase/firebaseConfig'; 
import { AppContext, getLocalTodayStr, toROCYearStr, getRoleColorStyle, generateFutureDates } from './utils/helpers';
import { renderMethodText } from './components/SharedUI';

import LoginView from './views/LoginView';
import CreateRoomView from './views/CreateRoomView';
import RoomView from './views/RoomView';
import RecordFormView from './views/RecordFormView';
import AccountsView from './views/AccountsView';
import AnalysisView from './views/AnalysisView';
import SettingsView from './views/SettingsView';

if (typeof document !== 'undefined' && !document.getElementById('tailwind-script')) {
  const script = document.createElement('script'); script.id = 'tailwind-script'; script.src = 'https://cdn.tailwindcss.com'; document.head.appendChild(script);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [view, setView] = useState('login');
  
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [records, setRecords] = useState([]);
  const [savedRooms, setSavedRooms] = useState([]);
  
  const [roomCode, setRoomCode] = useState('');
  const [roomPin, setRoomPin] = useState('');
  const [roomName, setRoomName] = useState('');
  const [availableLoginUsers, setAvailableLoginUsers] = useState(['老公', '老婆']);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);
  const [copyRecordData, setCopyRecordData] = useState(null);
  
  const [homeFilterDate, setHomeFilterDate] = useState(getLocalTodayStr());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewingRecord, setViewingRecord] = useState(null);
  const [crossRoomRecord, setCrossRoomRecord] = useState(null);
  const [selectedTransferRoom, setSelectedTransferRoom] = useState(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);
  
  const fileInputRef = useRef(null);
  const hasPrunedPhotos = useRef(false);

  const contextValue = {
    user, currentUserRole, activeRoomId, currentRoom, records, savedRooms,
    setView, setActiveRoomId, setRoomCode, setRoomPin, setCurrentUserRole, setRoomName
  };

  useEffect(() => {
    try { const storedRooms = JSON.parse(localStorage.getItem('expenseApp_savedRooms') || '[]'); setSavedRooms(storedRooms); } catch(e) {}
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser); else signInAnonymously(auth).catch(() => setErrorMsg("連線失敗，請檢查網路"));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    window.history.pushState({ trap: true }, '');
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    const handlePopState = (e) => {
      const confirmExit = window.confirm("確定要關閉記帳本嗎？\n\n(免煩惱！您的資料都已經即時安全儲存至雲端囉 ✨ )");
      if (!confirmExit) window.history.pushState({ trap: true }, '');
      else setTimeout(() => { try { window.close(); } catch(err) {} window.history.back(); }, 100);
    };
    window.addEventListener('beforeunload', handleBeforeUnload); window.addEventListener('popstate', handlePopState);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); window.removeEventListener('popstate', handlePopState); };
  }, []);

  useEffect(() => {
    if ((view === 'login' || view === 'create') && roomCode && user) {
      const timer = setTimeout(async () => {
        try {
          const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode));
          if (snap.exists() && snap.data().loginUsers) setAvailableLoginUsers(snap.data().loginUsers);
          else setAvailableLoginUsers(['老公', '老婆']);
        } catch (e) {}
      } , 400);
      return () => clearTimeout(timer);
    } else if ((view === 'login' || view === 'create') && !roomCode) setAvailableLoginUsers(['老公', '老婆']);
  }, [roomCode, user, view]);

  useEffect(() => {
    if (!user || !activeRoomId) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId);
    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => { if (snapshot.exists()) setCurrentRoom({ id: snapshot.id, ...snapshot.data() }); });
    const expensesQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), where('roomId', '==', activeRoomId));
    
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const roomRecords = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setRecords(roomRecords);
    });
    return () => { unsubscribeRoom(); unsubscribeExpenses(); };
  }, [user, activeRoomId]);

  useEffect(() => {
    if (!records || records.length === 0 || !activeRoomId || hasPrunedPhotos.current) return;
    const recordsToPrune = records.filter(r => r.photoBase64 && (Date.now() - r.timestamp > 90 * 24 * 60 * 60 * 1000));
    if (recordsToPrune.length > 0) {
      const pruneOldPhotos = async () => {
        try {
          let batch = writeBatch(db); let count = 0;
          for (const r of recordsToPrune) {
            if (count >= 490) { await batch.commit(); batch = writeBatch(db); count = 0; }
            const newNote = r.note ? `${r.note} (圖檔已自動刪除)` : '(圖檔已自動刪除)';
            batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id), { photoBase64: deleteField(), note: newNote });
            count++;
          }
          if (count > 0) await batch.commit();
        } catch (e) {}
      };
      pruneOldPhotos();
    }
    hasPrunedPhotos.current = true;
  }, [records, activeRoomId]);

  useEffect(() => { if (view !== 'room') { setSearchQuery(''); setHomeFilterDate(getLocalTodayStr()); } }, [view]);

  const handleEditRecord = useCallback((record) => { setEditRecordId(record?.id); setCopyRecordData(null); setShowAddForm(true); }, []);
  const handleCloseForm = useCallback(() => { setShowAddForm(false); setEditRecordId(null); setCopyRecordData(null); }, []);

  const handleBackup = useCallback(() => {
    if (!records || records.length === 0) return alert('目前沒有資料可以備份喔！');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `expense_backup_${getLocalTodayStr()}.json`);
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
  }, [records]);

  // 💡 登入成功後，立刻清空輸入欄位
  const handleJoinRoom = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!currentUserRole || !roomCode || !roomPin) return setErrorMsg('請填寫代碼、密碼並選擇身份');
    setIsLoading(true);
    try {
      const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode));
      if (!roomSnap.exists()) setErrorMsg('找不到這房間');
      else if (roomSnap.data().pin !== roomPin) setErrorMsg('密碼錯誤！');
      else {
        const data = roomSnap.data();
        if (!data.loginUsers?.includes(currentUserRole)) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { loginUsers: [...(data.loginUsers||[]), currentUserRole] });
        const newRooms = [{ id: roomCode, name: data.name, pin: roomPin, role: currentUserRole }, ...savedRooms.filter(r => r.id !== roomCode)].slice(0, 5);
        localStorage.setItem('expenseApp_savedRooms', JSON.stringify(newRooms));
        setSavedRooms(newRooms); setActiveRoomId(roomCode); setHomeFilterDate(getLocalTodayStr()); setView('room');
        setRoomCode(''); setRoomPin(''); // 清空
      }
    } catch (err) { setErrorMsg('加入失敗'); } finally { setIsLoading(false); }
  };

  const quickJoinRoom = async (savedRoom) => {
    setIsLoading(true); setErrorMsg('');
    try {
      const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', savedRoom.id));
      if (roomSnap.exists() && roomSnap.data().pin === savedRoom.pin) {
        let role = savedRoom.role || '其他家人'; setCurrentUserRole(role);
        setActiveRoomId(savedRoom.id); setHomeFilterDate(getLocalTodayStr()); setView('room');
        setRoomCode(''); setRoomPin(''); // 清空
      } else { setErrorMsg('密碼可能已被更改'); }
    } catch(err) { setErrorMsg('連線失敗'); } finally { setIsLoading(false); }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!roomCode || !roomPin || !roomName || !currentUserRole) return setErrorMsg('請填完整');
    setIsLoading(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) { setErrorMsg('房間代碼已被使用'); setIsLoading(false); return; }
      const newRoomData = {
        name: roomName, pin: roomPin, createdBy: user.uid, createdAt: Date.now(), loginUsers: availableLoginUsers.length > 0 ? availableLoginUsers : ['老公', '老婆'],
        categories: ['🍔 飲食', '🚗 交通', '🏠 居住', '💡 水電瓦斯', '🎉 娛樂', '👶 育兒'],
        categoryItems: { '🍔 飲食': ['早餐', '午餐', '晚餐', '飲料', '宵夜', '買菜'], '🚗 交通': ['加油', '大眾運輸', '停車', '保養'], '🏠 居住': ['房租', '日用品', '維修'], '💡 水電瓦斯': ['水費', '電費', '瓦斯費', '電信費'] },
        autoFillRules: { '早餐': '早餐店', '晚餐': '小吃店', '飲料': '飲料店', '加油': '加油站' }, methodRules: { '麥當勞': { method: '信用卡', subMethod: '點點卡' }, '蝦皮拍賣': { method: '行動支付', subMethod: '國泰世華' } },
        incomeCategories: ['💰 薪水', '🧧 獎金', '📈 投資', '🎁 其他收入'], transferCategories: ['💳 信用卡繳款', '🏠 房貸繳款', '🔄 資金調度', '💰 投資理財'],
        payers: ['全家', '老公', '老婆', '恩恩', '蔚蔚'], paymentMethods: ['現金', '行動支付', '信用卡', '銀行', '電子票證'], creditCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'],
        mobilePayCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'], bankAccounts: ['台北富邦', '元大銀行', '中國信託'], electronicTickets: ['點點卡', '悠遊卡', '悠遊付錢包'],
        initialBalances: { '現金': 0 }, promptCashSync: false, accountDefaultRange: '當月', excludedPromptPayers: []
      };
      await setDoc(roomRef, newRoomData);
      const newRooms = [{ id: roomCode, name: roomName, pin: roomPin, role: currentUserRole }, ...savedRooms.filter(r => r.id !== roomCode)].slice(0, 5);
      localStorage.setItem('expenseApp_savedRooms', JSON.stringify(newRooms));
      setSavedRooms(newRooms); setActiveRoomId(roomCode); setHomeFilterDate(getLocalTodayStr()); setView('room');
      setRoomCode(''); setRoomPin(''); setRoomName(''); // 清空
    } catch (err) { setErrorMsg('建立失敗'); } finally { setIsLoading(false); }
  };

  // 💡 修正上下位置卡住的 Bug：時間戳完全相同時，強制給予正負偏移值錯開位置
  const handleMoveRecord = async (index, direction) => {
    const displayRecs = searchQuery ? records.filter(r => r.date <= getLocalTodayStr() && JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase())) : records.filter(r => r.date === homeFilterDate);
    if (index + direction < 0 || index + direction >= displayRecs.length) return;
    const currentTx = displayRecs[index], targetTx = displayRecs[index + direction];
    
    let newCurTs = targetTx.timestamp;
    let newTarTs = currentTx.timestamp;

    if (newCurTs === newTarTs) {
      if (direction === -1) { newCurTs += 1; newTarTs -= 1; } 
      else { newCurTs -= 1; newTarTs += 1; }
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', currentTx.id), { timestamp: newCurTs });
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', targetTx.id), { timestamp: newTarTs });
      await batch.commit();
    } catch (err) {}
  };

  const handleDeleteRecord = async (record) => {
    let deleteFuture = false;
    if (record.groupId) {
      if(!window.confirm('確定要刪除這筆紀錄嗎？')) return;
      deleteFuture = window.confirm('這是週期性紀錄，是否刪除此系列「未來」的所有紀錄？');
    } else { 
      if(!window.confirm('確定要刪除這筆紀錄嗎？')) return; 
    }
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', record.id));

      if (deleteFuture && record.groupId) {
        const futureRecords = records.filter(r => r.groupId === record.groupId && r.date > record.date && r.id !== record.id);
        if (futureRecords.length > 0) {
          let batch = writeBatch(db);
          let opsCount = 0;
          for (const r of futureRecords) {
            if (opsCount >= 490) {
              await batch.commit();
              batch = writeBatch(db);
              opsCount = 0;
            }
            batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id));
            opsCount++;
          }
          if (opsCount > 0) await batch.commit();
        }
      }
    } catch (err) { alert('刪除發生部分錯誤：' + err.message); }
  };

  const handleSendToOtherRoom = async (targetRoomId, keepFrequency) => {
    if (!crossRoomRecord) return;
    try {
      const targetRoomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', targetRoomId);
      const targetRoomSnap = await getDoc(targetRoomRef);
      if (!targetRoomSnap.exists()) return alert('目標房間不存在！');
      const tRoom = targetRoomSnap.data(); const data = crossRoomRecord; let missingOption = false;
      if (data.type === 'expense' || !data.type) {
        if (data.category && (!tRoom.categories || !tRoom.categories.includes(data.category))) missingOption = true;
        if (data.category && data.title && (!tRoom.categoryItems || !tRoom.categoryItems[data.category] || !tRoom.categoryItems[data.category].includes(data.title))) missingOption = true;
        if (data.merchant && data.merchant !== '未指定' && (!tRoom.merchants || !tRoom.merchants.includes(data.merchant))) missingOption = true;
      } else if (data.type === 'income') {
        if (data.category && (!tRoom.incomeCategories || !tRoom.incomeCategories.includes(data.category))) missingOption = true;
      } else if (data.type === 'transfer') {
        if (data.category && (!tRoom.transferCategories || !tRoom.transferCategories.includes(data.category))) missingOption = true;
      }
      if (missingOption) return alert("因無相同選項故無法傳送，請先確認目標房間具備相同的分類、項目與商家！");
      const { id, ...dataToCopy } = crossRoomRecord; dataToCopy.roomId = targetRoomId; dataToCopy.timestamp = Date.now();
      if (!keepFrequency) { dataToCopy.frequency = '一次'; dataToCopy.frequencyDays = []; dataToCopy.frequencyInterval = ''; dataToCopy.groupId = null; } 
      else dataToCopy.groupId = dataToCopy.frequency !== '一次' ? Date.now().toString() : null;
      const batch = writeBatch(db); batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), dataToCopy);
      if (keepFrequency && dataToCopy.frequency !== '一次') {
        generateFutureDates(dataToCopy.date, dataToCopy.frequency, dataToCopy.frequencyDays, dataToCopy.frequencyInterval, dataToCopy.frequencyCustomText, 1).forEach(d => {
          batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...dataToCopy, date: d, timestamp: new Date(d + 'T07:00:00').getTime() });
        });
      }
      await batch.commit(); alert(`✅ 成功傳送紀錄至另一個房間！`); setCrossRoomRecord(null); setSelectedTransferRoom(null);
    } catch (err) { alert('傳送失敗！'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) throw new Error('檔案格式不正確，需為陣列');
        if (!window.confirm(`確定要匯入 ${importedData.length} 筆資料嗎？\n(將會與目前的紀錄無縫合併)`)) return;
        setIsLoading(true); let batch = writeBatch(db); let opsCount = 0; let totalImported = 0;
        for (const record of importedData) {
          if (opsCount >= 490) { await batch.commit(); batch = writeBatch(db); opsCount = 0; }
          const { id, ...dataToCopy } = record; dataToCopy.roomId = activeRoomId; dataToCopy.groupId = null;
          if (dataToCopy.frequency !== '一次') dataToCopy.frequency = '一次';
          batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), dataToCopy); opsCount++; totalImported++;
        }
        if (opsCount > 0) await batch.commit(); alert(`✅ 成功匯入 ${totalImported} 筆資料！`);
      } catch (err) { alert('匯入失敗：' + err.message); } finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = null; }
    }; reader.readAsText(file);
  };

  const renderView = () => {
    if (!user) return <div className="p-6 text-center text-gray-500 font-extrabold flex justify-center items-center h-full"><Sparkles className="animate-bounce mr-3 text-yellow-400" size={28}/> 魔法連線中...</div>;

    switch (view) {
      case 'login': return <LoginView savedRooms={savedRooms} roomCode={roomCode} setRoomCode={setRoomCode} roomPin={roomPin} setRoomPin={setRoomPin} currentUserRole={currentUserRole} setCurrentUserRole={setCurrentUserRole} availableLoginUsers={availableLoginUsers} isLoading={isLoading} errorMsg={errorMsg} handleJoinRoom={handleJoinRoom} quickJoinRoom={quickJoinRoom} onSwitchToCreate={() => {setView('create'); setErrorMsg('');}} />;
      case 'create': return <CreateRoomView roomName={roomName} setRoomName={setRoomName} roomCode={roomCode} setRoomCode={setRoomCode} roomPin={roomPin} setRoomPin={setRoomPin} currentUserRole={currentUserRole} setCurrentUserRole={setCurrentUserRole} isLoading={isLoading} errorMsg={errorMsg} handleCreateRoom={handleCreateRoom} onBackToLogin={() => {setView('login'); setErrorMsg('');}} />;
      case 'room':
        if (showAddForm) return <RecordFormView recordToEdit={editRecordId ? records.find(r => r.id === editRecordId) : null} copyRecordData={copyRecordData} onClose={handleCloseForm} setCrossRoomRecord={setCrossRoomRecord} defaultDate={homeFilterDate} />;
        return <RoomView fileInputRef={fileInputRef} handleBackup={handleBackup} homeFilterDate={homeFilterDate} setHomeFilterDate={setHomeFilterDate} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setViewingRecord={setViewingRecord} handleMoveRecord={handleMoveRecord} onEditRecord={handleEditRecord} setCrossRoomRecord={setCrossRoomRecord} />;
      case 'accounts': return <AccountsView user={user} activeRoomId={activeRoomId} currentRoom={currentRoom} records={records} setView={setView} setViewingRecord={setViewingRecord} currentUserRole={currentUserRole} />;
      case 'analysis': return <AnalysisView records={records} currentRoom={currentRoom} setView={setView} setViewingRecord={setViewingRecord} currentUserRole={currentUserRole} />;
      case 'settings': return <SettingsView user={user} activeRoomId={activeRoomId} currentRoom={currentRoom} records={records} savedRooms={savedRooms} setView={setView} />;
      default: return null;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-100 sm:py-4 flex justify-center items-center font-sans text-[16px]">
        <div className={`w-full ${view === 'login' || view === 'create' ? 'max-w-[400px]' : 'max-w-[460px]'} min-h-screen sm:min-h-0 sm:h-[800px] bg-[#FFFBF0] flex flex-col relative sm:rounded-[2.5rem] sm:border-[6px] sm:border-gray-800 shadow-2xl overflow-hidden transition-all duration-500`}>
          <input type="file" accept=".json" style={{display: 'none'}} ref={fileInputRef} onChange={handleImport} />
          {renderView()}

          {enlargedPhoto && (
            <div className="fixed inset-0 bg-black/90 z-[150] flex flex-col items-center justify-center p-4 backdrop-blur-md" onClick={() => setEnlargedPhoto(null)}>
              <div className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full cursor-pointer"><X size={28} className="text-white" /></div>
              <img src={enlargedPhoto} alt="放大" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
            </div>
          )}

          {viewingRecord && (
            <div className="fixed inset-0 bg-black/40 z-[110] flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setViewingRecord(null)}>
              <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-5 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setViewingRecord(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full"><X size={20}/></button>
                <h3 className="font-black text-xl text-gray-800 mb-3 border-b border-gray-100 pb-2">詳細紀錄</h3>
                <div className="space-y-2 text-[15px] text-gray-600 font-bold max-h-[65vh] overflow-y-auto pr-1">
                  <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">類型</span><span className={`${viewingRecord.type==='income'?'text-green-500':viewingRecord.type==='transfer'?'text-blue-500':'text-orange-500'} font-black`}>{viewingRecord.type==='income'?'收入':viewingRecord.type==='transfer'?'轉帳':'支出'}</span></div>
                  <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">金額</span><span className={`text-[24px] font-black ${viewingRecord.excludeFromBalance ? 'text-gray-500 line-through' : 'text-gray-800'}`}>${viewingRecord.amount.toLocaleString()}</span></div>
                  <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">消費日期</span><span className="text-gray-800">{toROCYearStr(viewingRecord.date)}</span></div>
                  <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">分類</span><span className="text-gray-800">{viewingRecord.category}</span></div>
                  {viewingRecord.type !== 'transfer' && <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">項目</span><span className="text-gray-800">{viewingRecord.title}</span></div>}
                  {viewingRecord.type !== 'transfer' && viewingRecord.merchant && viewingRecord.merchant !== '未指定' && <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">商家</span><span className="text-gray-800">{viewingRecord.merchant}</span></div>}
                  <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">花費對象</span><span className="text-gray-800">{Array.isArray(viewingRecord.payer) ? viewingRecord.payer.join(', ') : viewingRecord.payer}</span></div>
                  {viewingRecord.method && viewingRecord.method !== '未指定' && <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">{viewingRecord.type === 'transfer' ? '轉出帳戶' : '付款方式'}</span><span className="text-gray-800">{renderMethodText(viewingRecord.method, viewingRecord.subMethod)}</span></div>}
                  {viewingRecord.type === 'transfer' && viewingRecord.transferToMethod && <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">轉入帳戶</span><span className="text-gray-800">{renderMethodText(viewingRecord.transferToMethod, viewingRecord.transferToSubMethod)}</span></div>}
                  <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">付款人</span><span className={`${getRoleColorStyle(viewingRecord.addedByRole).lightBg} ${getRoleColorStyle(viewingRecord.addedByRole).text} px-2 py-0.5 rounded-md`}>{viewingRecord.addedByRole}</span></div>
                  {viewingRecord.excludeFromBalance && <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">計入總覽</span><span className="text-red-500 font-bold">不計入</span></div>}
                  
                  {viewingRecord.note && (
                    <div className="pt-2">
                      <span className="text-gray-400 font-bold text-[13px] block mb-1">備註</span>
                      <div className="text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">{viewingRecord.note}</div>
                    </div>
                  )}
                  {(viewingRecord.photoBase64 || viewingRecord.photoUrl) && (
                    <div className="pt-2">
                      <span className="text-gray-400 font-bold text-[13px] block mb-1">照片 (點擊放大)</span>
                      <img src={viewingRecord.photoBase64 || viewingRecord.photoUrl} alt="圖" className="w-full h-32 object-cover rounded-xl cursor-pointer border border-gray-200 shadow-sm" onClick={() => setEnlargedPhoto(viewingRecord.photoBase64 || viewingRecord.photoUrl)} />
                    </div>
                  )}
                </div>
                
                {!viewingRecord.addedByRole || viewingRecord.addedByRole === currentUserRole ? (
                  <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                    <button onClick={() => { setCopyRecordData(viewingRecord); setViewingRecord(null); setShowAddForm(true); setView('room'); }} className="flex-1 font-bold py-2.5 rounded-xl bg-blue-50 text-blue-600 flex justify-center items-center"><Copy size={15} className="mr-1"/> 複製</button>
                    <button onClick={() => { handleDeleteRecord(viewingRecord); setViewingRecord(null); }} className="flex-1 font-bold py-2.5 rounded-xl bg-red-50 text-red-500 flex justify-center items-center"><Trash2 size={15} className="mr-1"/> 刪除</button>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-gray-100 text-center bg-gray-50 rounded-xl p-2.5 shadow-inner">
                    <span className="text-[13px] font-bold text-gray-500 flex items-center justify-center gap-1.5">🔒 僅限本人 ({viewingRecord.addedByRole}) 修改或刪除</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {crossRoomRecord && (
            <div className="fixed inset-0 bg-black/40 z-[120] flex justify-center items-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-5 shadow-2xl">
                <h3 className="font-black text-xl text-gray-800 mb-3 flex items-center gap-2"><Send size={22} className="text-blue-500"/> 傳送至其他房間</h3>
                {!selectedTransferRoom ? (
                  <>
                    <p className="text-[15px] font-bold text-gray-500 mb-4">將此筆 [{crossRoomRecord.title || crossRoomRecord.category}] ${crossRoomRecord.amount} 傳送到：</p>
                    <div className="space-y-2.5 mb-5 max-h-56 overflow-y-auto">
                      {savedRooms.filter(r => r.id !== activeRoomId).map(r => (
                        <button key={r.id} onClick={() => { if (crossRoomRecord.frequency !== '一次') setSelectedTransferRoom(r); else handleSendToOtherRoom(r.id, false); }} className="w-full text-left bg-gray-50 hover:bg-blue-50 p-3 rounded-xl font-black text-gray-700">🏠 {r.name}</button>
                      ))}
                    </div>
                    <button onClick={() => setCrossRoomRecord(null)} className="w-full bg-gray-100 text-gray-600 font-extrabold py-3 rounded-xl">取消</button>
                  </>
                ) : (
                  <div>
                    <p className="text-[15px] font-bold text-gray-600 mb-4">目標：{selectedTransferRoom.name}<br/>這是一筆週期性紀錄，如何傳送？</p>
                    <button onClick={() => handleSendToOtherRoom(selectedTransferRoom.id, true)} className="w-full bg-blue-500 text-white font-black py-3.5 rounded-xl mb-3">🔄 完整傳送 (含未來排程)</button>
                    <button onClick={() => handleSendToOtherRoom(selectedTransferRoom.id, false)} className="w-full bg-orange-100 text-orange-700 font-black py-3.5 rounded-xl mb-5">📌 僅傳送單次</button>
                    <button onClick={() => setSelectedTransferRoom(null)} className="w-full bg-gray-100 text-gray-600 font-extrabold py-3 rounded-xl">返回重選</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}
