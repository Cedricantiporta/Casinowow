import React, { useEffect, useRef, useState } from 'react';
import { formatCommaNumber } from '../constants';

interface Segment {
    label: string;
    color: string;
    textColor: string;
    mult?: number;
    jp?: string;
}

const SEGMENTS: Segment[] = [
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2     },
    { label: '5×',    color: '#15803d', textColor: '#bbf7d0', mult: 5     },
    { label: '2×',    color: '#1e3a8a', textColor: '#bfdbfe', mult: 2     },
    { label: '10×',   color: '#7c3aed', textColor: '#e9d5ff', mult: 10    },
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2     },
    { label: '5×',    color: '#166534', textColor: '#bbf7d0', mult: 5     },
    { label: '2×',    color: '#1e3a8a', textColor: '#bfdbfe', mult: 2     },
    { label: 'MINI',  color: '#064e3b', textColor: '#6ee7b7', jp: 'MINI'  },
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2     },
    { label: '5×',    color: '#15803d', textColor: '#bbf7d0', mult: 5     },
    { label: '2×',    color: '#1e3a8a', textColor: '#bfdbfe', mult: 2     },
    { label: '20×',   color: '#92400e', textColor: '#fde68a', mult: 20    },
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2     },
    { label: '10×',   color: '#4c1d95', textColor: '#e9d5ff', mult: 10    },
    { label: '2×',    color: '#1e3a8a', textColor: '#bfdbfe', mult: 2     },
    { label: '5×',    color: '#166534', textColor: '#bbf7d0', mult: 5     },
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2     },
    { label: '40×',   color: '#7f1d1d', textColor: '#fca5a5', mult: 40    },
    { label: '2×',    color: '#1e3a8a', textColor: '#bfdbfe', mult: 2     },
    { label: 'MINOR', color: '#0c4a6e', textColor: '#7dd3fc', jp: 'MINOR' },
];

const TOTAL = SEGMENTS.length;
const SEG_DEG = 360 / TOTAL;
const R = 150;
const CX = 165;
const CY = 165;
const SVG_SIZE = 330;

const polarToXY = (deg: number, r: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

const slicePath = (i: number): string => {
    const s = polarToXY(i * SEG_DEG, R);
    const e = polarToXY((i + 1) * SEG_DEG, R);
    return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
};

const PRIZE_TIERS = [
    { key: '2×',    color: '#bfdbfe', mult: 2  },
    { key: '5×',    color: '#bbf7d0', mult: 5  },
    { key: '10×',   color: '#e9d5ff', mult: 10 },
    { key: '20×',   color: '#fde68a', mult: 20 },
    { key: '40×',   color: '#fca5a5', mult: 40 },
    { key: 'MINI',  color: '#6ee7b7', jp: 'MINI'  },
    { key: 'MINOR', color: '#7dd3fc', jp: 'MINOR' },
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
    const totalRotRef = useRef(0);
    const hasSpun = useRef(false);

    useEffect(() => {
        if (isOpen && !hasSpun.current) {
            hasSpun.current = true;
            const timer = setTimeout(() => {
                const segIdx = Math.floor(Math.random() * TOTAL);
                const cur = totalRotRef.current;
                const curMod = ((cur % 360) + 360) % 360;
                const midDeg = segIdx * SEG_DEG + SEG_DEG / 2;
                // Segment lands at top (arrow) when rotation ≡ -midDeg (mod 360)
                const targetMod = ((360 - midDeg % 360) % 360);
                let extra = targetMod - curMod;
                if (extra < 0) extra += 360;
                const finalRot = cur + 5 * 360 + extra;
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
                }, 4500);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isOpen, bet, jackpotAmounts]);

    useEffect(() => {
        if (!isOpen) {
            hasSpun.current = false;
            setResult(null);
            setSpinning(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-pop-in">
            <div className="flex flex-row items-center gap-6 select-none">

                {/* Wheel */}
                <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
                    {/* Arrow at 12 o'clock pointing down into wheel */}
                    <div className="absolute z-20 pointer-events-none"
                        style={{ top: CY - R - 18, left: '50%', transform: 'translateX(-50%)' }}>
                        <svg width={26} height={22}>
                            <polygon points="13,20 2,2 24,2" fill="#fbbf24" stroke="#78350f" strokeWidth={1.5} />
                        </svg>
                    </div>

                    <svg width={SVG_SIZE} height={SVG_SIZE} style={{ overflow: 'visible' }}>
                        {/* Outer rings */}
                        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#fbbf24" strokeWidth={3.5} />
                        <circle cx={CX} cy={CY} r={R + 5}  fill="none" stroke="#92400e" strokeWidth={1.5} />
                        {/* Glow behind wheel */}
                        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(147,51,234,0.25)" strokeWidth={20} />

                        {/* Spinning group */}
                        <g style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: `${CX}px ${CY}px`,
                            transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
                        }}>
                            {SEGMENTS.map((seg, i) => {
                                const midDeg = i * SEG_DEG + SEG_DEG / 2;
                                // Place text 78% toward outer edge
                                const lp = polarToXY(midDeg, R * 0.78);
                                const isRare = (seg.mult !== undefined && seg.mult >= 20) || !!seg.jp;
                                const fontSize = seg.label.length > 2 ? 8 : isRare ? 10 : 9;
                                return (
                                    <g key={i}>
                                        <path d={slicePath(i)} fill={seg.color} stroke="#000" strokeWidth={1.5} />
                                        <text
                                            x={lp.x}
                                            y={lp.y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill={seg.textColor}
                                            fontSize={fontSize}
                                            fontWeight={900}
                                            fontFamily="'Titan One', cursive"
                                            style={{
                                                transform: `rotate(${midDeg}deg)`,
                                                transformOrigin: `${lp.x}px ${lp.y}px`,
                                            }}
                                        >
                                            {seg.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>

                        {/* Center cap */}
                        <circle cx={CX} cy={CY} r={22} fill="#0d0220" stroke="#7c3aed" strokeWidth={3} />
                        <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>💎</text>
                    </svg>
                </div>

                {/* Info panel — right side */}
                <div className="flex flex-col gap-4 rounded-2xl px-5 py-5"
                    style={{
                        background: 'rgba(13,2,32,0.93)',
                        border: '1.5px solid rgba(147,51,234,0.45)',
                        boxShadow: '0 0 40px rgba(147,51,234,0.35)',
                        minWidth: 188,
                    }}>
                    {/* Title */}
                    <div>
                        <div className="font-black text-white text-sm uppercase tracking-widest">💎 Scatter Roulette</div>
                        <div className="text-purple-300/50 text-[9px] font-bold uppercase tracking-wider mt-0.5">
                            Bet: {formatCommaNumber(bet)}
                        </div>
                    </div>

                    {/* Prize list */}
                    <div className="flex flex-col gap-1">
                        {PRIZE_TIERS.map(pt => {
                            const amount = pt.mult !== undefined
                                ? bet * pt.mult
                                : (jackpotAmounts[JP_IDX[pt.jp!]] ?? bet * 50);
                            const isActive = result?.seg.label === pt.key;
                            return (
                                <div key={pt.key}
                                    className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1 transition-all"
                                    style={{
                                        background: isActive ? `${pt.color}22` : 'rgba(255,255,255,0.04)',
                                        border: isActive ? `1px solid ${pt.color}66` : '1px solid transparent',
                                    }}>
                                    <span className="font-black text-[11px]" style={{ color: pt.color }}>{pt.key}</span>
                                    <span className="font-mono text-[10px] text-white/70 font-bold">{formatCommaNumber(amount)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Spinning status */}
                    {spinning && (
                        <div className="text-purple-300/60 text-[10px] font-black uppercase tracking-widest animate-pulse text-center">
                            Spinning…
                        </div>
                    )}

                    {/* Result + collect */}
                    {result && (
                        <div className="flex flex-col items-center gap-3 animate-pop-in">
                            <div className="text-center">
                                <div className="font-black uppercase tracking-wider"
                                    style={{ fontSize: '1.5rem', color: result.seg.textColor, textShadow: `0 0 18px ${result.seg.color}` }}>
                                    {result.seg.mult ? `${result.seg.mult}×` : result.seg.jp}
                                </div>
                                <div className="text-white font-black text-lg mt-0.5 font-mono">
                                    {formatCommaNumber(result.prize)}
                                </div>
                                <div className="text-white/40 text-[9px] mt-0.5 uppercase tracking-wide">Coins Won</div>
                            </div>
                            <button
                                onClick={() => onComplete(result.prize)}
                                className="btn-3d w-full py-2 rounded-xl font-black uppercase tracking-widest text-black text-sm"
                                style={{ background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 0 #92400e' }}>
                                Collect!
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
