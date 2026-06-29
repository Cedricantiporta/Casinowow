import React, { useState } from 'react';
import { SlotQuestMission } from '../types';
import { formatK } from '../constants';

interface SlotQuestPanelProps {
    missions: SlotQuestMission[];
    activeSlotName: string;
    isOnActiveSlot: boolean;
    rewardCoins: number;
    allDone: boolean;
    onOpenQuestPath: () => void;
}

const TYPE_ICON: Record<string, string> = {
    WIN_COUNT:    'ti-trophy',
    SPIN_COUNT:   'ti-refresh',
    MAX_BET_SPIN: 'ti-bolt',
    WIN_COINS:    'ti-coin',
    BET_COINS:    'ti-coins',
    BIG_WIN_COUNT:'ti-flame',
    LEVEL_UP:     'ti-star',
    REACH_LEVEL:  'ti-star',
};

// Semi-transparent — readable but lets the reels show through a little.
const PANEL_BG = {
    background: 'linear-gradient(180deg,rgba(120,55,180,0.82),rgba(48,12,96,0.86))',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.4), 0 6px 22px rgba(0,0,0,0.7)',
};

export const SlotQuestPanel: React.FC<SlotQuestPanelProps> = ({
    missions, activeSlotName, isOnActiveSlot, rewardCoins, allDone, onOpenQuestPath,
}) => {
    const [minimized, setMinimized] = useState(false);

    if (minimized) {
        return (
            <div
                style={{
                    ...PANEL_BG,
                    position: 'absolute', left: 74, top: 8,
                    zIndex: 45, width: 22, borderRadius: 11, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '6px 0', cursor: 'pointer',
                }}
                onClick={() => setMinimized(false)}
                className="animate-pop-in"
            >
                <i className="ti ti-chevron-right text-white/70" style={{ fontSize: 14 }} />
            </div>
        );
    }

    return (
        <div style={{
            ...PANEL_BG,
            position: 'absolute', left: 74, top: 8,
            zIndex: 45, width: 150, borderRadius: 16, overflow: 'hidden',
        }} className="animate-pop-in">
            {/* Header */}
            <div className="flex items-center gap-1.5" style={{ padding: '7px 9px 6px' }}>
                <img src="/questlobbyicon.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                <span className="font-black text-white" style={{ fontSize: 11 }}>Quest</span>
                <button
                    onClick={() => setMinimized(true)}
                    className="ml-auto shrink-0 flex items-center justify-center"
                    style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(0,0,0,0.2)', cursor: 'pointer' }}
                >
                    <i className="ti ti-chevron-left text-white/70" style={{ fontSize: 11 }} />
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
                    const isCoins = m.type === 'WIN_COINS' || m.type === 'BET_COINS';
                    const displayCurrent = isCoins ? formatK(m.current) : String(m.current);
                    const displayTarget = isCoins ? formatK(m.target) : String(m.target);
                    return (
                        <div key={m.id}>
                            <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
                                <i className={`ti ${done ? 'ti-check' : TYPE_ICON[m.type]} ${done ? 'text-green-400' : 'text-white/70'}`} style={{ fontSize: 12 }} />
                                <span className={done ? 'text-green-300' : 'text-white/85'} style={{ fontSize: 10, lineHeight: 1.2, fontWeight: 600 }}>{m.description}</span>
                            </div>
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

            {/* Footer */}
            <div style={{ padding: '0 9px 9px' }}>
                {allDone ? (
                    <button onClick={onOpenQuestPath} className="pill-green w-full">
                        <div className="pill-face" style={{ padding: '6px 4px', fontSize: '10px' }}>Complete</div>
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
