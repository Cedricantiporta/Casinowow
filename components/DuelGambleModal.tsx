import React, { useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { formatK } from '../constants';

interface Props {
    isOpen: boolean;
    amount: number;
    round: number;
    onResolve: (win: boolean) => void;
}

type Phase = 'draw' | 'result';

// Gold Rush — High Noon Duel. A short quick-draw beat resolves a 50/50
// double-or-nothing gamble on a mid-size base-game win.
export const DuelGambleModal: React.FC<Props> = ({ isOpen, amount, round, onResolve }) => {
    const [phase, setPhase] = useState<Phase>('draw');
    const [won, setWon] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setPhase('draw');
        audioService.playTick();
        const win = Math.random() < 0.5;
        const t = setTimeout(() => {
            setWon(win);
            setPhase('result');
            if (win) audioService.playWinBig(); else audioService.playStoneBreak();
        }, 1400);
        return () => clearTimeout(t);
    }, [isOpen, round]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="rounded-3xl overflow-hidden flex flex-col items-center px-7 py-7 mx-4"
                style={{
                    background: 'linear-gradient(180deg,#92400e 0%,#451a03 55%,#1c0a00 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,210,150,0.35), 0 8px 32px rgba(0,0,0,0.85)',
                    maxWidth: 300,
                }}>
                <span className="font-black text-amber-200/70" style={{ fontSize: 11 }}>High Noon Duel · Round {round}</span>

                {phase === 'draw' && (
                    <div className="flex flex-col items-center gap-2 mt-5 mb-1">
                        <i className="ti ti-target-arrow text-amber-300 animate-pulse" style={{ fontSize: 42 }} />
                        <span className="font-tanker text-white" style={{ fontSize: 18 }}>Drawing…</span>
                    </div>
                )}

                {phase === 'result' && (
                    <>
                        <div className="flex items-center gap-2 mt-4">
                            <i className={`ti ${won ? 'ti-trophy' : 'ti-skull'}`} style={{ fontSize: 32, color: won ? '#fbbf24' : '#f87171' }} />
                            <span className="font-tanker" style={{ fontSize: 26, color: won ? '#fbbf24' : '#f87171', textShadow: won ? '0 0 14px rgba(251,191,36,0.6)' : 'none' }}>
                                {won ? `+${formatK(amount)}` : `-${formatK(amount)}`}
                            </span>
                        </div>
                        <span className="font-bold text-white/55 mt-1" style={{ fontSize: 11 }}>
                            {won ? 'You won the duel!' : 'Outdrawn…'}
                        </span>
                        <button onClick={() => onResolve(won)} className="pill-green w-full mt-5">
                            <div className="pill-face" style={{ padding: '9px 12px', fontSize: '13px' }}>Continue</div>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
