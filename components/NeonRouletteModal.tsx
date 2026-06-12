import React, { useEffect, useRef, useState } from 'react';
import { formatCommaNumber } from '../constants';

interface Segment {
    label: string;
    color: string;
    textColor: string;
    mult?: number;
    jp?: string;
    weight: number;
}

// 10 half-pie segments — weighted selection determines winner
const SEGMENTS: Segment[] = [
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2,    weight: 30   },
    { label: '5×',    color: '#15803d', textColor: '#bbf7d0', mult: 5,    weight: 20   },
    { label: '10×',   color: '#7c3aed', textColor: '#e9d5ff', mult: 10,   weight: 12   },
    { label: 'MINI',  color: '#064e3b', textColor: '#6ee7b7', jp: 'MINI', weight: 8    },
    { label: '2×',    color: '#1e3a8a', textColor: '#bfdbfe', mult: 2,    weight: 25   },
    { label: 'MINOR', color: '#0c4a6e', textColor: '#7dd3fc', jp: 'MINOR',weight: 4    },
    { label: '5×',    color: '#166534', textColor: '#bbf7d0', mult: 5,    weight: 18   },
    { label: 'MAJOR', color: '#6b21a8', textColor: '#d8b4fe', jp: 'MAJOR',weight: 0.5  },
    { label: 'MEGA',  color: '#9f1239', textColor: '#fda4af', jp: 'MEGA', weight: 0.15 },
    { label: 'GRAND', color: '#78350f', textColor: '#fde68a', jp: 'GRAND',weight: 0.05 },
];

const TOTAL = SEGMENTS.length;
const SEG_DEG = 360 / TOTAL;
const R = 150;
const CX = 165;
const CY = 165;
const SVG_SIZE = 330;

const WEIGHT_TOTAL = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

const pickWeightedSegment = (): number => {
    let r = Math.random() * WEIGHT_TOTAL;
    for (let i = 0; i < SEGMENTS.length; i++) {
        r -= SEGMENTS[i].weight;
        if (r <= 0) return i;
    }
    return 0;
};

const polarToXY = (deg: number, r: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

const slicePath = (i: number): string => {
    const s = polarToXY(i * SEG_DEG, R);
    const e = polarToXY((i + 1) * SEG_DEG, R);
    return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
};

const UNIQUE_PRIZES = [
    { key: '2×',    textColor: '#bfdbfe' },
    { key: '5×',    textColor: '#bbf7d0' },
    { key: '10×',   textColor: '#e9d5ff' },
    { key: 'MINI',  textColor: '#6ee7b7', jp: 'MINI'  },
    { key: 'MINOR', textColor: '#7dd3fc', jp: 'MINOR' },
    { key: 'MAJOR', textColor: '#d8b4fe', jp: 'MAJOR' },
    { key: 'MEGA',  textColor: '#fda4af', jp: 'MEGA'  },
    { key: 'GRAND', textColor: '#fde68a', jp: 'GRAND' },
];

interface Props {
    isOpen: boolean;
    bet: number;
    jackpotAmounts: number[];
    onComplete: (prize: number) => void;
}

const JP_IDX: Record<string, number> = { MINI: 0, MINOR: 1, MAJOR: 2, MEGA: 3, GRAND: 4 };

export const NeonRouletteModal: React.FC<Props> = ({ isOpen, bet, jackpotAmounts, onComplete }) => {
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<{ seg: Segment; prize: number } | null>(null);
    const [showClaim, setShowClaim] = useState(false);
    const totalRotRef = useRef(0);
    const hasSpun = useRef(false);

    useEffect(() => {
        if (isOpen && !hasSpun.current) {
            hasSpun.current = true;
            const timer = setTimeout(() => {
                const segIdx = pickWeightedSegment();
                const cur = totalRotRef.current;
                const curMod = ((cur % 360) + 360) % 360;
                const midDeg = segIdx * SEG_DEG + SEG_DEG / 2;
                // Segment lands at top (arrow) when rotation ≡ -midDeg (mod 360)
                const targetMod = ((360 - midDeg % 360) % 360);
                let extra = targetMod - curMod;
                if (extra < 0) extra += 360;
                const finalRot = cur + 15 * 360 + extra;
                totalRotRef.current = finalRot;
                setRotation(finalRot);
                setSpinning(true);
                setTimeout(() => {
                    const seg = SEGMENTS[segIdx];
                    const prize = seg.mult !== undefined
                        ? bet * seg.mult
                        : jackpotAmounts[JP_IDX[seg.jp!]] ?? bet * 50;
                    setSpinning(false);
                    setResult({ seg, prize });
                    setTimeout(() => setShowClaim(true), 400);
                }, 13000);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isOpen, bet, jackpotAmounts]);

    useEffect(() => {
        if (!isOpen) {
            hasSpun.current = false;
            setResult(null);
            setSpinning(false);
            setShowClaim(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-pop-in">
            <div className="flex flex-row items-center gap-6 select-none">

                {/* Wheel */}
                <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
                    {/* Arrow at 12 o'clock */}
                    <div className="absolute z-20 pointer-events-none"
                        style={{ top: CY - R - 18, left: '50%', transform: 'translateX(-50%)' }}>
                        <svg width={26} height={22}>
                            <polygon points="13,20 2,2 24,2" fill="#fbbf24" stroke="#78350f" strokeWidth={1.5} />
                        </svg>
                    </div>

                    <svg width={SVG_SIZE} height={SVG_SIZE} style={{ overflow: 'visible' }}>
                        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#fbbf24" strokeWidth={3.5} />
                        <circle cx={CX} cy={CY} r={R + 5}  fill="none" stroke="#92400e" strokeWidth={1.5} />
                        <circle cx={CX} cy={CY} r={R}      fill="none" stroke="rgba(147,51,234,0.2)" strokeWidth={18} />

                        <g style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: `${CX}px ${CY}px`,
                            transition: spinning ? 'transform 12s cubic-bezier(0.08, 0.82, 0.28, 1)' : 'none',
                        }}>
                            {SEGMENTS.map((seg, i) => {
                                const midDeg = i * SEG_DEG + SEG_DEG / 2;
                                const lp = polarToXY(midDeg, R * 0.72);
                                const isRare = !!seg.jp && ['MAJOR','MEGA','GRAND'].includes(seg.jp);
                                const fontSize = seg.label.length > 3 ? 8 : isRare ? 10 : 9;
                                return (
                                    <g key={i}>
                                        <path d={slicePath(i)} fill={seg.color} stroke="#000" strokeWidth={1.5} />
                                        <text
                                            x={lp.x} y={lp.y}
                                            textAnchor="middle" dominantBaseline="middle"
                                            fill={seg.textColor}
                                            fontSize={fontSize}
                                            fontWeight={900}
                                            fontFamily="'Titan One', cursive"
                                            style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${lp.x}px ${lp.y}px` }}
                                        >
                                            {seg.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>

                        <circle cx={CX} cy={CY} r={22} fill="#0d0220" stroke="#7c3aed" strokeWidth={3} />
                        <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>💎</text>
                    </svg>
                </div>

                {/* Right panel — prize list only, no title, no collect */}
                <div className="flex flex-col gap-2 rounded-2xl px-4 py-4"
                    style={{
                        background: 'rgba(13,2,32,0.93)',
                        border: '1.5px solid rgba(147,51,234,0.45)',
                        boxShadow: '0 0 40px rgba(147,51,234,0.35)',
                        minWidth: 172,
                    }}>
                    <div className="text-purple-300/50 text-[9px] font-bold uppercase tracking-wider mb-1">
                        Bet: {formatCommaNumber(bet)}
                    </div>

                    {UNIQUE_PRIZES.map(pt => {
                        const seg = SEGMENTS.find(s => s.label === pt.key);
                        const amount = seg?.mult !== undefined
                            ? bet * seg.mult
                            : (jackpotAmounts[JP_IDX[pt.jp!]] ?? bet * 50);
                        const isActive = result?.seg.label === pt.key;
                        return (
                            <div key={pt.key}
                                className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1 transition-all"
                                style={{
                                    background: isActive ? `${pt.textColor}18` : 'rgba(255,255,255,0.04)',
                                    border: isActive ? `1px solid ${pt.textColor}55` : '1px solid transparent',
                                    boxShadow: isActive ? `0 0 8px ${pt.textColor}44` : 'none',
                                }}>
                                <span className="font-black text-[11px]" style={{ color: pt.textColor }}>{pt.key}</span>
                                <span className="font-mono text-[10px] text-white/70 font-bold">{formatCommaNumber(amount)}</span>
                            </div>
                        );
                    })}

                    {spinning && (
                        <div className="text-purple-300/50 text-[9px] font-black uppercase tracking-widest animate-pulse text-center mt-1">
                            Spinning…
                        </div>
                    )}
                </div>
            </div>

            {/* Win claim popup — appears after spin */}
            {showClaim && result && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-4 rounded-3xl px-10 py-8"
                        style={{
                            background: 'linear-gradient(160deg,#1e003c,#0d0220,#1a0040)',
                            border: `2px solid ${result.seg.textColor}66`,
                            boxShadow: `0 0 60px ${result.seg.textColor}44, 0 0 120px rgba(0,0,0,0.8)`,
                        }}>
                        <div className="text-white/60 text-[10px] font-black uppercase tracking-widest">You Won!</div>
                        <div className="font-black uppercase tracking-wider text-center"
                            style={{ fontSize: '2rem', color: result.seg.textColor, textShadow: `0 0 24px ${result.seg.textColor}` }}>
                            {result.seg.mult ? `${result.seg.mult}×` : result.seg.jp}
                        </div>
                        <div className="font-black font-mono text-white text-3xl">
                            {formatCommaNumber(result.prize)}
                        </div>
                        <div className="text-white/40 text-[9px] uppercase tracking-wide">Coins</div>
                        <button
                            onClick={() => onComplete(result.prize)}
                            className="btn-3d px-10 py-3 rounded-xl font-black uppercase tracking-widest text-black text-base mt-1"
                            style={{ background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', boxShadow: '0 5px 0 #92400e' }}>
                            Claim
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
