
import React, { useEffect, useState } from 'react';
import { formatTime, formatCommaNumber } from '../constants';
import { JackpotRouletteModal } from './JackpotRouletteModal';

interface TimeBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
    timers: { id: number; endTime: number; reward: number; label: string }[];
    onClaim: (id: number, reward: number) => void;
    collectMultiplier?: number;
    multProgress?: number;
    jackpotLastTime?: number;
    jackpotBaseAmount?: number;
    onJackpotClaim?: (amount: number) => void;
}

const JACKPOT_COOLDOWN = 3 * 60 * 60 * 1000; // 3 hours

// Multiplier tiers — 50 qualifying spins per step
const MULT_TIERS = [
    { mult: 1,  at: 0   },
    { mult: 2,  at: 50  },
    { mult: 3,  at: 150 },
    { mult: 4,  at: 300 },
    { mult: 5,  at: 500 },
    { mult: 10, at: 750 },
];

export const TimeBonusModal: React.FC<TimeBonusModalProps> = ({
    isOpen, onClose, timers, onClaim,
    collectMultiplier = 1, multProgress = 0,
    jackpotLastTime = 0, jackpotBaseAmount = 0, onJackpotClaim,
}) => {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [showRoulette, setShowRoulette] = useState(false);
    const [pendingClaim, setPendingClaim] = useState<{ id: number; reward: number } | null>(null);

    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) { setShowRoulette(false); setPendingClaim(null); }
    }, [isOpen]);

    if (!isOpen) return null;

    const jackpotRemaining = Math.max(0, JACKPOT_COOLDOWN - (currentTime - jackpotLastTime));
    const jackpotReady = jackpotRemaining === 0;

    const curIdx = MULT_TIERS.reduce((acc, t, i) => (multProgress >= t.at ? i : acc), 0);
    const nextTier = MULT_TIERS[curIdx + 1];
    const tierStart = MULT_TIERS[curIdx].at;
    const tierProgress = nextTier
        ? Math.min(1, (multProgress - tierStart) / (nextTier.at - tierStart))
        : 1;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none">
        <div className="w-full max-w-[560px] flex flex-col rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center px-4 py-2.5 relative gap-2">
                {/* Collect multiplier progress */}
                <div className="flex items-center gap-1.5 z-10 shrink-0">
                    <div className="relative flex items-center justify-center shrink-0" style={{ width: 34, height: 34 }}>
                        <img src="/ui/exp_multiplier.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,1)', marginTop: '-2px' }}>{collectMultiplier}X</span>
                    </div>
                    <div className="relative shrink-0" style={{ width: 56, height: 10, borderRadius: 8, background: 'rgba(0,0,0,0.4)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${tierProgress * 100}%`, borderRadius: 8, background: 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)', transition: 'width 0.4s ease', overflow: 'hidden' }}>
                            <div className="absolute inset-y-0 w-3 bg-white/40 skew-x-[-20deg] animate-xp-bar-shine pointer-events-none" />
                        </div>
                    </div>
                    <div className="relative flex items-center justify-center shrink-0" style={{ width: 34, height: 34, opacity: nextTier ? 1 : 0.5 }}>
                        <img src="/ui/exp_multiplier.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5 }} />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,1)', marginTop: '-2px' }}>{nextTier ? `${nextTier.mult}X` : 'MAX'}</span>
                    </div>
                </div>
                <span className="absolute left-0 right-0 text-center text-white font-tanker text-base pointer-events-none">Golden Treasury</span>
                {(() => {
                    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
                    const resetMs = Math.max(0, midnight.getTime() - currentTime);
                    const rH = Math.floor(resetMs / 3600000);
                    const rM = Math.floor((resetMs % 3600000) / 60000);
                    return (
                        <div className="ml-auto flex items-center gap-1 shrink-0 z-10">
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>Resets {rH}h {rM}m</span>
                            <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
                        </div>
                    );
                })()}
            </div>

            {/* Body */}
            <div className="flex gap-2.5 px-4 pb-5 pt-1">
                {timers.map((timer) => {
                    const timeLeft = Math.max(0, timer.endTime - currentTime);
                    const isReady = timeLeft === 0;

                    return (
                        <div key={timer.id} className="tcard flex flex-col items-center flex-1 gap-2 p-3">
                            <div className={`transition-all duration-300 ${isReady ? 'scale-105' : 'brightness-50 grayscale'}`}>
                                <img
                                    src={timer.id === 0 ? '/ui/double.png' : timer.id === 1 ? '/ui/roller.png' : '/ui/jackpot.png'}
                                    alt=""
                                    style={{ width: '72px', height: '72px', objectFit: 'contain' }}
                                />
                            </div>
                            <div className="text-[10px] font-black text-white/80 tracking-wider text-center">{timer.label}</div>
                            {/* Raw base amount — multiplier applied at claim popup */}
                            <div className="text-sm font-black text-white text-center drop-shadow-md">{formatCommaNumber(timer.reward)}</div>
                            <button
                                onClick={() => isReady ? setPendingClaim({ id: timer.id, reward: timer.reward }) : undefined}
                                disabled={!isReady}
                                className={`pill-green w-full ${!isReady ? 'opacity-40' : ''}`}
                            >
                                <div className="pill-face" style={{ padding: '6px 10px', fontSize: '10px' }}>
                                    {isReady ? 'Collect' : formatTime(timeLeft)}
                                </div>
                            </button>
                        </div>
                    );
                })}

                {/* Jackpot roulette tile */}
                <div className={`${jackpotReady ? 'tcard-goldpurple' : 'tcard'} flex flex-col items-center flex-1 gap-2 p-3`}>
                    <div className={`transition-all duration-300 flex items-center justify-center ${jackpotReady ? 'scale-105' : 'brightness-50 grayscale'}`} style={{ width: 72, height: 72 }}>
                        <img src="/symbols/neon_bonus.png" alt=""
                            style={{ width: 72, height: 72, objectFit: 'contain', filter: jackpotReady ? 'drop-shadow(0 0 10px rgba(251,191,36,0.8))' : undefined }} />
                    </div>
                    <div className="text-[10px] font-black text-yellow-200/90 tracking-wider text-center">Jackpot</div>
                    {/* jackpotBaseAmount already includes collect multiplier from App.tsx */}
                    <div className="text-sm font-black text-white text-center drop-shadow-md">{formatCommaNumber(jackpotBaseAmount)}</div>
                    <button
                        onClick={() => jackpotReady && setShowRoulette(true)}
                        disabled={!jackpotReady}
                        className={`pill-green w-full ${!jackpotReady ? 'opacity-40' : ''}`}
                    >
                        <div className="pill-face" style={{ padding: '6px 10px', fontSize: '10px' }}>
                            {jackpotReady ? 'Play' : formatTime(jackpotRemaining)}
                        </div>
                    </button>
                </div>
            </div>

            {/* Claim popup — standard modal: base + multiplier on one row, total, claim */}
            {pendingClaim && (
                <div
                    className="absolute inset-0 z-[10] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in"
                    onClick={() => setPendingClaim(null)}>
                    <div
                        className="rounded-3xl overflow-hidden flex flex-col items-center gap-2.5 px-6 py-5"
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>
                        {/* Base amount + multiplier on the same row */}
                        <div className="flex items-center gap-3">
                            <span className="font-black text-white" style={{ fontSize: 24, lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{formatCommaNumber(pendingClaim.reward)}</span>
                            {collectMultiplier > 1 && (
                                <div className="flex items-center gap-1">
                                    <img src="/ui/exp_multiplier.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                                    <span className="font-black text-amber-300" style={{ fontSize: 22, lineHeight: 1 }}>{collectMultiplier}×</span>
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        {collectMultiplier > 1 && (
                            <div className="font-black text-white" style={{ fontSize: 32, lineHeight: 1, textShadow: '0 0 16px rgba(251,191,36,0.6)' }}>
                                {formatCommaNumber(Math.floor(pendingClaim.reward * collectMultiplier))}
                            </div>
                        )}

                        <button
                            className="pill-green w-full"
                            onClick={() => { onClaim(pendingClaim.id, pendingClaim.reward); setPendingClaim(null); }}>
                            <div className="pill-face" style={{ padding: '8px 24px', fontSize: '12px' }}>Claim</div>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Jackpot roulette — outside overflow-hidden card so it can fill the screen */}
        <JackpotRouletteModal
            isOpen={showRoulette}
            baseAmount={jackpotBaseAmount}
            collectMultiplier={collectMultiplier}
            onClose={() => setShowRoulette(false)}
            onClaim={(amount) => { onJackpotClaim?.(amount); setShowRoulette(false); }}
        />
        </div>
    );
};
