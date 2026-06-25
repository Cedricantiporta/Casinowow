import React, { useEffect, useState } from 'react';
import { formatCommaNumber } from '../constants';
import { fetchTopPlayers, LeaderboardEntry, LeaderboardMetric, LocalPlayer } from '../services/leaderboardService';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: LocalPlayer;
}

const TABS: { key: LeaderboardMetric; label: string }[] = [
    { key: 'score',      label: 'Total Coins' },
    { key: 'totalWon',   label: 'Total Won' },
    { key: 'maxJackpot', label: 'Max Jackpot' },
    { key: 'maxWin',     label: 'Max Win' },
];

const formatScore = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return formatCommaNumber(n);
};

const metricOf = (e: LeaderboardEntry, m: LeaderboardMetric) =>
    m === 'totalWon' ? e.totalWon : m === 'maxJackpot' ? e.maxJackpot : m === 'maxWin' ? e.maxWin : e.score;

// Medal treatment for the top three; soft chip for everyone else. No hard borders.
const medal = (rank: number): { bg: string; color: string; glow?: string } => {
    if (rank === 1) return { bg: 'linear-gradient(180deg,#ffe27a,#e8a200)', color: '#3a2600', glow: '0 0 10px rgba(255,200,60,0.6)' };
    if (rank === 2) return { bg: 'linear-gradient(180deg,#eef2f7,#aab6c4)', color: '#2b333c', glow: '0 0 8px rgba(200,210,230,0.4)' };
    if (rank === 3) return { bg: 'linear-gradient(180deg,#f0b483,#c5712f)', color: '#3a1e00', glow: '0 0 8px rgba(220,140,70,0.45)' };
    return { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' };
};

const Avatar: React.FC<{ src: string; size: number; ring?: string }> = ({ src, size, ring }) => (
    <img src={src} alt="" className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: ring || '0 2px 6px rgba(0,0,0,0.45)' }} />
);

// Profile card for any player on the board (no recent slots — not available for others).
const PlayerCard: React.FC<{ entry: LeaderboardEntry; rank: number; onClose: () => void }> = ({ entry, rank, onClose }) => {
    const hero = { icon: '/new_coinicon.png', label: 'Total Coins', value: entry.score };
    const rows: { icon: string; label: string; value: number }[] = [
        { icon: '/symbols/diamond.png', label: 'Total Gems', value: entry.gems },
        { icon: '/new_coinicon.png', label: 'Total Won', value: entry.totalWon },
        { icon: '/ui/high_roller.png', label: 'Max Jackpot', value: entry.maxJackpot },
        { icon: '/ui/high_roller.png', label: 'Max Win', value: entry.maxWin },
    ];
    const m = medal(rank);
    return (
        <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-pop-in"
            onClick={onClose}>
            <div className="w-full max-w-[330px] rounded-3xl overflow-hidden font-nunito"
                style={{ background: 'linear-gradient(170deg,#5a18a0 0%,#40108a 55%,#28085e 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.45), 0 12px 40px rgba(0,0,0,0.7)' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="relative px-4 pt-4 pb-4"
                    style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.10),transparent)' }}>
                    <div className="round-btn cursor-pointer absolute top-3 right-3" onClick={onClose}><i className="ti ti-x" /></div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <Avatar src={entry.avatar} size={64} ring="0 0 0 3px rgba(255,255,255,0.18), 0 4px 12px rgba(0,0,0,0.5)" />
                            <div className="absolute -bottom-1 -right-1 flex items-center justify-center font-black rounded-full"
                                style={{ width: 24, height: 24, fontSize: 11, ...{ background: m.bg, color: m.color }, boxShadow: m.glow || '0 2px 4px rgba(0,0,0,0.5)' }}>{rank}</div>
                        </div>
                        <div className="text-center">
                            <div className="font-black text-white" style={{ fontSize: 15 }}>{entry.name}{entry.isYou ? ' (You)' : ''}</div>
                            <div className="text-white/55 font-bold" style={{ fontSize: 10 }}>Level {entry.level}</div>
                        </div>
                    </div>
                </div>
                {/* Stats — hero tile + 2×2 grid of soft tiles, no borders */}
                <div className="px-3 pb-4 flex flex-col gap-2">
                    <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2"
                        style={{ background: 'linear-gradient(90deg,rgba(255,205,70,0.20),rgba(255,150,40,0.06))', boxShadow: 'inset 0 1px 0 rgba(255,235,170,0.18)' }}>
                        <img src={hero.icon} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                        <span className="flex-1 font-bold text-white/70" style={{ fontSize: 11 }}>{hero.label}</span>
                        <span className="font-black text-yellow-300" style={{ fontSize: 17 }}>{formatScore(hero.value)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {rows.map((r, i) => (
                            <div key={i} className="rounded-2xl px-3 py-2.5 flex flex-col gap-1"
                                style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                                <span className="font-bold text-white/55" style={{ fontSize: 9.5 }}>{r.label}</span>
                                <div className="flex items-center gap-1.5">
                                    <img src={r.icon} alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                                    <span className="font-black text-yellow-300" style={{ fontSize: 14 }}>{formatScore(r.value)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
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

    const Row: React.FC<{ e: LeaderboardEntry; rank: number; pinned?: boolean }> = ({ e, rank, pinned }) => {
        const m = medal(rank);
        return (
            <button onClick={() => setSelected({ entry: e, rank })}
                className="w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left active:scale-[0.99] transition-transform"
                style={{
                    background: e.isYou
                        ? 'linear-gradient(90deg,rgba(255,205,70,0.30),rgba(255,150,40,0.10))'
                        : 'linear-gradient(90deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))',
                    boxShadow: e.isYou
                        ? 'inset 0 1px 0 rgba(255,235,170,0.35), 0 2px 10px rgba(255,180,40,0.15)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>
                <div className="shrink-0 flex items-center justify-center font-black rounded-full"
                    style={{ width: 28, height: 28, fontSize: 12, background: m.bg, color: m.color, boxShadow: m.glow }}>{rank}</div>
                <Avatar src={e.avatar} size={34} ring={rank <= 3 ? `0 0 0 2px ${rank === 1 ? '#ffd24a' : rank === 2 ? '#cdd6e2' : '#d68a48'}, 0 2px 6px rgba(0,0,0,0.45)` : undefined} />
                <div className="flex-1 min-w-0">
                    <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{pinned ? 'Your rank' : e.name}{e.isYou && !pinned ? ' (You)' : ''}</div>
                    <div className="text-white/50 font-bold" style={{ fontSize: 9 }}>Level {e.level}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                    <img src="/new_coinicon.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                    <span className="font-black text-yellow-300" style={{ fontSize: 13 }}>{formatScore(metricOf(e, metric))}</span>
                </div>
            </button>
        );
    };

    return (
        <div className="absolute inset-0 z-[200] flex flex-col animate-pop-in select-none font-nunito"
            style={{ background: 'radial-gradient(120% 80% at 50% 0%, #6a1eb0 0%, #40108a 45%, #220650 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
                <img src="/ui/high_roller.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                <h2 className="font-black text-white text-base tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>Top Players</h2>
                <div className="round-btn cursor-pointer ml-auto" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Tabs — segmented pills, no borders */}
            <div className="shrink-0 px-3 pb-2">
                <div className="max-w-[640px] mx-auto flex gap-1.5 p-1 rounded-2xl"
                    style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
                    {TABS.map(t => {
                        const active = metric === t.key;
                        return (
                            <button key={t.key} onClick={() => setMetric(t.key)}
                                className="flex-1 rounded-xl py-1.5 px-1 transition-all active:scale-95"
                                style={{
                                    background: active ? 'linear-gradient(180deg,#ffe27a,#e8a200)' : 'transparent',
                                    boxShadow: active ? '0 2px 8px rgba(255,190,40,0.4)' : undefined,
                                }}>
                                <span className="font-black block leading-tight"
                                    style={{ fontSize: 9.5, color: active ? '#3a2600' : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-2">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-white/55 text-sm">Loading…</div>
                ) : (
                    <div className="flex flex-col gap-1.5 max-w-[640px] mx-auto w-full">
                        {entries.map((e, i) => <Row key={e.id} e={e} rank={i + 1} />)}
                    </div>
                )}
            </div>

            {/* Your standing — pinned summary */}
            {!loading && you && (
                <div className="shrink-0 px-3 pt-1.5 pb-3">
                    <div className="max-w-[640px] mx-auto">
                        <Row e={you} rank={youRank} pinned />
                    </div>
                </div>
            )}

            {selected && <PlayerCard entry={selected.entry} rank={selected.rank} onClose={() => setSelected(null)} />}
        </div>
    );
};
