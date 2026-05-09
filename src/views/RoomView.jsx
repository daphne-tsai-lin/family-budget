import React, { useRef, useMemo } from 'react';
import { Upload, Download, Settings, LogOut, Calendar, Search, X, PiggyBank, Wallet, Plus, BarChart } from 'lucide-react';
import { getRoomHeaderColor, toROCShortStr, getLocalTodayStr, getLocalMonthStartStr } from '../utils/helpers';
import { RecordItem } from '../components/SharedUI';

const RoomView = ({
  user, activeRoomId, currentRoom, currentUserRole, records,
  fileInputRef, handleBackup, setView,
  setActiveRoomId, setRoomCode, setRoomPin, setCurrentUserRole, setRoomName,
  homeFilterDate, setHomeFilterDate, searchQuery, setSearchQuery,
  setViewingRecord, handleMoveRecord, onEditRecord, setCrossRoomRecord
}) => {

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const headerColorClass = currentRoom?.headerTheme || getRoomHeaderColor(activeRoomId);

  const displayRecords = useMemo(() => {
    const filtered = records.filter(r => {
      if (searchQuery) {
        if (r.date > getLocalTodayStr()) return false;
        const q = searchQuery.toLowerCase();
        return `${r.title || ''} ${r.merchant || ''} ${r.note || ''} ${r.category || ''} ${r.method || ''} ${r.subMethod || ''} ${r.transferToMethod || ''} ${r.transferToSubMethod || ''} ${Array.isArray(r.payer)?r.payer.join(' '):r.payer || ''}`.toLowerCase().includes(q);
      }
      if (homeFilterDate) return r.date === homeFilterDate;
      return true;
    });
    if (searchQuery || !homeFilterDate) {
      filtered.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1;
        return b.timestamp - a.timestamp;
      });
    }
    return filtered;
  }, [records, searchQuery, homeFilterDate]);

  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    const income = displayRecords.filter(r => r.type === 'income' && !r.excludeFromBalance).reduce((sum, r) => sum + r.amount, 0);
    const expense = displayRecords.filter(r => (r.type === 'expense' || !r.type) && !r.excludeFromBalance).reduce((sum, r) => sum + r.amount, 0);
    return { totalIncome: income, totalExpense: expense, netBalance: income - expense };
  }, [displayRecords]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const xDistance = touchStartX.current - e.changedTouches[0].clientX;
    const yDistance = touchStartY.current - e.changedTouches[0].clientY;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > 40 && homeFilterDate) {
      const parts = homeFilterDate.split('-');
      if (parts.length !== 3) return;
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      if (xDistance > 0) d.setDate(d.getDate() + 1);
      else d.setDate(d.getDate() - 1);
      setHomeFilterDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  };

  return (
    <>
      <header className={`bg-gradient-to-r ${headerColorClass} px-3 py-2.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem] border-b-4 border-white/20`}>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex flex-col">
            <h1 className="text-[22px] font-black text-white drop-shadow-md mb-0.5 leading-tight">{currentRoom?.name || '共同記帳本'}</h1>
            <p className="text-white/90 text-[14px] font-extrabold flex items-center gap-1.5 drop-shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-300 inline-block shadow-sm"></span> {currentUserRole}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><Upload size={18} /></button>
            <button onClick={handleBackup} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><Download size={18} /></button>
            <button onClick={() => setView('settings')} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><Settings size={18} /></button>
            <button onClick={() => { setActiveRoomId(null); setView('login'); setRoomCode(''); setRoomPin(''); setCurrentUserRole(''); setRoomName(''); setHomeFilterDate(getLocalTodayStr()); }} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><LogOut size={18} /></button>
          </div>
        </div>

        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 w-full">
            <div className="relative bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 px-2 py-1 flex items-center overflow-hidden hover:bg-white/30 transition shrink-0">
              <input type="date" value={homeFilterDate} onChange={(e) => setHomeFilterDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
              <Calendar size={13} className="text-white mr-1 shrink-0 z-0"/>
              <span className="text-white text-[12px] font-black drop-shadow-sm z-0 whitespace-nowrap">{homeFilterDate ? toROCShortStr(homeFilterDate) : '全部日期'}</span>
            </div>
            <button onClick={() => setHomeFilterDate(getLocalTodayStr())} className={`shrink-0 px-2 py-1 rounded-lg transition-all duration-300 font-black text-[12px] shadow-sm backdrop-blur-sm whitespace-nowrap ${homeFilterDate === getLocalTodayStr() ? 'bg-white text-orange-500 scale-105 shadow-md' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
              今天
            </button>
            <div className="relative bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 px-2 py-1 flex items-center overflow-hidden transition flex-1 min-w-0">
              <Search size={13} className="text-white mr-1.5 shrink-0 z-0" />
              <input type="text" placeholder="搜尋明細..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent outline-none text-white text-[12px] font-black placeholder-white/70 z-0 min-w-0" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white/70 hover:text-white shrink-0 z-10 p-0.5 ml-1"><X size={13}/></button>}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-end bg-white/95 backdrop-blur-xl p-2.5 rounded-[1rem] shadow-sm">
          <div className="flex flex-col"><span className="text-gray-400 text-[12px] font-bold mb-0.5">總支出</span><span className="text-pink-500 font-black text-[18px] leading-none"> ${totalExpense.toLocaleString()}</span></div>
          <div className="flex flex-col items-center"><span className="text-gray-400 text-[12px] font-bold mb-0.5">總收入</span><span className="text-green-500 font-black text-[18px] leading-none"> ${totalIncome.toLocaleString()}</span></div>
          <div className="flex flex-col items-end"><span className="text-gray-400 text-[12px] font-bold mb-0.5">總結餘</span><span className={`font-black text-[22px] leading-none ${netBalance < 0 ? 'text-red-500' : 'text-gray-800'}`}>${netBalance.toLocaleString()}</span></div>
        </div>
      </header>

      <main className="scroll-container px-3 py-3 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ touchAction: 'pan-y' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div>
          <h3 className="font-bold text-gray-400 mb-2 ml-1 flex items-center gap-1.5 text-[16px]"> 📜 記帳明細</h3>
          {displayRecords.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-[14px]">
              <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"><PiggyBank size={24} className="text-orange-400" /></div>
              <p>目前還沒有紀錄，快使用下方 ＋ 號開始記帳吧！</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayRecords.map((exp, idx) => (
                {/* 💡 傳遞 currentUserId 讓 RecordItem 判斷是否為本人 */}
                <RecordItem key={exp.id} exp={exp} idx={idx} currentUserId={user.uid} isSortable={!searchQuery && homeFilterDate} onRecordClick={setViewingRecord} handleMoveRecord={handleMoveRecord} openEditForm={() => onEditRecord(exp)} setCrossRoomRecord={setCrossRoomRecord} />
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl p-2 pb-6 sm:pb-3 rounded-t-[1.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] flex justify-between items-center z-20 border-t border-gray-100 px-6">
        <button onClick={() => setView('accounts')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-500 transition px-4 py-2"><Wallet size={22} /><span className="font-extrabold text-[11px]">帳戶</span></button>
        <button onClick={() => onEditRecord(null)} className="absolute left-1/2 -translate-x-1/2 -top-5 bg-gradient-to-tr from-pink-400 to-orange-400 text-white w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(251,146,60,0.4)] border-[3px] border-[#FFFBF0] transform hover:scale-105 transition active:scale-95"><Plus size={32} strokeWidth={3} /></button>
        <button onClick={() => setView('analysis')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-teal-500 transition px-4 py-2"><BarChart size={24} /><span className="font-extrabold text-[11px]">統計</span></button>
      </div>
    </>
  );
};

export default RoomView;
