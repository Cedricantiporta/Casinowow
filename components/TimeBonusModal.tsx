
import React, { useEffect, useState } from 'react';
import { formatTime, formatCommaNumber } from '../constants';

interface TimeBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
    timers: { id: number; endTime: number; reward: number; label: string }[];
    onClaim: (id: number, reward: number) => void;
}

export const TimeBonusModal: React.FC<TimeBonusModalProps> = ({ isOpen, onClose, timers, onClaim }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getTimerColor = (id: number) => {
        // 0: Quick(Blue), 1: Super(Red), 2: Mega(Gold)
        if (id === 0) return { bg: 'bg-blue-900/40', text: 'text-blue-300', btn: 'bg-blue-600' };
        if (id === 1) return { bg: 'bg-red-900/40', text: 'text-red-300', btn: 'bg-red-600' };
        return { bg: 'bg-yellow-900/40', text: 'text-yellow-300', btn: 'bg-yellow-600' };
    };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in">
            <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(147,51,234,0.5)]"
                style={{ background: 'linear-gradient(160deg,#4c1d95,#3b0764,#2e1065)' }}>

                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

                <div className="relative z-10 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h2 className="text-base font-black text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Golden Treasury</h2>
                            <p className="text-purple-200 font-bold text-[10px] uppercase tracking-wide">Quick: 5min · Super: 15min · Mega: 1hr</p>
                        </div>
                        <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
                    </div>

                    <div className="flex gap-3 mt-3">
                        {timers.map((timer) => {
                            const timeLeft = Math.max(0, timer.endTime - currentTime);
                            const isReady = timeLeft === 0;
                            const colors = getTimerColor(timer.id);

                            return (
                                <div key={timer.id} className={`rounded-xl p-3 ${colors.bg} shadow-md flex flex-col items-center justify-between flex-1 relative overflow-hidden transition-all`}>
                                    {isReady && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-shine pointer-events-none"></div>}
                                    <div className={`text-[10px] font-black uppercase ${colors.text} tracking-widest bg-black/40 px-2 py-0.5 rounded-full mb-1`}>{timer.label}</div>
                                    <div className={`leading-none transition-transform duration-300 ${isReady ? 'scale-110 animate-bounce' : 'opacity-50 grayscale scale-90'}`}
                                        style={{ fontSize: '64px' }}>
                                        {timer.id === 0 ? '💎' : timer.id === 1 ? '🧧' : '👑'}
                                    </div>
                                    <div className="mt-2 w-full">
                                        <div className="text-base font-black text-white drop-shadow-md mb-2 font-mono text-center">
                                            {formatCommaNumber(timer.reward)}
                                        </div>
                                        <button
                                            onClick={() => isReady ? onClaim(timer.id, timer.reward) : null}
                                            disabled={!isReady}
                                            className={`w-full py-2 rounded-lg font-black uppercase text-xs tracking-wider shadow-md transition-all ${isReady ? `${colors.btn} text-white hover:scale-105 cursor-pointer` : 'bg-gray-800/80 text-gray-500 cursor-default'}`}
                                        >
                                            {isReady ? 'COLLECT' : formatTime(timeLeft)}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
