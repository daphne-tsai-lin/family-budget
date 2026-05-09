/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogOut, AlertCircle, Settings, Trash2, X, Sparkles, Home, Plus, Pencil, BarChart, Calendar, Store, Tag, User, CreditCard, RefreshCw, Wallet, PiggyBank, PieChart as LucidePieChart, Download, Upload, Copy, Send, Landmark, Check, ArrowUp, ArrowDown, Search, Camera, Calculator, Image as ImageIcon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc, deleteField, writeBatch } from 'firebase/firestore';

// ==========================================
// 0. 自動載入 Tailwind CSS
// ==========================================
if (typeof document !== 'undefined' && !document.getElementById('tailwind-script')) {
  const script = document.createElement('script');
  script.id = 'tailwind-script';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// ==========================================
// 人員專屬色塊統一定義
// ==========================================
const getRoleColorStyle = (role, index = 0) => {
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
const getRoomHeaderColor = (roomId) => {
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
  // 加入質數擾動，大幅降低短字串或相似字串撞色的機率
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  
  return colors[Math.abs(hash) % colors.length];
};

const ROOM_THEMES = [
  { id: 't1', label: '落櫻碧海', classes: 'from-[#cf736c] from-35% via-[#9b728b] to-[#027d9c]' },
  { id: 't2', label: '深海琥珀', classes: 'from-[#026c85] from-15% to-[#a15c36]' },
  { id: 't3', label: '薩克斯雅金', classes: 'from-[#367b93] from-40% to-[#d4af37]' },
  { id: 't4', label: '瀚海墨藍', classes: 'from-[#3485ba] from-40% to-[#16213e]' },
  { id: 't5', label: '沁涼深海', classes: 'from-teal-600 to-cyan-600' },
  { id: 't6', label: '抹茶青檸', classes: 'from-[#72a067] from-40% to-[#9ab06e]' },
  { id: 't7', label: '蘭紫豆沙', classes: 'from-[#7f4eb3] to-[#a3727e]' },
  { id: 't8', label: '暮色玫瑰', classes: 'from-[#cc2b6e] from-40% via-[#6d2875] to-[#11235a]' }
];

// ==========================================
// 計算機功能與按鍵設定 (馬卡龍色系)
// ==========================================
const calcKeys = [
  { label: 'C', color: 'bg-[#FFD1DC] text-[#9F1239] shadow-sm font-black' },
  { label: '⌫', color: 'bg-[#FFE4B5] text-[#9A3412] shadow-sm font-black' },
  { label: '(', color: 'bg-[#F1F5F9] text-slate-600 shadow-sm font-bold' },
  { label: ')', color: 'bg-[#F1F5F9] text-slate-600 shadow-sm font-bold' },
  { label: '7', color: 'bg-[#E0E7FF] text-[#3730A3] shadow-sm font-black' },
  { label: '8', color: 'bg-[#E0E7FF] text-[#3730A3] shadow-sm font-black' },
  { label: '9', color: 'bg-[#E0E7FF] text-[#3730A3] shadow-sm font-black' },
  { label: '÷', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[22px]' },
  { label: '4', color: 'bg-[#CCFBF1] text-[#115E59] shadow-sm font-black' },
  { label: '5', color: 'bg-[#CCFBF1] text-[#115E59] shadow-sm font-black' },
  { label: '6', color: 'bg-[#CCFBF1] text-[#115E59] shadow-sm font-black' },
  { label: '×', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[22px]' },
  { label: '1', color: 'bg-[#D1FAE5] text-[#065F46] shadow-sm font-black' },
  { label: '2', color: 'bg-[#D1FAE5] text-[#065F46] shadow-sm font-black' },
  { label: '3', color: 'bg-[#D1FAE5] text-[#065F46] shadow-sm font-black' },
  { label: '-', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[24px]' },
  { label: '0', color: 'bg-[#FCE7F3] text-[#9D174D] shadow-sm font-black' },
  { label: '.', color: 'bg-[#FCE7F3] text-[#9D174D] shadow-sm font-black' },
  { label: '=', color: 'bg-[#38BDF8] text-white shadow-md font-black text-[24px]' },
  { label: '+', color: 'bg-[#FEF08A] text-[#B45309] shadow-sm font-black text-[24px]' }
];

const evaluateCalc = (str) => {
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
const getLocalTodayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const getLocalMonthStartStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const getLocalLastMonthStartStr = () => {
    const d = new Date();
    const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
    const month = d.getMonth() === 0 ? 12 : d.getMonth();
    return `${year}-${String(month).padStart(2, '0')}-01`;
};
const getLocalLastMonthEndStr = () => {
    const d = new Date();
    const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
    const month = d.getMonth() === 0 ? 12 : d.getMonth();
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};
const toROCYearStr = (dateVal) => { 
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
const toROCShortStr = (dateVal) => { 
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

const generateFutureDates = (startDateStr, freq, daysArr, intervalStr, customText, maxYears = 1) => {
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

// ==========================================
// Firebase 初始化
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBiFI05fIDz35Zk3n4nodHy9ZoYWqHOnZk",
  authDomain: "lin-buget-7972c.firebaseapp.com",
  projectId: "lin-buget-7972c",
  storageBucket: "lin-buget-7972c.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'linbei-family-app';

// ==========================================
// 共用組件
// ==========================================
const SettingBlock = ({ title, items, onUpdate, themeClass, spanClass, btnClass, placeholder }) => {
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

const CustomDropdown = ({ label, icon: Icon, options, value, onChange, placeholder }) => {
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
// 共用組件：圓餅圖 SVG 
// ==========================================
const MyCustomPieChart = ({ data, colors }) => {
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

export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [view, setView] = useState('login'); 
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [records, setRecords] = useState([]);
  const [savedRooms, setSavedRooms] = useState([]); 

  const [roomCode, setRoomCode] = useState('');
  const [roomPin, setRoomPin] = useState(''); 
  const [roomName, setRoomName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);
  const [crossRoomRecord, setCrossRoomRecord] = useState(null);
  const [selectedTransferRoom, setSelectedTransferRoom] = useState(null); 
  const [viewingRecord, setViewingRecord] = useState(null); 
  const [viewingAccountHistory, setViewingAccountHistory] = useState(null); 
  const [viewingAnalysisItem, setViewingAnalysisItem] = useState(null); 
  const [enlargedPhoto, setEnlargedPhoto] = useState(null); 
  
  const [accountStartDate, setAccountStartDate] = useState(getLocalMonthStartStr());
  const [accountEndDate, setAccountEndDate] = useState(getLocalTodayStr());

  const [recordType, setRecordType] = useState('expense');
  const [recordAmount, setRecordAmount] = useState('0');
  const [recordDate, setRecordDate] = useState(getLocalTodayStr());
  const [recordFrequency, setRecordFrequency] = useState('一次');
  const [recordFrequencyDays, setRecordFrequencyDays] = useState([]); 
  const [recordFrequencyInterval, setRecordFrequencyInterval] = useState(''); 
  const [recordFrequencyCustomText, setRecordFrequencyCustomText] = useState('');
  const [recordPayer, setRecordPayer] = useState([]);
  const [recordCategory, setRecordCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [recordMerchant, setRecordMerchant] = useState('');
  const [recordMethod, setRecordMethod] = useState('');
  const [recordSubMethod, setRecordSubMethod] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [recordPhoto, setRecordPhoto] = useState(null); 
  const [excludeFromBalance, setExcludeFromBalance] = useState(false); 

  const [showCalc, setShowCalc] = useState(false);
  const [calcStr, setCalcStr] = useState('0');

  const [transferToMethod, setTransferToMethod] = useState('');
  const [transferToSubMethod, setTransferToSubMethod] = useState('');

  const [homeFilterDate, setHomeFilterDate] = useState(getLocalTodayStr());
  const [searchQuery, setSearchQuery] = useState('');

  const [settingsTab, setSettingsTab] = useState('expense');
  const [settingSelectedCategory, setSettingSelectedCategory] = useState('');
  const [newRuleItem, setNewRuleItem] = useState('');
  const [newRuleMerchant, setNewRuleMerchant] = useState('');
  const [newMethodRuleMerchant, setNewMethodRuleMerchant] = useState('');
  const [newMethodRuleMethod, setNewMethodRuleMethod] = useState('');
  const [newMethodRuleSubMethod, setNewMethodRuleSubMethod] = useState('');

  const [analysisType, setAnalysisType] = useState('expense'); 
  const [analysisStartDate, setAnalysisStartDate] = useState(getLocalMonthStartStr());
  const [analysisEndDate, setAnalysisEndDate] = useState(getLocalTodayStr());
  const [analysisMenus, setAnalysisMenus] = useState([]); 
  const [analysisSubSelections, setAnalysisSubSelections] = useState({ category: [], title: [], merchant: [], method: [], subMethod: [], payer: [] });
  const [analysisRoleFilter, setAnalysisRoleFilter] = useState('全部');

  const [isEditingBalances, setIsEditingBalances] = useState(false);
  const [tempBalances, setTempBalances] = useState({});
  const [syncSettingsModalOpen, setSyncSettingsModalOpen] = useState(false);
  const [syncTargetRoom, setSyncTargetRoom] = useState('');
  const [syncSelection, setSyncSelection] = useState({}); 
  
  const [availableLoginUsers, setAvailableLoginUsers] = useState(['老公', '老婆']); 
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const fileInputRef = useRef(null); 
  const photoInputRef = useRef(null); 
  const recordDateInputRef = useRef(null); 

  const globalWrapperStyle = "min-h-screen bg-gray-100 sm:py-4 flex justify-center items-center font-sans text-[16px]";
  const phoneContainerStyle = `w-full ${view === 'login' || view === 'create' ? 'max-w-[400px]' : 'max-w-[460px]'} min-h-screen sm:min-h-0 sm:h-[800px] bg-[#FFFBF0] flex flex-col relative sm:rounded-[2.5rem] sm:border-[6px] sm:border-gray-800 shadow-2xl overflow-hidden transition-all duration-500`;

  useEffect(() => {
    const scrollContainers = document.querySelectorAll('main.scroll-container');
    scrollContainers.forEach(container => container.scrollTop = 0);
  }, [view, settingsTab, showAddForm]);

  useEffect(() => {
    window.history.pushState({ trap: true }, '');
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    const handlePopState = (e) => {
      const confirmExit = window.confirm("確定要關閉記帳本嗎？\n\n(免煩惱！您的資料都已經即時安全儲存至雲端囉 ✨)");
      if (!confirmExit) {
        window.history.pushState({ trap: true }, '');
      } else {
        setTimeout(() => { try { window.close(); } catch(err) {} window.history.back(); }, 100);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { setErrorMsg('無法連接資料庫！請確認已在 Firebase 打開「匿名登入」，並將網址加入「授權網域」。'); }
    };
    initAuth();
    try {
      const storedRooms = JSON.parse(localStorage.getItem('expenseApp_savedRooms') || '[]');
      setSavedRooms(storedRooms);
    } catch(e) {}
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if ((view === 'login' || view === 'create') && roomCode && user) {
      const timer = setTimeout(async () => {
        try {
          const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode));
          if (snap.exists() && snap.data().loginUsers) setAvailableLoginUsers(snap.data().loginUsers);
          else setAvailableLoginUsers(['老公', '老婆']);
        } catch (e) {}
      } , 400);
      return () => clearTimeout(timer);
    } else if ((view === 'login' || view === 'create') && !roomCode) {
       setAvailableLoginUsers(['老公', '老婆']);
    }
  }, [roomCode, user, view]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!user || !activeRoomId) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId);
    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) setCurrentRoom({ id: snapshot.id, ...snapshot.data() });
    });
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
    const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const roomRecords = allData.filter(exp => exp.roomId === activeRoomId).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setRecords(roomRecords);
    });
    return () => { unsubscribeRoom(); unsubscribeExpenses(); };
  }, [user, activeRoomId, refreshTrigger]); 

  useEffect(() => {
    if (!records || records.length === 0 || !activeRoomId) return;
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const recordsToPrune = records.filter(r => r.photoBase64 && (now - r.timestamp > NINETY_DAYS_MS));

    if (recordsToPrune.length > 0) {
      const pruneOldPhotos = async () => {
        try {
          const batch = writeBatch(db);
          recordsToPrune.forEach(r => {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id);
            const newNote = r.note ? `${r.note} (圖檔已自動刪除)` : '(圖檔已自動刪除)';
            batch.update(docRef, { photoBase64: deleteField(), note: newNote });
          });
          await batch.commit();
        } catch (e) { console.error("圖片清理失敗", e); }
      };
      pruneOldPhotos();
    }
  }, [records, activeRoomId]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = null;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_SIZE = 800;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setRecordPhoto(canvas.toDataURL('image/jpeg', 0.4));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (currentRoom && activeRoomId) {
      let needsUpdate = false;
      let updates = {};
      const methods = currentRoom.paymentMethods || [];
      let newMethods = [...methods];
      
      if (newMethods.includes('信用卡 / 行動支付')) { const idx = newMethods.indexOf('信用卡 / 行動支付'); newMethods.splice(idx, 1, '行動支付', '信用卡'); needsUpdate = true; }
      if (newMethods.includes('銀行 / 電子票證')) { const idx = newMethods.indexOf('銀行 / 電子票證'); newMethods.splice(idx, 1, '銀行', '電子票證'); needsUpdate = true; }
      if (newMethods.includes('銀行 / 儲值卡')) { const idx = newMethods.indexOf('銀行 / 儲值卡'); newMethods.splice(idx, 1, '銀行', '電子票證'); needsUpdate = true; }
      
      if (needsUpdate) updates.paymentMethods = [...new Set(newMethods)];
      if (!currentRoom.electronicTickets) { updates.electronicTickets = ['點點卡', '悠遊卡', '悠遊付錢包']; needsUpdate = true; }
      
      if (!currentRoom.mobilePayCards) {
          updates.mobilePayCards = currentRoom.creditCards || [];
          needsUpdate = true;
      }
      
      if (needsUpdate) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), updates).catch(console.error);
    }
  }, [currentRoom, activeRoomId]);

  useEffect(() => {
    if (!editRecordId && recordType === 'expense' && selectedItem && currentRoom?.autoFillRules) {
      const defaultMerchant = currentRoom.autoFillRules[selectedItem];
      if (defaultMerchant) setRecordMerchant(defaultMerchant);
    }
  }, [selectedItem, recordType, currentRoom?.autoFillRules, editRecordId]);

  useEffect(() => {
    if (!editRecordId && recordType === 'expense' && recordMerchant && currentRoom?.methodRules) {
      const rule = currentRoom.methodRules[recordMerchant];
      if (rule) { 
        setRecordMethod(rule.method); 
        setRecordSubMethod(rule.subMethod || ''); 
      }
    }
  }, [recordMerchant, recordType, currentRoom?.methodRules, editRecordId]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const xDistance = touchStartX.current - touchEndX;
    const yDistance = touchStartY.current - touchEndY;
    
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > 40) {
      if (!homeFilterDate) return;
      const parts = homeFilterDate.split('-');
      if (parts.length !== 3) return;
      const [y, m, day] = parts.map(Number);
      const d = new Date(y, m - 1, day, 12, 0, 0); 
      
      if (xDistance > 0) d.setDate(d.getDate() + 1);
      else d.setDate(d.getDate() - 1);
      
      setHomeFilterDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  };

  const handleMoveRecord = async (index, direction) => {
    if (!user || (!homeFilterDate && !searchQuery)) return; 
    const displayRecs = searchQuery 
       ? records.filter(r => {
            if (r.date > getLocalTodayStr()) return false;
            const q = searchQuery.toLowerCase();
            return `${r.title || ''} ${r.merchant || ''} ${r.note || ''} ${r.category || ''} ${r.method || ''} ${r.subMethod || ''} ${r.transferToMethod || ''} ${r.transferToSubMethod || ''} ${Array.isArray(r.payer)?r.payer.join(' '):r.payer || ''}`.toLowerCase().includes(q);
         })
       : records.filter(r => r.date === homeFilterDate);
    if (index + direction < 0 || index + direction >= displayRecs.length) return;
    
    const currentTx = displayRecs[index], targetTx = displayRecs[index + direction];
    let currentTs = currentTx.timestamp, targetTs = targetTx.timestamp;
    if (currentTs === targetTs) { if (direction === -1) targetTs -= 1; else targetTs += 1; }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', currentTx.id), { timestamp: targetTs });
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', targetTx.id), { timestamp: currentTs });
      await batch.commit();
    } catch (err) { alert('排序調整失敗：請檢查網路連線'); }
  };

  const saveRoomToLocal = (roomId, roomName, pin, role) => {
    try {
      const currentRooms = JSON.parse(localStorage.getItem('expenseApp_savedRooms') || '[]');
      const newRooms = [{ id: roomId, name: roomName, pin, role }, ...currentRooms.filter(r => r.id !== roomId)].slice(0, 5);
      localStorage.setItem('expenseApp_savedRooms', JSON.stringify(newRooms));
      setSavedRooms(newRooms);
    } catch(e) {}
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!roomCode || !roomPin || !roomName || !currentUserRole) { setErrorMsg('請填寫所有欄位並選擇身份'); return; }
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); return; }
    setIsLoading(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) { setErrorMsg('這個房間代碼已被使用，請換一個'); setIsLoading(false); return; }
      const newRoomData = {
        name: roomName, pin: roomPin, createdBy: user.uid, createdAt: Date.now(),
        loginUsers: availableLoginUsers.length > 0 ? availableLoginUsers : ['老公', '老婆'], 
        categories: ['🍔 飲食', '🚗 交通', '🏠 居住', '💡 水電瓦斯', '🎉 娛樂', '👶 育兒'],
        categoryItems: { '🍔 飲食': ['早餐', '午餐', '晚餐', '飲料', '宵夜', '買菜'], '🚗 交通': ['加油', '大眾運輸', '停車', '保養'], '🏠 居住': ['房租', '日用品', '維修'], '💡 水電瓦斯': ['水費', '電費', '瓦斯費', '電信費'] },
        autoFillRules: { '早餐': '早餐店', '晚餐': '小吃店', '飲料': '飲料店', '加油': '加油站' },
        methodRules: { '麥當勞': { method: '信用卡', subMethod: '點點卡' }, '蝦皮拍賣': { method: '行動支付', subMethod: '國泰世華' } },
        incomeCategories: ['💰 薪水', '🧧 獎金', '📈 投資', '🎁 其他收入'],
        transferCategories: ['💳 信用卡繳款', '🏠 房貸繳款', '🔄 資金調度', '💰 投資理財'],
        payers: ['全家', '老公', '老婆', '恩恩', '蔚蔚'],
        paymentMethods: ['現金', '行動支付', '信用卡', '銀行', '電子票證'],
        creditCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'],
        mobilePayCards: ['玉山銀行', '國泰世華', '台北富邦', '元大銀行'],
        bankAccounts: ['台北富邦', '元大銀行', '中國信託'],
        electronicTickets: ['點點卡', '悠遊卡', '悠遊付錢包'],
        initialBalances: { '現金': 0 },
        promptCashSync: false,
        accountDefaultRange: '當月',
        excludedPromptPayers: []
      };
      await setDoc(roomRef, newRoomData);
      saveRoomToLocal(roomCode, roomName, roomPin, currentUserRole);
      setActiveRoomId(roomCode); setHomeFilterDate(getLocalTodayStr()); setView('room');
    } catch (err) { setErrorMsg('建立房間失敗：' + err.message); } finally { setIsLoading(false); }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!currentUserRole) { setErrorMsg('請點選或輸入「您是誰」喔！'); return; }
    if (!roomCode || !roomPin) { setErrorMsg('請輸入房間代碼和密碼'); return; }
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); return; }
    setIsLoading(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) { setErrorMsg('找不到這個房間代碼'); } 
      else {
        const data = roomSnap.data();
        if (data.pin !== roomPin) { setErrorMsg('房間密碼錯誤！'); } 
        else {
          let rLoginUsers = data.loginUsers || ['老公', '老婆'];
          if (!rLoginUsers.includes(currentUserRole)) {
              rLoginUsers = [...rLoginUsers, currentUserRole];
              updateDoc(roomRef, { loginUsers: rLoginUsers }).catch(()=>{});
          }
          saveRoomToLocal(roomCode, data.name, roomPin, currentUserRole); 
          setActiveRoomId(roomCode); 
          setHomeFilterDate(getLocalTodayStr()); 
          setView('room'); 
        }
      }
    } catch (err) { setErrorMsg('加入房間失敗：' + err.message); } finally { setIsLoading(false); }
  };

  const quickJoinRoom = async (savedRoom) => {
    setIsLoading(true); setErrorMsg('');
    if (!user) { setErrorMsg('資料庫尚未連線，請確認 Firebase 設定。'); setIsLoading(false); return; }
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', savedRoom.id);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists() && roomSnap.data().pin === savedRoom.pin) {
        let roleToUse = savedRoom.role || '其他家人';
        const roomData = roomSnap.data();
        let rLoginUsers = roomData.loginUsers || ['老公', '老婆'];
        if (!rLoginUsers.includes(roleToUse)) {
            rLoginUsers = [...rLoginUsers, roleToUse];
            updateDoc(roomRef, { loginUsers: rLoginUsers }).catch(()=>{});
        }
        setRoomCode(savedRoom.id); setRoomPin(savedRoom.pin); setCurrentUserRole(roleToUse); setActiveRoomId(savedRoom.id); setHomeFilterDate(getLocalTodayStr()); setView('room');
        saveRoomToLocal(savedRoom.id, roomData.name, savedRoom.pin, roleToUse);
      } else { setErrorMsg(`進入「${savedRoom.name || savedRoom.id}」失敗，密碼可能已被更改`); }
    } catch(err) { setErrorMsg('連線失敗：' + err.message); } finally { setIsLoading(false); }
  };

  const handleSaveRecord = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid || !user) return;
    try {
      const isEditing = !!editRecordId;
      const oldRecord = isEditing ? records.find(r => r.id === editRecordId) : null;
      let updateFuture = false;
      if (isEditing && oldRecord?.groupId) updateFuture = window.confirm('這是一筆設定了「週期」的紀錄。\n\n是否要一併變更此系列「未來」的所有紀錄？\n\n(按【確定】一併變更當次與未來，按【取消】則僅修改這單一筆)');
      else if (isEditing && !oldRecord?.groupId && recordFrequency !== '一次') updateFuture = true; 

      const currentGroupId = oldRecord?.groupId || null;
      let newGroupId = null;
      if (isEditing) {
          if (updateFuture) { newGroupId = currentGroupId || (Date.now().toString() + Math.random().toString(36).substring(2, 9)); if (recordFrequency === '一次') newGroupId = null; } 
          else { newGroupId = currentGroupId; }
      } else { newGroupId = recordFrequency === '一次' ? null : (Date.now().toString() + Math.random().toString(36).substring(2, 9)); }

      const parsedAmount = Number(String(recordAmount).replace(/,/g, '').replace(/[^\d]/g, ''));
      const baseData = {
        roomId: activeRoomId, type: recordType, amount: parsedAmount, date: recordDate, frequency: recordFrequency || '一次', frequencyDays: recordFrequencyDays,
        frequencyInterval: recordFrequencyInterval, frequencyCustomText: recordFrequencyCustomText, 
        method: recordMethod || '未指定', 
        subMethod: recordSubMethod || '',
        note: recordNote, addedBy: user.uid, addedByRole: currentUserRole, groupId: newGroupId, photoBase64: recordPhoto || null,
        excludeFromBalance: recordType === 'transfer' ? false : excludeFromBalance
      };

      if (recordType === 'expense') { baseData.payer = recordPayer; baseData.category = recordCategory; baseData.title = selectedItem; baseData.merchant = recordMerchant; } 
      else if (recordType === 'income') { baseData.payer = recordPayer; baseData.category = recordCategory; baseData.title = '收入'; } 
      else if (recordType === 'transfer') { 
        baseData.payer = recordPayer; baseData.category = recordCategory; baseData.title = '轉帳'; 
        baseData.transferToMethod = transferToMethod; 
        baseData.transferToSubMethod = transferToSubMethod; 
      }

      const batch = writeBatch(db);
      let opsCount = 0;

      if (!isEditing) {
        batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...baseData, timestamp: Date.now() });
        opsCount++;
        if (recordFrequency !== '一次') {
          generateFutureDates(recordDate, recordFrequency, recordFrequencyDays, recordFrequencyInterval, recordFrequencyCustomText, 1).forEach(d => {
            if(opsCount >= 490) return;
            const futRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
            const [y, m, day] = d.split('-').map(Number);
            const safeTs = new Date(y, m - 1, day, 7, 0, 0).getTime();
            batch.set(futRef, { ...baseData, date: d, timestamp: safeTs });
            opsCount++;
          });
        }
      } else {
        const curRef = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', editRecordId);
        if (!recordPhoto && oldRecord?.photoBase64) baseData.photoBase64 = deleteField();
        if (!updateFuture && oldRecord?.groupId) { baseData.frequency = '一次'; baseData.frequencyDays = []; baseData.frequencyInterval = ''; baseData.frequencyCustomText = ''; }
        batch.update(curRef, { ...baseData, timestamp: oldRecord.timestamp });
        opsCount++;
        if (updateFuture && currentGroupId) {
          records.filter(r => r.groupId === currentGroupId && r.date > oldRecord.date && r.id !== editRecordId).forEach(r => {
            if(opsCount >= 490) return; batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id)); opsCount++; 
          });
        }
        if (updateFuture && recordFrequency !== '一次') {
           generateFutureDates(recordDate, recordFrequency, recordFrequencyDays, recordFrequencyInterval, recordFrequencyCustomText, 1).filter(d => d > recordDate).forEach(d => {
             if(opsCount >= 490) return;
             const [y, m, day] = d.split('-').map(Number);
             const safeTs = new Date(y, m - 1, day, 7, 0, 0).getTime();
             batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...baseData, date: d, timestamp: safeTs });
             opsCount++;
           });
        }
      }
      
      await batch.commit();
      
      let shouldPrompt = !isEditing && recordType === 'expense' && currentRoom?.promptCashSync && !excludeFromBalance;
      if (shouldPrompt && currentRoom?.excludedPromptPayers?.length > 0) {
          const payers = Array.isArray(recordPayer) ? recordPayer : [recordPayer];
          const isExcluded = payers.some(p => currentRoom.excludedPromptPayers.includes(p));
          if (isExcluded) shouldPrompt = false;
      }

      if (shouldPrompt) {
        setCrossRoomRecord({ ...baseData, id: `auto_${Date.now()}` });
      }
      
      resetForm(); setShowAddForm(false);
    } catch (err) { alert('儲存過程發生錯誤！'); }
  };

  const resetForm = () => {
    setRecordAmount('0'); setCalcStr('0'); setRecordDate(homeFilterDate || getLocalTodayStr()); setRecordFrequency('一次'); setRecordFrequencyDays([]); 
    setRecordFrequencyInterval(''); setRecordFrequencyCustomText(''); setRecordPayer([]); setRecordCategory(''); setSelectedItem('');
    setRecordMerchant(''); setRecordMethod(''); setRecordSubMethod(''); 
    setTransferToMethod(''); setTransferToSubMethod('');
    setRecordNote(''); setRecordPhoto(null); setEditRecordId(null); setExcludeFromBalance(false);
  };

  const openEditForm = (record) => {
    setRecordType(record.type || 'expense'); setRecordAmount(record.amount.toString()); setCalcStr(record.amount.toString());
    setRecordDate(record.date || new Date(record.timestamp).toISOString().split('T')[0]);
    setRecordFrequency(record.frequency || '一次'); setRecordFrequencyDays(record.frequencyDays || []);
    setRecordFrequencyInterval(record.frequencyInterval || ''); setRecordFrequencyCustomText(record.frequencyCustomText || '');
    setRecordNote(record.note || ''); setRecordPayer(Array.isArray(record.payer) ? record.payer : (record.payer && record.payer !== '未指定' ? [record.payer] : []));
    setRecordCategory(record.category === '未指定' ? '' : record.category); 
    setRecordMethod(record.method === '未指定' ? '' : record.method);
    setRecordSubMethod(record.subMethod || ''); 
    setRecordPhoto(record.photoBase64 || null);
    setExcludeFromBalance(record.excludeFromBalance || false);
    if (record.type === 'expense' || !record.type) { setSelectedItem(record.title); setRecordMerchant(record.merchant === '未指定' ? '' : record.merchant); } 
    else if (record.type === 'transfer') { 
      setTransferToMethod(record.transferToMethod === '未指定' ? '' : record.transferToMethod); 
      setTransferToSubMethod(record.transferToSubMethod || ''); 
    }
    setEditRecordId(record.id); setShowAddForm(true); setView('room');
  };

  const handleCopyRecord = (record) => {
    setRecordType(record.type || 'expense'); setRecordAmount(record.amount.toString()); setCalcStr(record.amount.toString());
    setRecordDate(homeFilterDate || getLocalTodayStr()); setRecordFrequency('一次'); setRecordFrequencyDays([]); 
    setRecordFrequencyInterval(''); setRecordFrequencyCustomText(''); setRecordNote(record.note || '');
    setRecordPayer(Array.isArray(record.payer) ? record.payer : (record.payer && record.payer !== '未指定' ? [record.payer] : []));
    setRecordCategory(record.category === '未指定' ? '' : record.category); 
    setRecordMethod(record.method === '未指定' ? '' : record.method);
    setRecordSubMethod(record.subMethod || ''); 
    setRecordPhoto(record.photoBase64 || null);
    setExcludeFromBalance(record.excludeFromBalance || false);
    if (record.type === 'expense' || !record.type) { setSelectedItem(record.title); setRecordMerchant(record.merchant === '未指定' ? '' : record.merchant); } 
    else if (record.type === 'transfer') { 
      setTransferToMethod(record.transferToMethod === '未指定' ? '' : record.transferToMethod); 
      setTransferToSubMethod(record.transferToSubMethod || ''); 
    }
    setEditRecordId(null); setShowAddForm(true); setView('room');
  };

  const handleDeleteRecord = async (record) => {
    if(!user) return;
    let deleteFuture = false;
    if (record.groupId) {
        if(!window.confirm('確定要刪除這筆紀錄嗎？')) return;
        deleteFuture = window.confirm('這是一筆設定了「週期」的紀錄。\n\n是否要一併刪除此系列「未來」的所有紀錄？\n\n(按【確定】一併刪除當次與未來，按【取消】則僅刪除這單一筆)');
    } else { if(!window.confirm('確定要刪除這筆紀錄嗎？')) return; }
    try { 
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', record.id));
      if (deleteFuture && record.groupId) {
          records.filter(r => r.groupId === record.groupId && r.date > record.date && r.id !== record.id).forEach(r => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id)));
      }
      await batch.commit();
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  };

  const handleSendToOtherRoom = async (targetRoomId, keepFrequency) => {
    if (!crossRoomRecord || !user) return;
    try {
      const targetRoomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', targetRoomId);
      const targetRoomSnap = await getDoc(targetRoomRef);
      if (!targetRoomSnap.exists()) return alert('目標房間不存在！');
      const tRoom = targetRoomSnap.data();
      const data = crossRoomRecord;

      // --- 新增卡控：若目標房間缺乏相同的分類、項目、商家，阻擋傳送 ---
      let missingOption = false;
      if (data.type === 'expense' || !data.type) {
          if (data.category && (!tRoom.categories || !tRoom.categories.includes(data.category))) missingOption = true;
          if (data.category && data.title && (!tRoom.categoryItems || !tRoom.categoryItems[data.category] || !tRoom.categoryItems[data.category].includes(data.title))) missingOption = true;
          if (data.merchant && data.merchant !== '未指定' && (!tRoom.merchants || !tRoom.merchants.includes(data.merchant))) missingOption = true;
      } else if (data.type === 'income') {
          if (data.category && (!tRoom.incomeCategories || !tRoom.incomeCategories.includes(data.category))) missingOption = true;
      } else if (data.type === 'transfer') {
          if (data.category && (!tRoom.transferCategories || !tRoom.transferCategories.includes(data.category))) missingOption = true;
      }

      if (missingOption) {
          alert("因無相同選項故無法傳送");
          return;
      }
      // --------------------------------------------------------

      let needsRoomUpdate = false;
      let newRoomData = { ...tRoom };

      const ensureInArray = (field, val) => {
          if (val && val !== '未指定') {
              if (!newRoomData[field]) newRoomData[field] = [];
              if (!newRoomData[field].includes(val)) {
                  newRoomData[field].push(val);
                  needsRoomUpdate = true;
              }
          }
      };

      ensureInArray('loginUsers', data.addedByRole);
      if (Array.isArray(data.payer)) data.payer.forEach(p => ensureInArray('payers', p));
      else ensureInArray('payers', data.payer);

      // (由於已阻擋缺失選項，下方分類與商家基本上不再會觸發新增，保留以備擴充防護)
      if (data.type === 'expense') {
          ensureInArray('categories', data.category);
          ensureInArray('merchants', data.merchant);
          if (data.title) {
              if (!newRoomData.categoryItems) newRoomData.categoryItems = {};
              if (!newRoomData.categoryItems[data.category]) newRoomData.categoryItems[data.category] = [];
              if (!newRoomData.categoryItems[data.category].includes(data.title)) {
                  newRoomData.categoryItems[data.category].push(data.title);
                  needsRoomUpdate = true;
              }
          }
      } else if (data.type === 'income') {
          ensureInArray('incomeCategories', data.category);
      } else if (data.type === 'transfer') {
          ensureInArray('transferCategories', data.category);
      }
      
      ensureInArray('paymentMethods', data.method);
      ensureInArray('paymentMethods', data.transferToMethod);
      
      const ensureSubMethod = (m, sm) => {
          if (!m || m === '未指定') return;
          if (['信用卡', '行動支付', '信用卡 / 行動支付'].includes(m) && sm) ensureInArray('creditCards', sm);
          if (['銀行', '銀行 / 電子票證'].includes(m) && sm) ensureInArray('bankAccounts', sm);
          if (m === '電子票證' && sm) ensureInArray('electronicTickets', sm);
      };
      ensureSubMethod(data.method, data.subMethod);
      ensureSubMethod(data.transferToMethod, data.transferToSubMethod);

      const { id, ...dataToCopy } = data;
      dataToCopy.roomId = targetRoomId; 
      dataToCopy.timestamp = Date.now();
      
      if (!keepFrequency) {
          dataToCopy.frequency = '一次'; dataToCopy.frequencyDays = []; dataToCopy.frequencyInterval = ''; dataToCopy.frequencyCustomText = ''; dataToCopy.groupId = null;
      } else { 
          dataToCopy.groupId = dataToCopy.frequency !== '一次' ? (Date.now().toString() + Math.random().toString(36).substring(2, 9)) : null; 
      }

      const batch = writeBatch(db); 
      if (needsRoomUpdate) batch.update(targetRoomRef, newRoomData);

      let opsCount = needsRoomUpdate ? 1 : 0;
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), dataToCopy); opsCount++;
      
      if (dataToCopy.frequency !== '一次') {
        generateFutureDates(dataToCopy.date, dataToCopy.frequency, dataToCopy.frequencyDays, dataToCopy.frequencyInterval, dataToCopy.frequencyCustomText, 1).forEach(d => {
          if (opsCount >= 490) return;
          batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { ...dataToCopy, date: d, timestamp: new Date(d + 'T07:00:00').getTime() }); opsCount++;
        });
      }
      await batch.commit();
      alert(`✅ 成功傳送${keepFrequency && crossRoomRecord.frequency !== '一次' ? '週期' : '單次'}紀錄至另一個房間！`);
      setCrossRoomRecord(null); setSelectedTransferRoom(null);
    } catch (err) { alert('傳送失敗：請檢查網路連線或權限'); console.error(err); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) throw new Error('檔案格式不正確，需為陣列');
        if (!window.confirm(`確定要匯入 ${importedData.length} 筆資料嗎？\n(將會與目前的紀錄無縫合併)`)) return;
        setIsLoading(true);
        const batch = writeBatch(db); let opsCount = 0; let totalImported = 0;
        for (const record of importedData) {
          if (opsCount >= 490) { await batch.commit(); opsCount = 0; }
          const { id, ...dataToCopy } = record; 
          dataToCopy.roomId = activeRoomId; dataToCopy.groupId = null; 
          if (dataToCopy.frequency !== '一次') dataToCopy.frequency = '一次';
          batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), dataToCopy);
          opsCount++; totalImported++;
        }
        if (opsCount > 0) await batch.commit();
        alert(`✅ 成功匯入 ${totalImported} 筆資料！`);
      } catch (err) { alert('匯入失敗：' + err.message); } finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = null; }
    };
    reader.readAsText(file);
  };

  const handleBackup = () => {
    if (!records || records.length === 0) return alert('目前沒有資料可以備份喔！');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `expense_backup_${getLocalTodayStr()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getAccKey = (method, subMethod) => {
    if (method === '現金') return '現金';
    if (['信用卡 / 行動支付', '信用卡', '行動支付'].includes(method)) return `cc_${subMethod}`;
    if (['銀行 / 電子票證', '銀行 / 儲值卡', '銀行 / 卡片', '銀行'].includes(method)) return `bank_${subMethod}`;
    if (method === '電子票證') return `et_${subMethod}`;
    if ((currentRoom?.creditCards || []).includes(method)) return `cc_${method}`;
    if ((currentRoom?.electronicTickets || []).includes(method)) return `et_${method}`;
    return `bank_${method}`;
  };

  const getBalances = () => {
    const initial = currentRoom?.initialBalances || {}; const balances = { '現金': initial['現金'] || 0 };
    (currentRoom?.bankAccounts || []).forEach(b => balances[`bank_${b}`] = initial[`bank_${b}`] !== undefined ? initial[`bank_${b}`] : (initial[b] || 0));
    (currentRoom?.electronicTickets || []).forEach(e => balances[`et_${e}`] = initial[`et_${e}`] !== undefined ? initial[`et_${e}`] : (initial[e] || 0));
    (currentRoom?.creditCards || []).forEach(c => balances[`cc_${c}`] = initial[`cc_${c}`] !== undefined ? initial[`cc_${c}`] : (initial[c] || 0));
    records.forEach(r => {
      if (accountStartDate && r.date < accountStartDate) return;
      if (accountEndDate && r.date > accountEndDate) return;
      if (!accountEndDate && r.date > getLocalTodayStr()) return;
      if (r.excludeFromBalance) return; 
      
      const amt = Number(r.amount) || 0;
      if (r.type === 'expense' || !r.type) { const key = getAccKey(r.method, r.subMethod); if (key) balances[key] = (balances[key] || 0) + (key.startsWith('cc_') ? amt : -amt); } 
      else if (r.type === 'income') { const key = getAccKey(r.method, r.subMethod); if (key) balances[key] = (balances[key] || 0) + (key.startsWith('cc_') ? -amt : amt); } 
      else if (r.type === 'transfer') {
        const fromKey = getAccKey(r.method, r.subMethod), toKey = getAccKey(r.transferToMethod, r.transferToSubMethod);
        if (fromKey) balances[fromKey] = (balances[fromKey] || 0) + (fromKey.startsWith('cc_') ? amt : -amt);
        if (toKey) balances[toKey] = (balances[toKey] || 0) + (toKey.startsWith('cc_') ? -amt : amt);
      }
    });
    return balances;
  };

  const handleSaveBalances = async () => {
    if (!user) return;
    try {
      const updatedBalances = { ...currentRoom?.initialBalances };
      for (const [key, val] of Object.entries(tempBalances)) if (val !== '') updatedBalances[key] = Number(val);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { initialBalances: updatedBalances });
      setIsEditingBalances(false);
    } catch (err) { alert("儲存餘額失敗：請檢查網路連線"); }
  };

  const orderedAutoFillKeys = useMemo(() => {
    if (!currentRoom) return [];
    const keys = Object.keys(currentRoom.autoFillRules || {});
    const order = currentRoom.autoFillRuleOrder || [];
    const validOrder = order.filter(k => keys.includes(k));
    const missing = keys.filter(k => !validOrder.includes(k));
    return [...validOrder, ...missing];
  }, [currentRoom?.autoFillRules, currentRoom?.autoFillRuleOrder]);

  const orderedMethodKeys = useMemo(() => {
    if (!currentRoom) return [];
    const keys = Object.keys(currentRoom.methodRules || {});
    const order = currentRoom.methodRuleOrder || [];
    const validOrder = order.filter(k => keys.includes(k));
    const missing = keys.filter(k => !validOrder.includes(k));
    return [...validOrder, ...missing];
  }, [currentRoom?.methodRules, currentRoom?.methodRuleOrder]);

  const syncHistoricalData = async (settingField, oldItem, newItem) => {
    const updatesList = [];
    for (let r of records) {
        let updatedData = {}; let needsUpdate = false;
        if (settingField === 'categories' && r.type === 'expense' && r.category === oldItem) { needsUpdate = true; updatedData.category = newItem; } 
        else if (settingField === 'incomeCategories' && r.type === 'income' && r.category === oldItem) { needsUpdate = true; updatedData.category = newItem; } 
        else if (settingField === 'transferCategories' && r.type === 'transfer' && r.category === oldItem) { needsUpdate = true; updatedData.category = newItem; } 
        else if (settingField === 'merchants' && r.merchant === oldItem) { needsUpdate = true; updatedData.merchant = newItem; } 
        else if (settingField === 'payers') {
            if (Array.isArray(r.payer) && r.payer.includes(oldItem)) { needsUpdate = true; updatedData.payer = r.payer.map(p => p === oldItem ? newItem : p); } 
            else if (r.payer === oldItem) { needsUpdate = true; updatedData.payer = [newItem]; }
        } 
        else if (settingField === 'paymentMethods') {
            if (r.method === oldItem) { needsUpdate = true; updatedData.method = newItem; }
            if (r.transferToMethod === oldItem) { needsUpdate = true; updatedData.transferToMethod = newItem; }
        } 
        else if (['creditCards', 'bankAccounts', 'electronicTickets'].includes(settingField)) {
            if (r.subMethod === oldItem) { needsUpdate = true; updatedData.subMethod = newItem; }
            if (r.transferToSubMethod === oldItem) { needsUpdate = true; updatedData.transferToSubMethod = newItem; }
        } 
        else if (settingField === 'loginUsers') {
            if (r.addedByRole === oldItem) { needsUpdate = true; updatedData.addedByRole = newItem; }
        }
        if (needsUpdate) updatesList.push({ ref: doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id), data: updatedData });
    }
    if (updatesList.length > 0) {
        let batch = writeBatch(db); let count = 0;
        for (const update of updatesList) {
            batch.update(update.ref, update.data); count++;
            if (count === 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
        }
        if (count > 0) await batch.commit();
    }
  };

  const updateSettingField = async (field, newList, oldItem, newItem) => {
    if (!currentRoom || !user || !activeRoomId) return;
    try {
      const updates = { [field]: newList };
      
      if (field === 'categories' && oldItem && newItem && currentRoom.categoryItems && currentRoom.categoryItems[oldItem]) {
         updates[`categoryItems.${newItem}`] = currentRoom.categoryItems[oldItem];
         updates[`categoryItems.${oldItem}`] = deleteField();
      }
      
      if (field === 'creditCards') {
          if (oldItem && newItem && oldItem !== newItem) { 
              let newMobilePayCards = [...(currentRoom.mobilePayCards || [])];
              const idx = newMobilePayCards.indexOf(oldItem);
              if (idx > -1) { newMobilePayCards[idx] = newItem; updates.mobilePayCards = newMobilePayCards; }
          } else if (oldItem && !newItem) { 
              let newMobilePayCards = (currentRoom.mobilePayCards || []).filter(c => c !== oldItem);
              updates.mobilePayCards = newMobilePayCards;
          }
      }

      if (oldItem && newItem && oldItem !== newItem) {
         let rulesChanged = false;
         let newAutoFill = { ...currentRoom.autoFillRules };
         let newMethodRules = { ...currentRoom.methodRules };
         if (field === 'merchants') {
            Object.keys(newAutoFill).forEach(k => { if (newAutoFill[k] === oldItem) { newAutoFill[k] = newItem; rulesChanged = true; } });
            if (newMethodRules[oldItem]) { newMethodRules[newItem] = newMethodRules[oldItem]; delete newMethodRules[oldItem]; rulesChanged = true; }
         } else if (field === 'paymentMethods') {
            Object.keys(newMethodRules).forEach(k => { if (newMethodRules[k].method === oldItem) { newMethodRules[k].method = newItem; rulesChanged = true; } });
         } else if (['creditCards', 'bankAccounts', 'electronicTickets'].includes(field)) {
            Object.keys(newMethodRules).forEach(k => { if (newMethodRules[k].subMethod === oldItem) { newMethodRules[k].subMethod = newItem; rulesChanged = true; } });
         }
         if (rulesChanged) { if (field === 'merchants') updates.autoFillRules = newAutoFill; updates.methodRules = newMethodRules; }
      }
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), updates);
      if (oldItem && newItem && oldItem !== newItem) await syncHistoricalData(field, oldItem, newItem);
    } catch (err) { alert('更新失敗：請檢查網路連線'); }
  };

  const updateCategoryItemsField = async (category, newList, oldItem, newItem) => {
    if (!currentRoom || !category || !user || !activeRoomId) return;
    try {
      const updates = { [`categoryItems.${category}`]: newList };
      if (oldItem && newItem && oldItem !== newItem) {
         let newAutoFill = { ...currentRoom.autoFillRules };
         if (newAutoFill[oldItem]) { newAutoFill[newItem] = newAutoFill[oldItem]; delete newAutoFill[oldItem]; updates.autoFillRules = newAutoFill; }
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), updates);
      if (oldItem && newItem && oldItem !== newItem) {
         const updatesList = [];
         for (let r of records) {
             if (r.type === 'expense' && r.category === category && r.title === oldItem) updatesList.push({ ref: doc(db, 'artifacts', appId, 'public', 'data', 'expenses', r.id), data: { title: newItem } });
         }
         if (updatesList.length > 0) {
            let batch = writeBatch(db); let count = 0;
            for (const update of updatesList) {
                batch.update(update.ref, update.data); count++;
                if (count === 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
            }
            if (count > 0) await batch.commit();
         }
      }
    } catch (err) { alert('更新失敗：請檢查網路連線'); }
  };

  const handleMoveRule = async (itemKey, dir) => {
      if (!user || !currentRoom) return;
      const keys = [...orderedAutoFillKeys]; const idx = keys.indexOf(itemKey);
      if (idx + dir < 0 || idx + dir >= keys.length) return;
      [keys[idx], keys[idx+dir]] = [keys[idx+dir], keys[idx]];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { autoFillRuleOrder: keys });
  };

  const handleMoveMethodRule = async (merchantKey, dir) => {
      if (!user || !currentRoom) return;
      const keys = [...orderedMethodKeys]; const idx = keys.indexOf(merchantKey);
      if (idx + dir < 0 || idx + dir >= keys.length) return;
      [keys[idx], keys[idx+dir]] = [keys[idx+dir], keys[idx]];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { methodRuleOrder: keys });
  };

  const handleAddRule = async () => {
    if (!newRuleItem || !newRuleMerchant || !activeRoomId || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { 
        [`autoFillRules.${newRuleItem}`]: newRuleMerchant, autoFillRuleOrder: [...orderedAutoFillKeys, newRuleItem]
      });
      setNewRuleItem(''); setNewRuleMerchant('');
    } catch (err) { alert('新增失敗：請檢查網路連線'); }
  };

  const handleDeleteRule = async (itemToRemove) => {
    if (!user) return;
    try {
      const newRules = { ...currentRoom.autoFillRules }; delete newRules[itemToRemove];
      const newOrder = orderedAutoFillKeys.filter(k => k !== itemToRemove);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { autoFillRules: newRules, autoFillRuleOrder: newOrder });
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  }

  const handleAddMethodRule = async () => {
    if (!newMethodRuleMerchant || !newMethodRuleMethod || !activeRoomId || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), {
        [`methodRules.${newMethodRuleMerchant}`]: { method: newMethodRuleMethod, subMethod: newMethodRuleSubMethod },
        methodRuleOrder: [...orderedMethodKeys, newMethodRuleMerchant]
      });
      setNewMethodRuleMerchant(''); setNewMethodRuleMethod(''); setNewMethodRuleSubMethod(''); 
    } catch (err) { alert('新增失敗：請檢查網路連線'); }
  };

  const handleDeleteMethodRule = async (merchant) => {
    if (!user) return;
    try {
      const newRules = { ...currentRoom.methodRules }; delete newRules[merchant];
      const newOrder = orderedMethodKeys.filter(k => k !== merchant);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { methodRules: newRules, methodRuleOrder: newOrder });
    } catch (err) { alert('刪除失敗：請檢查網路連線'); }
  }

  const SYNC_FIELDS = [
    { key: 'categories', label: '🌸 支出分類 (含子項目)' }, { key: 'merchants', label: '🏪 常見商家' },
    { key: 'loginUsers', label: '🙋 登入人員' }, { key: 'payers', label: '👥 花費對象' },
    { key: 'paymentMethods', label: '💳 付款方式類別' }, { key: 'creditCards', label: '💳 信用卡清單' },
    { key: 'mobilePayCards', label: '📱 行動支付綁定信用卡' },
    { key: 'bankAccounts', label: '🏦 銀行清單' }, { key: 'electronicTickets', label: '🎟️ 電子票證清單' },
    { key: 'incomeCategories', label: '💰 收入分類' }, { key: 'transferCategories', label: '🔄 轉帳分類' },
    { key: 'autoFillRules', label: '🤖 商家預設規則' }, { key: 'methodRules', label: '🤖 付款方式預設規則' }
  ];

  const handleToggleSyncItem = (field, item) => {
    setSyncSelection(prev => {
        const list = prev[field] || [];
        if (list.includes(item)) return { ...prev, [field]: list.filter(i => i !== item) };
        else return { ...prev, [field]: [...list, item] };
    });
  };

  const handleSelectAllSyncField = (field, allItems) => {
    setSyncSelection(prev => {
        const currentList = prev[field] || [];
        if (currentList.length === allItems.length) return { ...prev, [field]: [] };
        else return { ...prev, [field]: [...allItems] };
    });
  };

  const handleSyncSettings = async () => {
    const keysToSync = SYNC_FIELDS.map(f => f.key);
    let hasSelection = false;
    keysToSync.forEach(k => { if (syncSelection[k] && syncSelection[k].length > 0) hasSelection = true; });

    if (!syncTargetRoom || !hasSelection) return alert('請選擇目標房間及要同步的項目');
    if (!window.confirm('確定要將勾選的設定同步到目標房間嗎？\n(原本目標房間的設定會被保留並合併)')) return;

    try {
      const targetRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', syncTargetRoom);
      const targetSnap = await getDoc(targetRef);
      if (!targetSnap.exists()) return alert('找不到目標房間');
      
      const targetData = targetSnap.data();
      const updates = {};
      
      keysToSync.forEach(opt => {
         const selectedItems = syncSelection[opt];
         if (!selectedItems || selectedItems.length === 0) return;

         if (opt === 'categories') {
            const existing = targetData[opt] || [];
            updates[opt] = [...new Set([...existing, ...selectedItems])];
            const existingItems = targetData.categoryItems || {};
            const newItems = { ...existingItems };
            selectedItems.forEach(cat => {
               if (currentRoom.categoryItems?.[cat]) newItems[cat] = [...new Set([...(existingItems[cat] || []), ...currentRoom.categoryItems[cat]])];
            });
            updates.categoryItems = newItems;
         } else if (opt === 'autoFillRules') {
            const existingAutoFill = targetData.autoFillRules || {};
            const existingAutoFillOrder = targetData.autoFillRuleOrder || [];
            let newAutoFillOrder = [...existingAutoFillOrder];
            let newAutoFill = { ...existingAutoFill };

            selectedItems.forEach(itemKey => {
               newAutoFill[itemKey] = currentRoom.autoFillRules[itemKey];
               if (!newAutoFillOrder.includes(itemKey)) newAutoFillOrder.push(itemKey);
            });
            updates.autoFillRules = newAutoFill; 
            updates.autoFillRuleOrder = newAutoFillOrder;
         } else if (opt === 'methodRules') {
            const existingMethodRules = targetData.methodRules || {};
            const existingMethodOrder = targetData.methodRuleOrder || [];
            let newMethodOrder = [...existingMethodOrder];
            let newMethodRules = { ...existingMethodRules };

            selectedItems.forEach(m => {
               newMethodRules[m] = currentRoom.methodRules[m];
               if (!newMethodOrder.includes(m)) newMethodOrder.push(m);
            });
            updates.methodRules = newMethodRules; 
            updates.methodRuleOrder = newMethodOrder;
         } else {
             const existing = targetData[opt] || [];
             updates[opt] = [...new Set([...existing, ...selectedItems])];
         }
      });

      await updateDoc(targetRef, updates);
      alert('✅ 設定同步成功！');
      setSyncSettingsModalOpen(false); setSyncSelection({});
    } catch (e) { alert('同步失敗：' + e.message); }
  };

  const handleAnalysisTypeChange = (type) => {
    setAnalysisType(type); setAnalysisMenus([]); setAnalysisSubSelections({ category: [], title: [], merchant: [], method: [], subMethod: [], payer: [] });
  };

  const MethodSelector = ({ label, icon: IconComponent, method, subMethod, setMethod, setSubMethod, currentRoom }) => {
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

        {/* 依據選擇是行動支付或信用卡，決定顯示的清單 */}
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

  const PillGroupMulti = ({ label, icon: Icon, options, values = [], onChange, isPayer = false }) => {
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

  const toggleFrequencyDay = (d) => {
    if (recordFrequencyDays.includes(d)) setRecordFrequencyDays(recordFrequencyDays.filter(v => v !== d));
    else setRecordFrequencyDays([...recordFrequencyDays, d]);
  };

  const renderMethodText = (method, subMethod) => {
    if (!method || method === '未指定') return null;
    return `${method}${subMethod ? `(${subMethod})` : ''}`;
  };

  const displayRecords = records.filter(r => {
    if (searchQuery) {
      if (r.date > getLocalTodayStr()) return false; 
      const q = searchQuery.toLowerCase();
      return `${r.title || ''} ${r.merchant || ''} ${r.note || ''} ${r.category || ''} ${r.method || ''} ${r.subMethod || ''} ${r.transferToMethod || ''} ${r.transferToSubMethod || ''} ${Array.isArray(r.payer)?r.payer.join(' '):r.payer || ''}`.toLowerCase().includes(q);
    }
    if (homeFilterDate) return r.date === homeFilterDate;
    return true;
  });

  if (searchQuery || !homeFilterDate) {
    displayRecords.sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return b.timestamp - a.timestamp;
    });
  }

  // 首頁總計 (排除「不計入帳戶」的紀錄)
  const totalIncome = displayRecords.filter(r => r.type === 'income' && !r.excludeFromBalance).reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = displayRecords.filter(r => (r.type === 'expense' || !r.type) && !r.excludeFromBalance).reduce((sum, r) => sum + r.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const analysisFilteredRecords = records.filter(r => {
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
       if (['信用卡', '行動支付', '信用卡 / 行動支付'].includes(r.method)) { if (analysisSubSelections.subMethod.length > 0 && !analysisSubSelections.subMethod.includes(r.subMethod)) return false; }
       if (['銀行', '銀行 / 電子票證'].includes(r.method)) { if (analysisSubSelections.subMethod.length > 0 && !analysisSubSelections.subMethod.includes(r.subMethod)) return false; }
       if (r.method === '電子票證') { if (analysisSubSelections.subMethod.length > 0 && !analysisSubSelections.subMethod.includes(r.subMethod)) return false; }
    }
    
    if (analysisMenus.includes('payer') && analysisSubSelections.payer.length > 0) {
       const recordPayers = Array.isArray(r.payer) ? r.payer : [r.payer];
       if (!recordPayers.some(p => analysisSubSelections.payer.includes(p))) return false;
    }
    
    return true;
  });

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

  const analysisGroupedData = {};
  analysisFilteredRecords.forEach(r => {
    const key = getAnalysisKeyForRecord(r);
    if (!analysisGroupedData[key]) analysisGroupedData[key] = 0;
    analysisGroupedData[key] += r.amount;
  });

  const chartData = Object.keys(analysisGroupedData).map(key => ({ label: key, value: analysisGroupedData[key] })).sort((a, b) => b.value - a.value);
  const totalAnalysisAmount = chartData.reduce((sum, d) => sum + d.value, 0);
  const chartColors = ['#F472B6', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F87171', '#38BDF8', '#4ADE80', '#FCD34D', '#C084FC'];

  const uniqueRoles = useMemo(() => {
    return ['全部', ...new Set(records.map(r => r.addedByRole).filter(Boolean))];
  }, [records]);

  let isFormValid = false;
  const parsedAmt = Number(String(recordAmount).replace(/,/g, '').replace(/[^\d]/g, ''));
  if (parsedAmt > 0 && recordDate && recordPayer.length > 0) {
    if (recordType === 'expense') isFormValid = !!(recordCategory && selectedItem && recordMethod);
    else if (recordType === 'income') isFormValid = !!(recordCategory && recordMethod);
    else if (recordType === 'transfer') isFormValid = !!(recordCategory && recordMethod && transferToMethod);
    
    if (isFormValid) {
      const needsSubMethod = (m) => ['行動支付', '信用卡', '信用卡 / 行動支付', '銀行', '銀行 / 電子票證', '電子票證'].includes(m);
      if (needsSubMethod(recordMethod) && !recordSubMethod) isFormValid = false;
      if (recordType === 'transfer') { if (needsSubMethod(transferToMethod) && !transferToSubMethod) isFormValid = false; }
      
      if (recordFrequency === '每週' && recordFrequencyDays.length === 0) isFormValid = false;
      if (recordFrequency === '區間' && !recordFrequencyInterval) isFormValid = false;
      if (recordFrequency === '區間' && recordFrequencyInterval === '自訂' && !recordFrequencyCustomText) isFormValid = false;
    }
  }

  // 共用的明細單列組件 (抽出可有效避免長度超限，並維持乾淨)
  const RecordItem = ({ exp, idx, isSortable = false, hideActions = false, onRecordClick, handleMoveRecord, openEditForm, setCrossRoomRecord }) => {
    const isIncome = exp.type === 'income', isTransfer = exp.type === 'transfer';
    const payerStr = Array.isArray(exp.payer) ? exp.payer.join(', ') : exp.payer;
    const freqDisplay = exp.frequency === '區間' ? (exp.frequencyInterval === '自訂' ? `${exp.frequencyCustomText}天` : exp.frequencyInterval) : exp.frequency;
    const canModify = !exp.addedByRole || currentUserRole === exp.addedByRole;
    
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
                <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 bg-gray-50 border-gray-200' : isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                  {exp.category}
                </span>
                <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>
                  {exp.title}
                </span>
              </>
            )}
            {isTransfer && (
              <>
                <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 bg-gray-50 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  轉帳
                </span>
                <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>
                  {renderMethodText(exp.method, exp.subMethod)} ➜ {renderMethodText(exp.transferToMethod, exp.transferToSubMethod)}
                </span>
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
              <button onClick={(e) => { e.stopPropagation(); handleMoveRecord(idx, 1); }} disabled={idx === displayRecords.length - 1 || !isSortable} className={`text-gray-400 hover:text-blue-500 font-bold p-1 transition bg-gray-50 hover:bg-blue-50 rounded shadow-sm flex items-center justify-center disabled:opacity-30 ${!isSortable ? 'cursor-not-allowed' : ''}`}><ArrowDown size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); setCrossRoomRecord(exp); }} disabled={!canModify} className={`font-bold p-1 transition bg-gray-50 rounded shadow-sm flex items-center justify-center ${canModify ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-gray-300 opacity-40 cursor-not-allowed'}`}><Send size={14} /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // Main View Content Generation
  // ==========================================
  let content = null;

  if (!user) {
    content = (
      <div className="flex flex-col items-center justify-center h-full p-6">
        {errorMsg ? (
          <div className="bg-red-50 text-red-500 font-bold p-6 rounded-[1.5rem] flex flex-col items-center gap-4 border border-red-100 shadow-sm text-center w-full">
            <AlertCircle size={40} />
            <p className="text-[17px] leading-relaxed whitespace-pre-line">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="mt-2 bg-white text-red-500 px-6 py-2.5 rounded-xl text-[17px] shadow-sm border border-red-100 transition hover:bg-red-50">重新整理</button>
          </div>
        ) : (
          <div className="text-gray-500 font-extrabold text-[22px] flex items-center bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100">
            <Sparkles className="animate-bounce mr-3 text-yellow-400" size={28}/> 魔法連線中...
          </div>
        )}
      </div>
    );
  }
  else if (view === 'login') {
    content = (
      <div className="scroll-container flex flex-col items-center justify-center flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-col items-center mb-6 w-full mt-2">
          <div className="bg-gradient-to-tr from-[#FFF4B8] to-[#FFD580] p-5 rounded-[1.5rem] mb-5 shadow-sm"><Sparkles size={48} className="text-white drop-shadow-sm" strokeWidth={2.5} /></div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 mb-2 flex items-center gap-2">❤️ 林北一家 🏠</h1>
          <p className="text-[17px] font-bold text-gray-500">林北的小財庫</p>
        </div>

        {savedRooms.length > 0 && (
          <div className="w-full mb-6 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
            <p className="text-[16px] font-bold text-gray-500 mb-3 text-center">👇 快速切換最近房間</p>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {savedRooms.map(r => (
                <button key={r.id} type="button" onClick={() => quickJoinRoom(r)} className="w-full bg-white border border-transparent p-4 rounded-[1.2rem] hover:border-blue-300 hover:shadow-md transition flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-500"><Home size={22} /></div>
                    <span className="font-extrabold text-gray-700 text-[18px]">{r.name}</span>
                  </div>
                  <span className="text-[14px] font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-md">{r.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && <div className="w-full bg-red-50 text-red-500 font-bold p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-[16px] shadow-sm border border-red-100"><AlertCircle size={20} /> {errorMsg}</div>}
        
        <form onSubmit={handleJoinRoom} className="space-y-5 w-full bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100">
          <div>
            <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">家庭通關代碼</label>
            <input type="text" className="w-full bg-gray-50 text-center border border-gray-100 p-4 rounded-xl focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" placeholder="例如：linbei" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">房間密碼</label>
            <input type="password" className="w-full bg-gray-50 text-center border border-gray-100 p-4 rounded-xl focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" placeholder="輸入密碼" value={roomPin} onChange={(e) => setRoomPin(e.target.value)} />
          </div>
          <div>
            <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">我是誰？ (請點選下方人員)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {availableLoginUsers.map(roleName => (
                <button 
                  key={roleName} type="button" onClick={() => setCurrentUserRole(roleName)} 
                  className={`flex-1 min-w-[30%] py-3 px-2 rounded-xl font-bold text-[16px] flex justify-center items-center gap-1.5 transition-all duration-200 truncate ${currentUserRole === roleName ? (roleName === '老婆' ? 'bg-pink-500 text-white shadow-md transform -translate-y-0.5' : 'bg-blue-500 text-white shadow-md transform -translate-y-0.5') : 'bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100'}`}
                >
                  {roleName}
                </button>
              ))}
            </div>
            {roomCode && availableLoginUsers.length === 0 && <p className="text-sm text-gray-400 text-center mt-2">載入名單中...</p>}
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-orange-500 text-white font-extrabold text-[20px] p-4 rounded-[1.5rem] hover:bg-orange-600 shadow-md transition active:scale-95 disabled:opacity-50 mt-2">{isLoading ? '處理中...' : '開啟小財庫 🚀'}</button>
        </form>
        <div className="mt-6 text-center w-full pb-6">
          <button onClick={() => {setView('create'); setErrorMsg(''); setRoomCode(''); setRoomPin(''); setCurrentUserRole(''); setRoomName('');}} className="text-gray-500 text-[17px] font-bold hover:text-gray-700 transition bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">💡 建立新的家庭房間</button>
        </div>
      </div>
    );
  }
  else if (view === 'create') {
    content = (
      <div className="scroll-container flex flex-col items-center justify-center flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
         <div className="flex flex-col items-center mb-6 w-full mt-2">
          <div className="bg-gradient-to-tr from-[#A7F3D0] to-[#34D399] p-5 rounded-[1.5rem] mb-5 shadow-sm"><Home size={44} className="text-white drop-shadow-sm" strokeWidth={2.5} /></div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">建立新家庭 ✨</h1>
        </div>
        {errorMsg && <div className="w-full bg-red-50 text-red-500 font-bold p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-[16px] shadow-sm border border-red-100"><AlertCircle size={20} /> {errorMsg}</div>}
        <form onSubmit={handleCreateRoom} className="space-y-4 w-full bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100">
          <input type="text" className="w-full bg-gray-50 text-center border border-gray-100 p-3.5 rounded-xl focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" placeholder="🏠 房間名稱 (例: 林北小財庫)" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          <input type="text" className="w-full bg-gray-50 text-center border border-gray-100 p-3.5 rounded-xl focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" placeholder="🎀 自訂通關代碼 (需唯一)" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          <input type="password" className="w-full bg-gray-50 text-center border border-gray-100 p-3.5 rounded-xl focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" placeholder="🔑 設定房間密碼" value={roomPin} onChange={(e) => setRoomPin(e.target.value)} />
          <div>
            <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">我是誰？ (請點選)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['老公', '老婆'].map(r => (
                <button key={r} type="button" onClick={() => setCurrentUserRole(r)} className={`flex-1 min-w-[30%] py-3 px-2 rounded-xl font-bold text-[16px] flex justify-center items-center gap-1.5 transition-all duration-200 truncate ${currentUserRole === r ? (r === '老婆' ? 'bg-pink-500 text-white shadow-md transform -translate-y-0.5' : 'bg-blue-500 text-white shadow-md transform -translate-y-0.5') : 'bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                  {r}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">💡 進入房間後，可在「其他」設定中修改/新增登入人員</p>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-green-500 text-white font-extrabold text-[20px] py-4 rounded-[1.5rem] hover:bg-green-600 shadow-md transition active:scale-95 mt-2">{isLoading ? '處理中...' : '建立並進入 🚀'}</button>
        </form>
        <div className="mt-6 text-center w-full pb-6">
           <button onClick={() => {setView('login'); setErrorMsg(''); setRoomCode(''); setRoomPin(''); setCurrentUserRole(''); setRoomName('');}} className="text-gray-500 text-[17px] font-bold hover:text-gray-700 transition bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">返回登入</button>
        </div>
      </div>
    );
  }
  else if (view === 'accounts') {
    const balances = getBalances();
    const cashBal = balances['現金'] || 0;
    const banks = currentRoom?.bankAccounts || [];
    const eTickets = currentRoom?.electronicTickets || [];
    const bankTotal = banks.reduce((sum, b) => sum + (balances[`bank_${b}`] || 0), 0) + eTickets.reduce((sum, e) => sum + (balances[`et_${e}`] || 0), 0);
    const ccs = currentRoom?.creditCards || [];
    const ccTotal = ccs.reduce((sum, c) => sum + (balances[`cc_${c}`] || 0), 0);
    const totalAssets = cashBal + bankTotal;
    const totalLiabilities = ccTotal;
    const netWorth = totalAssets - totalLiabilities;

    content = (
      <>
        <header className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center">
            <h1 className="text-[20px] font-black text-white flex items-center gap-2 drop-shadow-md"><Landmark size={22} className="text-white/80"/> 帳戶總覽</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('room')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">返回</button>
              {isEditingBalances ? (
                <button onClick={handleSaveBalances} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">儲存</button>
              ) : (
                <button onClick={() => { 
                   const initBal = currentRoom?.initialBalances || {};
                   const temp = { '現金': initBal['現金'] !== undefined ? initBal['現金'] : 0 };
                   (currentRoom?.bankAccounts || []).forEach(b => temp[`bank_${b}`] = initBal[`bank_${b}`] !== undefined ? initBal[`bank_${b}`] : (initBal[b] !== undefined ? initBal[b] : 0));
                   (currentRoom?.electronicTickets || []).forEach(e => temp[`et_${e}`] = initBal[`et_${e}`] !== undefined ? initBal[`et_${e}`] : (initBal[e] !== undefined ? initBal[e] : 0));
                   (currentRoom?.creditCards || []).forEach(c => temp[`cc_${c}`] = initBal[`cc_${c}`] !== undefined ? initBal[`cc_${c}`] : (initBal[c] !== undefined ? initBal[c] : 0));
                   setTempBalances(temp); setIsEditingBalances(true); 
                }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">初始餘額</button>
              )}
            </div>
          </div>
        </header>

        <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[90px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col gap-2 bg-white p-2 rounded-2xl shadow-sm border border-indigo-100">
             <div className="flex items-center gap-1.5">
               <Calendar size={14} className="text-indigo-400 shrink-0 ml-1 hidden sm:block" />
               <div className="relative flex-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg overflow-hidden flex justify-center items-center cursor-pointer min-w-0">
                  <input type="date" value={accountStartDate} onChange={e => setAccountStartDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                  <span className="font-bold text-gray-600 text-[12px] z-0 pointer-events-none truncate">{accountStartDate ? toROCYearStr(accountStartDate) : '不限'}</span>
               </div>
               <span className="text-gray-300 text-[12px] font-black shrink-0">~</span>
               <div className="relative flex-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg overflow-hidden flex justify-center items-center cursor-pointer min-w-0">
                  <input type="date" value={accountEndDate} onChange={e => setAccountEndDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                  <span className="font-bold text-gray-600 text-[12px] z-0 pointer-events-none truncate">{accountEndDate ? toROCYearStr(accountEndDate) : '不限'}</span>
               </div>
               <div className="flex shrink-0 gap-0.5 ml-0.5">
                   <button onClick={() => { setAccountStartDate(getLocalLastMonthStartStr()); setAccountEndDate(getLocalLastMonthEndStr()); }} className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all ${(accountStartDate === getLocalLastMonthStartStr() && accountEndDate === getLocalLastMonthEndStr()) ? 'bg-indigo-500 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>上月</button>
                   <button onClick={() => { setAccountStartDate(''); setAccountEndDate(getLocalTodayStr()); }} className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all ${accountStartDate === '' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>全部</button>
               </div>
             </div>
          </div>

          <div className="bg-white py-3 px-4 rounded-2xl border-2 border-indigo-100 text-center shadow-sm relative overflow-hidden">
             <div className="absolute -right-6 -top-6 bg-indigo-50 w-24 h-24 rounded-full opacity-50"></div>
             <p className="text-indigo-400 font-extrabold text-[14px] relative z-10">💎 淨資產</p>
             <p className={`text-[36px] leading-tight font-black relative z-10 ${netWorth < 0 ? 'text-red-500' : 'text-indigo-700'}`}>${netWorth.toLocaleString()}</p>
             <div className="flex justify-center gap-4 mt-1.5 relative z-10 border-t border-indigo-50 pt-1.5">
                 <div className="flex flex-col">
                     <span className="text-gray-400 text-[11px] font-bold">💰 總資產 (現金+銀行)</span>
                     <span className="text-indigo-500 font-black text-[15px]">${totalAssets.toLocaleString()}</span>
                 </div>
                 <div className="flex flex-col border-l border-indigo-50 pl-4">
                     <span className="text-gray-400 text-[11px] font-bold">💳 總負債 (信用卡)</span>
                     <span className="text-orange-500 font-black text-[15px]">${totalLiabilities.toLocaleString()}</span>
                 </div>
             </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-50">
             <h2 className="font-bold text-[17px] text-gray-700 mb-3 flex items-center gap-1.5"><Wallet size={18} className="text-emerald-500"/> 現金餘額</h2>
             <div onClick={() => !isEditingBalances && setViewingAccountHistory('現金')} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition' : ''}`}>
                <span className="font-bold text-gray-600 text-[16px]">現金</span>
                {isEditingBalances ? (
                   <input type="text" inputMode="numeric" className="w-24 text-right border border-emerald-200 focus:border-emerald-400 p-1 rounded-lg font-bold text-[16px] outline-none transition" 
                     value={tempBalances['現金'] === '-' ? '-' : (tempBalances['現金'] === undefined || tempBalances['現金'] === '' ? '' : Number(tempBalances['現金']).toLocaleString())} 
                     onChange={e => {
                        let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0';
                        if (val === '-') return setTempBalances({...tempBalances, '現金': '-'});
                        if (!isNaN(val)) setTempBalances({...tempBalances, '現金': val});
                     }} onFocus={e => e.target.select()} placeholder="0" />
                ) : (
                   <span className={`font-black text-[20px] ${cashBal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${cashBal.toLocaleString()}</span>
                )}
             </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
             <div className="flex justify-between items-end mb-3 flex-nowrap">
               <h2 className="font-bold text-[17px] text-gray-700 flex items-center gap-1.5 min-w-0 shrink">
                 <Landmark size={18} className="text-blue-500 shrink-0"/> 
                 <span className="truncate">銀行/電子票證</span>
               </h2>
               <span className="text-[14px] font-extrabold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg shrink-0 ml-2 whitespace-nowrap">小計: ${bankTotal.toLocaleString()}</span>
             </div>
             <div className="space-y-2">
               {banks.length === 0 && eTickets.length === 0 && <p className="text-gray-400 text-[14px] font-bold text-center py-3 bg-gray-50 rounded-xl">無銀行與電子票證，請至設定新增</p>}
               
               {banks.map(b => {
                 const bal = balances[`bank_${b}`] || 0;
                 return (
                   <div key={`bank_${b}`} onClick={() => !isEditingBalances && setViewingAccountHistory(b)} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition' : ''}`}>
                      <span className="font-bold text-gray-600 text-[16px] truncate pr-2">🏦 {b}</span>
                      {isEditingBalances ? (
                         <input type="text" inputMode="numeric" className="w-24 text-right border border-blue-200 focus:border-blue-400 p-1 rounded-lg font-bold text-[16px] outline-none transition" 
                           value={tempBalances[`bank_${b}`] === '-' ? '-' : (tempBalances[`bank_${b}`] === undefined || tempBalances[`bank_${b}`] === '' ? '' : Number(tempBalances[`bank_${b}`]).toLocaleString())} 
                           onChange={e => {
                              let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0';
                              if (val === '-') return setTempBalances({...tempBalances, [`bank_${b}`]: '-'});
                              if (!isNaN(val)) setTempBalances({...tempBalances, [`bank_${b}`]: val});
                           }} onFocus={e => e.target.select()} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[18px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}

               {eTickets.map(eItem => {
                 const bal = balances[`et_${eItem}`] || 0;
                 return (
                   <div key={`et_${eItem}`} onClick={() => !isEditingBalances && setViewingAccountHistory(eItem)} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-teal-50 hover:border-teal-200 transition' : ''}`}>
                      <span className="font-bold text-gray-600 text-[16px] truncate pr-2">🎟️ {eItem}</span>
                      {isEditingBalances ? (
                         <input type="text" inputMode="numeric" className="w-24 text-right border border-teal-200 focus:border-teal-400 p-1 rounded-lg font-bold text-[16px] outline-none transition" 
                           value={tempBalances[`et_${eItem}`] === '-' ? '-' : (tempBalances[`et_${eItem}`] === undefined || tempBalances[`et_${eItem}`] === '' ? '' : Number(tempBalances[`et_${eItem}`]).toLocaleString())} 
                           onChange={e => {
                              let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0';
                              if (val === '-') return setTempBalances({...tempBalances, [`et_${eItem}`]: '-'});
                              if (!isNaN(val)) setTempBalances({...tempBalances, [`et_${eItem}`]: val});
                           }} onFocus={e => e.target.select()} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[18px] shrink-0 ${bal < 0 ? 'text-red-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}
             </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-50">
             <div className="flex justify-between items-end mb-3 flex-nowrap">
               <h2 className="font-bold text-[17px] text-gray-700 flex items-center gap-1.5 min-w-0 shrink">
                 <CreditCard size={18} className="text-orange-500 shrink-0"/> 
                 <span className="truncate">信用卡刷卡</span>
               </h2>
               <span className="text-[14px] font-extrabold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg shrink-0 ml-2 whitespace-nowrap">小計: ${ccTotal.toLocaleString()}</span>
             </div>
             <div className="space-y-2">
               {ccs.length === 0 && <p className="text-gray-400 text-[14px] font-bold text-center py-3 bg-gray-50 rounded-xl">無信用卡，請至設定新增</p>}
               {ccs.map(c => {
                 const bal = balances[`cc_${c}`] || 0;
                 return (
                   <div key={c} onClick={() => !isEditingBalances && setViewingAccountHistory(c)} className={`flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 ${!isEditingBalances ? 'cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition' : ''}`}>
                      <span className="font-bold text-gray-600 text-[16px] truncate pr-2">💳 {c}</span>
                      {isEditingBalances ? (
                         <input type="text" inputMode="numeric" className="w-24 text-right border border-orange-200 focus:border-orange-400 p-1 rounded-lg font-bold text-[17px] outline-none transition" 
                           value={tempBalances[`cc_${c}`] === '-' ? '-' : (tempBalances[`cc_${c}`] === undefined || tempBalances[`cc_${c}`] === '' ? '' : Number(tempBalances[`cc_${c}`]).toLocaleString())} 
                           onChange={e => {
                              let val = e.target.value.replace(/,/g, ''); if (val === '') val = '0';
                              if (val === '-') return setTempBalances({...tempBalances, [`cc_${c}`]: '-'});
                              if (!isNaN(val)) setTempBalances({...tempBalances, [`cc_${c}`]: val});
                           }} onFocus={e => e.target.select()} placeholder="0" />
                      ) : (
                         <span className={`font-black text-[18px] shrink-0 ${bal > 0 ? 'text-orange-500' : 'text-gray-800'}`}>${bal.toLocaleString()}</span>
                      )}
                   </div>
                 )
               })}
             </div>
             <p className="text-[11px] font-bold text-orange-400 mt-3 bg-orange-50 p-2.5 rounded-xl text-center leading-relaxed">* 行動支付與信用卡金額代表「累積應繳卡費（負債）」。刷卡會增加金額，透過轉帳繳費後金額會減少。</p>
          </div>
        </main>
      </>
    );
  }
  else if (view === 'room' && !showAddForm) {
    const headerColorClass = currentRoom?.headerTheme || getRoomHeaderColor(activeRoomId);

    content = (
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
              <button onClick={() => setRefreshTrigger(prev => prev + 1)} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm" title="重新連線"><RefreshCw size={18} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm" title="匯入資料"><Upload size={18} /></button>
              <button onClick={handleBackup} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm" title="備份雲端資料"><Download size={18} /></button>
              <button onClick={() => { setSettingsTab('expense'); setView('settings'); }} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm" title="設定"><Settings size={18} /></button>
              <button onClick={() => { setActiveRoomId(null); setView('login'); setRoomCode(''); setRoomPin(''); setCurrentUserRole(''); setRoomName(''); setHomeFilterDate(getLocalTodayStr()); }} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm" title="登出"><LogOut size={18} /></button>
            </div>
          </div>
          
          <div className="mb-1.5">
            <div className="flex items-center gap-1.5 w-full">
              <div className="relative bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 px-2 py-1 flex items-center overflow-hidden hover:bg-white/30 transition shrink-0">
                <input type="date" value={homeFilterDate} onChange={(e) => setHomeFilterDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                <Calendar size={13} className="text-white mr-1 shrink-0 z-0"/>
                <span className="text-white text-[12px] font-black drop-shadow-sm z-0 whitespace-nowrap">{homeFilterDate ? toROCShortStr(homeFilterDate) : '全部日期'}</span>
              </div>
              <button 
                onClick={() => setHomeFilterDate(getLocalTodayStr())} 
                className={`shrink-0 px-2 py-1 rounded-lg transition-all duration-300 font-black text-[12px] shadow-sm backdrop-blur-sm whitespace-nowrap ${homeFilterDate === getLocalTodayStr() ? 'bg-white text-orange-500 scale-105 shadow-md' : 'bg-white/20 hover:bg-white/30 text-white'}`}
              >
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
            <h3 className="font-bold text-gray-400 mb-2 ml-1 flex items-center gap-1.5 text-[16px]">📜 記帳明細</h3>
            {displayRecords.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-[14px]">
                <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"><PiggyBank size={24} className="text-orange-400" /></div>
                <p>目前還沒有紀錄，快使用下方 ＋ 號開始記帳吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayRecords.map((exp, idx) => (
                  <RecordItem 
                    key={exp.id} exp={exp} idx={idx} 
                    isSortable={!searchQuery && homeFilterDate} 
                    onRecordClick={setViewingRecord}
                    handleMoveRecord={handleMoveRecord}
                    openEditForm={openEditForm}
                    setCrossRoomRecord={setCrossRoomRecord}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </>
    );
  }
  else if (view === 'room' && showAddForm) {
    const isIncome = recordType === 'income'; const isTransfer = recordType === 'transfer';
    const titleEmoji = isIncome ? '💸' : isTransfer ? '🔄' : '🛍️';
    const themeBg = isIncome ? 'bg-green-500' : isTransfer ? 'bg-blue-500' : 'bg-orange-500';
    const themeText = isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-orange-500';
    const themeBorder = isIncome ? 'border-green-100' : isTransfer ? 'border-blue-100' : 'border-orange-100';
    const daysOfWeek = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const intervalOptions = ['3個月', '半年', '一年', '自訂'];
    
    content = (
      <>
        <header className={`${themeBg} text-white px-4 py-3 shadow-md shrink-0 z-10 border-b-4 border-white/20 rounded-b-[1.5rem] transition-colors duration-300`}>
          <div className="flex justify-between items-center mb-2.5">
            <h1 className="text-xl font-black flex items-center gap-2 drop-shadow-md">{editRecordId ? '✏️ 編輯紀錄' : '✨ 新增紀錄'} {titleEmoji}</h1>
            <button onClick={() => { setShowAddForm(false); resetForm(); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition shadow-inner"><X size={20} strokeWidth={3} /></button>
          </div>
          {!editRecordId && (
            <div className="flex bg-white/20 p-1 rounded-xl shadow-inner mb-1">
               <button type="button" onClick={() => setRecordType('expense')} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] text-center transition-all ${recordType === 'expense' ? 'bg-white text-orange-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>支出</button>
               <button type="button" onClick={() => setRecordType('income')} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] text-center transition-all ${recordType === 'income' ? 'bg-white text-green-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>收入</button>
               <button type="button" onClick={() => setRecordType('transfer')} className={`flex-1 py-1.5 rounded-lg font-bold text-[15px] text-center transition-all ${recordType === 'transfer' ? 'bg-white text-blue-500 shadow-sm transform scale-100' : 'text-white hover:bg-white/10 scale-95'}`}>轉帳</button>
            </div>
          )}
        </header>

        <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[80px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <form onSubmit={handleSaveRecord} className="space-y-3">
            
            <div 
              role="button" 
              tabIndex={0} 
              className={`w-full block bg-white rounded-2xl pt-2.5 pb-2 px-4 shadow-sm border-2 ${themeBorder} text-center relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none`} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCalcStr(String(recordAmount || '0')); setShowCalc(true); }}
            >
               <div className={`absolute top-0 left-0 w-full h-1.5 ${themeBg} opacity-20`}></div>
               <p className={`${themeText} font-extrabold text-[13px] mb-1 flex items-center justify-center gap-1.5`}>輸入金額 💰 <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-400 flex items-center gap-1"><Calculator size={12}/> 點擊計算</span></p>
               <div className={`text-center text-[36px] leading-none font-black w-full text-gray-800 py-1 tracking-tight`}> 
                 {recordAmount === '' || recordAmount === '0' ? '0' : Number(String(recordAmount).replace(/,/g, '')).toLocaleString()}
               </div>
            </div>

            <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${themeBorder}`}>
              <div className="grid grid-cols-2 gap-2 mb-3.5 z-40">
                <div>
                  <label className="flex items-center justify-between text-[14px] font-bold text-gray-500 mb-2 ml-1 w-full pr-1">
                    <span className="flex items-center gap-1.5"><Calendar size={16} className="text-gray-400" /> 日期 🗓️</span>
                    <button type="button" onClick={() => setRecordDate(getLocalTodayStr())} className={`px-2 py-1 rounded text-[12px] font-bold transition-all duration-300 shadow-sm ${recordDate === getLocalTodayStr() ? `${themeBg} text-white scale-105 shadow-md` : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>今天</button>
                  </label>
                  <div className="relative w-full bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex items-center shadow-sm cursor-pointer hover:bg-white transition overflow-hidden" onClick={() => { if (recordDateInputRef.current) { try { recordDateInputRef.current.showPicker(); } catch (e) { recordDateInputRef.current.focus(); } } }}>
                    <input ref={recordDateInputRef} type="date" required className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
                    <span className="font-bold text-gray-700 text-[15px] z-0 pointer-events-none">{recordDate ? toROCYearStr(recordDate) : '選擇日期'}</span>
                    <span className="absolute right-2 text-gray-400 text-[12px] z-0 pointer-events-none">▼</span>
                  </div>
                </div>
                <div className="z-40">
                  <CustomDropdown label="頻率 🔄" icon={RefreshCw} options={['一次', '每週', '每月', '區間']} value={recordFrequency} onChange={(val) => { setRecordFrequency(val); setRecordFrequencyDays([]); setRecordFrequencyInterval(''); setRecordFrequencyCustomText(''); }} placeholder="選擇頻率" />
                </div>
              </div>

              {recordFrequency === '每週' && (
                <div className="mb-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <label className="text-[14px] font-bold text-gray-500 mb-2 block">請選擇星期 (可複選)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {daysOfWeek.map(d => (
                      <button key={d} type="button" onClick={() => toggleFrequencyDay(d)} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all ${recordFrequencyDays.includes(d) ? 'bg-[#FFE28A] text-gray-800 shadow-sm border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border border-gray-100'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {recordFrequency === '每月' && (
                <div className="mb-3.5 bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm">
                  <label className="text-[14px] font-bold text-blue-700 mb-1 flex items-center gap-1.5">💡 每月定期產生</label>
                  <p className="text-[12px] text-blue-600 font-medium leading-relaxed">系統將依據您上方的「消費日期」，自動於未來的每個月同一天產生此紀錄。</p>
                </div>
              )}
              {recordFrequency === '區間' && (
                <div className="mb-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <label className="text-[14px] font-bold text-gray-500 mb-2 block">請選擇時間區間</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                      {intervalOptions.map(opt => (
                          <button key={opt} type="button" onClick={() => setRecordFrequencyInterval(opt)} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all ${recordFrequencyInterval === opt ? 'bg-[#FFE28A] text-gray-800 shadow-sm border-2 border-[#FCD34D] transform -translate-y-0.5' : 'bg-white text-gray-500 border border-gray-100'}`}>{opt}</button>
                      ))}
                  </div>
                  {recordFrequencyInterval === '自訂' && <input type="text" placeholder="自行填寫區間天數 (例如: 30)" value={recordFrequencyCustomText} onChange={e => setRecordFrequencyCustomText(e.target.value)} className="w-full bg-white border border-gray-100 p-2.5 rounded-lg font-bold text-[14px] outline-none focus:border-[#FCD34D] transition shadow-sm" />}
                  {recordFrequencyInterval !== '自訂' && recordFrequencyInterval !== '' && <p className="text-[12px] text-gray-500 font-bold mt-1.5">💡 系統將依據消費日期推算下次紀錄日</p>}
                </div>
              )}

              {recordType === 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-2 z-30 mb-3.5">
                    <CustomDropdown label="主分類 📂" options={currentRoom?.categories || []} value={recordCategory} onChange={(val) => { 
                        setRecordCategory(val); setSelectedItem(''); 
                    }} placeholder="選擇分類..." />
                    <CustomDropdown label="項目清單 🛒" options={currentRoom?.categoryItems?.[recordCategory] || []} value={selectedItem} onChange={(val) => {
                        setSelectedItem(val);
                    }} placeholder="選擇項目..." />
                  </div>
                  
                  {/* 不計入帳戶在商家右側 */}
                  <div className="flex items-end gap-2 mb-3.5 z-20 w-full">
                     <div className="flex-1 min-w-0">
                       <CustomDropdown label="商家 🏪" icon={Store} options={currentRoom?.merchants || []} value={recordMerchant} onChange={(val) => {
                           setRecordMerchant(val);
                       }} placeholder="選擇商家..." />
                     </div>
                     <label className="shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition shadow-sm">
                       <input type="checkbox" checked={excludeFromBalance} onChange={e => setExcludeFromBalance(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                       <span className="font-bold text-[13px] text-gray-500">不計入帳戶</span>
                     </label>
                  </div>
                  
                  <div className="flex flex-col gap-3 mb-3.5 z-10">
                     <PillGroupMulti label="花費對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  </div>
                  <MethodSelector label="付款方式 💳" icon={CreditCard} method={recordMethod} subMethod={recordSubMethod} setMethod={setRecordMethod} setSubMethod={setRecordSubMethod} currentRoom={currentRoom} />
                </>
              )}

              {recordType === 'income' && (
                <>
                  <div className="z-30 mb-3.5 flex items-end gap-2 w-full">
                    <div className="flex-1 min-w-0">
                      <CustomDropdown label="收入分類 📈" icon={Tag} options={currentRoom?.incomeCategories || []} value={recordCategory} onChange={setRecordCategory} placeholder="選擇收入分類..." />
                    </div>
                    <label className="shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition shadow-sm">
                      <input type="checkbox" checked={excludeFromBalance} onChange={e => setExcludeFromBalance(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500" />
                      <span className="font-bold text-[13px] text-gray-500">不計入帳戶</span>
                    </label>
                  </div>
                  <PillGroupMulti label="對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  <MethodSelector label="存入帳戶 🏦" icon={Wallet} method={recordMethod} subMethod={recordSubMethod} setMethod={setRecordMethod} setSubMethod={setRecordSubMethod} currentRoom={currentRoom} />
                </>
              )}

              {recordType === 'transfer' && (
                <>
                  <div className="z-40 mb-3.5">
                    <CustomDropdown label="轉帳分類 🔄" icon={Tag} options={currentRoom?.transferCategories || []} value={recordCategory} onChange={setRecordCategory} placeholder="選擇轉帳分類..." />
                  </div>
                  <PillGroupMulti label="對象 (可複選) 👥" icon={User} options={currentRoom?.payers || []} values={recordPayer} onChange={setRecordPayer} isPayer={true} />
                  <MethodSelector label="📤 轉出帳戶 (從哪裡扣款)" icon={Wallet} method={recordMethod} subMethod={recordSubMethod} setMethod={setRecordMethod} setSubMethod={setRecordSubMethod} currentRoom={currentRoom} />
                  <MethodSelector label="📥 轉入帳戶 (存到哪裡)" icon={Wallet} method={transferToMethod} subMethod={transferToSubMethod} setMethod={setTransferToMethod} setSubMethod={setTransferToSubMethod} currentRoom={currentRoom} />
                </>
              )}

              <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex gap-2 items-start">
                <div className="flex-1 w-full min-w-0">
                  <label className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 ml-1">📝 備註 (選填)</label>
                  <input type="text" placeholder="輸入額外備註..." className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 focus:bg-white focus:border-blue-400 outline-none w-full text-gray-700 font-bold text-[15px] transition shadow-sm" value={recordNote} onChange={(e) => setRecordNote(e.target.value)} />
                </div>
                {/* 使用雙按鈕設計，讓使用者可明確選擇要直接拍照或是從相簿挑選相片 */}
                <div className="shrink-0 w-[86px]">
                   <label className="flex items-center justify-center gap-1.5 text-[14px] font-bold text-gray-500 mb-1.5 w-full text-center">📷 照片</label>
                   <div className="relative w-[86px] h-[46px] flex gap-1.5 group">
                     {recordPhoto ? (
                       <div className="relative w-full h-full bg-gray-50 border border-gray-100 rounded-xl shadow-sm overflow-hidden cursor-pointer">
                         <img src={recordPhoto} alt="預覽" className="w-full h-full object-cover" />
                         <div onClick={(e) => { e.stopPropagation(); setRecordPhoto(null); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition"><Trash2 size={18} className="text-white" /></div>
                       </div>
                     ) : (
                       <>
                         <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition flex items-center justify-center cursor-pointer overflow-hidden" title="拍照">
                           <Camera size={18} className="text-gray-500" />
                           <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} ref={photoInputRef} />
                         </div>
                         <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition flex items-center justify-center cursor-pointer overflow-hidden" title="相簿">
                           <ImageIcon size={18} className="text-gray-500" />
                           <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} />
                         </div>
                       </>
                     )}
                   </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={!isFormValid} className={`w-full font-extrabold text-[18px] py-3.5 mt-1 rounded-[1.2rem] transition-all duration-300 shadow-md ${isFormValid ? `${themeBg} text-white hover:opacity-90 transform hover:-translate-y-1 active:translate-y-0` : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 shadow-none'}`}>
              {isFormValid ? '儲存紀錄 ✨' : '請填寫完整資料'}
            </button>
          </form>
        </main>
      </>
    );
  }
  else if (view === 'settings') {
    content = (
      <>
        <header className="bg-gradient-to-r from-purple-400 to-pink-400 px-4 py-3.5 shadow-md shrink-0 z-10 rounded-b-[1.5rem] border-b-4 border-white/20">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><Settings size={22} className="text-white/80"/> 選項設定</h1>
            <button onClick={() => setView('room')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-[14px] font-bold">返回</button>
          </div>
        </header>

        <main className="scroll-container px-3 py-3 space-y-3 flex-1 overflow-y-auto pb-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setSyncSettingsModalOpen(true)} className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-2.5 rounded-xl font-bold text-[16px] shadow-sm hover:shadow-md transition flex justify-center items-center gap-2 active:scale-95">
             <RefreshCw size={18} /> 🔄 複製設定至其他房間
          </button>

          <div className="flex bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm">
             <button onClick={() => setSettingsTab('expense')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'expense' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>支出</button>
             <button onClick={() => setSettingsTab('income')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>收入</button>
             <button onClick={() => setSettingsTab('transfer')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'transfer' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>轉帳</button>
             <button onClick={() => setSettingsTab('other')} className={`flex-1 py-1.5 px-1 rounded-lg text-[15px] font-extrabold transition-all duration-200 truncate ${settingsTab === 'other' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>其他</button>
          </div>

          <div className="space-y-3">
            {settingsTab === 'expense' && (
              <>
                <SettingBlock title="🌸 支出主分類" items={currentRoom?.categories || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('categories', newList, oldItem, newItem)} themeClass="border-pink-100" spanClass="text-pink-600" btnClass="bg-pink-400" placeholder="輸入新分類..." />
                <div className={`p-3 sm:p-4 rounded-2xl border-2 border-pink-100 bg-white shadow-sm mb-3`}>
                  <h3 className="font-bold text-gray-700 mb-3 text-[17px] flex items-center gap-2">📝 編輯「分類」專屬項目</h3>
                  <select value={settingSelectedCategory} onChange={e => setSettingSelectedCategory(e.target.value)} className="w-full bg-pink-50 border border-pink-100 p-2.5 rounded-xl outline-none font-bold text-[15px] text-pink-700 shadow-sm cursor-pointer appearance-none">
                      <option value="">請先選擇一個主分類...</option>
                      {(currentRoom?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {settingSelectedCategory && (
                    <SettingBlock title={`[${settingSelectedCategory}] 項目清單`} items={currentRoom?.categoryItems?.[settingSelectedCategory] || []} onUpdate={(newList, oldItem, newItem) => updateCategoryItemsField(settingSelectedCategory, newList, oldItem, newItem)} themeClass="border-pink-50 mt-3" spanClass="text-pink-600" btnClass="bg-pink-400" placeholder="新增項目..." />
                  )}
                </div>
                <SettingBlock title="🏪 常見商家" items={currentRoom?.merchants || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('merchants', newList, oldItem, newItem)} themeClass="border-orange-100" spanClass="text-orange-600" btnClass="bg-orange-400" placeholder="輸入新商家..." />
                
                {/* 行動支付綁定信用卡 區塊 */}
                <div className={`p-3 sm:p-4 rounded-2xl border-2 border-purple-100 bg-white shadow-sm mb-3`}>
                  <h3 className="font-bold text-gray-700 mb-1.5 text-[17px] flex items-center gap-2">📱 行動支付綁定信用卡</h3>
                  <p className="text-[12px] text-gray-500 font-bold mb-3 leading-relaxed">請勾選哪些信用卡可用於行動支付。記帳時選擇「行動支付」，將只顯示您勾選的信用卡。</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(currentRoom?.creditCards || []).map(card => {
                      const isChecked = (currentRoom?.mobilePayCards || []).includes(card);
                      return (
                        <button
                          key={card}
                          onClick={() => {
                            let newCards = [...(currentRoom?.mobilePayCards || [])];
                            if (isChecked) newCards = newCards.filter(c => c !== card);
                            else newCards.push(card);
                            updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { mobilePayCards: newCards });
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all border-2 shadow-sm flex items-center gap-1.5 ${isChecked ? 'bg-purple-500 text-white border-purple-600 transform -translate-y-0.5' : 'bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:border-purple-200'}`}
                        >
                          {isChecked ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded border border-gray-300"></div>}
                          {card}
                        </button>
                      )
                    })}
                    {(!currentRoom?.creditCards || currentRoom.creditCards.length === 0) && <p className="text-[12px] text-gray-400 font-bold py-1">請先在下方新增信用卡。</p>}
                  </div>
                </div>

                <SettingBlock title="💳 信用卡清單" items={currentRoom?.creditCards || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('creditCards', newList, oldItem, newItem)} themeClass="border-blue-100" spanClass="text-blue-600" btnClass="bg-blue-400" placeholder="輸入信用卡名稱..." />
                <SettingBlock title="🏦 銀行清單" items={currentRoom?.bankAccounts || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('bankAccounts', newList, oldItem, newItem)} themeClass="border-indigo-100" spanClass="text-indigo-600" btnClass="bg-indigo-400" placeholder="輸入銀行名稱..." />
                <SettingBlock title="🎟️ 電子票證清單" items={currentRoom?.electronicTickets || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('electronicTickets', newList, oldItem, newItem)} themeClass="border-teal-100" spanClass="text-teal-600" btnClass="bg-teal-400" placeholder="輸入電子票證名稱..." />
              </>
            )}

            {settingsTab === 'income' && <SettingBlock title="💰 收入主分類" items={currentRoom?.incomeCategories || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('incomeCategories', newList, oldItem, newItem)} themeClass="border-green-100" spanClass="text-green-600" btnClass="bg-green-400" placeholder="輸入收入分類..." />}
            {settingsTab === 'transfer' && <SettingBlock title="🔄 轉帳主分類" items={currentRoom?.transferCategories || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('transferCategories', newList, oldItem, newItem)} themeClass="border-blue-100" spanClass="text-blue-600" btnClass="bg-blue-400" placeholder="輸入轉帳分類..." />}

            {settingsTab === 'other' && (
              <>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-indigo-100 shadow-sm mb-3">
                  <h3 className="font-bold text-gray-700 text-[15px] sm:text-[16px] mb-1">🎨 自訂房間首頁顏色</h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-500 font-bold mb-3 leading-relaxed">點擊下方色塊即可立即更換此房間的專屬首頁顏色。</p>
                  <div className="flex justify-between items-center w-full px-0.5 sm:px-1">
                    {ROOM_THEMES.map(theme => {
                       const fallbackTheme = getRoomHeaderColor(activeRoomId);
                       const isSelected = currentRoom?.headerTheme ? currentRoom.headerTheme === theme.classes : fallbackTheme === theme.classes;
                       return (
                         <button
                            key={theme.id}
                            onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { headerTheme: theme.classes })}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shadow-sm transition-all duration-200 border-2 shrink-0 ${isSelected ? 'border-white scale-110 shadow-md ring-2 ring-gray-400 opacity-100' : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'} bg-gradient-to-tr ${theme.classes} flex items-center justify-center`}
                            title={theme.label}
                         >
                            {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                         </button>
                       )
                    })}
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-indigo-100 shadow-sm mb-3">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-700 text-[15px] sm:text-[16px]">帳戶與統計預設顯示區間</h3>
                      <p className="text-[11px] sm:text-[12px] text-gray-500 font-bold mt-1 leading-relaxed">設定進入「帳戶總覽」或「統計分析」時，預設要看「當月」還是「全部」的資料。</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner shrink-0">
                      <button
                        onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { accountDefaultRange: '當月' })}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${(!currentRoom?.accountDefaultRange || currentRoom.accountDefaultRange === '當月') ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                      >當月</button>
                      <button
                        onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { accountDefaultRange: '全部' })}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${(currentRoom?.accountDefaultRange === '全部') ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                      >全部</button>
                    </div>
                  </div>
                </div>

                <SettingBlock title="🙋 登入人員 (付款人)" items={currentRoom?.loginUsers || ['老公', '老婆']} onUpdate={(newList, oldItem, newItem) => updateSettingField('loginUsers', newList, oldItem, newItem)} themeClass="border-purple-100" spanClass="text-purple-600" btnClass="bg-purple-400" placeholder="輸入登入者名稱..." />
                <p className="text-[12px] font-bold text-purple-400 mt-1 mb-3 bg-purple-50 p-2.5 rounded-xl leading-relaxed">💡 在這裡新增的名稱，會自動變成登入畫面的按鈕喔！修改名稱也會連動更新歷史紀錄。</p>
                
                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-green-100 shadow-sm mb-3">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-700 text-[15px] sm:text-[16px]">支出自動跨房間提示</h3>
                      <p className="text-[11px] sm:text-[12px] text-gray-500 font-bold mt-1 leading-relaxed">開啟後，每次新增「支出」存檔時，會自動跳出傳送至其他房間的詢問視窗。</p>
                    </div>
                    <button 
                      onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { promptCashSync: !currentRoom?.promptCashSync })}
                      className={`w-12 h-7 rounded-full transition-colors relative shadow-inner shrink-0 ${currentRoom?.promptCashSync ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${currentRoom?.promptCashSync ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                  {currentRoom?.promptCashSync && (
                    <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in duration-300">
                       <PillGroupMulti 
                         label="⛔ 排除提示的花費對象 (選填)" 
                         icon={User} 
                         options={currentRoom?.payers || []} 
                         values={currentRoom?.excludedPromptPayers || []} 
                         onChange={(vals) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoomId), { excludedPromptPayers: vals })} 
                         isPayer={true} 
                       />
                       <p className="text-[11px] text-gray-400 font-bold mt-1.5">💡 當支出的對象包含上方勾選的對象時，將「不會」跳出跨房間提示。</p>
                    </div>
                  )}
                </div>

                <SettingBlock title="👥 花費對象" items={currentRoom?.payers || []} onUpdate={(newList, oldItem, newItem) => updateSettingField('payers', newList, oldItem, newItem)} themeClass="border-gray-200" spanClass="text-gray-700" btnClass="bg-gray-800" placeholder="輸入花費對象名稱..." />

                <div className={`p-3 sm:p-4 rounded-2xl border-2 border-orange-100 bg-white shadow-sm mb-3`}>
                  <h3 className="font-bold text-gray-700 mb-3 text-[17px] flex items-center gap-2">🤖 商家預設規則</h3>
                  <div className="flex flex-col gap-2 mb-4">
                    {orderedAutoFillKeys.map((item, idx, arr) => (
                      <div key={item} className="flex justify-between items-center bg-orange-50 p-2 rounded-xl border border-orange-100 shadow-sm gap-2">
                        <span className="text-[14px] font-bold text-orange-700 flex-1 min-w-0 truncate pl-1">[{item}] ➜ {currentRoom.autoFillRules?.[item]}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button onClick={()=>handleMoveRule(item, -1)} disabled={idx===0} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↑</button>
                            <button onClick={()=>handleMoveRule(item, 1)} disabled={idx===arr.length-1} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↓</button>
                            <button onClick={() => handleDeleteRule(item)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition"><Trash2 size={12}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                     <select value={newRuleItem} onChange={e=>setNewRuleItem(e.target.value)} className="w-full border border-orange-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                       <option value="">選擇觸發的項目...</option>
                       {Object.values(currentRoom?.categoryItems || {}).flat().map(i => <option key={i} value={i}>{i}</option>)}
                     </select>
                     <div className="flex gap-2">
                       <select value={newRuleMerchant} onChange={e=>setNewRuleMerchant(e.target.value)} className="flex-1 border border-orange-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                         <option value="">選擇預設商家...</option>
                         {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <button onClick={handleAddRule} className="bg-orange-400 text-white px-3 py-2 rounded-lg text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95 shrink-0">新增</button>
                     </div>
                  </div>
                </div>

                <div className={`p-3 sm:p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm mb-3`}>
                  <h3 className="font-bold text-gray-700 mb-3 text-[17px] flex items-center gap-2">🤖 付款方式預設規則</h3>
                  <div className="flex flex-col gap-2 mb-4">
                    {orderedMethodKeys.map((merchant, idx, arr) => {
                      const rule = currentRoom.methodRules?.[merchant] || {};
                      return (
                        <div key={merchant} className="flex justify-between items-center bg-blue-50 p-2 rounded-xl border border-blue-100 shadow-sm gap-2">
                          <span className="text-[14px] font-bold text-blue-700 flex-1 min-w-0 truncate pl-1">[{merchant}] ➜ {rule.method || '未知'} {rule.subMethod ? `(${rule.subMethod})` : ''}</span>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                              <button onClick={()=>handleMoveMethodRule(merchant, -1)} disabled={idx===0} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↑</button>
                              <button onClick={()=>handleMoveMethodRule(merchant, 1)} disabled={idx===arr.length-1} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-500 disabled:opacity-30 transition font-black text-[12px]">↓</button>
                              <button onClick={() => handleDeleteMethodRule(merchant)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition"><Trash2 size={12}/></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                     <select value={newMethodRuleMerchant} onChange={e=>setNewMethodRuleMerchant(e.target.value)} className="w-full border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                       <option value="">選擇觸發的商家...</option>
                       {(currentRoom?.merchants || []).map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                     <div className="flex flex-col gap-2">
                       <select value={newMethodRuleMethod} onChange={e=>{
                           setNewMethodRuleMethod(e.target.value);
                           if (e.target.value === '行動支付') {
                               setNewMethodRuleSubMethod(currentRoom?.mobilePayCards?.[0] || currentRoom?.creditCards?.[0] || '');
                           }
                           else if (['信用卡', '信用卡 / 行動支付'].includes(e.target.value)) {
                               setNewMethodRuleSubMethod(currentRoom?.creditCards?.[0] || '');
                           }
                           else if (['銀行', '銀行 / 電子票證'].includes(e.target.value)) {
                               setNewMethodRuleSubMethod(currentRoom?.bankAccounts?.[0] || '');
                           }
                           else if (e.target.value === '電子票證') {
                               setNewMethodRuleSubMethod(currentRoom?.electronicTickets?.[0] || '');
                           }
                           else {
                               setNewMethodRuleSubMethod('');
                           }
                         }} className="w-full border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                         <option value="">預設付款方式...</option>
                         {(currentRoom?.paymentMethods || []).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>

                       <div className="flex gap-2">
                         {['行動支付', '信用卡', '信用卡 / 行動支付'].includes(newMethodRuleMethod) && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">{newMethodRuleMethod === '行動支付' ? '扣款信用卡...' : '選擇信用卡...'}</option>
                             {(() => {
                               const cardList = newMethodRuleMethod === '行動支付' ? (currentRoom?.mobilePayCards || currentRoom?.creditCards || []) : (currentRoom?.creditCards || []);
                               return cardList.map(c => <option key={c} value={c}>{c}</option>);
                             })()}
                           </select>
                         )}
                         {['銀行', '銀行 / 電子票證'].includes(newMethodRuleMethod) && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">選擇銀行...</option>
                             {(currentRoom?.bankAccounts || []).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                         )}
                         {newMethodRuleMethod === '電子票證' && (
                           <select value={newMethodRuleSubMethod} onChange={e=>setNewMethodRuleSubMethod(e.target.value)} className="flex-1 border border-blue-100 p-2 rounded-lg font-bold text-[14px] outline-none text-gray-600 shadow-sm cursor-pointer appearance-none bg-white">
                             <option value="">選擇電子票證...</option>
                             {(currentRoom?.electronicTickets || []).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                         )}
                         <button onClick={handleAddMethodRule} className="bg-blue-400 text-white px-3 py-2 rounded-lg text-[14px] font-bold shadow-md transition hover:scale-105 active:scale-95 ml-auto shrink-0">新增</button>
                       </div>
                     </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </>
    );
  }
  else if (view === 'analysis') {
    const analysisOptions = [
      { id: 'category', label: analysisType === 'income' ? '💰 收入主分類' : analysisType === 'transfer' ? '🔄 轉帳主分類' : '🌸 支出主分類' },
      ...(analysisType === 'expense' ? [{ id: 'title', label: '📝 項目' }, { id: 'merchant', label: '🏪 商家' }, { id: 'method', label: '💳 付款方式' }, { id: 'payer', label: '👥 花費對象' }] : [{ id: 'payer', label: '👥 對象' }])
    ];

    content = (
      <>
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
      </>
    );
  }

  // ==========================================
  // Fallback 畫面 (避免空白)
  // ==========================================
  if (!content) {
     content = (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
           <Sparkles className="animate-spin mb-4" size={32} />
           <p>載入中...</p>
        </div>
     );
  }

  // 統一渲染明細內容 Modal
  const renderDetailRow = (label, value, extraClass = '') => {
    if (!value) return null;
    return (
      <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 pt-1">
        <span className="text-gray-400 shrink-0 mr-4">{label}</span>
        <span className={`text-gray-800 text-right ${extraClass}`}>{value}</span>
      </div>
    );
  };

  return (
    <div className={globalWrapperStyle}>
      <div className={phoneContainerStyle}>
        <input type="file" accept=".json" style={{display: 'none'}} ref={fileInputRef} onChange={handleImport} />
        
        {/* Render Only Once at the very bottom layout level */}
        {content}

        {/* 彈跳視窗群組 (置於頂層外框中) */}

        {/* 0. 智慧計算機 Modal */}
        {showCalc && (
          <div className="fixed inset-0 z-[150] bg-black/60 flex flex-col justify-center items-center p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setRecordAmount(evaluateCalc(calcStr)); setShowCalc(false); }}>
             <div className="bg-gray-50 w-full max-w-[320px] rounded-[2rem] p-5 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-3">
                   <span className="text-gray-500 font-bold text-[14px] flex items-center gap-1.5"><Calculator size={16}/> 智慧計算機</span>
                   <button onClick={() => { setRecordAmount(evaluateCalc(calcStr)); setShowCalc(false); }} className="text-gray-500 bg-gray-200 hover:bg-gray-300 rounded-full p-1.5 transition"><X size={16}/></button>
                </div>
                <div className="text-right text-[38px] font-black text-gray-800 mb-4 overflow-x-auto whitespace-nowrap pb-1.5 border-b-2 border-gray-200 tracking-wider">{calcStr}</div>
                <div className="grid grid-cols-4 gap-2">
                   {calcKeys.map(k => (
                     <button key={k.label} onClick={() => {
                         if (k.label === 'C') setCalcStr('0');
                         else if (k.label === '⌫') setCalcStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
                         else if (k.label === '=') setCalcStr(prev => evaluateCalc(prev));
                         else setCalcStr(prev => prev === '0' && !['+','-','×','÷','.'].includes(k.label) ? k.label : prev + k.label);
                       }} className={`py-4 rounded-xl text-[20px] active:scale-95 transition-transform flex items-center justify-center shadow-sm ${k.color}`}>
                       {k.label}
                     </button>
                   ))}
                </div>
                <button onClick={() => { setRecordAmount(evaluateCalc(calcStr)); setShowCalc(false); }} className={`w-full mt-3 ${recordType === 'income' ? 'bg-green-500' : recordType === 'transfer' ? 'bg-blue-500' : 'bg-orange-500'} text-white py-3.5 rounded-xl font-black text-[18px] shadow-md active:scale-95 transition flex justify-center items-center gap-2`}>
                  <Check size={20}/> 確認金額
                </button>
             </div>
          </div>
        )}

        {/* 1. 放大圖片 Modal */}
        {enlargedPhoto && (
          <div className="fixed inset-0 bg-black/90 z-[130] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in zoom-in duration-200" onClick={() => setEnlargedPhoto(null)}>
            <div className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full cursor-pointer transition"><X size={28} className="text-white" /></div>
            <img src={enlargedPhoto} alt="放大圖" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {/* 2. 統計分析詳細明細 Modal */}
        {viewingAnalysisItem && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-center p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingAnalysisItem(null)}>
            <div className="bg-white w-full max-w-md max-h-[85vh] flex flex-col rounded-[1.5rem] p-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingAnalysisItem(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={16}/></button>
              <h3 className="font-black text-[18px] text-gray-800 mb-3 border-b border-gray-100 pb-2 flex items-center gap-1.5 pr-8"><BarChart size={18} className="text-teal-500 shrink-0" /> <span className="truncate">{viewingAnalysisItem} 明細</span></h3>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(() => {
                  const analysisDetailRecords = analysisFilteredRecords.filter(r => getAnalysisKeyForRecord(r) === viewingAnalysisItem).sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : b.timestamp - a.timestamp)); 
                  if (analysisDetailRecords.length === 0) return <p className="text-center text-gray-400 font-bold py-10 text-[14px]">查無明細</p>;
                  return analysisDetailRecords.map(exp => (
                    <div key={exp.id} onClick={() => setViewingRecord(exp)} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition">
                      <div className="flex-1 pr-2 overflow-hidden flex flex-col justify-center">
                         <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                           <span className="text-[11px] font-bold text-gray-400">{toROCYearStr(exp.date)}</span>
                           {exp.addedByRole && <span className={`${getRoleColorStyle(exp.addedByRole).lightBg} ${getRoleColorStyle(exp.addedByRole).text} border ${getRoleColorStyle(exp.addedByRole).lightBorder} px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0`}>{exp.addedByRole}</span>}
                           <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{exp.frequency === '區間' ? (exp.frequencyInterval === '自訂' ? `${exp.frequencyCustomText}天` : exp.frequencyInterval) : exp.frequency || '一次'}</span>
                           {exp.excludeFromBalance && <span className="bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">不計入</span>}
                         </div>
                         <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                           {!exp.type || exp.type === 'expense' || exp.type === 'income' ? (
                             <>
                               <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 bg-gray-50 border-gray-200' : exp.type === 'income' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{exp.category}</span>
                               <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>{exp.title}</span>
                             </>
                           ) : (
                             <>
                               <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 bg-gray-50 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>轉帳</span>
                               <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>{renderMethodText(exp.method, exp.subMethod)} ➜ {renderMethodText(exp.transferToMethod, exp.transferToSubMethod)}</span>
                             </>
                           )}
                           {exp.payer && exp.payer !== '未指定' && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-white'}`}>👤 {Array.isArray(exp.payer)?exp.payer.join(', '):exp.payer}</span>}
                           {exp.type !== 'transfer' && exp.method && exp.method !== '未指定' && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-white'}`}>💳 {renderMethodText(exp.method, exp.subMethod)}</span>}
                           {exp.type !== 'transfer' && exp.merchant && exp.merchant !== '未指定' && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-white'}`}>🏪 {exp.merchant}</span>}
                           {exp.photoBase64 && <span className="shrink-0 w-[18px] h-[18px] rounded overflow-hidden shadow-sm inline-block border border-gray-200" title="此紀錄附有照片"><img src={exp.photoBase64} alt="圖" className="w-full h-full object-cover" /></span>}
                         </div>
                      </div>
                      <div className={`font-black text-[16px] shrink-0 ${exp.excludeFromBalance ? 'text-gray-400 line-through decoration-gray-300' : exp.type === 'income' ? 'text-green-500' : exp.type === 'transfer' ? 'text-blue-500' : 'text-gray-800'}`}>
                         {exp.type === 'income' ? '+' : exp.type === 'transfer' ? '⇆' : '-'}${exp.amount.toLocaleString()}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 3. 帳戶歷史明細 Modal */}
        {viewingAccountHistory && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-center p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingAccountHistory(null)}>
            <div className="bg-white w-full max-w-md max-h-[85vh] flex flex-col rounded-[1.5rem] p-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingAccountHistory(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={16}/></button>
              <h3 className="font-black text-[18px] text-gray-800 mb-3 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <Wallet size={18} className="text-indigo-500" /> {viewingAccountHistory} 明細
              </h3>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(() => {
                  const todayStr = getLocalTodayStr();
                  const accHistory = records.filter(r => {
                     if (accountStartDate && r.date < accountStartDate) return false;
                     if (accountEndDate && r.date > accountEndDate) return false;
                     if (!accountEndDate && r.date > todayStr) return false;
                     // if (r.excludeFromBalance) return false;
                     const getAccName = (method, subMethod) => method === '現金' ? '現金' : subMethod;
                     const fromAcc = getAccName(r.method, r.subMethod);
                     const toAcc = getAccName(r.transferToMethod, r.transferToSubMethod);
                     return fromAcc === viewingAccountHistory || toAcc === viewingAccountHistory;
                  }).sort((a, b) => {
                      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
                      return b.timestamp - a.timestamp;
                  }); 

                  if (accHistory.length === 0) return <p className="text-center text-gray-400 font-bold py-10 text-[14px]">此區間尚無明細</p>;

                  return accHistory.map(exp => {
                    const isIncome = exp.type === 'income';
                    const isTransfer = exp.type === 'transfer';
                    const getAccName = (method, subMethod) => method === '現金' ? '現金' : subMethod;
                    let isPositive = false;
                    if (isIncome && getAccName(exp.method, exp.subMethod) === viewingAccountHistory) isPositive = true;
                    if (isTransfer && getAccName(exp.transferToMethod, exp.transferToSubMethod) === viewingAccountHistory) isPositive = true;
                    let freqDisplay = exp.frequency === '區間' ? (exp.frequencyInterval === '自訂' ? `${exp.frequencyCustomText}天` : exp.frequencyInterval) : exp.frequency;
                    const payerStr = Array.isArray(exp.payer) ? exp.payer.join(', ') : exp.payer;

                    return (
                      <div key={exp.id} onClick={() => { setViewingRecord(exp); }} className={`bg-gray-50 p-2.5 rounded-xl border ${exp.excludeFromBalance ? 'border-gray-200 opacity-80' : 'border-gray-100'} flex justify-between items-center cursor-pointer hover:bg-gray-100 transition`}>
                        <div className="flex-1 pr-2 overflow-hidden flex flex-col justify-center">
                           <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                             <span className="text-[11px] font-bold text-gray-400">{toROCYearStr(exp.date)}</span>
                             {exp.addedByRole && <span className={`${getRoleColorStyle(exp.addedByRole).lightBg} ${getRoleColorStyle(exp.addedByRole).text} border ${getRoleColorStyle(exp.addedByRole).lightBorder} px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0`}>{exp.addedByRole}</span>}
                             <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{freqDisplay || '一次'}</span>
                             {exp.excludeFromBalance && <span className="bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">不計入</span>}
                           </div>
                           <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                             {!isTransfer && (
                               <>
                                 <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 border-gray-200 bg-gray-50' : isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{exp.category}</span>
                                 <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>{exp.title}</span>
                               </>
                             )}
                             {isTransfer && (
                               <>
                                 <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border shrink-0 ${exp.excludeFromBalance ? 'text-gray-500 border-gray-200 bg-gray-50' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>轉帳</span>
                                 <span className={`font-black text-black text-[14px] sm:text-[15px] ${exp.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-400' : ''}`}>{renderMethodText(exp.method, exp.subMethod)} ➜ {renderMethodText(exp.transferToMethod, exp.transferToSubMethod)}</span>
                               </>
                             )}
                             {payerStr && payerStr !== '未指定' && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-white'}`}>👤 {payerStr}</span>}
                             {!isTransfer && exp.method && exp.method !== '未指定' && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-white'}`}>💳 {renderMethodText(exp.method, exp.subMethod)}</span>}
                             {!isTransfer && exp.merchant && exp.merchant !== '未指定' && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-gray-200 ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-white'}`}>🏪 {exp.merchant}</span>}
                             {exp.photoBase64 && <span className="shrink-0 w-[18px] h-[18px] rounded overflow-hidden shadow-sm inline-block border border-gray-200" title="有照片"><img src={exp.photoBase64} alt="圖" className="w-full h-full object-cover" /></span>}
                             {exp.note && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border border-[#F2EFE9] max-w-[120px] truncate ${exp.excludeFromBalance ? 'text-gray-400 bg-transparent' : 'text-gray-500 bg-[#FFFDF9]'}`}>📝 {exp.note}</span>}
                           </div>
                        </div>
                        <div className={`font-black text-[16px] shrink-0 ${exp.excludeFromBalance ? 'text-gray-400 line-through decoration-gray-300' : isPositive ? 'text-green-500' : 'text-gray-800'}`}>
                           {isPositive ? '+' : '-'}${exp.amount.toLocaleString()}
                        </div>
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 4. 單筆紀錄詳細資訊 Modal */}
        {viewingRecord && (
          <div className="fixed inset-0 bg-black/40 z-[110] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingRecord(null)}>
            <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-5 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingRecord(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={20}/></button>
              <h3 className="font-black text-xl text-gray-800 mb-3 border-b border-gray-100 pb-2">詳細紀錄</h3>
              <div className="space-y-2 text-[15px] text-gray-600 font-bold max-h-[65vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {renderDetailRow('類型', <span className={`${viewingRecord.type === 'income' ? 'text-green-500' : viewingRecord.type === 'transfer' ? 'text-blue-500' : 'text-orange-500'} font-black text-[16px]`}>{viewingRecord.type === 'income' ? '收入' : viewingRecord.type === 'transfer' ? '轉帳' : '支出'}</span>)}
                {renderDetailRow('金額', `$${viewingRecord.amount.toLocaleString()}`, `text-[24px] font-black ${viewingRecord.excludeFromBalance ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-800'}`)}
                {renderDetailRow('消費日期', toROCYearStr(viewingRecord.date))}
                {renderDetailRow('建檔時間', `${toROCYearStr(viewingRecord.timestamp)} ${new Date(viewingRecord.timestamp).toLocaleTimeString('zh-TW', {hour12: false, hour: '2-digit', minute:'2-digit'})}`, 'text-[13px]')}
                {renderDetailRow('分類', viewingRecord.category)}
                {viewingRecord.type !== 'transfer' && renderDetailRow('項目', viewingRecord.title)}
                {viewingRecord.merchant && viewingRecord.merchant !== '未指定' && renderDetailRow('商家', viewingRecord.merchant)}
                {viewingRecord.payer && viewingRecord.payer.length > 0 && renderDetailRow('對象', Array.isArray(viewingRecord.payer) ? viewingRecord.payer.join(', ') : viewingRecord.payer)}
                {viewingRecord.method && viewingRecord.method !== '未指定' && renderDetailRow(viewingRecord.type === 'transfer' ? '轉出帳戶' : '付款方式', renderMethodText(viewingRecord.method, viewingRecord.subMethod))}
                {viewingRecord.transferToMethod && renderDetailRow('轉入帳戶', renderMethodText(viewingRecord.transferToMethod, viewingRecord.transferToSubMethod))}
                {renderDetailRow('頻率', viewingRecord.frequency === '每週' && viewingRecord.frequencyDays?.length > 0 ? `每週 (${viewingRecord.frequencyDays.join('、')})` : viewingRecord.frequency === '每月' && viewingRecord.frequencyDays?.length > 0 ? `每月 (${viewingRecord.frequencyDays.join('、')}號)` : viewingRecord.frequency === '區間' ? (viewingRecord.frequencyInterval === '自訂' ? viewingRecord.frequencyCustomText : viewingRecord.frequencyInterval) : viewingRecord.frequency)}
                {renderDetailRow('付款人', <span className={`${getRoleColorStyle(viewingRecord.addedByRole).lightBg} ${getRoleColorStyle(viewingRecord.addedByRole).text} border ${getRoleColorStyle(viewingRecord.addedByRole).lightBorder} px-2 py-0.5 rounded-md text-[13px] font-bold`}>{viewingRecord.addedByRole}</span>)}
                
                {viewingRecord.note && <div className="pt-1.5"><span className="text-gray-400 block mb-1">備註</span><span className="text-gray-800 block bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-[14px]">{viewingRecord.note}</span></div>}
                {viewingRecord.photoBase64 && (
                  <div className="pt-2">
                     <span className="text-gray-400 block mb-1">附加照片 (點擊放大)</span>
                     <div className="w-full h-28 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden cursor-pointer shadow-sm hover:opacity-90 transition" onClick={() => setEnlargedPhoto(viewingRecord.photoBase64)}><img src={viewingRecord.photoBase64} alt="附加照片" className="w-full h-full object-cover" /></div>
                  </div>
                )}
              </div>
              <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                 <button onClick={() => { handleCopyRecord(viewingRecord); setViewingRecord(null); setViewingAnalysisItem(null); }} disabled={!(!viewingRecord.addedByRole || currentUserRole === viewingRecord.addedByRole)} className={`flex-1 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${(!viewingRecord.addedByRole || currentUserRole === viewingRecord.addedByRole) ? 'bg-green-50 text-green-600 hover:bg-green-100 active:scale-95' : 'bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed'}`}><Copy size={15}/> 複製此筆</button>
                 <button onClick={() => { handleDeleteRecord(viewingRecord); setViewingRecord(null); }} disabled={!(!viewingRecord.addedByRole || currentUserRole === viewingRecord.addedByRole)} className={`flex-1 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${(!viewingRecord.addedByRole || currentUserRole === viewingRecord.addedByRole) ? 'bg-red-50 text-red-500 hover:bg-red-100 active:scale-95' : 'bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed'}`}><Trash2 size={15}/> 刪除此筆</button>
              </div>
            </div>
          </div>
        )}

        {/* 5. 跨房間傳送 Modal */}
        {crossRoomRecord && (
          <div className="fixed inset-0 bg-black/40 z-[120] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-5 shadow-2xl">
               <h3 className="font-black text-xl text-gray-800 mb-3 flex items-center gap-2"><Send size={22} className="text-blue-500"/> 傳送至其他房間</h3>
               {!selectedTransferRoom ? (
                 <>
                     <p className="text-[15px] font-bold text-gray-500 mb-4 leading-relaxed">將此筆 <span className="text-gray-800">[{crossRoomRecord.title || crossRoomRecord.category}] ${crossRoomRecord.amount}</span> 複製傳送到：</p>
                     <div className="space-y-2.5 mb-5 max-h-56 overflow-y-auto pr-1">
                       {savedRooms.filter(r => r.id !== activeRoomId).length === 0 ? (
                         <p className="text-red-400 font-bold text-[14px] bg-red-50 p-3 rounded-xl leading-relaxed">您目前沒有儲存其他房間，請先登入過其他房間再使用此功能。</p>
                       ) : (
                         savedRooms.filter(r => r.id !== activeRoomId).map(r => (
                           <button key={r.id} onClick={() => { if (crossRoomRecord.frequency !== '一次') setSelectedTransferRoom(r); else handleSendToOtherRoom(r.id, false); }} className="w-full text-left bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 p-3 rounded-xl font-black text-gray-700 text-[16px] transition flex items-center shadow-sm">
                             🏠 {r.name} <span className="text-[12px] font-bold text-gray-400 ml-auto">({r.id})</span>
                           </button>
                         ))
                       )}
                     </div>
                     <button onClick={() => { setCrossRoomRecord(null); setSelectedTransferRoom(null); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold text-[16px] py-3 rounded-xl transition">取消</button>
                 </>
               ) : (
                 <div className="animate-in slide-in-from-right-8 duration-200">
                     <p className="text-[15px] font-bold text-gray-600 mb-4 leading-relaxed">目標房間：<span className="text-blue-600 font-black">{selectedTransferRoom.name}</span><br/><br/>這是一筆<span className="text-orange-500">週期性紀錄</span>，請問您要如何傳送？</p>
                     <div className="space-y-3 mb-5">
                       <button onClick={() => handleSendToOtherRoom(selectedTransferRoom.id, true)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black text-[16px] py-3.5 rounded-xl transition shadow-md active:scale-95 flex items-center justify-center gap-2">🔄 完整傳送 (包含未來排程)</button>
                       <button onClick={() => handleSendToOtherRoom(selectedTransferRoom.id, false)} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-black text-[16px] py-3.5 rounded-xl transition shadow-sm active:scale-95 flex items-center justify-center gap-2">📌 僅傳送單次 (不含排程)</button>
                     </div>
                     <button onClick={() => setSelectedTransferRoom(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold text-[16px] py-3 rounded-xl transition active:scale-95">返回重選</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* 6. 跨房間同步設定 Modal */}
        {syncSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-[140] flex justify-center items-end sm:items-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSyncSettingsModalOpen(false)}>
            <div className="bg-white w-full max-w-md rounded-t-[1.5rem] sm:rounded-[1.5rem] p-5 shadow-2xl relative animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSyncSettingsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition"><X size={20}/></button>
              <h3 className="font-black text-[20px] text-gray-800 mb-2 flex items-center gap-1.5">🔄 複製設定至其他房間</h3>
              <p className="text-[14px] text-gray-500 font-bold mb-4 leading-relaxed">選擇目標房間，並勾選想同步的具體設定項目。系統會將目前的設定與目標房間合併（不會刪除目標房間原有的設定）。</p>
              
              <div className="space-y-4">
                <div>
                   <label className="block text-[14px] font-bold text-gray-500 mb-1.5 ml-1">選擇目標房間</label>
                   <select value={syncTargetRoom} onChange={e => setSyncTargetRoom(e.target.value)} className="w-full border border-indigo-100 bg-indigo-50 text-indigo-700 p-3 rounded-xl font-bold text-[15px] outline-none shadow-sm cursor-pointer appearance-none">
                     <option value="">請選擇要同步過去的房間...</option>
                     {savedRooms.filter(r => r.id !== activeRoomId).map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                     ))}
                   </select>
                   {savedRooms.filter(r => r.id !== activeRoomId).length === 0 && <p className="text-red-400 text-[12px] mt-1.5 font-bold ml-1">無其他已儲存房間可選</p>}
                </div>

                <div className="max-h-[35vh] overflow-y-auto pr-2 space-y-3">
                  {SYNC_FIELDS.map(fieldObj => {
                     const fKey = fieldObj.key;
                     let contentList = [];
                     if (fKey === 'categories') contentList = currentRoom?.categories || [];
                     else if (fKey === 'merchants') contentList = currentRoom?.merchants || [];
                     else if (fKey === 'autoFillRules') contentList = currentRoom?.autoFillRuleOrder || Object.keys(currentRoom?.autoFillRules || {});
                     else if (fKey === 'methodRules') contentList = currentRoom?.methodRuleOrder || Object.keys(currentRoom?.methodRules || {});
                     else contentList = currentRoom?.[fKey] || [];
                     
                     if (contentList.length === 0) return null;

                     const isAllSelected = (syncSelection[fKey] || []).length === contentList.length;

                     return (
                       <div key={fKey} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                         <div className="bg-gray-100 p-2.5 flex justify-between items-center border-b border-gray-200">
                           <span className="font-bold text-[13px] text-gray-700">{fieldObj.label}</span>
                           <button 
                             onClick={() => handleSelectAllSyncField(fKey, contentList)}
                             className="text-[11px] font-bold bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-gray-600 active:scale-95 transition"
                           >
                             {isAllSelected ? '全不選' : '全選'}
                           </button>
                         </div>
                         <div className="p-2 flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                            {contentList.map(item => {
                               const isChecked = (syncSelection[fKey] || []).includes(item);
                               let displayLabel = item;
                               if (fKey === 'autoFillRules') displayLabel = `[${item}] ➜ ${currentRoom?.autoFillRules?.[item]}`;
                               if (fKey === 'methodRules') {
                                   const rule = currentRoom?.methodRules?.[item];
                                   displayLabel = `[${item}] ➜ ${rule?.method || '未知'}${rule?.subMethod ? `(${rule?.subMethod})` : ''}`;
                               }
                               return (
                                 <button 
                                   key={item}
                                   onClick={() => handleToggleSyncItem(fKey, item)}
                                   className={`px-2.5 py-1 rounded-md text-[12px] font-bold border transition-colors ${isChecked ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                 >
                                   {displayLabel}
                                 </button>
                               )
                             })}
                         </div>
                       </div>
                     )
                   })}
                </div>
                
                <button 
                  onClick={handleSyncSettings}
                  disabled={!syncTargetRoom || Object.values(syncSelection).every(arr => arr.length === 0)}
                  className="w-full bg-blue-500 text-white font-black text-[16px] py-3.5 rounded-xl transition-all hover:bg-blue-600 disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-md mt-1"
                >
                  確認同步所選項
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 底部導覽列 */}
        {user && view === 'room' && !showAddForm && (
          <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl p-2 pb-6 sm:pb-3 rounded-t-[1.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] flex justify-between items-center z-20 border-t border-gray-100 px-6">
            <button onClick={() => { 
                const defaultRange = currentRoom?.accountDefaultRange || '當月';
                if (defaultRange === '全部') {
                   setAccountStartDate(''); setAccountEndDate(getLocalTodayStr());
                } else {
                   setAccountStartDate(getLocalMonthStartStr()); setAccountEndDate(getLocalTodayStr());
                }
                setView('accounts'); 
              }} className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-500 transition px-4 py-2"><Wallet size={22} /><span className="font-extrabold text-[11px]">帳戶</span></button>
            <button onClick={() => { resetForm(); setRecordType('expense'); setShowAddForm(true); }} className="absolute left-1/2 -translate-x-1/2 -top-5 bg-gradient-to-tr from-pink-400 to-orange-400 text-white w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(251,146,60,0.4)] border-[3px] border-[#FFFBF0] transform hover:scale-105 transition active:scale-95"><Plus size={32} strokeWidth={3} /></button>
            <button onClick={() => { 
                const defaultRange = currentRoom?.accountDefaultRange || '當月';
                if (defaultRange === '全部') {
                   setAnalysisStartDate(''); setAnalysisEndDate(getLocalTodayStr());
                } else {
                   setAnalysisStartDate(getLocalMonthStartStr()); setAnalysisEndDate(getLocalTodayStr());
                }
                setAnalysisType('expense'); setAnalysisMenus([]); setAnalysisSubSelections({ category: [], title: [], merchant: [], method: [], subMethod: [], payer: [] }); setAnalysisRoleFilter('全部'); setView('analysis'); 
              }} className="flex flex-col items-center gap-1 text-gray-400 hover:text-teal-500 transition px-4 py-2"><BarChart size={24} /><span className="font-extrabold text-[11px]">統計</span></button>
          </div>
        )}
      </div>
    </div>
  );
}
