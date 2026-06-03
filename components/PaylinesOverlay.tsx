
import React from 'react';
import { Payline, WinData } from '../types';
import { GET_PAYLINES } from '../constants';

interface PaylinesOverlayProps {
    winData: WinData | null;
    rowCount?: number;
}

export const PaylinesOverlay: React.FC<PaylinesOverlayProps> = ({ winData, rowCount = 3 }) => {
    if (!winData) return null;

    const ALL_LINES = GET_PAYLINES(rowCount);

    const getPoint = (col: number, row: number) => {
        const x = (col * 20) + 10;
        const y = (row * (100/rowCount)) + (50/rowCount);
        return `${x}%,${y}%`;
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-20">
            <svg className="w-full h-full overflow-visible">
                {winData.winningLines.map(lineId => {
                    const line = ALL_LINES.find(l => l.id === lineId);
                    if (!line) return null;

                    const points = line.indices.map((row, col) => getPoint(col, row)).join(' ');

                    return (
                        <g key={lineId} className="animate-bounce">
                            <polyline 
                                points={points} 
                                fill="none" 
                                stroke={line.color} 
                                strokeWidth="16"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="opacity-50 blur-lg"
                            />
                            <polyline 
                                points={points} 
                                fill="none" 
                                stroke={line.color} 
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="drop-shadow-[0_0_10px_rgba(255,255,255,1)] animate-pulse"
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
