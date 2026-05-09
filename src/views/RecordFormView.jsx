import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Calendar, RefreshCw, Store, User, CreditCard, Wallet, Tag, Camera, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { doc, collection, writeBatch, deleteField } from 'firebase/firestore';
import { db, appId } from '../firebase/firebaseConfig';
import { getLocalTodayStr, toROCYearStr, evaluateCalc, generateFutureDates } from '../utils/helpers';
import { CustomDropdown, MethodSelector, PillGroupMulti } from '../components/SharedUI'; // 確保這三個有搬到 SharedUI.jsx

const RecordFormView = ({ 
  user, activeRoomId, currentRoom, currentUserRole, records, 
  recordToEdit, // 傳入 null 代表新增，傳入物件代表編輯
  onClose, setCrossRoomRecord 
}) => {
  // 將原本 App.js 的狀態全部移到這裡（獨立封裝）
  const [recordType, setRecordType] = useState('expense');
  const [recordAmount, setRecordAmount] = useState('0');
  const [recordDate, setRecordDate] = useState(getLocalTodayStr());
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
  const [transferToMethod, setTransferToMethod] = useState('');
  const [transferToSubMethod, setTransferToSubMethod] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [recordPhoto, setRecordPhoto] = useState(null);
  const [excludeFromBalance, setExcludeFromBalance] = useState(false);
  
  const [showCalc, setShowCalc] = useState(false);
  const [calcStr, setCalcStr] = useState('0');
  
  const photoInputRef = useRef(null);
  const recordDateInputRef = useRef(null);

  // 初始化資料 (判斷是新增還是編輯)
  useEffect(() => {
    if (recordToEdit) {
      setRecordType(recordToEdit.type || 'expense');
      setRecordAmount(recordToEdit.amount.toString());
      setCalcStr(recordToEdit.amount.toString());
      setRecordDate(recordToEdit.date || new Date(recordToEdit.timestamp).toISOString().split('T')[0]);
      setRecordFrequency(recordToEdit.frequency || '一次');
      setRecordFrequencyDays(recordToEdit.frequencyDays || []);
      setRecordFrequencyInterval(recordToEdit.frequencyInterval || '');
      setRecordFrequencyCustomText(recordToEdit.frequencyCustomText || '');
      setRecordNote(recordToEdit.note || '');
      setRecordPayer(Array.isArray(recordToEdit.payer) ? recordToEdit.payer : (recordToEdit.payer && recordToEdit.payer !== '未指定' ? [recordToEdit.payer] : []));
      setRecordCategory(recordToEdit.category === '未指定' ? '' : recordToEdit.category);
      setRecordMethod(recordToEdit.method === '未指定' ? '' : recordToEdit.method);
      setRecordSubMethod(recordToEdit.subMethod || '');
      setRecordPhoto(recordToEdit.photoBase64 || null);
      setExcludeFromBalance(recordToEdit.excludeFromBalance || false);
      
      if (recordToEdit.type === 'expense' || !recordToEdit.type) { 
        setSelectedItem(recordToEdit.title); 
        setRecordMerchant(recordToEdit.merchant === '未指定' ? '' : recordToEdit.merchant); 
      } else if (recordToEdit.type === 'transfer') {
        setTransferToMethod(recordToEdit.transferToMethod === '未指定' ? '' : recordToEdit.transferToMethod);
        setTransferToSubMethod(recordToEdit.transferToSubMethod || '');
      }
    }
  }, [recordToEdit]);

  // 表單驗證邏輯
  let isFormValid = false;
  const parsedAmt = Number(String(recordAmount).replace(/,/g, '').replace(/[^\d]/g, ''));
  if (parsedAmt > 0 && recordDate && recordPayer.length > 0) {
    if (recordType === 'expense') isFormValid = !!(recordCategory && selectedItem && recordMethod);
    else if (recordType === 'income') isFormValid = !!(recordCategory && recordMethod);
    else if (recordType === 'transfer') isFormValid = !!(recordCategory && recordMethod && transferToMethod);

    if (isFormValid) {
      const needsSubMethod = (m) => ['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(m);
      if (needsSubMethod(recordMethod) && !recordSubMethod) isFormValid = false;
      if (recordType === 'transfer' && needsSubMethod(transferToMethod) && !transferToSubMethod) isFormValid = false;
      if (recordFrequency === '每週' && recordFrequencyDays.length === 0) isFormValid = false;
      if (recordFrequency === '區間' && !recordFrequencyInterval) isFormValid = false;
      if (recordFrequency === '區間' && recordFrequencyInterval === '自訂' && !recordFrequencyCustomText) isFormValid = false;
    }
  }

  // 拍照/上傳圖片邏輯
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = null;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_SIZE = 800;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setRecordPhoto(canvas.toDataURL('image/jpeg', 0.4));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 儲存邏輯 (直接從 App.js 搬運)
  const handleSaveRecord = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid || !user) return;
    try {
      const isEditing = !!recordToEdit;
      let updateFuture = false;
      if (isEditing && recordToEdit?.groupId) updateFuture = window.confirm('這是一筆設定了「週期」的紀錄。\n\n是否要一併變更此系列「未來」的所有紀錄？');
      else if (isEditing && !recordToEdit?.groupId && recordFrequency !== '一次') updateFuture = true;
      
      const currentGroupId = recordToEdit?.groupId || null;
      let newGroupId = isEditing ? (updateFuture ? (currentGroupId || Date.now().toString()) : currentGroupId) : (recordFrequency === '一次' ? null : Date.now().toString());
      if (recordFrequency === '一次') newGroupId = null;

      const baseData = {
        roomId: activeRoomId, type: recordType, amount: parsedAmt, date: recordDate, frequency: recordFrequency || '一次', 
        frequencyDays: recordFrequencyDays, frequencyInterval: recordFrequencyInterval, frequencyCustomText: recordFrequencyCustomText,
        method: recordMethod || '未指定', subMethod: recordSubMethod || '', note: recordNote, addedBy: user.uid, 
        addedByRole: currentUserRole, groupId: newGroupId, photoBase64: recordPhoto || null,
        excludeFromBalance: recordType === 'transfer' ? false : excludeFromBalance
      };

      if (recordType === 'expense') { baseData.payer = recordPayer; baseData.category = recordCategory; baseData.title = selectedItem; baseData.merchant = recordMerchant; }
      else if (recordType === 'income') { baseData.payer = recordPayer; baseData.category = recordCategory; baseData.title = '收入'; }
      else if (recordType === 'transfer') { baseData.payer = recordPayer; baseData.category = recordCategory; baseData.title = '轉帳'; baseData.transferToMethod = transferToMethod; baseData.transferToSubMethod = transferToSubMethod; }

      const batch = writeBatch(db);
      if (!isEditing) {
        batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...baseData, timestamp: Date.now() });
        if (recordFrequency !== '一次') {
          generateFutureDates(recordDate, recordFrequency, recordFrequencyDays, recordFrequencyInterval, recordFrequencyCustomText, 1).forEach(d => {
            const [y, m, day] = d.split('-').map(Number);
            const safeTs = new Date(y, m - 1, day, 7, 0, 0).getTime();
            batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...baseData, date: d, timestamp: safeTs });
          });
        }
      } else {
        const curRef = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', recordToEdit.id);
        if (!recordPhoto && recordToEdit?.photoBase64) baseData.photoBase64 = deleteField();
        if (!updateFuture && recordToEdit?.groupId) { baseData.frequency = '一次'; baseData.frequencyDays = []; baseData.frequencyInterval = ''; }
        batch.update(curRef, { ...baseData, timestamp: recordToEdit.timestamp });
        if (updateFuture && currentGroupId) {
          records.filter(r => r.groupId === currentGroupId && r.date > recordToEdit.date && r.id !== recordToEdit.id).forEach(r => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id)));
        }
        if (updateFuture && recordFrequency !== '一次') {
          generateFutureDates(recordDate, recordFrequency, recordFrequencyDays, recordFrequencyInterval, recordFrequencyCustomText, 1).filter(d => d > recordDate).forEach(d => {
            const [y, m, day] = d.split('-').map(Number);
            const safeTs = new Date(y, m - 1, day, 7, 0, 0).getTime();
            batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...baseData, date: d, timestamp: safeTs });
          });
        }
      }

      await batch.commit();

      let shouldPrompt = !isEditing && recordType === 'expense' && currentRoom?.promptCashSync && !excludeFromBalance;
      if (shouldPrompt && currentRoom?.excludedPromptPayers?.length > 0) {
        const payers = Array.isArray(recordPayer) ? recordPayer : [recordPayer];
        if (payers.some(p => currentRoom.excludedPromptPayers.includes(p))) shouldPrompt = false;
      }
      if (shouldPrompt) setCrossRoomRecord({ ...baseData, id: `auto_${Date.now()}` });

      onClose(); // 關閉表單
    } catch (err) { alert('儲存過程發生錯誤！'); }
  };

  const isIncome = recordType === 'income'; const isTransfer = recordType === 'transfer';
  const themeBg = isIncome ? 'bg-green-500' : isTransfer ? 'bg-blue-500' : 'bg-orange-500';
  const themeText = isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-orange-500';
  const themeBorder = isIncome ? 'border-green-100' : isTransfer ? 'border-blue-100' : 'border-orange-100';
  const daysOfWeek = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  
  // 計算機按鍵設定
  const calcKeys = [
    { label: 'C', color: 'bg-[#FFD1DC] text-[#9F1239] shadow-sm font-black' },
    { label: ' ⌫ ', color: 'bg-[#FFE4B5] text-[#9A3412] shadow-sm font-black' },
    { label: '(', color: 'bg-[#F1F5F9] text-slate-600 shadow-sm font-bold' },
    { label: ')', color: 'bg-[#F1F5F9] text-slate-600 shadow-sm font-bold' },
    { label: '7', color: 'bg-[#E0E7FF] text-[#3730A3] shadow-sm font-black' },
    { label: '8', color: 'bg-[#E0E7FF] text-[#3730A3] shadow-sm font-black' },
    { label: '9', color: 'bg-[#E0E7FF] text-[#3730A3] shadow-sm font-black' },
    { label: '÷', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[22px]' },
    { label: '4', color: 'bg-[#CCFBF1] text-[#115E59] shadow-sm font-black' },
    { label: '5', color: 'bg-[#CCFBF1] text-[#115E59] shadow-sm font-black' },
    { label: '6', color: 'bg-[#CCFBF1] text-[#115E59] shadow-sm font-black' },
    { label: '×', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[22px]' },
    { label: '1', color: 'bg-[#D1FAE5] text-[#065F46] shadow-sm font-black' },
    { label: '2', color: 'bg-[#D1FAE5] text-[#065F46] shadow-sm font-black' },
    { label: '3', color: 'bg-[#D1FAE5] text-[#065F46] shadow-sm font-black' },
    { label: '-', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[24px]' },
    { label: '0', color: 'bg-[#FCE7F3] text-[#9D174D] shadow-sm font-black' },
    { label: '.', color: 'bg-[#FCE7F3] text-[#9D174D] shadow-sm font-black' },
    { label: '=', color: 'bg-[#38BDF8] text-white shadow-md font-black text-[24px]' },
    { label: '+', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[24px]' }
  ];

  return (
    <>
      {/* --- 表單 Header --- */}
      <header className={`${themeBg} text-white px-4 py-3 shadow-md shrink-0 z-10 border-b-4 border-white/20 rounded-b-[1.5rem] transition-colors duration-300`}>
        <div className="flex justify-between items-center mb-2.5">
          <h1 className="text-xl font-black flex items-center gap-2 drop-shadow-md">{recordToEdit ? ' ✏️ 編輯紀錄' : ' ✨ 新增紀錄'} {isIncome ? '💸' : isTransfer ? '🔄' : '🛍️'}</h1>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition shadow-inner"><X size={20} strokeWidth={3} /></button>
        </div>
        {!recordToEdit && (
          <div className="flex bg-white/20 p-1 rounded-xl shadow-inner mb-1">
            <button type="button" onClick={() => setRecordType('expense')} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] transition-all ${recordType === 'expense' ? 'bg-white text-orange-500 shadow-sm scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>支出</button>
            <button type="button" onClick={() => setRecordType('income')} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] transition-all ${recordType === 'income' ? 'bg-white text-green-500 shadow-sm scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>收入</button>
            <button type="button" onClick={() => setRecordType('transfer')} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] transition-all ${recordType === 'transfer' ? 'bg-white text-blue-500 shadow-sm scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>轉帳</button>
          </div>
        )}
      </header>

      {/* --- 表單主體 --- */}
      <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[80px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <form onSubmit={handleSaveRecord} className="space-y-3">
          {/* 金額輸入框 (觸發計算機) */}
          <div role="button" tabIndex={0} onClick={() => { setCalcStr(String(recordAmount || '0')); setShowCalc(true); }} className={`w-full block bg-white rounded-2xl pt-2.5 pb-2 px-4 shadow-sm border-2 ${themeBorder} text-center relative cursor-pointer active:scale-[0.98] transition-transform select-none`}>
            <div className={`absolute top-0 left-0 w-full h-1.5 ${themeBg} opacity-20`}></div>
            <p className={`${themeText} font-extrabold text-[13px] mb-1 flex items-center justify-center gap-1.5`}>輸入金額 💰 <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-400 flex items-center gap-1"><Calculator size={12}/> 點擊計算</span></p>
            <div className={`text-center text-[36px] leading-none font-black text-gray-800 py-1 tracking-tight`}>{recordAmount === '' || recordAmount === '0' ? '0' : Number(String(recordAmount).replace(/,/g, '')).toLocaleString()}</div>
          </div>

          {/* 表單細節 */}
          <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${themeBorder}`}>
            <div className="grid grid-cols-2 gap-2 mb-3.5 z-40">
              {/* 日期選擇 */}
              <div>
                <label className="flex items-center justify-between text-[14px] font-bold text-gray-500 mb-2 ml-1 pr-1">
                  <span className="flex items-center gap-1.5"><Calendar size={16} className="text-gray-400" /> 日期 🗓️</span>
                  <button type="button" onClick={() => setRecordDate(getLocalTodayStr())} className={`px-2 py-1 rounded text-[12px] font-bold transition-all duration-300 shadow-sm ${recordDate === getLocalTodayStr() ? `${themeBg} text-white scale-105 shadow-md` : 'bg-gray-200 text-gray-700'}`}>今天</button>
                </label>
                <div className="relative w-full bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex items-center shadow-sm cursor-pointer hover:bg-white transition overflow-hidden">
                  <input type="date" required className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
                  <span className="font-bold text-gray-700 text-[15px] z-0 pointer-events-none">{recordDate ? toROCYearStr(recordDate) : '選擇日期'}</span>
                </div>
              </div>
              {/* 頻率選擇 */}
              <div className="z-40">
                <CustomDropdown label="頻率 🔄" icon={RefreshCw} options={['一次', '每週', '每月', '區間']} value={recordFrequency} onChange={(val) => { setRecordFrequency(val); setRecordFrequencyDays([]); setRecordFrequencyInterval(''); setRecordFrequencyCustomText(''); }} placeholder="選擇頻率" />
              </div>
            </div>

            {/* 各類型專屬欄位 */}
            {recordType === 'expense' && (
              <>
                <div className="grid grid-cols-2 gap-2 z-30 mb-3.5">
                  <CustomDropdown label="主分類 📂" options={currentRoom?.categories || []} value={recordCategory} onChange={(val) => { setRecordCategory(val); setSelectedItem(''); }} placeholder="選擇分類..." />
                  <CustomDropdown label="項目清單 🛒" options={currentRoom?.categoryItems?.[recordCategory] || []} value={selectedItem} onChange={setSelectedItem} placeholder="選擇項目..." />
                </div>
                <div className="flex items-end gap-2 mb-3.5 z-20 w-full">
                  <div className="flex-1 min-w-0">
                    <CustomDropdown label="商家 🏪" icon={Store} options={currentRoom?.merchants || []} value={recordMerchant} onChange={setRecordMerchant} placeholder="選擇商家..." />
                  </div>
                  <label className="shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition shadow-sm">
                    <input type="checkbox" checked={excludeFromBalance} onChange={e => setExcludeFromBalance(e.target.checked)} className="w-4 h-4 rounded text-orange-500" />
                    <span className="font-bold text-[13px] text-gray-500">不計入</span>
                  </label>
                </div>
                <PillGroupMulti label="花費對象 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                <MethodSelector label="付款方式 💳" icon={CreditCard} method={recordMethod} subMethod={recordSubMethod} setMethod={setRecordMethod} setSubMethod={setRecordSubMethod} currentRoom={currentRoom} />
              </>
            )}

            {recordType === 'income' && (
              <>
                <div className="z-30 mb-3.5 flex items-end gap-2 w-full">
                  <div className="flex-1 min-w-0">
                    <CustomDropdown label="收入分類 📈" icon={Tag} options={currentRoom?.incomeCategories || []} value={recordCategory} onChange={setRecordCategory} placeholder="選擇分類..." />
                  </div>
                  <label className="shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition shadow-sm">
                    <input type="checkbox" checked={excludeFromBalance} onChange={e => setExcludeFromBalance(e.target.checked)} className="w-4 h-4 rounded text-green-500" />
                    <span className="font-bold text-[13px] text-gray-500">不計入</span>
                  </label>
                </div>
                <PillGroupMulti label="對象 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                <MethodSelector label="存入帳戶 🏦" icon={Wallet} method={recordMethod} subMethod={recordSubMethod} setMethod={setRecordMethod} setSubMethod={setRecordSubMethod} currentRoom={currentRoom} />
              </>
            )}

            {recordType === 'transfer' && (
              <>
                <div className="z-40 mb-3.5"><CustomDropdown label="轉帳分類 🔄" icon={Tag} options={currentRoom?.transferCategories || []} value={recordCategory} onChange={setRecordCategory} placeholder="選擇分類..." /></div>
                <PillGroupMulti label="對象 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                <MethodSelector label=" 📤 轉出帳戶 (扣款)" icon={Wallet} method={recordMethod} subMethod={recordSubMethod} setMethod={setRecordMethod} setSubMethod={setRecordSubMethod} currentRoom={currentRoom} />
                <MethodSelector label=" 📥 轉入帳戶 (存入)" icon={Wallet} method={transferToMethod} subMethod={transferToSubMethod} setMethod={setTransferToMethod} setSubMethod={setTransferToSubMethod} currentRoom={currentRoom} />
              </>
            )}

            {/* 備註與相片 */}
            <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex gap-2 items-start">
              <div className="flex-1 w-full min-w-0">
                <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 ml-1">📝 備註 (選填)</label>
                <input type="text" placeholder="輸入額外備註..." className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 focus:bg-white focus:border-blue-400 outline-none w-full text-gray-700 font-bold text-[15px] transition shadow-sm" value={recordNote} onChange={(e) => setRecordNote(e.target.value)} />
              </div>
              <div className="shrink-0 w-[86px]">
                <label className="flex items-center justify-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 w-full text-center">📷 照片</label>
                <div className="relative w-[86px] h-[46px] flex gap-1.5 group">
                  {recordPhoto ? (
                    <div className="relative w-full h-full bg-gray-50 border border-gray-100 rounded-xl shadow-sm overflow-hidden cursor-pointer">
                      <img src={recordPhoto} alt="預覽" className="w-full h-full object-cover" />
                      <div onClick={() => setRecordPhoto(null)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition"><Trash2 size={18} className="text-white" /></div>
                    </div>
                  ) : (
                    <>
                      <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-200 transition flex items-center justify-center cursor-pointer overflow-hidden"><Camera size={18} className="text-gray-500" /><input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} /></div>
                      <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-200 transition flex items-center justify-center cursor-pointer overflow-hidden"><ImageIcon size={18} className="text-gray-500" /><input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} /></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={!isFormValid} className={`w-full font-extrabold text-[18px] py-3.5 mt-1 rounded-[1.2rem] transition-all duration-300 shadow-md ${isFormValid ? `${themeBg} text-white hover:-translate-y-1` : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 shadow-none'}`}>
            {isFormValid ? '儲存紀錄 ✨' : '請填寫完整資料'}
          </button>
        </form>
      </main>

      {/* --- 計算機彈跳視窗 Modal --- */}
      {showCalc && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex flex-col justify-center items-center p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setRecordAmount(evaluateCalc(calcStr)); setShowCalc(false); }}>
          <div className="bg-gray-50 w-full max-w-[320px] rounded-[2rem] p-5 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 font-bold text-[14px] flex items-center gap-1.5"><Calculator size={16}/> 智慧計算機</span>
              <button onClick={() => { setRecordAmount(evaluateCalc(calcStr)); setShowCalc(false); }} className="text-gray-500 bg-gray-200 hover:bg-gray-300 rounded-full p-1.5 transition"><X size={16}/></button>
            </div>
            <div className="text-right text-[38px] font-black text-gray-800 mb-4 overflow-x-auto whitespace-nowrap pb-1.5 border-b-2 border-gray-200 tracking-wider">{calcStr}</div>
            <div className="grid grid-cols-4 gap-2">
              {calcKeys.map(k => (
                <button key={k.label} onClick={() => {
                  if (k.label === 'C') setCalcStr('0');
                  else if (k.label === ' ⌫ ') setCalcStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
                  else if (k.label === '=') setCalcStr(prev => evaluateCalc(prev));
                  else setCalcStr(prev => prev === '0' && !['+','-','×','÷','.'].includes(k.label) ? k.label : prev + k.label);
                }} className={`py-4 rounded-xl text-[20px] active:scale-95 transition-transform flex items-center justify-center shadow-sm ${k.color}`}>
                  {k.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setRecordAmount(evaluateCalc(calcStr)); setShowCalc(false); }} className={`w-full mt-3 ${themeBg} text-white py-3.5 rounded-xl font-black text-[18px] shadow-md active:scale-95 transition flex justify-center items-center gap-2`}>
              <Check size={20}/> 確認金額
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RecordFormView;
