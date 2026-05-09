import React, { useState, useMemo, useContext } from 'react';
import { Upload, Download, Settings, LogOut, Calendar, Search, X, PiggyBank, Wallet, Plus, BarChart, ChevronDown } from 'lucide-react';
import { getRoomHeaderColor, toROCShortStr, getLocalTodayStr } from '../utils/helpers';
import { RecordItem } from '../components/SharedUI';
// 💡 匯入 Context
import { AppContext } from '../App';

const RoomView = ({
  // 💡 看！我們不再需要從上層接 user, records 等資料了，介面變超乾淨
  fileInputRef, homeFilterDate, setHomeFilterDate, 
  searchQuery, setSearchQuery, setViewingRecord, handleMoveRecord, onEditRecord, setCrossRoomRecord
}) => {
  
  // 💡 直接從 Context 拔取需要的全域資料
  const { currentUserRole, activeRoomId, currentRoom, records, setView, setActiveRoomId } = useContext(AppContext);

  // 💡 效能救星：分頁狀態 (預設載入 50 筆)
  const [displayCount, setDisplayCount] = useState(50);
  const headerColorClass = currentRoom?.headerTheme || getRoomHeaderColor(activeRoomId);

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

  // 💡 切取目前需要顯示的筆數，避免記憶體爆炸
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
            <h1 className="text-[20px] font-black">{currentRoom?.name || '林北的小財庫'}</h1>
            <p className="text-[13px] opacity-90 font-bold">👤 {currentUserRole}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('settings')} className="p-2 bg-white/20 rounded-lg text-white"><Settings size={18}/></button>
            <button onClick={() => { setActiveRoomId(null); setView('login'); }} className="p-2 bg-white/20 rounded-lg text-white"><LogOut size={18}/></button>
          </div>
        </div>

        <div className="flex gap-1.5 mb-2">
          <div className="relative flex-1 bg-white/20 border border-white/30 rounded-lg px-2 py-1 flex items-center">
            <Search size={14} className="text-white mr-1.5"/>
            <input type="text" placeholder="搜尋歷史..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent text-white text-[12px] font-bold placeholder-white/60 outline-none" />
          </div>
          <div className="relative bg-white/20 border border-white/30 rounded-lg px-2 py-1 flex items-center">
            <Calendar size={14} className="text-white mr-1.5"/>
            <input type="date" value={homeFilterDate} onChange={e => setHomeFilterDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            <span className="text-white text-[12px] font-black">{homeFilterDate ? toROCShortStr(homeFilterDate) : '全部'}</span>
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

      <main className="flex-1 overflow-y-auto px-3 py-3 pb-[90px]">
        <div className="space-y-2">
          {displayRecords.map((exp, idx) => (
            <RecordItem key={exp.id} exp={exp} idx={idx} currentUserRole={currentUserRole} isSortable={!searchQuery && !!homeFilterDate} onRecordClick={setViewingRecord} handleMoveRecord={handleMoveRecord} openEditForm={() => onEditRecord(exp)} setCrossRoomRecord={setCrossRoomRecord} />
          ))}
        </div>

        {/* 💡 專業級分頁加載按鈕 (保護手機效能) */}
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
