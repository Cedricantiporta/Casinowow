
import React, { useEffect, useState } from 'react';
import { formatTime, formatCommaNumber } from '../constants';
import { JackpotRouletteModal } from './JackpotRouletteModal';

interface TimeBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
    timers: { id: number; endTime: number; reward: number; label: string }[];
    onClaim: (id: number, reward: number) => void;
    jackpotLastTime?: number;
    jackpotBaseAmount?: number;
    onJackpotClaim?: (amount: number) => void;
}

const JACKPOT_COOLDOWN = 3 * 60 * 60 * 1000; // 3 hours

export const TimeBonusModal: React.FC<TimeBonusModalProps> = ({ isOpen, onClose, timers, onClaim, jackpotLastTime = 0, jackpotBaseAmount = 0, onJackpotClaim }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [showRoulette, setShowRoulette] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    useEffect(() => { if (!isOpen) setShowRoulette(false); }, [isOpen]);

    if (!isOpen) return null;

    const jackpotRemaining = Math.max(0, JACKPOT_COOLDOWN - (currentTime - jackpotLastTime));
    const jackpotReady = jackpotRemaining === 0;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none">
        <div className="w-full max-w-[560px] flex flex-col rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center px-4 py-2.5 relative">
                <span className="absolute left-0 right-0 text-center text-white font-tanker text-base pointer-events-none">Golden Treasury</span>
                <div className="ml-auto round-btn cursor-pointer shrink-0 z-10" onClick={onClose}><i className="ti ti-x"></i></div>
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
                            <div className="text-sm font-black text-white text-center drop-shadow-md">{formatCommaNumber(timer.reward)}</div>
                            <button
                                onClick={() => isReady ? onClaim(timer.id, timer.reward) : undefined}
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

                {/* Jackpot roulette tile — playable every 3 hours */}
                <div className="tcard flex flex-col items-center flex-1 gap-2 p-3">
                    <div className={`transition-all duration-300 flex items-center justify-center ${jackpotReady ? 'scale-105' : 'brightness-50 grayscale'}`} style={{ width: 72, height: 72 }}>
                        <img src="/symbols/neon_bonus.png" alt=""
                            style={{ width: 72, height: 72, objectFit: 'contain', filter: jackpotReady ? 'drop-shadow(0 0 10px rgba(251,191,36,0.8))' : undefined }} />
                    </div>
                    <div className="text-[10px] font-black text-yellow-200/90 tracking-wider text-center">Jackpot</div>
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
        </div>

        {/* Jackpot roulette — outside overflow-hidden card so it can fill the screen */}
        <JackpotRouletteModal
            isOpen={showRoulette}
            baseAmount={jackpotBaseAmount}
            onClose={() => setShowRoulette(false)}
            onClaim={(amount) => { onJackpotClaim?.(amount); setShowRoulette(false); }}
        />
        </div>
    );
};
