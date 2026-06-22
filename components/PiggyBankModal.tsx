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
    onOpenGemShop?: () => void;
    eventPiggyBoost?: number;
}

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ isOpen, onClose, amount, diamonds, onBreak, level, maxBet = 0, balance = 0, onOpenGemShop, eventPiggyBoost = 0 }) => {
    const [breaking, setBreaking] = useState(false);

    if (!isOpen) return null;

    const cap = Math.floor(maxBet * 5 * (1 + eventPiggyBoost));

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
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none">
        <div className="w-full max-w-[440px] flex flex-col rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)', maxHeight: 'min(92%, 520px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <img src="/symbols/coin.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                        <span className="num font-mono">{formatK(Math.floor(balance || 0))}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <img src="/symbols/diamond.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
                        <span className="num font-mono">{diamonds}</span>
                        {onOpenGemShop && <button onClick={onOpenGemShop} className="pill-green" style={{ marginLeft: '2px' }}><div className="pill-face" style={{ padding: '2px 8px', fontSize: '9px' }}>Buy</div></button>}
                    </div>
                </div>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 gap-5">
                <h2 className="text-xl font-black text-white tracking-wider drop-shadow-md">Piggy Bank</h2>

                {/* Piggy icon */}
                <div className={`relative flex items-center justify-center transition-transform duration-300 ${breaking ? 'scale-110' : ''}`}>
                    <img src="/ui/piggy.png" alt="" style={{ width: '7rem', height: '7rem', objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(255,150,200,0.5))' }} />
                    {amount >= cap && cap > 0 && (
                        <div className="absolute -top-1 -right-2 pill-green pointer-events-none">
                            <div className="pill-face" style={{ padding: '3px 8px', fontSize: '9px', background: 'linear-gradient(180deg,#ef4444 0%,#b91c1c 50%,#991b1b 100%)' }}>Full</div>
                        </div>
                    )}
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
                    className="pill-green px-10"
                    style={{ opacity: (breaking || amount <= 0 || diamonds < GEM_BREAK_COST) ? 0.4 : 1 }}
                >
                    <div className="pill-face" style={{ padding: '10px 24px', fontSize: '13px', flexDirection: 'column', gap: '2px' }}>
                        <span>Break Piggy Bank</span>
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>
                            <img src="/symbols/diamond.png" alt="" style={{ width: '0.9em', height: '0.9em', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} /> {GEM_BREAK_COST} Gems
                        </span>
                    </div>
                </button>

                <p className="text-white/30 text-[9px] text-center max-w-xs">
                    Gains 5% of each bet (10% with VIP) · Max {formatK(Math.floor(cap))} coins
                </p>
                {eventPiggyBoost > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <i className="ti ti-calendar" style={{ fontSize: 11, color: '#f87171' }} />
                        <span style={{ color: '#f87171', fontSize: 10, fontWeight: 700 }}>Events: +{Math.round(eventPiggyBoost * 100)}% higher cap</span>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};
