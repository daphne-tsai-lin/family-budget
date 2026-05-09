// ==========================================
// 付款方式選擇器 (從原本 App.js 搬移過來)
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
              className={`flex-1 min-w-[28%] sm:min-w-[60px] py-1.5 px-1 rounded-[1rem] text-[13px] sm:text-[14px] font-black transition-all duration-200 flex items-center justify-center truncate border-2 shadow-sm ${isSel ?
                `${style.bg} text-white ${style.borderSel} transform -translate-y-0.5 z-10` : `bg-white ${style.text} border-transparent hover:border-gray-300 hover:bg-white`}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {/* 依據選擇是行動支付或信用卡，決定顯示的清單 */}
      {['信用卡', '行動支付', '信用卡 / 行動支付'].includes(method) && (
        <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-1.5 shadow-inner mb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const cardList = method === '行動支付' ? (currentRoom?.mobilePayCards || currentRoom?.creditCards || []) : (currentRoom?.creditCards || []);
              if (cardList.length === 0) return <span className="text-gray-400 text-[13px] font-bold py-1 px-2">無可用信用卡</span>;
              return cardList.map(sub => (
                <button key={sub} type="button" onClick={() => setSubMethod(sub)} className={`px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm ${subMethod === sub ?
                  'bg-orange-500 text-white border-orange-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>{sub}</button>
              ));
            })()}
          </div>
        </div>
      )}
      {['銀行', '銀行 / 電子票證'].includes(method) && currentRoom?.bankAccounts?.length > 0 && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-1.5 shadow-inner mb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1.5">
            {currentRoom.bankAccounts.map(sub => (
              <button key={sub} type="button" onClick={() => setSubMethod(sub)} className={`px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm ${subMethod === sub ?
                'bg-blue-500 text-white border-blue-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>{sub}</button>
            ))}
          </div>
        </div>
      )}
      {method === '電子票證' && currentRoom?.electronicTickets?.length > 0 && (
        <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-1.5 shadow-inner mb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1.5">
            {currentRoom.electronicTickets.map(sub => (
              <button key={sub} type="button" onClick={() => setSubMethod(sub)} className={`px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm ${subMethod === sub ?
                'bg-teal-500 text-white border-teal-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>{sub}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 膠囊多選按鈕群組 (從原本 App.js 搬移過來)
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
        // 這裡會用到你之前搬進 helpers.js 的 getRoleColorStyle
        const style = isPayer ? getRoleColorStyle(opt, actualIdx) : { bg: 'bg-[#F59E0B]', text: 'text-gray-700', borderSel: 'border-[#F59E0B]', lightBg: 'bg-[#FFE28A]', lightBorder: 'border-[#F59E0B]' };

        let btnClass = '';
        if (isDisabled) {
          btnClass = 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed opacity-60';
        } else if (isSelected) {
          btnClass = isPayer
            ? `${style.bg} text-white ${style.borderSel} transform -translate-y-0.5 z-10`
            : `${style.lightBg} text-gray-900 ${style.borderSel} transform -translate-y-0.5 z-10`;
        } else {
          btnClass = isPayer
            ? `bg-white ${style.text} border-gray-200 hover:border-gray-300 hover:${style.lightBg}`
            : `bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50`;
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
// 共用組件：圓餅圖 SVG (從原本 App.js 搬移過來)
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
