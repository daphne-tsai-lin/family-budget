import React, { useState, useMemo } from 'react';
import { Settings, RefreshCw, Check, Trash2, X, User } from 'lucide-react';
import { doc, updateDoc, writeBatch, deleteField, getDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/Config';
import { SettingBlock, PillGroupMulti } from '../components/SharedUI';
import { getRoomHeaderColor } from '../utils/helpers';

// 房間主題顏色定義
const ROOM_THEMES = [
  { id: 't1', label: '落櫻碧海', classes: 'from-[#cf736c] from-35% via-[#9b728b] to-[#027d9c]' },
  { id: 't2', label: '深海琥珀', classes: 'from-[#026c85] from-15% to-[#a15c36]' },
  { id: 't3', label: '薩克斯雅金', classes: 'from-[#367b93] from-40% to-[#d4af37]' },
  { id: 't4', label: '瀚海墨藍', classes: 'from-[#3485ba] from-40% to-[#16213e]' },
  { id: 't5', label: '沁涼深海', classes: 'from-teal-600 to-cyan-600' },
  { id: 't6', label: '抹茶青檸', classes: 'from-[#72a067] from-40% to-[#9ab06e]' },
  { id: 't7', label: '蘭紫豆沙', classes: 'from-[#7f4eb3] to-[#a3727e]' },
  { id: 't8', label: '暮色玫瑰', classes: 'from-[#cc2b6e] from-40% via-[#6d2875] to-[#11235a]' }
];

const SYNC_FIELDS = [
  { key: 'categories', label: '🌸 支出分類 (含子項目)' }, { key: 'merchants', label: '🏪 常見商家' },
  { key: 'loginUsers', label: '🙋 登入人員' }, { key: 'payers', label: '👥 花費對象' },
  { key: 'paymentMethods', label: '💳 付款方式類別' }, { key: 'creditCards', label: '💳 信用卡清單' },
  { key: 'mobilePayCards', label: '📱 行動支付綁定信用卡' },
  { key: 'bankAccounts', label: '🏦 銀行清單' }, { key: 'electronicTickets', label: '🎟️ 電子票證清單' },
  { key: 'incomeCategories', label: '💰 收入分類' }, { key: 'transferCategories', label: '🔄 轉帳分類' },
  { key: 'autoFillRules', label: '🤖 商家預設規則' }, { key: 'methodRules', label: '🤖 付款方式預設規則' }
];

const SettingsView = ({ user, activeRoomId, currentRoom, records, savedRooms, setView }) => {
  const [settingsTab, setSettingsTab] = useState('expense');
  const [settingSelectedCategory, setSettingSelectedCategory] = useState('');
  const [newRuleItem, setNewRuleItem] = useState('');
  const [newRuleMerchant, setNewRuleMerchant] = useState('');
  const [newMethodRuleMerchant, setNewMethodRuleMerchant] = useState('');
  const [newMethodRuleMethod, setNewMethodRuleMethod] = useState('');
  const [newMethodRuleSubMethod, setNewMethodRuleSubMethod] = useState('');
  const [syncSettingsModalOpen, setSyncSettingsModalOpen] = useState(false);
  const [syncTargetRoom, setSyncTargetRoom] = useState('');
  const [syncSelection, setSyncSelection] = useState({});

  // === 資料同步與排序邏輯 (從原本 App.js 搬運過來) ===
  const orderedAutoFillKeys = useMemo(() => {
    if (!currentRoom) return [];
    const keys = Object.keys(currentRoom.autoFillRules || {});
    const order = currentRoom.autoFillRuleOrder || [];
    const validOrder = order.filter(k => keys.includes(k));
    const missing = keys.filter(k => !validOrder.includes(k));
    return [...validOrder, ...missing];
  }, [currentRoom?.autoFillRules, currentRoom?.autoFillRuleOrder]);

  const orderedMethodKeys = useMemo(() => {
    if (!currentRoom) return [];
    const keys = Object.keys(currentRoom.methodRules || {});
    const order = currentRoom.methodRuleOrder || [];
    const validOrder = order.filter(k => keys.includes(k));
    const missing = keys.filter(k => !validOrder.includes(k));
    return [...validOrder, ...missing];
  }, [currentRoom?.methodRules, currentRoom?.methodRuleOrder]);

  const syncHistoricalData = async (settingField, oldItem, newItem) => {
    const updatesList = [];
    for (let r of records) {
      let updatedData = {}; let needsUpdate = false;
      if (settingField === 'categories' && r.type === 'expense' && r.category === oldItem) { needsUpdate = true; updatedData.category = newItem; }
      else if (settingField === 'incomeCategories' && r.type === 'income' && r.category === oldItem) { needsUpdate = true; updatedData.category = newItem; }
      else if (settingField === 'transferCategories' && r.type === 'transfer' && r.category === oldItem) { needsUpdate = true; updatedData.category = newItem; }
      else if (settingField === 'merchants' && r.merchant === oldItem) { needsUpdate = true; updatedData.merchant = newItem; }
      else if (settingField === 'payers') {
        if (Array.isArray(r.payer) && r.payer.includes(oldItem)) { needsUpdate = true; updatedData.payer = r.payer.map(p => p === oldItem ? newItem : p); }
        else if (r.payer === oldItem) { needsUpdate = true; updatedData.payer = [newItem]; }
      }
      else if (settingField === 'paymentMethods') {
        if (r.method === oldItem) { needsUpdate = true; updatedData.method = newItem; }
        if (r.transferToMethod === oldItem) { needsUpdate = true; updatedData.transferToMethod = newItem; }
      }
      else if (['creditCards', 'bankAccounts', 'electronicTickets'].includes(settingField)) {
        if (r.subMethod === oldItem) { needsUpdate = true; updatedData.subMethod = newItem; }
        if (r.transferToSubMethod === oldItem) { needsUpdate = true; updatedData.transferToSubMethod = newItem; }
      }
      else if (settingField === 'loginUsers') {
        if (r.addedByRole === oldItem) { needsUpdate = true; updatedData.addedByRole = newItem; }
      }
      if (needsUpdate) updatesList.push({ ref: doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id), data: updatedData });
    }
    if (updatesList.length > 0) {
      let batch = writeBatch(db); let count = 0;
      for (const update of updatesList) {
        batch.update(update.ref, update.data); count++;
        if (count === 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    }
  };

  const updateSettingField = async (field, newList, oldItem, newItem) => {
    if (!currentRoom || !user || !activeRoomId) return;
    try {
      const updates = { [field]: newList };
      if (field === 'categories' && oldItem && newItem && currentRoom.categoryItems && currentRoom.categoryItems[oldItem]) {
        updates[`categoryItems.${newItem}`] = currentRoom.categoryItems[oldItem];
        updates[`categoryItems.${oldItem}`] = deleteField();
      }
      if (field === 'creditCards') {
        if (oldItem && newItem && oldItem !== newItem) {
          let newMobilePayCards = [...(currentRoom.mobilePayCards || [])];
          const idx = newMobilePayCards.indexOf(oldItem);
          if (idx > -1) { newMobilePayCards[idx] = newItem; updates.mobilePayCards = newMobilePayCards; }
        } else if (oldItem && !newItem) {
          updates.mobilePayCards = (currentRoom.mobilePayCards || []).filter(c => c !== oldItem);
        }
      }
      if (oldItem && newItem && oldItem !== newItem) {
        let rulesChanged = false;
        let newAutoFill = { ...currentRoom.autoFillRules };
        let newMethodRules = { ...currentRoom.methodRules };
        if (field === 'merchants') {
          Object.keys(newAutoFill).forEach(k => { if (newAutoFill[k] === oldItem) { newAutoFill[k] = newItem; rulesChanged = true; } });
          if (newMethodRules[oldItem]) { newMethodRules[newItem] = newMethodRules[oldItem]; delete newMethodRules[oldItem]; rulesChanged = true; }
        } else if (field === 'paymentMethods') {
          Object.keys(newMethodRules).forEach(k => { if (newMethodRules[k].method === oldItem) { newMethodRules[k].method = newItem; rulesChanged = true; } });
        } else if (['creditCards', 'bankAccounts', 'electronicTickets'].includes(field)) {
          Object.keys(newMethodRules).forEach(k => { if (newMethodRules[k].subMethod === oldItem) { newMethodRules[k].subMethod = newItem; rulesChanged = true; } });
        }
        if (rulesChanged) { if (field === 'merchants') updates.autoFillRules = newAutoFill; updates.methodRules = newMethodRules; }
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), updates);
      if (oldItem && newItem && oldItem !== newItem) await syncHistoricalData(field, oldItem, newItem);
    } catch (err) { alert('更新失敗：請檢查網路連線'); }
  };

  const updateCategoryItemsField = async (category, newList, oldItem, newItem) => {
    if (!currentRoom || !category || !user || !activeRoomId) return;
    try {
      const updates = { [`categoryItems.${category}`]: newList };
      if (oldItem && newItem && oldItem !== newItem) {
        let newAutoFill = { ...currentRoom.autoFillRules };
        if (newAutoFill[oldItem]) { newAutoFill[newItem] = newAutoFill[oldItem]; delete newAutoFill[oldItem]; updates.autoFillRules = newAutoFill; }
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), updates);
      if (oldItem && newItem && oldItem !== newItem) {
        const updatesList = [];
        for (let r of records) {
          if (r.type === 'expense' && r.category === category && r.title === oldItem) updatesList.push({ ref: doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id), data: { title: newItem } });
        }
        if (updatesList.length > 0) {
          let batch = writeBatch(db); let count = 0;
          for (const update of updatesList) { batch.update(update.ref, update.data); count++; if (count === 450) { await batch.commit(); batch = writeBatch(db); count = 0; } }
          if (count > 0) await batch.commit();
        }
      }
    } catch (err) { alert('更新失敗：請檢查網路連線'); }
  };

  const handleMoveRule = async (itemKey, dir) => {
    const keys = [...orderedAutoFillKeys]; const idx = keys.indexOf(itemKey);
    if (idx + dir < 0 || idx + dir >= keys.length) return;
    [keys[idx], keys[idx+dir]] = [keys[idx+dir], keys[idx]];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { autoFillRuleOrder: keys });
  };

  const handleMoveMethodRule = async (merchantKey, dir) => {
    const keys = [...orderedMethodKeys]; const idx = keys.indexOf(merchantKey);
    if (idx + dir < 0 || idx + dir >= keys.length) return;
    [keys[idx], keys[idx+dir]] = [keys[idx+dir], keys[idx]];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { methodRuleOrder: keys });
  };

  const handleAddRule = async () => {
    if (!newRuleItem || !newRuleMerchant) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), {
      [`autoFillRules.${newRuleItem}`]: newRuleMerchant, autoFillRuleOrder: [...orderedAutoFillKeys, newRuleItem]
    });
    setNewRuleItem(''); setNewRuleMerchant('');
  };

  const handleDeleteRule = async (itemToRemove) => {
    const newRules = { ...currentRoom.autoFillRules }; delete newRules[itemToRemove];
    const newOrder = orderedAutoFillKeys.filter(k => k !== itemToRemove);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { autoFillRules: newRules, autoFillRuleOrder: newOrder });
  };

  const handleAddMethodRule = async () => {
    if (!newMethodRuleMerchant || !newMethodRuleMethod) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), {
      [`methodRules.${newMethodRuleMerchant}`]: { method: newMethodRuleMethod, subMethod: newMethodRuleSubMethod },
      methodRuleOrder: [...orderedMethodKeys, newMethodRuleMerchant]
    });
    setNewMethodRuleMerchant(''); setNewMethodRuleMethod(''); setNewMethodRuleSubMethod('');
  };

  const handleDeleteMethodRule = async (merchant) => {
    const newRules = { ...currentRoom.methodRules }; delete newRules[merchant];
    const newOrder = orderedMethodKeys.filter(k => k !== merchant);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { methodRules: newRules, methodRuleOrder: newOrder });
  };

  // 同步邏輯
  const handleToggleSyncItem = (field, item) => {
    setSyncSelection(prev => {
      const list = prev[field] || [];
      if (list.includes(item)) return { ...prev, [field]: list.filter(i => i !== item) };
      else return { ...prev, [field]: [...list, item] };
    });
  };

  const handleSelectAllSyncField = (field, allItems) => {
    setSyncSelection(prev => {
      const currentList = prev[field] || [];
      if (currentList.length === allItems.length) return { ...prev, [field]: [] };
      else return { ...prev, [field]: [...allItems] };
    });
  };

  const handleSyncSettings = async () => {
    const keysToSync = SYNC_FIELDS.map(f => f.key);
    let hasSelection = false;
    keysToSync.forEach(k => { if (syncSelection[k] && syncSelection[k].length > 0) hasSelection = true; });
    if (!syncTargetRoom || !hasSelection) return alert('請選擇目標房間及要同步的項目');
    if (!window.confirm('確定要將勾選的設定同步到目標房間嗎？\n(原本目標房間的設定會被保留並合併)')) return;
    try {
      const targetRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', syncTargetRoom);
      const targetSnap = await getDoc(targetRef);
      if (!targetSnap.exists()) return alert('找不到目標房間');

      const targetData = targetSnap.data();
      const updates = {};

      keysToSync.forEach(opt => {
        const selectedItems = syncSelection[opt];
        if (!selectedItems || selectedItems.length === 0) return;
        if (opt === 'categories') {
          const existing = targetData[opt] || [];
          updates[opt] = [...new Set([...existing, ...selectedItems])];
          const existingItems = targetData.categoryItems || {};
          const newItems = { ...existingItems };
          selectedItems.forEach(cat => {
            if (currentRoom.categoryItems?.[cat]) newItems[cat] = [...new Set([...(existingItems[cat] || []), ...currentRoom.categoryItems[cat]])];
          });
          updates.categoryItems = newItems;
        } else if (opt === 'autoFillRules') {
          const existingAutoFill = targetData.autoFillRules || {};
          const existingAutoFillOrder = targetData.autoFillRuleOrder || [];
          let newAutoFillOrder = [...existingAutoFillOrder];
          let newAutoFill = { ...existingAutoFill };
          selectedItems.forEach(itemKey => {
            newAutoFill[itemKey] = currentRoom.autoFillRules[itemKey];
            if (!newAutoFillOrder.includes(itemKey)) newAutoFillOrder.push(itemKey);
          });
          updates.autoFillRules = newAutoFill; updates.autoFillRuleOrder = newAutoFillOrder;
        } else if (opt === 'methodRules') {
          const existingMethodRules = targetData.methodRules || {};
          const existingMethodOrder = targetData.methodRuleOrder || [];
          let newMethodOrder = [...existingMethodOrder];
          let newMethodRules = { ...existingMethodRules };
          selectedItems.forEach(m => {
            newMethodRules[m] = currentRoom.methodRules[m];
            if (!newMethodOrder.includes(m)) newMethodOrder.push(m);
          });
          updates.methodRules = newMethodRules; updates.methodRuleOrder = newMethodOrder;
        } else {
          const existing = targetData[opt] || [];
          updates[opt] = [...new Set([...existing, ...selectedItems])];
        }
      });
      await updateDoc(targetRef, updates);
      alert('✅ 設定同步成功！');
      setSyncSettingsModalOpen(false); setSyncSelection({});
    } catch (e) { alert('同步失敗：' + e.message); }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-purple-400 to-pink-400 px-4 py-3.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem] border-b-4 border-white/20">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><Settings size={22} className="text-white/80"/> 選項設定</h1>
          <button onClick={() => setView('room')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">返回</button>
        </div>
      </header>
      <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button onClick={() => setSyncSettingsModalOpen(true)} className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-2.5 rounded-xl font-bold text-[16px] shadow-sm hover:shadow-md transition flex justify-center items-center gap-2 active:scale-95">
          <RefreshCw size={18} /> 🔄 複製設定至其他房間
        </button>
        
        <div className="flex bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm">
          <button onClick={() => setSettingsTab('expense')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'expense' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>支出</button>
          <button onClick={() => setSettingsTab('income')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>收入</button>
          <button onClick={() => setSettingsTab('transfer')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'transfer' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>轉帳</button>
          <button onClick={() => setSettingsTab('other')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'other' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>其他</button>
        </div>

        <div className="space-y-3">
          {settingsTab === 'expense' && (
            <>
              <SettingBlock title="🌸 支出主分類" items={currentRoom?.categories || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('categories', newList, oldItem, newItem)} themeClass="border-pink-100" spanClass="text-pink-600" btnClass="bg-pink-400" placeholder="輸入新分類..." />
              <div className={`p-3 sm:p-4 rounded-2xl border-2 border-pink-100 bg-white shadow-sm mb-3`}>
                <h3 className="font-bold text-gray-700 mb-3 text-[17px] flex items-center gap-2">📝 編輯「分類」專屬項目</h3>
                <select value={settingSelectedCategory} onChange={e => setSettingSelectedCategory(e.target.value)} className="w-full bg-pink-50 border border-pink-100 p-2.5 rounded-xl outline-none font-bold text-[15px] text-pink-700 shadow-sm cursor-pointer appearance-none">
                  <option value="">請先選擇一個主分類...</option>
                  {(currentRoom?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {settingSelectedCategory && (
                  <SettingBlock title={`[${settingSelectedCategory}] 項目清單`} items={currentRoom?.categoryItems?.[settingSelectedCategory] || []} onUpdate={(newList, oldItem, newItem) => updateCategoryItemsField(settingSelectedCategory, newList, oldItem, newItem)} themeClass="border-pink-50 mt-3" spanClass="text-pink-600" btnClass="bg-pink-400" placeholder="新增項目..." />
                )}
              </div>
              <SettingBlock title="🏪 常見商家" items={currentRoom?.merchants || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('merchants', newList, oldItem, newItem)} themeClass="border-orange-100" spanClass="text-orange-600" btnClass="bg-orange-400" placeholder="輸入新商家..." />
              <div className={`p-3 sm:p-4 rounded-2xl border-2 border-purple-100 bg-white shadow-sm mb-3`}>
                <h3 className="font-bold text-gray-700 mb-1.5 text-[17px] flex items-center gap-2">📱 行動支付綁定信用卡</h3>
                <p className="text-[12px] text-gray-500 font-bold mb-3 leading-relaxed">請勾選哪些信用卡可用於行動支付。</p>
                <div className="flex flex-wrap gap-1.5">
                  {(currentRoom?.creditCards || []).map(card => {
                    const isChecked = (currentRoom?.mobilePayCards || []).includes(card);
                    return (
                      <button key={card} onClick={() => {
                        let newCards = [...(currentRoom?.mobilePayCards || [])];
                        if (isChecked) newCards = newCards.filter(c => c !== card); else newCards.push(card);
                        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { mobilePayCards: newCards });
                      }} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm flex items-center gap-1.5 ${isChecked ? 'bg-purple-500 text-white border-purple-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:border-purple-200'}`}>
                        {isChecked ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded border border-gray-300"></div>}
                        {card}
                      </button>
                    )
                  })}
                  {(!currentRoom?.creditCards || currentRoom.creditCards.length === 0) && <p className="text-[12px] text-gray-400 font-bold py-1">請先在下方新增信用卡。</p>}
                </div>
              </div>
              <SettingBlock title="💳 信用卡清單" items={currentRoom?.creditCards || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('creditCards', newList, oldItem, newItem)} themeClass="border-blue-100" spanClass="text-blue-600" btnClass="bg-blue-400" placeholder="輸入信用卡名稱..." />
              <SettingBlock title="🏦 銀行清單" items={currentRoom?.bankAccounts || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('bankAccounts', newList, oldItem, newItem)} themeClass="border-indigo-100" spanClass="text-indigo-600" btnClass="bg-indigo-400" placeholder="輸入銀行名稱..." />
              <SettingBlock title="🎟️ 電子票證清單" items={currentRoom?.electronicTickets || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('electronicTickets', newList, oldItem, newItem)} themeClass="border-teal-100" spanClass="text-teal-600" btnClass="bg-teal-400" placeholder="輸入電子票證名稱..." />
            </>
          )}

          {settingsTab === 'income' && <SettingBlock title="💰 收入主分類" items={currentRoom?.incomeCategories || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('incomeCategories', newList, oldItem, newItem)} themeClass="border-green-100" spanClass="text-green-600" btnClass="bg-green-400" placeholder="輸入收入分類..." />}
          {settingsTab === 'transfer' && <SettingBlock title="🔄 轉帳主分類" items={currentRoom?.transferCategories || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('transferCategories', newList, oldItem, newItem)} themeClass="border-blue-100" spanClass="text-blue-600" btnClass="bg-blue-400" placeholder="輸入轉帳分類..." />}
          
          {settingsTab === 'other' && (
            <>
              <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-indigo-100 shadow-sm mb-3">
                <h3 className="font-bold text-gray-700 text-[15px] sm:text-[16px] mb-1">🎨 自訂房間首頁顏色</h3>
                <p className="text-[11px] sm:text-[12px] text-gray-500 font-bold mb-3 leading-relaxed">點擊下方色塊即可立即更換此房間的專屬首頁顏色。</p>
                <div className="flex justify-between items-center w-full px-0.5 sm:px-1">
                  {ROOM_THEMES.map(theme => {
                    const fallbackTheme = getRoomHeaderColor(activeRoomId);
                    const isSelected = currentRoom?.headerTheme ? currentRoom.headerTheme === theme.classes : fallbackTheme === theme.classes;
                    return (
                      <button key={theme.id} onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { headerTheme: theme.classes })} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shadow-sm transition-all duration-200 border-2 shrink-0 ${isSelected ? 'border-white scale-110 shadow-md ring-2 ring-gray-400 opacity-100' : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'} bg-gradient-to-tr ${theme.classes} flex items-center justify-center`} title={theme.label}>
                        {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-indigo-100 shadow-sm mb-3">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-700 text-[15px] sm:text-[16px]">帳戶與統計預設顯示區間</h3>
                    <p className="text-[11px] sm:text-[12px] text-gray-500 font-bold mt-1 leading-relaxed">設定進入「帳戶總覽」或「統計分析」時，預設要看的資料。</p>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner shrink-0">
                    <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { accountDefaultRange: '當月' })} className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${(!currentRoom?.accountDefaultRange || currentRoom.accountDefaultRange === '當月') ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>當月</button>
                    <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { accountDefaultRange: '全部' })} className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${(currentRoom?.accountDefaultRange === '全部') ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>全部</button>
                  </div>
                </div>
              </div>
              <SettingBlock title="🙋 登入人員 (付款人)" items={currentRoom?.loginUsers || ['老公', '老婆']} onUpdate={(newList, oldItem, newItem) => updateSettingField('loginUsers', newList, oldItem, newItem)} themeClass="border-purple-100" spanClass="text-purple-600" btnClass="bg-purple-400" placeholder="輸入登入者名稱..." />
              <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-green-100 shadow-sm mb-3">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-700 text-[15px] sm:text-[16px]">支出自動跨房間提示</h3>
                    <p className="text-[11px] sm:text-[12px] text-gray-500 font-bold mt-1 leading-relaxed">開啟後，每次新增「支出」存檔時，會自動跳出傳送至其他房間的詢問視窗。</p>
                  </div>
                  <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { promptCashSync: !currentRoom?.promptCashSync })} className={`w-12 h-7 rounded-full transition-colors relative shadow-inner shrink-0 ${currentRoom?.promptCashSync ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${currentRoom?.promptCashSync ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>
                {currentRoom?.promptCashSync && (
                  <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in duration-300">
                    <PillGroupMulti label="⛔ 排除提示的花費對象 (選填)" icon={User} options={currentRoom?.payers || []} values={currentRoom?.excludedPromptPayers || []} onChange={(vals) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { excludedPromptPayers: vals })} isPayer={true} />
                  </div>
                )}
              </div>
              <SettingBlock title="👥 花費對象" items={currentRoom?.payers || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('payers', newList, oldItem, newItem)} themeClass="border-gray-200" spanClass="text-gray-700" btnClass="bg-gray-800" placeholder="輸入花費對象名稱..." />
              <div className={`p-3 sm:p-4 rounded-2xl border-2 border-orange-100 bg-white shadow-sm mb-3`}>
                <h3 className="font-bold text-gray-700 mb-3 text-[17px] flex items-center gap-2">🤖 商家預設規則</h3>
                <div className="flex flex-col gap-2 mb-4">
                  {orderedAutoFillKeys.map((item, idx, arr) => (
                    <div key={item} className="flex justify-between items-center bg-orange-50 p-2 rounded-xl border border-orange-100 shadow-sm gap-2">
                      <span className="text-[14px] font-bold text-orange-700 flex-1 min-w-0 truncate pl-1">[{item}] ➜ {currentRoom.autoFillRules?.[item]}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button onClick={()=>handleMoveRule(item, -1)} disabled={idx===0} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↑</button>
                        <button onClick={()=>handleMoveRule(item, 1)} disabled={idx===arr.length-1} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↓</button>
                        <button onClick={() => handleDeleteRule(item)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <select value={newRuleItem} onChange={e=>setNewRuleItem(e.target.value)} className="w-full border border-orange-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                    <option value="">選擇觸發的項目...</option>
                    {Object.values(currentRoom?.categoryItems || {}).flat().map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <select value={newRuleMerchant} onChange={e=>setNewRuleMerchant(e.target.value)} className="flex-1 border border-orange-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                      <option value="">選擇預設商家...</option>
                      {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={handleAddRule} className="bg-orange-400 text-white px-3 py-2 rounded-lg text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95 shrink-0">新增</button>
                  </div>
                </div>
              </div>
              <div className={`p-3 sm:p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm mb-3`}>
                <h3 className="font-bold text-gray-700 mb-3 text-[17px] flex items-center gap-2">🤖 付款方式預設規則</h3>
                <div className="flex flex-col gap-2 mb-4">
                  {orderedMethodKeys.map((merchant, idx, arr) => {
                    const rule = currentRoom.methodRules?.[merchant] || {};
                    return (
                      <div key={merchant} className="flex justify-between items-center bg-blue-50 p-2 rounded-xl border border-blue-100 shadow-sm gap-2">
                        <span className="text-[14px] font-bold text-blue-700 flex-1 min-w-0 truncate pl-1">[{merchant}] ➜ {rule.method || '未知'} {rule.subMethod ? `(${rule.subMethod})` : ''}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button onClick={()=>handleMoveMethodRule(merchant, -1)} disabled={idx===0} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↑</button>
                          <button onClick={()=>handleMoveMethodRule(merchant, 1)} disabled={idx===arr.length-1} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↓</button>
                          <button onClick={() => handleDeleteMethodRule(merchant)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition"><Trash2 size={12}/></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <select value={newMethodRuleMerchant} onChange={e=>setNewMethodRuleMerchant(e.target.value)} className="w-full border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                    <option value="">選擇觸發的商家...</option>
                    {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="flex flex-col gap-2">
                    <select value={newMethodRuleMethod} onChange={e=>{
                      setNewMethodRuleMethod(e.target.value);
                      if (e.target.value === '行動支付') setNewMethodRuleSubMethod(currentRoom?.mobilePayCards?.[0] || currentRoom?.creditCards?.[0] || '');
                      else if (['信用卡', '信用卡 / 行動支付'].includes(e.target.value)) setNewMethodRuleSubMethod(currentRoom?.creditCards?.[0] || '');
                      else if (['銀行', '銀行 / 電子票證'].includes(e.target.value)) setNewMethodRuleSubMethod(currentRoom?.bankAccounts?.[0] || '');
                      else if (e.target.value === '電子票證') setNewMethodRuleSubMethod(currentRoom?.electronicTickets?.[0] || '');
                      else setNewMethodRuleSubMethod('');
                    }} className="w-full border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                      <option value="">預設付款方式...</option>
                      {(currentRoom?.paymentMethods || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {['行動支付', '信用卡', '信用卡 / 行動支付'].includes(newMethodRuleMethod) && (
                        <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                          <option value="">{newMethodRuleMethod === '行動支付' ? '扣款信用卡...' : '選擇信用卡...'}</option>
                          {(newMethodRuleMethod === '行動支付' ? (currentRoom?.mobilePayCards || currentRoom?.creditCards || []) : (currentRoom?.creditCards || [])).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      {['銀行', '銀行 / 電子票證'].includes(newMethodRuleMethod) && (
                        <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                          <option value="">選擇銀行...</option>
                          {(currentRoom?.bankAccounts || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      {newMethodRuleMethod === '電子票證' && (
                        <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                          <option value="">選擇電子票證...</option>
                          {(currentRoom?.electronicTickets || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      <button onClick={handleAddMethodRule} className="bg-blue-400 text-white px-3 py-2 rounded-lg text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95 ml-auto shrink-0">新增</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* 同步設定 Modal */}
      {syncSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[140] flex justify-center items-end sm:items-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSyncSettingsModalOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[1.5rem] sm:rounded-[1.5rem] p-5 shadow-2xl relative animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSyncSettingsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={20}/></button>
            <h3 className="font-black text-[20px] text-gray-800 mb-2 flex items-center gap-1.5">🔄 複製設定至其他房間</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-gray-500 mb-1.5 ml-1">選擇目標房間</label>
                <select value={syncTargetRoom} onChange={e => setSyncTargetRoom(e.target.value)} className="w-full border border-indigo-100 bg-indigo-50 text-indigo-700 p-3 rounded-xl font-bold text-[15px] outline-none shadow-sm cursor-pointer appearance-none">
                  <option value="">請選擇要同步過去的房間...</option>
                  {savedRooms.filter(r => r.id !== activeRoomId).map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
                </select>
              </div>
              <div className="max-h-[35vh] overflow-y-auto pr-2 space-y-3">
                {SYNC_FIELDS.map(fieldObj => {
                  const fKey = fieldObj.key;
                  let contentList = [];
                  if (fKey === 'categories') contentList = currentRoom?.categories || [];
                  else if (fKey === 'merchants') contentList = currentRoom?.merchants || [];
                  else if (fKey === 'autoFillRules') contentList = currentRoom?.autoFillRuleOrder || Object.keys(currentRoom?.autoFillRules || {});
                  else if (fKey === 'methodRules') contentList = currentRoom?.methodRuleOrder || Object.keys(currentRoom?.methodRules || {});
                  else contentList = currentRoom?.[fKey] || [];
                  if (contentList.length === 0) return null;
                  const isAllSelected = (syncSelection[fKey] || []).length === contentList.length;
                  return (
                    <div key={fKey} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-100 p-2.5 flex justify-between items-center border-b border-gray-200">
                        <span className="font-bold text-[13px] text-gray-700">{fieldObj.label}</span>
                        <button onClick={() => handleSelectAllSyncField(fKey, contentList)} className="text-[11px] font-bold bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-gray-600 active:scale-95 transition">{isAllSelected ? '全不選' : '全選'}</button>
                      </div>
                      <div className="p-2 flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                        {contentList.map(item => {
                          const isChecked = (syncSelection[fKey] || []).includes(item);
                          let displayLabel = item;
                          if (fKey === 'autoFillRules') displayLabel = `[${item}] ➜ ${currentRoom?.autoFillRules?.[item]}`;
                          if (fKey === 'methodRules') {
                            const rule = currentRoom?.methodRules?.[item];
                            displayLabel = `[${item}] ➜ ${rule?.method || '未知'}${rule?.subMethod ? `(${rule?.subMethod})` : ''}`;
                          }
                          return (
                            <button key={item} onClick={() => handleToggleSyncItem(fKey, item)} className={`px-2.5 py-1 rounded-md text-[12px] font-bold border transition-colors ${isChecked ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                              {displayLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={handleSyncSettings} disabled={!syncTargetRoom || Object.values(syncSelection).every(arr => arr.length === 0)} className="w-full bg-blue-500 text-white font-black text-[16px] py-3.5 rounded-xl transition-all hover:bg-blue-600 disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-md mt-1">確認同步所選項</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsView;
