import React, { useState } from 'react';
import { formatCommaNumber, formatK } from '../constants';
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

const TIERS = [
    { label: 'Quick',  pct: 0.30, gemCost: 10,  color: 'from-cyan-500 to-blue-700',     shadow: '#1e3a5f' },
    { label: 'Normal', pct: 1.00, gemCost: 30,  color: 'from-green-500 to-emerald-700', shadow: '#064e3b' },
    { label: 'Mega',   pct: 1.50, gemCost: 75,  color: 'from-yellow-500 to-amber-700',  shadow: '#78350f' },
];

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ isOpen, onClose, amount, diamonds, onBreak, level, maxBet, balance = 0 }) => {
    const [breaking, setBreaking] = useState(false);

    if (!isOpen) return null;

    const cap = maxBet * 2;
    const isFull = amount >= cap;

    const handleTierBreak = (tierAmount: number, gemCost: number) => {
        if (breaking) return;
        setBreaking(true);
        audioService.playClick();
        setTimeout(() => {
            audioService.playStoneBreak();
            onBreak(tierAmount, gemCost);
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
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 gap-4">
                <h2 className="text-xl font-black text-white uppercase tracking-wider drop-shadow-md">Golden Treasury</h2>

                {/* Piggy */}
                <div className={`relative flex items-center justify-center transition-transform duration-300 ${breaking ? 'scale-110' : 'animate-bounce'}`}>
                    <div className="text-[7rem] filter drop-shadow-2xl leading-none">🐷</div>
                    {breaking && <div className="absolute text-5xl animate-ping">💥</div>}
                    {isFull && !breaking && (
                        <div className="absolute -top-2 -right-2 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg" style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>FULL!</div>
                    )}
                </div>

                {/* Saved amount + progress */}
                <div className="flex flex-col items-center w-full max-w-xs gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🪙</span>
                        <span className="text-2xl font-mono font-black text-white drop-shadow-md">{formatK(Math.floor(amount))}</span>
                    </div>
                    <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}
                            style={{ width: `${Math.min(100, (amount / cap) * 100)}%` }}
                        />
                    </div>
                    {isFull && (
                        <div className="text-red-300 text-[9px] font-bold uppercase animate-pulse">Treasury Full! Break it to save more.</div>
                    )}
                </div>

                {/* Break tiers */}
                <div className="flex gap-3 w-full max-w-sm">
                    {TIERS.map(tier => {
                        const tierAmount = Math.floor(maxBet * tier.pct);
                        const canBreak = diamonds >= tier.gemCost && amount >= tierAmount && !breaking;
                        return (
                            <button
                                key={tier.label}
                                onClick={() => canBreak && handleTierBreak(tierAmount, tier.gemCost)}
                                disabled={!canBreak}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider btn-3d transition-all
                                    ${canBreak ? 'active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
                                style={{
                                    background: canBreak ? `linear-gradient(180deg,var(--tw-gradient-stops))` : 'rgba(0,0,0,0.4)',
                                    boxShadow: canBreak ? `0 4px 0 ${tier.shadow}` : 'none',
                                }}
                            >
                                <span className="text-white text-[10px]">{tier.label}</span>
                                <span className="text-white font-black text-[11px]">{formatK(tierAmount)}</span>
                                <span className="text-white/80 text-[9px] flex items-center gap-0.5">
                                    {tier.gemCost} 💎
                                </span>
                            </button>
                        );
                    })}
                </div>

                <p className="text-white/40 text-[9px] text-center max-w-xs">
                    Accumulate coins as you spin. Break the treasury to collect.
                </p>
            </div>
        </div>
    );
};
