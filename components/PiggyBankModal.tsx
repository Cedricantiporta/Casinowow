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
    balance?: number;
}

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ isOpen, onClose, amount, diamonds, onBreak, level, balance = 0 }) => {
    const [isBreaking, setIsBreaking] = useState(false);
    const [shake, setShake] = useState(false);

    if (!isOpen) return null;

    const rawCost = Math.max(50, Math.floor(amount / 20000));
    const breakCost = Math.min(rawCost, 1000);

    const cap = level * 2500000;
    const isFull = amount >= cap;

    const handleBreakClick = () => {
        if (diamonds < breakCost || amount <= 0) {
             setShake(true);
             audioService.playStoneBreak();
             setTimeout(() => setShake(false), 500);
             onBreak();
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
        <div
            className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#8040c0 0%,#5a1ea0 35%,#38086e 70%,#240550 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="coin">$</div>
                        <span className="num font-mono">{formatCommaNumber(Math.floor(balance || 0))}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="gem"></div>
                        <span className="num font-mono">{formatNumber(diamonds)}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-sm transition-all hover:bg-white/20 active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                >✕</button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-wider drop-shadow-md mb-1">Piggy Bank</h2>
                <p className="text-pink-200 text-xs font-bold mb-6">Saves 1% of every bet!</p>

                <div className={`relative flex items-center justify-center mb-6 transition-transform duration-300 ${isBreaking ? 'scale-110' : shake ? 'shake' : 'animate-bounce'}`}>
                    <div className="text-[8rem] filter drop-shadow-2xl leading-none">🐷</div>
                    {isBreaking && <div className="absolute text-5xl animate-ping">💥</div>}
                    {isFull && !isBreaking && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce shadow-lg">FULL!</div>
                    )}
                </div>

                <div className="bg-black/40 rounded-xl p-4 mb-6 w-full max-w-xs backdrop-blur-sm">
                    <div className="flex justify-between items-end mb-1 px-1">
                        <div className="text-pink-200 text-[9px] font-bold uppercase tracking-widest">Saved Amount</div>
                        <div className="text-pink-300 text-[8px] font-bold uppercase">Cap: {formatNumber(cap)}</div>
                    </div>
                    <div className="text-3xl font-mono font-black text-white drop-shadow-md truncate leading-none mb-3">
                        {formatCommaNumber(Math.floor(amount))}
                    </div>

                    <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden shadow-inner">
                        <div
                           className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}
                           style={{ width: `${Math.min(100, (amount / cap) * 100)}%` }}
                        ></div>
                    </div>
                    {isFull && (
                        <div className="text-red-300 text-[9px] font-bold mt-1 uppercase animate-pulse">Bank is Full! Break it to save more.</div>
                    )}
                </div>

                <button
                   onClick={handleBreakClick}
                   disabled={isBreaking}
                   className={`w-full max-w-xs py-3 font-black text-sm uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2
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
    );
};
