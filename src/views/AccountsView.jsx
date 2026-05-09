import React, { useState, useMemo } from 'react';
import { X, ChevronRight, Wallet, CreditCard, PiggyBank, Landmark, Calendar } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/firebaseConfig';
import { getLocalTodayStr, getLocalLastMonthStartStr, getLocalLastMonthEndStr, toROCYearStr, getLocalMonthStartStr } from '../utils/helpers';

const AccountsView = ({ user, activeRoomId, currentRoom, records, setView, setViewingRecord }) => {
  // 依據原始設定，決定預設載入區間
  const defaultRange = currentRoom?.accountDefaultRange || '當月';
  const [accountStartDate, setAccountStartDate] = useState(defaultRange === '全部' ? '' : getLocalMonthStartStr());
  const [accountEndDate, setAccountEndDate] = useState(getLocalTodayStr());
  
  const [isEditingBalances, setIsEditingBalances] = useState(false);
  const [tempBalances, setTempBalances] = useState({});
  const [viewingAccountHistory, setViewingAccountHistory] = useState(null);

  const getAccKey = (method, subMethod) => {
    if (method === '現金') return '現金';
    if (['信用卡 / 行動支付', '信用卡', '行動支付'].includes(method)) return `cc_${subMethod}`;
    if (['銀行 / 電子票證', '銀行 / 儲值卡', '銀行 / 卡片', '銀行'].includes(method)) return `bank_${subMethod}`;
    if (method === '電子票證') return `et_${subMethod}`;
    if ((currentRoom?.creditCards || []).includes(method)) return `cc_${method}`;
    if ((currentRoom?.electronicTickets || []).includes(method)) return `et_${method}`;
    return `bank_${method}`;
  };

  const balances = useMemo(() => {
    const initial = currentRoom?.initialBalances || {}; 
    const bal = { '現金': initial['現金'] || 0 };
    (currentRoom?.bankAccounts || []).forEach(b => bal[`bank_${b}`] = initial[`bank_${b}`] !== undefined ? initial[`bank_${b}`] : (initial[b] || 0));
    (currentRoom?.electronicTickets || []).forEach(e => bal[`et_${e}`] = initial[`et_${e}`] !== undefined ? initial[`et_${e}`] : (initial[e] || 0));
    (currentRoom?.creditCards || []).forEach(c => bal[`cc_${c}`] = initial[`cc_${c}`] !== undefined ? initial[`cc_${c}`] : (initial[c] || 0));
    
    records.forEach(r => {
      if (accountStartDate && r.date < accountStartDate) return;
      if (accountEndDate && r.date > accountEndDate) return;
      if (!accountEndDate && r.date > getLocalTodayStr()) return;
      if (r.excludeFromBalance) return;

      const amt = Number(r.amount) || 0;
      if (r.type === 'expense' || !r.type) { 
        const key = getAccKey(r.method, r.subMethod);
        if (key) bal[key] = (bal[key] || 0) + (key.startsWith('cc_') ? amt : -amt); 
      }
      else if (r.type === 'income') { 
        const key = getAccKey(r.method, r.subMethod);
        if (key) bal[key] = (bal[key] || 0) + (key.startsWith('cc_') ? -amt : amt); 
      }
      else if (r.type === 'transfer') {
        const fromKey = getAccKey(r.method, r.subMethod), toKey = getAccKey(r.transferToMethod, r.transferToSubMethod);
        if (fromKey) bal[fromKey] = (bal[fromKey] || 0) + (fromKey.startsWith('cc_') ? amt : -amt);
        if (toKey) bal[toKey] = (bal[toKey] || 0) + (toKey.startsWith('cc_') ? -amt : amt);
      }
    });
    return bal;
  }, [records, currentRoom, accountStartDate, accountEndDate]);

  const handleSaveBalances = async () => {
    if (!user) return;
    try {
      const updatedBalances = { ...currentRoom?.initialBalances };
      for (const [key, val] of Object.entries(tempBalances)) if (val !== '') updatedBalances[key] = Number(val);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { initialBalances: updatedBalances });
      setIsEditingBalances(false);
    } catch (err) { alert("儲存餘額失敗：請檢查網路連線"); }
  };

  const cashBal = balances['現金'] || 0;
  const banks = currentRoom?.bankAccounts || [];
  const eTickets = currentRoom?.electronicTickets || [];
  const bankTotal = banks.reduce((sum, b) => sum + (balances[`bank_${b}`] || 0), 0) + eTickets.reduce((sum, e) => sum + (balances[`et_${e}`] || 0), 0);
  const ccs = currentRoom?.creditCards || [];
  const ccTotal = ccs.reduce((sum, c) => sum + (balances[`cc_${c}`] || 0), 0);
  const totalAssets = cashBal + bankTotal;
  const totalLiabilities = ccTotal;
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="h-full flex flex-col bg-[#FFFBF0]">
      <header className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem] border-b-4 border-white/20">
        <div className="flex justify-between items-center">
          <h1 className="text-[20px] font-black text-white flex items-center gap-2 drop-shadow-md"><Landmark size={22} className="text-white/80"/> 帳戶總覽</h1>
          <div className="flex gap-2">
            <button onClick={() => setView('room')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">返回</button>
            {isEditingBalances ? (
              <button onClick={handleSaveBalances} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">儲存</button>
            ) : (
              <button onClick={() => {
                const initBal = currentRoom?.initialBalances || {};
                const temp = { '現金': initBal['現金'] !== undefined ? initBal['現金'] : 0 };
                (currentRoom?.bankAccounts || []).forEach(b => temp[`bank_${b}`] = initBal[`bank_${b}`] !== undefined ? initBal[`bank_${b}`] : (initBal[b] !== undefined ? initBal[b] : 0));
                (currentRoom?.electronicTickets || []).forEach(e => temp[`et_${e}`] = initBal[`et_${e}`] !== undefined ? initBal[`et_${e}`] : (initBal[e] !== undefined ? initBal[e] : 0));
                (currentRoom?.creditCards || []).forEach(c => temp[`cc_${c}`] = initBal[`cc_${c}`] !== undefined ? initBal[`cc_${c}`] : (initBal[c] !== undefined ? initBal[c] : 0));
                setTempBalances(temp); setIsEditingBalances(true);
              }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">初始餘額</button>
            )}
          </div>
        </div>
      </header>

      <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* 找回原版的精準日期區間選擇器 */}
        <div className="flex flex-col gap-2 bg-white p-2 rounded-2xl shadow-sm border border-indigo-100">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-indigo-400 shrink-0 ml-1 hidden sm:block" />
            <div className="relative flex-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg overflow-hidden flex justify-center items-center cursor-pointer min-w-0">
              <input type="date" value={accountStartDate} onChange={e => setAccountStartDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
              <span className="font-bold text-gray-600 text-[12px] z-0 pointer-events-none truncate">{accountStartDate ? toROCYearStr(accountStartDate) : '不限'}</span>
            </div>
            <span className="text-gray-300 text-[12px] font-black shrink-0">~</span>
            <div className="relative flex-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg overflow-hidden flex justify-center items-center cursor-pointer min-w-0">
              <input type="date" value={accountEndDate} onChange={e => setAccountEndDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
              <span className="font-bold text-gray-600 text-[12px] z-0 pointer-events-none truncate">{accountEndDate ? toROCYearStr(accountEndDate) : '不限'}</span>
            </div>
            <div className="flex shrink-0 gap-0.5 ml-0.5">
              <button onClick={() => { setAccountStartDate(getLocalLastMonthStartStr()); setAccountEndDate(getLocalLastMonthEndStr()); }} className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all ${(accountStartDate === getLocalLastMonthStartStr() && accountEndDate === getLocalLastMonthEndStr()) ? 'bg-indigo-500 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>上月</button>
              <button onClick={() => { setAccountStartDate(''); setAccountEndDate(getLocalTodayStr()); }} className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all ${accountStartDate === '' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>全部</button>
            </div>
          </div>
        </div>

        <div className="bg-white py-3 px-4 rounded-2xl border-2 border-indigo-100 text-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 bg-indigo-50 w-24 h-24 rounded-full opacity-50"></div>
          <p className="text-indigo-400 font-extrabold text-[14px] relative z-10"> 💎 淨資產</p>
          <p className={`text-[36px] leading-tight font-black relative z-10 ${netWorth < 0 ? 'text-red-500' : 'text-indigo-700'}`}>${netWorth.toLocaleString()}</p>
          <div className="flex justify-center gap-4 mt-1.5 relative z-10 border-t border-indigo-50 pt-1.5">
            <div className="flex flex-col">
              <span className="text-gray-400 text-[11px] font-bold"> 💰 總資產 (現金+銀行)</span>
              <span className="text-indigo-500 font-black text-[15px]">${totalAssets.toLocaleString()}</span>
            </div>
            <div className="flex flex-col border-l border-indigo-50 pl-4">
              <span className="text-gray-400 text-[11px] font-bold"> 💳 總負債 (信用卡)</span>
              <span className="text-orange-500 font-black text-[15px]">${totalLiabilities.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-50">
          <h2 className="font-bold text-[17px] text-gray-700 mb-3 flex items-center gap-1.5"><Wallet size={18} className="text-emerald-500"/> 現金餘額</h2>
          <div onClick={() => !isEditingBalances && setViewingAccountHistory('現金')} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition' : ''}`}>
            <span className="font-bold text-gray-600 text-[16px]">現金</span>
            {isEditingBalances ? (
              <input type="text" inputMode="numeric" className="w-24 text-right border border-emerald-200 focus:border-emerald-400 p-1 rounded-lg font-bold text-[16px] outline-none transition" value={tempBalances['現金'] === '-' ? '-' : (tempBalances['現金'] === undefined || tempBalances['現金'] === '' ? '' : Number(tempBalances['現金']).toLocaleString())} onChange={e => { let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0'; if (val === '-') return setTempBalances({...tempBalances, '現金': '-'}); if (!isNaN(val)) setTempBalances({...tempBalances, '現金': val}); }} onFocus={e => e.target.select()} placeholder="0" />
            ) : (
              <span className={`font-black text-[20px] ${cashBal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${cashBal.toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
          <div className="flex justify-between items-end mb-3 flex-nowrap">
            <h2 className="font-bold text-[17px] text-gray-700 flex items-center gap-1.5 min-w-0 shrink">
              <Landmark size={18} className="text-blue-500 shrink-0"/>
              <span className="truncate">銀行/電子票證</span>
            </h2>
            <span className="text-[14px] font-extrabold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg shrink-0 ml-2 whitespace-nowrap">小計: ${bankTotal.toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            {banks.length === 0 && eTickets.length === 0 && <p className="text-gray-400 text-[14px] font-bold text-center py-3 bg-gray-50 rounded-xl">無銀行與電子票證，請至設定新增</p>}
            {banks.map(b => {
              const bal = balances[`bank_${b}`] || 0;
              return (
                <div key={`bank_${b}`} onClick={() => !isEditingBalances && setViewingAccountHistory(b)} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition' : ''}`}>
                  <span className="font-bold text-gray-600 text-[16px] truncate pr-2"> 🏦 {b}</span>
                  {isEditingBalances ? (
                    <input type="text" inputMode="numeric" className="w-24 text-right border border-blue-200 focus:border-blue-400 p-1 rounded-lg font-bold text-[16px] outline-none transition" value={tempBalances[`bank_${b}`] === '-' ? '-' : (tempBalances[`bank_${b}`] === undefined || tempBalances[`bank_${b}`] === '' ? '' : Number(tempBalances[`bank_${b}`]).toLocaleString())} onChange={e => { let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0'; if (val === '-') return setTempBalances({...tempBalances, [`bank_${b}`]: '-'}); if (!isNaN(val)) setTempBalances({...tempBalances, [`bank_${b}`]: val}); }} onFocus={e => e.target.select()} placeholder="0" />
                  ) : (
                    <span className={`font-black text-[18px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                  )}
                </div>
              )
            })}
            {eTickets.map(eItem => {
              const bal = balances[`et_${eItem}`] || 0;
              return (
                <div key={`et_${eItem}`} onClick={() => !isEditingBalances && setViewingAccountHistory(eItem)} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-teal-50 hover:border-teal-200 transition' : ''}`}>
                  <span className="font-bold text-gray-600 text-[16px] truncate pr-2"> 🎟️ {eItem}</span>
                  {isEditingBalances ? (
                    <input type="text" inputMode="numeric" className="w-24 text-right border border-teal-200 focus:border-teal-400 p-1 rounded-lg font-bold text-[16px] outline-none transition" value={tempBalances[`et_${eItem}`] === '-' ? '-' : (tempBalances[`et_${eItem}`] === undefined || tempBalances[`et_${eItem}`] === '' ? '' : Number(tempBalances[`et_${eItem}`]).toLocaleString())} onChange={e => { let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0'; if (val === '-') return setTempBalances({...tempBalances, [`et_${eItem}`]: '-'}); if (!isNaN(val)) setTempBalances({...tempBalances, [`et_${eItem}`]: val}); }} onFocus={e => e.target.select()} placeholder="0" />
                  ) : (
                    <span className={`font-black text-[18px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-50">
          <div className="flex justify-between items-end mb-3 flex-nowrap">
            <h2 className="font-bold text-[17px] text-gray-700 flex items-center gap-1.5 min-w-0 shrink">
              <CreditCard size={18} className="text-orange-500 shrink-0"/>
              <span className="truncate">信用卡刷卡</span>
            </h2>
            <span className="text-[14px] font-extrabold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg shrink-0 ml-2 whitespace-nowrap">小計: ${ccTotal.toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            {ccs.length === 0 && <p className="text-gray-400 text-[14px] font-bold text-center py-3 bg-gray-50 rounded-xl">無信用卡，請至設定新增</p>}
            {ccs.map(c => {
              const bal = balances[`cc_${c}`] || 0;
              return (
                <div key={c} onClick={() => !isEditingBalances && setViewingAccountHistory(c)} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition' : ''}`}>
                  <span className="font-bold text-gray-600 text-[16px] truncate pr-2"> 💳 {c}</span>
                  {isEditingBalances ? (
                    <input type="text" inputMode="numeric" className="w-24 text-right border border-orange-200 focus:border-orange-400 p-1 rounded-lg font-bold text-[17px] outline-none transition" value={tempBalances[`cc_${c}`] === '-' ? '-' : (tempBalances[`cc_${c}`] === undefined || tempBalances[`cc_${c}`] === '' ? '' : Number(tempBalances[`cc_${c}`]).toLocaleString())} onChange={e => { let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0'; if (val === '-') return setTempBalances({...tempBalances, [`cc_${c}`]: '-'}); if (!isNaN(val)) setTempBalances({...tempBalances, [`cc_${c}`]: val}); }} onFocus={e => e.target.select()} placeholder="0" />
                  ) : (
                    <span className={`font-black text-[18px] shrink-0 ${bal > 0 ? 'text-orange-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] font-bold text-orange-400 mt-3 bg-orange-50 p-2.5 rounded-xl text-center leading-relaxed">* 行動支付與信用卡金額代表「累積應繳卡費（負債）」。刷卡會增加金額，透過轉帳繳費後金額會減少。</p>
        </div>
      </main>

      {/* 歷史明細反查 Modal 保持與之前一樣即可 */}
      {viewingAccountHistory && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-center p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingAccountHistory(null)}>
          <div className="bg-white w-full max-w-md max-h-[85vh] flex flex-col rounded-[1.5rem] p-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingAccountHistory(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={16}/></button>
            <h3 className="font-black text-[18px] text-gray-800 mb-3 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Wallet size={18} className="text-indigo-500" /> {viewingAccountHistory} 明細
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                const todayStr = getLocalTodayStr();
                const accHistory = records.filter(r => {
                  if (accountStartDate && r.date < accountStartDate) return false;
                  if (accountEndDate && r.date > accountEndDate) return false;
                  if (!accountEndDate && r.date > todayStr) return false;
                  const getAccName = (method, subMethod) => method === '現金' ? '現金' : subMethod;
                  const fromAcc = getAccName(r.method, r.subMethod);
                  const toAcc = getAccName(r.transferToMethod, r.transferToSubMethod);
                  return fromAcc === viewingAccountHistory || toAcc === viewingAccountHistory;
                }).sort((a, b) => {
                  if (a.date !== b.date) return a.date > b.date ? -1 : 1;
                  return b.timestamp - a.timestamp;
                });
                if (accHistory.length === 0) return <p className="text-center text-gray-400 font-bold py-10 text-[14px]">此區間尚無明細</p>;
                return accHistory.map(exp => (
                   <div key={exp.id} onClick={() => setViewingRecord(exp)} className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm mb-2 font-bold text-gray-600 cursor-pointer">
                     <div className="flex justify-between items-center"><span className="text-[12px] text-gray-400">{exp.date}</span><span className="text-[15px] text-gray-800">{exp.title || exp.category}</span><span className={`text-[16px] ${exp.type === 'income' ? 'text-green-500' : 'text-gray-800'}`}>${exp.amount.toLocaleString()}</span></div>
                   </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountsView;
