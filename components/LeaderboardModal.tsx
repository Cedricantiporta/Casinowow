import React, { useEffect, useState } from 'react';
import { formatCommaNumber, formatK } from '../constants';
import { fetchTopPlayers, getDeviceId, LeaderboardEntry, LeaderboardMetric, LocalPlayer } from '../services/leaderboardService';
import { rankInfo } from '../services/arenaService';
import { isGlowingAvatar, GLOWING_AVATAR_RING } from '../services/avatarService';
import { PlayerProfileModal } from './PlayerProfileModal';
import { GroupedList } from './GroupedList';
import { RewardChip, fmtRewardDuration } from './RewardChip';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: LocalPlayer;
    friendIds?: string[];
    pendingFriendIds?: string[];
    onAddFriend?: (entry: LeaderboardEntry) => void;
    top3DeviceIds?: string[];
}

const TABS: { key: LeaderboardMetric; label: string }[] = [
    { key: 'score',  label: 'Total Coins' },
    { key: 'level',  label: 'Top Level' },
    { key: 'arena',  label: 'Arena' },
    { key: 'maxWin', label: 'Max Win' },
    { key: 'albums', label: 'Albums' },
];

// Was '/profilepicsnew (13).png' — that's the Arena Legend-tier avatar (see
// avatarService.ts's AVATARS list), so the #1 monthly prize was quietly handing out
// a ranking-progression avatar instead of a true event-exclusive one. Every avatar
// with unlock.type 'event' is otherwise ungettable through normal progression.
export const EXCLUSIVE_AVATAR = '/profilepicsnew (12).png';

export interface RankReward { gems: number; collectDays?: number; expDays?: number; missionExpHours?: number; exclusiveAvatar?: boolean }
// Gem amounts halved from their original values.
export const RANK_REWARDS: Record<number, RankReward> = {
    1:  { gems: 5000,  collectDays: 30, expDays: 7,  missionExpHours: 72, exclusiveAvatar: true },
    2:  { gems: 2500,  collectDays: 15, expDays: 3,  missionExpHours: 24 },
    3:  { gems: 1000,  collectDays: 7,  expDays: 1,  missionExpHours: 12 },
    4:  { gems: 250,   collectDays: 1,  missionExpHours: 1 },
    5:  { gems: 250,   collectDays: 1,  missionExpHours: 1 },
    6:  { gems: 100 }, 7: { gems: 100 }, 8: { gems: 100 }, 9: { gems: 100 }, 10: { gems: 100 },
};

const fmtDuration = fmtRewardDuration;

// Always abbreviate (K/M/B/T/Qd/Qi/Sx/Sp/Oc/No) — the leaderboard's whole point is
// showing an at-a-glance scale, and raw scores here can run well past what a fixed
// "B"-only formatter (the old version of this function) was built to handle.
const formatScore = (n: number) => formatK(n, 3);

const metricOf = (e: LeaderboardEntry, m: LeaderboardMetric) =>
    m === 'level' ? e.level : m === 'arena' ? e.arenaTier : m === 'maxWin' ? e.maxWin : m === 'albums' ? e.albumStage : e.score;

// Medal treatment for the top three; soft chip for everyone else. No hard borders.
const medal = (rank: number): { bg: string; color: string; glow?: string } => {
    if (rank === 1) return { bg: 'linear-gradient(180deg,#ffe27a,#e8a200)', color: '#3a2600', glow: '0 0 10px rgba(255,200,60,0.6)' };
    if (rank === 2) return { bg: 'linear-gradient(180deg,#eef2f7,#aab6c4)', color: '#2b333c', glow: '0 0 8px rgba(200,210,230,0.4)' };
    if (rank === 3) return { bg: 'linear-gradient(180deg,#f0b483,#c5712f)', color: '#3a1e00', glow: '0 0 8px rgba(220,140,70,0.45)' };
    return { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' };
};

const Avatar: React.FC<{ src: string; size: number; ring?: string }> = ({ src, size, ring }) => {
    const base = ring || '0 2px 6px rgba(0,0,0,0.45)';
    const shadow = isGlowingAvatar(src) ? `${base}, ${GLOWING_AVATAR_RING}` : base;
    return (
        <img src={src} alt="" className="shrink-0 rounded-full object-cover"
            style={{ width: size, height: size, boxShadow: shadow }} />
    );
};

// Rankings reset with the calendar month (see App.tsx's MONTHLY_RANK reward,
// which checks for a new month on mount) — countdown to local midnight on the 1st.
const msUntilRankingReset = (now: number): number => {
    const d = new Date(now);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
    return Math.max(0, next.getTime() - now);
};
const fmtResetCountdown = (ms: number): string => {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, player, friendIds = [], pendingFriendIds = [], onAddFriend, top3DeviceIds = [] }) => {
    const [metric, setMetric] = useState<LeaderboardMetric>('score');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<{ entry: LeaderboardEntry; rank: number } | null>(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!isOpen) return;
        const t = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(t);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setLoading(true);
        fetchTopPlayers(player, metric).then(list => {
            if (alive) { setEntries(list); setLoading(false); }
        });
        return () => { alive = false; };
    }, [isOpen, metric, player.score, player.level, player.arenaTier, player.maxWin, player.albumStage, player.name, player.avatar]);

    // Persist the player's score-tab rank so monthly rewards can reference it.
    useEffect(() => {
        if (!isOpen || loading || metric !== 'score') return;
        const rank = entries.findIndex(e => e.isYou) + 1;
        if (rank > 0) {
            try { localStorage.setItem('cw_last_rank', String(rank)); } catch {}
        }
    }, [isOpen, loading, entries, metric]);

    if (!isOpen) return null;

    const youRank = entries.findIndex(e => e.isYou) + 1;
    const you = entries.find(e => e.isYou);

    const RowContent: React.FC<{ e: LeaderboardEntry; rank: number; pinned?: boolean }> = ({ e, rank, pinned }) => {
        const m = medal(rank);
        const reward = metric === 'score' && !pinned ? RANK_REWARDS[rank] : undefined;
        return (
            <>
                {rank <= 3 ? (
                    <img src={`/Rank (${rank}).png`} alt="" className="shrink-0" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                ) : (
                    <div className="shrink-0 flex items-center justify-center font-black rounded-full"
                        style={{ width: 28, height: 28, fontSize: 12, background: m.bg, color: m.color, boxShadow: m.glow }}>{rank}</div>
                )}
                <Avatar src={e.avatar} size={34} ring={rank <= 3 ? `0 0 0 2px ${rank === 1 ? '#ffd24a' : rank === 2 ? '#cdd6e2' : '#d68a48'}, 0 2px 6px rgba(0,0,0,0.45)` : undefined} />
                <div className="flex-1 min-w-0">
                    <div className="font-black truncate" style={{ fontSize: 12.5, color: top3DeviceIds.includes(e.isYou ? getDeviceId() : e.id) ? '#fde047' : '#fff' }}>{pinned ? 'Your rank' : e.name}{e.isYou && !pinned ? ' (You)' : ''}</div>
                    {(e.vipLevel ?? 0) > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                            <i className="ti ti-crown" style={{ fontSize: 9, color: '#fbbf24' }} />
                            <span className="font-bold text-amber-300" style={{ fontSize: 9 }}>VIP {e.vipLevel}</span>
                        </div>
                    )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                    {/* Score / metric value — always shown */}
                    <div className="flex items-center gap-1">
                        {(metric === 'score' || metric === 'maxWin') && <img src="/new_coinicon.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />}
                        <span className="font-black text-yellow-300" style={{ fontSize: 12 }}>
                            {metric === 'level' ? `Lv ${e.level}`
                                : metric === 'arena' ? rankInfo(e.arenaTier).label
                                : metric === 'albums' ? `Stage ${e.albumStage}`
                                : formatScore(metricOf(e, metric))}
                        </span>
                    </div>
                    {/* Monthly reward chips — horizontal row, score tab only, top 10 */}
                    {reward && (
                        <div className="flex items-center gap-1">
                            <RewardChip
                                tooltip={`${reward.gems.toLocaleString()} Gems`}
                                icon={<img src="/symbols/diamond.png" alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />}
                                label={reward.gems >= 1000 ? `${reward.gems / 1000}K` : String(reward.gems)}
                                labelColor="#fbbf24"
                            />
                            {reward.collectDays && (
                                <RewardChip
                                    tooltip={`${reward.collectDays} days 2× Collect Bonus`}
                                    icon={<img src="/ui/exp_multiplier.png" alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />}
                                    label={`${reward.collectDays}D`}
                                />
                            )}
                            {reward.expDays && (
                                <RewardChip
                                    tooltip={`${reward.expDays} days 2× XP`}
                                    icon={<img src="/topbar_levelstar.png" alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />}
                                    label={`${reward.expDays}D`}
                                />
                            )}
                            {reward.missionExpHours && (
                                <RewardChip
                                    tooltip={`${fmtDuration(reward.missionExpHours)} 2× Mission XP`}
                                    icon={<img src="/ui/missions_new.png" alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />}
                                    label={fmtDuration(reward.missionExpHours)}
                                />
                            )}
                            {reward.exclusiveAvatar && (
                                <RewardChip
                                    tooltip="Exclusive Avatar unlock"
                                    icon={<img src={EXCLUSIVE_AVATAR} alt="" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: '50%', boxShadow: '0 0 0 1.5px #a855f7' }} />}
                                    label=""
                                />
                            )}
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="absolute inset-0 z-[200] flex flex-col animate-pop-in select-none font-nunito"
            style={{ background: 'radial-gradient(120% 80% at 50% 0%, #6a1eb0 0%, #40108a 45%, #220650 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
                <img src="/ui/high_roller.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                <h2 className="font-black text-white text-base tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>Top Players</h2>
                <span className="ml-auto font-bold" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Resets {fmtResetCountdown(msUntilRankingReset(now))}</span>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x" /></div>
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

            {/* List — one continuous inbox-style group instead of separate cards */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-2">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-white/55 text-sm">Loading…</div>
                ) : (
                    <div className="max-w-[640px] mx-auto w-full">
                        <GroupedList
                            items={entries}
                            keyFn={e => e.id}
                            rowBackground={e => e.isYou ? 'linear-gradient(90deg,rgba(255,205,70,0.30),rgba(255,150,40,0.10))' : undefined}
                            rowBoxShadow={e => e.isYou ? 'inset 0 1px 0 rgba(255,235,170,0.35), 0 2px 10px rgba(255,180,40,0.15)' : undefined}
                            renderRow={(e, i) => (
                                <button onClick={() => setSelected({ entry: e, rank: i + 1 })}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left active:scale-[0.99] transition-transform">
                                    <RowContent e={e} rank={i + 1} />
                                </button>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Your standing — pinned summary, kept as its own card outside the list */}
            {!loading && you && (
                <div className="shrink-0 px-3 pt-1.5 pb-3">
                    <div className="max-w-[640px] mx-auto rounded-2xl px-3 py-2 flex items-center gap-2.5"
                        style={{
                            background: 'linear-gradient(90deg,rgba(255,205,70,0.30),rgba(255,150,40,0.10))',
                            boxShadow: 'inset 0 1px 0 rgba(255,235,170,0.35), 0 2px 10px rgba(255,180,40,0.15)',
                        }}>
                        <RowContent e={you} rank={youRank} pinned />
                    </div>
                </div>
            )}

            {selected && (
                <PlayerProfileModal
                    isOpen
                    id={selected.entry.id}
                    name={selected.entry.name}
                    avatar={selected.entry.avatar}
                    level={selected.entry.level}
                    rank={selected.rank}
                    isYou={selected.entry.isYou}
                    onClose={() => setSelected(null)}
                    isFriend={friendIds.includes(selected.entry.id)}
                    isPending={pendingFriendIds.includes(selected.entry.id)}
                    isTop3={top3DeviceIds.includes(selected.entry.isYou ? getDeviceId() : selected.entry.id)}
                    onAddFriend={onAddFriend ? () => onAddFriend(selected.entry) : undefined}
                />
            )}
        </div>
    );
};
