import React, { useEffect, useState } from 'react';
import { generateOracleFortune } from '../services/geminiService';

interface OracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bonusWin: number;
  currentBalance: number;
}

export const OracleModal: React.FC<OracleModalProps> = ({ isOpen, onClose, bonusWin, currentBalance }) => {
  const [fortune, setFortune] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      generateOracleFortune(currentBalance, bonusWin).then((text) => {
        setFortune(text);
        setLoading(false);
      });
    } else {
      setFortune("");
    }
  }, [isOpen, bonusWin, currentBalance]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-pop-in">
      {/* Background Rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,#4f46e5_20deg,transparent_40deg)] animate-[spin_10s_linear_infinite] opacity-20"></div>
      </div>

      <div className="relative bg-gradient-to-b from-indigo-900 to-black rounded-2xl max-w-xs w-full shadow-[0_0_30px_rgba(79,70,229,0.4)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-900 p-3 text-center rounded-t-xl relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
          <h2 className="relative z-10 text-base font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-gold-300 to-gold-600 drop-shadow-sm tracking-widest">
            ORACLE BONUS
          </h2>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col items-center justify-center min-h-[160px] text-center space-y-4 relative">
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="text-4xl animate-bounce">🔮</div>
              <p className="text-indigo-200 text-xs font-body tracking-wide animate-pulse">Consulting spirits...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                  <span className="text-gold-200 text-[10px] uppercase tracking-[0.2em] mb-0.5">Total Win</span>
                  <div className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-t from-yellow-400 to-white drop-shadow-[0_0_10px_rgba(234,179,8,0.7)] animate-pulse">
                    {bonusWin.toLocaleString()}
                  </div>
              </div>
              
              <div className="bg-black/40 p-3 rounded-lg w-full backdrop-blur-sm">
                <p className="text-cyan-100 italic font-serif text-xs leading-relaxed drop-shadow-sm">
                  "{fortune}"
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-black/50 flex justify-center">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-b from-gold-400 to-gold-700 text-black font-display font-bold text-xs rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
          >
            {loading ? 'WAITING...' : 'COLLECT'}
          </button>
        </div>
      </div>
    </div>
  );
};
