import React, { useEffect, useState } from 'react';
import { formatK } from '../constants';
import { getPlayerById, LeaderboardEntry } from '../services/leaderboardService';
import { rankInfo } from '../services/arenaService';

export interface PlayerProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    id: string;
    name: string;
    avatar: string;
    level?: number;
    rank?: number; // shown as a medal/rank badge when provided (e.g. leaderboard, top guilds)
    guildName?: string;
    isYou?: boolean;
    isFriend?: boolean;
    isPending?: boolean;
    isTop3?: boolean;
    onAddFriend?: () => void;
}

const formatScore = (n: number) => formatK(n, 3);

const medal = (rank: number): { bg: string; color: string; glow?: string } => {
    if (rank === 1) return { bg: 'linear-gradient(180deg,#ffe27a,#e8a200)', color: '#3a2600', glow: '0 0 10px rgba(255,200,60,0.6)' };
    if (rank === 2) return { bg: 'linear-gradient(180deg,#eef2f7,#aab6c4)', color: '#2b333c', glow: '0 0 8px rgba(200,210,230,0.4)' };
    if (rank === 3) return { bg: 'linear-gradient(180deg,#f0b483,#c5712f)', color: '#3a1e00', glow: '0 0 8px rgba(220,140,70,0.45)' };
    return { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' };
};

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
    isOpen, onClose, id, name, avatar, level, rank, guildName, isYou, isFriend, isPending, isTop3, onAddFriend,
}) => {
    const [stats, setStats] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) { setStats(null); return; }
        setLoading(true);
        getPlayerById(id).then(s => { setStats(s); setLoading(false); });
    }, [isOpen, id]);

    if (!isOpen) return null;

    const displayLevel = stats?.level ?? level ?? 1;
    const rows: { icon: string; label: string; value: number; display?: string }[] = stats ? [
        { icon: '/symbols/diamond.png',  label: 'Total Gems',  value: stats.gems },
        { icon: '/new_coinicon.png',     label: 'Total Won',   value: stats.totalWon },
        { icon: '/ui/high_roller.png',   label: 'Arena Rank',  value: stats.arenaTier, display: rankInfo(stats.arenaTier).label },
        { icon: '/ui/high_roller.png',   label: 'Max Win',     value: stats.maxWin },
    ] : [];
    const m = medal(rank || 0);

    return (
        <div className="absolute inset-0 z-[260] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-pop-in"
            onClick={onClose}>
            <div className="w-full max-w-[330px] rounded-3xl overflow-hidden font-nunito"
                style={{ background: 'linear-gradient(170deg,#5a18a0 0%,#40108a 55%,#28085e 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.45), 0 12px 40px rgba(0,0,0,0.7)' }}
                onClick={e => e.stopPropagation()}>
                <div className="relative px-4 pt-4 pb-4" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.10),transparent)' }}>
                    <div className="round-btn cursor-pointer absolute top-3 right-3" onClick={onClose}><i className="ti ti-x" /></div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <img src={avatar} alt="" className="shrink-0 rounded-full object-cover" style={{ width: 64, height: 64, boxShadow: '0 0 0 3px rgba(255,255,255,0.18), 0 4px 12px rgba(0,0,0,0.5)' }} />
                                {rank ? (
                                    rank <= 3 ? (
                                        <img src={`/Rank (${rank}).png`} alt="" className="absolute -bottom-1 -right-1" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                                    ) : (
                                        <div className="absolute -bottom-1 -right-1 flex items-center justify-center font-black rounded-full"
                                            style={{ width: 24, height: 24, fontSize: 11, background: m.bg, color: m.color, boxShadow: m.glow || '0 2px 4px rgba(0,0,0,0.5)' }}>{rank}</div>
                                    )
                                ) : null}
                            </div>
                            <div className="flex flex-col items-start gap-1 min-w-0">
                                <div className="font-black truncate" style={{ fontSize: 15, color: isTop3 ? '#fde047' : '#fff' }}>{name}{isYou ? ' (You)' : ''}</div>
                                <div className="text-white/55 font-bold" style={{ fontSize: 10 }}>Level {displayLevel}</div>
                                {guildName && (
                                    <div className="flex items-center gap-1">
                                        <i className="ti ti-shield text-white/45" style={{ fontSize: 10 }} />
                                        <span className="text-white/45 font-bold" style={{ fontSize: 9.5 }}>{guildName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {!isYou && onAddFriend && (
                            <button
                                onClick={(isFriend || isPending) ? undefined : onAddFriend}
                                disabled={isFriend || isPending}
                                className={(isFriend || isPending) ? 'pill-green' : 'pill-blue'}
                                style={{ opacity: (isFriend || isPending) ? 0.5 : 1 }}>
                                <div className="pill-face" style={{ padding: '6px 16px', fontSize: '10px', background: (isFriend || isPending) ? undefined : 'linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)' }}>
                                    {isFriend
                                        ? (<><i className="ti ti-check" style={{ marginRight: 4 }} />Friend</>)
                                        : isPending
                                        ? (<><i className="ti ti-clock" style={{ marginRight: 4 }} />Request Sent</>)
                                        : (<><i className="ti ti-user-plus" style={{ marginRight: 4 }} />Add Friend</>)}
                                </div>
                            </button>
                        )}
                    </div>
                </div>
                <div className="px-3 pb-4 flex flex-col gap-2">
                    {loading ? (
                        <div className="text-center text-white/45 font-bold py-4" style={{ fontSize: 11 }}>Loading stats…</div>
                    ) : stats ? (
                        <>
                            <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2"
                                style={{ background: 'linear-gradient(90deg,rgba(255,205,70,0.20),rgba(255,150,40,0.06))', boxShadow: 'inset 0 1px 0 rgba(255,235,170,0.18)' }}>
                                <img src="/new_coinicon.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                                <span className="flex-1 font-bold text-white/70" style={{ fontSize: 11 }}>Total Coins</span>
                                <span className="font-black text-yellow-300" style={{ fontSize: 17 }}>{formatScore(stats.score)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {rows.map((r, i) => (
                                    <div key={i} className="rounded-2xl px-3 py-2.5 flex flex-col gap-1"
                                        style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                                        <span className="font-bold text-white/55" style={{ fontSize: 9.5 }}>{r.label}</span>
                                        <div className="flex items-center gap-1.5">
                                            <img src={r.icon} alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                                            <span className="font-black text-yellow-300" style={{ fontSize: 14 }}>{r.display ?? formatScore(r.value)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-white/40 font-bold py-4" style={{ fontSize: 11 }}>No public stats available</div>
                    )}
                </div>
            </div>
        </div>
    );
};
