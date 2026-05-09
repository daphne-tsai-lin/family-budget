import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown, Send, Check } from 'lucide-react';
import { toROCYearStr, getRoleColorStyle } from '../utils/helpers';

// ==========================================
// 1. 設定區塊 (SettingBlock)
// ==========================================
export const SettingBlock = ({ title, items, onUpdate, themeClass, spanClass, btnClass, placeholder }) => {
  const [newItem, setNewItem] = useState('');
  const [editIdx, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onUpdate([...items, trimmed]);
    setNewItem('');
  };
  const handleDelete = (idx) => {
    const newList = [...items];
    const deletedItem = newList.splice(idx, 1)[0];
    onUpdate(newList, deletedItem, null);
  };
  const handleMove = (idx, dir) => {
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const newList = [...items];
    const temp = newList[idx];
    newList[idx] = newList[idx + dir];
    newList[idx + dir] = temp;
    onUpdate(newList);
  };
  const handleSaveEdit = (idx) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === items[idx]) return setEditIndex(null);
    if (items.includes(trimmed)) return alert('此選項已存在！');
    const oldItem = items[idx];
    const newList = [...items];
    newList[idx] = trimmed;
    onUpdate(newList, oldItem, trimmed);
    setEditIndex(null);
  };
  return (
    <div className={`p-3 sm:p-4 rounded-2xl border-2 ${themeClass} bg-white shadow-sm mb-3`}>
      <h3 className="font-bold text-gray-700 mb-2.5 text-[16px] flex items-center gap-2">{title}</h3>
      <div className="flex flex-col gap-2 mb-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm gap-2 transition-all">
            {editIdx === idx ? (
              <div className="flex flex-1 gap-2 items-center">
                <input type="text" value={editValue} onChange={e=>setEditValue(e.target.value)} className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 outline-none font-bold text-[14px] min-w-0" autoFocus />
                <button onClick={()=>handleSaveEdit(idx)} className="bg-green-500 text-white px-2 py-1.5 rounded-lg text-[13px] font-bold shadow-sm whitespace-nowrap active:scale-95 transition shrink-0">儲存</button>
                <button onClick={()=>setEditIndex(null)} className="bg-gray-400 text-white px-2 py-1.5 rounded-lg text-[13px] font-bold shadow-sm whitespace-nowrap active:scale-95 transition shrink-0">取消</button>
              </div>
            ) : (
              <>
                <span className={`px-2 py-1 rounded-lg text-[14px] font-bold ${spanClass} flex-1 min-w-0 truncate`}>{item}</span>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button onClick={()=>handleMove(idx, -1)} disabled={idx===0} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black">↑</button>
                  <button onClick={()=>handleMove(idx, 1)} disabled={idx===items.length-1} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black">↓</button>
                  <button onClick={()=>{setEditIndex(idx); setEditValue(item);}} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-orange-500 transition"><Pencil size={12}/></button>
                  <button onClick={()=>handleDelete(idx)} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition"><Trash2 size={12}/></button>
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-400 text-[14px] font-bold py-2 text-center bg-gray-50 rounded-xl border border-gray-100">尚無選項</div>}
      </div>
      <div className="flex gap-2">
        <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={placeholder} className={`flex-1 border-2 ${themeClass} bg-gray-50 rounded-xl p-2 outline-none focus:bg-white transition text-[14px] font-bold min-w-0`} onKeyPress={(e) => e.key === 'Enter' && handleAdd()} />
        <button onClick={handleAdd} className={`${btnClass} text-white px-3 py-2 rounded-xl text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95 shrink-0`}>新增</button>
      </div>
    </div>
  );
};

// ==========================================
// 2. 自訂下拉選單 (CustomDropdown)
// ==========================================
export const CustomDropdown = ({ label, icon: Icon, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-1 ml-1">
          {Icon && <Icon size={14} className="text-gray-400" />} {label}
        </label>
      )}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full bg-white border-2 ${isOpen ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'} p-2.5 rounded-xl flex justify-between items-center outline-none transition-all shadow-sm text-left`}>
        <span className={`font-bold text-[14px] truncate pr-2 ${value ? 'text-gray-800' : 'text-gray-300'}`}>{value || placeholder}</span>
        <span className={`text-gray-400 text-[12px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] max-h-60 overflow-y-auto py-1 top-full left-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {options.length === 0 && <li className="px-3 py-2 text-[13px] text-gray-400 font-bold">無選項可用</li>}
          {options.map(opt => (
            <li key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-3 py-2 text-[14px] font-bold cursor-pointer transition-colors flex items-center gap-2 ${value === opt ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{opt}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ==========================================
// 3. 圓餅圖 SVG (MyCustomPieChart)
// ==========================================
export const MyCustomPieChart = ({ data, colors }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-gray-400 text-center py-10 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200 text-sm">無分析數據 📊</div>;
  let cumulativeValue = 0;
  const slices = data.map((slice, i) => {
    const startPercent = cumulativeValue / total;
    cumulativeValue += slice.value;
    const endPercent = cumulativeValue / total;
    const slicePercent = slice.value / total;
    const startAngle = (startPercent - 0.25) * 2 * Math.PI;
    const endAngle = (endPercent - 0.25) * 2 * Math.PI;
    const midAngle = (startPercent + slicePercent / 2 - 0.25) * 2 * Math.PI;
    const isSmall = slicePercent < 0.08;
    return { ...slice, i, startPercent, endPercent, slicePercent, startAngle, endAngle, midAngle, isSmall, anchorSide: Math.cos(midAngle) >= 0 ? 1 : -1, targetY: Math.sin(midAngle) * 1.15 };
  });
  const resolveCollisions = (sideSlices) => {
    const MIN_DIST = 0.16;
    sideSlices.sort((a, b) => a.targetY - b.targetY);
    for (let j = 1; j < sideSlices.length; j++) {
      if (sideSlices[j].targetY - sideSlices[j-1].targetY < MIN_DIST) {
        sideSlices[j].targetY = sideSlices[j-1].targetY + MIN_DIST;
      }
    }
  };
  resolveCollisions(slices.filter(s => s.isSmall && s.anchorSide === 1));
  resolveCollisions(slices.filter(s => s.isSmall && s.anchorSide === -1));
  return (
    <svg viewBox="-1.25 -1.25 2.5 2.5" className="w-full max-w-[200px] h-auto mx-auto drop-shadow-md overflow-visible">
      {slices.map((s) => {
        const color = colors[s.i % colors.length];
        if (s.value === total) {
          return (
            <g key={s.i}>
              <circle r="1" cx="0" cy="0" fill={color} />
              <text x="0" y="0" fill="white" fontSize="0.25" fontWeight="bold" textAnchor="middle" dominantBaseline="central" style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.4)' }}>100%</text>
            </g>
          );
        }
        const startX = Math.cos(s.startAngle), startY = Math.sin(s.startAngle);
        const endX = Math.cos(s.endAngle), endY = Math.sin(s.endAngle);
        const largeArcFlag = s.slicePercent > 0.5 ? 1 : 0;
        const pathData = [`M 0 0`, `L ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `Z`].join(' ');
        if (s.isSmall) {
          const lineStartX = Math.cos(s.midAngle) * 0.9, lineStartY = Math.sin(s.midAngle) * 0.9;
          const bendX = Math.cos(s.midAngle) * 1.05, elbowX = bendX + (0.12 * s.anchorSide);
          return (
            <g key={s.i}>
              <path d={pathData} fill={color} stroke="white" strokeWidth="0.015" className="transition-all duration-300 hover:opacity-80" />
              <polyline points={`${lineStartX},${lineStartY} ${bendX},${s.targetY} ${elbowX},${s.targetY}`} stroke={color} strokeWidth="0.015" fill="none" />
              <text x={elbowX + (0.02 * s.anchorSide)} y={s.targetY} fill={color} fontSize="0.12" fontWeight="bold" textAnchor={s.anchorSide === 1 ? "start" : "end"} dominantBaseline="central">{Math.round(s.slicePercent * 100)}%</text>
            </g>
          );
        } else {
          const textRadius = 0.65;
          const textX = Math.cos(s.midAngle) * textRadius, textY = Math.sin(s.midAngle) * textRadius;
          return (
            <g key={s.i}>
              <path d={pathData} fill={color} stroke="white" strokeWidth="0.015" className="transition-all duration-300 hover:opacity-80" />
              <text x={textX} y={textY} fill="white" fontSize="0.18" fontWeight="bold" textAnchor="middle" dominantBaseline="central" style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.6)' }}>{Math.round(s.slicePercent * 100)}%</text>
            </g>
          );
        }
      })}
    </svg>
  );
};

// ==========================================
// 4. 付款方式選擇器 (MethodSelector)
// ==========================================
export const MethodSelector = ({ label, icon: IconComponent, method, subMethod, setMethod, setSubMethod, currentRoom }) => {
  const getMethodStyle = (opt) => {
    if (opt.includes('現金')) return { bg: 'bg-emerald-500', text: 'text-emerald-600', borderSel: 'border-emerald-600' };
    if (opt.includes('行動支付')) return { bg: 'bg-purple-500', text: 'text-purple-600', borderSel: 'border-purple-600' };
    if (opt.includes('信用卡')) return { bg: 'bg-orange-500', text: 'text-orange-600', borderSel: 'border-orange-600' };
    if (opt.includes('銀行')) return { bg: 'bg-blue-500', text: 'text-blue-600', borderSel: 'border-blue-600' };
    if (opt.includes('電子票證')) return { bg: 'bg-teal-500', text: 'text-teal-600', borderSel: 'border-teal-600' };
    return { bg: 'bg-gray-600', text: 'text-gray-600', borderSel: 'border-gray-600' };
  };
  return (
    <div className="mb-3 z-10 w-full">
      {label && <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 ml-1"><IconComponent size={16} className="text-gray-400" /> {label}</label>}
      <div className="flex flex-wrap bg-gray-50 rounded-xl p-1 border border-gray-100 mb-1 shadow-inner gap-1">
        {(currentRoom?.paymentMethods || []).map(opt => {
          const style = getMethodStyle(opt);
          const isSel = method === opt;
          return (
            <button
              key={opt} type="button"
              onClick={() => {
                setMethod(opt);
                if (opt === '行動支付') setSubMethod(currentRoom?.mobilePayCards?.[0] || currentRoom?.creditCards?.[0] || '');
                else if (['信用卡', '信用卡 / 行動支付'].includes(opt)) setSubMethod(currentRoom?.creditCards?.[0] || '');
                else if (['銀行', '銀行 / 電子票證'].includes(opt)) setSubMethod(currentRoom?.bankAccounts?.[0] || '');
                else if (opt === '電子票證') setSubMethod(currentRoom?.electronicTickets?.[0] || '');
                else setSubMethod('');
              }}
              className={`flex-1 min-w-[28%] sm:min-w-[60px] py-1.5 px-1 rounded-[1rem] text-[13px] sm:text-[14px] font-black transition-all duration-200 flex items-center justify-center truncate border-2 shadow-sm ${isSel ? `${style.bg} text-white ${style.borderSel} transform -translate-y-0.5 z-10` : `bg-white ${style.text} border-transparent hover:border-gray-300 hover:bg-white`}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {['信用卡', '行動支付', '信用卡 / 行動支付'].includes(method) && (
        <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-1.5 shadow-inner mb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const cardList = method === '行動支付' ? (currentRoom?.mobilePayCards || currentRoom?.creditCards || []) : (currentRoom?.creditCards || []);
              if (cardList.length === 0) return <span className="text-gray-400 text-[13px] font-bold py-1 px-2">無可用信用卡</span>;
              return cardList.map(sub => (
                <button key={sub} type="button" onClick={() => setSubMethod(sub)} className={`px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm ${subMethod === sub ? 'bg-orange-500 text-white border-orange-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>{sub}</button>
              ));
            })()}
          </div>
        </div>
      )}
      {['銀行', '銀行 / 電子票證'].includes(method) && currentRoom?.bankAccounts?.length > 0 && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-1.5 shadow-inner mb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1.5">
            {currentRoom.bankAccounts.map(sub => (
              <button key={sub} type="button" onClick={() => setSubMethod(sub)} className={`px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm ${subMethod === sub ? 'bg-blue-500 text-white border-blue-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>{sub}</button>
            ))}
          </div>
        </div>
      )}
      {method === '電子票證' && currentRoom?.electronicTickets?.length > 0 && (
        <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-1.5 shadow-inner mb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1.5">
            {currentRoom.electronicTickets.map(sub => (
              <button key={sub} type="button" onClick={() => setSubMethod(sub)} className={`px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm ${subMethod === sub ? 'bg-teal-500 text-white border-teal-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>{sub}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. 膠囊多選按鈕群組 (PillGroupMulti)
// ==========================================
export const PillGroupMulti = ({ label, icon: Icon, options, values = [], onChange, isPayer = false }) => {
  const hasFamily = values.includes('全家');
  const hasIndividuals = values.some(v => v !== '全家');
  const handleToggle = (opt) => {
    let newVals = [...values];
    if (isPayer) {
      if (opt === '全家') { if (hasFamily) newVals = []; else newVals = ['全家']; }
      else {
        if (hasFamily) newVals = [opt];
        else { if (newVals.includes(opt)) newVals = newVals.filter(v => v !== opt); else newVals.push(opt); }
      }
    } else {
      if (newVals.includes(opt)) newVals = newVals.filter(v => v !== opt); else newVals.push(opt);
    }
    onChange(newVals);
  };
  const renderButtonRow = (rowOptions, startIndex = 0) => (
    <div className="flex w-full gap-1 sm:gap-1.5">
      {rowOptions.map((opt, idxOffset) => {
        const actualIdx = startIndex + idxOffset;
        const isSelected = values.includes(opt);
        const isDisabled = isPayer && ((opt === '全家' && hasIndividuals) || (opt !== '全家' && hasFamily));
        const style = isPayer ? getRoleColorStyle(opt, actualIdx) : { bg: 'bg-[#F59E0B]', text: 'text-gray-700', borderSel: 'border-[#F59E0B]', lightBg: 'bg-[#FFE28A]', lightBorder: 'border-[#F59E0B]' };
        let btnClass = '';
        if (isDisabled) {
          btnClass = 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed opacity-60';
        } else if (isSelected) {
          btnClass = isPayer ? `${style.bg} text-white ${style.borderSel} transform -translate-y-0.5 z-10` : `${style.lightBg} text-gray-900 ${style.borderSel} transform -translate-y-0.5 z-10`;
        } else {
          btnClass = isPayer ? `bg-white ${style.text} border-gray-200 hover:border-gray-300 hover:${style.lightBg}` : `bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50`;
        }
        return (
          <button key={opt} type="button" onClick={() => handleToggle(opt)} className={`flex-1 min-w-0 py-2 px-0.5 rounded-[1.2rem] text-[12px] sm:text-[14px] font-black transition-all duration-200 border-2 shadow-sm flex items-center justify-center leading-tight truncate ${btnClass}`}>
            {opt}
          </button>
        )
      })}
    </div>
  );
  const needsTwoRows = options.length >= 6;
  const splitIndex = Math.ceil(options.length / 2);
  return (
    <div className="mb-3 w-full">
      {label && <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1 ml-1">{Icon && <Icon size={14} className="text-gray-400" />} {label}</label>}
      {needsTwoRows ? (
        <div className="flex flex-col gap-1.5">
          {renderButtonRow(options.slice(0, splitIndex), 0)}
          {renderButtonRow(options.slice(splitIndex), splitIndex)}
        </div>
      ) : (
        renderButtonRow(options, 0)
      )}
    </div>
  );
};

// ==========================================
// 6. 單筆明細項目 (RecordItem)
// ==========================================
export const RecordItem = ({ exp, idx, isSortable = false, hideActions = false, onRecordClick, handleMoveRecord, openEditForm, setCrossRoomRecord }) => {
  const isIncome = exp.type === 'income', isTransfer = exp.type === 'transfer';
  const payerStr = Array.isArray(exp.payer) ? exp.payer.join(', ') : exp.payer;
  const freqDisplay = exp.frequency === '區間' ? (exp.frequencyInterval === '自訂' ? `${exp.frequencyCustomText}天` : exp.frequencyInterval) : exp.frequency;
  const canModify = true; // 放寬權限限制交由上層控制

  const renderMethodText = (method, subMethod) => {
    if (!method || method === '未指定') return null;
    return `${method}${subMethod ? `(${subMethod})` : ''}`;
  };

  return (
    <div key={exp.id} onClick={() => onRecordClick(exp)} className={`bg-white p-2.5 rounded-2xl shadow-sm border ${exp.excludeFromBalance ? 'border-gray-200 opacity-80' : 'border-gray-100'} flex justify-between items-start group relative hover:shadow-md transition duration-300 cursor-pointer`}>
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 rounded-r-md ${isIncome ? 'bg-green-400' : isTransfer ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
      <div className="flex-1 pl-2.5 pr-2 overflow-hidden flex flex-col justify-center py-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-bold text-gray-400">{toROCYearStr(exp.timestamp)} {new Date(exp.timestamp).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
          {exp.addedByRole && <span className={`${getRoleColorStyle(exp.addedByRole).lightBg} ${getRoleColorStyle(exp.addedByRole).text} border ${getRoleColorStyle(exp.addedByRole).lightBorder} px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0`}>{exp.addedByRole}</span>}
          <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{freqDisplay || '一次'}</span>
          {exp.excludeFromBalance && <span className="bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">不計入</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
          {!isTransfer && (
            <>
              <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 bg-gray-50 border-gray-200' : isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{exp.category}</span>
              <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>{exp.title}</span>
            </>
          )}
          {isTransfer && (
            <>
              <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 bg-gray-50 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>轉帳</span>
              <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>{renderMethodText(exp.method, exp.subMethod)} ➜ {renderMethodText(exp.transferToMethod, exp.transferToSubMethod)}</span>
            </>
          )}
          {payerStr && payerStr !== '未指定' && <span className={`text-[11px] font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400' : 'text-gray-500'}`}>👤 {payerStr}</span>}
          {!isTransfer && exp.method && exp.method !== '未指定' && <span className={`text-[11px] font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400' : 'text-gray-500'}`}>💳 {renderMethodText(exp.method, exp.subMethod)}</span>}
          {exp.merchant && exp.merchant !== '未指定' && <span className={`text-[11px] font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400' : 'text-gray-500'}`}>🏪 {exp.merchant}</span>}
          {exp.photoBase64 && <span className="shrink-0 w-[18px] h-[18px] rounded overflow-hidden shadow-sm inline-block border border-gray-200" title="此紀錄附有照片"><img src={exp.photoBase64} alt="圖" className="w-full h-full object-cover" /></span>}
          {exp.note && <span className={`text-[11px] font-bold bg-[#FFFDF9] px-1.5 py-0.5 rounded border border-[#F2EFE9] max-w-[120px] truncate ${exp.excludeFromBalance ? 'text-gray-400' : 'text-gray-500'}`}>📝 {exp.note}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 pt-0.5 pl-1">
        <span className={`font-black text-[20px] sm:text-[22px] ${exp.excludeFromBalance ? 'text-gray-400 line-through decoration-gray-300' : isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-gray-800'}`}>{isIncome ? '+' : isTransfer ? '⇆' : '-'}${exp.amount.toLocaleString()}</span>
        {!hideActions && (
          <div className="grid grid-cols-2 gap-1 mt-1 w-[64px] relative z-20">
            <button onClick={(e) => { e.stopPropagation(); handleMoveRecord(idx, -1); }} disabled={idx === 0 || !isSortable} className={`text-gray-400 hover:text-blue-500 font-bold p-1 transition bg-gray-50 hover:bg-blue-50 rounded shadow-sm flex items-center justify-center disabled:opacity-30 ${!isSortable ? 'cursor-not-allowed' : ''}`}><ArrowUp size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); openEditForm(exp); }} disabled={!canModify} className={`font-bold p-1 transition bg-gray-50 rounded shadow-sm flex items-center justify-center ${canModify ? 'text-gray-400 hover:text-blue-500 hover:bg-blue-50' : 'text-gray-300 opacity-40 cursor-not-allowed'}`}><Pencil size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleMoveRecord(idx, 1); }} disabled={!isSortable} className={`text-gray-400 hover:text-blue-500 font-bold p-1 transition bg-gray-50 hover:bg-blue-50 rounded shadow-sm flex items-center justify-center disabled:opacity-30 ${!isSortable ? 'cursor-not-allowed' : ''}`}><ArrowDown size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); setCrossRoomRecord(exp); }} disabled={!canModify} className={`font-bold p-1 transition bg-gray-50 rounded shadow-sm flex items-center justify-center ${canModify ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-gray-300 opacity-40 cursor-not-allowed'}`}><Send size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
};
