import React, { useEffect, useRef } from 'react';

interface FreeSpinsWonPopupProps {
    isOpen: boolean;
    count: number;
    onComplete: () => void;
}

export const FreeSpinsWonPopup: React.FC<FreeSpinsWonPopupProps> = ({ isOpen, count, onComplete }) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                onComplete();
            }, 2000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isOpen, onComplete]);

    const handleStartNow = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        onComplete();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 animate-pop-in">
            {/* 3D container — offset bottom layer for thickness */}
            <div className="relative">
                <div className="absolute inset-0 rounded-2xl" style={{ background: '#2e0660', transform: 'translateY(7px)', borderRadius: '16px' }}></div>
                <div className="relative rounded-2xl overflow-hidden flex flex-col items-center text-center px-8 py-6 min-w-[220px]"
                    style={{
                        background: 'linear-gradient(160deg,#9333ea 0%,#6d28d9 50%,#4c1d95 100%)',
                        border: '1.5px solid rgba(196,151,255,0.4)',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25)',
                    }}>
                    {/* Shine overlay */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.15),transparent)' }}></div>

                    <h2 className="relative z-10 text-sm font-black text-purple-100 uppercase tracking-widest mb-1 drop-shadow">
                        YOU WON FREE
                    </h2>
                    <div className="relative z-10 text-6xl font-black font-display text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] my-2 animate-bounce">
                        {count}
                    </div>
                    <div className="relative z-10 text-sm font-black text-purple-100 uppercase tracking-[0.3em] drop-shadow mb-4">
                        SPINS
                    </div>
                    <button
                        onClick={handleStartNow}
                        className="relative z-10 px-6 py-1.5 text-white font-black uppercase text-xs tracking-widest rounded-lg active:scale-95 transition-transform"
                        style={{ background: 'linear-gradient(180deg,#a855f7,#7c3aed)', boxShadow: '0 3px 0 #3b0764', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        Start Now
                    </button>
                </div>
            </div>
        </div>
    );
};
