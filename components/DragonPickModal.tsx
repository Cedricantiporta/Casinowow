import React, { useState, useRef } from 'react';
import { formatK } from '../constants';

interface DragonPickModalProps {
    jackpotAmounts: number[];   // [MINI, MINOR, MAJOR, MEGA, GRAND]
    currentBet: number;
    onWin: (tier: string, amount: number) => void;
}

const TIERS = ['MINI', 'MINOR', 'MAJOR', 'MEGA', 'GRAND'] as const;
type Tier = typeof TIERS[number];

const TC: Record<Tier, { border: string; bg: string; text: string; glow: string }> = {
    MINI:  { border: '#22c55e', bg: '#031a09', text: '#4ade80', glow: 'rgba(34,197,94,0.55)' },
    MINOR: { border: '#22d3ee', bg: '#011c26', text: '#67e8f9', glow: 'rgba(34,211,238,0.55)' },
    MAJOR: { border: '#a855f7', bg: '#130024', text: '#d8b4fe', glow: 'rgba(168,85,247,0.55)' },
    MEGA:  { border: '#f43f5e', bg: '#200010', text: '#fda4af', glow: 'rgba(244,63,94,0.55)' },
    GRAND: { border: '#fbbf24', bg: '#1c0e00', text: '#fde68a', glow: 'rgba(251,191,36,0.55)' },
};
const ICONS: Record<Tier, string> = { MINI: '🥉', MINOR: '🥈', MAJOR: '🥇', MEGA: '👑', GRAND: '🏆' };
const BET_MULTS: Record<Tier, number> = { MINI: 10, MINOR: 20, MAJOR: 30, MEGA: 50, GRAND: 100 };

type CellState = 'hidden' | 'revealed';
interface Cell { id: number; tier: Tier; state: CellState; }

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export const DragonPickModal: React.FC<DragonPickModalProps> = ({ jackpotAmounts, currentBet, onWin }) => {
    const [cells, setCells] = useState<Cell[]>(() =>
        shuffle(TIERS.flatMap(t => [t, t, t])).map((tier, id) => ({ id, tier, state: 'hidden' as CellState }))
    );
    const [tierCounts, setTierCounts] = useState<Partial<Record<Tier, number>>>({});
    const [wonTier, setWonTier] = useState<Tier | null>(null);
    const winFiredRef = useRef(false);

    const handlePick = (id: number) => {
        if (wonTier) return;
        setCells(prev => {
            const next = prev.map(c => c.id === id ? { ...c, state: 'revealed' as CellState } : c);
            const counts: Partial<Record<Tier, number>> = {};
            next.forEach(c => { if (c.state === 'revealed') counts[c.tier] = (counts[c.tier] || 0) + 1; });
            setTierCounts(counts);
            const winner = (Object.entries(counts) as [Tier, number][]).find(([, v]) => v >= 3)?.[0];
            if (winner && !winFiredRef.current) {
                winFiredRef.current = true;
                setWonTier(winner);
                const amount = jackpotAmounts[TIERS.indexOf(winner)] || currentBet * BET_MULTS[winner];
                setTimeout(() => onWin(winner, amount), 900);
            }
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)' }}>
            <div className="relative flex flex-col items-center gap-3 rounded-2xl p-5"
                style={{ background: 'linear-gradient(160deg,#1a0000,#380000)', border: '2px solid rgba(180,30,0,0.6)', boxShadow: '0 16px 48px rgba(0,0,0,0.95)', width: 'min(92vw,480px)' }}>

                {/* Header */}
                <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 'clamp(16px,4.5vw,26px)', color: '#fde68a', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    🐉 PICK &amp; WIN 🐉
                </div>
                <div style={{ fontSize: 'clamp(8px,1.8vw,11px)', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Collect 3 matching jackpot symbols to win
                </div>

                {/* Tier progress pips */}
                <div className="flex gap-3 flex-wrap justify-center">
                    {TIERS.map(tier => {
                        const count = tierCounts[tier] || 0;
                        const c = TC[tier];
                        const isWon = wonTier === tier;
                        return (
                            <div key={tier} className="flex flex-col items-center gap-1" style={{ opacity: count > 0 ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                                <span style={{ fontSize: 'clamp(7px,1.4vw,10px)', color: c.text, fontWeight: 900, letterSpacing: '0.08em' }}>{tier}</span>
                                <div className="flex gap-0.5">
                                    {[0,1,2].map(i => (
                                        <div key={i} className="rounded-full" style={{
                                            width: 7, height: 7,
                                            background: i < count ? c.border : 'rgba(255,255,255,0.1)',
                                            boxShadow: i < count ? `0 0 6px ${c.glow}` : 'none',
                                            transition: 'background 0.2s, box-shadow 0.2s',
                                        }} />
                                    ))}
                                </div>
                                {isWon && (
                                    <span className="animate-pop-in" style={{ fontSize: 'clamp(7px,1.3vw,9px)', color: c.text, fontWeight: 900 }}>WIN!</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 5-column grid of 15 cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, width: '100%' }}>
                    {cells.map(cell => {
                        const revealed = cell.state === 'revealed';
                        const c = TC[cell.tier];
                        const isWinCell = wonTier === cell.tier && revealed;
                        return (
                            <button
                                key={cell.id}
                                onClick={() => !revealed && !wonTier && handlePick(cell.id)}
                                disabled={revealed || !!wonTier}
                                className={isWinCell ? 'animate-bounce-sm' : ''}
                                style={{
                                    aspectRatio: '1',
                                    borderRadius: 10,
                                    border: revealed ? `2px solid ${c.border}` : '2px solid rgba(180,80,0,0.7)',
                                    background: revealed ? c.bg : 'radial-gradient(circle at 38% 32%, #6a3800, #2a1200)',
                                    boxShadow: revealed ? `0 0 14px ${c.glow}` : '0 2px 6px rgba(0,0,0,0.7)',
                                    cursor: revealed || wonTier ? 'default' : 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
                                }}>
                                {revealed ? (
                                    <>
                                        <span style={{ fontSize: 'clamp(14px,3.2vw,22px)', lineHeight: 1 }}>{ICONS[cell.tier]}</span>
                                        <span style={{ fontSize: 'clamp(5px,1.2vw,8px)', color: c.text, fontWeight: 900, marginTop: 2, letterSpacing: '0.05em' }}>{cell.tier}</span>
                                        {cell.tier && (
                                            <span style={{ fontSize: 'clamp(5px,1vw,7px)', color: c.text, opacity: 0.7 }}>
                                                {formatK(jackpotAmounts[TIERS.indexOf(cell.tier)] || currentBet * BET_MULTS[cell.tier])}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ fontSize: 'clamp(16px,3.5vw,26px)' }}>🪙</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {wonTier ? (
                    <div className="animate-pop-in flex flex-col items-center gap-1 mt-1">
                        <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 'clamp(14px,3.5vw,20px)', color: TC[wonTier].text, textShadow: `0 0 16px ${TC[wonTier].glow}` }}>
                            {ICONS[wonTier]} {wonTier} JACKPOT!
                        </div>
                        <div style={{ fontSize: 'clamp(11px,2.5vw,16px)', color: TC[wonTier].text, fontWeight: 900 }}>
                            +{formatK(jackpotAmounts[TIERS.indexOf(wonTier)] || currentBet * BET_MULTS[wonTier])}
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: 'clamp(8px,1.5vw,10px)', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Tap a coin to reveal
                    </div>
                )}
            </div>
        </div>
    );
};
