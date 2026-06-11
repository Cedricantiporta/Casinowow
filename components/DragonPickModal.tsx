import React, { useState, useRef } from 'react';

interface DragonPickGridProps {
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

export const DragonPickGrid: React.FC<DragonPickGridProps> = ({ currentBet, onWin, rows, cols }) => {
    const [winningTier] = useState<Tier>(rollWinningTier);

    // Winning tier: 7 cells (player collects 3 of 7 to win)
    // Other tiers: 2 cells each (max out at 2/3 — near-miss, can never win)
    // Total: 7 + 4×2 = 15 cells = 3×5 grid
    const [cells, setCells] = useState<Cell[]>(() => {
        const tierList: Tier[] = [
            ...Array(7).fill(winningTier),
            ...TIERS.filter(t => t !== winningTier).flatMap(t => [t, t]),
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
            // Only winning tier has 7 cells — others cap at 2, so only winning tier can reach 3
            if ((counts[winningTier] || 0) >= 3 && !winFiredRef.current) {
                winFiredRef.current = true;
                setWonTier(winningTier);
                const amount = currentBet * BET_MULTS[winningTier];
                setTimeout(() => onWin(winningTier, amount), 900);
            }
            return next;
        });
    };

    // Dots to show per tier: 3 for winning tier, 2 for others (matches their cell count)
    const dotsFor = (t: Tier) => t === winningTier ? 3 : 2;

    return (
        <div className="absolute inset-0 z-30 flex flex-col rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#0d0000,#1f0500)' }}>

            {/* Progress dots row — compact, no labels */}
            <div className="flex justify-around px-3 pt-1.5 pb-1 flex-shrink-0">
                {TIERS.map(tier => {
                    const count = Math.min(tierCounts[tier] || 0, dotsFor(tier));
                    const color = TIER_COLOR[tier];
                    const isWon = wonTier === tier;
                    return (
                        <div key={tier} className="flex flex-col items-center gap-0.5">
                            <div className="flex gap-1">
                                {Array(dotsFor(tier)).fill(null).map((_, i) => (
                                    <div key={i} className="rounded-full transition-all duration-200" style={{
                                        width: 7, height: 7,
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

            {/* Pick grid — no borders, coin emoji + color-coded tier name */}
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
                                background: revealed ? 'rgba(255,255,255,0.04)' : 'radial-gradient(circle at 38% 30%, #5a2200, #1e0800)',
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
                                    <span style={{ fontSize: 'clamp(16px,3.2vw,26px)', lineHeight: 1 }}>🪙</span>
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
                                <span style={{ fontSize: 'clamp(18px,3.5vw,30px)', lineHeight: 1 }}>🪙</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
