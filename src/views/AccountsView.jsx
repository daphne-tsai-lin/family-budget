import React, { useState, useMemo } from 'react';
import { X, ChevronRight, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { RecordItem } from '../components/SharedUI';

const AccountsView = ({ user, activeRoomId, currentRoom, records, setView, setViewingRecord, currentUserRole }) => {
  const [filterRange, setFilterRange] = useState(currentRoom?.accountDefaultRange || '當月');
  const [selectedAccount, setSelectedAccount] = useState(null);

  const displayRecords = useMemo(() => {
    let filtered = records;
    if (filterRange === '當月') {
      const thisMonth = new Date().toISOString().slice(0, 7);
      filtered = filtered.filter(r => r.date.startsWith(thisMonth));
    }
    return filtered;
  }, [records, filterRange]);

  const accountData = useMemo(() => {
    const balances = { ...currentRoom?.initialBalances };
    const creditCards = {};
    (currentRoom?.creditCards || []).forEach(c => creditCards[c] = 0);
    (currentRoom?.mobilePayCards || []).forEach(c => { if(creditCards[c] === undefined) creditCards[c] = 0; });
    (currentRoom?.bankAccounts || []).forEach(b => { if(balances[b] === undefined) balances[b] = 0; });
    if(balances['現金'] === undefined) balances['現金'] = 0;

    displayRecords.forEach(r => {
      // 💡 修正：嚴格排除勾選了「不計入總覽」的明細
      if (r.excludeFromBalance) return; 

      if (r.type === 'expense' || !r.type) {
        if (['信用卡', '行動支付', '信用卡 / 行動支付'].includes(r.method)) {
          if (r.subMethod) creditCards[r.subMethod] = (creditCards[r.subMethod] || 0) + r.amount;
        } else if (['銀行', '銀行 / 電子票證'].includes(r.method)) {
          if (r.subMethod) balances[r.subMethod] = (balances[r.subMethod] || 0) - r.amount;
        } else if (r.method === '現金') {
          balances['現金'] = (balances['現金'] || 0) - r.amount;
        } else if (r.method === '電子票證') {
          if (r.subMethod) balances[r.subMethod] = (balances[r.subMethod] || 0) - r.amount;
        }
      } else if (r.type === 'income') {
        if (['銀行', '銀行 / 電子票證'].includes(r.method)) {
          if (r.subMethod) balances[r.subMethod] = (balances[r.subMethod] || 0) + r.amount;
        } else if (r.method === '現金') {
          balances['現金'] = (balances['現金'] || 0) + r.amount;
        } else if (r.method === '電子票證') {
          if (r.subMethod) balances[r.subMethod] = (balances[r.subMethod] || 0) + r.amount;
        } else if (['信用卡', '行動支付', '信用卡 / 行動支付'].includes(r.method)) {
          if (r.subMethod) creditCards[r.subMethod] = (creditCards[r.subMethod] || 0) - r.amount;
        }
      } else if (r.type === 'transfer') {
        if (['信用卡', '行動支付', '信用卡 / 行動支付'].includes(r.method)) { if (r.subMethod) creditCards[r.subMethod] = (creditCards[r.subMethod] || 0) - r.amount; } 
        else if (['銀行', '銀行 / 電子票證'].includes(r.method)) { if (r.subMethod) balances[r.subMethod] = (balances[r.subMethod] || 0) - r.amount; } 
        else if (r.method === '現金') { balances['現金'] = (balances['現金'] || 0) - r.amount; } 
        else if (r.method === '電子票證') { if (r.subMethod) balances[r.subMethod] = (balances[r.subMethod] || 0) - r.amount; }

        if (['信用卡', '行動支付', '信用卡 / 行動支付'].includes(r.transferToMethod)) { if (r.transferToSubMethod) creditCards[r.transferToSubMethod] = (creditCards[r.transferToSubMethod] || 0) + r.amount; } 
        else if (['銀行', '銀行 / 電子票證'].includes(r.transferToMethod)) { if (r.transferToSubMethod) balances[r.transferToSubMethod] = (balances[r.transferToSubMethod] || 0) + r.amount; } 
        else if (r.transferToMethod === '現金') { balances['現金'] = (balances['現金'] || 0) + r.amount; } 
        else if (r.transferToMethod === '電子票證') { if (r.transferToSubMethod) balances[r.transferToSubMethod] = (balances[r.transferToSubMethod] || 0) + r.amount; }
      }
    });

    const totalAssets = Object.values(balances).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(creditCards).reduce((sum, val) => sum + val, 0);
    return { balances, creditCards, totalAssets, totalLiabilities, netAssets: totalAssets - totalLiabilities };
  }, [displayRecords, currentRoom]);

  const { balances, creditCards, totalAssets, totalLiabilities, netAssets } = accountData;

  const handleAccountClick = (type, name) => {
    // 顯示帳戶反查的明細，這裡的資料包含了所有勾或沒勾的項目，
    // 以便在點進去看的時候，依然能看到被打上刪除線的紀錄
    const accountRecords = displayRecords.filter(r => {
      if (r.type === 'transfer') {
        if (type === 'balance' && ((['銀行', '現金', '電子票證'].includes(r.method) && r.subMethod === name) || (r.method === '現金' && name === '現金'))) return true;
        if (type === 'balance' && ((['銀行', '現金', '電子票證'].includes(r.transferToMethod) && r.transferToSubMethod === name) || (r.transferToMethod === '現金' && name === '現金'))) return true;
        if (type === 'credit' && ['信用卡', '行動支付'].some(m => r.method.includes(m)) && r.subMethod === name) return true;
        if (type === 'credit' && ['信用卡', '行動支付'].some(m => r.transferToMethod.includes(m)) && r.transferToSubMethod === name) return true;
      } else {
        if (type === 'balance') return (['銀行', '現金', '電子票證'].includes(r.method) && r.subMethod === name) || (r.method === '現金' && name === '現金');
        if (type === 'credit') return ['信用卡', '行動支付'].some(m => r.method.includes(m)) && r.subMethod === name;
      }
      return false;
    }).sort((a, b) => b.timestamp - a.timestamp);
    setSelectedAccount({ name, records: accountRecords });
  };

  const AccountCard = ({ name, amount, type, icon: Icon }) => (
    <div onClick={() => handleAccountClick(type, name)} className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition group">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${type === 'credit' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}><Icon size={20} /></div>
        <span className="font-bold text-[15px] text-gray-700">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-black text-[18px] ${type === 'credit' ? (amount > 0 ? 'text-red-500' : 'text-gray-400') : (amount < 0 ? 'text-red-500' : 'text-gray-800')}`}>
          {type === 'credit' ? (amount > 0 ? `-$${amount.toLocaleString()}` : '$0') : `$${amount.toLocaleString()}`}
        </span>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition" />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#FFFBF0]">
      <header className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm shrink-0 flex justify-between items-center z-10 rounded-b-2xl">
        <button onClick={() => setView('room')} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition"><X size={24}/></button>
        <h2 className="text-[18px] font-black text-gray-800 tracking-wide">帳戶總覽</h2>
        <div className="w-10 h-10"></div>
      </header>

      <div className="px-4 py-3 shrink-0">
        <div className="bg-gray-100 p-1 rounded-xl flex shadow-inner border border-gray-200">
          {['當月', '全部'].map(opt => (
            <button key={opt} onClick={() => setFilterRange(opt)} className={`flex-1 py-1.5 rounded-lg text-[14px] font-black transition-all ${filterRange === opt ? 'bg-white text-blue-600 shadow-sm transform -translate-y-0.5' : 'text-gray-400 hover:text-gray-600'}`}>{opt}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[90px] space-y-5 scroll-smooth">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-[1.5rem] shadow-lg text-white">
          <div className="flex justify-between items-end mb-4">
            <div><div className="text-white/80 text-[13px] font-bold mb-1">淨資產</div><div className="text-[32px] font-black leading-none">${netAssets.toLocaleString()}</div></div>
            <PiggyBank size={36} className="text-white/20" />
          </div>
          <div className="flex justify-between border-t border-white/20 pt-3">
            <div><div className="text-white/70 text-[11px] font-bold">總資產</div><div className="font-bold text-[16px]">${totalAssets.toLocaleString()}</div></div>
            <div className="text-right"><div className="text-white/70 text-[11px] font-bold">總負債 (卡費)</div><div className="font-bold text-[16px]">${totalLiabilities.toLocaleString()}</div></div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-400 mb-2 ml-1 text-[14px] flex items-center gap-1.5"><Wallet size={16}/> 現金與銀行帳戶</h3>
          <div className="space-y-2">
            <AccountCard name="現金" amount={balances['現金'] || 0} type="balance" icon={Wallet} />
            {currentRoom?.bankAccounts?.map(b => <AccountCard key={b} name={b} amount={balances[b] || 0} type="balance" icon={PiggyBank} />)}
            {currentRoom?.electronicTickets?.map(b => <AccountCard key={b} name={b} amount={balances[b] || 0} type="balance" icon={Wallet} />)}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-400 mb-2 ml-1 text-[14px] flex items-center gap-1.5"><CreditCard size={16}/> 信用卡負債</h3>
          <div className="space-y-2">
            {Object.keys(creditCards).map(c => <AccountCard key={c} name={c} amount={creditCards[c]} type="credit" icon={CreditCard} />)}
            {Object.keys(creditCards).length === 0 && <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-[13px]">目前無信用卡資料</div>}
          </div>
        </div>
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-end sm:items-center sm:p-4 backdrop-blur-sm">
          <div className="bg-[#FFFBF0] w-full sm:max-w-[420px] h-[85vh] sm:h-[600px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10">
            <header className="bg-white px-5 py-4 border-b border-gray-100 shadow-sm flex justify-between items-center shrink-0 rounded-t-[2rem]">
              <div>
                <h3 className="text-[18px] font-black text-gray-800 tracking-wide">{selectedAccount.name} 明細</h3>
                <p className="text-gray-400 text-[12px] font-bold">共 {selectedAccount.records.length} 筆紀錄</p>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="p-2 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"><X size={20}/></button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
              {selectedAccount.records.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold text-[14px]">這個區間目前沒有紀錄喔！</div>
              ) : (
                selectedAccount.records.map((exp, idx) => (
                  <RecordItem 
                    key={exp.id} 
                    exp={exp} 
                    idx={idx} 
                    currentUserRole={currentUserRole}
                    hideActions={true} 
                    onRecordClick={setViewingRecord} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsView;
