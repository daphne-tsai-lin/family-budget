import React from 'react';
import { Sparkles, Home, AlertCircle } from 'lucide-react';

const LoginView = ({ 
  savedRooms, 
  roomCode, setRoomCode, 
  roomPin, setRoomPin, 
  currentUserRole, setCurrentUserRole, 
  availableLoginUsers, 
  isLoading, 
  errorMsg, 
  handleJoinRoom, 
  quickJoinRoom, 
  onSwitchToCreate 
}) => {
  return (
    <div className="scroll-container flex flex-col items-center justify-center flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex flex-col items-center mb-6 w-full mt-2">
        <div className="bg-gradient-to-tr from-[#FFF4B8] to-[#FFD580] p-5 rounded-[1.5rem] mb-5 shadow-sm">
          <Sparkles size={48} className="text-white drop-shadow-sm" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-800 mb-2 flex items-center gap-2"> ❤️ 林北一家 🏠 </h1>
        <p className="text-[17px] font-bold text-gray-500">林北的小財庫</p>
      </div>

      {/* 快速切換最近房間 [cite: 1593] */}
      {savedRooms.length > 0 && (
        <div className="w-full mb-6 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
          <p className="text-[16px] font-bold text-gray-500 mb-3 text-center"> 👇 快速切換最近房間</p>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {savedRooms.map(r => (
              <button 
                key={r.id} 
                type="button" 
                onClick={() => quickJoinRoom(r)} 
                className="w-full bg-white border border-transparent p-4 rounded-[1.2rem] hover:border-blue-300 hover:shadow-md transition flex justify-between items-center shadow-sm"
              >
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

      {errorMsg && (
        <div className="w-full bg-red-50 text-red-500 font-bold p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-[16px] shadow-sm border border-red-100">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleJoinRoom} className="space-y-5 w-full bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100">
        <div>
          <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">家庭通關代碼</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 text-center border border-gray-100 p-4 rounded-xl focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" 
            placeholder="例如：linbei" 
            value={roomCode} 
            onChange={(e) => setRoomCode(e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">房間密碼</label>
          <input 
            type="password" 
            className="w-full bg-gray-50 text-center border border-gray-100 p-4 rounded-xl focus:bg-white focus:border-blue-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" 
            placeholder="輸入密碼" 
            value={roomPin} 
            onChange={(e) => setRoomPin(e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">我是誰？</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {availableLoginUsers.map(roleName => (
              <button 
                key={roleName} 
                type="button" 
                onClick={() => setCurrentUserRole(roleName)}
                className={`flex-1 min-w-[30%] py-3 px-2 rounded-xl font-bold text-[16px] flex justify-center items-center gap-1.5 transition-all duration-200 truncate ${currentUserRole === roleName ? (roleName === '老婆' ? 'bg-pink-500 text-white shadow-md transform -translate-y-0.5' : 'bg-blue-500 text-white shadow-md transform -translate-y-0.5') : 'bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100'}`}
              >
                {roleName}
              </button>
            ))}
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-orange-500 text-white font-extrabold text-[20px] p-4 rounded-[1.5rem] hover:bg-orange-600 shadow-md transition active:scale-95 disabled:opacity-50 mt-2"
        >
          {isLoading ? '處理中...' : '開啟小財庫 🚀'}
        </button>
      </form>

      <div className="mt-6 text-center w-full pb-6">
        <button onClick={onSwitchToCreate} className="text-gray-500 text-[17px] font-bold hover:text-gray-700 transition bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
          💡 建立新的家庭房間
        </button>
      </div>
    </div>
  );
};

export default LoginView;
