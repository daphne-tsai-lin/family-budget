import React, { useState, useEffect, useRef, useContext } from 'react';
import { ChevronLeft, Save, Upload, Tag, Store, Receipt, Calendar, Settings, Image as ImageIcon, Camera, Calculator, Wallet, PiggyBank, Check, Trash2, Sparkles, User, RefreshCw, X, CreditCard } from 'lucide-react';
import { collection, doc, writeBatch, deleteField } from 'firebase/firestore';
import { db, appId } from '../firebase/firebaseConfig';
import { CustomDropdown, MethodSelector, PillGroupMulti } from '../components/SharedUI';
// 💡 核心修復：正確將路徑指向 helpers，徹底解決 Vercel 編譯失敗
import { AppContext, getLocalTodayStr, generateFutureDates, evaluateCalc, toROCYearStr } from '../utils/helpers';

const RecordFormView = ({ recordToEdit, copyRecordData, onClose, setCrossRoomRecord }) => {
  const { user, activeRoomId, currentRoom, currentUserRole, records } = useContext(AppContext);

  const [record, setRecord] = useState(() => {
    if (recordToEdit) return recordToEdit;
    if (copyRecordData) {
      const { id, groupId, ...rest } = copyRecordData;
      return { ...rest, date: getLocalTodayStr() };
    }
    return {
      type: 'expense', amount: '', date: getLocalTodayStr(),
      category: currentRoom?.categories?.[0] || '🍔 飲食',
      title: '', merchant: '', method: '現金', subMethod: '', transferToMethod: '', transferToSubMethod: '',
      payer: ['全家'], note: '', photoBase64: '', excludeFromBalance: false,
      frequency: '一次', frequencyDays: [], frequencyInterval: '2個月', frequencyCustomText: '10'
    };
  });

  const [calcInput, setCalcInput] = useState((recordToEdit || copyRecordData) ? String((recordToEdit || copyRecordData).amount) : '');
  const [amount, setAmount] = useState((recordToEdit || copyRecordData) ? (recordToEdit || copyRecordData).amount : 0);
  const [isUploading, setIsUploading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const recordDateInputRef = useRef(null);

  useEffect(() => {
    if (!recordToEdit && !copyRecordData && record.title && currentRoom?.autoFillRules?.[record.title]) {
      setRecord(prev => ({ ...prev, merchant: currentRoom.autoFillRules[record.title] }));
    }
  }, [record.title, recordToEdit, copyRecordData, currentRoom]);

  useEffect(() => {
    if (!recordToEdit && !copyRecordData && record.merchant && currentRoom?.methodRules?.[record.merchant]) {
      const rule = currentRoom.methodRules[record.merchant];
      setRecord(prev => ({ ...prev, method: rule.method, subMethod: rule.subMethod || '' }));
    }
  }, [record.merchant, recordToEdit, copyRecordData, currentRoom]);

  let isFormValid = false;
  const parsedAmt = Number(String(amount).replace(/,/g, '').replace(/[^\d]/g, ''));
  if (parsedAmt > 0 && record.date && record.payer.length > 0) {
    if (record.type === 'expense' || !record.type) isFormValid = !!(record.category && record.title && record.method);
    else if (record.type === 'income') isFormValid = !!(record.category && record.method);
    else if (record.type === 'transfer') isFormValid = !!(record.category && record.method && record.transferToMethod);

    if (isFormValid) {
      const needsSubMethod = (m) => ['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(m);
      if (needsSubMethod(record.method) && !record.subMethod) isFormValid = false;
      if (record.type === 'transfer') { if (needsSubMethod(record.transferToMethod) && !record.transferToSubMethod) isFormValid = false; }
      if (record.frequency === '每週' && record.frequencyDays.length === 0) isFormValid = false;
      if (record.frequency === '區間' && !record.frequencyInterval) isFormValid = false;
      if (record.frequency === '區間' && record.frequencyInterval === '自訂' && !record.frequencyCustomText) isFormValid = false;
    }
  }

  const handleSave = async () => {
    if (!isFormValid || !user || isUploading) return;
    setIsUploading(true);
    try {
      const isEditing = !!recordToEdit;
      const oldRecord = isEditing ? recordToEdit : null;
      let updateFuture = false;

      const oldWasPeriodic = oldRecord?.groupId || (oldRecord && oldRecord.frequency !== '一次');
      if (isEditing && oldWasPeriodic) {
        updateFuture = window.confirm('此筆為週期性紀錄，請問一併變更未來紀錄嗎？');
      } else if (isEditing && !oldWasPeriodic && record.frequency !== '一次') {
        updateFuture = true;
      }

      const currentGroupId = oldRecord?.groupId || null;
      let newGroupId = null;
      if (isEditing) {
        if (updateFuture) newGroupId = record.frequency === '一次' ? null : (Date.now().toString() + Math.random().toString(36).substring(2, 9));
        else newGroupId = null;
      } else {
        newGroupId = record.frequency === '一次' ? null : (Date.now().toString() + Math.random().toString(36).substring(2, 9));
      }

      const timestamp = new Date(record.date + 'T07:00:00').getTime();
      const baseData = { ...record, amount: parsedAmt, timestamp, roomId: activeRoomId, addedBy: user.uid, addedByRole: currentUserRole, groupId: newGroupId };
      if (record.type === 'transfer') baseData.excludeFromBalance = false;

      Object.keys(baseData).forEach(key => {
        if (baseData[key] === undefined) delete baseData[key];
      });

      let batch = writeBatch(db);
      let opsCount = 0;

      const commitBatch = async () => {
        if (opsCount > 0) {
          await batch.commit();
          batch = writeBatch(db);
          opsCount = 0;
        }
      };

      if (!isEditing) {
        const docId = doc(collection(db, 'placeholder')).id;
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', docId), { ...baseData, timestamp: Date.now() }); 
        opsCount++;
        
        if (record.frequency !== '一次') {
          const dates = generateFutureDates(record.date, record.frequency, record.frequencyDays, record.frequencyInterval, record.frequencyCustomText, 1);
          for (const d of dates) {
            if (opsCount >= 490) await commitBatch();
            const [y, m, day] = d.split('-').map(Number);
            const safeTs = new Date(y, m - 1, day, 7, 0, 0).getTime();
            batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...baseData, date: d, timestamp: safeTs });
            opsCount++;
          }
        }
      } else {
        const curRef = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', recordToEdit.id);
        
        const updateData = { ...baseData, timestamp: oldRecord.timestamp || timestamp };
        if (!record.photoBase64 && oldRecord?.photoBase64) {
            updateData.photoBase64 = deleteField();
        }

        if (!updateFuture && oldWasPeriodic) {
            updateData.frequency = '一次'; updateData.frequencyDays = []; updateData.frequencyInterval = ''; updateData.frequencyCustomText = ''; updateData.groupId = null;
        }
        
        batch.update(curRef, updateData); 
        opsCount++;

        const futureBaseData = { ...baseData };
        delete futureBaseData.photoBase64;

        if (updateFuture && currentGroupId) {
          const futuresToDelete = records.filter(r => r.groupId === currentGroupId && r.date > oldRecord.date && r.id !== recordToEdit.id);
          for (const r of futuresToDelete) {
            if (opsCount >= 490) await commitBatch();
            batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id));
            opsCount++;
          }
        }
        if (updateFuture && record.frequency !== '一次') {
          const dates = generateFutureDates(record.date, record.frequency, record.frequencyDays, record.frequencyInterval, record.frequencyCustomText, 1).filter(d => d > record.date);
          for (const d of dates) {
            if (opsCount >= 490) await commitBatch();
            const [y, m, day] = d.split('-').map(Number);
            const safeTs = new Date(y, m - 1, day, 7, 0, 0).getTime();
            batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...futureBaseData, date: d, timestamp: safeTs });
            opsCount++;
          }
        }
      }
      
      if (opsCount > 0) await batch.commit();

      let shouldPrompt = !isEditing && (record.type === 'expense' || !record.type) && currentRoom.promptCashSync && !record.excludeFromBalance;
      if (shouldPrompt && currentRoom?.excludedPromptPayers?.length > 0) {
        const payers = Array.isArray(record.payer) ? record.payer : [record.payer];
        const isExcluded = payers.some(p => currentRoom.excludedPromptPayers.includes(p));
        if (isExcluded) shouldPrompt = false;
      }
      if (shouldPrompt) {
        setCrossRoomRecord({ ...baseData, id: `auto_${Date.now()}` });
      }
      onClose();
    } catch (err) { alert('儲存過程發生錯誤：' + err.message); } finally { setIsUploading(false); }
  };

  const calcKeys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '00', '.', '⌫'];
  
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image(); img.onload = () => {
        const canvas = document.createElement('canvas'); let width = img.width; let height = img.height; const MAX_SIZE = 800;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        setRecord(prev => ({ ...prev, photoBase64: canvas.toDataURL('image/jpeg', 0.5) }));
      }; img.src = event.target.result;
    }; reader.readAsDataURL(file);
  };

  const themeBg = record.type === 'income' ? 'bg-green-500' : record.type === 'transfer' ? 'bg-blue-500' : 'bg-orange-500';
  const themeBorder = record.type === 'income' ? 'border-green-100' : record.type === 'transfer' ? 'border-blue-100' : 'border-orange-100';
  const themeText = record.type === 'income' ? 'text-green-500' : record.type === 'transfer' ? 'text-blue-500' : 'text-orange-500';

  return (
    <div className="absolute inset-0 bg-[#FFFBF0] z-50 flex flex-col overflow-hidden">
      <header className={`${themeBg} text-white px-4 py-3 shadow-md shrink-0 z-10 border-b-4 border-white/20 rounded-b-[1.5rem] transition-colors duration-300`}>
        <div className="flex justify-between items-center mb-2.5">
          <h1 className="text-xl font-black flex items-center gap-2 drop-shadow-md">{recordToEdit ? '✏️ 編輯紀錄' : copyRecordData ? '✨ 複製新增' : '✨ 新增紀錄'}</h1>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition shadow-inner"><X size={20} strokeWidth={3} /></button>
        </div>
        {!recordToEdit && (
          <div className="flex bg-white/20 p-1 rounded-xl shadow-inner mb-1">
            <button type="button" onClick={() => { setRecord(prev => ({...prev, type: 'expense', category: currentRoom?.categories?.[0] || '', title: ''})); setCalcInput(''); setAmount(0); }} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] text-center transition-all ${record.type === 'expense' ? 'bg-white text-orange-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>支出</button>
            <button type="button" onClick={() => { setRecord(prev => ({...prev, type: 'income', category: currentRoom?.incomeCategories?.[0] || '', title: '收入'})); setCalcInput(''); setAmount(0); }} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] text-center transition-all ${record.type === 'income' ? 'bg-white text-green-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>收入</button>
            <button type="button" onClick={() => { setRecord(prev => ({...prev, type: 'transfer', category: currentRoom?.transferCategories?.[0] || '', title: '轉帳'})); setCalcInput(''); setAmount(0); }} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] text-center transition-all ${record.type === 'transfer' ? 'bg-white text-blue-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>轉帳</button>
          </div>
        )}
      </header>

      <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[80px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div role="button" tabIndex={0} className={`w-full block bg-white rounded-2xl pt-2.5 pb-2 px-4 shadow-sm border-2 ${themeBorder} text-center relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none`} onClick={() => { setCalcInput(String(amount || '0')); setShowCalc(true); }}>
          <div className={`absolute top-0 left-0 w-full h-1.5 ${themeBg} opacity-20`}></div>
          <p className={`${themeText} font-extrabold text-[13px] mb-1 flex items-center justify-center gap-1.5`}>輸入金額 💰 <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-400 flex items-center gap-1"><Calculator size={12}/> 點擊計算</span></p>
          <div className={`text-center text-[36px] leading-none font-black w-full text-gray-800 py-1 tracking-tight`}>{amount === '' || amount === 0 ? '0' : Number(amount).toLocaleString()}</div>
        </div>

        <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${themeBorder}`}>
          <div className="grid grid-cols-2 gap-2 mb-3.5 z-40">
            <div>
              <label className="flex items-center justify-between text-[14px] font-bold text-gray-500 mb-2 ml-1 w-full pr-1">
                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-gray-400" /> 日期 🗓️</span>
                <button type="button" onClick={() => setRecord(prev => ({...prev, date: getLocalTodayStr()}))} className={`px-2 py-1 rounded text-[12px] font-bold transition-all duration-300 shadow-sm ${record.date === getLocalTodayStr() ? `${themeBg} text-white scale-105 shadow-md` : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>今天</button>
              </label>
              <div className="relative w-full bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex items-center shadow-sm cursor-pointer hover:bg-white transition overflow-hidden" onClick={() => { if (recordDateInputRef.current) { try { recordDateInputRef.current.showPicker(); } catch (e) { recordDateInputRef.current.focus(); } } }}>
                <input ref={recordDateInputRef} type="date" required className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" value={record.date} onChange={(e) => setRecord(prev => ({...prev, date: e.target.value}))} />
                <span className="font-bold text-gray-700 text-[15px] z-0 pointer-events-none">{record.date ? toROCYearStr(record.date) : '選擇日期'}</span>
                <span className="absolute right-2 text-gray-400 text-[12px] z-0 pointer-events-none">▼</span>
              </div>
            </div>
            <div className="z-40">
              <CustomDropdown label="頻率 🔄" icon={RefreshCw} options={['一次', '每週', '每月', '區間']} value={record.frequency} onChange={(val) => { setRecord(prev => ({...prev, frequency: val, frequencyDays: [], frequencyInterval: '', frequencyCustomText: ''})); }} placeholder="選擇頻率" />
            </div>
          </div>

          {record.frequency === '每週' && (
            <div className="mb-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[14px] font-bold text-gray-500 mb-2 block">請選擇星期 (可複選)</label>
              <div className="flex flex-wrap gap-1.5">
                {['週一', '週二', '週三', '週四', '週五', '週六', '週日'].map(d => (
                  <button key={d} type="button" onClick={() => {
                    const newDays = record.frequencyDays.includes(d) ? record.frequencyDays.filter(v => v !== d) : [...record.frequencyDays, d];
                    setRecord(prev => ({...prev, frequencyDays: newDays}));
                  }} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all ${record.frequencyDays.includes(d) ? 'bg-[#FFE28A] text-gray-800 shadow-sm border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border border-gray-100'}`}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {record.frequency === '區間' && (
            <div className="mb-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['2個月', '3個月', '半年', '一年', '自訂'].map(opt => (
                  <button key={opt} type="button" onClick={() => setRecord(prev => ({...prev, frequencyInterval: opt}))} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all ${record.frequencyInterval === opt ? 'bg-[#FFE28A] text-gray-800 shadow-sm border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border border-gray-100'}`}>{opt}</button>
                ))}
              </div>
              {record.frequencyInterval === '自訂' && <input type="text" placeholder="自行填寫區間天數 (例如: 30)" value={record.frequencyCustomText} onChange={e => setRecord(prev => ({...prev, frequencyCustomText: e.target.value}))} className="w-full bg-white border border-gray-100 p-2.5 rounded-lg font-bold text-[14px] outline-none focus:border-[#FCD34D] transition shadow-sm" />}
            </div>
          )}

          {record.type === 'expense' && (
            <>
              <div className="grid grid-cols-2 gap-2 z-30 mb-3.5">
                <CustomDropdown label="主分類 📂" options={currentRoom?.categories || []} value={record.category} onChange={(val) => { setRecord(prev => ({...prev, category: val, title: ''})); }} placeholder="選擇分類..." />
                <CustomDropdown label="項目清單 🛒" options={currentRoom?.categoryItems?.[record.category] || []} value={record.title} onChange={(val) => { setRecord(prev => ({...prev, title: val})); }} placeholder="選擇項目..." />
              </div>
              <div className="flex items-end gap-2 mb-3.5 w-full">
                <div className="flex-1 min-w-0">
                  <CustomDropdown label="商家 🏪" icon={Store} options={currentRoom?.merchants || []} value={record.merchant} onChange={(val) => { setRecord(prev => ({...prev, merchant: val})); }} placeholder="選擇商家..." />
                </div>
                <label className="shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition shadow-sm">
                  <input type="checkbox" checked={record.excludeFromBalance} onChange={e => setRecord(prev => ({...prev, excludeFromBalance: e.target.checked}))} className="w-4 h-4 rounded border-gray-300 text-orange-500" />
                  <span className="font-bold text-[13px] text-gray-500">不計入</span>
                </label>
              </div>
              <div className="flex flex-col gap-3 mb-3.5 z-10">
                <PillGroupMulti label="花費對象 👥" icon={User} options={currentRoom?.payers || []} values={record.payer} onChange={v => setRecord(prev => ({...prev, payer: v}))} isPayer={true} />
              </div>
              <MethodSelector label="付款方式 💳" icon={CreditCard} method={record.method} subMethod={record.subMethod} setMethod={m => setRecord(prev => ({...prev, method: m}))} setSubMethod={sm => setRecord(prev => ({...prev, subMethod: sm}))} currentRoom={currentRoom} />
            </>
          )}

          {record.type === 'income' && (
            <>
              <div className="z-30 mb-3.5 flex items-end gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <CustomDropdown label="收入分類 📈" icon={Tag} options={currentRoom?.incomeCategories || []} value={record.category} onChange={v => setRecord(prev => ({...prev, category: v}))} placeholder="選擇收入分類..." />
                </div>
                <label className="shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition shadow-sm">
                  <input type="checkbox" checked={record.excludeFromBalance} onChange={e => setRecord(prev => ({...prev, excludeFromBalance: e.target.checked}))} className="w-4 h-4 rounded border-gray-300 text-green-500" />
                  <span className="font-bold text-[13px] text-gray-500">不計入</span>
                </label>
              </div>
              <PillGroupMulti label="對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={record.payer} onChange={v => setRecord(prev => ({...prev, payer: v}))} isPayer={true} />
              <MethodSelector label="存入帳戶 🏦" icon={Wallet} method={record.method} subMethod={record.subMethod} setMethod={m => setRecord(prev => ({...prev, method: m}))} setSubMethod={sm => setRecord(prev => ({...prev, subMethod: sm}))} currentRoom={currentRoom} />
            </>
          )}

          {record.type === 'transfer' && (
            <>
              <div className="z-40 mb-3.5">
                <CustomDropdown label="轉帳分類 🔄" icon={Tag} options={currentRoom?.transferCategories || []} value={record.category} onChange={v => setRecord(prev => ({...prev, category: v}))} placeholder="選擇轉帳分類..." />
              </div>
              <PillGroupMulti label="對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={record.payer} onChange={v => setRecord(prev => ({...prev, payer: v}))} isPayer={true} />
              <MethodSelector label="📤 轉出帳戶 (扣款)" icon={Wallet} method={record.method} subMethod={record.subMethod} setMethod={m => setRecord(prev => ({...prev, method: m}))} setSubMethod={sm => setRecord(prev => ({...prev, subMethod: sm}))} currentRoom={currentRoom} />
              <MethodSelector label="📥 轉入帳戶 (存入)" icon={PiggyBank} method={record.transferToMethod} subMethod={record.transferToSubMethod} setMethod={m => setRecord(prev => ({...prev, transferToMethod: m}))} setSubMethod={sm => setRecord(prev => ({...prev, transferToSubMethod: sm}))} currentRoom={currentRoom} />
            </>
          )}

          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex gap-2 items-start">
            <div className="flex-1 w-full min-w-0">
              <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 ml-1">📝 備註 (選填)</label>
              <input type="text" placeholder="輸入額外備註..." className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 outline-none w-full text-gray-700 font-bold text-[15px]" value={record.note} onChange={(e) => setRecord(prev => ({...prev, note: e.target.value}))} />
            </div>
            <div className="shrink-0 w-[86px]">
              <label className="flex items-center justify-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 w-full text-center">📷 照片</label>
              <div className="relative w-[86px] h-[46px] flex gap-1.5 group">
                {record.photoBase64 || record.photoUrl ? (
                  <div className="relative w-full h-full bg-gray-50 border border-gray-100 rounded-xl shadow-sm overflow-hidden cursor-pointer">
                    <img src={record.photoBase64 || record.photoUrl} alt="預覽" className="w-full h-full object-cover" />
                    <div onClick={(e) => { e.stopPropagation(); setRecord(prev => ({...prev, photoBase64: null, photoUrl: ''})); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition"><Trash2 size={18} className="text-white" /></div>
                  </div>
                ) : (
                  <>
                    <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition flex items-center justify-center cursor-pointer overflow-hidden"><Camera size={18} className="text-gray-500" /><input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} ref={photoInputRef} /></div>
                    <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition flex items-center justify-center cursor-pointer overflow-hidden"><ImageIcon size={18} className="text-gray-500" /><input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} /></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!isFormValid || isUploading} className={`w-full font-extrabold text-[18px] py-3.5 mt-1 rounded-[1.2rem] transition-all duration-300 shadow-md ${isFormValid && !isUploading ? `${themeBg} text-white hover:opacity-90 transform hover:-translate-y-1 active:translate-y-0` : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 shadow-none'}`}>
          {isUploading ? <Sparkles className="animate-spin inline mr-2" /> : ''}
          {isUploading ? '雲端同步中...' : '儲存紀錄 ✨'}
        </button>
      </main>

      {showCalc && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex flex-col justify-center items-center p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setAmount(evaluateCalc(calcInput)); setShowCalc(false); }}>
          <div className="bg-gray-50 w-full max-w-[320px] rounded-[2rem] p-5 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 font-bold text-[14px] flex items-center gap-1.5"><Calculator size={16}/> 智慧計算機</span>
              <button onClick={() => { setAmount(evaluateCalc(calcInput)); setShowCalc(false); }} className="text-gray-500 bg-gray-200 hover:bg-gray-300 rounded-full p-1.5 transition"><X size={16}/></button>
            </div>
            <div className="text-right text-[38px] font-black text-gray-800 mb-4 overflow-x-auto whitespace-nowrap pb-1.5 border-b-2 border-gray-200 tracking-wider">{calcInput}</div>
            <div className="grid grid-cols-4 gap-2">
              {calcKeys.map(k => (
                <button key={k} onClick={() => {
                  if (k === 'C') setCalcInput('0');
                  else if (k === '⌫') setCalcInput(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
                  else if (k === '=') setCalcInput(prev => evaluateCalc(prev));
                  else setCalcInput(prev => prev === '0' && !['+','-','×','÷','.'].includes(k) ? k : prev + k);
                }} className={`py-4 rounded-xl text-[20px] font-black active:scale-95 transition-transform flex items-center justify-center shadow-sm 
                  ${['C', '⌫'].includes(k) ? 'bg-[#FFD1DC] text-[#9F1239]' : ['+', '-', '×', '÷', '(', ')'].includes(k) ? 'bg-[#FEF08A] text-[#B45309]' : k === '=' ? 'bg-[#38BDF8] text-white shadow-md' : 'bg-white text-gray-800'}`}>
                  {k}
                </button>
              ))}
            </div>
            <button onClick={() => { setAmount(evaluateCalc(calcInput)); setShowCalc(false); }} className={`w-full mt-3 ${themeBg} text-white py-3.5 rounded-xl font-black text-[18px] shadow-md active:scale-95 transition flex justify-center items-center gap-2`}>
              <Check size={20}/> 確認金額
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default RecordFormView;
