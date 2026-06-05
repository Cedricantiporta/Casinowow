import React, { useState } from 'react';
import { formatK } from '../constants';
import { audioService } from '../services/audioService';

interface PiggyBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    diamonds: number;
    onBreak: (tierAmount: number, gemCost: number) => void;
    level: number;
    maxBet: number;
    balance?: number;
}

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ isOpen, onClose, amount, diamonds, onBreak, level, maxBet, balance = 0 }) => {
    const [breaking, setBreaking] = useState(false);

    if (!isOpen) return null;

    const cap = maxBet * 5;
    const isFull = amount >= cap;
    const pct = Math.min(100, (amount / cap) * 100);

    const handleBreak = () => {
        if (breaking || amount <= 0) return;
        setBreaking(true);
        audioService.playClick();
        setTimeout(() => {
            audioService.playStoneBreak();
            onBreak(amount, 0);
            setTimeout(() => {
                setBreaking(false);
                onClose();
            }, 1200);
        }, 400);
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
                        <span className="num font-mono">{formatK(Math.floor(balance || 0))}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="gem"></div>
                        <span className="num font-mono">{diamonds}</span>
                    </div>
                </div>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 gap-5">
                <h2 className="text-xl font-black text-white uppercase tracking-wider drop-shadow-md">Piggy Bank</h2>

                {/* Piggy icon */}
                <div className={`relative flex items-center justify-center transition-transform duration-300 ${breaking ? 'scale-110' : ''}`}>
                    <div className="text-[7rem] filter drop-shadow-2xl leading-none">🐷</div>
                    {breaking && <div className="absolute text-5xl animate-ping">💥</div>}
                    {isFull && !breaking && (
                        <div className="absolute -top-2 -right-2 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg uppercase"
                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>FULL</div>
                    )}
                </div>

                {/* Saved amount + progress */}
                <div className="flex flex-col items-center w-full max-w-xs gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🪙</span>
                        <span className="text-2xl font-mono font-black text-white drop-shadow-md">{formatK(Math.floor(amount))}</span>
                    </div>
                    <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="text-white/40 text-[9px] font-bold">
                        {formatK(Math.floor(amount))} / {formatK(Math.floor(cap))} · {Math.round(pct)}%
                    </div>
                    {isFull && (
                        <div className="text-red-300 text-[9px] font-bold uppercase">Piggy Bank Full! Break it to save more.</div>
                    )}
                </div>

                {/* Single break button */}
                <button
                    onClick={handleBreak}
                    disabled={breaking || amount <= 0}
                    className={`px-10 py-3.5 rounded-2xl font-black text-white uppercase text-base tracking-widest btn-3d transition-all
                        ${(breaking || amount <= 0) ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:scale-105'}`}
                    style={{
                        background: amount > 0 ? 'linear-gradient(180deg,#f59e0b,#b45309)' : 'rgba(0,0,0,0.4)',
                        boxShadow: amount > 0 ? '0 5px 0 #78350f, 0 8px 20px rgba(0,0,0,0.5)' : 'none',
                    }}
                >
                    💥 Break Piggy Bank
                </button>

                <p className="text-white/30 text-[9px] text-center max-w-xs">
                    Earn up to {formatK(Math.floor(cap))} coins · Max is 5× your current max bet
                </p>
            </div>
        </div>
    );
};
