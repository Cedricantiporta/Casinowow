import React, { useState } from 'react';

// A small reward icon+label that reveals its full detail in a tap popup —
// shared between the Top Players leaderboard and the Guild rankings list so
// reward previews look consistent everywhere. Tap-only (no hover) since this
// is a touch-first UI.
export const RewardChip: React.FC<{ tooltip: string; icon: React.ReactNode; label: string; labelColor?: string }> = ({ tooltip, icon, label, labelColor }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex-shrink-0 flex items-center gap-0.5 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}>
            {icon}
            {label && <span className="font-black" style={{ fontSize: 10, color: labelColor ?? 'rgba(255,255,255,0.75)' }}>{label}</span>}
            {show && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-[500] pointer-events-none whitespace-nowrap"
                    style={{
                        background: 'linear-gradient(180deg,#6a1eb0 0%,#380870 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(180,100,255,0.4), 0 4px 12px rgba(0,0,0,0.85)',
                        borderRadius: 8,
                        padding: '4px 9px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#e9d5ff',
                        letterSpacing: '0.03em',
                    }}>
                    {tooltip}
                </div>
            )}
        </div>
    );
};

export const fmtRewardDuration = (hours: number) => hours >= 24 ? `${hours / 24}D` : `${hours}H`;
