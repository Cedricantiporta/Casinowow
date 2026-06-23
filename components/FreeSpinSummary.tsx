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
            const timer = setTimeout(() => { onClose(); }, 6000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatted = formatK(totalWin);
    const amountFontSize = formatted.length <= 7 ? '2.25rem' : formatted.length <= 11 ? '1.75rem' : formatted.length <= 15 ? '1.375rem' : '1.125rem';

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-pop-in pointer-events-auto">
            <div className="flex flex-col items-center gap-4 rounded-2xl px-8 py-6 mx-4 w-full max-w-xs text-center"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}>
                {/* Label */}
                <span style={{ fontSize: 9, fontWeight: 900, color: '#c8a8ff', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</span>

                {/* Total Win heading */}
                <span style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: -8 }}>Total Win</span>

                {/* Amount */}
                <div className="w-full rounded-xl px-4 py-3 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.55)' }}>
                    <span className="font-black text-white font-mono whitespace-nowrap"
                        style={{ fontSize: amountFontSize, lineHeight: 1.1, textShadow: '0 0 12px rgba(200,120,255,0.5)' }}>
                        {formatted}
                    </span>
                </div>

                <span style={{ fontSize: 8, fontWeight: 700, color: '#c8a8ff', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: -8 }}>Accumulated Coins</span>

                <button onClick={onClose} className="pill-green">
                    <div className="pill-face" style={{ padding: '8px 32px', fontSize: '11px' }}>Collect</div>
                </button>
            </div>
        </div>
    );
};
