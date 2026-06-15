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
    maxBet?: number;
    balance?: number;
}

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ isOpen, onClose, amount, diamonds, onBreak, level, maxBet = 0, balance = 0 }) => {
    const [breaking, setBreaking] = useState(false);

    if (!isOpen) return null;

    const cap = maxBet * 5;

    const GEM_BREAK_COST = 50;

    const handleBreak = () => {
        if (breaking || amount <= 0 || diamonds < GEM_BREAK_COST) return;
        setBreaking(true);
        audioService.playClick();
        setTimeout(() => {
            audioService.playStoneBreak();
            onBreak(amount, GEM_BREAK_COST);
            setTimeout(() => {
                setBreaking(false);
                onClose();
            }, 1200);
        }, 400);
    };

    return (
        <div
            className="absolute inset-0 z-[150] flex flex-col animate-pop-in select-none"
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
                </div>

                {/* Saved amount */}
                <div className="flex items-center gap-2">
                    <img src="/symbols/coin.png" alt="" style={{ width: '1.5rem', height: '1.5rem', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
                    <span className="text-2xl font-mono font-black text-white drop-shadow-md">{formatK(Math.floor(amount))}</span>
                </div>

                {/* Single break button */}
                <button
                    onClick={handleBreak}
                    disabled={breaking || amount <= 0 || diamonds < GEM_BREAK_COST}
                    className={`px-10 py-3.5 rounded-2xl font-black text-white uppercase text-base tracking-widest btn-3d transition-all
                        ${(breaking || amount <= 0 || diamonds < GEM_BREAK_COST) ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:scale-105'}`}
                    style={{
                        background: (amount > 0 && diamonds >= GEM_BREAK_COST) ? 'linear-gradient(180deg,#f59e0b,#b45309)' : 'rgba(0,0,0,0.4)',
                        boxShadow: (amount > 0 && diamonds >= GEM_BREAK_COST) ? '0 5px 0 #78350f, 0 8px 20px rgba(0,0,0,0.5)' : 'none',
                    }}
                >
                    Break Piggy Bank
                    <span className="block text-xs font-bold opacity-80 mt-0.5 normal-case tracking-normal flex items-center justify-center gap-1">
                        <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {GEM_BREAK_COST} Gems
                    </span>
                </button>

                <p className="text-white/30 text-[9px] text-center max-w-xs">
                    Gains 5% of each bet (10% with VIP) · Max {formatK(Math.floor(cap))} coins
                </p>
            </div>
        </div>
    );
};
