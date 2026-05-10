import { createContext } from 'react';

export const AppContext = createContext(null);

// ==========================================
// 輔助函數 (純邏輯，不涉及狀態)
// ==========================================

export const getRoomHeaderColor = (roomId) => {
  if (!roomId) return 'from-indigo-500 to-purple-600';
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) hash = roomId.charCodeAt(i) + ((hash << 5) - hash);
  const colorIndex = Math.abs(hash) % 5;
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-rose-400',
    'from-blue-500 to-cyan-500',
    'from-fuchsia-500 to-pink-500'
  ];
  return gradients[colorIndex];
};

export const getLocalTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalMonthStartStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export const getLocalLastMonthStartStr = () => {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (month === 0) { month = 12; year -= 1; }
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

export const getLocalLastMonthEndStr = () => {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (month === 0) { month = 12; year -= 1; }
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

export const toROCYearStr = (dateVal) => {
  if (!dateVal) return '';
  let d;
  if (typeof dateVal === 'string' && dateVal.includes('-') && dateVal.length <= 10) {
    const parts = dateVal.split('-');
    const rocYear = parseInt(parts[0], 10) - 1911;
    return `${rocYear}-${parts[1]}-${parts[2]}`;
  } else {
    d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
};

export const toROCShortStr = (dateVal) => {
  if (!dateVal) return '';
  let d;
  if (typeof dateVal === 'string' && dateVal.includes('-') && dateVal.length <= 10) {
    const parts = dateVal.split('-');
    const rocYear = parseInt(parts[0], 10) - 1911;
    return `${rocYear}/${parts[1]}/${parts[2]}`;
  } else {
    d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
};

export const getRoleColorStyle = (role, index = 0) => {
  if (!role) return { bg: 'bg-gray-100', text: 'text-gray-500', borderSel: 'border-gray-200', lightBg: 'bg-gray-100', lightBorder: 'border-transparent' };
  if (role === '老公') return { bg: 'bg-blue-500', text: 'text-blue-600', borderSel: 'border-blue-500', lightBg: 'bg-blue-50', lightBorder: 'border-blue-200' };
  if (role === '老婆') return { bg: 'bg-rose-500', text: 'text-rose-600', borderSel: 'border-rose-500', lightBg: 'bg-rose-50', lightBorder: 'border-rose-200' };
  const colors = [
    { bg: 'bg-emerald-500', text: 'text-emerald-600', borderSel: 'border-emerald-500', lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-200' },
    { bg: 'bg-amber-500', text: 'text-amber-600', borderSel: 'border-amber-500', lightBg: 'bg-amber-50', lightBorder: 'border-amber-200' },
    { bg: 'bg-purple-500', text: 'text-purple-600', borderSel: 'border-purple-500', lightBg: 'bg-purple-50', lightBorder: 'border-purple-200' },
    { bg: 'bg-cyan-500', text: 'text-cyan-600', borderSel: 'border-cyan-500', lightBg: 'bg-cyan-50', lightBorder: 'border-cyan-200' }
  ];
  return colors[index % colors.length];
};

export const generateFutureDates = (startDateStr, freq, days, interval, customDays, maxYears = 1) => {
  if (freq === '一次') return [startDateStr];
  let dates = [];
  let current = new Date(startDateStr + 'T12:00:00');
  
  const limitDate = new Date(startDateStr + 'T12:00:00');
  limitDate.setFullYear(limitDate.getFullYear() + maxYears);

  if (freq === '每週') {
    const dayMap = { '週日': 0, '週一': 1, '週二': 2, '週三': 3, '週四': 4, '週五': 5, '週六': 6 };
    const targetDays = days.map(d => dayMap[d]);
    if (targetDays.length === 0) return [startDateStr];
    let weeks = 0;
    while (weeks < 53 && current <= limitDate) {
      if (targetDays.includes(current.getDay())) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        if (dateStr !== startDateStr && !dates.includes(dateStr)) dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
      if (current.getDay() === 0) weeks++; 
    }
  } else if (freq === '每月') {
    const startDay = current.getDate();
    for (let i = 1; i <= 12; i++) {
      let next = new Date(current.getFullYear(), current.getMonth() + i, startDay, 12, 0, 0);
      if (next.getDate() !== startDay) {
        next = new Date(current.getFullYear(), current.getMonth() + i + 1, 0, 12, 0, 0);
      }
      if (next > limitDate) break;
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, '0');
      const d = String(next.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
  } else if (freq === '區間') {
    let addDays = 0;
    if (interval === '自訂') {
        addDays = parseInt(customDays, 10);
        if (isNaN(addDays) || addDays <= 0) addDays = 1; 
    }
    else if (interval === '2個月') addDays = 60; // 💡 新增 2 個月的邏輯
    else if (interval === '3個月') addDays = 90;
    else if (interval === '半年') addDays = 180;
    else if (interval === '一年') addDays = 365;
    
    if (addDays > 0) {
        let count = 0;
        while (current <= limitDate && count < 12) {
            current.setDate(current.getDate() + addDays);
            if (current > limitDate) break;
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
            count++;
        }
    }
  }
  return [startDateStr, ...dates];
};

export const evaluateCalc = (expr) => {
  try {
    if (!expr) return '';
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (/[^0-9+*/.() -]/.test(sanitized)) return expr;
    const result = new Function(`return ${sanitized}`)();
    if (!isFinite(result)) return '';
    return String(Math.floor(result));
  } catch (e) {
    return expr;
  }
};
