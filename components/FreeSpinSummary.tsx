import React, { useEffect } from 'react';
import { formatK } from '../constants';

interface FreeSpinSummaryProps {
    isOpen: boolean;
    totalWin: number;
    bet: number;
    onClose: () => void;
    label?: string;
}

export const FreeSpinSummary: React.FC<FreeSpinSummaryProps> = ({ isOpen, totalWin, bet, onClose, label = 'Free Spins Complete' }) => {

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => { onClose(); }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatted = formatK(totalWin);
    // Shrink font as the formatted number grows longer
    const amountFontSize = formatted.length <= 7 ? '2.25rem' : formatted.length <= 11 ? '1.75rem' : formatted.length <= 15 ? '1.375rem' : '1.125rem';
    // Widen the popup for very long numbers
    const popupWidth = formatted.length <= 10 ? '260px' : formatted.length <= 14 ? '320px' : '380px';

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-transparent pointer-events-auto animate-pop-in">
            {/* 3D container */}
            <div className="relative w-full mx-4" style={{ maxWidth: popupWidth }}>
                <div className="absolute inset-0 rounded-2xl" style={{ background: '#2e0660', transform: 'translateY(8px)', borderRadius: '16px' }}></div>
                <div className="relative rounded-2xl p-4 flex flex-col items-center text-center overflow-hidden"
                    style={{
                        background: 'linear-gradient(160deg,#9333ea 0%,#6d28d9 50%,#4c1d95 100%)',
                        border: '1.5px solid rgba(196,151,255,0.35)',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)',
                    }}>
                    <div className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.12),transparent)' }}></div>

                    <div className="text-[8px] font-black text-purple-200 uppercase tracking-[0.2em] mb-1 relative z-10">{label}</div>
                    <h2 className="text-lg font-black font-display mb-2 tracking-wider text-white drop-shadow relative z-10">TOTAL WIN</h2>

                    <div className="rounded-xl px-4 py-3 mb-4 w-full shadow-inner relative z-10 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="text-white font-mono font-black tracking-tighter whitespace-nowrap drop-shadow"
                            style={{ fontSize: amountFontSize, lineHeight: 1.1 }}>
                            {formatted}
                        </div>
                    </div>

                    <div className="text-purple-200 text-[9px] uppercase mb-4 font-bold tracking-widest relative z-10">Accumulated Coins</div>

                    <button
                        onClick={onClose}
                        className="px-6 py-1.5 text-white font-black text-xs uppercase tracking-widest rounded-lg cursor-pointer active:scale-95 transition-all relative z-10"
                        style={{ background: 'linear-gradient(180deg,#a855f7,#7c3aed)', boxShadow: '0 3px 0 #3b0764', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        COLLECT
                    </button>
                </div>
            </div>
        </div>
    );
};
