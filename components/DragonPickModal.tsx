import React, { useState, useRef } from 'react';
import { formatNumber } from '../constants';

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

export const DragonPickGrid: React.FC<DragonPickGridProps> = ({ currentBet, onWin, rows, cols }) => {
    const [winningTier] = useState<Tier>(rollWinningTier);
    // 11 winning + 1 per other tier = 15 cells; non-winning tiers cap at 1/2, never trigger win
    const [cells, setCells] = useState<Cell[]>(() => {
        const tierList: Tier[] = [
            ...Array(11).fill(winningTier),
            ...TIERS.filter(t => t !== winningTier),
        ] as Tier[];
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
                if (winCount >= 2) {
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
            style={{ background: '#0a0000' }}>

            {/* Pick grid */}
            <div className="flex-1 min-h-0 p-1" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: 3,
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
                                borderRadius: 0,
                                border: 'none',
                                background: '#000',
                                cursor: revealed || !!wonTier ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                minHeight: 0,
                                boxShadow: isWinCell ? `0 0 14px ${color}` : undefined,
                                transition: 'box-shadow 0.3s',
                            }}>
                            {revealed ? (
                                <img
                                    src={TIER_IMG[cell.tier]}
                                    alt=""
                                    style={{
                                        width: '65%', height: '65%',
                                        objectFit: 'contain',
                                        filter: isWinCell
                                            ? `drop-shadow(0 0 8px ${color})`
                                            : 'brightness(0.4)',
                                    }}
                                />
                            ) : (
                                <img
                                    src="/dragon/dragon-1.png"
                                    alt=""
                                    style={{ width: '55%', height: '55%', objectFit: 'contain', opacity: 0.55, filter: 'drop-shadow(0 1px 4px rgba(255,80,0,0.4))' }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Win overlay — shown after 2nd match; user clicks Claim to close */}
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
