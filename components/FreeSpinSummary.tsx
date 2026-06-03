import React, { useEffect } from 'react';
import { formatCommaNumber, formatNumber } from '../constants';

interface FreeSpinSummaryProps {
    isOpen: boolean;
    totalWin: number;
    bet: number;
    onClose: () => void;
}

export const FreeSpinSummary: React.FC<FreeSpinSummaryProps> = ({ isOpen, totalWin, bet, onClose }) => {
    
    // Auto close after 3 seconds
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent pointer-events-auto animate-pop-in">
            <div className="relative w-full max-w-xs p-2">
                 {/* Glow Effect */}
                 <div className="absolute inset-0 bg-yellow-400 rounded-xl blur-md opacity-55 animate-pulse"></div>
                 
                 <div className="relative bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-xl p-4 md:p-5 flex flex-col items-center text-center shadow-md overflow-hidden">
                    
                    {/* Background Texture */}
                    <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-50"></div>

                    <div className="relative z-10 w-full flex flex-col items-center">
                        <div className="text-[8px] font-black text-yellow-900 uppercase tracking-[0.2em] mb-1 drop-shadow-sm">Free Spins Complete</div>
                        
                        <h2 className="text-lg font-black font-display mb-2 tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                            TOTAL WIN
                        </h2>

                        <div className="bg-black/20 rounded-xl p-3 mb-4 w-full backdrop-blur-sm shadow-inner flex items-center justify-center min-h-[70px]">
                            <div className="text-white text-3xl font-mono font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] tracking-tighter whitespace-nowrap">
                                {totalWin > 10000000000 ? formatNumber(totalWin) : formatCommaNumber(totalWin)}
                            </div>
                        </div>

                        <div className="text-yellow-100 text-[9px] uppercase mb-4 font-bold tracking-widest">Accumulated Coins</div>

                        <button 
                            onClick={onClose}
                            className="px-6 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer"
                        >
                            COLLECT
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    );
};
