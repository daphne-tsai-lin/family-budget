/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { LogOut, AlertCircle, Settings, Trash2, X, Sparkles, Home, Plus, Pencil, BarChart, Calendar, Store, Tag, User, CreditCard, RefreshCw, Wallet, PiggyBank, PieChart as LucidePieChart, Download, Copy, Send, Landmark } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

// ==========================================
// 0. 自動載入 Tailwind CSS 魔法
// ==========================================
if (typeof document !== 'undefined' && !document.getElementById('tailwind-script')) {
  const script = document.createElement('script');
  script.id = 'tailwind-script';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// ==========================================
// 民國年轉換工具函數
// ==========================================
const toROCYearStr = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const roc = d.getFullYear() - 1911;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${roc}/${m}/${day}`; // 輸出 115/04/09
};

const toROCFullStr = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `民國 ${d.getFullYear() - 1911} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 (週${days[d.getDay()]})`;
};

// ==========================================
// 1. Firebase 初始化
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBiFI05fIDz35Zk3n4nodHy9ZoYWqHOnZk",
  authDomain: "lin-buget-7972c.firebaseapp.com",
  projectId: "lin-buget-7972c",
  storageBucket: "lin-buget-7972c.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'linbei-family-app';

// ==========================================
// 共用組件：超美客製化下拉選單
// ==========================================
const CustomDropdown = ({ label, icon: Icon, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="flex items-center gap-1.5 text-[15px] font-bold text-gray-500 mb-2 ml-1">
          {Icon && <Icon size={16} className="text-gray-400" />} {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border-2 ${isOpen ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'} p-4 rounded-[1.2rem] flex justify-between items-center outline-none transition-all shadow-sm text-left`}
      >
        <span className={`font-bold text-[16px] truncate pr-2 ${value ? 'text-gray-800' : 'text-gray-300'}`}>
          {value || placeholder}
        </span>
        <span className={`text-gray-400 text-[12px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <ul className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] max-h-60 overflow-y-auto py-2 top-full left-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {options.length === 0 && <li className="px-4 py-3 text-[15px] text-gray-400 font-bold">無選項可用</li>}
          {options.map(opt => (
            <li
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`px-4 py-3.5 text-[16px] font-bold cursor-pointer transition-colors flex items-center gap-2 ${
                value === opt ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ==========================================
// 共用組件：圓餅圖 SVG
// ==========================================
const MyCustomPieChart = ({ data, colors }) => {
  let cumulativeValue = 0;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-gray-400 text-center py-10 font-bold bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-base">無分析數據 📊</div>;

  return (
    <svg viewBox="-1 -1 2 2" className="w-56 h-56 mx-auto transform -rotate-90 drop-shadow-lg">
      {data.map((slice, i) => {
        const startPercent = cumulativeValue / total;
        cumulativeValue += slice.value;
        const endPercent = cumulativeValue / total;
        if (slice.value === total) return <circle key={i} r="1" cx="0" cy="0" fill={colors[i % colors.length]} />;
        const [startX, startY] = [Math.cos(2 * Math.PI * startPercent), Math.sin(2 * Math.PI * startPercent)];
        const [endX, endY] = [Math.cos(2 * Math.PI * endPercent), Math.sin(2 * Math.PI * endPercent)];
        const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;
        const pathData = [`M 0 0`, `L ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `Z`].join(' ');
        return <path key={i} d={pathData} fill={colors[i % colors.length]} className="transition-all duration-300 hover:opacity-80" />;
      })}
    </svg>
  );
};

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
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);
  const [crossRoomRecord, setCrossRoomRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null); // 需求 2: 檢視單筆詳細資料
  const [recordType, setRecordType] = useState('expense');
  
  const [recordAmount, setRecordAmount] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordFrequency, setRecordFrequency] = useState('一次');
  const [recordFrequencyDays, setRecordFrequencyDays] = useState([]); 
  const [recordFrequencyInterval, setRecordFrequencyInterval] = useState(''); 
  const [recordFrequencyCustomText, setRecordFrequencyCustomText] = useState('');
  const [recordPayer, setRecordPayer] = useState([]);
  const [recordCategory, setRecordCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [recordMerchant, setRecordMerchant] = useState('');
  const [recordMethod, setRecordMethod] = useState('');
  const [recordSubMethod, setRecordSubMethod] = useState('');
  const [recordNote, setRecordNote] = useState('');

  const [transferToMethod, setTransferToMethod] = useState('');
  const [transferToSubMethod, setTransferToSubMethod] = useState('');

  const [homeFilterDate, setHomeFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [settingsTab, setSettingsTab] = useState('expense');
  const [newOptionInputs, setNewOptionInputs] = useState({
    categories: '', incomeCategories: '', transferCategories: '', payers: '', paymentMethods: '', merchants: '', creditCards: '', bankAccounts: '',
    incomeAccounts: '', transferOutAccounts: '', transferInAccounts: ''
  });
  const [settingSelectedCategory, setSettingSelectedCategory] = useState('');
  const [newCategoryItemInput, setNewCategoryItemInput] = useState('');
  const [newRuleItem, setNewRuleItem] = useState('');
  const [newRuleMerchant, setNewRuleMerchant] = useState('');
  
  const [newMethodRuleMerchant, setNewMethodRuleMerchant] = useState('');
  const [newMethodRuleMethod, setNewMethodRuleMethod] = useState('');
  const [newMethodRuleSubMethod, setNewMethodRuleSubMethod] = useState('');

  const [analysisType, setAnalysisType] = useState('expense'); 
  const [analysisStartDate, setAnalysisStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [analysisEndDate, setAnalysisEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysisMenus, setAnalysisMenus] = useState([]); 
  const [analysisSubSelections, setAnalysisSubSelections] = useState({
    category: [], title: [], merchant: [], method: [], subMethod: []
  });

  const [isEditingBalances, setIsEditingBalances] = useState(false);
  const [tempBalances, setTempBalances] = useState({});

  const amountInputRef = useRef(null);

  const globalWrapperStyle = "min-h-screen bg-gray-100 sm:py-8 flex justify-center items-center font-sans text-[15px]";
  const phoneContainerStyle = "w-full max-w-[420px] min-h-screen sm:min-h-0 sm:h-[844px] bg-[#FFFBF0] flex flex-col relative sm:rounded-[3rem] sm:border-[8px] sm:border-gray-800 shadow-2xl overflow-hidden";

  // ==========================================
  // 防呆防退跳出視窗
  // ==========================================
  useEffect(() => {
    window.history.pushState({ trap: true }, '');

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '確定要關閉記帳本嗎？';
      return '確定要關閉記帳本嗎？';
    };
    
    const handlePopState = (e) => {
      const confirmExit = window.confirm("確定要關閉記帳本嗎？\n(按確定則離開，按取消則繼續使用)");
      if (!confirmExit) {
        window.history.pushState({ trap: true }, '');
      } else {
        window.close(); 
        window.history.back(); 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // ==========================================
  // Firebase 初始化 & 讀取
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { 
        setErrorMsg('無法連接資料庫！請確認已在 Firebase 打開「匿名登入」，並將網址加入「授權網域」。');
      }
    };
    initAuth();
    
    try {
      const storedRooms = JSON.parse(localStorage.getItem('expenseApp_savedRooms') || '[]');
      setSavedRooms(storedRooms);
    } catch(e) {}

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
      const roomRecords = allData
        .filter(exp => exp.roomId === activeRoomId)
        .sort((a, b) => {
          // 需求 1: 按建檔時間排序, 從舊到新 (由小到大)
          return (a.timestamp || 0) - (b.timestamp || 0);
        });
      setRecords(roomRecords);
    });
    
    return () => { unsubscribeRoom(); unsubscribeExpenses(); };
  }, [user, activeRoomId]);

  useEffect(() => {
    if (showAddForm && amountInputRef.current) {
      setTimeout(() => amountInputRef.current.focus(), 50);
    }
  }, [showAddForm, recordType]);

  useEffect(() => {
    if (recordType === 'expense' && selectedItem && currentRoom?.autoFillRules) {
      const defaultMerchant = currentRoom.autoFillRules[selectedItem];
      if (defaultMerchant) setRecordMerchant(defaultMerchant);
    }
  }, [selectedItem, recordType, currentRoom?.autoFillRules]);

  useEffect(() => {
    if (recordType === 'expense' && recordMerchant && currentRoom?.methodRules) {
      const rule = currentRoom.methodRules[recordMerchant];
      if (rule) {
        setRecordMethod(rule.method);
        setRecordSubMethod(rule.subMethod || '');
      }
    }
  }, [recordMerchant, recordType, currentRoom?.methodRules]);

  useEffect(() => { 
    setRecordFrequencyDays([]); 
    setRecordFrequencyInterval('');
    setRecordFrequencyCustomText('');
  }, [recordFrequency]);

  // ==========================================
  // 房間管理
  // ==========================================
  const saveRoomToLocal = (roomId, roomName, pin, role) => {
    try {
      const currentRooms = JSON.parse(localStorage.getItem('expenseApp_savedRooms') || '[]');
      const newRooms = [{ id: roomId, name: roomName, pin, role }, ...currentRooms.filter(r => r.id !== roomId)].slice(0, 5);
      localStorage.setItem('expenseApp_savedRooms', JSON.stringify(newRooms));
      setSavedRooms(newRooms);
    } catch(e) {}
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!roomCode || !roomPin || !roomName || !currentUserRole) { setErrorMsg('請填寫所有欄位並選擇身份'); return; }
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); return; }
    
    setIsLoading(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) { setErrorMsg('這個房間代碼已被使用，請換一個'); setIsLoading(false); return; }

      const newRoomData = {
        name: roomName, pin: roomPin, createdBy: user.uid, createdAt: Date.now(),
        categories: ['🍔 飲食', '🚗 交通', '🏠 居住', '💡 水電瓦斯', '🎉 娛樂', '👶 育兒'],
        categoryItems: {
          '🍔 飲食': ['早餐', '午餐', '晚餐', '飲料', '宵夜', '買菜'],
          '🚗 交通': ['加油', '大眾運輸', '停車', '保養'],
          '🏠 居住': ['房租', '日用品', '維修'],
          '💡 水電瓦斯': ['水費', '電費', '瓦斯費', '電信費']
        },
        autoFillRules: {
          '早餐': '早餐店', '晚餐': '小吃店', '飲料': '飲料店', '加油': '加油站'
        },
        methodRules: {
          '麥當勞': { method: '信用卡 / 行動支付', subMethod: '點點卡' },
          '蝦皮拍賣': { method: '信用卡 / 行動支付', subMethod: '國泰世華' }
        },
        incomeCategories: ['💰 薪水', '🧧 獎金', '📈 投資', '🎁 其他收入'],
        transferCategories: ['💳 信用卡繳款', '🏠 房貸繳款', '🔄 資金調度', '💰 投資理財'],
        payers: ['全家', '老公', '老婆', '恩恩', '蔚蔚'],
        paymentMethods: ['現金', '信用卡 / 行動支付', '銀行'],
        creditCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'],
        bankAccounts: ['元大銀行', '台北富邦', '中國信託'],
        merchants: ['早餐店', '小吃店', '飲料店', '加油站', '便利商店', '全聯', '家樂福', '好市多', '蝦皮拍賣'],
        incomeAccounts: ['現金', '元大銀行', '台北富邦', '中國信託'],
        transferOutAccounts: ['現金', '玉山銀行', '國泰世華', '元大銀行', '台北富邦', '中國信託'],
        transferInAccounts: ['現金', '元大銀行', '台北富邦', '中國信託'],
        initialBalances: { '現金': 0 }
      };
      await setDoc(roomRef, newRoomData);
      saveRoomToLocal(roomCode, roomName, roomPin, currentUserRole);
      setActiveRoomId(roomCode);
      setView('room');
    } catch (err) { 
      setErrorMsg('建立房間失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!currentUserRole) { setErrorMsg('請先點選「我是誰」喔！'); return; }
    if (!roomCode || !roomPin) { setErrorMsg('請輸入房間代碼和密碼'); return; }
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); return; }

    setIsLoading(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) { setErrorMsg('找不到這個房間代碼'); } 
      else {
        const data = roomSnap.data();
        if (data.pin !== roomPin) { setErrorMsg('房間密碼錯誤！'); } 
        else { 
          saveRoomToLocal(roomCode, data.name, roomPin, currentUserRole);
          setActiveRoomId(roomCode); 
          setView('room'); 
        }
      }
    } catch (err) { 
      setErrorMsg('加入房間失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const quickJoinRoom = async (savedRoom) => {
    setIsLoading(true); setErrorMsg('');
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); setIsLoading(false); return; }

    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', savedRoom.id);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists() && roomSnap.data().pin === savedRoom.pin) {
        setRoomCode(savedRoom.id); setRoomPin(savedRoom.pin); setCurrentUserRole(savedRoom.role || '其他家人');
        setActiveRoomId(savedRoom.id); setView('room');
        saveRoomToLocal(savedRoom.id, roomSnap.data().name, savedRoom.pin, savedRoom.role || '其他家人');
      } else {
        setErrorMsg(`進入「${savedRoom.name}」失敗，密碼可能已被更改`);
      }
    } catch(err) { 
      setErrorMsg('連線失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 紀錄 CRUD
  // ==========================================
  const handleSaveRecord = (e) => {
    e.preventDefault();
    if (!isFormValid || !user) return;

    try {
      const recordData = {
        roomId: activeRoomId, type: recordType, amount: Number(recordAmount),
        date: recordDate, frequency: recordFrequency || '一次', frequencyDays: recordFrequencyDays,
        frequencyInterval: recordFrequencyInterval, frequencyCustomText: recordFrequencyCustomText,
        method: recordMethod || '未指定', subMethod: recordSubMethod || '',
        note: recordNote, addedBy: user.uid, addedByRole: currentUserRole,
        timestamp: editRecordId ? records.find(r=>r.id===editRecordId)?.timestamp : Date.now()
      };

      if (recordType === 'expense') {
        recordData.payer = recordPayer; recordData.category = recordCategory;
        recordData.title = selectedItem; recordData.merchant = recordMerchant;
      } else if (recordType === 'income') {
        recordData.payer = recordPayer; recordData.category = recordCategory; recordData.title = '收入'; 
      } else if (recordType === 'transfer') {
        recordData.payer = recordPayer; recordData.category = recordCategory; recordData.title = '轉帳'; 
        recordData.transferToMethod = transferToMethod; recordData.transferToSubMethod = transferToSubMethod;
      }

      if (editRecordId) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', editRecordId), recordData)
          .catch(() => console.log('背景儲存同步中...'));
      } else {
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), recordData)
          .catch(() => console.log('背景儲存同步中...'));
      }
      
      resetForm(); 
      setShowAddForm(false);
    } catch (err) { 
      alert('儲存過程發生錯誤！'); 
    }
  };

  const resetForm = () => {
    setRecordAmount(''); 
    setRecordDate(homeFilterDate || new Date().toISOString().split('T')[0]); 
    setRecordFrequency('一次'); setRecordFrequencyDays([]); 
    setRecordFrequencyInterval(''); setRecordFrequencyCustomText('');
    setRecordPayer([]); setRecordCategory(''); setSelectedItem('');
    setRecordMerchant(''); setRecordMethod(''); setRecordSubMethod('');
    setTransferToMethod(''); setTransferToSubMethod(''); setRecordNote('');
    setEditRecordId(null);
  };

  const openEditForm = (record) => {
    setRecordType(record.type || 'expense'); 
    setRecordAmount(record.amount);
    setRecordDate(record.date || new Date(record.timestamp).toISOString().split('T')[0]);
    setRecordFrequency(record.frequency || '一次'); setRecordFrequencyDays(record.frequencyDays || []);
    setRecordFrequencyInterval(record.frequencyInterval || ''); setRecordFrequencyCustomText(record.frequencyCustomText || '');
    setRecordNote(record.note || '');
    setRecordPayer(Array.isArray(record.payer) ? record.payer : (record.payer && record.payer !== '未指定' ? [record.payer] : []));
    setRecordCategory(record.category === '未指定' ? '' : record.category);
    
    if (record.type === 'expense' || !record.type) {
      setSelectedItem(record.title); setRecordMerchant(record.merchant === '未指定' ? '' : record.merchant);
      setRecordMethod(record.method === '未指定' ? '' : record.method);
      setRecordSubMethod(record.subMethod || '');
    } else if (record.type === 'income') {
      const flatMethod = record.subMethod ? record.subMethod : (record.method === '未指定' ? '' : record.method);
      setRecordMethod(flatMethod);
      setRecordSubMethod('');
    } else if (record.type === 'transfer') {
      const flatMethodOut = record.subMethod ? record.subMethod : (record.method === '未指定' ? '' : record.method);
      const flatMethodIn = record.transferToSubMethod ? record.transferToSubMethod : (record.transferToMethod === '未指定' ? '' : record.transferToMethod);
      setRecordMethod(flatMethodOut);
      setTransferToMethod(flatMethodIn);
      setRecordSubMethod('');
      setTransferToSubMethod('');
    }
    setEditRecordId(record.id); setShowAddForm(true);
  };

  const handleCopyRecord = (record) => {
    setRecordType(record.type || 'expense'); 
    setRecordAmount(record.amount);
    setRecordDate(homeFilterDate || new Date().toISOString().split('T')[0]); 
    setRecordFrequency('一次'); setRecordFrequencyDays([]); 
    setRecordFrequencyInterval(''); setRecordFrequencyCustomText('');
    setRecordNote(record.note || '');
    setRecordPayer(Array.isArray(record.payer) ? record.payer : (record.payer && record.payer !== '未指定' ? [record.payer] : []));
    setRecordCategory(record.category === '未指定' ? '' : record.category);
    
    if (record.type === 'expense' || !record.type) {
      setSelectedItem(record.title); setRecordMerchant(record.merchant === '未指定' ? '' : record.merchant);
      setRecordMethod(record.method === '未指定' ? '' : record.method);
      setRecordSubMethod(record.subMethod || '');
    } else if (record.type === 'income') {
      const flatMethod = record.subMethod ? record.subMethod : (record.method === '未指定' ? '' : record.method);
      setRecordMethod(flatMethod);
      setRecordSubMethod('');
    } else if (record.type === 'transfer') {
      const flatMethodOut = record.subMethod ? record.subMethod : (record.method === '未指定' ? '' : record.method);
      const flatMethodIn = record.transferToSubMethod ? record.transferToSubMethod : (record.transferToMethod === '未指定' ? '' : record.transferToMethod);
      setRecordMethod(flatMethodOut);
      setTransferToMethod(flatMethodIn);
      setRecordSubMethod('');
      setTransferToSubMethod('');
    }
    setEditRecordId(null); 
    setShowAddForm(true);
  };

  const handleDeleteRecord = async (id) => {
    if(!user || !window.confirm('確定要刪除這筆紀錄嗎？')) return;
    try { 
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id)); 
    } catch (err) { 
      alert('刪除失敗：請檢查網路連線');
    }
  };

  const handleSendToOtherRoom = async (targetRoomId) => {
    if (!crossRoomRecord || !user) return;
    try {
      const { id, ...dataToCopy } = crossRoomRecord;
      dataToCopy.roomId = targetRoomId;
      dataToCopy.timestamp = Date.now();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), dataToCopy);
      alert('✅ 成功傳送紀錄至另一個房間！');
      setCrossRoomRecord(null);
    } catch (err) {
      alert('傳送失敗：請檢查網路連線');
    }
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRoom?.name}_記帳備份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    alert('✅ 雲端備份檔已成功下載！');
  };

  // ==========================================
  // 帳戶餘額
  // ==========================================
  const getBalances = () => {
    const balances = { ...currentRoom?.initialBalances };
    if (balances['現金'] === undefined) balances['現金'] = 0;
    (currentRoom?.bankAccounts || []).forEach(b => { if (balances[b] === undefined) balances[b] = 0; });
    (currentRoom?.creditCards || []).forEach(c => { if (balances[c] === undefined) balances[c] = 0; });

    const getAccName = (method, subMethod) => method === '現金' ? '現金' : subMethod;

    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'expense' || !r.type) {
        const acc = getAccName(r.method, r.subMethod);
        if (acc) balances[acc] = (balances[acc] || 0) - amt;
      } else if (r.type === 'income') {
        const acc = getAccName(r.method, r.subMethod); 
        if (acc) balances[acc] = (balances[acc] || 0) + amt;
      } else if (r.type === 'transfer') {
        const fromAcc = getAccName(r.method, r.subMethod);
        const toAcc = getAccName(r.transferToMethod, r.transferToSubMethod);
        if (fromAcc) balances[fromAcc] = (balances[fromAcc] || 0) - amt;
        if (toAcc) balances[toAcc] = (balances[toAcc] || 0) + amt;
      }
    });
    return balances;
  };

  const handleSaveBalances = async () => {
    if (!user) return;
    try {
      const updatedBalances = {};
      for (const [key, val] of Object.entries(tempBalances)) {
        updatedBalances[key] = Number(val) || 0;
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), {
        initialBalances: updatedBalances
      });
      setIsEditingBalances(false);
    } catch (err) {
      alert("儲存餘額失敗：請檢查網路連線");
    }
  };

  // ==========================================
  // 選項設定
  // ==========================================
  const handleAddOption = async (field) => {
    const value = newOptionInputs[field].trim();
    if (!value || !currentRoom || !user) return;
    try {
      const currentArray = currentRoom[field] || [];
      if (!currentArray.includes(value)) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [field]: [...currentArray, value] });
      }
      setNewOptionInputs({ ...newOptionInputs, [field]: '' });
    } catch (err) { alert('更新失敗：請檢查網路連線'); }
  };

  const handleDeleteOption = async (field, valueToRemove) => {
    if (!currentRoom || !user) return;
    try {
      const currentArray = currentRoom[field] || [];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [field]: currentArray.filter(item => item !== valueToRemove) });
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  };

  const handleAddCategoryItem = async (category) => {
    const val = newCategoryItemInput.trim();
    if (!val || !currentRoom || !category || !user) return;
    try {
      const currentCatItems = currentRoom.categoryItems || {};
      const itemsForCat = currentCatItems[category] || [];
      if (!itemsForCat.includes(val)) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [`categoryItems.${category}`]: [...itemsForCat, val] });
      }
      setNewCategoryItemInput('');
    } catch (err) { alert('更新失敗：請檢查網路連線'); }
  };

  const handleDeleteCategoryItem = async (category, valueToRemove) => {
    if (!currentRoom || !category || !user) return;
    try {
      const currentCatItems = currentRoom.categoryItems || {};
      const itemsForCat = currentCatItems[category] || [];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [`categoryItems.${category}`]: itemsForCat.filter(i => i !== valueToRemove) });
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  };

  const handleAddRule = async () => {
    if (!newRuleItem || !newRuleMerchant || !activeRoomId || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [`autoFillRules.${newRuleItem}`]: newRuleMerchant });
      setNewRuleItem(''); setNewRuleMerchant('');
    } catch (err) { alert('新增失敗：請檢查網路連線'); }
  };

  const handleDeleteRule = async (itemToRemove) => {
    if (!user) return;
    try {
      const newRules = { ...currentRoom.autoFillRules };
      delete newRules[itemToRemove];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { autoFillRules: newRules });
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  }

  const handleAddMethodRule = async () => {
    if (!newMethodRuleMerchant || !newMethodRuleMethod || !activeRoomId || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), {
        [`methodRules.${newMethodRuleMerchant}`]: { method: newMethodRuleMethod, subMethod: newMethodRuleSubMethod }
      });
      setNewMethodRuleMerchant(''); setNewMethodRuleMethod(''); setNewMethodRuleSubMethod('');
    } catch (err) { alert('新增失敗：請檢查網路連線'); }
  };

  const handleDeleteMethodRule = async (merchant) => {
    if (!user) return;
    try {
      const newRules = { ...currentRoom.methodRules };
      delete newRules[merchant];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { methodRules: newRules });
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  }

  const handleMethodSelect = (method, isTransferTo = false) => {
    if (!isTransferTo) {
      setRecordMethod(method);
      if (method === '信用卡 / 行動支付' || method === '信用卡') setRecordSubMethod(currentRoom?.creditCards?.[0] || '');
      else if (method === '銀行') setRecordSubMethod(currentRoom?.bankAccounts?.[0] || '');
      else setRecordSubMethod('');
    } else {
      setTransferToMethod(method);
      if (method === '信用卡 / 行動支付' || method === '信用卡') setTransferToSubMethod(currentRoom?.creditCards?.[0] || '');
      else if (method === '銀行') setTransferToSubMethod(currentRoom?.bankAccounts?.[0] || '');
      else setTransferToSubMethod('');
    }
  };

  const handleAnalysisTypeChange = (type) => {
    setAnalysisType(type);
    setAnalysisMenus([]);
    setAnalysisSubSelections({ category: [], title: [], merchant: [], method: [], subMethod: [] });
  };

  // ==========================================
  // 報表、統計與驗證
  // ==========================================
  const displayRecords = homeFilterDate ? records.filter(r => r.date === homeFilterDate) : records;
  const totalIncome = displayRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = displayRecords.filter(r => r.type === 'expense' || !r.type).reduce((sum, r) => sum + r.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const analysisFilteredRecords = records.filter(r => {
    const rType = r.type || 'expense';
    if (rType !== analysisType) return false; 
    if (analysisStartDate && r.date < analysisStartDate) return false;
    if (analysisEndDate && r.date > analysisEndDate) return false;

    if (analysisMenus.includes('category') && analysisSubSelections.category.length > 0 && !analysisSubSelections.category.includes(r.category)) return false;
    if (analysisMenus.includes('title') && analysisSubSelections.title.length > 0 && !analysisSubSelections.title.includes(r.title)) return false;
    if (analysisMenus.includes('merchant') && analysisSubSelections.merchant.length > 0 && !analysisSubSelections.merchant.includes(r.merchant)) return false;
    
    if (analysisMenus.includes('method') && analysisSubSelections.method.length > 0) {
      if (analysisType === 'expense') {
         if (!analysisSubSelections.method.includes(r.method)) return false;
         if (['信用卡 / 行動支付', '信用卡', '銀行'].includes(r.method)) {
            if (analysisSubSelections.subMethod.length > 0 && !analysisSubSelections.subMethod.includes(r.subMethod)) {
               return false;
            }
         }
      } else {
         const actualMethod = r.subMethod ? r.subMethod : (r.method || '無方式');
         if (!analysisSubSelections.method.includes(actualMethod)) return false;
      }
    }
    return true;
  });

  const analysisGroupedData = {};
  analysisFilteredRecords.forEach(r => {
    let keyParts = [];
    if (analysisMenus.includes('category')) keyParts.push(r.category || '未分類');
    if (analysisMenus.includes('title')) keyParts.push(r.title || '無項目');
    if (analysisMenus.includes('merchant')) keyParts.push(r.merchant || '無商家');
    if (analysisMenus.includes('method')) {
      if (analysisType === 'expense') {
        keyParts.push(r.method || '無方式');
        if (r.subMethod) keyParts.push(`(${r.subMethod})`);
      } else {
        const actualMethod = r.subMethod ? r.subMethod : (r.method || '無方式');
        keyParts.push(actualMethod);
      }
    }
    const key = keyParts.length > 0 ? keyParts.join(' - ') : (r.category || '未分類');
    if (!analysisGroupedData[key]) analysisGroupedData[key] = 0;
    analysisGroupedData[key] += r.amount;
  });

  const chartData = Object.keys(analysisGroupedData).map(key => ({ label: key, value: analysisGroupedData[key] })).sort((a, b) => b.value - a.value);
  const chartColors = ['#F472B6', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F87171', '#38BDF8', '#4ADE80', '#FCD34D', '#C084FC'];

  let isFormValid = false;
  if (recordAmount && recordDate && recordPayer.length > 0) {
    if (recordType === 'expense') {
      isFormValid = recordCategory && selectedItem && recordMethod;
      if (recordMethod === '信用卡 / 行動支付' && !recordSubMethod) isFormValid = false;
      if (recordMethod === '銀行' && !recordSubMethod) isFormValid = false;
      if (recordFrequency === '每週' && recordFrequencyDays.length === 0) isFormValid = false;
      if (recordFrequency === '每月' && recordFrequencyDays.length === 0) isFormValid = false;
      if (recordFrequency === '區間' && !recordFrequencyInterval) isFormValid = false;
      if (recordFrequency === '區間' && recordFrequencyInterval === '自訂' && !recordFrequencyCustomText) isFormValid = false;
    } else if (recordType === 'income') {
      isFormValid = recordCategory && recordMethod;
    } else if (recordType === 'transfer') {
      isFormValid = recordCategory && recordMethod && transferToMethod;
    }
  }

  const PillGroupMulti = ({ label, icon: Icon, options, values = [], onChange, isPayer = false }) => {
    const hasFamily = values.includes('全家');
    const hasIndividuals = values.some(v => v !== '全家');
    const handleToggle = (opt) => {
      let newVals = [...values];
      if (isPayer) {
        if (opt === '全家') { if (hasFamily) newVals = []; else newVals = ['全家']; } 
        else {
          if (hasFamily) newVals = [opt]; 
          else { if (newVals.includes(opt)) newVals = newVals.filter(v => v !== opt); else newVals.push(opt); }
        }
      } else {
        if (newVals.includes(opt)) newVals = newVals.filter(v => v !== opt); else newVals.push(opt);
      }
      onChange(newVals);
    };

    return (
      <div className="mb-5 w-full">
        {label && <label className="flex items-center gap-1.5 text-[15px] font-bold text-gray-500 mb-2.5 ml-1">{Icon && <Icon size={16} className="text-gray-400" />} {label}</label>}
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = values.includes(opt);
            const isDisabled = isPayer && ((opt === '全家' && hasIndividuals) || (opt !== '全家' && hasFamily));
            return (
              <button key={opt} type="button" onClick={() => handleToggle(opt)} className={`px-4 py-2.5 rounded-2xl text-[15px] font-bold transition-all duration-200 ${isSelected ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : isDisabled ? 'bg-gray-100 text-gray-300 border-2 border-transparent cursor-not-allowed opacity-60' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-100 shadow-sm'}`}>{opt}</button>
            )
          })}
        </div>
      </div>
    );
  };

  const toggleFrequencyDay = (d) => {
    if (recordFrequencyDays.includes(d)) setRecordFrequencyDays(recordFrequencyDays.filter(v => v !== d));
    else setRecordFrequencyDays([...recordFrequencyDays, d]);
  };

  // --- 如果尚未連線成功 ---
  if (!user) {
    return (
      <div className={globalWrapperStyle}>
        <div className={`${phoneContainerStyle} justify-center items-center p-6`}>
          {errorMsg ? (
            <div className="bg-red-50 text-red-500 font-bold p-6 rounded-[2rem] flex flex-col items-center gap-4 border border-red-100 shadow-sm text-center w-full">
              <AlertCircle size={40} />
              <p className="text-[16px] leading-relaxed whitespace-pre-line">{errorMsg}</p>
              <button onClick={() => window.location.reload()} className="mt-2 bg-white text-red-500 px-6 py-2.5 rounded-xl text-[15px] shadow-sm border border-red-100 transition hover:bg-red-50">重新整理</button>
            </div>
          ) : (
            <div className="text-gray-500 font-extrabold text-xl flex items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <Sparkles className="animate-bounce mr-3 text-yellow-400" size={28}/> 魔法連線中...
            </div>
          )}
        </div>
      </div>
    );
  }

  let content = null;

  // --- 登入畫面 ---
  if (view === 'login') {
    content = (
      <div className="flex flex-col items-center justify-center flex-1 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-col items-center mb-8 w-full mt-4">
          <div className="bg-gradient-to-tr from-[#FFF4B8] to-[#FFD580] p-6 rounded-[2rem] mb-6 shadow-md"><Sparkles size={48} className="text-white drop-shadow-sm" strokeWidth={2.5} /></div>
          <h1 className="text-2xl font-black text-gray-800 mb-2 flex items-center gap-2">❤️ 林北一家 🏠</h1>
          <p className="text-[15px] font-bold text-gray-500">林北的小財庫</p>
        </div>

        {savedRooms.length > 0 && (
          <div className="w-full mb-8 bg-gray-50 p-5 rounded-[2rem] border-2 border-gray-100 shadow-sm">
            <p className="text-[14px] font-bold text-gray-500 mb-3 text-center">👇 快速切換最近房間</p>
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {savedRooms.map(r => (
                <button key={r.id} type="button" onClick={() => quickJoinRoom(r)} className="w-full bg-white border-2 border-transparent p-4 rounded-[1.5rem] hover:border-blue-300 hover:shadow-md transition flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2.5 rounded-xl text-orange-500"><Home size={20} /></div>
                    <span className="font-extrabold text-gray-700 text-[16px]">{r.name}</span>
                  </div>
                  <span className="text-[12px] font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg">{r.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && <div className="w-full bg-red-50 text-red-500 font-bold p-4 rounded-2xl mb-4 flex items-center justify-center gap-2 text-sm shadow-sm border border-red-100"><AlertCircle size={18} /> {errorMsg}</div>}
        
        <form onSubmit={handleJoinRoom} className="space-y-6 w-full bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div>
            <label className="block text-[14px] font-bold text-gray-500 mb-2 ml-1">家庭通關代碼</label>
            <input type="text" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 text-[16px] transition" placeholder="例如：linbei" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-500 mb-2 ml-1">房間密碼 (初次建立請自訂)</label>
            <input type="password" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 text-[16px] transition" placeholder="輸入密碼" value={roomPin} onChange={(e) => setRoomPin(e.target.value)} />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-500 mb-2 ml-1">我是誰？</label>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setCurrentUserRole('老公')} className={`p-4 rounded-[1.5rem] font-bold text-lg flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老公' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👨 老公</button>
              <button type="button" onClick={() => setCurrentUserRole('老婆')} className={`p-4 rounded-[1.5rem] font-bold text-lg flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老婆' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👩 老婆</button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-gray-800 text-white font-extrabold text-xl p-4 rounded-[1.5rem] hover:bg-gray-700 shadow-md transition active:scale-95 disabled:opacity-50 mt-4">{isLoading ? '處理中...' : '開啟小財庫 🚀'}</button>
        </form>
        <div className="mt-8 text-center w-full pb-8">
          <button onClick={() => {setView('create'); setErrorMsg('');}} className="text-gray-500 text-[15px] font-bold hover:text-gray-700 transition bg-white px-6 py-3.5 rounded-full shadow-sm border border-gray-200">💡 建立新的家庭房間</button>
        </div>
      </div>
    );
  }
  // --- 建立房間畫面 ---
  else if (view === 'create') {
    content = (
      <div className="flex flex-col items-center justify-center flex-1 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
         <div className="flex flex-col items-center mb-8 w-full">
          <div className="bg-gradient-to-tr from-[#A7F3D0] to-[#34D399] p-6 rounded-[2rem] mb-6 shadow-md"><Home size={48} className="text-white drop-shadow-sm" strokeWidth={2.5} /></div>
          <h1 className="text-2xl font-black text-gray-800 mb-1">建立新家庭 ✨</h1>
        </div>
        {errorMsg && <div className="w-full bg-red-50 text-red-500 font-bold p-4 rounded-2xl mb-4 flex items-center justify-center gap-2 text-sm shadow-sm border border-red-100"><AlertCircle size={18} /> {errorMsg}</div>}
        <form onSubmit={handleCreateRoom} className="space-y-5 w-full bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div>
            <label className="block text-[15px] font-bold text-gray-500 mb-2 ml-1">我是...</label>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setCurrentUserRole('老公')} className={`p-4 rounded-[1.5rem] font-bold text-xl flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老公' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👨 老公</button>
              <button type="button" onClick={() => setCurrentUserRole('老婆')} className={`p-4 rounded-[1.5rem] font-bold text-xl flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老婆' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👩 老婆</button>
            </div>
          </div>
          <input type="text" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[16px] transition" placeholder="🏠 房間名稱 (例: 林北小財庫)" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          <input type="text" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[16px] transition" placeholder="🎀 自訂通關代碼 (需唯一)" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          <input type="password" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[16px] transition" placeholder="🔑 設定房間密碼" value={roomPin} onChange={(e) => setRoomPin(e.target.value)} />
          <button type="submit" disabled={isLoading} className="w-full bg-green-500 text-white font-extrabold text-xl p-4 rounded-[1.5rem] hover:bg-green-600 shadow-md transition active:scale-95 mt-4">{isLoading ? '處理中...' : '建立並進入 🚀'}</button>
        </form>
        <div className="mt-8 text-center w-full pb-8">
           <button onClick={() => {setView('login'); setErrorMsg('');}} className="text-gray-500 text-[15px] font-bold hover:text-gray-700 transition bg-white px-6 py-3.5 rounded-full shadow-sm border border-gray-200">返回登入</button>
        </div>
      </div>
    );
  }
  // --- 畫面：帳戶總覽 ---
  else if (view === 'accounts') {
    const balances = getBalances();
    const cashBal = balances['現金'] || 0;
    const banks = currentRoom?.bankAccounts || [];
    const bankTotal = banks.reduce((sum, b) => sum + (balances[b] || 0), 0);
    const ccs = currentRoom?.creditCards || [];
    const ccTotal = ccs.reduce((sum, c) => sum + (balances[c] || 0), 0);
    const netWorth = cashBal + bankTotal + ccTotal;

    content = (
      <>
        <header className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-6 shadow-md shrink-0 z-10 rounded-b-[2rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-md"><Landmark size={28} className="text-white/80"/> 帳戶總覽</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('room')} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition text-[15px] font-bold backdrop-blur-sm">返回</button>
              {isEditingBalances ? (
                <button onClick={handleSaveBalances} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition text-[15px] font-bold backdrop-blur-sm">儲存</button>
              ) : (
                <button onClick={() => { setTempBalances(currentRoom?.initialBalances || {}); setIsEditingBalances(true); }} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition text-[14px] font-bold backdrop-blur-sm">初始餘額</button>
              )}
            </div>
          </div>
        </header>

        <main className="p-5 space-y-6 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 text-center shadow-sm relative overflow-hidden">
             <div className="absolute -right-6 -top-6 bg-indigo-50 w-24 h-24 rounded-full opacity-50"></div>
             <p className="text-indigo-400 font-extrabold text-[15px] mb-2 relative z-10">💰 總資產淨值</p>
             <p className={`text-[42px] font-black relative z-10 ${netWorth < 0 ? 'text-red-500' : 'text-indigo-700'}`}>${netWorth.toLocaleString()}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-emerald-50">
             <h2 className="font-bold text-[18px] text-gray-700 mb-5 flex items-center gap-2"><Wallet size={20} className="text-emerald-500"/> 現金餘額</h2>
             <div className="flex justify-between items-center bg-gray-50 p-4 rounded-[1.2rem] border border-gray-100">
                <span className="font-bold text-gray-600 text-[16px]">現金</span>
                {isEditingBalances ? (
                   <input type="number" className="w-28 text-right border-2 border-emerald-200 focus:border-emerald-400 p-2 rounded-[1rem] font-bold text-[16px] outline-none transition" value={tempBalances['現金'] || ''} onChange={e => setTempBalances({...tempBalances, '現金': e.target.value})} placeholder="0" />
                ) : (
                   <span className={`font-black text-[20px] ${cashBal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${cashBal.toLocaleString()}</span>
                )}
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50">
             <div className="flex justify-between items-end mb-5">
               <h2 className="font-bold text-[18px] text-gray-700 flex items-center gap-2"><Landmark size={20} className="text-blue-500"/> 銀行餘額</h2>
               <span className="text-[14px] font-extrabold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-xl">小計: ${bankTotal.toLocaleString()}</span>
             </div>
             <div className="space-y-3">
               {banks.length === 0 && <p className="text-gray-400 text-[15px] font-bold text-center py-5 bg-gray-50 rounded-[1.5rem]">無銀行帳戶，請至設定新增</p>}
               {banks.map(b => {
                 const bal = balances[b] || 0;
                 return (
                   <div key={b} className="flex justify-between items-center bg-gray-50 p-4 rounded-[1.2rem] border border-gray-100">
                      <span className="font-bold text-gray-600 text-[16px] truncate pr-2">{b}</span>
                      {isEditingBalances ? (
                         <input type="number" className="w-28 text-right border-2 border-blue-200 focus:border-blue-400 p-2 rounded-[1rem] font-bold text-[16px] outline-none transition" value={tempBalances[b] || ''} onChange={e => setTempBalances({...tempBalances, [b]: e.target.value})} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[18px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-orange-50">
             <div className="flex justify-between items-end mb-5">
               <h2 className="font-bold text-[18px] text-gray-700 flex items-center gap-2"><CreditCard size={20} className="text-orange-500"/> 信用卡刷卡金額</h2>
               <span className="text-[14px] font-extrabold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl">小計: ${ccTotal.toLocaleString()}</span>
             </div>
             <div className="space-y-3">
               {ccs.length === 0 && <p className="text-gray-400 text-[15px] font-bold text-center py-5 bg-gray-50 rounded-[1.5rem]">無信用卡，請至設定新增</p>}
               {ccs.map(c => {
                 const bal = balances[c] || 0;
                 return (
                   <div key={c} className="flex justify-between items-center bg-gray-50 p-4 rounded-[1.2rem] border border-gray-100">
                      <span className="font-bold text-gray-600 text-[16px] truncate pr-2">{c}</span>
                      {isEditingBalances ? (
                         <input type="number" className="w-28 text-right border-2 border-orange-200 focus:border-orange-400 p-2 rounded-[1rem] font-bold text-[16px] outline-none transition" value={tempBalances[c] || ''} onChange={e => setTempBalances({...tempBalances, [c]: e.target.value})} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[18px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}
             </div>
             <p className="text-[13px] font-bold text-orange-400 mt-5 bg-orange-50 p-3.5 rounded-[1.2rem] text-center leading-relaxed">* 信用卡金額通常為負數（代表應繳卡費或負債），轉帳繳費後金額會回升。</p>
          </div>
        </main>
      </>
    );
  }
  // --- 畫面：房間內部 (首頁報表與明細) ---
  else if (view === 'room' && !showAddForm) {
    content = (
      <>
        <header className="bg-gradient-to-r from-pink-400 to-orange-400 px-6 py-6 shadow-md shrink-0 z-10 rounded-b-[2rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <h1 className="text-[22px] font-black text-white drop-shadow-md mb-1">{currentRoom?.name || '共同記帳本'}</h1>
              <p className="text-white/90 text-[15px] font-extrabold flex items-center gap-2 drop-shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-green-300 inline-block shadow-sm"></span> {currentUserRole}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={handleBackup} className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition backdrop-blur-sm" title="備份雲端資料"><Download size={20} /></button>
              <button onClick={() => { setSettingsTab('expense'); setView('settings'); }} className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition backdrop-blur-sm" title="設定"><Settings size={20} /></button>
              <button onClick={() => { setActiveRoomId(null); setView('login'); setRoomPin(''); }} className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition backdrop-blur-sm" title="登出"><LogOut size={20} /></button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="relative bg-white/20 backdrop-blur-md rounded-[1.2rem] shadow-sm border border-white/30 px-4 py-2.5 flex items-center overflow-hidden hover:bg-white/30 transition">
              <input type="date" value={homeFilterDate} onChange={(e) => setHomeFilterDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
              <Calendar size={20} className="text-white mr-3 z-0"/>
              <span className="text-white text-[18px] font-black drop-shadow-sm z-0">
                {homeFilterDate ? toROCFullStr(homeFilterDate) : '全部日期'}
              </span>
              <span className="text-white/70 text-[12px] ml-auto z-0">▼</span>
            </div>
          </div>

          <div className="flex justify-between items-end bg-white/95 backdrop-blur-xl p-5 rounded-[1.5rem] shadow-lg mt-2">
             <div className="flex flex-col">
                <span className="text-gray-400 text-[13px] font-bold mb-1">總支出</span>
                <span className="text-pink-500 font-black text-[18px]"> ${totalExpense.toLocaleString()}</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-gray-400 text-[13px] font-bold mb-1">總收入</span>
                <span className="text-green-500 font-black text-[18px]"> ${totalIncome.toLocaleString()}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-gray-400 text-[13px] font-bold mb-1">總結餘</span>
                <span className={`font-black text-[24px] leading-tight ${netBalance < 0 ? 'text-red-500' : 'text-gray-800'}`}>${netBalance.toLocaleString()}</span>
             </div>
          </div>
        </header>

        <main className="p-5 flex-1 overflow-y-auto pb-[120px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div>
            <h3 className="font-bold text-gray-400 mb-4 ml-1 flex items-center gap-2 text-[16px]">📜 記帳明細</h3>
            {displayRecords.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 font-bold text-[16px]">
                <div className="bg-orange-50 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5">
                   <PiggyBank size={36} className="text-orange-400" />
                </div>
                <p>目前還沒有紀錄，快使用下方 ＋ 號開始記帳吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayRecords.map((exp) => {
                  const isIncome = exp.type === 'income';
                  const isTransfer = exp.type === 'transfer';
                  const displayDate = exp.date ? toROCYearStr(exp.date) : toROCYearStr(new Date(exp.timestamp));
                  const payerStr = Array.isArray(exp.payer) ? exp.payer.join(', ') : exp.payer;
                  
                  let freqDisplay = exp.frequency;
                  if (freqDisplay === '區間') freqDisplay = exp.frequencyInterval === '自訂' ? exp.frequencyCustomText : exp.frequencyInterval;
                  
                  return (
                    <div key={exp.id} onClick={() => setViewingRecord(exp)} className="bg-white p-4 sm:p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex justify-between items-start group relative hover:shadow-md transition duration-300 cursor-pointer">
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1.5 rounded-r-lg ${isIncome ? 'bg-green-400' : isTransfer ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                      
                      <div className="flex-1 pl-4 pr-2 overflow-hidden">
                        {/* 需求 3: 左上角顯示建檔時間 */}
                        <div className="text-[11px] font-bold text-gray-400 mb-2">
                          建檔: {toROCYearStr(exp.timestamp)} {new Date(exp.timestamp).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <p className="text-[13px] font-bold text-gray-500 mb-2.5 flex items-center gap-2">
                          消費日: {displayDate} 
                          {freqDisplay && freqDisplay !== '一次' && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-md">{freqDisplay}</span>}
                          {exp.addedByRole && <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-500">{exp.addedByRole}</span>}
                        </p>
                        
                        {isTransfer ? (
                          <div className="flex items-center gap-2.5 mb-3">
                            <span className="font-bold text-[14px] px-2.5 py-1 rounded-lg whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-100">🔄 轉帳</span>
                            <p className="font-black text-gray-800 text-[18px] truncate">{exp.method} ➜ {exp.transferToMethod}</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 mb-3">
                            <span className={`font-bold text-[14px] px-3 py-1 rounded-xl whitespace-nowrap border ${isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                              {exp.category}
                            </span>
                            <p className="font-black text-gray-800 text-[18px] truncate">{exp.title}</p>
                          </div>
                        )}

                        <p className="text-[13px] font-bold text-gray-400 flex flex-wrap gap-x-2 gap-y-2 items-center mt-1">
                          {payerStr && payerStr !== '未指定' && <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">👤 {payerStr}</span>}
                          {!isTransfer && exp.method && exp.method !== '未指定' && <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">💳 {exp.method}{exp.subMethod ? `(${exp.subMethod})` : ''}</span>}
                          {exp.merchant && exp.merchant !== '未指定' && <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">🏪 {exp.merchant}</span>}
                          {exp.note && <span className="bg-[#FFFDF9] border border-[#F2EFE9] text-gray-500 px-2.5 py-1 rounded-lg">📝 {exp.note}</span>}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className={`font-black text-[22px] ${isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-gray-800'}`}>
                          {isIncome ? '+' : isTransfer ? '⇆' : '-'}${exp.amount.toLocaleString()}
                        </span>
                        
                        {/* 需求 2: 右邊功能分兩排 第一排[編輯, 複製] 第二排[刪除, 傳送] */}
                        <div className="grid grid-cols-2 gap-2 mt-4 w-[84px] relative z-20">
                          <button onClick={(e) => { e.stopPropagation(); openEditForm(exp); }} className="text-gray-400 hover:text-blue-500 font-bold p-2 transition bg-gray-50 hover:bg-blue-50 rounded-[0.8rem] shadow-sm" title="編輯"><Pencil size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleCopyRecord(exp); }} className="text-gray-400 hover:text-green-500 font-bold p-2 transition bg-gray-50 hover:bg-green-50 rounded-[0.8rem] shadow-sm" title="複製此筆"><Copy size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(exp.id); }} className="text-gray-400 hover:text-red-500 font-bold p-2 transition bg-gray-50 hover:bg-red-50 rounded-[0.8rem] shadow-sm" title="刪除"><Trash2 size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setCrossRoomRecord(exp); }} className="text-gray-400 hover:text-orange-500 font-bold p-2 transition bg-gray-50 hover:bg-orange-50 rounded-[0.8rem] shadow-sm" title="傳送到其他房間"><Send size={16} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* 查看明細詳細內容 Modal (需求 2) */}
        {viewingRecord && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-center p-6 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingRecord(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingRecord(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition"><X size={20}/></button>
              <h3 className="font-black text-xl text-gray-800 mb-4 border-b border-gray-100 pb-3">詳細紀錄</h3>
              <div className="space-y-3 text-[15px] text-gray-600 font-bold max-h-[60vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <span className="text-gray-400">類型</span>
                   <span className={`${viewingRecord.type === 'income' ? 'text-green-500' : viewingRecord.type === 'transfer' ? 'text-blue-500' : 'text-orange-500'} font-black text-[16px]`}>
                     {viewingRecord.type === 'income' ? '收入' : viewingRecord.type === 'transfer' ? '轉帳' : '支出'}
                   </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <span className="text-gray-400">金額</span>
                   <span className="text-[22px] text-gray-800 font-black">${viewingRecord.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2 pt-1">
                   <span className="text-gray-400">消費日期</span>
                   <span className="text-gray-800">{toROCYearStr(viewingRecord.date)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                   <span className="text-gray-400">建檔時間</span>
                   <span className="text-gray-800 text-[13px]">{toROCYearStr(viewingRecord.timestamp)} {new Date(viewingRecord.timestamp).toLocaleTimeString('zh-TW', {hour12: false, hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                   <span className="text-gray-400">分類</span>
                   <span className="text-gray-800">{viewingRecord.category}</span>
                </div>
                {viewingRecord.type !== 'transfer' && (
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="text-gray-400">項目</span>
                     <span className="text-gray-800">{viewingRecord.title}</span>
                  </div>
                )}
                {viewingRecord.merchant && viewingRecord.merchant !== '未指定' && (
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="text-gray-400">商家</span>
                     <span className="text-gray-800">{viewingRecord.merchant}</span>
                  </div>
                )}
                {viewingRecord.payer && viewingRecord.payer.length > 0 && (
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="text-gray-400">對象</span>
                     <span className="text-gray-800">{Array.isArray(viewingRecord.payer) ? viewingRecord.payer.join(', ') : viewingRecord.payer}</span>
                  </div>
                )}
                {viewingRecord.method && viewingRecord.method !== '未指定' && (
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="text-gray-400">{viewingRecord.type === 'transfer' ? '轉出帳戶' : '付款方式'}</span>
                     <span className="text-gray-800">{viewingRecord.method} {viewingRecord.subMethod ? `(${viewingRecord.subMethod})` : ''}</span>
                  </div>
                )}
                {viewingRecord.transferToMethod && (
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="text-gray-400">轉入帳戶</span>
                     <span className="text-gray-800">{viewingRecord.transferToMethod} {viewingRecord.transferToSubMethod ? `(${viewingRecord.transferToSubMethod})` : ''}</span>
                  </div>
                )}
                {viewingRecord.frequency && viewingRecord.frequency !== '一次' && (
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="text-gray-400">頻率</span>
                     <span className="text-gray-800">{viewingRecord.frequency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                   <span className="text-gray-400">建立者</span>
                   <span className="text-gray-800">{viewingRecord.addedByRole}</span>
                </div>
                {viewingRecord.note && (
                  <div className="pt-2">
                     <span className="text-gray-400 block mb-1">備註</span>
                     <span className="text-gray-800 block bg-gray-50 p-3 rounded-xl border border-gray-100">{viewingRecord.note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 傳送紀錄至其他房間的 Modal */}
        {crossRoomRecord && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
               <h3 className="font-black text-xl text-gray-800 mb-4 flex items-center gap-2"><Send size={24} className="text-blue-500"/> 傳送至其他房間</h3>
               <p className="text-[15px] font-bold text-gray-500 mb-4 leading-relaxed">將此筆 <span className="text-gray-800">[{crossRoomRecord.title || crossRoomRecord.category}] ${crossRoomRecord.amount}</span> 複製傳送到：</p>
               <div className="space-y-3 mb-6 max-h-56 overflow-y-auto pr-1">
                 {savedRooms.filter(r => r.id !== activeRoomId).length === 0 ? (
                   <p className="text-red-400 font-bold text-[14px] bg-red-50 p-4 rounded-xl leading-relaxed">您目前沒有儲存其他房間，請先登入過其他房間再使用此功能。</p>
                 ) : (
                   savedRooms.filter(r => r.id !== activeRoomId).map(r => (
                     <button key={r.id} onClick={() => handleSendToOtherRoom(r.id)} className="w-full text-left bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-200 p-4 rounded-[1.2rem] font-black text-gray-700 text-[16px] transition flex items-center shadow-sm">
                       🏠 {r.name} <span className="text-[12px] font-bold text-gray-400 ml-auto">({r.id})</span>
                     </button>
                   ))
                 )}
               </div>
               <button onClick={() => setCrossRoomRecord(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold text-[16px] py-4 rounded-[1.2rem] transition">取消傳送</button>
            </div>
          </div>
        )}
      </>
    );
  }
  // --- 畫面：新增/編輯紀錄表單 ---
  else if (view === 'room' && showAddForm) {
    const isIncome = recordType === 'income';
    const isTransfer = recordType === 'transfer';
    const titleEmoji = isIncome ? '💸' : isTransfer ? '🔄' : '🛍️';
    
    const themeBg = isIncome ? 'bg-green-400' : isTransfer ? 'bg-blue-400' : 'bg-orange-400';
    const themeText = isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-orange-500';
    const themeBorder = isIncome ? 'border-green-100' : isTransfer ? 'border-blue-100' : 'border-orange-100';
    
    const daysOfWeek = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const daysOfMonth = Array.from({length: 31}, (_, i) => (i + 1).toString());
    const intervalOptions = ['3個月', '半年', '一年', '自訂'];
    
    content = (
      <>
        <header className={`${themeBg} text-white px-6 py-6 shadow-md shrink-0 z-10 border-b-4 border-white/20 rounded-b-[2rem] transition-colors duration-300`}>
          <div className="flex justify-between items-center mb-5">
            <h1 className="text-2xl font-black flex items-center gap-2 drop-shadow-md">
              {editRecordId ? '✏️ 編輯紀錄' : '✨ 新增紀錄'} {titleEmoji}
            </h1>
            <button onClick={() => { setShowAddForm(false); resetForm(); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition backdrop-blur-sm shadow-inner">
              <X size={24} strokeWidth={3} />
            </button>
          </div>

          {!editRecordId && (
            <div className="flex bg-white/20 p-1.5 rounded-[1.2rem] shadow-inner mb-2">
               <button type="button" onClick={() => setRecordType('expense')} className={`flex-1 py-2.5 rounded-[1rem] font-bold text-[16px] text-center transition-all ${recordType === 'expense' ? 'bg-white text-orange-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>支出</button>
               <button type="button" onClick={() => setRecordType('income')} className={`flex-1 py-2.5 rounded-[1rem] font-bold text-[16px] text-center transition-all ${recordType === 'income' ? 'bg-white text-green-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>收入</button>
               <button type="button" onClick={() => setRecordType('transfer')} className={`flex-1 py-2.5 rounded-[1rem] font-bold text-[16px] text-center transition-all ${recordType === 'transfer' ? 'bg-white text-blue-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>轉帳</button>
            </div>
          )}
        </header>

        <main className="p-5 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <form onSubmit={handleSaveRecord} className="space-y-5">
            
            <div className={`bg-white rounded-[2rem] p-6 shadow-sm border-2 ${themeBorder} text-center mb-5 relative overflow-hidden`}>
               <div className={`absolute top-0 left-0 w-full h-2 ${themeBg} opacity-20`}></div>
               <p className={`${themeText} font-extrabold text-[15px] mb-3`}>輸入金額 💰</p>
               <input 
                 ref={amountInputRef}
                 type="number" placeholder="0" required min="0"
                 className={`text-center text-[52px] font-black w-full outline-none bg-transparent text-gray-800 placeholder-gray-200`} 
                 value={recordAmount} onChange={(e) => setRecordAmount(e.target.value)} 
               />
            </div>

            <div className={`bg-white rounded-[2rem] p-6 shadow-sm border-2 ${themeBorder}`}>
              {/* 需求 4: 日期與頻率整合在同一排，使用 grid-cols-2 */}
              <div className="grid grid-cols-2 gap-3 mb-6 z-40">
                <div>
                  <label className="flex items-center gap-1.5 text-[15px] font-bold text-gray-500 mb-2.5 ml-1"><Calendar size={16} className="text-gray-400" /> 日期 🗓️</label>
                  <div className="relative w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-[1.2rem] flex items-center shadow-sm cursor-pointer hover:bg-white transition overflow-hidden">
                    <input 
                      type="date" 
                      required 
                      className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
                      value={recordDate} 
                      onChange={(e) => setRecordDate(e.target.value)} 
                    />
                    <span className="font-bold text-gray-700 text-[16px] z-0">
                      {recordDate ? toROCYearStr(recordDate) : '選擇日期'}
                    </span>
                    <span className="absolute right-3 text-gray-400 text-[12px] z-0 pointer-events-none">▼</span>
                  </div>
                </div>
                {recordType === 'expense' && (
                  <div className="z-40">
                    <CustomDropdown label="頻率 🔄" icon={RefreshCw} options={['一次', '每週', '每月', '區間']} value={recordFrequency} onChange={setRecordFrequency} placeholder="選擇頻率" />
                  </div>
                )}
              </div>

              {recordType === 'expense' && recordFrequency === '每週' && (
                <div className="mb-6 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <label className="text-[14px] font-bold text-gray-500 mb-3 block">請選擇星期 (可複選)</label>
                  <div className="flex flex-wrap gap-2.5">
                    {daysOfWeek.map(d => (
                      <button key={d} type="button" onClick={() => toggleFrequencyDay(d)} className={`px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all ${recordFrequencyDays.includes(d) ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {recordType === 'expense' && recordFrequency === '每月' && (
                <div className="mb-6 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <label className="text-[14px] font-bold text-gray-500 mb-3 block">請選擇日期 (可複選)</label>
                  <div className="grid grid-cols-7 gap-2">
                    {daysOfMonth.map(d => (
                      <button key={d} type="button" onClick={() => toggleFrequencyDay(d)} className={`aspect-square rounded-xl text-[14px] font-bold transition-all ${recordFrequencyDays.includes(d) ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {recordType === 'expense' && recordFrequency === '區間' && (
                <div className="mb-6 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <label className="text-[14px] font-bold text-gray-500 mb-3 block">請選擇時間區間</label>
                  <div className="flex flex-wrap gap-2.5 mb-4">
                      {intervalOptions.map(opt => (
                          <button key={opt} type="button" onClick={() => setRecordFrequencyInterval(opt)} className={`px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all ${recordFrequencyInterval === opt ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>{opt}</button>
                      ))}
                  </div>
                  {recordFrequencyInterval === '自訂' && (
                      <input type="text" placeholder="自行填寫區間 (例如: 100天)" value={recordFrequencyCustomText} onChange={e => setRecordFrequencyCustomText(e.target.value)} className="w-full bg-white border-2 border-gray-100 p-4 rounded-xl font-bold text-[15px] outline-none focus:border-[#FCD34D] transition shadow-sm" />
                  )}
                </div>
              )}

              {recordType === 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-4 z-30 mb-6">
                    <CustomDropdown label="主分類 📂" options={currentRoom?.categories || []} value={recordCategory} onChange={(val) => { setRecordCategory(val); setSelectedItem(''); }} placeholder="選擇分類..." />
                    <CustomDropdown label="項目清單 🛒" options={currentRoom?.categoryItems?.[recordCategory] || []} value={selectedItem} onChange={setSelectedItem} placeholder="選擇項目..." />
                  </div>

                  <div className="flex flex-col gap-4 mb-6 z-20">
                     <CustomDropdown label="商家 🏪" icon={Store} options={currentRoom?.merchants || []} value={recordMerchant} onChange={setRecordMerchant} placeholder="選擇商家..." />
                     <PillGroupMulti label="花費對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  </div>

                  <div className="mb-2 z-10">
                    <label className="flex items-center gap-1.5 text-[15px] font-bold text-gray-500 mb-2.5 ml-1"><CreditCard size={16} className="text-gray-400" /> 付款方式 💳</label>
                    <div className="flex bg-gray-50 rounded-[1.2rem] p-1.5 border border-gray-100 mb-4 shadow-inner">
                      {(currentRoom?.paymentMethods || []).map(opt => (
                        <button key={opt} type="button" onClick={() => handleMethodSelect(opt)} className={`flex-1 py-3 px-1 rounded-[1rem] text-[15px] font-extrabold transition-all duration-200 truncate ${recordMethod === opt ? 'bg-white text-blue-600 shadow-md border border-gray-100 transform scale-100' : 'text-gray-400 hover:text-gray-600 scale-95'}`}>{opt}</button>
                      ))}
                    </div>
                    {(recordMethod === '信用卡 / 行動支付' || recordMethod === '信用卡') && (
                      <div className="z-10 relative">
                        <CustomDropdown options={currentRoom?.creditCards || []} value={recordSubMethod} onChange={setRecordSubMethod} placeholder="選擇信用卡" />
                      </div>
                    )}
                    {recordMethod === '銀行' && (
                      <div className="z-10 relative">
                        <CustomDropdown options={currentRoom?.bankAccounts || []} value={recordSubMethod} onChange={setRecordSubMethod} placeholder="選擇扣款銀行" />
                      </div>
                    )}
                  </div>
                </>
              )}

              {recordType === 'income' && (
                <>
                  <div className="z-30 mb-6">
                    <CustomDropdown label="收入分類 📈" icon={Tag} options={currentRoom?.incomeCategories || []} value={recordCategory} onChange={setRecordCategory} placeholder="選擇收入分類..." />
                  </div>
                  <PillGroupMulti label="對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  
                  <div className="mb-2 z-20">
                    <CustomDropdown label="存入帳戶 🏦" icon={Wallet} options={currentRoom?.incomeAccounts || []} value={recordMethod} onChange={setRecordMethod} placeholder="選擇存入帳戶..." />
                  </div>
                </>
              )}

              {recordType === 'transfer' && (
                <>
                  <div className="z-40 mb-6">
                    <CustomDropdown label="轉帳分類 🔄" icon={Tag} options={currentRoom?.transferCategories || []} value={recordCategory} onChange={setRecordCategory} placeholder="選擇轉帳分類..." />
                  </div>
                  <PillGroupMulti label="對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  
                  <div className="mb-6 z-30">
                    <CustomDropdown label="📤 轉出帳戶 (從哪裡扣款)" options={currentRoom?.transferOutAccounts || []} value={recordMethod} onChange={setRecordMethod} placeholder="選擇轉出帳戶..." />
                  </div>

                  <div className="mb-2 z-20">
                    <CustomDropdown label="📥 轉入帳戶 (存到哪裡)" options={currentRoom?.transferInAccounts || []} value={transferToMethod} onChange={setTransferToMethod} placeholder="選擇轉入帳戶..." />
                  </div>
                </>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="flex items-center gap-1.5 text-[15px] font-bold text-gray-500 mb-2.5 ml-1">📝 備註 (選填)</label>
                <input type="text" placeholder="輸入額外備註..." className="bg-gray-50 border-2 border-gray-100 rounded-[1.2rem] p-4 focus:bg-white focus:border-blue-400 outline-none w-full text-gray-700 font-bold text-[16px] transition shadow-sm" value={recordNote} onChange={(e) => setRecordNote(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={!isFormValid} className={`w-full font-extrabold text-[18px] py-4 mt-6 rounded-[1.5rem] transition-all duration-300 shadow-lg ${isFormValid ? `${themeBg} text-white hover:opacity-90 transform hover:-translate-y-1 active:translate-y-0` : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 shadow-none'}`}>
              {isFormValid ? '儲存紀錄 ✨' : '請填寫完整資料'}
            </button>
          </form>
        </main>
      </>
    );
  }
  // --- 設定畫面 ---
  else if (view === 'settings') {
    const renderSetting = (title, field, placeholder, themeClass, spanClass, btnClass) => (
      <div key={field} className={`p-6 rounded-[2rem] border-2 ${themeClass} bg-white shadow-sm mb-6`}>
        <h3 className="font-bold text-gray-700 mb-4 text-[18px] flex items-center gap-2">{title}</h3>
        <div className="flex flex-wrap gap-2.5 mb-5">
          {(currentRoom?.[field] || []).map(item => (
            <span key={item} className={`px-4 py-2.5 rounded-[1rem] text-[15px] font-bold flex items-center gap-1.5 shadow-sm ${spanClass}`}>
              {item} <button onClick={() => handleDeleteOption(field, item)} className="hover:opacity-60 transition ml-1"><X size={16} strokeWidth={3} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2.5">
          <input type="text" value={newOptionInputs[field]} onChange={(e) => setNewOptionInputs({...newOptionInputs, [field]: e.target.value})} placeholder={placeholder} className={`flex-1 border-2 ${themeClass} bg-gray-50 rounded-[1.2rem] p-4 outline-none focus:bg-white transition text-[15px] font-bold`} onKeyPress={(e) => e.key === 'Enter' && handleAddOption(field)} />
          <button onClick={() => handleAddOption(field)} className={`${btnClass} text-white px-6 py-3.5 rounded-[1.2rem] text-[15px] font-bold shadow-md transition hover:scale-105 active:scale-95`}>新增</button>
        </div>
      </div>
    );

    content = (
      <>
        <header className="bg-gradient-to-r from-purple-400 to-pink-400 px-6 py-6 shadow-md shrink-0 z-10 rounded-b-[2rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-md"><Settings size={28} className="text-white/80"/> 選項設定</h1>
            <button onClick={() => setView('room')} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition text-[15px] font-bold backdrop-blur-sm">返回</button>
          </div>
        </header>

        <main className="p-5 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="text-center mb-6 mt-2">
            <p className="text-purple-500 font-bold bg-purple-50 border border-purple-100 inline-block px-5 py-3 rounded-full text-[13px] shadow-sm leading-relaxed">💡 在此編輯的項目，全家人的畫面都會同步更新喔！</p>
          </div>
          
          <div className="flex bg-white rounded-[1.5rem] p-2 border-2 border-gray-100 mb-6 shadow-sm">
             <button onClick={() => setSettingsTab('expense')} className={`flex-1 py-3 px-1 rounded-[1.2rem] text-[16px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'expense' ? 'bg-orange-400 text-white shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600 bg-gray-50 scale-95'}`}>支出</button>
             <button onClick={() => setSettingsTab('income')} className={`flex-1 py-3 px-1 rounded-[1.2rem] text-[16px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'income' ? 'bg-green-500 text-white shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600 bg-gray-50 scale-95'}`}>收入</button>
             <button onClick={() => setSettingsTab('transfer')} className={`flex-1 py-3 px-1 rounded-[1.2rem] text-[16px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'transfer' ? 'bg-blue-500 text-white shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600 bg-gray-50 scale-95'}`}>轉帳</button>
          </div>

          <div className="space-y-4">
            {settingsTab === 'expense' && (
              <>
                {renderSetting('🌸 支出主分類', 'categories', '輸入新分類...', 'border-pink-100', 'bg-pink-50 text-pink-600', 'bg-pink-400')}
                
                <div className={`p-6 rounded-[2rem] border-2 border-pink-100 bg-white shadow-sm mb-6`}>
                  <h3 className="font-bold text-gray-700 mb-5 text-[18px] flex items-center gap-2">📝 編輯「分類」專屬項目清單</h3>
                  <select value={settingSelectedCategory} onChange={e => setSettingSelectedCategory(e.target.value)} className="w-full bg-pink-50 border-2 border-pink-100 p-4 rounded-[1.2rem] outline-none mb-5 font-bold text-[16px] text-pink-700 shadow-sm cursor-pointer appearance-none">
                      <option value="">請先選擇一個主分類...</option>
                      {(currentRoom?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {settingSelectedCategory && (
                      <>
                          <div className="flex flex-wrap gap-2.5 mb-5">
                              {(currentRoom?.categoryItems?.[settingSelectedCategory] || []).map(item => (
                                  <span key={item} className="px-4 py-2.5 rounded-[1rem] text-[15px] font-bold flex items-center gap-1.5 shadow-sm bg-white border border-pink-100 text-pink-600">
                                      {item} <button onClick={() => handleDeleteCategoryItem(settingSelectedCategory, item)} className="hover:opacity-60 ml-1"><X size={16} strokeWidth={3} /></button>
                                  </span>
                              ))}
                          </div>
                          <div className="flex gap-2.5">
                              <input type="text" value={newCategoryItemInput} onChange={(e) => setNewCategoryItemInput(e.target.value)} placeholder={`新增項目...`} className="flex-1 border-2 border-pink-100 bg-gray-50 rounded-[1.2rem] p-4 outline-none font-bold text-[15px] focus:bg-white transition" onKeyPress={(e) => e.key === 'Enter' && handleAddCategoryItem(settingSelectedCategory)}/>
                              <button onClick={() => handleAddCategoryItem(settingSelectedCategory)} className="bg-pink-400 text-white px-6 py-3.5 rounded-[1.2rem] text-[15px] font-bold shadow-md transition hover:scale-105 active:scale-95">新增</button>
                          </div>
                      </>
                  )}
                </div>

                {renderSetting('🏪 常見商家', 'merchants', '輸入新商家...', 'border-orange-100', 'bg-orange-50 text-orange-600', 'bg-orange-400')}
                
                <div className={`p-6 rounded-[2rem] border-2 border-orange-100 bg-white shadow-sm mb-6`}>
                  <h3 className="font-bold text-gray-700 mb-5 text-[18px] flex items-center gap-2">🤖 商家預設規則</h3>
                  <div className="flex flex-col gap-3 mb-6">
                    {Object.entries(currentRoom?.autoFillRules || {}).map(([item, merchant]) => (
                      <div key={item} className="flex justify-between items-center bg-orange-50 p-4 rounded-[1.2rem] border border-orange-100 shadow-sm">
                        <span className="text-[15px] font-bold text-orange-700">[{item}] ➜ {merchant}</span>
                        <button onClick={() => handleDeleteRule(item)} className="text-red-400 hover:text-red-600 p-1.5 bg-white rounded-xl shadow-sm"><X size={16} strokeWidth={3}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
                     <select value={newRuleItem} onChange={e=>setNewRuleItem(e.target.value)} className="w-full border-2 border-orange-100 p-4 rounded-[1.2rem] font-bold text-[15px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                       <option value="">選擇觸發的項目...</option>
                       {Object.values(currentRoom?.categoryItems || {}).flat().map(i => <option key={i} value={i}>{i}</option>)}
                     </select>
                     <div className="flex gap-2.5 mt-2">
                       <select value={newRuleMerchant} onChange={e=>setNewRuleMerchant(e.target.value)} className="flex-1 border-2 border-orange-100 p-4 rounded-[1.2rem] font-bold text-[15px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                         <option value="">選擇預設商家...</option>
                         {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <button onClick={handleAddRule} className="bg-orange-400 text-white px-6 py-3.5 rounded-[1.2rem] text-[15px] font-bold shadow-md transition hover:scale-105 active:scale-95">新增</button>
                     </div>
                  </div>
                </div>

                {renderSetting('👥 對象', 'payers', '輸入新人名...', 'border-gray-200', 'bg-gray-100 text-gray-600', 'bg-gray-800')}
                {renderSetting('💳 信用卡清單', 'creditCards', '輸入信用卡銀行...', 'border-blue-100', 'bg-blue-50 text-blue-600', 'bg-blue-400')}
                {renderSetting('🏦 銀行帳戶清單', 'bankAccounts', '輸入銀行名稱...', 'border-indigo-100', 'bg-indigo-50 text-indigo-600', 'bg-indigo-400')}
                
                <div className={`p-6 rounded-[2rem] border-2 border-blue-100 bg-white shadow-sm mb-6`}>
                  <h3 className="font-bold text-gray-700 mb-5 text-[18px] flex items-center gap-2">🤖 付款方式預設規則</h3>
                  <div className="flex flex-col gap-3 mb-6">
                    {Object.entries(currentRoom?.methodRules || {}).map(([merchant, rule]) => (
                      <div key={merchant} className="flex justify-between items-center bg-blue-50 p-4 rounded-[1.2rem] border border-blue-100 shadow-sm">
                        <span className="text-[15px] font-bold text-blue-700">[{merchant}] ➜ {rule.method} {rule.subMethod ? `(${rule.subMethod})` : ''}</span>
                        <button onClick={() => handleDeleteMethodRule(merchant)} className="text-red-400 hover:text-red-600 p-1.5 bg-white rounded-xl shadow-sm"><X size={16} strokeWidth={3}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
                     <select value={newMethodRuleMerchant} onChange={e=>setNewMethodRuleMerchant(e.target.value)} className="w-full border-2 border-blue-100 p-4 rounded-[1.2rem] font-bold text-[15px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                       <option value="">選擇觸發的商家...</option>
                       {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                     <div className="flex flex-col gap-3 mt-2">
                       <select value={newMethodRuleMethod} onChange={e=>{
                           setNewMethodRuleMethod(e.target.value);
                           if (e.target.value === '信用卡 / 行動支付' || e.target.value === '信用卡') setNewMethodRuleSubMethod(currentRoom?.creditCards?.[0] || '');
                           else if (e.target.value === '銀行') setNewMethodRuleSubMethod(currentRoom?.bankAccounts?.[0] || '');
                           else setNewMethodRuleSubMethod('');
                         }} className="w-full border-2 border-blue-100 p-4 rounded-[1.2rem] font-bold text-[15px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                         <option value="">預設付款方式...</option>
                         {(currentRoom?.paymentMethods || []).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <div className="flex gap-2.5">
                         {(newMethodRuleMethod === '信用卡 / 行動支付' || newMethodRuleMethod === '信用卡') && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border-2 border-blue-100 p-4 rounded-[1.2rem] font-bold text-[15px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">選擇信用卡...</option>
                             {(currentRoom?.creditCards || []).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                         )}
                         {newMethodRuleMethod === '銀行' && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border-2 border-blue-100 p-4 rounded-[1.2rem] font-bold text-[15px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">選擇銀行...</option>
                             {(currentRoom?.bankAccounts || []).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                         )}
                         <button onClick={handleAddMethodRule} className="bg-blue-400 text-white px-6 py-3.5 rounded-[1.2rem] text-[15px] font-bold shadow-md transition hover:scale-105 active:scale-95 ml-auto">新增規則</button>
                       </div>
                     </div>
                  </div>
                </div>
              </>
            )}

            {settingsTab === 'income' && (
              <>
                {renderSetting('💰 收入主分類', 'incomeCategories', '輸入收入分類...', 'border-green-100', 'bg-green-50 text-green-600', 'bg-green-400')}
                {renderSetting('🏦 存入帳戶', 'incomeAccounts', '輸入存入帳戶...', 'border-green-100', 'bg-green-50 text-green-600', 'bg-green-400')}
              </>
            )}

            {settingsTab === 'transfer' && (
              <>
                {renderSetting('🔄 轉帳主分類', 'transferCategories', '輸入轉帳分類...', 'border-blue-100', 'bg-blue-50 text-blue-600', 'bg-blue-400')}
                {renderSetting('📤 轉出帳戶', 'transferOutAccounts', '輸入轉出帳戶...', 'border-blue-100', 'bg-blue-50 text-blue-600', 'bg-blue-400')}
                {renderSetting('📥 轉入帳戶', 'transferInAccounts', '輸入轉入帳戶...', 'border-blue-100', 'bg-blue-50 text-blue-600', 'bg-blue-400')}
              </>
            )}
          </div>
        </main>
      </>
    );
  }

  // --- 統計分析畫面 ---
  else if (view === 'analysis') {
    const analysisOptions = [
      { id: 'category', label: '🌸 主分類' },
      { id: 'title', label: '📝 項目' },
      { id: 'merchant', label: '🏪 商家' },
      { id: 'method', label: '💳 付款方式/帳戶' }
    ];

    content = (
      <>
        <header className="bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-6 shadow-md shrink-0 z-10 rounded-b-[2rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-md"><BarChart size={28} className="text-white/80"/> 統計分析</h1>
            <button onClick={() => setView('room')} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-[1rem] transition text-[15px] font-bold backdrop-blur-sm">返回</button>
          </div>
        </header>

        <main className="p-5 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-teal-50">
            
            <div className="mb-6">
               <label className="block text-[15px] font-bold text-gray-500 mb-3 ml-1">分析類型 (單選)</label>
               <div className="flex bg-gray-50 rounded-[1.2rem] p-1.5 border border-gray-100 shadow-inner">
                 {['expense', 'income', 'transfer'].map(type => {
                    const label = type === 'expense' ? '支出' : type === 'income' ? '收入' : '轉帳';
                    const isSel = analysisType === type;
                    const activeColor = type === 'expense' ? 'bg-orange-400' : type === 'income' ? 'bg-green-500' : 'bg-blue-500';
                    return (
                      <button key={type} onClick={() => handleAnalysisTypeChange(type)} className={`flex-1 py-3 rounded-[1rem] text-[16px] font-extrabold transition-all duration-200 ${isSel ? `${activeColor} text-white shadow-md transform scale-100` : 'text-gray-400 hover:text-gray-600 scale-95'}`}>
                        {label}
                      </button>
                    )
                 })}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[14px] font-bold text-gray-500 mb-2 ml-1">開始日期</label>
                <div className="text-[12px] font-bold text-gray-400 mb-1.5 ml-1">({analysisStartDate ? toROCYearStr(analysisStartDate) : ''})</div>
                <input type="date" value={analysisStartDate} onChange={e => setAnalysisStartDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-[1.2rem] outline-none font-bold text-gray-700 text-[15px] focus:bg-white focus:border-teal-300 transition shadow-sm" />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-gray-500 mb-2 ml-1">結束日期</label>
                <div className="text-[12px] font-bold text-gray-400 mb-1.5 ml-1">({analysisEndDate ? toROCYearStr(analysisEndDate) : ''})</div>
                <input type="date" value={analysisEndDate} onChange={e => setAnalysisEndDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-[1.2rem] outline-none font-bold text-gray-700 text-[15px] focus:bg-white focus:border-teal-300 transition shadow-sm" />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[15px] font-bold text-gray-500 mb-3 ml-1">分析選單 (可複選)</label>
              <div className="flex flex-wrap gap-2.5">
                {analysisOptions.map(opt => {
                  const isSelected = analysisMenus.includes(opt.id);
                  return (
                    <button 
                      key={opt.id} type="button"
                      onClick={() => {
                        if (isSelected) setAnalysisMenus(analysisMenus.filter(d => d !== opt.id));
                        else setAnalysisMenus([...analysisMenus, opt.id]);
                      }}
                      className={`px-4 py-2.5 rounded-[1rem] text-[15px] font-bold transition-all duration-200 ${isSelected ? 'bg-[#A7F3D0] text-teal-800 border-2 border-[#34D399] shadow-sm transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100 hover:bg-gray-50 shadow-sm'}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {analysisMenus.length > 0 && (
              <div className="pt-6 border-t-2 border-dashed border-gray-100 space-y-6">
                <label className="block text-[13px] font-bold text-teal-600 bg-teal-50 px-4 py-2 rounded-xl inline-block leading-relaxed">💡 依選擇選單篩選細項 (不選代表全部分析)</label>
                
                {analysisMenus.includes('category') && (
                  <PillGroupMulti label="🌸 主分類" options={currentRoom?.categories || []} values={analysisSubSelections.category} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, category: vals})} />
                )}
                {analysisMenus.includes('title') && (
                  <div className="mb-6 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                    <label className="block text-[14px] font-bold text-gray-500 mb-4 leading-relaxed">請先選擇上方的主分類篩選，這裡會列出對應的項目讓您勾選</label>
                    <div className="flex flex-wrap gap-2.5">
                      {(() => {
                        const targetCats = analysisSubSelections.category.length > 0 ? analysisSubSelections.category : Object.keys(currentRoom?.categoryItems || {});
                        const itemsToShow = [...new Set(targetCats.flatMap(c => currentRoom?.categoryItems?.[c] || []))];
                        return itemsToShow.map(item => (
                          <button key={item} onClick={() => {
                             let newVals = [...analysisSubSelections.title];
                             if (newVals.includes(item)) newVals = newVals.filter(v => v !== item); else newVals.push(item);
                             setAnalysisSubSelections({...analysisSubSelections, title: newVals});
                          }} className={`px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${analysisSubSelections.title.includes(item) ? 'bg-[#A7F3D0] text-teal-800 border-2 border-[#34D399] shadow-sm' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>
                             {item}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                )}
                {analysisMenus.includes('merchant') && (
                  <PillGroupMulti label="🏪 商家" options={currentRoom?.merchants || []} values={analysisSubSelections.merchant} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, merchant: vals})} />
                )}
                {analysisMenus.includes('method') && (
                  <>
                    {analysisType === 'expense' ? (
                      <>
                        <PillGroupMulti label="💳 付款方式" options={currentRoom?.paymentMethods || []} values={analysisSubSelections.method} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, method: vals, subMethod: []})} />
                        {(analysisSubSelections.method.includes('信用卡 / 行動支付') || analysisSubSelections.method.includes('信用卡')) && (
                          <PillGroupMulti label="💳 選擇信用卡" options={currentRoom?.creditCards || []} values={analysisSubSelections.subMethod} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, subMethod: vals})} />
                        )}
                        {analysisSubSelections.method.includes('銀行') && (
                          <PillGroupMulti label="🏦 選擇銀行" options={currentRoom?.bankAccounts || []} values={analysisSubSelections.subMethod} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, subMethod: vals})} />
                        )}
                      </>
                    ) : analysisType === 'income' ? (
                        <PillGroupMulti label="🏦 存入帳戶" options={currentRoom?.incomeAccounts || []} values={analysisSubSelections.method} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, method: vals})} />
                    ) : (
                        <PillGroupMulti label="📤 轉出帳戶" options={currentRoom?.transferOutAccounts || []} values={analysisSubSelections.method} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, method: vals})} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-teal-50">
            <h2 className="font-bold text-teal-700 mb-6 text-[18px] flex items-center gap-2"><LucidePieChart size={20} className="text-teal-400"/> 統計結果</h2>
            <MyCustomPieChart data={chartData} colors={chartColors} />
            
            <div className="mt-8 space-y-3">
              {chartData.length === 0 ? (
                <p className="text-center text-gray-400 font-bold text-[15px] bg-gray-50 py-5 rounded-2xl">此條件沒有紀錄喔！</p>
              ) : (
                chartData.map((d, idx) => (
                  <div key={d.label} className="flex justify-between items-center bg-gray-50 p-4 rounded-[1.2rem] border border-gray-100 hover:shadow-sm transition">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full shadow-inner" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                      <span className="font-bold text-gray-700 text-[16px] truncate max-w-[150px]">{d.label}</span>
                    </div>
                    <span className="font-black text-gray-800 text-[20px]">${d.value.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <div className={globalWrapperStyle}>
      <div className={phoneContainerStyle}>
        {content}
        
        {/* 底部導覽列只在首頁顯示，並改為 3 個按鈕 (左:帳戶, 中:大大的+, 右:統計) */}
        {user && view === 'room' && !showAddForm && (
          <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl p-3 pb-8 sm:pb-6 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] flex justify-between items-center z-20 border-t border-gray-100 px-8">
            
            <button onClick={() => setView('accounts')} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-indigo-500 transition px-4 py-2">
              <Wallet size={26} />
              <span className="font-extrabold text-[13px]">帳戶</span>
            </button>

            {/* 大大的 + 號 */}
            <button 
              onClick={() => { resetForm(); setRecordType('expense'); setShowAddForm(true); }} 
              className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gradient-to-tr from-pink-400 to-orange-400 text-white w-[72px] h-[72px] rounded-[2.5rem] flex items-center justify-center shadow-[0_10px_20px_rgba(251,146,60,0.4)] border-[6px] border-[#FFFBF0] transform hover:scale-105 transition active:scale-95"
            >
              <Plus size={40} strokeWidth={3} />
            </button>

            <button onClick={() => setView('analysis')} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-teal-500 transition px-4 py-2">
              <BarChart size={26} />
              <span className="font-extrabold text-[13px]">統計</span>
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
