// 人員專屬色塊統一定義
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

// 日期工具函數
export const getLocalTodayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const getLocalMonthStartStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
export const toROCYearStr = (dateVal) => {
  if (!dateVal) return '';
  let d = (typeof dateVal === 'string' && dateVal.includes('-') && dateVal.length <= 10) 
    ? new Date(dateVal.split('-')[0], dateVal.split('-')[1] - 1, dateVal.split('-')[2], 12, 0, 0) 
    : new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};
// (...保留其餘的 generateFutureDates, getLocalLastMonthStartStr 等日期函數)
