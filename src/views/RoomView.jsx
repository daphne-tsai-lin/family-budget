import React, { useState, useMemo, useContext, useRef } from 'react';
import { Upload, Download, Settings, LogOut, Calendar, Search, X, PiggyBank, Wallet, Plus, BarChart, ChevronDown } from 'lucide-react';
// 💡 引入 getPayerIcons
import { AppContext, getRoomHeaderColor, toROCShortStrWithDay, getLocalTodayStr, getPayerIcons } from '../utils/helpers';
import { RecordItem } from '../components/SharedUI';

const RoomView = ({
  fileInputRef, handleBackup, homeFilterDate, setHomeFilterDate, 
  searchQuery, setSearchQuery, setViewingRecord, handleMoveRecord, onEditRecord, setCrossRoomRecord
}) => {
  const { currentUserRole, activeRoomId, currentRoom, records, setView, setActiveRoomId } = useContext(AppContext);
  const [displayCount, setDisplayCount] = useState(50);
  const headerColorClass = currentRoom?.headerTheme || getRoomHeaderColor(activeRoomId);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

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

  const allFilteredRecords = useMemo(() => {
    const filtered = records.filter(r => {
      if (searchQuery) {
        if (r.date > getLocalTodayStr()) return false;
        const q = searchQuery.toLowerCase();
        return `${r.title||''} ${r.merchant||''} ${r.note||''} ${r.category||''}`.toLowerCase().includes(q);
      }
      if (homeFilterDate) return r.date === homeFilterDate;
      return true;
    });
    return filtered.sort((a,b) => b.timestamp - a.timestamp);
  }, [records, searchQuery, homeFilterDate]);

  const displayRecords = allFilteredRecords.slice(0, displayCount);

  const { totalIncome, totalExpense } = useMemo(() => {
    const income = allFilteredRecords.filter(r => r.type === 'income' && !r.excludeFromBalance).reduce((sum, r) => sum + r.amount, 0);
    const expense = allFilteredRecords.filter(r => (r.type === 'expense' || !r.type) && !r.excludeFromBalance).reduce((sum, r) => sum + r.amount, 0);
    return { totalIncome: income, totalExpense: expense };
  }, [allFilteredRecords]);

  return (
    <>
      <header className={`bg-gradient-to-r ${headerColorClass} px-3 py-2.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem]`}>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex flex-col text-white">
            <h1 className="text-[20px] font-black">{currentRoom?.name || '共同記帳本'}</h1>
            {/* 💡 加入了 getPayerIcons */}
            <p className="text-[13px] opacity-90 font-bold">{getPayerIcons(currentUserRole)} {currentUserRole}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><Upload size={18} /></button>
            <button onClick={handleBackup} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><Download size={18} /></button>
            <button onClick={() => setView('settings')} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><Settings size={18} /></button>
            <button onClick={() => { setActiveRoomId(null); setView('login'); }} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"><LogOut size={18} /></button>
          </div>
        </div>

        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 w-full">
            <div className="relative bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 px-1.5 py-1 flex items-center justify-center overflow-hidden hover:bg-white/30 transition shrink-0 min-w-[110px]">
              <input type="date" value={homeFilterDate} onChange={(e) => setHomeFilterDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
              <Calendar size={13} className="text-white mr-1 shrink-0 z-0"/>
              <span className="text-white text-[12px] font-black drop-shadow-sm z-0 whitespace-nowrap">{homeFilterDate ? toROCShortStrWithDay(homeFilterDate) : '全部日期'}</span>
            </div>
            <button onClick={() => setHomeFilterDate(getLocalTodayStr())} className={`shrink-0 px-2 py-1 rounded-lg transition-all duration-300 font-black text-[12px] shadow-sm backdrop-blur-sm whitespace-nowrap ${homeFilterDate === getLocalTodayStr() ? 'bg-white text-orange-500 scale-105 shadow-md' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
              今天
            </button>
            <div className="relative bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 px-2 py-1 flex items-center overflow-hidden transition flex-1 min-w-0">
              <Search size={13} className="text-white mr-1.5 shrink-0 z-0" />
              <input type="text" placeholder="搜尋..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent outline-none text-white text-[12px] font-black placeholder-white/70 z-0 min-w-0" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white/70 hover:text-white shrink-0 z-10 p-0.5 ml-1"><X size={13}/></button>}
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur p-2.5 rounded-2xl flex justify-between shadow-sm">
          <div className="text-center flex-1 border-r border-gray-100">
            <p className="text-[11px] text-gray-400 font-bold">總支出</p>
            <p className="text-orange-500 font-black text-[16px]">${totalExpense.toLocaleString()}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[11px] text-gray-400 font-bold">總收入</p>
            <p className="text-green-500 font-black text-[16px]">${totalIncome.toLocaleString()}</p>
          </div>
          <div className="text-center flex-1 border-l border-gray-100">
            <p className="text-[11px] text-gray-400 font-bold">結餘</p>
            <p className="text-gray-800 font-black text-[16px]">${(totalIncome - totalExpense).toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3 pb-[90px]" style={{ touchAction: 'pan-y' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {displayRecords.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-[14px]">
            <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"><PiggyBank size={24} className="text-orange-400" /></div>
            <p>目前還沒有紀錄，快使用下方 ＋ 號開始記帳吧！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayRecords.map((exp, idx) => (
              <RecordItem key={exp.id} exp={exp} idx={idx} currentUserRole={currentUserRole} isSortable={!searchQuery && !!homeFilterDate} onRecordClick={setViewingRecord} handleMoveRecord={handleMoveRecord} openEditForm={() => onEditRecord(exp)} setCrossRoomRecord={setCrossRoomRecord} />
            ))}
          </div>
        )}

        {allFilteredRecords.length > displayCount && (
          <button 
            onClick={() => setDisplayCount(prev => prev + 50)}
            className="w-full mt-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-500 font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          >
            <ChevronDown size={18} /> 載入更早之前的紀錄 (剩餘 {allFilteredRecords.length - displayCount} 筆)
          </button>
        )}
      </main>

      <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl p-3 pb-8 rounded-t-[1.5rem] shadow-2xl flex justify-around items-center border-t border-gray-100">
        <button onClick={() => setView('accounts')} className="flex flex-col items-center text-gray-400 hover:text-indigo-500"><Wallet size={22}/><span className="text-[10px] font-bold">帳戶</span></button>
        <button onClick={() => onEditRecord(null)} className="bg-orange-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg -mt-10 border-4 border-[#FFFBF0]"><Plus size={30}/></button>
        <button onClick={() => setView('analysis')} className="flex flex-col items-center text-gray-400 hover:text-teal-500"><BarChart size={22}/><span className="text-[10px] font-bold">統計</span></button>
      </div>
    </>
  );
};
export default RoomView;
