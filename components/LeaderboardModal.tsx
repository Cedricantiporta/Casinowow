import React, { useEffect, useState } from 'react';
import { formatCommaNumber } from '../constants';
import { fetchTopPlayers, LeaderboardEntry, LocalPlayer } from '../services/leaderboardService';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: LocalPlayer;
}

const formatScore = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return formatCommaNumber(n);
};

// Medal tint for the top three ranks; subtle chip for everyone else.
const rankStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return { background: 'linear-gradient(180deg,#ffe27a,#e8a200)', color: '#3a2600' };
    if (rank === 2) return { background: 'linear-gradient(180deg,#e8eef5,#aab6c4)', color: '#2b333c' };
    if (rank === 3) return { background: 'linear-gradient(180deg,#f0b483,#c5712f)', color: '#3a1e00' };
    return { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)' };
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, player }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setLoading(true);
        fetchTopPlayers(player).then(list => {
            if (alive) { setEntries(list); setLoading(false); }
        });
        return () => { alive = false; };
    }, [isOpen, player.score, player.level, player.name, player.avatar]);

    if (!isOpen) return null;

    const youRank = entries.findIndex(e => e.isYou) + 1;
    const you = entries.find(e => e.isYou);

    return (
        <div className="absolute inset-0 z-[200] flex flex-col animate-pop-in select-none font-nunito"
            style={{ background: 'linear-gradient(160deg,#5a18a0 0%,#40108a 50%,#2a0860 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2 relative">
                <div className="flex items-center gap-2">
                    <img src="/ui/high_roller.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                    <h2 className="font-black text-white text-base tracking-wide">Top Players</h2>
                </div>
                <div className="round-btn cursor-pointer ml-auto" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-2">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-white/60 text-sm">Loading…</div>
                ) : (
                    <div className="flex flex-col gap-1.5 max-w-[640px] mx-auto w-full">
                        {entries.map((e, i) => {
                            const rank = i + 1;
                            return (
                                <div key={e.id}
                                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
                                    style={{
                                        background: e.isYou
                                            ? 'linear-gradient(90deg,rgba(255,210,80,0.30),rgba(255,210,80,0.10))'
                                            : 'rgba(255,255,255,0.06)',
                                        boxShadow: e.isYou ? 'inset 0 0 0 1.5px rgba(255,210,80,0.55)' : undefined,
                                    }}>
                                    {/* Rank */}
                                    <div className="shrink-0 flex items-center justify-center font-black rounded-lg"
                                        style={{ width: 26, height: 26, fontSize: 12, ...rankStyle(rank) }}>
                                        {rank}
                                    </div>
                                    {/* Avatar */}
                                    <img src={e.avatar} alt="" className="shrink-0 rounded-full object-cover"
                                        style={{ width: 32, height: 32 }} />
                                    {/* Name + level */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-white truncate" style={{ fontSize: 12 }}>
                                            {e.name}{e.isYou ? ' (You)' : ''}
                                        </div>
                                        <div className="text-white/55 font-bold" style={{ fontSize: 9 }}>Level {e.level}</div>
                                    </div>
                                    {/* Score */}
                                    <div className="shrink-0 flex items-center gap-1">
                                        <img src="/new_coinicon.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                                        <span className="font-black text-yellow-300" style={{ fontSize: 12 }}>{formatScore(e.score)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Your standing — pinned summary */}
            {!loading && you && (
                <div className="shrink-0 px-3 pt-1.5 pb-2.5">
                    <div className="max-w-[640px] mx-auto flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
                        style={{ background: 'rgba(0,0,0,0.30)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' }}>
                        <div className="shrink-0 flex items-center justify-center font-black rounded-lg"
                            style={{ width: 26, height: 26, fontSize: 12, ...rankStyle(youRank) }}>{youRank}</div>
                        <img src={you.avatar} alt="" className="shrink-0 rounded-full object-cover" style={{ width: 32, height: 32 }} />
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-white truncate" style={{ fontSize: 12 }}>Your rank</div>
                            <div className="text-white/55 font-bold" style={{ fontSize: 9 }}>Level {you.level}</div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                            <img src="/new_coinicon.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                            <span className="font-black text-yellow-300" style={{ fontSize: 12 }}>{formatScore(you.score)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
