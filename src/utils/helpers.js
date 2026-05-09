// ==========================================
// 人員專屬色塊統一定義
// ==========================================
export const getRoleColorStyle = (role, index = 0) => {
  if (!role) return { bg: 'bg-gray-100', text: 'text-gray-500', borderSel: 'border-gray-200', lightBg: 'bg-gray-100', lightBorder: 'border-transparent' };
  const specificColors = {
    '全家': { bg: 'bg-amber-500', text: 'text-amber-600', borderSel: 'border-amber-600', lightBg: 'bg-amber-50', lightBorder: 'border-amber-200' },
    '老公': { bg: 'bg-lime-500', text: 'text-lime-600', borderSel: 'border-lime-600', lightBg: 'bg-lime-50', lightBorder: 'border-lime-200' },
    '老婆': { bg: 'bg-[#FF8C94]', text: 'text-[#E65A65]', borderSel: 'border-[#FF8C94]', lightBg: 'bg-[#FFF0F2]', lightBorder: 'border-[#FFB6C1]' },
    '蔚蔚': { bg: 'bg-[#48D1CC]', text: 'text-[#289C97]', borderSel: 'border-[#48D1CC]', lightBg: 'bg-[#E6FAFA]', lightBorder: 'border-[#A4EBE8]' },
    '恩恩': { bg: 'bg-[#92A8D1]', text: 'text-[#6A85B6]', borderSel: 'border-[#92A8D1]', lightBg: 'bg-[#F0F4F8]', lightBorder: 'border-[#C5D3EB]' },
  };
  const fallbackColors = [
    { bg: 'bg-sky-500', text: 'text-sky-600', borderSel: 'border-sky-600', lightBg: 'bg-sky-50', lightBorder: 'border-sky-200' },
    { bg: 'bg-violet-500', text: 'text-violet-600', borderSel: 'border-violet-600', lightBg: 'bg-violet-50', lightBorder: 'border-violet-200' },
    { bg: 'bg-rose-500', text: 'text-rose-600', borderSel: 'border-rose-600', lightBg: 'bg-rose-50', lightBorder: 'border-rose-200' },
    { bg: 'bg-cyan-500', text: 'text-cyan-600', borderSel: 'border-cyan-600', lightBg: 'bg-cyan-50', lightBorder: 'border-cyan-200' }
  ];
  return specificColors[role] || fallbackColors[index % fallbackColors.length];
};

// ==========================================
// 房間專屬漸層顏色統一定義 (依據 roomId 雜湊分配)
// ==========================================
export const getRoomHeaderColor = (roomId) => {
  if (!roomId) return 'from-[#cf736c] from-35% via-[#9b728b] to-[#027d9c]';
  const colors = [
    'from-[#cf736c] from-35% via-[#9b728b] to-[#027d9c]',
    'from-[#026c85] from-15% to-[#a15c36]',
    'from-[#367b93] from-40% to-[#d4af37]',
    'from-[#3485ba] from-40% to-[#16213e]',
    'from-teal-600 to-cyan-600',
    'from-[#72a067] from-40% to-[#9ab06e]',
    'from-[#7f4eb3] to-[#a3727e]',
    'from-[#cc2b6e] from-40% via-[#6d2875] to-[#11235a]'
  ];
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = (hash << 5) - hash + roomId.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return colors[Math.abs(hash) % colors.length];
};

// ==========================================
// 計算機邏輯
// ==========================================
export const evaluateCalc = (str) => {
  try {
    if (!str || str === '0') return '0';
    let expr = str.replace(/×/g, '*').replace(/÷/g, '/');
    let result = new Function('return (' + expr + ')')();
    if (!isFinite(result) || isNaN(result)) return '0';
    result = Math.round(result * 100) / 100;
    return String(result);
  } catch(e) { return str; }
};

// ==========================================
// 日期工具函數
// ==========================================
export const getLocalTodayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const getLocalMonthStartStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

export const getLocalLastMonthStartStr = () => {
  const d = new Date();
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const month = d.getMonth() === 0 ? 12 : d.getMonth();
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

export const getLocalLastMonthEndStr = () => {
  const d = new Date();
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const month = d.getMonth() === 0 ? 12 : d.getMonth();
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

export const toROCYearStr = (dateVal) => {
  if (!dateVal) return '';
  let d;
  if (typeof dateVal === 'string' && dateVal.includes('-') && dateVal.length <= 10) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime())) return dateVal;
  return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

export const toROCShortStr = (dateVal) => {
  if (!dateVal) return '';
  let d;
  if (typeof dateVal === 'string' && dateVal.includes('-') && dateVal.length <= 10) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime())) return dateVal;
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}(${days[d.getDay()]})`;
};

// ==========================================
// 週期計算函數
// ==========================================
export const generateFutureDates = (startDateStr, freq, daysArr, intervalStr, customText, maxYears = 1) => {
  const dates = []; if (!startDateStr) return dates;
  const [y, m, d] = startDateStr.split('-').map(Number);
  const startD = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (isNaN(startD.getTime())) return dates;
  const endD = new Date(startD.getTime()); endD.setFullYear(endD.getFullYear() + maxYears);

  const formatDate = (dateObj) => `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  let curr = new Date(startD.getTime()); curr.setDate(curr.getDate() + 1);
  const mapDayToNum = { '週日':0, '週一':1, '週二':2, '週三':3, '週四':4, '週五':5, '週六':6 };

  if (freq === '每週') {
    const targetDays = daysArr.map(d => mapDayToNum[d]).filter(d => d !== undefined);
    if(targetDays.length === 0) return dates;
    while(curr <= endD) { if (targetDays.includes(curr.getDay())) dates.push(formatDate(curr)); curr.setDate(curr.getDate() + 1); }
  } else if (freq === '每月') {
    let nextD = new Date(startD.getTime());
    while (true) { nextD.setMonth(nextD.getMonth() + 1); if (nextD > endD) break; dates.push(formatDate(nextD)); }
  } else if (freq === '區間') {
    let nextD = new Date(startD.getTime());
    while(true) {
      let added = false;
      if (intervalStr === '3個月') { nextD.setMonth(nextD.getMonth() + 3); added = true; }
      else if (intervalStr === '半年') { nextD.setMonth(nextD.getMonth() + 6); added = true; }
      else if (intervalStr === '一年') { nextD.setFullYear(nextD.getFullYear() + 1); added = true; }
      else if (intervalStr === '自訂') {
        const days = parseInt(customText.replace(/\D/g, ''));
        if(!isNaN(days) && days > 0) { nextD.setDate(nextD.getDate() + days); added = true; }
      }
      if (!added || nextD > endD) break;
      dates.push(formatDate(nextD));
    }
  }
  return dates;
};
