
import React, { useState, useRef } from 'react';
import { formatNumber } from '../constants';

interface ArcticPickGridProps {
    jackpotAmounts: number[];
    currentBet: number;
    onWin: (tier: string, amount: number) => void;
    rows: number;
    cols: number;
    hiddenIcon?: string;
    hiddenIconSize?: number; // fraction of the cell, 0-1
    bgColor?: string;
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
    MINI:  '/freespinjackpot (1).png',
    MINOR: '/freespinjackpot (2).png',
    MAJOR: '/freespinjackpot (3).png',
    MEGA:  '/freespinjackpot (4).png',
    GRAND: '/freespinjackpot (5).png',
};
const BET_MULTS: Record<Tier, number> = { MINI: 15, MINOR: 30, MAJOR: 100, MEGA: 500, GRAND: 1000 };

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

export const ArcticPickGrid: React.FC<ArcticPickGridProps> = ({ currentBet, onWin, rows, cols, hiddenIcon = '/arctic/snow.png', hiddenIconSize = 0.7, bgColor = '#000a14' }) => {
    const [winningTier] = useState<Tier>(rollWinningTier);
    const [cells, setCells] = useState<Cell[]>(() => {
        // Spread all 5 tiers roughly evenly across the grid instead of stacking the
        // board with the winning tier — that made it possible to complete 3-of-a-kind
        // in the first couple of taps. With an even split, finding the 3rd match of
        // whichever tier actually won takes real exploration (seeing a good mix of
        // every tier along the way) instead of being a near-certain quick hit.
        const totalCells = Math.max(rows * cols, TIERS.length);
        const perTier = Math.floor(totalCells / TIERS.length);
        const remainder = totalCells - perTier * TIERS.length;
        const tierList: Tier[] = [];
        TIERS.forEach((t, i) => {
            const count = perTier + (i < remainder ? 1 : 0);
            for (let k = 0; k < count; k++) tierList.push(t);
        });
        return shuffle(tierList).map((tier, id) => ({ id, tier, state: 'hidden' as CellState }));
    });

    const [wonTier, setWonTier] = useState<Tier | null>(null);
    const [winAmount, setWinAmount] = useState(0);
    const winFiredRef = useRef(false);

    const handlePick = (id: number) => {
        if (wonTier) return;
        setCells(prev => {
            if (prev.find(c => c.id === id)?.state === 'revealed') return prev;
            const next = prev.map(c => c.id === id ? { ...c, state: 'revealed' as CellState } : c);
            if (!winFiredRef.current) {
                const winCount = next.filter(c => c.state === 'revealed' && c.tier === winningTier).length;
                if (winCount >= 3) {
                    winFiredRef.current = true;
                    const amount = currentBet * BET_MULTS[winningTier];
                    setWinAmount(amount);
                    setWonTier(winningTier);
                }
            }
            return next;
        });
    };

    const handleClaim = () => {
        onWin(wonTier!, winAmount);
    };

    const winColor = wonTier ? TIER_COLOR[wonTier] : '#fde68a';

    return (
        <div className="absolute inset-0 z-30 flex flex-col overflow-hidden"
            style={{ background: bgColor }}>

            <div style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridAutoRows: '1fr',
                gap: 3,
                padding: 3,
            }}>
                {cells.map(cell => {
                    const revealed = cell.state === 'revealed';
                    const isWinCell = wonTier === cell.tier && revealed;
                    const color = TIER_COLOR[cell.tier];
                    return (
                        <button
                            key={cell.id}
                            onClick={() => handlePick(cell.id)}
                            disabled={revealed || !!wonTier}
                            style={{
                                aspectRatio: '1 / 1',
                                borderRadius: 0,
                                border: 'none',
                                background: '#000',
                                cursor: revealed || !!wonTier ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                overflow: 'hidden',
                                boxShadow: isWinCell ? `0 0 14px ${color}` : undefined,
                                transition: 'box-shadow 0.3s',
                            }}>
                            {revealed ? (
                                <img
                                    src={TIER_IMG[cell.tier]}
                                    alt=""
                                    style={{
                                        width: '100%', height: '100%',
                                        objectFit: 'contain',
                                        filter: isWinCell
                                            ? `drop-shadow(0 0 8px ${color})`
                                            : undefined,
                                    }}
                                />
                            ) : (
                                <img
                                    src={hiddenIcon}
                                    alt=""
                                    style={{ width: `${hiddenIconSize * 100}%`, height: `${hiddenIconSize * 100}%`, objectFit: 'contain', opacity: hiddenIconSize >= 1 ? 1 : 0.55, filter: 'drop-shadow(0 1px 4px rgba(100,200,255,0.4))' }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {wonTier && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 animate-pop-in"
                    style={{ background: 'rgba(0,0,0,0.88)' }}>
                    <img
                        src={TIER_IMG[wonTier]}
                        alt={wonTier}
                        style={{ width: 'clamp(100px,35vw,180px)', height: 'auto', filter: `drop-shadow(0 0 20px ${winColor})` }}
                    />
                    <div style={{ fontSize: 'clamp(1.4rem,5vw,2.2rem)', fontFamily: "'Tanker', cursive", color: winColor, lineHeight: 1 }}>
                        +{formatNumber(winAmount)}
                    </div>
                    <button onClick={handleClaim} className="pill-green" style={{ marginTop: 4 }}>
                        <div className="pill-face" style={{ padding: '6px 22px', fontSize: '11px' }}>Claim</div>
                    </button>
                </div>
            )}
        </div>
    );
};
