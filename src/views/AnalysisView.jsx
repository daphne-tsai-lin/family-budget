import React, { useState, useMemo } from 'react';
import { X, ChevronRight, PieChart as LucidePieChart, Calendar, BarChart } from 'lucide-react';
import { MyCustomPieChart, PillGroupMulti } from '../components/SharedUI';
import { getLocalTodayStr, getLocalLastMonthStartStr, getLocalLastMonthEndStr, toROCYearStr, getLocalMonthStartStr } from '../utils/helpers';

const AnalysisView = ({ records, currentRoom, setView, setViewingRecord, currentUserRole }) => {
  const defaultRange = currentRoom?.accountDefaultRange || '當月';
  const [analysisStartDate, setAnalysisStartDate] = useState(defaultRange === '全部' ? '' : getLocalMonthStartStr());
  const [analysisEndDate, setAnalysisEndDate] = useState(getLocalTodayStr());
  const [analysisType, setAnalysisType] = useState('expense');
  const [analysisRoleFilter, setAnalysisRoleFilter] = useState('全部');
  const [analysisMenus, setAnalysisMenus] = useState([]);
  const [analysisSubSelections, setAnalysisSubSelections] = useState({ category: [], title: [], merchant: [], method: [], subMethod: [], payer: [] });
  const [viewingAnalysisItem, setViewingAnalysisItem] = useState(null);

  const uniqueRoles = useMemo(() => ['全部', ...new Set(records.map(r => r.addedByRole).filter(Boolean))], [records]);
  const analysisOptions = [
    { id: 'category', label: analysisType === 'income' ? '💰 收入主分類' : analysisType === 'transfer' ? '🔄 轉帳主分類' : '🌸 支出主分類' },
    ...(analysisType === 'expense' ? [{ id: 'title', label: '📝 項目' }, { id: 'merchant', label: '🏪 商家' }, { id: 'method', label: '💳 付款方式' }, { id: 'payer', label: '👥 花費對象' }] : [{ id: 'payer', label: '👥 對象' }])
  ];

  const analysisFilteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.excludeFromBalance) return false;
      const rType = r.type || 'expense';
      if (rType !== analysisType) return false;
      if (analysisStartDate && r.date < analysisStartDate) return false;
      if (analysisEndDate && r.date > analysisEndDate) return false;
      if (analysisRoleFilter !== '全部' && r.addedByRole !== analysisRoleFilter) return false;
      
      if (analysisMenus.includes('category') && analysisSubSelections.category.length > 0 && !analysisSubSelections.category.includes(r.category)) return false;
      if (analysisMenus.includes('title') && analysisSubSelections.title.length > 0 && !analysisSubSelections.title.includes(r.title)) return false;
      if (analysisMenus.includes('merchant') && analysisSubSelections.merchant.length > 0 && !analysisSubSelections.merchant.includes(r.merchant)) return false;
      
      if (analysisMenus.includes('method') && analysisSubSelections.method.length > 0) {
        if (!analysisSubSelections.method.includes(r.method)) return false;
        if (['信用卡', '行動支付', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(r.method)) {
            if (analysisSubSelections.subMethod.length > 0 && !analysisSubSelections.subMethod.includes(r.subMethod)) return false;
        }
      }
      if (analysisMenus.includes('payer') && analysisSubSelections.payer.length > 0) {
        const recordPayers = Array.isArray(r.payer) ? r.payer : [r.payer];
        if (!recordPayers.some(p => analysisSubSelections.payer.includes(p))) return false;
      }
      return true;
    });
  }, [records, analysisType, analysisStartDate, analysisEndDate, analysisRoleFilter, analysisMenus, analysisSubSelections]);

  const getAnalysisKeyForRecord = (r) => {
    let keyParts = [];
    if (analysisMenus.includes('payer')) keyParts.push(Array.isArray(r.payer) ? r.payer.join(', ') : (r.payer || '無對象'));
    if (analysisMenus.includes('category')) keyParts.push(r.category || '未分類');
    if (analysisMenus.includes('title')) keyParts.push(r.title || '無項目');
    if (analysisMenus.includes('merchant')) keyParts.push(r.merchant || '無商家');
    if (analysisMenus.includes('method')) {
      keyParts.push(r.method || '無方式');
      if (r.subMethod) keyParts.push(`(${r.subMethod})`);
    }
    return keyParts.length > 0 ? keyParts.join(' - ') : (r.category || '未分類');
  };

  const chartData = useMemo(() => {
    const map = {};
    analysisFilteredRecords.forEach(r => {
      const key = getAnalysisKeyForRecord(r);
      map[key] = (map[key] || 0) + r.amount;
    });
    return Object.keys(map).map(key => ({ label: key, value: map[key] })).sort((a, b) => b.value - a.value);
  }, [analysisFilteredRecords, analysisMenus]);

  const totalAnalysisAmount = chartData.reduce((sum, d) => sum + d.value, 0);
  const chartColors = ['#F472B6', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F87171', '#38BDF8', '#4ADE80', '#FCD34D', '#C084FC'];

  const handleAnalysisTypeChange = (type) => {
    setAnalysisType(type); setAnalysisMenus([]); setAnalysisSubSelections({ category: [], title: [], merchant: [], method: [], subMethod: [], payer: [] });
  };

  return (
    <div className="h-full flex flex-col bg-[#FFFBF0]">
      <header className="bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-3.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem] border-b-4 border-white/20">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><BarChart size={22} className="text-white/80"/> 統計分析</h1>
          <button onClick={() => setView('room')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold backdrop-blur-sm">返回</button>
        </div>
      </header>
      
      <main className="scroll-container px-3 py-3 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-3">
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border-2 border-teal-50">
          <div className="mb-3">
            <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">付款人 (單選)</label>
            <div className="flex flex-wrap gap-1.5">
              {uniqueRoles.map(role => (
                <button key={role} onClick={() => setAnalysisRoleFilter(role)} className={`px-3 py-1 rounded-lg text-[13px] font-bold transition-all duration-200 ${analysisRoleFilter === role ? 'bg-teal-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">分析類型 (單選)</label>
            <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 shadow-inner">
              {['expense', 'income', 'transfer'].map(type => (
                <button key={type} onClick={() => handleAnalysisTypeChange(type)} className={`flex-1 py-1.5 rounded-lg text-[14px] font-extrabold transition-all duration-200 ${analysisType === type ? `${type === 'expense' ? 'bg-orange-400' : type === 'income' ? 'bg-green-500' : 'bg-blue-500'} text-white shadow-md transform scale-100` : 'text-gray-400 hover:text-gray-600 scale-95'}`}>
                  {type === 'expense' ? '支出' : type === 'income' ? '收入' : '轉帳'}
                </button>
              ))}
            </div>
          </div>
          {/* 找回原版的精準日期區間選擇器 */}
          <div className="flex flex-col gap-2 bg-white p-2 rounded-2xl shadow-sm border border-teal-100 mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-400 shrink-0 ml-1 hidden sm:block" />
              <div className="relative flex-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg overflow-hidden flex justify-center items-center cursor-pointer min-w-0">
                <input type="date" value={analysisStartDate} onChange={e => setAnalysisStartDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                <span className="font-bold text-gray-600 text-[12px] z-0 pointer-events-none truncate">{analysisStartDate ? toROCYearStr(analysisStartDate) : '不限'}</span>
              </div>
              <span className="text-gray-300 text-[12px] font-black shrink-0">~</span>
              <div className="relative flex-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg overflow-hidden flex justify-center items-center cursor-pointer min-w-0">
                <input type="date" value={analysisEndDate} onChange={e => setAnalysisEndDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                <span className="font-bold text-gray-600 text-[12px] z-0 pointer-events-none truncate">{analysisEndDate ? toROCYearStr(analysisEndDate) : '不限'}</span>
              </div>
              <div className="flex shrink-0 gap-0.5 ml-0.5">
                <button onClick={() => { setAnalysisStartDate(getLocalLastMonthStartStr()); setAnalysisEndDate(getLocalLastMonthEndStr()); }} className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all ${(analysisStartDate === getLocalLastMonthStartStr() && analysisEndDate === getLocalLastMonthEndStr()) ? 'bg-teal-500 text-white shadow-sm' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}>上月</button>
                <button onClick={() => { setAnalysisStartDate(''); setAnalysisEndDate(getLocalTodayStr()); }} className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all ${analysisStartDate === '' ? 'bg-teal-500 text-white shadow-sm' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}>全部</button>
              </div>
            </div>
          </div>
          
          {/* 找回進階分析選單 (完全還原原版 5467 行後的邏輯) */}
          <div className="mb-2">
            <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">分析選單 (可複選)</label>
            <div className="flex flex-wrap gap-1.5">
              {analysisOptions.map(opt => (
                <button key={opt.id} type="button" onClick={() => setAnalysisMenus(analysisMenus.includes(opt.id) ? analysisMenus.filter(d => d !== opt.id) : [...analysisMenus, opt.id])} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${analysisMenus.includes(opt.id) ? 'bg-[#A7F3D0] text-teal-800 border-2 border-[#34D399] shadow-sm transform -translate-y-0.5' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {analysisMenus.length > 0 && (
            <div className="pt-3 border-t border-dashed border-gray-100 space-y-3 mt-2">
              <label className="block text-[11px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1.5 rounded-lg inline-block leading-relaxed">💡 依選擇選單篩選細項 (不選代表全部分析)</label>
              {analysisMenus.includes('category') && <PillGroupMulti label={analysisType === 'income' ? '💰 收入主分類' : analysisType === 'transfer' ? '🔄 轉帳主分類' : '🌸 支出主分類'} options={analysisType === 'income' ? (currentRoom?.incomeCategories || []) : analysisType === 'transfer' ? (currentRoom?.transferCategories || []) : (currentRoom?.categories || [])} values={analysisSubSelections.category} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, category: vals})} />}
              {analysisType === 'expense' && analysisMenus.includes('title') && (
                <div className="mb-3 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <label className="block text-[12px] font-bold text-gray-500 mb-2 leading-relaxed">請先選擇上方的主分類篩選，這裡會列出對應的項目讓您勾選</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const targetCats = analysisSubSelections.category.length > 0 ? analysisSubSelections.category : Object.keys(currentRoom?.categoryItems || {});
                      const itemsToShow = [...new Set(targetCats.flatMap(c => currentRoom?.categoryItems?.[c] || []))];
                      return itemsToShow.map(item => (
                        <button key={item} onClick={() => setAnalysisSubSelections({...analysisSubSelections, title: analysisSubSelections.title.includes(item) ? analysisSubSelections.title.filter(v => v !== item) : [...analysisSubSelections.title, item]})} className={`px-2.5 py-1 rounded-lg text-[12px] font-bold transition-all ${analysisSubSelections.title.includes(item) ? 'bg-[#A7F3D0] text-teal-800 border-2 border-[#34D399] shadow-sm' : 'bg-white text-gray-500 border border-gray-100'}`}>{item}</button>
                      ));
                    })()}
                  </div>
                </div>
              )}
              {analysisType === 'expense' && analysisMenus.includes('merchant') && <PillGroupMulti label="🏪 商家" options={currentRoom?.merchants || []} values={analysisSubSelections.merchant} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, merchant: vals})} />}
              {analysisType === 'expense' && analysisMenus.includes('method') && (
                <>
                  <PillGroupMulti label="💳 付款方式" options={currentRoom?.paymentMethods || []} values={analysisSubSelections.method} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, method: vals, subMethod: []})} />
                  {(analysisSubSelections.method.includes('信用卡') || analysisSubSelections.method.includes('行動支付') || analysisSubSelections.method.includes('信用卡 / 行動支付')) && <PillGroupMulti label="💳 選擇信用卡" options={currentRoom?.creditCards || []} values={analysisSubSelections.subMethod} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, subMethod: vals})} />}
                  {(analysisSubSelections.method.includes('銀行') || analysisSubSelections.method.includes('銀行 / 電子票證')) && <PillGroupMulti label="🏦 選擇銀行" options={currentRoom?.bankAccounts || []} values={analysisSubSelections.subMethod} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, subMethod: vals})} />}
                  {analysisSubSelections.method.includes('電子票證') && <PillGroupMulti label="🎟️ 選擇電子票證" options={currentRoom?.electronicTickets || []} values={analysisSubSelections.subMethod} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, subMethod: vals})} />}
                </>
              )}
              {analysisMenus.includes('payer') && (
                <PillGroupMulti label="👥 花費對象" options={currentRoom?.payers || []} values={analysisSubSelections.payer || []} onChange={(vals) => setAnalysisSubSelections({...analysisSubSelections, payer: vals})} isPayer={true} />
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-3.5 rounded-[1.5rem] shadow-sm border-2 border-teal-50">
          <h2 className="font-bold text-teal-700 mb-1 text-[15px] flex items-center gap-2"><LucidePieChart size={16} className="text-teal-400"/> 統計結果</h2>
          <div className="-my-1"><MyCustomPieChart data={chartData} colors={chartColors} /></div>
          <div className="space-y-1.5 mt-1">
            {chartData.length === 0 ? <p className="text-center text-gray-400 font-bold text-[13px] bg-gray-50 py-3 rounded-xl">此條件沒有紀錄喔！</p> : chartData.map((d, idx) => (
              <div key={d.label} onClick={() => setViewingAnalysisItem(d.label)} className="flex justify-between items-center bg-gray-50 py-2 px-2.5 rounded-xl border border-gray-100 hover:shadow-sm cursor-pointer hover:bg-teal-50 hover:border-teal-200 transition">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded shadow-inner" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                  <span className="font-bold text-gray-700 text-[13px] truncate max-w-[150px]">{d.label}</span>
                </div>
                <span className="font-black text-gray-800 text-[14px]">${d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className="bg-teal-50 rounded-xl py-2 px-2.5 mt-2 flex justify-between items-center border border-teal-100 shadow-inner">
              <span className="font-bold text-teal-700 text-[13px]">篩選總計</span><span className="font-black text-teal-600 text-[16px]">${totalAnalysisAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </main>

      {/* 原版的明細彈出視窗 */}
      {viewingAnalysisItem && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-end sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingAnalysisItem(null)}>
          <div className="bg-white w-full max-w-md max-h-[85vh] flex flex-col rounded-[1.5rem] p-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingAnalysisItem(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={16}/></button>
            <h3 className="font-black text-[18px] text-gray-800 mb-3 border-b border-gray-100 pb-2 flex items-center gap-1.5 pr-8"><BarChart size={18} className="text-teal-500 shrink-0" /> <span className="truncate">{viewingAnalysisItem} 明細</span></h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                const analysisDetailRecords = analysisFilteredRecords.filter(r => getAnalysisKeyForRecord(r) === viewingAnalysisItem).sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : b.timestamp - a.timestamp));
                if (analysisDetailRecords.length === 0) return <p className="text-center text-gray-400 font-bold py-10 text-[14px]">查無明細</p>;
                return analysisDetailRecords.map(exp => (
                   <div key={exp.id} onClick={() => setViewingRecord(exp)} className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm mb-2 font-bold text-gray-600 cursor-pointer">
                     <div className="flex justify-between items-center"><span className="text-[12px] text-gray-400">{exp.date}</span><span className="text-[15px] text-gray-800">{exp.title || exp.category}</span><span className={`text-[16px] text-gray-800`}>${exp.amount.toLocaleString()}</span></div>
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
export default AnalysisView;
