import React, { useEffect, useState } from 'react';
import { formatCommaNumber } from '../constants';
import { fetchTopPlayers, LeaderboardEntry, LeaderboardMetric, LocalPlayer } from '../services/leaderboardService';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: LocalPlayer;
}

const TABS: { key: LeaderboardMetric; label: string; icon: string }[] = [
    { key: 'score',      label: 'Total Coins', icon: '/new_coinicon.png' },
    { key: 'totalWon',   label: 'Total Won',   icon: '/new_coinicon.png' },
    { key: 'maxJackpot', label: 'Max Jackpot', icon: '/ui/high_roller.png' },
    { key: 'maxWin',     label: 'Max Win',     icon: '/ui/high_roller.png' },
];

const formatScore = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return formatCommaNumber(n);
};

const metricOf = (e: LeaderboardEntry, m: LeaderboardMetric) =>
    m === 'totalWon' ? e.totalWon : m === 'maxJackpot' ? e.maxJackpot : m === 'maxWin' ? e.maxWin : e.score;

// Medal tint for the top three ranks; subtle chip for everyone else.
const rankStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return { background: 'linear-gradient(180deg,#ffe27a,#e8a200)', color: '#3a2600' };
    if (rank === 2) return { background: 'linear-gradient(180deg,#e8eef5,#aab6c4)', color: '#2b333c' };
    if (rank === 3) return { background: 'linear-gradient(180deg,#f0b483,#c5712f)', color: '#3a1e00' };
    return { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)' };
};

// Profile card for any player on the board (no recent slots — not available for others).
const PlayerCard: React.FC<{ entry: LeaderboardEntry; rank: number; onClose: () => void }> = ({ entry, rank, onClose }) => {
    const rows: { icon: string; label: string; value: number }[] = [
        { icon: '/new_coinicon.png', label: 'Total Coins', value: entry.score },
        { icon: '/new_coinicon.png', label: 'Total Won', value: entry.totalWon },
        { icon: '/ui/high_roller.png', label: 'Max Jackpot', value: entry.maxJackpot },
        { icon: '/ui/high_roller.png', label: 'Max Win', value: entry.maxWin },
    ];
    return (
        <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-pop-in"
            onClick={onClose}>
            <div className="w-full max-w-[320px] rounded-3xl overflow-hidden font-nunito"
                style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-3">
                    <img src={entry.avatar} alt="" className="rounded-full object-cover shrink-0"
                        style={{ width: 48, height: 48, boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }} />
                    <div className="flex-1 min-w-0">
                        <div className="font-black text-white truncate" style={{ fontSize: 14 }}>{entry.name}{entry.isYou ? ' (You)' : ''}</div>
                        <div className="text-white/60 font-bold" style={{ fontSize: 10 }}>Level {entry.level} · Rank #{rank}</div>
                    </div>
                    <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x" /></div>
                </div>
                {/* Stats */}
                <div className="px-3 pb-3 flex flex-col">
                    {rows.map((r, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-2.5"
                            style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)', padding: '9px 10px',
                                borderRadius: i === 0 ? '12px 12px 0 0' : i === rows.length - 1 ? '0 0 12px 12px' : 0,
                                marginTop: i === 0 ? 0 : 1 }}>
                            <img src={r.icon} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                            <span className="flex-1 font-bold text-white/85" style={{ fontSize: 11 }}>{r.label}</span>
                            <span className="font-black text-yellow-300" style={{ fontSize: 12 }}>{formatScore(r.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, player }) => {
    const [metric, setMetric] = useState<LeaderboardMetric>('score');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<{ entry: LeaderboardEntry; rank: number } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setLoading(true);
        fetchTopPlayers(player, metric).then(list => {
            if (alive) { setEntries(list); setLoading(false); }
        });
        return () => { alive = false; };
    }, [isOpen, metric, player.score, player.totalWon, player.maxJackpot, player.maxWin, player.level, player.name, player.avatar]);

    if (!isOpen) return null;

    const youRank = entries.findIndex(e => e.isYou) + 1;
    const you = entries.find(e => e.isYou);

    return (
        <div className="absolute inset-0 z-[200] flex flex-col animate-pop-in select-none font-nunito"
            style={{ background: 'linear-gradient(160deg,#5a18a0 0%,#40108a 50%,#2a0860 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                    <img src="/ui/high_roller.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                    <h2 className="font-black text-white text-base tracking-wide">Top Players</h2>
                </div>
                <div className="round-btn cursor-pointer ml-auto" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-3 pb-1.5">
                <div className="max-w-[640px] mx-auto flex gap-1">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setMetric(t.key)}
                            className="flex-1 rounded-lg py-1.5 px-1 transition-colors"
                            style={{
                                background: metric === t.key ? 'rgba(255,210,80,0.22)' : 'rgba(255,255,255,0.06)',
                                boxShadow: metric === t.key ? 'inset 0 0 0 1.5px rgba(255,210,80,0.55)' : undefined,
                            }}>
                            <span className="font-black text-white block leading-tight"
                                style={{ fontSize: 9.5, opacity: metric === t.key ? 1 : 0.65 }}>{t.label}</span>
                        </button>
                    ))}
                </div>
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
                                <button key={e.id} onClick={() => setSelected({ entry: e, rank })}
                                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left active:scale-[0.99] transition-transform"
                                    style={{
                                        background: e.isYou
                                            ? 'linear-gradient(90deg,rgba(255,210,80,0.30),rgba(255,210,80,0.10))'
                                            : 'rgba(255,255,255,0.06)',
                                        boxShadow: e.isYou ? 'inset 0 0 0 1.5px rgba(255,210,80,0.55)' : undefined,
                                    }}>
                                    <div className="shrink-0 flex items-center justify-center font-black rounded-lg"
                                        style={{ width: 26, height: 26, fontSize: 12, ...rankStyle(rank) }}>{rank}</div>
                                    <img src={e.avatar} alt="" className="shrink-0 rounded-full object-cover" style={{ width: 32, height: 32 }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-white truncate" style={{ fontSize: 12 }}>{e.name}{e.isYou ? ' (You)' : ''}</div>
                                        <div className="text-white/55 font-bold" style={{ fontSize: 9 }}>Level {e.level}</div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1">
                                        <img src="/new_coinicon.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                                        <span className="font-black text-yellow-300" style={{ fontSize: 12 }}>{formatScore(metricOf(e, metric))}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Your standing — pinned summary */}
            {!loading && you && (
                <div className="shrink-0 px-3 pt-1.5 pb-2.5">
                    <button onClick={() => setSelected({ entry: you, rank: youRank })}
                        className="w-full max-w-[640px] mx-auto flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left"
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
                            <span className="font-black text-yellow-300" style={{ fontSize: 12 }}>{formatScore(metricOf(you, metric))}</span>
                        </div>
                    </button>
                </div>
            )}

            {selected && <PlayerCard entry={selected.entry} rank={selected.rank} onClose={() => setSelected(null)} />}
        </div>
    );
};
