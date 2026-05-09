import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

const CreateRoomView = ({ 
  roomName, setRoomName, 
  roomCode, setRoomCode, 
  roomPin, setRoomPin, 
  currentUserRole, setCurrentUserRole, 
  isLoading, 
  errorMsg, 
  handleCreateRoom, 
  onBackToLogin 
}) => {
  return (
    <div className="scroll-container flex flex-col items-center justify-center flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex flex-col items-center mb-6 w-full mt-2">
        <div className="bg-gradient-to-tr from-[#A7F3D0] to-[#34D399] p-5 rounded-[1.5rem] mb-5 shadow-sm">
          <Home size={44} className="text-white drop-shadow-sm" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">建立新家庭 ✨</h1>
      </div>

      {errorMsg && (
        <div className="w-full bg-red-50 text-red-500 font-bold p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-[16px] shadow-sm border border-red-100">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreateRoom} className="space-y-4 w-full bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100">
        <input 
          type="text" 
          className="w-full bg-gray-50 text-center border border-gray-100 p-3.5 rounded-xl focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" 
          placeholder=" 🏠 房間名稱 (例: 林北小財庫)" 
          value={roomName} 
          onChange={(e) => setRoomName(e.target.value)} 
        />
        <input 
          type="text" 
          className="w-full bg-gray-50 text-center border border-gray-100 p-3.5 rounded-xl focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" 
          placeholder=" 🎀 自訂通關代碼 (需唯一)" 
          value={roomCode} 
          onChange={(e) => setRoomCode(e.target.value)} 
        />
        <input 
          type="password" 
          className="w-full bg-gray-50 text-center border border-gray-100 p-3.5 rounded-xl focus:bg-white focus:border-green-300 outline-none font-bold text-gray-700 text-[18px] transition shadow-sm" 
          placeholder=" 🔑 設定房間密碼" 
          value={roomPin} 
          onChange={(e) => setRoomPin(e.target.value)} 
        />
        
        <div>
          <label className="block text-[16px] font-bold text-gray-500 mb-1.5 ml-1">我是誰？ (請點選)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {['老公', '老婆'].map(r => (
              <button 
                key={r} 
                type="button" 
                onClick={() => setCurrentUserRole(r)} 
                className={`flex-1 min-w-[30%] py-3 px-2 rounded-xl font-bold text-[16px] flex justify-center items-center gap-1.5 transition-all duration-200 truncate ${currentUserRole === r ? (r === '老婆' ? 'bg-pink-500 text-white shadow-md transform -translate-y-0.5' : 'bg-blue-500 text-white shadow-md transform -translate-y-0.5') : 'bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-2 text-center"> 💡 進入房間後，可在「其他」設定中修改/新增登入人員</p>
        </div>

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-green-500 text-white font-extrabold text-[20px] py-4 rounded-[1.5rem] hover:bg-green-600 shadow-md transition active:scale-95 mt-2"
        >
          {isLoading ? '處理中...' : '建立並進入 🚀'}
        </button>
      </form>

      <div className="mt-6 text-center w-full pb-6">
        <button onClick={onBackToLogin} className="text-gray-500 text-[17px] font-bold hover:text-gray-700 transition bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
          返回登入
        </button>
      </div>
    </div>
  );
};

export default CreateRoomView;
