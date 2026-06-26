import React, { useState } from 'react';
import { SlotQuestMission } from '../types';
import { formatK } from '../constants';

interface SlotQuestPanelProps {
    missions: SlotQuestMission[];
    activeSlotName: string;
    isOnActiveSlot: boolean;
    rewardCoins: number;
    allDone: boolean;
    onClaim: () => void;
}

// Tabler icon per mission type (UI_MAP: prefer line icons over caps text badges)
const TYPE_ICON: Record<string, string> = {
    WIN_COUNT:   'ti-trophy',
    SPIN_COUNT:  'ti-refresh',
    MAX_BET_SPIN:'ti-bolt',
    WIN_COINS:   'ti-coin',
};

export const SlotQuestPanel: React.FC<SlotQuestPanelProps> = ({
    missions, activeSlotName, isOnActiveSlot, rewardCoins, allDone, onClaim,
}) => {
    const [open, setOpen] = useState(true);

    if (!open) {
        return (
            <div
                onClick={() => setOpen(true)}
                className="tcard cursor-pointer"
                style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    zIndex: 40, borderRadius: '14px 0 0 14px',
                    padding: '10px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <img src="/questlobbyicon.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span className="font-black text-white/90" style={{ writingMode: 'vertical-rl', fontSize: 9, letterSpacing: 1 }}>Quest</span>
            </div>
        );
    }

    return (
        <div className="tcard" style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 40, width: 140, borderRadius: '16px 0 0 16px', overflow: 'hidden',
        }}>
            {/* Header */}
            <div className="flex items-center justify-between" style={{ padding: '7px 9px 6px' }}>
                <div className="flex items-center gap-1.5">
                    <img src="/questlobbyicon.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    <span className="font-black text-white" style={{ fontSize: 11 }}>Quest</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/60" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                    <i className="ti ti-chevron-right" style={{ fontSize: 14 }} />
                </button>
            </div>

            {/* Play the active slot hint */}
            {!isOnActiveSlot && (
                <div style={{ padding: '0 9px 5px' }}>
                    <div className="font-bold text-amber-300" style={{ fontSize: 10, lineHeight: 1.3 }}>
                        Play: <span className="text-white">{activeSlotName}</span>
                    </div>
                </div>
            )}

            {/* Missions */}
            <div className="flex flex-col" style={{ gap: 7, padding: '0 9px 7px' }}>
                {missions.map(m => {
                    const pct = Math.min(100, m.target > 0 ? (m.current / m.target) * 100 : 0);
                    const done = m.current >= m.target;
                    const displayCurrent = m.type === 'WIN_COINS' ? formatK(m.current) : String(m.current);
                    const displayTarget = m.type === 'WIN_COINS' ? formatK(m.target) : String(m.target);
                    return (
                        <div key={m.id}>
                            {/* Description */}
                            <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
                                <i className={`ti ${done ? 'ti-check' : TYPE_ICON[m.type]} ${done ? 'text-green-400' : 'text-white/70'}`} style={{ fontSize: 12 }} />
                                <span className={done ? 'text-green-300' : 'text-white/85'} style={{ fontSize: 10, lineHeight: 1.2, fontWeight: 600 }}>{m.description}</span>
                            </div>
                            {/* Progress bar — the one canonical .rtrack bar, X/XX label inside */}
                            <div className="rtrack" style={{ height: 15, minWidth: 0, padding: '0 6px' }}>
                                <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 18, pointerEvents: 'none' }}>
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 12,
                                        width: `${pct}%`,
                                        background: done
                                            ? 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)'
                                            : 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                                        transition: 'width 0.4s ease',
                                    }}>
                                        <div className="absolute inset-y-0 w-5 bg-white/50 skew-x-[-20deg] animate-xp-bar-shine pointer-events-none" />
                                    </div>
                                </div>
                                <span className="relative font-black text-white" style={{ fontSize: 9, lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                    {displayCurrent}/{displayTarget}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Reward */}
            <div style={{ padding: '0 9px 9px' }}>
                {allDone ? (
                    <button onClick={onClaim} className="pill-green w-full">
                        <div className="pill-face" style={{ padding: '6px 4px', fontSize: '10px' }}>Claim +{formatK(rewardCoins)}</div>
                    </button>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <img src="/new_coinicon.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        <span className="font-bold text-white/60" style={{ fontSize: 10 }}>+{formatK(rewardCoins)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
