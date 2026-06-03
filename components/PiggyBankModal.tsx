import React, { useState } from 'react';
import { formatCommaNumber, formatNumber } from '../constants';
import { audioService } from '../services/audioService';

interface PiggyBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    diamonds: number;
    onBreak: () => void;
    level: number;
}

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ isOpen, onClose, amount, diamonds, onBreak, level }) => {
    const [isBreaking, setIsBreaking] = useState(false);
    const [shake, setShake] = useState(false);
    
    if (!isOpen) return null;
    
    // Dynamic Cost: Base 50 Gems, +1 Gem per 20,000 Coins saved
    // Cap at 1000 Gems
    const rawCost = Math.max(50, Math.floor(amount / 20000));
    const breakCost = Math.min(rawCost, 1000);
    
    // Cap: Level * 2,500,000
    const cap = level * 2500000;
    const isFull = amount >= cap;

    const handleBreakClick = () => {
        if (diamonds < breakCost || amount <= 0) {
             setShake(true);
             audioService.playStoneBreak();
             setTimeout(() => setShake(false), 500);
             onBreak(); // Trigger parent toast/validation
             return;
        }

        setIsBreaking(true);
        audioService.playClick();
        
        setTimeout(() => {
            audioService.playStoneBreak();
            onBreak();
            setTimeout(() => {
                setIsBreaking(false);
                onClose();
            }, 1500);
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md animate-pop-in">
            <div className="relative w-full max-w-sm p-3">
                <div className="bg-gradient-to-b from-pink-500 to-rose-800 rounded-2xl p-4 flex flex-col items-center text-center shadow-[0_0_40px_rgba(244,114,182,0.4)] overflow-hidden relative">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                     <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-black/20 hover:bg-black/40 rounded-full text-white font-bold flex items-center justify-center z-50 text-xs">✕</button>
                     
                     <h2 className="text-xl md:text-2xl font-black font-cartoon text-white uppercase tracking-wider drop-shadow-md mb-1">Piggy Bank</h2>
                     <p className="text-pink-100 text-[10px] md:text-xs font-bold mb-3">Saves 1% of every bet!</p>
                     
                     <div className={`relative w-23 h-23 md:w-26 md:h-26 flex items-center justify-center mb-4 transition-transform duration-300 ${isBreaking ? 'scale-110 shake' : shake ? 'shake' : 'animate-bounce'}`}>
                         <div className="text-5xl md:text-6xl filter drop-shadow-2xl">🐷</div>
                         {isBreaking && <div className="absolute text-4xl animate-ping">💥</div>}
                         {isFull && !isBreaking && <div className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full animate-bounce shadow-lg">FULL!</div>}
                     </div>
                     
                     <div className="bg-black/40 rounded-xl p-3 mb-4 w-full backdrop-blur-sm">
                          <div className="flex justify-between items-end mb-1 px-1">
                              <div className="text-pink-200 text-[9px] font-bold uppercase tracking-widest">Saved Amount</div>
                              <div className="text-pink-300 text-[8px] font-bold uppercase">Cap: {formatNumber(cap)}</div>
                          </div>
                          <div className="text-2xl md:text-3xl font-mono font-black text-white drop-shadow-md truncate leading-none mb-2">
                              {formatCommaNumber(Math.floor(amount))}
                          </div>
                          
                          {/* Capacity Bar */}
                          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden shadow-inner">
                              <div 
                                 className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`} 
                                 style={{ width: `${Math.min(100, (amount / cap) * 100)}%` }}
                              ></div>
                          </div>
                          {isFull && <div className="text-red-300 text-[9px] font-bold mt-1 uppercase animate-pulse">Bank is Full! Break it to save more.</div>}
                     </div>
                     
                     <button 
                        onClick={handleBreakClick}
                        disabled={isBreaking}
                        className={`w-full py-2 font-black text-sm uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2
                            ${diamonds >= breakCost && amount > 0 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 text-white cursor-pointer' 
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                        `}
                     >
                          <span>Break Bank</span>
                          <span className="bg-black/30 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                             {breakCost} 💎
                          </span>
                     </button>
                </div>
            </div>
        </div>
    );
};
