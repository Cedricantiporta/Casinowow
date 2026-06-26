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
                    border: '1px solid rgba(168,85,247,0.4)',
                    borderRight: 'none',
                    borderRadius: '10px 0 0 10px',
                    padding: '10px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    boxShadow: '-3px 0 14px rgba(0,0,0,0.7)',
                }}>
                <img src="/ui/gift_store.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                <span style={{ writingMode: 'vertical-rl', fontSize: 8, fontWeight: 900, color: '#c4b5fd', letterSpacing: 1 }}>QUEST</span>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 40, width: 138,
            background: 'linear-gradient(160deg,#100028 0%,#1c004a 50%,#0a0020 100%)',
            border: '1px solid rgba(168,85,247,0.3)',
            borderRight: 'none',
            borderRadius: '12px 0 0 12px',
            boxShadow: '-4px 0 22px rgba(0,0,0,0.75)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 8px 6px',
                background: 'rgba(168,85,247,0.12)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <img src="/ui/gift_store.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#e9d5ff', letterSpacing: 0.8 }}>Quest</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, lineHeight: 1 }}>
                    <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
                </button>
            </div>

            {/* Not on active slot warning */}
            {!isOnActiveSlot && (
                <div style={{ padding: '4px 8px', background: 'rgba(251,191,36,0.07)' }}>
                    <div style={{ fontSize: 8, color: '#fbbf24', fontWeight: 700, lineHeight: 1.3 }}>
                        Play: <span style={{ color: '#fef3c7' }}>{activeSlotName}</span>
                    </div>
                </div>
            )}

            {/* Missions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 7px 5px' }}>
                {missions.map(m => {
                    const pct = Math.min(100, m.target > 0 ? (m.current / m.target) * 100 : 0);
                    const done = m.current >= m.target;
                    const barColor = done ? '#4ade80' : TYPE_COLOR[m.type];
                    const displayCurrent = m.type === 'WIN_COINS' ? formatK(m.current) : String(m.current);
                    const displayTarget = m.type === 'WIN_COINS' ? formatK(m.target) : String(m.target);
                    return (
                        <div key={m.id}>
                            {/* Description row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <span style={{
                                    fontSize: 7, fontWeight: 900,
                                    color: done ? '#4ade80' : barColor,
                                    background: `${done ? '#4ade80' : barColor}1a`,
                                    borderRadius: 4, padding: '1px 4px', flexShrink: 0,
                                }}>
                                    {done ? '✓' : TYPE_LABEL[m.type]}
                                </span>
                                <span style={{
                                    fontSize: 7.5, lineHeight: 1.25,
                                    color: done ? '#86efac' : '#c4b5fd',
                                    opacity: done ? 0.65 : 1,
                                }}>
                                    {m.description}
                                </span>
                            </div>
                            {/* Progress bar with X/XX counter inside */}
                            <div style={{
                                height: 14, borderRadius: 7,
                                background: 'rgba(255,255,255,0.08)',
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    width: `${pct}%`,
                                    background: done
                                        ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                                        : `linear-gradient(90deg,${barColor}80,${barColor})`,
                                    borderRadius: 7,
                                    transition: 'width 0.4s ease',
                                }} />
                                <span style={{
                                    position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 7, fontWeight: 900, lineHeight: 1,
                                    color: 'rgba(255,255,255,0.9)',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {displayCurrent}/{displayTarget}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Reward */}
            <div style={{ padding: '4px 7px 8px' }}>
                {allDone ? (
                    <button onClick={onClaim} style={{
                        width: '100%', border: 'none', borderRadius: 8, cursor: 'pointer',
                        background: 'linear-gradient(180deg,#22c55e,#16a34a)',
                        boxShadow: '0 2px 0 #14532d, 0 4px 10px rgba(34,197,94,0.3)',
                        padding: '6px 4px', fontSize: 9, fontWeight: 900, color: '#fff',
                    }}>
                        Claim +{formatK(rewardCoins)}
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <img src="/ui/gift_store.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                        <span style={{ fontSize: 8, color: '#9ca3af', fontWeight: 700 }}>+{formatK(rewardCoins)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
