/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
// 確保使用最新穩定的 lucide-react 圖示名稱，徹底解決 Element type is invalid 與 Vercel Build 錯誤
import { LogOut, AlertCircle, Settings, Trash2, X, Sparkles, Home, MinusCircle, PlusCircle, Pencil, BarChart, Calendar, Store, Tag, User, CreditCard, RefreshCw, Wallet, PiggyBank, PieChart as LucidePieChart, Download, Copy, Send, Landmark } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

// ==========================================
// 0. 自動載入 Tailwind CSS 魔法 (免找 index.html)
// ==========================================
if (typeof document !== 'undefined' && !document.getElementById('tailwind-script')) {
  const script = document.createElement('script');
  script.id = 'tailwind-script';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// ==========================================
// 1. Firebase 初始化
// ==========================================
// 已經為您填入您專屬的 Firebase 金鑰！
const firebaseConfig = {
  apiKey: "AIzaSyBiFI05fIDz35Zk3n4nodHy9ZoYWqHOnZk",
  authDomain: "lin-buget-7972c.firebaseapp.com",
  projectId: "lin-buget-7972c",
  storageBucket: "lin-buget-7972c.firebasestorage.app",
  messagingSenderId: "請補上您的數字", 
  appId: "請補上您的appId字串" 
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
        <label className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-2 ml-1">
          {Icon && <Icon size={14} className="text-gray-400" />} {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border-2 ${isOpen ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'} p-3.5 rounded-[1.2rem] flex justify-between items-center outline-none transition-all shadow-sm text-left`}
      >
        <span className={`font-bold text-[14px] truncate pr-2 ${value ? 'text-gray-800' : 'text-gray-300'}`}>
          {value || placeholder}
        </span>
        <span className={`text-gray-400 text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <ul className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] max-h-60 overflow-y-auto py-2 top-full left-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {options.length === 0 && <li className="px-4 py-3 text-[13px] text-gray-400 font-bold">無選項可用</li>}
          {options.map(opt => (
            <li
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`px-4 py-3 text-[14px] font-bold cursor-pointer transition-colors flex items-center gap-2 ${
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
  if (total === 0) return <div className="text-gray-400 text-center py-10 font-bold bg-white rounded-[2rem] border-2 border-dashed border-gray-200">無分析數據 📊</div>;

  return (
    <svg viewBox="-1 -1 2 2" className="w-48 h-48 mx-auto transform -rotate-90 drop-shadow-lg">
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
  // ==========================================
  // 狀態管理
  // ==========================================
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

  // 全域外框設計參數
  const globalWrapperStyle = "min-h-screen bg-gray-100 sm:py-8 flex justify-center items-center font-sans";
  const phoneContainerStyle = "w-full max-w-[420px] min-h-screen sm:min-h-0 sm:h-[844px] bg-[#FFFBF0] flex flex-col relative sm:rounded-[3rem] sm:border-[8px] sm:border-gray-800 shadow-2xl overflow-hidden";
  const bottomNavStyle = "absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md p-2 pb-6 sm:pb-5 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] grid grid-cols-5 gap-1.5 z-20 border-t border-gray-100";


  // ==========================================
  // Firebase 身份驗證 & 資料庫讀取
  // ==========================================
  useEffect(() => {
    // 加入指數退避重試機制，防止網路短暫不穩或擋廣告軟體延遲
    const initAuth = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          await signInAnonymously(auth);
          return; // 成功連線則跳出迴圈
        } catch (error) { 
          console.error(`Auth attempt ${i + 1} failed:`, error); 
          if (i === retries - 1) { // 最後一次重試仍失敗
            if (error.message && (error.message.includes('offline') || error.message.includes('network-request-failed'))) {
              setErrorMsg('⚠️ 網路連線被阻擋！\n請關閉「擋廣告軟體 (如 AdBlock)」或「Brave 瀏覽器盾牌」，或切換網路後重新整理網頁。');
            } else {
              setErrorMsg('無法連接資料庫！請確認您的 Firebase 專案已啟用「匿名登入 (Anonymous)」。');
            }
          } else {
            // 等待 1s, 2s 進行重試
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          }
        }
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
    }, (error) => {
      console.error("Firestore error:", error);
      if (error.message && (error.message.includes('offline') || error.message.includes('network-request-failed'))) {
        setErrorMsg('網路不穩或被阻擋，無法取得最新資料，請檢查連線或關閉廣告阻擋器。');
      } else {
        setErrorMsg('讀取資料失敗，請確認 Firestore 規則已設定允許讀寫。');
      }
    });

    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
    const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const roomRecords = allData
        .filter(exp => exp.roomId === activeRoomId)
        .sort((a, b) => {
          if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
          return (b.timestamp || 0) - (a.timestamp || 0);
        });
      setRecords(roomRecords);
    });
    return () => { unsubscribeRoom(); unsubscribeExpenses(); };
  }, [user, activeRoomId]);

  // ==========================================
  // 自動對焦與防呆聯動
  // ==========================================
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
  // 核心功能 (房間管理)
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
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) {
        setErrorMsg('網路連線異常：請檢查網路，或關閉擋廣告擴充功能後重試。');
      } else {
        setErrorMsg('建立房間失敗');
      }
    }
    setIsLoading(false);
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!currentUserRole) { setErrorMsg('請先點選「我是誰」喔！'); return; }
    if (!roomCode || !roomPin) { setErrorMsg('請輸入房間代碼和密碼'); return; }
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
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) {
        setErrorMsg('網路連線異常：請檢查網路，或關閉擋廣告軟體(AdBlock)後重試。');
      } else {
        setErrorMsg('加入房間失敗，請確認資料庫連線');
      }
    }
    setIsLoading(false);
  };

  const quickJoinRoom = async (savedRoom) => {
    setIsLoading(true); setErrorMsg('');
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
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) {
        setErrorMsg('網路連線異常：請檢查網路，或嘗試關閉擋廣告防毒軟體後重試。');
      } else {
        setErrorMsg('快速登入失敗');
      }
    }
    setIsLoading(false);
  };

  // ==========================================
  // 紀錄 CRUD
  // ==========================================
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

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

      if (editRecordId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', editRecordId), recordData);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), recordData);
      
      resetForm(); setShowAddForm(false);
    } catch (err) { 
      console.error('儲存失敗:', err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) {
         alert('儲存失敗：網路連線異常，請檢查網路連線或關閉擋廣告軟體。');
      } else {
         alert('儲存失敗，請確認連線'); 
      }
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
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id)); } 
    catch (err) { 
      console.error('刪除失敗:', err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('刪除失敗：網路連線異常，請檢查連線');
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
  // 帳戶餘額計算與設定
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
      console.error("儲存餘額失敗:", err);
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('儲存失敗：網路連線異常，請檢查連線');
      else alert("儲存餘額失敗");
    }
  };

  // ==========================================
  // 選項設定功能
  // ==========================================
  const handleAddOption = async (field) => {
    const value = newOptionInputs[field].trim();
    if (!value || !currentRoom) return;
    try {
      const currentArray = currentRoom[field] || [];
      if (!currentArray.includes(value)) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [field]: [...currentArray, value] });
      setNewOptionInputs({ ...newOptionInputs, [field]: '' });
    } catch (err) { 
      console.error("更新選項失敗:", err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('更新失敗：網路連線異常');
    }
  };

  const handleDeleteOption = async (field, valueToRemove) => {
    if (!currentRoom) return;
    try {
      const currentArray = currentRoom[field] || [];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [field]: currentArray.filter(item => item !== valueToRemove) });
    } catch (err) { 
      console.error("刪除選項失敗:", err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('刪除失敗：網路連線異常');
    }
  };

  const handleAddCategoryItem = async (category) => {
    const val = newCategoryItemInput.trim();
    if (!val || !currentRoom || !category) return;
    try {
      const currentCatItems = currentRoom.categoryItems || {};
      const itemsForCat = currentCatItems[category] || [];
      if (!itemsForCat.includes(val)) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [`categoryItems.${category}`]: [...itemsForCat, val] });
      }
      setNewCategoryItemInput('');
    } catch (err) { 
      console.error("更新分類項目失敗:", err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('更新失敗：網路連線異常');
    }
  };

  const handleDeleteCategoryItem = async (category, valueToRemove) => {
    if (!currentRoom || !category) return;
    try {
      const currentCatItems = currentRoom.categoryItems || {};
      const itemsForCat = currentCatItems[category] || [];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [`categoryItems.${category}`]: itemsForCat.filter(i => i !== valueToRemove) });
    } catch (err) { 
      console.error("刪除分類項目失敗:", err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('刪除失敗：網路連線異常');
    }
  };

  const handleAddRule = async () => {
    if (!newRuleItem || !newRuleMerchant || !activeRoomId) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { [`autoFillRules.${newRuleItem}`]: newRuleMerchant });
      setNewRuleItem(''); setNewRuleMerchant('');
    } catch (err) { 
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('新增失敗：網路連線異常');
    }
  };

  const handleDeleteRule = async (itemToRemove) => {
    try {
      const newRules = { ...currentRoom.autoFillRules };
      delete newRules[itemToRemove];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { autoFillRules: newRules });
    } catch (err) { 
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('刪除失敗：網路連線異常');
    }
  }

  const handleAddMethodRule = async () => {
    if (!newMethodRuleMerchant || !newMethodRuleMethod || !activeRoomId) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), {
        [`methodRules.${newMethodRuleMerchant}`]: { method: newMethodRuleMethod, subMethod: newMethodRuleSubMethod }
      });
      setNewMethodRuleMerchant(''); setNewMethodRuleMethod(''); setNewMethodRuleSubMethod('');
    } catch (err) { 
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('新增失敗：網路連線異常');
    }
  };

  const handleDeleteMethodRule = async (merchant) => {
    try {
      const newRules = { ...currentRoom.methodRules };
      delete newRules[merchant];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { methodRules: newRules });
    } catch (err) { 
      console.error(err); 
      if (err.message && (err.message.includes('offline') || err.message.includes('network-request-failed'))) alert('刪除失敗：網路連線異常');
    }
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

  const getTodayString = () => {
    const options = { month: 'numeric', day: 'numeric', weekday: 'long' };
    return new Date().toLocaleDateString('zh-TW', options);
  };

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

  // ==========================================
  // UI 輔助組件
  // ==========================================
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
        {label && <label className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-2.5 ml-1">{Icon && <Icon size={14} className="text-gray-400" />} {label}</label>}
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = values.includes(opt);
            const isDisabled = isPayer && ((opt === '全家' && hasIndividuals) || (opt !== '全家' && hasFamily));
            return (
              <button key={opt} type="button" onClick={() => handleToggle(opt)} className={`px-4 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-200 ${isSelected ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : isDisabled ? 'bg-gray-100 text-gray-300 border-2 border-transparent cursor-not-allowed opacity-60' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-100 shadow-sm'}`}>{opt}</button>
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

  // --- 如果尚未連線成功 (沒有 user)，顯示精美錯誤或載入畫面 ---
  if (!user) {
    return (
      <div className={globalWrapperStyle}>
        <div className={`${phoneContainerStyle} justify-center items-center p-6`}>
          {errorMsg ? (
            <div className="bg-red-50 text-red-500 font-bold p-6 rounded-[2rem] flex flex-col items-center gap-4 border border-red-100 shadow-sm text-center w-full">
              <AlertCircle size={40} />
              <p className="text-[15px] leading-relaxed">{errorMsg}</p>
              <button onClick={() => window.location.reload()} className="mt-2 bg-white text-red-500 px-6 py-2.5 rounded-xl text-[14px] shadow-sm border border-red-100 transition hover:bg-red-50">重新整理</button>
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
        <div className="flex flex-col items-center mb-10 w-full">
          <div className="bg-gradient-to-tr from-[#FFF4B8] to-[#FFD580] p-6 rounded-[2rem] mb-6 shadow-md"><Sparkles size={48} className="text-white drop-shadow-sm" strokeWidth={2.5} /></div>
          <h1 className="text-2xl font-black text-gray-800 mb-1 flex items-center gap-2">❤️ 林北一家 🏠</h1>
          <p className="text-sm font-bold text-gray-400">紀錄專屬的小財庫</p>
        </div>
        {errorMsg && <div className="w-full bg-red-50 text-red-500 font-bold p-4 rounded-2xl mb-4 flex items-center justify-center gap-2 text-sm shadow-sm border border-red-100"><AlertCircle size={18} /> {errorMsg}</div>}
        <form onSubmit={handleJoinRoom} className="space-y-6 w-full bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2 ml-1">家庭通關代碼</label>
            <input type="text" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 transition" placeholder="例如：linbei" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2 ml-1">房間密碼 (初次建立請自訂)</label>
            <input type="password" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 transition" placeholder="輸入密碼" value={roomPin} onChange={(e) => setRoomPin(e.target.value)} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2 ml-1">我是誰？</label>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setCurrentUserRole('老公')} className={`p-4 rounded-[1.5rem] font-bold text-lg flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老公' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👨 老公</button>
              <button type="button" onClick={() => setCurrentUserRole('老婆')} className={`p-4 rounded-[1.5rem] font-bold text-lg flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老婆' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👩 老婆</button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-gray-800 text-white font-extrabold text-lg p-4 rounded-[1.5rem] hover:bg-gray-700 shadow-md transition active:scale-95 disabled:opacity-50 mt-4">{isLoading ? '處理中...' : '開啟小財庫 🚀'}</button>
        </form>
        <div className="mt-8 text-center w-full">
          <button onClick={() => {setView('create'); setErrorMsg('');}} className="text-gray-400 text-sm font-bold hover:text-gray-600 transition bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100">💡 建立新的家庭房間</button>
        </div>
        {savedRooms.length > 0 && (
          <div className="w-full mt-8 pt-6">
            <p className="text-[12px] font-bold text-gray-400 mb-3 text-center">快速切換最近房間</p>
            <div className="space-y-3">
              {savedRooms.map(r => (
                <button key={r.id} type="button" onClick={() => quickJoinRoom(r)} className="w-full bg-white border-2 border-gray-100 p-4 rounded-[1.5rem] hover:border-blue-300 hover:shadow-md transition flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-500"><Home size={18} /></div>
                    <span className="font-extrabold text-gray-700 text-base">{r.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1.5 rounded-lg">{r.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
            <label className="block text-[13px] font-bold text-gray-500 mb-2 ml-1">我是...</label>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setCurrentUserRole('老公')} className={`p-4 rounded-[1.5rem] font-bold text-lg flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老公' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👨 老公</button>
              <button type="button" onClick={() => setCurrentUserRole('老婆')} className={`p-4 rounded-[1.5rem] font-bold text-lg flex justify-center items-center gap-2 transition-all duration-200 ${currentUserRole === '老婆' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 transform -translate-y-1' : 'bg-gray-50 border-2 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>👩 老婆</button>
            </div>
          </div>
          <input type="text" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 transition" placeholder="🏠 房間名稱 (例: 林北小財庫)" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          <input type="text" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 transition" placeholder="🎀 自訂通關代碼 (需唯一)" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          <input type="password" className="w-full bg-gray-50 text-center border-2 border-gray-100 p-4 rounded-[1.5rem] focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 transition" placeholder="🔑 設定房間密碼" value={roomPin} onChange={(e) => setRoomPin(e.target.value)} />
          <button type="submit" disabled={isLoading} className="w-full bg-green-500 text-white font-extrabold text-lg p-4 rounded-[1.5rem] hover:bg-green-600 shadow-md transition active:scale-95 mt-4">{isLoading ? '處理中...' : '建立並進入 🚀'}</button>
        </form>
        <div className="mt-8 text-center w-full">
           <button onClick={() => {setView('login'); setErrorMsg('');}} className="text-gray-400 text-sm font-bold hover:text-gray-600 transition bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100">返回登入</button>
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
            <h1 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><Landmark size={24} className="text-white/80"/> 帳戶總覽</h1>
            <div className="flex gap-2">
              {isEditingBalances ? (
                <button onClick={handleSaveBalances} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition text-sm font-bold backdrop-blur-sm">儲存</button>
              ) : (
                <button onClick={() => { setTempBalances(currentRoom?.initialBalances || {}); setIsEditingBalances(true); }} className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition text-[12px] font-bold backdrop-blur-sm">初始餘額</button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 space-y-5 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 text-center shadow-sm relative overflow-hidden">
             <div className="absolute -right-6 -top-6 bg-indigo-50 w-24 h-24 rounded-full opacity-50"></div>
             <p className="text-indigo-400 font-extrabold text-sm mb-1 relative z-10">💰 總資產淨值</p>
             <p className={`text-4xl font-black relative z-10 ${netWorth < 0 ? 'text-red-500' : 'text-indigo-700'}`}>${netWorth.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-emerald-50">
             <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Wallet size={18} className="text-emerald-500"/> 現金餘額</h2>
             <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-[1rem] border border-gray-100">
                <span className="font-bold text-gray-600">現金</span>
                {isEditingBalances ? (
                   <input type="number" className="w-24 text-right border-2 border-emerald-200 focus:border-emerald-400 p-1.5 rounded-lg font-bold outline-none transition" value={tempBalances['現金'] || ''} onChange={e => setTempBalances({...tempBalances, '現金': e.target.value})} placeholder="0" />
                ) : (
                   <span className={`font-black text-[18px] ${cashBal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${cashBal.toLocaleString()}</span>
                )}
             </div>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-blue-50">
             <div className="flex justify-between items-end mb-4">
               <h2 className="font-bold text-gray-700 flex items-center gap-2"><Landmark size={18} className="text-blue-500"/> 銀行餘額</h2>
               <span className="text-[12px] font-extrabold text-blue-400 bg-blue-50 px-2.5 py-1 rounded-lg">小計: ${bankTotal.toLocaleString()}</span>
             </div>
             <div className="space-y-2">
               {banks.length === 0 && <p className="text-gray-400 text-sm font-bold text-center py-4 bg-gray-50 rounded-2xl">無銀行帳戶，請至設定新增</p>}
               {banks.map(b => {
                 const bal = balances[b] || 0;
                 return (
                   <div key={b} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-[1rem] border border-gray-100">
                      <span className="font-bold text-gray-600 text-[14px] truncate pr-2">{b}</span>
                      {isEditingBalances ? (
                         <input type="number" className="w-24 text-right border-2 border-blue-200 focus:border-blue-400 p-1.5 rounded-lg font-bold outline-none transition" value={tempBalances[b] || ''} onChange={e => setTempBalances({...tempBalances, [b]: e.target.value})} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[16px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}
             </div>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-orange-50">
             <div className="flex justify-between items-end mb-4">
               <h2 className="font-bold text-gray-700 flex items-center gap-2"><CreditCard size={18} className="text-orange-500"/> 信用卡刷卡金額</h2>
               <span className="text-[12px] font-extrabold text-orange-400 bg-orange-50 px-2.5 py-1 rounded-lg">小計: ${ccTotal.toLocaleString()}</span>
             </div>
             <div className="space-y-2">
               {ccs.length === 0 && <p className="text-gray-400 text-sm font-bold text-center py-4 bg-gray-50 rounded-2xl">無信用卡，請至設定新增</p>}
               {ccs.map(c => {
                 const bal = balances[c] || 0;
                 return (
                   <div key={c} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-[1rem] border border-gray-100">
                      <span className="font-bold text-gray-600 text-[14px] truncate pr-2">{c}</span>
                      {isEditingBalances ? (
                         <input type="number" className="w-24 text-right border-2 border-orange-200 focus:border-orange-400 p-1.5 rounded-lg font-bold outline-none transition" value={tempBalances[c] || ''} onChange={e => setTempBalances({...tempBalances, [c]: e.target.value})} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[16px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}
             </div>
             <p className="text-[11px] font-bold text-orange-400 mt-4 bg-orange-50 p-2.5 rounded-[1rem] text-center">* 信用卡金額通常為負數（代表應繳卡費或負債），轉帳繳費後金額會回升。</p>
          </div>
        </main>
      </>
    );
  }
  // --- 畫面：房間內部 (首頁報表與明細) ---
  else if (view === 'room' && !showAddForm) {
    content = (
      <>
        <header className="bg-gradient-to-r from-pink-400 to-orange-400 px-5 py-6 shadow-md shrink-0 z-10 rounded-b-[2rem] border-b-4 border-white/20">
          <div className="flex justify-between items-start mb-5">
            <div className="flex flex-col">
              <div className="relative flex items-center gap-2 mb-1">
                <div className="relative bg-white/20 backdrop-blur-md rounded-[1rem] shadow-sm border border-white/30 px-3 py-1.5 flex items-center overflow-hidden cursor-pointer hover:bg-white/30 transition">
                  <input type="date" value={homeFilterDate} onChange={(e) => setHomeFilterDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <Calendar size={18} className="text-white mr-2"/>
                  <span className="text-white text-[18px] font-black drop-shadow-sm">
                    {homeFilterDate ? new Date(homeFilterDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }) : '全部日期'}
                  </span>
                  <span className="text-white/70 text-[10px] ml-2">▼</span>
                </div>
                {homeFilterDate && (
                  <button onClick={() => setHomeFilterDate('')} className="bg-white/20 text-white text-[12px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-white/30 transition backdrop-blur-sm">清除</button>
                )}
              </div>
              <p className="text-white/90 text-[15px] font-extrabold mt-1 ml-1 flex items-center gap-1.5 drop-shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-300 inline-block"></span> {currentUserRole}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBackup} className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition backdrop-blur-sm" title="備份雲端資料"><Download size={18} /></button>
              <button onClick={() => { setSettingsTab('expense'); setView('settings'); }} className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition backdrop-blur-sm" title="設定"><Settings size={18} /></button>
              <button onClick={() => { setActiveRoomId(null); setView('login'); setRoomPin(''); }} className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition backdrop-blur-sm" title="登出"><LogOut size={18} /></button>
            </div>
          </div>
          
          <div className="flex justify-between items-end bg-white/95 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-lg mt-2">
             <div className="flex flex-col">
                <span className="text-gray-400 text-[11px] font-bold mb-0.5">總支出</span>
                <span className="text-pink-500 font-black text-[16px]"> ${totalExpense.toLocaleString()}</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-gray-400 text-[11px] font-bold mb-0.5">總收入</span>
                <span className="text-green-500 font-black text-[16px]"> ${totalIncome.toLocaleString()}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-gray-400 text-[11px] font-bold mb-0.5">總結餘</span>
                <span className={`font-black text-[22px] leading-tight ${netBalance < 0 ? 'text-red-500' : 'text-gray-800'}`}>${netBalance.toLocaleString()}</span>
             </div>
          </div>
        </header>

        <main className="p-4 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div>
            <h3 className="font-bold text-gray-400 mb-4 ml-1 flex items-center gap-2 text-sm">📜 記帳明細</h3>
            {displayRecords.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 font-medium">
                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                   <PiggyBank size={28} className="text-orange-400" />
                </div>
                <p>目前還沒有紀錄，快使用下方按鈕開始記帳吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayRecords.map((exp) => {
                  const isIncome = exp.type === 'income';
                  const isTransfer = exp.type === 'transfer';
                  const displayDate = exp.date ? exp.date.replace(/-/g, '/') : new Date(exp.timestamp).toLocaleDateString();
                  const payerStr = Array.isArray(exp.payer) ? exp.payer.join(', ') : exp.payer;
                  
                  let freqDisplay = exp.frequency;
                  if (freqDisplay === '區間') freqDisplay = exp.frequencyInterval === '自訂' ? exp.frequencyCustomText : exp.frequencyInterval;
                  
                  return (
                    <div key={exp.id} className="bg-white p-4 sm:p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex justify-between items-center group relative hover:shadow-md transition duration-300">
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1.5 rounded-r-lg ${isIncome ? 'bg-green-400' : isTransfer ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                      
                      <div className="flex-1 pl-4 overflow-hidden">
                        <p className="text-[11px] font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                          {displayDate} 
                          {freqDisplay && freqDisplay !== '一次' && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-md">{freqDisplay}</span>}
                          {exp.addedByRole && <span className="bg-gray-100 px-1.5 py-0.5 rounded-md text-gray-500">{exp.addedByRole}</span>}
                        </p>
                        
                        {isTransfer ? (
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="font-bold text-[12px] px-2 py-0.5 rounded-md whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-100">🔄 轉帳</span>
                            <p className="font-black text-gray-800 text-lg truncate">{exp.method} ➜ {exp.transferToMethod}</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className={`font-bold text-[12px] px-2.5 py-1 rounded-lg whitespace-nowrap border ${isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                              {exp.category}
                            </span>
                            <p className="font-black text-gray-800 text-lg truncate">{exp.title}</p>
                          </div>
                        )}

                        <p className="text-[11px] font-bold text-gray-400 flex flex-wrap gap-x-2 gap-y-1.5 items-center mt-1">
                          {payerStr && payerStr !== '未指定' && <span className="bg-gray-50 px-2 py-1 rounded-md">👤 {payerStr}</span>}
                          {!isTransfer && exp.method && exp.method !== '未指定' && <span className="bg-gray-50 px-2 py-1 rounded-md">💳 {exp.method}{exp.subMethod ? `(${exp.subMethod})` : ''}</span>}
                          {exp.merchant && exp.merchant !== '未指定' && <span className="bg-gray-50 px-2 py-1 rounded-md">🏪 {exp.merchant}</span>}
                          {exp.note && <span className="bg-[#FFFDF9] border border-[#F2EFE9] text-gray-500 px-2 py-1 rounded-md">📝 {exp.note}</span>}
                        </p>
                      </div>

                      <div className="flex flex-col items-end pl-2 shrink-0">
                        <span className={`font-black text-[20px] ${isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-gray-800'}`}>
                          {isIncome ? '+' : isTransfer ? '⇆' : '-'}${exp.amount.toLocaleString()}
                        </span>
                        <div className="flex gap-1.5 mt-3">
                          <button onClick={() => setCrossRoomRecord(exp)} className="text-gray-400 hover:text-orange-500 font-bold p-1.5 transition bg-gray-50 hover:bg-orange-50 rounded-lg" title="傳送到其他房間"><Send size={15} /></button>
                          <button onClick={() => handleCopyRecord(exp)} className="text-gray-400 hover:text-green-500 font-bold p-1.5 transition bg-gray-50 hover:bg-green-50 rounded-lg" title="複製此筆"><Copy size={15} /></button>
                          <button onClick={() => openEditForm(exp)} className="text-gray-400 hover:text-blue-500 font-bold p-1.5 transition bg-gray-50 hover:bg-blue-50 rounded-lg" title="編輯"><Pencil size={15} /></button>
                          <button onClick={() => handleDeleteRecord(exp.id)} className="text-gray-400 hover:text-red-500 font-bold p-1.5 transition bg-gray-50 hover:bg-red-50 rounded-lg" title="刪除"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </>
    );
  }
  // --- 畫面：新增/編輯紀錄表單 ---
  else if (view === 'room' && showAddForm) {
    const isIncome = recordType === 'income';
    const isTransfer = recordType === 'transfer';
    const titleEmoji = isIncome ? '💸' : isTransfer ? '🔄' : '🛍️';
    
    // 定義各類型的顏色主題
    const themeBg = isIncome ? 'bg-green-400' : isTransfer ? 'bg-blue-400' : 'bg-orange-400';
    const themeText = isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-orange-500';
    const themeBorder = isIncome ? 'border-green-100' : isTransfer ? 'border-blue-100' : 'border-orange-100';
    
    const daysOfWeek = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const daysOfMonth = Array.from({length: 31}, (_, i) => (i + 1).toString());
    const intervalOptions = ['3個月', '半年', '一年', '自訂'];
    
    content = (
      <>
        <header className={`${themeBg} text-white px-5 py-5 shadow-md shrink-0 z-10 border-b-4 border-white/20 rounded-b-[2rem]`}>
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black flex items-center gap-2 drop-shadow-md">
              {editRecordId ? '✏️ 編輯' : '✨ 新增'}
              {isIncome ? '收入' : isTransfer ? '轉帳' : '支出'} {titleEmoji}
            </h1>
            <button onClick={() => { setShowAddForm(false); resetForm(); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition backdrop-blur-sm shadow-inner">
              <X size={20} strokeWidth={3} />
            </button>
          </div>
        </header>

        <main className="p-4 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <form onSubmit={handleSaveRecord} className="space-y-4">
            
            <div className={`bg-white rounded-[2rem] p-6 shadow-sm border-2 ${themeBorder} text-center mb-4 relative overflow-hidden`}>
               <div className={`absolute top-0 left-0 w-full h-2 ${themeBg} opacity-20`}></div>
               <p className={`${themeText} font-extrabold text-[13px] mb-2`}>輸入金額 💰</p>
               <input 
                 ref={amountInputRef}
                 type="number" placeholder="0" required min="0"
                 className={`text-center text-[48px] font-black w-full outline-none bg-transparent text-gray-800 placeholder-gray-200`} 
                 value={recordAmount} onChange={(e) => setRecordAmount(e.target.value)} 
               />
            </div>

            <div className={`bg-white rounded-[2rem] p-6 shadow-sm border-2 ${themeBorder}`}>
              <div className="grid grid-cols-2 gap-3 mb-6 z-40">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-2.5 ml-1"><Calendar size={14} className="text-gray-400" /> 日期 🗓️</label>
                  <input type="date" required className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.2rem] p-3.5 focus:bg-white focus:border-blue-400 outline-none text-gray-700 font-bold transition shadow-sm" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
                </div>
                {recordType === 'expense' && (
                  <div className="z-40">
                    <CustomDropdown label="頻率 🔄" icon={RefreshCw} options={['一次', '每週', '每月', '區間']} value={recordFrequency} onChange={setRecordFrequency} placeholder="選擇頻率" />
                  </div>
                )}
              </div>

              {recordType === 'expense' && recordFrequency === '每週' && (
                <div className="mb-6 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <label className="text-[12px] font-bold text-gray-500 mb-3 block">請選擇星期 (可複選)</label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(d => (
                      <button key={d} type="button" onClick={() => toggleFrequencyDay(d)} className={`px-3 py-2 rounded-xl text-[13px] font-bold transition-all ${recordFrequencyDays.includes(d) ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {recordType === 'expense' && recordFrequency === '每月' && (
                <div className="mb-6 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <label className="text-[12px] font-bold text-gray-500 mb-3 block">請選擇日期 (可複選)</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {daysOfMonth.map(d => (
                      <button key={d} type="button" onClick={() => toggleFrequencyDay(d)} className={`aspect-square rounded-xl text-[12px] font-bold transition-all ${recordFrequencyDays.includes(d) ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {recordType === 'expense' && recordFrequency === '區間' && (
                <div className="mb-6 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <label className="text-[12px] font-bold text-gray-500 mb-3 block">請選擇時間區間</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                      {intervalOptions.map(opt => (
                          <button key={opt} type="button" onClick={() => setRecordFrequencyInterval(opt)} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${recordFrequencyInterval === opt ? 'bg-[#FFE28A] text-gray-800 shadow-md border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>{opt}</button>
                      ))}
                  </div>
                  {recordFrequencyInterval === '自訂' && (
                      <input type="text" placeholder="自行填寫區間 (例如: 100天)" value={recordFrequencyCustomText} onChange={e => setRecordFrequencyCustomText(e.target.value)} className="w-full bg-white border-2 border-gray-100 p-3.5 rounded-xl font-bold text-sm outline-none focus:border-[#FCD34D] transition shadow-sm" />
                  )}
                </div>
              )}

              {recordType === 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-3 z-30 mb-6">
                    <CustomDropdown label="主分類 📂" options={currentRoom?.categories || []} value={recordCategory} onChange={(val) => { setRecordCategory(val); setSelectedItem(''); }} placeholder="選擇分類..." />
                    <CustomDropdown label="項目清單 🛒" options={currentRoom?.categoryItems?.[recordCategory] || []} value={selectedItem} onChange={setSelectedItem} placeholder="選擇項目..." />
                  </div>

                  <div className="flex flex-col gap-3 mb-6 z-20">
                     <CustomDropdown label="商家 🏪" icon={Store} options={currentRoom?.merchants || []} value={recordMerchant} onChange={setRecordMerchant} placeholder="選擇商家..." />
                     <PillGroupMulti label="花費對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  </div>

                  <div className="mb-2 z-10">
                    <label className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-2.5 ml-1"><CreditCard size={14} className="text-gray-400" /> 付款方式 💳</label>
                    <div className="flex bg-gray-50 rounded-[1.2rem] p-1.5 border border-gray-100 mb-3 shadow-inner">
                      {(currentRoom?.paymentMethods || []).map(opt => (
                        <button key={opt} type="button" onClick={() => handleMethodSelect(opt)} className={`flex-1 py-2.5 px-1 rounded-[1rem] text-[13px] font-extrabold transition-all duration-200 truncate ${recordMethod === opt ? 'bg-white text-blue-600 shadow-md border border-gray-100 transform scale-100' : 'text-gray-400 hover:text-gray-600 scale-95'}`}>{opt}</button>
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
                <label className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-2.5 ml-1">📝 備註 (選填)</label>
                <input type="text" placeholder="輸入額外備註..." className="bg-gray-50 border-2 border-gray-100 rounded-[1.2rem] p-3.5 focus:bg-white focus:border-blue-400 outline-none w-full text-gray-700 font-bold transition shadow-sm" value={recordNote} onChange={(e) => setRecordNote(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={!isFormValid} className={`w-full font-extrabold text-[16px] py-4 mt-6 rounded-[1.5rem] transition-all duration-300 shadow-lg ${isFormValid ? `${themeBg} text-white hover:opacity-90 transform hover:-translate-y-1 active:translate-y-0` : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 shadow-none'}`}>
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
        <h3 className="font-bold text-gray-700 mb-4 text-[16px] flex items-center gap-2">{title}</h3>
        <div className="flex flex-wrap gap-2.5 mb-5">
          {(currentRoom?.[field] || []).map(item => (
            <span key={item} className={`px-3.5 py-2 rounded-[1rem] text-[13px] font-bold flex items-center gap-1.5 shadow-sm ${spanClass}`}>
              {item} <button onClick={() => handleDeleteOption(field, item)} className="hover:opacity-60 transition ml-1"><X size={14} strokeWidth={3} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2.5">
          <input type="text" value={newOptionInputs[field]} onChange={(e) => setNewOptionInputs({...newOptionInputs, [field]: e.target.value})} placeholder={placeholder} className={`flex-1 border-2 ${themeClass} bg-gray-50 rounded-[1.2rem] p-3 outline-none focus:bg-white transition text-[14px] font-bold`} onKeyPress={(e) => e.key === 'Enter' && handleAddOption(field)} />
          <button onClick={() => handleAddOption(field)} className={`${btnClass} text-white px-5 py-3 rounded-[1.2rem] text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95`}>新增</button>
        </div>
      </div>
    );

    content = (
      <>
        <header className="bg-gradient-to-r from-purple-400 to-pink-400 px-6 py-6 shadow-md shrink-0 z-10 rounded-b-[2rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><Settings size={24} className="text-white/80"/> 選項設定</h1>
            <button onClick={() => setView('room')} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition text-sm font-bold backdrop-blur-sm">返回</button>
          </div>
        </header>

        <main className="p-4 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="text-center mb-6 mt-2">
            <p className="text-purple-500 font-bold bg-purple-50 border border-purple-100 inline-block px-5 py-2.5 rounded-full text-[12px] shadow-sm">💡 在此編輯的項目，全家人的畫面都會同步更新喔！</p>
          </div>
          
          <div className="flex bg-white rounded-[1.2rem] p-1.5 border-2 border-gray-100 mb-6 shadow-sm">
             <button onClick={() => setSettingsTab('expense')} className={`flex-1 py-2.5 px-1 rounded-[1rem] text-[14px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'expense' ? 'bg-orange-400 text-white shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600 bg-gray-50 scale-95'}`}>支出</button>
             <button onClick={() => setSettingsTab('income')} className={`flex-1 py-2.5 px-1 rounded-[1rem] text-[14px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'income' ? 'bg-green-500 text-white shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600 bg-gray-50 scale-95'}`}>收入</button>
             <button onClick={() => setSettingsTab('transfer')} className={`flex-1 py-2.5 px-1 rounded-[1rem] text-[14px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'transfer' ? 'bg-blue-500 text-white shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600 bg-gray-50 scale-95'}`}>轉帳</button>
          </div>

          <div className="space-y-2">
            {settingsTab === 'expense' && (
              <>
                {renderSetting('🌸 支出主分類', 'categories', '輸入新分類...', 'border-pink-100', 'bg-pink-50 text-pink-600', 'bg-pink-400')}
                
                <div className={`p-6 rounded-[2rem] border-2 border-pink-100 bg-white shadow-sm mb-6`}>
                  <h3 className="font-bold text-gray-700 mb-4 text-[16px] flex items-center gap-2">📝 編輯「分類」專屬項目清單</h3>
                  <select value={settingSelectedCategory} onChange={e => setSettingSelectedCategory(e.target.value)} className="w-full bg-pink-50 border-2 border-pink-100 p-3.5 rounded-[1.2rem] outline-none mb-5 font-bold text-pink-700 shadow-sm cursor-pointer appearance-none">
                      <option value="">請先選擇一個主分類...</option>
                      {(currentRoom?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {settingSelectedCategory && (
                      <>
                          <div className="flex flex-wrap gap-2.5 mb-5">
                              {(currentRoom?.categoryItems?.[settingSelectedCategory] || []).map(item => (
                                  <span key={item} className="px-3.5 py-2 rounded-[1rem] text-[13px] font-bold flex items-center gap-1.5 shadow-sm bg-white border border-pink-100 text-pink-600">
                                      {item} <button onClick={() => handleDeleteCategoryItem(settingSelectedCategory, item)} className="hover:opacity-60 ml-1"><X size={14} strokeWidth={3} /></button>
                                  </span>
                              ))}
                          </div>
                          <div className="flex gap-2.5">
                              <input type="text" value={newCategoryItemInput} onChange={(e) => setNewCategoryItemInput(e.target.value)} placeholder={`新增項目...`} className="flex-1 border-2 border-pink-100 bg-gray-50 rounded-[1.2rem] p-3 outline-none font-bold text-[14px] focus:bg-white transition" onKeyPress={(e) => e.key === 'Enter' && handleAddCategoryItem(settingSelectedCategory)}/>
                              <button onClick={() => handleAddCategoryItem(settingSelectedCategory)} className="bg-pink-400 text-white px-5 py-3 rounded-[1.2rem] text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95">新增</button>
                          </div>
                      </>
                  )}
                </div>

                {renderSetting('🏪 常見商家', 'merchants', '輸入新商家...', 'border-orange-100', 'bg-orange-50 text-orange-600', 'bg-orange-400')}
                
                <div className={`p-6 rounded-[2rem] border-2 border-orange-100 bg-white shadow-sm mb-6`}>
                  <h3 className="font-bold text-gray-700 mb-4 text-[16px] flex items-center gap-2">🤖 商家預設規則</h3>
                  <div className="flex flex-col gap-3 mb-5">
                    {Object.entries(currentRoom?.autoFillRules || {}).map(([item, merchant]) => (
                      <div key={item} className="flex justify-between items-center bg-orange-50 p-3.5 rounded-[1.2rem] border border-orange-100 shadow-sm">
                        <span className="text-[14px] font-bold text-orange-700">[{item}] ➜ {merchant}</span>
                        <button onClick={() => handleDeleteRule(item)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-lg shadow-sm"><X size={14} strokeWidth={3}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100">
                     <select value={newRuleItem} onChange={e=>setNewRuleItem(e.target.value)} className="w-full border-2 border-orange-100 p-3 rounded-[1.2rem] font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                       <option value="">選擇觸發的項目...</option>
                       {Object.values(currentRoom?.categoryItems || {}).flat().map(i => <option key={i} value={i}>{i}</option>)}
                     </select>
                     <div className="flex gap-2.5">
                       <select value={newRuleMerchant} onChange={e=>setNewRuleMerchant(e.target.value)} className="flex-1 border-2 border-orange-100 p-3 rounded-[1.2rem] font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                         <option value="">選擇預設商家...</option>
                         {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <button onClick={handleAddRule} className="bg-orange-400 text-white px-5 py-3 rounded-[1.2rem] text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95">新增</button>
                     </div>
                  </div>
                </div>

                {renderSetting('👥 對象', 'payers', '輸入新人名...', 'border-gray-200', 'bg-gray-100 text-gray-600', 'bg-gray-800')}
                {renderSetting('💳 信用卡清單', 'creditCards', '輸入信用卡銀行...', 'border-blue-100', 'bg-blue-50 text-blue-600', 'bg-blue-400')}
                {renderSetting('🏦 銀行帳戶清單', 'bankAccounts', '輸入銀行名稱...', 'border-indigo-100', 'bg-indigo-50 text-indigo-600', 'bg-indigo-400')}
                
                <div className={`p-6 rounded-[2rem] border-2 border-blue-100 bg-white shadow-sm mb-6`}>
                  <h3 className="font-bold text-gray-700 mb-4 text-[16px] flex items-center gap-2">🤖 付款方式預設規則</h3>
                  <div className="flex flex-col gap-3 mb-5">
                    {Object.entries(currentRoom?.methodRules || {}).map(([merchant, rule]) => (
                      <div key={merchant} className="flex justify-between items-center bg-blue-50 p-3.5 rounded-[1.2rem] border border-blue-100 shadow-sm">
                        <span className="text-[14px] font-bold text-blue-700">[{merchant}] ➜ {rule.method} {rule.subMethod ? `(${rule.subMethod})` : ''}</span>
                        <button onClick={() => handleDeleteMethodRule(merchant)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-lg shadow-sm"><X size={14} strokeWidth={3}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100">
                     <select value={newMethodRuleMerchant} onChange={e=>setNewMethodRuleMerchant(e.target.value)} className="w-full border-2 border-blue-100 p-3 rounded-[1.2rem] font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                       <option value="">選擇觸發的商家...</option>
                       {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                     <div className="flex flex-col gap-3">
                       <select value={newMethodRuleMethod} onChange={e=>{
                           setNewMethodRuleMethod(e.target.value);
                           if (e.target.value === '信用卡 / 行動支付' || e.target.value === '信用卡') setNewMethodRuleSubMethod(currentRoom?.creditCards?.[0] || '');
                           else if (e.target.value === '銀行') setNewMethodRuleSubMethod(currentRoom?.bankAccounts?.[0] || '');
                           else setNewMethodRuleSubMethod('');
                         }} className="w-full border-2 border-blue-100 p-3 rounded-[1.2rem] font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                         <option value="">預設付款方式...</option>
                         {(currentRoom?.paymentMethods || []).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <div className="flex gap-2.5">
                         {(newMethodRuleMethod === '信用卡 / 行動支付' || newMethodRuleMethod === '信用卡') && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border-2 border-blue-100 p-3 rounded-[1.2rem] font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">選擇信用卡...</option>
                             {(currentRoom?.creditCards || []).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                         )}
                         {newMethodRuleMethod === '銀行' && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border-2 border-blue-100 p-3 rounded-[1.2rem] font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">選擇銀行...</option>
                             {(currentRoom?.bankAccounts || []).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                         )}
                         <button onClick={handleAddMethodRule} className="bg-blue-400 text-white px-5 py-3 rounded-[1.2rem] text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95 ml-auto">新增規則</button>
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
            <h1 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><BarChart size={24} className="text-white/80"/> 統計分析</h1>
            <button onClick={() => setView('room')} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition text-sm font-bold backdrop-blur-sm">返回</button>
          </div>
        </header>

        <main className="p-4 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-5">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-teal-50">
            
            <div className="mb-6">
               <label className="block text-[13px] font-bold text-gray-500 mb-3 ml-1">分析類型 (單選)</label>
               <div className="flex bg-gray-50 rounded-[1.2rem] p-1.5 border border-gray-100 shadow-inner">
                 {['expense', 'income', 'transfer'].map(type => {
                    const label = type === 'expense' ? '支出' : type === 'income' ? '收入' : '轉帳';
                    const isSel = analysisType === type;
                    const activeColor = type === 'expense' ? 'bg-orange-400' : type === 'income' ? 'bg-green-500' : 'bg-blue-500';
                    return (
                      <button key={type} onClick={() => handleAnalysisTypeChange(type)} className={`flex-1 py-2.5 rounded-[1rem] text-[14px] font-extrabold transition-all duration-200 ${isSel ? `${activeColor} text-white shadow-md transform scale-100` : 'text-gray-400 hover:text-gray-600 scale-95'}`}>
                        {label}
                      </button>
                    )
                 })}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-2 ml-1">開始日期</label>
                <input type="date" value={analysisStartDate} onChange={e => setAnalysisStartDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-[1.2rem] outline-none font-bold text-gray-700 text-sm focus:bg-white focus:border-teal-300 transition shadow-sm" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-2 ml-1">結束日期</label>
                <input type="date" value={analysisEndDate} onChange={e => setAnalysisEndDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-[1.2rem] outline-none font-bold text-gray-700 text-sm focus:bg-white focus:border-teal-300 transition shadow-sm" />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-bold text-gray-500 mb-3 ml-1">分析選單 (可複選)</label>
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
                      className={`px-4 py-2 rounded-[1rem] text-[13px] font-bold transition-all duration-200 ${isSelected ? 'bg-[#A7F3D0] text-teal-800 border-2 border-[#34D399] shadow-sm transform -translate-y-0.5' : 'bg-white text-gray-500 border-2 border-gray-100 hover:bg-gray-50 shadow-sm'}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {analysisMenus.length > 0 && (
              <div className="pt-5 border-t-2 border-dashed border-gray-100 space-y-5">
                <label className="block text-[12px] font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg inline-block">💡 依選擇選單篩選細項 (不選代表全部分析)</label>
                
                {analysisMenus.includes('category') && (
                  <PillGroupMulti label="🌸 主分類" options={currentRoom?.categories || []} values={analysisSubSelections.category} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, category: vals})} />
                )}
                {analysisMenus.includes('title') && (
                  <div className="mb-5 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
                    <label className="block text-[12px] font-bold text-gray-500 mb-3">請先選擇上方的主分類篩選，這裡會列出對應的項目讓您勾選</label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const targetCats = analysisSubSelections.category.length > 0 ? analysisSubSelections.category : Object.keys(currentRoom?.categoryItems || {});
                        const itemsToShow = [...new Set(targetCats.flatMap(c => currentRoom?.categoryItems?.[c] || []))];
                        return itemsToShow.map(item => (
                          <button key={item} onClick={() => {
                             let newVals = [...analysisSubSelections.title];
                             if (newVals.includes(item)) newVals = newVals.filter(v => v !== item); else newVals.push(item);
                             setAnalysisSubSelections({...analysisSubSelections, title: newVals});
                          }} className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${analysisSubSelections.title.includes(item) ? 'bg-[#A7F3D0] text-teal-800 border-2 border-[#34D399] shadow-sm' : 'bg-white text-gray-500 border-2 border-gray-100'}`}>
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
            <h2 className="font-bold text-teal-700 mb-6 text-[16px] flex items-center gap-2"><LucidePieChart size={18} className="text-teal-400"/> 統計結果</h2>
            <MyCustomPieChart data={chartData} colors={chartColors} />
            
            <div className="mt-8 space-y-3">
              {chartData.length === 0 ? (
                <p className="text-center text-gray-400 font-bold text-sm bg-gray-50 py-4 rounded-2xl">此條件沒有紀錄喔！</p>
              ) : (
                chartData.map((d, idx) => (
                  <div key={d.label} className="flex justify-between items-center bg-gray-50 p-4 rounded-[1.2rem] border border-gray-100 hover:shadow-sm transition">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                      <span className="font-bold text-gray-700 text-[15px] truncate max-w-[150px]">{d.label}</span>
                    </div>
                    <span className="font-black text-gray-800 text-[18px]">${d.value.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  // 統一底部的圓角設計與背景
  return (
    <div className={globalWrapperStyle}>
      <div className={phoneContainerStyle}>
        {content}
        {/* 全域底部導航 (只在非登入且非新增表單時顯示) */}
        {user && view !== 'login' && view !== 'create' && !showAddForm && (
          <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl p-2 pb-6 sm:pb-5 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] grid grid-cols-5 gap-1.5 z-20 border-t border-gray-100">
            <button onClick={() => setView('accounts')} className={`bg-white border-2 hover:bg-gray-50 text-gray-600 rounded-[1.2rem] py-2 flex flex-col items-center justify-center gap-1 transition shadow-sm ${view === 'accounts' ? 'border-indigo-300 shadow-md transform -translate-y-1' : 'border-gray-100'}`}>
              <Wallet size={20} className={view === 'accounts' ? 'text-indigo-500' : 'text-gray-400'} />
              <span className={`font-extrabold text-[11px] ${view === 'accounts' ? 'text-indigo-600' : ''}`}>帳戶</span>
            </button>
            <button onClick={() => { resetForm(); setRecordType('expense'); setShowAddForm(true); }} className="bg-white border-2 border-gray-100 hover:bg-orange-50 hover:border-orange-200 text-gray-600 rounded-[1.2rem] py-2 flex flex-col items-center justify-center gap-1 transition shadow-sm">
              <MinusCircle size={20} className="text-orange-400"/>
              <span className="font-extrabold text-[11px]">支出</span>
            </button>
            <button onClick={() => { resetForm(); setRecordType('income'); setShowAddForm(true); }} className="bg-white border-2 border-gray-100 hover:bg-green-50 hover:border-green-200 text-gray-600 rounded-[1.2rem] py-2 flex flex-col items-center justify-center gap-1 transition shadow-sm">
              <PlusCircle size={20} className="text-green-500"/>
              <span className="font-extrabold text-[11px]">收入</span>
            </button>
            <button onClick={() => { resetForm(); setRecordType('transfer'); setShowAddForm(true); }} className="bg-white border-2 border-gray-100 hover:bg-blue-50 hover:border-blue-200 text-gray-600 rounded-[1.2rem] py-2 flex flex-col items-center justify-center gap-1 transition shadow-sm">
              <RefreshCw size={20} className="text-blue-500"/>
              <span className="font-extrabold text-[11px]">轉帳</span>
            </button>
            <button onClick={() => setView('analysis')} className={`bg-white border-2 hover:bg-gray-50 text-gray-600 rounded-[1.2rem] py-2 flex flex-col items-center justify-center gap-1 transition shadow-sm ${view === 'analysis' ? 'border-teal-300 shadow-md transform -translate-y-1' : 'border-gray-100'}`}>
              <BarChart size={20} className={view === 'analysis' ? 'text-teal-500' : 'text-gray-400'} />
              <span className={`font-extrabold text-[11px] ${view === 'analysis' ? 'text-teal-600' : ''}`}>統計</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
