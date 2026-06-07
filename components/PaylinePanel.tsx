import React from 'react';
import { GameConfig } from '../types';
import { GET_PAYLINES } from '../constants';

interface PaylinePanelProps {
    winningLines: number[];
    gameConfig: GameConfig;
    isHighLimit: boolean;
}

const CELL = 6;
const GAP = 1;
const STEP = CELL + GAP;

export const PaylinePanel: React.FC<PaylinePanelProps> = ({ winningLines, gameConfig, isHighLimit }) => {
    const cols = Math.min(gameConfig.reels, 5);
    const rows = gameConfig.rows;
    const allLines = GET_PAYLINES(rows, gameConfig.reels);
    // Only show the deterministic named lines (horizontal rows + diagonal patterns)
    const displayLines = allLines.filter(l => l.id <= rows || (l.id >= 100 && l.id <= 105));

    const thumbW = cols * STEP - GAP;
    const thumbH = rows * STEP - GAP;

    return (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-40 flex flex-col select-none"
            style={{
                background: isHighLimit ? 'linear-gradient(180deg,#c9901a,#7a5000)' : 'linear-gradient(180deg,#7c3fb5,#4a1880)',
                border: isHighLimit ? '1.5px solid #8b6200' : '1.5px solid #38106e',
                borderRadius: '21px', padding: '6px 5px', gap: '2px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.6),inset 0 1px 1px rgba(255,255,255,0.18)',
                width: '69px',
            }}>
            <div className="text-[7px] font-black text-white/60 text-center uppercase tracking-widest leading-none pb-1"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                Lines
            </div>
            {displayLines.map((line, idx) => {
                const isWin = winningLines.includes(line.id);
                return (
                    <div key={line.id}
                        className={`flex items-center gap-1.5 px-1 py-0.5 rounded-lg transition-all duration-200 ${isWin ? 'scale-[1.04]' : ''}`}
                        style={{ background: isWin ? `${line.color}30` : 'transparent', boxShadow: isWin ? `0 0 6px ${line.color}60` : 'none' }}>
                        {/* Line number */}
                        <span className="font-black leading-none shrink-0"
                            style={{ fontSize: '8px', color: line.color, minWidth: '9px', opacity: isWin ? 1 : 0.5 }}>
                            {idx + 1}
                        </span>
                        {/* Mini grid thumbnail */}
                        <svg width={thumbW} height={thumbH} style={{ flexShrink: 0, overflow: 'visible' }}>
                            {/* Background cells */}
                            {Array.from({ length: cols }).map((_, c) =>
                                Array.from({ length: rows }).map((_, r) => (
                                    <rect key={`${c}-${r}`}
                                        x={c * STEP} y={r * STEP}
                                        width={CELL} height={CELL} rx={1}
                                        fill={line.indices[c] === r ? line.color : 'rgba(255,255,255,0.07)'}
                                        opacity={line.indices[c] === r ? (isWin ? 1 : 0.55) : 1}
                                    />
                                ))
                            )}
                            {/* Connecting polyline */}
                            <polyline
                                points={Array.from({ length: cols }).map((_, c) => {
                                    const row = line.indices[c] ?? 0;
                                    return `${c * STEP + CELL / 2},${row * STEP + CELL / 2}`;
                                }).join(' ')}
                                fill="none"
                                stroke={line.color}
                                strokeWidth={isWin ? 1.5 : 0.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={isWin ? 1 : 0.4}
                            />
                        </svg>
                    </div>
                );
            })}
        </div>
    );
};
