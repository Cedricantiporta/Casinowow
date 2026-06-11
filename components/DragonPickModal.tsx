import React, { useState, useRef } from 'react';
import { formatK } from '../constants';

interface DragonPickGridProps {
    jackpotAmounts: number[];
    currentBet: number;
    onWin: (tier: string, amount: number) => void;
    rows: number;
    cols: number;
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

const WINNING_WEIGHTS = [
    { tier: 'MINI'  as Tier, weight: 60 },
    { tier: 'MINOR' as Tier, weight: 25 },
    { tier: 'MAJOR' as Tier, weight: 10 },
    { tier: 'MEGA'  as Tier, weight: 4  },
    { tier: 'GRAND' as Tier, weight: 1  },
];

const rollWinningTier = (): Tier => {
    let r = Math.random() * 100;
    for (const { tier, weight } of WINNING_WEIGHTS) {
        r -= weight;
        if (r <= 0) return tier;
    }
    return 'MINI';
};

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

type CellState = 'hidden' | 'revealed';
interface Cell { id: number; tier: Tier; state: CellState; }

export const DragonPickGrid: React.FC<DragonPickGridProps> = ({ jackpotAmounts, currentBet, onWin, rows, cols }) => {
    const [winningTier] = useState<Tier>(rollWinningTier);
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
            if ((counts[winningTier] || 0) >= 3 && !winFiredRef.current) {
                winFiredRef.current = true;
                setWonTier(winningTier);
                const amount = jackpotAmounts[TIERS.indexOf(winningTier)] || currentBet * BET_MULTS[winningTier];
                setTimeout(() => onWin(winningTier, amount), 900);
            }
            return next;
        });
    };

    return (
        <div className="absolute inset-0 z-30 flex flex-col rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#0d0000,#1f0500)' }}>

            {/* Tier pips — emoji + 3 dots, no text labels */}
            <div className="flex justify-around px-3 pt-1.5 pb-1 flex-shrink-0">
                {TIERS.map(tier => {
                    const count = tierCounts[tier] || 0;
                    const c = TC[tier];
                    const isWon = wonTier === tier;
                    return (
                        <div key={tier} className="flex flex-col items-center gap-0.5"
                            style={{ opacity: count > 0 ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                            <span style={{ fontSize: 'clamp(9px,1.8vw,14px)', lineHeight: 1 }}>{ICONS[tier]}</span>
                            <div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="rounded-full" style={{
                                        width: 5, height: 5,
                                        background: i < count ? c.border : 'rgba(255,255,255,0.12)',
                                        boxShadow: i < count ? `0 0 4px ${c.glow}` : 'none',
                                        transition: 'background 0.2s, box-shadow 0.2s',
                                    }} />
                                ))}
                            </div>
                            {isWon && (
                                <span className="animate-pop-in" style={{ fontSize: 'clamp(6px,1.1vw,8px)', color: c.text, fontWeight: 900, lineHeight: 1 }}>
                                    WIN!
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pick grid */}
            <div className="flex-1 min-h-0 px-1 pb-1" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: 4,
            }}>
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
                                borderRadius: 8,
                                border: revealed ? `2px solid ${c.border}` : '2px solid rgba(180,40,0,0.55)',
                                background: revealed ? c.bg : 'radial-gradient(circle at 38% 30%, #5a2200, #1e0800)',
                                boxShadow: isWinCell
                                    ? `0 0 16px ${c.glow}, inset 0 0 8px ${c.glow}`
                                    : revealed ? `0 0 8px ${c.glow}` : '0 2px 5px rgba(0,0,0,0.7)',
                                cursor: revealed || wonTier ? 'default' : 'pointer',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
                                minHeight: 0,
                            }}>
                            {revealed ? (
                                <>
                                    <span style={{ fontSize: 'clamp(11px,2.2vw,18px)', lineHeight: 1 }}>{ICONS[cell.tier]}</span>
                                    <span style={{ fontSize: 'clamp(5px,0.9vw,7px)', color: c.text, fontWeight: 900, marginTop: 1, letterSpacing: '0.04em', lineHeight: 1 }}>
                                        {formatK(jackpotAmounts[TIERS.indexOf(cell.tier)] || currentBet * BET_MULTS[cell.tier])}
                                    </span>
                                </>
                            ) : (
                                <span style={{ fontSize: 'clamp(13px,2.5vw,20px)', lineHeight: 1 }}>🪙</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
