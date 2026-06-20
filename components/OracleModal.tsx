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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
      {/* Background Rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,#4f46e5_20deg,transparent_40deg)] animate-[spin_10s_linear_infinite] opacity-20"></div>
      </div>

      <div className="relative w-full max-w-[320px] flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
          boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
        }}>

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5">
          <h2 className="flex-1 text-sm font-black text-white">Oracle Bonus</h2>
          <div className="round-btn cursor-pointer shrink-0" onClick={onClose}>
            <i className="ti ti-x" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-4 py-3 flex flex-col items-center justify-center text-center space-y-4">
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="text-4xl animate-bounce">🔮</div>
              <p className="text-purple-200/80 text-xs tracking-wide animate-pulse">Consulting spirits...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <span className="text-purple-300/60 text-[10px] uppercase tracking-widest mb-0.5">Total Win</span>
                <div className="text-3xl font-black text-yellow-300 animate-pulse font-mono">
                  {bonusWin.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl p-3 w-full"
                style={{
                  background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
                }}>
                <p className="text-purple-100/80 text-xs italic leading-relaxed">
                  "{fortune}"
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 pb-4">
          <button
            onClick={onClose}
            disabled={loading}
            className={`pill-green w-full${loading ? ' opacity-40' : ''}`}
          >
            <div className="pill-face">{loading ? 'Waiting...' : 'COLLECT'}</div>
          </button>
        </div>
      </div>
    </div>
  );
};
