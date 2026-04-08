// 監聽安裝事件
self.addEventListener('install', (e) => {
  console.log('[Service Worker] 安裝成功');
});

// 監聽網頁請求 (Chrome 規定必須要有這個 fetch 監聽器，才會觸發安裝提示)
self.addEventListener('fetch', (e) => {
  // 這裡留空即可，我們暫時不需要複雜的離線暫存功能
});
