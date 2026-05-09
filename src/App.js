import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Trash2, X, Send } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, collection, writeBatch, deleteField, setDoc } from 'firebase/firestore';
import { auth, db, appId } from './firebase/firebaseConfig'; 
import { getLocalTodayStr, toROCYearStr, getRoleColorStyle, generateFutureDates } from './utils/helpers';

import LoginView from './views/LoginView';
import CreateRoomView from './views/CreateRoomView';
import RoomView from './views/RoomView';
import RecordFormView from './views/RecordFormView';
import AccountsView from './views/AccountsView';
import AnalysisView from './views/AnalysisView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [view, setView] = useState('login');
  
  // 房間與資料狀態
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [records, setRecords] = useState([]);
  const [savedRooms, setSavedRooms] = useState([]);
  
  // 登入/創立表單狀態
  const [roomCode, setRoomCode] = useState('');
  const [roomPin, setRoomPin] = useState('');
  const [roomName, setRoomName] = useState('');
  const [availableLoginUsers, setAvailableLoginUsers] = useState(['老公', '老婆']);
  
  // UI 互動狀態
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);
  
  // 共用查詢與過濾
  const [homeFilterDate, setHomeFilterDate] = useState(getLocalTodayStr());
  const [searchQuery, setSearchQuery] = useState('');
  
  // 全局 Modal 狀態
  const [viewingRecord, setViewingRecord] = useState(null);
  const [crossRoomRecord, setCrossRoomRecord] = useState(null);
  const [selectedTransferRoom, setSelectedTransferRoom] = useState(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const fileInputRef = useRef(null);

  // 初始化與登入監聽
  useEffect(() => {
    try {
      const storedRooms = JSON.parse(localStorage.getItem('expenseApp_savedRooms') || '[]');
      setSavedRooms(storedRooms);
    } catch(e) {}
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 監聽房間名稱與名單
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
    } else if ((view === 'login' || view === 'create') && !roomCode) {
      setAvailableLoginUsers(['老公', '老婆']);
    }
  }, [roomCode, user, view]);

  // 監聽房間設定與記帳明細
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
  }, [user, activeRoomId, refreshTrigger]);

  // 自動清理 90 天以上舊圖片
  useEffect(() => {
    if (!records || records.length === 0 || !activeRoomId) return;
    const recordsToPrune = records.filter(r => r.photoBase64 && (Date.now() - r.timestamp > 90 * 24 * 60 * 60 * 1000));
    if (recordsToPrune.length > 0) {
      const pruneOldPhotos = async () => {
        try {
          const batch = writeBatch(db);
          recordsToPrune.forEach(r => {
            const newNote = r.note ? `${r.note} (圖檔已自動刪除)` : '(圖檔已自動刪除)';
            batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id), { photoBase64: deleteField(), note: newNote });
          });
          await batch.commit();
        } catch (e) {}
      };
      pruneOldPhotos();
    }
  }, [records, activeRoomId]);

  // === 共用業務邏輯 ===
  const handleJoinRoom = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!currentUserRole || !roomCode || !roomPin) return setErrorMsg('請填寫完整代碼、密碼並選擇身份');
    setIsLoading(true);
    try {
      const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode));
      if (!roomSnap.exists()) setErrorMsg('找不到這個房間代碼');
      else if (roomSnap.data().pin !== roomPin) setErrorMsg('房間密碼錯誤！');
      else {
        const data = roomSnap.data();
        if (!data.loginUsers?.includes(currentUserRole)) {
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { loginUsers: [...(data.loginUsers||[]), currentUserRole] });
        }
        const newRooms = [{ id: roomCode, name: data.name, pin: roomPin, role: currentUserRole }, ...savedRooms.filter(r => r.id !== roomCode)].slice(0, 5);
        localStorage.setItem('expenseApp_savedRooms', JSON.stringify(newRooms));
        setSavedRooms(newRooms);
        setActiveRoomId(roomCode); setHomeFilterDate(getLocalTodayStr()); setView('room');
      }
    } catch (err) { setErrorMsg('加入失敗'); } finally { setIsLoading(false); }
  };

  const quickJoinRoom = async (savedRoom) => {
    setIsLoading(true); setErrorMsg('');
    try {
      const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', savedRoom.id));
      if (roomSnap.exists() && roomSnap.data().pin === savedRoom.pin) {
        let role = savedRoom.role || '其他家人';
        setRoomCode(savedRoom.id); setRoomPin(savedRoom.pin); setCurrentUserRole(role);
        setActiveRoomId(savedRoom.id); setHomeFilterDate(getLocalTodayStr()); setView('room');
      } else { setErrorMsg('密碼可能已被更改'); }
    } catch(err) { setErrorMsg('連線失敗'); } finally { setIsLoading(false); }
  };

  // ⚠️ 修正點 2：補齊完整的建立房間邏輯
  const handleCreateRoom = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!roomCode || !roomPin || !roomName || !currentUserRole) { setErrorMsg('請填寫所有欄位並選擇身份'); return; }
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); return; }
    setIsLoading(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) { setErrorMsg('這個房間代碼已被使用，請換一個'); setIsLoading(false); return; }
      
      const newRoomData = {
        name: roomName, pin: roomPin, createdBy: user.uid, createdAt: Date.now(),
        loginUsers: availableLoginUsers.length > 0 ? availableLoginUsers : ['老公', '老婆'],
        categories: ['🍔 飲食', '🚗 交通', '🏠 居住', '💡 水電瓦斯', '🎉 娛樂', '👶 育兒'],
        categoryItems: { '🍔 飲食': ['早餐', '午餐', '晚餐', '飲料', '宵夜', '買菜'], '🚗 交通': ['加油', '大眾運輸', '停車', '保養'], '🏠 居住': ['房租', '日用品', '維修'], '💡 水電瓦斯': ['水費', '電費', '瓦斯費', '電信費'] },
        autoFillRules: { '早餐': '早餐店', '晚餐': '小吃店', '飲料': '飲料店', '加油': '加油站' },
        methodRules: { '麥當勞': { method: '信用卡', subMethod: '點點卡' }, '蝦皮拍賣': { method: '行動支付', subMethod: '國泰世華' } },
        incomeCategories: ['💰 薪水', '🧧 獎金', '📈 投資', '🎁 其他收入'],
        transferCategories: ['💳 信用卡繳款', '🏠 房貸繳款', '🔄 資金調度', '💰 投資理財'],
        payers: ['全家', '老公', '老婆', '恩恩', '蔚蔚'],
        paymentMethods: ['現金', '行動支付', '信用卡', '銀行', '電子票證'],
        creditCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'],
        mobilePayCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'],
        bankAccounts: ['台北富邦', '元大銀行', '中國信託'],
        electronicTickets: ['點點卡', '悠遊卡', '悠遊付錢包'],
        initialBalances: { '現金': 0 },
        promptCashSync: false,
        accountDefaultRange: '當月',
        excludedPromptPayers: []
      };
      
      await setDoc(roomRef, newRoomData);
      const newRooms = [{ id: roomCode, name: roomName, pin: roomPin, role: currentUserRole }, ...savedRooms.filter(r => r.id !== roomCode)].slice(0, 5);
      localStorage.setItem('expenseApp_savedRooms', JSON.stringify(newRooms));
      setSavedRooms(newRooms);
      setActiveRoomId(roomCode); setHomeFilterDate(getLocalTodayStr()); setView('room');
    } catch (err) { setErrorMsg('建立房間失敗：' + err.message); } finally { setIsLoading(false); }
  };

  const handleMoveRecord = async (index, direction) => {
    const displayRecs = searchQuery ? records.filter(r => r.date <= getLocalTodayStr() && JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase())) : records.filter(r => r.date === homeFilterDate);
    if (index + direction < 0 || index + direction >= displayRecs.length) return;
    const currentTx = displayRecs[index], targetTx = displayRecs[index + direction];
    let targetTs = targetTx.timestamp;
    if (currentTx.timestamp === targetTs) targetTs += (direction === -1 ? -1 : 1);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', currentTx.id), { timestamp: targetTs });
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', targetTx.id), { timestamp: currentTx.timestamp });
      await batch.commit();
    } catch (err) {}
  };

  const handleDeleteRecord = async (record) => {
    let deleteFuture = false;
    if (record.groupId) {
      if(!window.confirm('確定要刪除這筆紀錄嗎？')) return;
      deleteFuture = window.confirm('這是一筆週期紀錄。是否一併刪除此系列「未來」的所有紀錄？');
    } else { if(!window.confirm('確定要刪除這筆紀錄嗎？')) return; }
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', record.id));
      if (deleteFuture && record.groupId) {
        records.filter(r => r.groupId === record.groupId && r.date > record.date && r.id !== record.id).forEach(r => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id)));
      }
      await batch.commit();
    } catch (err) {}
  };

  const handleSendToOtherRoom = async (targetRoomId, keepFrequency) => {
    if (!crossRoomRecord) return;
    try {
      const targetRoomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', targetRoomId);
      const targetRoomSnap = await getDoc(targetRoomRef);
      if (!targetRoomSnap.exists()) return alert('目標房間不存在！');
      
      const { id, ...dataToCopy } = crossRoomRecord;
      dataToCopy.roomId = targetRoomId;
      dataToCopy.timestamp = Date.now();
      
      if (!keepFrequency) { 
          dataToCopy.frequency = '一次'; 
          dataToCopy.frequencyDays = [];
          dataToCopy.frequencyInterval = '';
          dataToCopy.groupId = null; 
      } else {
          dataToCopy.groupId = dataToCopy.frequency !== '一次' ? Date.now().toString() : null;
      }
      
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), dataToCopy);

      if (keepFrequency && dataToCopy.frequency !== '一次') {
        generateFutureDates(dataToCopy.date, dataToCopy.frequency, dataToCopy.frequencyDays, dataToCopy.frequencyInterval, dataToCopy.frequencyCustomText, 1).forEach(d => {
          batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...dataToCopy, date: d, timestamp: new Date(d + 'T07:00:00').getTime() });
        });
      }

      await batch.commit();
      alert(`✅ 成功傳送紀錄至另一個房間！`);
      setCrossRoomRecord(null); setSelectedTransferRoom(null);
    } catch (err) { alert('傳送失敗！'); }
  };

  const handleBackup = () => {
    if (!records || records.length === 0) return alert('目前沒有資料可以備份喔！');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `expense_backup_${getLocalTodayStr()}.json`);
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
  };

  const renderView = () => {
    if (!user) return <div className="p-6 text-center text-gray-500 font-extrabold flex justify-center items-center h-full"><Sparkles className="animate-bounce mr-3 text-yellow-400" size={28}/> 魔法連線中...</div>;

    switch (view) {
      case 'login':
        return <LoginView savedRooms={savedRooms} roomCode={roomCode} setRoomCode={setRoomCode} roomPin={roomPin} setRoomPin={setRoomPin} currentUserRole={currentUserRole} setCurrentUserRole={setCurrentUserRole} availableLoginUsers={availableLoginUsers} isLoading={isLoading} errorMsg={errorMsg} handleJoinRoom={handleJoinRoom} quickJoinRoom={quickJoinRoom} onSwitchToCreate={() => {setView('create'); setErrorMsg('');}} />;
      case 'create':
        return <CreateRoomView roomName={roomName} setRoomName={setRoomName} roomCode={roomCode} setRoomCode={setRoomCode} roomPin={roomPin} setRoomPin={setRoomPin} currentUserRole={currentUserRole} setCurrentUserRole={setCurrentUserRole} isLoading={isLoading} errorMsg={errorMsg} handleCreateRoom={handleCreateRoom} onBackToLogin={() => {setView('login'); setErrorMsg('');}} />;
      case 'room':
        if (showAddForm) {
          const recordToEdit = editRecordId ? records.find(r => r.id === editRecordId) : null;
          return <RecordFormView user={user} activeRoomId={activeRoomId} currentRoom={currentRoom} currentUserRole={currentUserRole} records={records} recordToEdit={recordToEdit} onClose={() => { setShowAddForm(false); setEditRecordId(null); }} setCrossRoomRecord={setCrossRoomRecord} />;
        }
        return <RoomView user={user} activeRoomId={activeRoomId} currentRoom={currentRoom} currentUserRole={currentUserRole} records={records} setRefreshTrigger={setRefreshTrigger} fileInputRef={fileInputRef} handleBackup={handleBackup} setView={setView} setActiveRoomId={setActiveRoomId} setRoomCode={setRoomCode} setRoomPin={setRoomPin} setCurrentUserRole={setCurrentUserRole} setRoomName={setRoomName} homeFilterDate={homeFilterDate} setHomeFilterDate={setHomeFilterDate} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setViewingRecord={setViewingRecord} handleMoveRecord={handleMoveRecord} onEditRecord={(record) => { setEditRecordId(record?.id); setShowAddForm(true); }} setCrossRoomRecord={setCrossRoomRecord} />;
      case 'accounts':
        return <AccountsView user={user} activeRoomId={activeRoomId} currentRoom={currentRoom} records={records} setView={setView} setViewingRecord={setViewingRecord} />;
      case 'analysis':
        return <AnalysisView records={records} currentRoom={currentRoom} setView={setView} setViewingRecord={setViewingRecord} />;
      case 'settings':
        return <SettingsView user={user} activeRoomId={activeRoomId} currentRoom={currentRoom} records={records} savedRooms={savedRooms} setView={setView} />;
      default: return null;
    }
  };

  const renderMethodText = (method, subMethod) => method ? `${method}${subMethod ? `(${subMethod})` : ''}` : null;

  return (
    <div className="min-h-screen bg-gray-100 sm:py-4 flex justify-center items-center font-sans text-[16px]">
      <div className={`w-full ${view === 'login' || view === 'create' ? 'max-w-[400px]' : 'max-w-[460px]'} min-h-screen sm:min-h-0 sm:h-[800px] bg-[#FFFBF0] flex flex-col relative sm:rounded-[2.5rem] sm:border-[6px] sm:border-gray-800 shadow-2xl overflow-hidden transition-all duration-500`}>
        <input type="file" accept=".json" style={{display: 'none'}} ref={fileInputRef} />
        
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
                <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">類型</span><span className={viewingRecord.type==='income'?'text-green-500':viewingRecord.type==='transfer'?'text-blue-500':'text-orange-500'}>{viewingRecord.type==='income'?'收入':viewingRecord.type==='transfer'?'轉帳':'支出'}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">金額</span><span className={`text-[24px] font-black ${viewingRecord.excludeFromBalance ? 'text-gray-500 line-through' : 'text-gray-800'}`}>${viewingRecord.amount.toLocaleString()}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">消費日期</span><span className="text-gray-800">{toROCYearStr(viewingRecord.date)}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">分類</span><span className="text-gray-800">{viewingRecord.category}</span></div>
                {viewingRecord.type !== 'transfer' && <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">項目</span><span className="text-gray-800">{viewingRecord.title}</span></div>}
                <div className="flex justify-between border-b border-gray-100 pb-1.5 pt-1"><span className="text-gray-400">付款人</span><span className={`${getRoleColorStyle(viewingRecord.addedByRole).lightBg} ${getRoleColorStyle(viewingRecord.addedByRole).text} px-2 py-0.5 rounded-md`}>{viewingRecord.addedByRole}</span></div>
                {viewingRecord.note && <div className="pt-1.5"><span className="text-gray-400 block mb-1">備註</span><span className="text-gray-800 block bg-gray-50 p-2.5 rounded-xl">{viewingRecord.note}</span></div>}
                {viewingRecord.photoBase64 && <div className="pt-2"><span className="text-gray-400 block mb-1">照片 (點擊放大)</span><img src={viewingRecord.photoBase64} alt="圖" className="w-full h-28 object-cover rounded-xl cursor-pointer" onClick={() => setEnlargedPhoto(viewingRecord.photoBase64)} /></div>}
              </div>
              <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => { setEditRecordId(viewingRecord.id); setViewingRecord(null); setShowAddForm(true); setView('room'); }} className="flex-1 font-bold py-2.5 rounded-xl bg-green-50 text-green-600 flex justify-center items-center"><Copy size={15} className="mr-1"/> 複製</button>
                <button onClick={() => { handleDeleteRecord(viewingRecord); setViewingRecord(null); }} className="flex-1 font-bold py-2.5 rounded-xl bg-red-50 text-red-500 flex justify-center items-center"><Trash2 size={15} className="mr-1"/> 刪除</button>
              </div>
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
  );
}
