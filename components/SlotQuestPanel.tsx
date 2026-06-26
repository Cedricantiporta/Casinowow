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

const TYPE_COLOR: Record<string, string> = {
    WIN_COUNT:   '#38bdf8',
    SPIN_COUNT:  '#a78bfa',
    MAX_BET_SPIN:'#fb923c',
    WIN_COINS:   '#4ade80',
};
const TYPE_LABEL: Record<string, string> = {
    WIN_COUNT:   'WIN',
    SPIN_COUNT:  'SPIN',
    MAX_BET_SPIN:'MAX',
    WIN_COINS:   'COINS',
};

export const SlotQuestPanel: React.FC<SlotQuestPanelProps> = ({
    missions, activeSlotName, isOnActiveSlot, rewardCoins, allDone, onClaim,
}) => {
    const [open, setOpen] = useState(true);

    if (!open) {
        return (
            <div
                onClick={() => setOpen(true)}
                style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    zIndex: 40, cursor: 'pointer',
                    background: 'linear-gradient(180deg,#1e0050,#0d0030)',
                    border: '1px solid rgba(168,85,247,0.5)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    padding: '10px 5px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    boxShadow: '-2px 0 12px rgba(0,0,0,0.6)',
                }}>
                <i className="ti ti-trophy" style={{ fontSize: 14, color: '#fbbf24' }} />
                <span style={{ writingMode: 'vertical-rl', fontSize: 9, fontWeight: 900, color: '#c4b5fd', letterSpacing: 1 }}>QUEST</span>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 40, width: 130,
            background: 'linear-gradient(160deg,#0f0025 0%,#1a0040 60%,#0a0020 100%)',
            border: '1px solid rgba(168,85,247,0.4)',
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.7)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 5px', borderBottom: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-trophy" style={{ fontSize: 11, color: '#fbbf24' }} />
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#e9d5ff', letterSpacing: 1 }}>QUEST</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, lineHeight: 1 }}>
                    <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
                </button>
            </div>

            {/* Slot target label */}
            {!isOnActiveSlot && (
                <div style={{ padding: '4px 8px', background: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
                    <div style={{ fontSize: 8, color: '#fbbf24', fontWeight: 700, lineHeight: 1.3 }}>
                        Play: <span style={{ color: '#fff' }}>{activeSlotName}</span>
                    </div>
                </div>
            )}

            {/* Missions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 7px' }}>
                {missions.map(m => {
                    const pct = Math.min(100, m.target > 0 ? (m.current / m.target) * 100 : 0);
                    const done = m.current >= m.target;
                    const color = done ? '#4ade80' : TYPE_COLOR[m.type];
                    return (
                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '5px 6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                <span style={{ fontSize: 7, fontWeight: 900, color: done ? '#4ade80' : color, background: `${done ? '#4ade80' : color}22`, borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>
                                    {done ? '✓' : TYPE_LABEL[m.type]}
                                </span>
                                <span style={{ fontSize: 8, color: done ? '#86efac' : '#d4c8f0', lineHeight: 1.2, opacity: done ? 0.7 : 1 }}>{m.description}</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: done ? '#4ade80' : color, borderRadius: 2, transition: 'width 0.4s' }} />
                            </div>
                            <div style={{ fontSize: 7, color: '#7c6ea0', marginTop: 2, textAlign: 'right' }}>
                                {m.type === 'WIN_COINS'
                                    ? `${formatK(m.current)} / ${formatK(m.target)}`
                                    : `${m.current} / ${m.target}`}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Reward / Claim */}
            <div style={{ padding: '4px 7px 7px', borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                {allDone ? (
                    <button onClick={onClaim} style={{
                        width: '100%', border: 'none', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(180deg,#22c55e,#16a34a)',
                        boxShadow: '0 2px 0 #14532d',
                        padding: '5px 4px', fontSize: 9, fontWeight: 900, color: '#fff',
                    }}>
                        Claim +{formatK(rewardCoins)}
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="ti ti-coin" style={{ fontSize: 12, color: '#fbbf24' }} />
                        <span style={{ fontSize: 8, color: '#9ca3af', fontWeight: 700 }}>+{formatK(rewardCoins)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
