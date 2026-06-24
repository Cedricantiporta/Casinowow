
import React, { useState, useRef } from 'react';

interface ArcticPickGridProps {
    jackpotAmounts: number[];
    currentBet: number;
    onWin: (tier: string, amount: number) => void;
    rows: number;
    cols: number;
}

const TIERS = ['MINI', 'MINOR', 'MAJOR', 'MEGA', 'GRAND'] as const;
type Tier = typeof TIERS[number];

const TIER_COLOR: Record<Tier, string> = {
    MINI:  '#4ade80',
    MINOR: '#67e8f9',
    MAJOR: '#d8b4fe',
    MEGA:  '#fda4af',
    GRAND: '#fde68a',
};
const TIER_IMG: Record<Tier, string> = {
    MINI: '/mini.png', MINOR: '/minor.png', MAJOR: '/major.png', MEGA: '/mega.png', GRAND: '/grand.png',
};
const BET_MULTS: Record<Tier, number> = { MINI: 10, MINOR: 20, MAJOR: 40, MEGA: 60, GRAND: 100 };

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

export const ArcticPickGrid: React.FC<ArcticPickGridProps> = ({ currentBet, onWin, rows, cols }) => {
    const [winningTier] = useState<Tier>(rollWinningTier);

    const [cells, setCells] = useState<Cell[]>(() => {
        const tierList: Tier[] = [
            ...Array(11).fill(winningTier),
            ...TIERS.filter(t => t !== winningTier),
        ] as Tier[];
        return shuffle(tierList).map((tier, id) => ({ id, tier, state: 'hidden' as CellState }));
    });

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
            // Only winning tier has 11 cells — others cap at 1, so only winning tier can reach 2
            if ((counts[winningTier] || 0) >= 2 && !winFiredRef.current) {
                winFiredRef.current = true;
                setWonTier(winningTier);
                const amount = currentBet * BET_MULTS[winningTier];
                setTimeout(() => onWin(winningTier, amount), 900);
            }
            return next;
        });
    };

    // Always show 2 dots per tier — only winning tier has 11 cells so only it can reach 2
    const dotsFor = (_t: Tier) => 2;

    return (
        <div className="absolute inset-0 z-30 flex flex-col rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#001428,#00080f)' }}>

            {/* Progress dots row */}
            <div className="flex justify-around px-3 pt-1.5 pb-1 flex-shrink-0">
                {TIERS.map(tier => {
                    const count = Math.min(tierCounts[tier] || 0, dotsFor(tier));
                    const color = TIER_COLOR[tier];
                    const isWon = wonTier === tier;
                    return (
                        <div key={tier} className="flex flex-col items-center gap-0.5">
                            <div className="flex gap-1">
                                {Array(dotsFor(tier)).fill(null).map((_, i) => (
                                    <div key={i} className="transition-all duration-200" style={{
                                        width: 7, height: 7, borderRadius: 2,
                                        background: i < count ? color : 'rgba(255,255,255,0.12)',
                                        boxShadow: i < count ? `0 0 5px ${color}` : 'none',
                                    }} />
                                ))}
                            </div>
                            {isWon && (
                                <span className="animate-pop-in" style={{ fontSize: 'clamp(7px,1.2vw,9px)', color, fontWeight: 900, lineHeight: 1 }}>WIN!</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pick grid */}
            <div className="flex-1 min-h-0 px-1.5 pb-1.5" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: 5,
            }}>
                {cells.map(cell => {
                    const revealed = cell.state === 'revealed';
                    const color = TIER_COLOR[cell.tier];
                    const isWinCell = wonTier === cell.tier && revealed;
                    return (
                        <button
                            key={cell.id}
                            onClick={() => !revealed && !wonTier && handlePick(cell.id)}
                            disabled={revealed || !!wonTier}
                            className={isWinCell ? 'animate-bounce-sm' : ''}
                            style={{
                                borderRadius: 10,
                                border: 'none',
                                background: revealed ? 'rgba(255,255,255,0.04)' : 'radial-gradient(circle at 38% 30%, #003a5a, #00121e)',
                                cursor: revealed || wonTier ? 'default' : 'pointer',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 2,
                                transition: 'background 0.25s',
                                minHeight: 0,
                                boxShadow: isWinCell ? `0 0 16px ${color}88` : 'none',
                            }}>
                            {revealed ? (
                                <>
                                    <img src={TIER_IMG[cell.tier]} alt="" style={{ width: 'clamp(16px,3.2vw,26px)', height: 'clamp(16px,3.2vw,26px)', objectFit: 'contain', display: 'block' }} />
                                    <span style={{
                                        fontSize: 'clamp(7px,1.4vw,11px)',
                                        color,
                                        fontWeight: 900,
                                        letterSpacing: '0.05em',
                                        lineHeight: 1,
                                        textTransform: 'uppercase',
                                    }}>{cell.tier}</span>
                                </>
                            ) : (
                                <span style={{ fontSize: 'clamp(18px,3.5vw,30px)', lineHeight: 1 }}>🧊</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
