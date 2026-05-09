import React, { useState, useEffect, useRef } from 'react';
// 💡 修正：補齊了所有遺漏的圖示，解決白畫面問題！
import { ChevronLeft, Save, Upload, Tag, Store, Receipt, Calendar, Settings, Image as ImageIcon, Wallet, PiggyBank, Sparkles, X } from 'lucide-react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../firebase/firebaseConfig';
import { CustomDropdown, MethodSelector, PillGroupMulti } from '../components/SharedUI';
import { getLocalTodayStr, generateFutureDates, evaluateCalc } from '../utils/helpers';

const RecordFormView = ({ user, activeRoomId, currentRoom, currentUserRole, records, recordToEdit, copyRecordData, onClose, setCrossRoomRecord }) => {
  
  // 💡 修正：處理傳入的複製資料 (移除舊ID，保留內容，日期預設為今天)
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
      frequency: '一次', frequencyDays: [], frequencyInterval: '3個月', frequencyCustomText: '10'
    };
  });

  const [calcInput, setCalcInput] = useState((recordToEdit || copyRecordData) ? String((recordToEdit || copyRecordData).amount) : '');
  const [amount, setAmount] = useState((recordToEdit || copyRecordData) ? (recordToEdit || copyRecordData).amount : 0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleCalcInput = (val) => {
    if (val === 'C') { setCalcInput(''); setAmount(0); }
    else if (val === '⌫') { const newVal = calcInput.slice(0, -1); setCalcInput(newVal); setAmount(Number(evaluateCalc(newVal)) || 0); }
    else if (val === '=') { const result = evaluateCalc(calcInput); setCalcInput(result); setAmount(Number(result) || 0); }
    else { const newVal = calcInput + val; setCalcInput(newVal); setAmount(Number(evaluateCalc(newVal)) || 0); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
        setRecord({ ...record, photoBase64: compressedBase64 });
        setIsUploading(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const isFormValid = () => {
    if (amount <= 0 || !record.date || record.payer.length === 0) return false;
    if (record.type === 'expense' || !record.type) {
      if (!record.category || !record.title) return false;
      if (['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(record.method) && !record.subMethod) return false;
    } else if (record.type === 'income') {
      if (!record.category) return false;
      if (['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(record.method) && !record.subMethod) return false;
    } else if (record.type === 'transfer') {
      if (!record.method || (['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(record.method) && !record.subMethod)) return false;
      if (!record.transferToMethod || (['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(record.transferToMethod) && !record.transferToSubMethod)) return false;
    }
    if (record.frequency === '每週' && record.frequencyDays.length === 0) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) return;
    try {
      const timestamp = new Date(record.date + 'T07:00:00').getTime();
      const finalAmount = amount;
      const baseData = { ...record, amount: finalAmount, timestamp, roomId: activeRoomId, addedBy: user.uid, addedByRole: currentUserRole };

      let datesToGenerate = [record.date];
      let newGroupId = null;
      let deleteOldFutureRecords = false;

      if (recordToEdit) {
        if (recordToEdit.groupId && record.frequency !== '一次') {
          const mode = window.prompt("您正在修改一筆週期性紀錄。\n\n請輸入代碼選擇修改範圍：\n1 = 僅變更單次 (未來紀錄不變)\n2 = 變更當次及未來所有紀錄", "1");
          if (mode === "2") {
            deleteOldFutureRecords = true;
            newGroupId = recordToEdit.groupId;
            datesToGenerate = generateFutureDates(record.date, record.frequency, record.frequencyDays, record.frequencyInterval, record.frequencyCustomText, 1);
            if(!datesToGenerate.includes(record.date)) datesToGenerate.unshift(record.date);
          } else {
            baseData.frequency = '一次';
            baseData.groupId = null;
          }
        } else if (record.frequency !== '一次') {
          newGroupId = Date.now().toString();
          datesToGenerate = generateFutureDates(record.date, record.frequency, record.frequencyDays, record.frequencyInterval, record.frequencyCustomText, 1);
        } else {
          baseData.groupId = null;
        }
      } else {
        if (record.frequency !== '一次') {
          newGroupId = Date.now().toString();
          datesToGenerate = generateFutureDates(record.date, record.frequency, record.frequencyDays, record.frequencyInterval, record.frequencyCustomText, 1);
        }
      }

      baseData.groupId = newGroupId;
      const batch = writeBatch(db);

      if (deleteOldFutureRecords && recordToEdit.groupId) {
        records.filter(r => r.groupId === recordToEdit.groupId && r.date > recordToEdit.date && r.id !== recordToEdit.id)
               .forEach(r => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id)));
      }

      if (recordToEdit) {
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', recordToEdit.id), baseData);
        datesToGenerate.filter(d => d !== record.date).forEach(d => {
          const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
          batch.set(newDocRef, { ...baseData, date: d, timestamp: new Date(d + 'T07:00:00').getTime() });
        });
      } else {
        datesToGenerate.forEach(d => {
          const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
          batch.set(newDocRef, { ...baseData, date: d, timestamp: new Date(d + 'T07:00:00').getTime() });
        });
      }

      await batch.commit();

      if (!recordToEdit && (record.type === 'expense' || !record.type) && currentRoom.promptCashSync && currentRoom.excludedPromptPayers) {
        const isExcluded = record.payer.some(p => currentRoom.excludedPromptPayers.includes(p));
        if (!isExcluded && activeRoomId) {
          setCrossRoomRecord({ ...baseData, id: 'temp' });
        }
      }
      onClose();
    } catch (err) { alert('儲存失敗！'); }
  };

  const TypeButton = ({ type, label, activeColor }) => (
    <button type="button" onClick={() => {
      setRecord({ ...record, type, category: type === 'income' ? currentRoom?.incomeCategories?.[0] : type === 'transfer' ? currentRoom?.transferCategories?.[0] : currentRoom?.categories?.[0], title: '', method: '現金', subMethod: '', transferToMethod: '現金', transferToSubMethod: '' });
      setCalcInput(''); setAmount(0);
    }} className={`flex-1 py-2 rounded-xl text-[15px] font-black transition-all ${record.type === type ? `${activeColor} text-white shadow-md transform -translate-y-0.5` : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>
      {label}
    </button>
  );

  const calcKeys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '00', '.', '⌫'];

  return (
    <div className="absolute inset-0 bg-[#FFFBF0] z-50 flex flex-col overflow-hidden">
      <header className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm shrink-0 flex justify-between items-center z-10 rounded-b-2xl">
        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition"><ChevronLeft size={24}/></button>
        <h2 className="text-[18px] font-black text-gray-800 tracking-wide">{recordToEdit ? '✏️ 編輯紀錄' : copyRecordData ? '✨ 複製新增' : '✨ 新增紀錄'}</h2>
        <button onClick={handleSave} disabled={!isFormValid()} className={`px-4 py-2 rounded-xl font-bold text-[14px] flex items-center shadow-sm transition-all ${isFormValid() ? 'bg-orange-500 text-white hover:bg-orange-600 hover:-translate-y-0.5' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
          <Save size={16} className="mr-1.5"/> 儲存
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth pb-20">
        <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
          <TypeButton type="expense" label="支出" activeColor="bg-orange-500" />
          <TypeButton type="income" label="收入" activeColor="bg-green-500" />
          <TypeButton type="transfer" label="轉帳" activeColor="bg-blue-500" />
        </div>

        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col items-end">
          <div className="text-gray-400 font-bold text-[14px] mb-1 text-left w-full">TWD 金額</div>
          <div className="text-[40px] font-black text-gray-800 tracking-tighter leading-none mb-1 break-all">${calcInput || '0'}</div>
          <div className="text-[16px] font-bold text-gray-400">目前結算: <span className={amount > 0 ? 'text-orange-500' : ''}>${amount.toLocaleString()}</span></div>
        </div>

        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 space-y-4">
          <div className="relative">
            <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1 ml-1"><Calendar size={14}/> 日期</label>
            <input type="date" value={record.date} onChange={e => setRecord({...record, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-[15px] text-gray-700 outline-none focus:border-orange-400 transition" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <CustomDropdown label="分類" icon={Tag} options={record.type === 'income' ? (currentRoom?.incomeCategories || []) : record.type === 'transfer' ? (currentRoom?.transferCategories || []) : (currentRoom?.categories || [])} value={record.category} onChange={v => setRecord({...record, category: v, title: ''})} placeholder="選擇分類" />
            </div>
            {record.type !== 'transfer' && (
              <div className="flex-1">
                {record.type === 'income' ? (
                  <div className="w-full">
                    <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1 ml-1"><Receipt size={14}/> 項目</label>
                    <input type="text" value={record.title} onChange={e => setRecord({...record, title: e.target.value})} placeholder="收入來源" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-[14px] outline-none focus:border-orange-400 transition" />
                  </div>
                ) : (
                  <CustomDropdown label="項目" icon={Receipt} options={currentRoom?.categoryItems?.[record.category] || []} value={record.title} onChange={v => setRecord({...record, title: v})} placeholder="選擇項目" />
                )}
              </div>
            )}
          </div>

          {record.type !== 'transfer' && (
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1 ml-1"><Store size={14}/> 商家 (選填)</label>
              <input type="text" value={record.merchant} onChange={e => setRecord({...record, merchant: e.target.value})} placeholder="例如：7-11、全聯..." className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-[15px] text-gray-700 outline-none focus:border-orange-400 transition" />
            </div>
          )}

          <PillGroupMulti label="花費對象" icon={Tag} options={currentRoom?.payers || []} values={record.payer} onChange={v => setRecord({...record, payer: v})} isPayer={true} />

          {record.type !== 'transfer' ? (
            <MethodSelector label="付款方式" icon={Wallet} method={record.method} subMethod={record.subMethod} setMethod={m => setRecord({...record, method: m})} setSubMethod={sm => setRecord({...record, subMethod: sm})} currentRoom={currentRoom} />
          ) : (
            <div className="space-y-4 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
              <MethodSelector label="轉出帳戶 (扣款)" icon={Wallet} method={record.method} subMethod={record.subMethod} setMethod={m => setRecord({...record, method: m})} setSubMethod={sm => setRecord({...record, subMethod: sm})} currentRoom={currentRoom} />
              <div className="flex justify-center -my-2 relative z-20"><div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md font-black text-lg">↓</div></div>
              <MethodSelector label="轉入帳戶 (入帳)" icon={PiggyBank} method={record.transferToMethod} subMethod={record.transferToSubMethod} setMethod={m => setRecord({...record, transferToMethod: m})} setSubMethod={sm => setRecord({...record, transferToSubMethod: sm})} currentRoom={currentRoom} />
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1 ml-1">📝 備註 (選填)</label>
            <textarea value={record.note} onChange={e => setRecord({...record, note: e.target.value})} placeholder="寫點什麼..." className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-[14px] text-gray-700 outline-none focus:border-orange-400 transition min-h-[80px] resize-none"></textarea>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-2 ml-1"><ImageIcon size={14}/> 附上照片 (收據/商品)</label>
            {record.photoBase64 ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                <img src={record.photoBase64} alt="已上傳" className="w-full h-full object-cover" />
                <button onClick={() => setRecord({ ...record, photoBase64: '' })} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition backdrop-blur-sm"><X size={16}/></button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 font-bold hover:bg-gray-50 hover:border-orange-400 transition gap-2">
                {isUploading ? <Sparkles className="animate-spin" size={20} /> : <><Upload size={18} /> 點擊上傳照片</>}
              </button>
            )}
            <input type="file" accept="image/*" style={{display: 'none'}} ref={fileInputRef} onChange={handlePhotoUpload} />
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2"><Settings size={18} className="text-gray-400"/> <span className="text-[14px] font-bold text-gray-700">此筆不計入帳戶總覽</span></div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={record.excludeFromBalance} onChange={e => setRecord({...record, excludeFromBalance: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        <div className="bg-gray-800 p-4 sm:p-5 rounded-[1.5rem] shadow-lg mb-8">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {calcKeys.map(key => (
              <button key={key} type="button" onClick={() => handleCalcInput(key)} className={`h-12 sm:h-14 rounded-[1rem] text-[18px] sm:text-[20px] font-black transition active:scale-95 shadow-sm flex items-center justify-center
                ${['C', '⌫'].includes(key) ? 'bg-red-400 text-white shadow-[0_4px_0_#ef4444]' : 
                  ['+', '-', '×', '÷', '(', ')'].includes(key) ? 'bg-gray-600 text-white shadow-[0_4px_0_#4b5563]' : 
                  key === '=' ? 'bg-orange-500 text-white shadow-[0_4px_0_#f97316]' : 'bg-white text-gray-800 shadow-[0_4px_0_#e5e7eb] hover:bg-gray-50'}`}>
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordFormView;
