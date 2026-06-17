
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

    const getBtnStyle = (id: number, isReady: boolean) => {
        if (!isReady) return { background: 'rgba(0,0,0,0.4)', color: '#555', boxShadow: 'none', cursor: 'default' as const };
        if (id === 0) return { background: 'linear-gradient(180deg,#5fa8ff,#2b7fe8)', boxShadow: '0 3px 0 #13408a', color: '#fff', cursor: 'pointer' as const };
        if (id === 1) return { background: 'linear-gradient(180deg,#ff5a5a,#c81010)', boxShadow: '0 3px 0 #8a0000', color: '#fff', cursor: 'pointer' as const };
        return { background: 'linear-gradient(180deg,#ffe066,#d48800)', boxShadow: '0 3px 0 #7a5000', color: '#000', cursor: 'pointer' as const };
    };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in">
            <div className="relative w-full max-w-[520px] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(147,51,234,0.5)]"
                style={{ background: 'linear-gradient(160deg,#4c1d95,#3b0764,#2e1065)' }}>

                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

                <div className="relative z-10 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-black text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Golden Treasury</h2>
                        <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
                    </div>

                    <div className="flex gap-4 mt-3">
                        {timers.map((timer) => {
                            const timeLeft = Math.max(0, timer.endTime - currentTime);
                            const isReady = timeLeft === 0;

                            return (
                                <div key={timer.id} className="flex flex-col items-center flex-1 gap-2">
                                    <div className={`transition-all duration-300 ${isReady ? 'scale-105' : 'opacity-50 grayscale'}`}>
                                        <img
                                            src={timer.id === 0 ? '/ui/double.png' : timer.id === 1 ? '/ui/roller.png' : '/ui/jackpot.png'}
                                            alt=""
                                            style={{ width: '128px', height: '128px', objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="text-[11px] font-black text-white/80 uppercase tracking-wider text-center">{timer.label}</div>
                                    <div className="text-sm font-black text-white text-center drop-shadow-md">{formatCommaNumber(timer.reward)}</div>
                                    <button
                                        onClick={() => isReady ? onClaim(timer.id, timer.reward) : undefined}
                                        disabled={!isReady}
                                        className="btn-3d w-full py-1.5 rounded-xl font-black uppercase text-xs tracking-wider"
                                        style={getBtnStyle(timer.id, isReady)}
                                    >
                                        {isReady ? 'Collect' : formatTime(timeLeft)}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
