import React, { useState, useMemo } from 'react';
import { X, ChevronRight, PieChart as PieChartIcon } from 'lucide-react';
import { MyCustomPieChart, RecordItem } from '../components/SharedUI';

const AnalysisView = ({ records, currentRoom, setView, setViewingRecord, currentUserRole }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewType, setViewType] = useState('category'); // 'category' or 'payer'
  const [selectedData, setSelectedData] = useState(null); // 用於反查明細 Modal

  // 💡 邏輯防呆：嚴格過濾掉不計入總覽的項目，並支援切換月份
  const validRecords = useMemo(() => records.filter(r => 
    r.date.startsWith(selectedMonth) && 
    (r.type === 'expense' || !r.type) && 
    !r.excludeFromBalance
  ), [records, selectedMonth]);

  // 動態計算圓餅圖資料
  const chartData = useMemo(() => {
    const dataMap = {};
    validRecords.forEach(r => {
      const keys = viewType === 'category' ? [r.category] : (Array.isArray(r.payer) ? r.payer : [r.payer]);
      keys.forEach(k => {
        const key = k || '未分類';
        // 若為多人共同花費，金額平均分攤計算
        dataMap[key] = (dataMap[key] || 0) + (r.amount / keys.length);
      });
    });
    return Object.entries(dataMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [validRecords, viewType]);

  const colors = ['#F87171', '#FB923C', '#FBBF24', '#34D399', '#38BDF8', '#22D3EE', '#818CF8', '#A78BFA', '#C084FC', '#F472B6'];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  // 💡 點擊圓餅圖扇區或列表，自動反查組成該數字的明細
  const handleItemClick = (name) => {
    const filtered = validRecords.filter(r => {
      if (viewType === 'category') return r.category === name;
      return Array.isArray(r.payer) ? r.payer.includes(name) : r.payer === name;
    }).sort((a,b) => b.timestamp - a.timestamp);
    setSelectedData({ name, records: filtered });
  };

  return (
    <div className="h-full flex flex-col bg-[#FFFBF0]">
      <header className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm shrink-0 flex justify-between items-center z-10 rounded-b-2xl">
        <button onClick={() => setView('room')} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition"><X size={24}/></button>
        <h2 className="text-[18px] font-black text-gray-800 tracking-wide flex items-center gap-2"><PieChartIcon size={20}/> 統計分析</h2>
        <div className="w-10 h-10"></div>
      </header>

      <div className="px-4 py-3 shrink-0 flex gap-2">
        <label className="flex-1 relative flex justify-center items-center py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-[14px] font-black text-gray-700 cursor-pointer hover:border-blue-300 transition">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          {selectedMonth}
        </label>
        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
          <button onClick={() => setViewType('category')} className={`px-4 py-1 rounded-lg text-[13px] font-black transition-all ${viewType === 'category' ? 'bg-white text-blue-600 shadow-sm transform -translate-y-0.5' : 'text-gray-400'}`}>依分類</button>
          <button onClick={() => setViewType('payer')} className={`px-4 py-1 rounded-lg text-[13px] font-black transition-all ${viewType === 'payer' ? 'bg-white text-blue-600 shadow-sm transform -translate-y-0.5' : 'text-gray-400'}`}>依成員</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[90px] space-y-4 scroll-smooth">
        <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100">
          <div className="text-center mb-4">
            <span className="text-gray-400 text-[12px] font-bold">區間總支出</span>
            <div className="text-[28px] font-black text-gray-800 leading-none mt-1">${Math.round(total).toLocaleString()}</div>
          </div>
          <div className="h-[200px] flex justify-center items-center"><MyCustomPieChart data={chartData} colors={colors} /></div>
        </div>

        <div className="space-y-2">
          {chartData.map((d, i) => (
            <div key={d.name} onClick={() => handleItemClick(d.name)} className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition group">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: colors[i % colors.length]}}></div>
                <span className="font-bold text-[15px] text-gray-700">{d.name}</span>
                <span className="text-gray-400 text-[12px] font-bold">{Math.round((d.value/total)*100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[16px] text-gray-800">${Math.round(d.value).toLocaleString()}</span>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition" />
              </div>
            </div>
          ))}
          {chartData.length === 0 && <div className="text-center py-6 text-gray-400 font-bold text-[13px]">此區間尚無分析數據</div>}
        </div>
      </div>

      {/* 💡 圓餅圖點擊反查明細 Modal */}
      {selectedData && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-end sm:items-center sm:p-4 backdrop-blur-sm">
          <div className="bg-[#FFFBF0] w-full sm:max-w-[420px] h-[85vh] sm:h-[600px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10">
            <header className="bg-white px-5 py-4 border-b border-gray-100 shadow-sm flex justify-between items-center shrink-0 rounded-t-[2rem]">
              <div>
                <h3 className="text-[18px] font-black text-gray-800 tracking-wide">{selectedData.name} 明細</h3>
                <p className="text-gray-400 text-[12px] font-bold">共 {selectedData.records.length} 筆紀錄</p>
              </div>
              <button onClick={() => setSelectedData(null)} className="p-2 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"><X size={20}/></button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
              {selectedData.records.map((exp, idx) => (
                <RecordItem key={exp.id} exp={exp} idx={idx} currentUserRole={currentUserRole} hideActions={true} onRecordClick={setViewingRecord} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
