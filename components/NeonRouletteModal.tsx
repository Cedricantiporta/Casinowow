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
const R = 116;
const CX = 130;
const CY = 130;

const polarToXY = (deg: number, r: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

const slicePath = (i: number): string => {
    const s = polarToXY(i * SEG_DEG, R);
    const e = polarToXY((i + 1) * SEG_DEG, R);
    return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
};

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
                const targetAngle = segIdx * SEG_DEG + SEG_DEG / 2;
                let extra = targetAngle - curMod;
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-pop-in">
            <div className="flex flex-col items-center gap-4 px-6 py-5 rounded-3xl select-none"
                style={{ background: 'linear-gradient(160deg,#2e0060,#0d0220,#1a0040)', boxShadow: '0 0 60px rgba(147,51,234,0.5)' }}>

                <div className="font-black text-white text-base uppercase tracking-widest">💎 Scatter Roulette</div>
                <div className="text-purple-300/60 text-[10px] font-bold uppercase tracking-wider">
                    Bet: {formatCommaNumber(bet)}
                </div>

                {/* Wheel */}
                <div className="relative" style={{ width: 260, height: 260 }}>
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 z-20 pointer-events-none"
                        style={{ transform: 'translate(-50%, -4px)' }}>
                        <svg width={22} height={18}>
                            <polygon points="11,16 1,1 21,1" fill="#fbbf24" stroke="#78350f" strokeWidth={1} />
                        </svg>
                    </div>

                    <svg width={260} height={260} style={{ overflow: 'visible' }}>
                        {/* Gold outer ring */}
                        <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="#fbbf24" strokeWidth={3} />
                        <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="#92400e" strokeWidth={1} />

                        {/* Spinning group */}
                        <g style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: `${CX}px ${CY}px`,
                            transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
                        }}>
                            {SEGMENTS.map((seg, i) => {
                                const midDeg = i * SEG_DEG + SEG_DEG / 2;
                                const lp = polarToXY(midDeg, R * 0.66);
                                const isRare = (seg.mult !== undefined && seg.mult >= 20) || !!seg.jp;
                                return (
                                    <g key={i}>
                                        <path d={slicePath(i)} fill={seg.color} stroke="#000" strokeWidth={1.5} />
                                        <text
                                            x={lp.x}
                                            y={lp.y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill={seg.textColor}
                                            fontSize={isRare ? 10 : 9}
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

                        {/* Center cap */}
                        <circle cx={CX} cy={CY} r={20} fill="#0d0220" stroke="#7c3aed" strokeWidth={2.5} />
                        <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>💎</text>
                    </svg>
                </div>

                {/* Spinning status */}
                {spinning && !result && (
                    <div className="text-purple-300/50 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Spinning...
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="flex flex-col items-center gap-3 animate-pop-in">
                        <div className="text-center">
                            <div className="font-black uppercase tracking-wider"
                                style={{ fontSize: '1.6rem', color: result.seg.textColor, textShadow: `0 0 20px ${result.seg.color}` }}>
                                {result.seg.mult ? `${result.seg.mult}×` : result.seg.jp}
                            </div>
                            <div className="text-white font-black text-xl mt-1 font-mono">
                                {formatCommaNumber(result.prize)}
                            </div>
                            <div className="text-white/40 text-[10px] mt-0.5 uppercase tracking-wide">Coins Won</div>
                        </div>
                        <button
                            onClick={() => onComplete(result.prize)}
                            className="btn-3d px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-black text-sm"
                            style={{ background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 0 #92400e' }}>
                            Collect!
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
