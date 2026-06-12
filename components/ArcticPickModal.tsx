import React, { useState, useRef } from 'react';
import { formatK } from '../constants';

interface ArcticPickModalProps {
    isOpen: boolean;
    jackpotAmounts: number[];
    currentBet: number;
    onWin: (tier: string, amount: number) => void;
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

const HW_JP_IDX: Record<Tier, number> = { MINI: 0, MINOR: 1, MAJOR: 2, MEGA: 3, GRAND: 4 };

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

const PickGame: React.FC<{ currentBet: number; jackpotAmounts: number[]; onWin: (tier: string, amount: number) => void }> = ({ currentBet, jackpotAmounts, onWin }) => {
    const [winningTier] = useState<Tier>(rollWinningTier);
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
            if ((counts[winningTier] || 0) >= 3 && !winFiredRef.current) {
                winFiredRef.current = true;
                setWonTier(winningTier);
                const jpAmount = jackpotAmounts[HW_JP_IDX[winningTier]];
                const amount = jpAmount > 0 ? jpAmount : currentBet * BET_MULTS[winningTier];
                setTimeout(() => onWin(winningTier, amount), 900);
            }
            return next;
        });
    };

    const dotsFor = (_t: Tier) => 3;

    const TIER_CLASS: Record<Tier, string> = { MINI: 't-green', MINOR: 't-cyan', MAJOR: 't-purple', MEGA: 't-red', GRAND: 't-gold' };

    return (
        <div className="flex flex-col w-full h-full">
            {/* Jackpot amounts — same design as JackpotTicker */}
            <div className="jackpot font-nunito w-full select-none flex-shrink-0">
                {TIERS.map((tier, idx) => {
                    const amt = jackpotAmounts[HW_JP_IDX[tier]] > 0 ? jackpotAmounts[HW_JP_IDX[tier]] : currentBet * BET_MULTS[tier];
                    return (
                        <div key={tier} className={`jp ${TIER_CLASS[tier]}`}>
                            <div className="jp-tier">{tier}</div>
                            <div className="jp-amt">{formatK(amt)}</div>
                        </div>
                    );
                })}
            </div>

            {/* Tier progress dots */}
            <div className="flex justify-around px-3 pt-2 pb-1.5 flex-shrink-0">
                {TIERS.map(tier => {
                    const count = Math.min(tierCounts[tier] || 0, dotsFor(tier));
                    const color = TIER_COLOR[tier];
                    const isWon = wonTier === tier;
                    return (
                        <div key={tier} className="flex flex-col items-center gap-0.5">
                            <span className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(7px,1.2vw,9px)', color }}>{tier}</span>
                            <div className="flex gap-1 mt-0.5">
                                {Array(dotsFor(tier)).fill(null).map((_, i) => (
                                    <div key={i} className="rounded-full transition-all duration-200" style={{
                                        width: 7, height: 7,
                                        background: i < count ? color : 'rgba(255,255,255,0.12)',
                                        boxShadow: i < count ? `0 0 5px ${color}` : 'none',
                                    }} />
                                ))}
                            </div>
                            {isWon && <span className="animate-pop-in" style={{ fontSize: 'clamp(7px,1.2vw,9px)', color, fontWeight: 900 }}>WIN!</span>}
                        </div>
                    );
                })}
            </div>

            {/* 3x5 grid */}
            <div className="flex-1 min-h-0 px-2 pb-2" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                gap: 6,
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
                                gap: 2, transition: 'background 0.25s',
                                minHeight: 0,
                                boxShadow: isWinCell ? `0 0 16px ${color}88` : 'none',
                            }}>
                            {revealed ? (
                                <>
                                    <span style={{ fontSize: 'clamp(16px,3.2vw,26px)', lineHeight: 1 }}>&#x1F9CA;</span>
                                    <span style={{ fontSize: 'clamp(7px,1.4vw,11px)', color, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1, textTransform: 'uppercase' }}>{cell.tier}</span>
                                </>
                            ) : (
                                <span style={{ fontSize: 'clamp(18px,3.5vw,30px)', lineHeight: 1 }}>&#x1F9CA;</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const ArcticPickModal: React.FC<ArcticPickModalProps> = ({ isOpen, jackpotAmounts, currentBet, onWin }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }}>
            <div className="animate-pop-in rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(34,211,238,0.4)]"
                style={{
                    background: 'linear-gradient(160deg,#001428,#00080f)',
                    border: '2px solid rgba(34,211,238,0.4)',
                    width: 'min(92vw,480px)',
                    height: 'min(75vh,560px)',
                    display: 'flex', flexDirection: 'column',
                }}>
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3 px-4"
                    style={{ background: 'linear-gradient(180deg,#0284c7,#0c4a6e)', borderBottom: '1px solid rgba(34,211,238,0.2)' }}>
                    <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>&#x2744;&#xFE0F;</span>
                    <div className="text-center">
                        <div className="font-black text-white uppercase tracking-widest text-sm">Jackpot Pick!</div>
                        <div className="text-cyan-200/60 text-[9px] uppercase tracking-wider">Pick 3 matching to win</div>
                    </div>
                    <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>&#x2744;&#xFE0F;</span>
                </div>
                <div className="flex-1 min-h-0">
                    <PickGame currentBet={currentBet} jackpotAmounts={jackpotAmounts} onWin={onWin} />
                </div>
            </div>
        </div>
    );
};
