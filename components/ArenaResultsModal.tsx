import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';
import { ArenaResult } from '../types';
import { rankInfo, formatCountdown } from '../services/arenaService';
import { ArenaBadge } from './ArenaModal';

interface ArenaResultsModalProps {
    isOpen: boolean;
    result: ArenaResult | null;
    nextSeasonInMs: number;
    onClose: () => void;
}

export const ArenaResultsModal: React.FC<ArenaResultsModalProps> = ({ isOpen, result, nextSeasonInMs, onClose }) => {
    const [showNew, setShowNew] = useState(false);

    // Reveal the new rank after a short beat for a "rank change" moment.
    useEffect(() => {
        if (!isOpen) { setShowNew(false); return; }
        const t = setTimeout(() => setShowNew(true), 700);
        return () => clearTimeout(t);
    }, [isOpen, result?.seasonId]);

    if (!isOpen || !result) return null;

    const oldInfo = rankInfo(result.oldTier);
    const newInfo = rankInfo(result.newTier);
    const promoted = result.outcome === 'promoted';
    const demoted = result.outcome === 'demoted';
    const accent = promoted ? '#4ade80' : demoted ? '#fb7185' : '#c084fc';
    const outcomeLabel = promoted ? 'Promoted!' : demoted ? 'Demoted' : 'Rank Held';

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="w-full max-w-[330px] rounded-3xl overflow-hidden flex flex-col items-center px-6 py-6"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: `inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 40px rgba(0,0,0,0.9), 0 0 60px ${accent}55`,
                }}>
                <i className="ti ti-trophy" style={{ fontSize: 38, color: '#fbbf24', filter: 'drop-shadow(0 0 14px rgba(251,191,36,0.7))' }} />
                <div className="font-tanker text-white text-lg mt-1">Season Complete</div>
                <div className="font-black uppercase tracking-widest mt-0.5" style={{ fontSize: 11, color: accent }}>{outcomeLabel}</div>

                {/* Rank change animation */}
                <div className="flex items-center justify-center gap-3 mt-4 mb-1">
                    <div className="flex flex-col items-center gap-1" style={{ opacity: showNew && promoted ? 0.4 : 1, transition: 'opacity 0.4s' }}>
                        <ArenaBadge tierIndex={result.oldTier} size={56} />
                        <span className="text-white/70 font-bold" style={{ fontSize: 10 }}>{oldInfo.label}</span>
                    </div>
                    {result.outcome !== 'held' && (
                        <>
                            <i className="ti ti-arrow-right text-white/50" style={{ fontSize: 18 }} />
                            <div className="flex flex-col items-center gap-1 transition-all duration-500"
                                style={{ transform: showNew ? 'scale(1.08)' : 'scale(0.6)', opacity: showNew ? 1 : 0 }}>
                                <ArenaBadge tierIndex={result.newTier} size={56} />
                                <span className="font-black" style={{ fontSize: 10, color: accent }}>{newInfo.label}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Stat rows */}
                <div className="w-full flex flex-col gap-1.5 mt-3">
                    <Row label="Final Position" value={`#${result.position}`} />
                    <Row label="Arena Points" value={formatK(result.pointsEarned)} icon="ti-bolt" iconColor="#e879f9" />
                    {result.reward > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                            style={{ background: 'rgba(251,191,36,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}>
                            <span className="text-yellow-300 font-black uppercase tracking-wide" style={{ fontSize: 11 }}>Reward</span>
                            <div className="flex items-center gap-1">
                                <img src="/new_coinicon.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                                <span className="font-black text-yellow-300" style={{ fontSize: 14 }}>+{formatK(result.reward)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-white/60 mt-3" style={{ fontSize: 10 }}>
                    Next Arena begins in <span className="font-black text-white">{formatCountdown(nextSeasonInMs)}</span>
                </div>

                <button className="pill-green w-full mt-3" onClick={onClose}>
                    <div className="pill-face" style={{ padding: '8px 12px', fontSize: '12px' }}>Continue</div>
                </button>
            </div>
        </div>
    );
};

const Row: React.FC<{ label: string; value: string; icon?: string; iconColor?: string }> = ({ label, value, icon, iconColor }) => (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <span className="text-white/70 uppercase tracking-wide" style={{ fontSize: 10 }}>{label}</span>
        <div className="flex items-center gap-1">
            {icon && <i className={`ti ${icon}`} style={{ fontSize: 12, color: iconColor || '#fff' }} />}
            <span className="font-black text-white" style={{ fontSize: 13 }}>{value}</span>
        </div>
    </div>
);
