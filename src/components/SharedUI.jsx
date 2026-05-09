import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown, Send, Copy } from 'lucide-react';
import { toROCYearStr, getRoleColorStyle } from '../utils/helpers';

export const CustomDropdown = ({ label, icon: Icon, options, value, onChange, placeholder }) => {
  // ... (保留你原本 CustomDropdown 的完整程式碼)
};

export const SettingBlock = ({ title, items, onUpdate, themeClass, spanClass, btnClass, placeholder }) => {
  // ... (保留你原本 SettingBlock 的完整程式碼)
};

export const MyCustomPieChart = ({ data, colors }) => {
  // ... (保留你原本圓餅圖的完整 SVG 程式碼)
};

// 【優化關鍵】：使用 React.memo 包裝明細列表，避免輸入金額時整個列表重新渲染
export const RecordItem = React.memo(({ exp, idx, isSortable, hideActions, onRecordClick, handleMoveRecord, openEditForm, setCrossRoomRecord }) => {
  // ... (保留你原本 RecordItem 的完整程式碼)
});
