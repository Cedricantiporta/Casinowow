import React, { useEffect, useState } from 'react';
import { Guild, GuildDonationState, GuildRole, GuildSummary, GuildTask } from '../types';
import { GUILD_ICONS, GUILD_MAX_LEVEL, GUILD_MAX_MEMBERS, guildXpForNextLevel, rewardTierForRank, getGuildById } from '../services/guildService';
import { formatKShort, formatCommaNumber } from '../constants';
import { PlayerProfileModal } from './PlayerProfileModal';
import { GroupedList } from './GroupedList';

const timeAgo = (ms: number): string => {
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

interface GuildModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string;
    myGuild: Guild | null;
    topGuildsByLevel: GuildSummary[];
    topGuildsByContribution: GuildSummary[];
    loading: boolean;
    searchResults: GuildSummary[];
    onSearch: (query: string) => void;
    onCreate: (name: string, description: string, icon: string, color: string, isOpen: boolean) => void;
    onJoin: (guildId: string) => void;
    onLeave: () => void;
    onDisband: () => void;
    onTransferLeadership: (toDeviceId: string) => void;
    onKick: (deviceId: string) => void;
    onSetRole: (deviceId: string, role: 'OFFICER' | 'MEMBER') => void;
    onUpdateDescription: (description: string) => void;
    createCostGems: number;
    playerBalance: number;
    playerGems: number;
    tasks: GuildTask[];
    onClaimTask: (taskId: string) => void;
    refreshCostFor: (task: GuildTask) => number;
    onRefreshTask: (taskId: string) => void;
    donationState: GuildDonationState;
    donateCoinAmount: number;
    donateGemAmount: number;
    onDonate: (kind: 'COINS' | 'GEMS') => void;
    errorMsg?: string;
    friendIds: string[];
    pendingFriendIds: string[];
    onAddFriend: (member: { id: string; name: string; avatar: string; level: number }) => void;
}

const RANK_BADGE = (rank: number) => rank <= 3 ? `/Rank (${rank}).png` : null;
const ROLE_RANK: Record<GuildRole, number> = { LEADER: 0, OFFICER: 1, MEMBER: 2 };

export const GuildModal: React.FC<GuildModalProps> = ({
    isOpen, onClose, deviceId, myGuild, topGuildsByLevel, topGuildsByContribution, loading, searchResults, onSearch, onCreate, onJoin, onLeave, onDisband,
    onTransferLeadership, onKick, onSetRole, onUpdateDescription, createCostGems, playerBalance, playerGems,
    tasks, onClaimTask, refreshCostFor, onRefreshTask, donationState, donateCoinAmount, donateGemAmount, onDonate, errorMsg,
    friendIds, pendingFriendIds, onAddFriend,
}) => {
    const [browseTab, setBrowseTab] = useState<'BROWSE' | 'CREATE' | 'TOP'>('BROWSE');
    const [rightTab, setRightTab] = useState<'MEMBERS' | 'TASKS' | 'TOP'>('MEMBERS');
    const [topSubTab, setTopSubTab] = useState<'LEVEL' | 'CONTRIBUTION'>('CONTRIBUTION');
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconIdx, setIconIdx] = useState(0);
    const [openJoin, setOpenJoin] = useState(true);
    const [confirmAction, setConfirmAction] = useState<string | null>(null);
    const [editingDesc, setEditingDesc] = useState(false);
    const [descDraft, setDescDraft] = useState('');
    const [pickingSuccessor, setPickingSuccessor] = useState(false);
    const [profileTarget, setProfileTarget] = useState<{ id: string; name: string; avatar: string; level: number } | null>(null);
    const [actionsOpenFor, setActionsOpenFor] = useState<string | null>(null);
    const [rightBrowseTab, setRightBrowseTab] = useState<'RECOMMENDED' | 'TOP'>('RECOMMENDED');
    const [viewingGuildId, setViewingGuildId] = useState<string | null>(null);
    const [viewingGuild, setViewingGuild] = useState<Guild | null>(null);
    const [viewingLoading, setViewingLoading] = useState(false);

    useEffect(() => {
        if (!viewingGuildId) { setViewingGuild(null); return; }
        setViewingLoading(true);
        getGuildById(viewingGuildId).then(g => { setViewingGuild(g); setViewingLoading(false); });
    }, [viewingGuildId]);

    useEffect(() => {
        if (!isOpen || myGuild) return;
        const t = setTimeout(() => onSearch(search), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, myGuild, search]);

    if (!isOpen) return null;

    const me = myGuild?.members.find(m => m.deviceId === deviceId);
    const myRole: GuildRole = me?.role || 'MEMBER';
    const xpNeeded = myGuild ? guildXpForNextLevel(myGuild.level) : 0;
    const xpPct = myGuild ? Math.min(100, (myGuild.xp / xpNeeded) * 100) : 0;
    const atMaxLevel = !!myGuild && myGuild.level >= GUILD_MAX_LEVEL;

    const TopGuildsList: React.FC<{ onSelect?: (id: string) => void }> = ({ onSelect }) => {
        const list = topSubTab === 'LEVEL' ? topGuildsByLevel : topGuildsByContribution;
        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.28)' }}>
                    {(['CONTRIBUTION', 'LEVEL'] as const).map(k => (
                        <button key={k} onClick={() => setTopSubTab(k)}
                            className="flex-1 rounded-xl py-1 px-1 transition-all active:scale-95"
                            style={{ background: topSubTab === k ? 'linear-gradient(180deg,#52c215,#35900a 50%,#246606)' : 'transparent' }}>
                            <span className="font-black block" style={{ fontSize: 9.5, color: topSubTab === k ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                                {k === 'LEVEL' ? 'Top Level' : 'Top Contribution'}
                            </span>
                        </button>
                    ))}
                </div>
                <GroupedList
                    items={list}
                    keyFn={g => g.id}
                    emptyText="No ranked guilds yet"
                    rowBackground={g => myGuild?.id === g.id ? 'rgba(74,222,128,0.14)' : undefined}
                    rowBoxShadow={g => myGuild?.id === g.id ? 'inset 0 0 0 1px rgba(74,222,128,0.35)' : undefined}
                    renderRow={(g, i) => {
                        const rank = i + 1;
                        const badge = RANK_BADGE(rank);
                        const isMine = myGuild?.id === g.id;
                        const tier = topSubTab === 'CONTRIBUTION' ? rewardTierForRank(rank) : null;
                        return (
                            <button onClick={() => onSelect?.(g.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left">
                                <div className="w-7 flex items-center justify-center shrink-0">
                                    {badge ? <img src={badge} alt="" style={{ width: 27, height: 27, objectFit: 'contain' }} /> : <span className="font-black text-white/70" style={{ fontSize: 12 }}>{rank}</span>}
                                </div>
                                <div className={`shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br ${g.color}`} style={{ width: 34, height: 34 }}>
                                    <img src={g.icon} alt="" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{g.name}{isMine && <span className="text-green-400" style={{ fontSize: 9 }}> (Yours)</span>}</div>
                                    <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>
                                        {topSubTab === 'LEVEL' ? `Lvl ${g.level}/${GUILD_MAX_LEVEL}` : `${formatKShort(g.contributionPoints)} Contribution`} · {g.memberCount} members
                                    </div>
                                    {tier && (
                                        <div className="font-bold text-yellow-300/80 mt-0.5" style={{ fontSize: 8.5 }}>
                                            Reward: {tier.betMult}x Bet + {formatCommaNumber(tier.gems)} Gems
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    }}
                />
                <div className="text-center text-white/35 font-bold pt-1" style={{ fontSize: 9 }}>Top 10 by Contribution earn monthly rewards for every member</div>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-[150] flex flex-col select-none"
            style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)' }}>

            {/* Header — plain text, no pill container */}
            <div className="shrink-0 flex items-center justify-center px-4 pt-3 pb-2 relative">
                <div className="round-btn cursor-pointer absolute left-4" onClick={onClose}><i className="ti ti-arrow-left" /></div>
                <h2 className="font-tanker text-white tracking-wide" style={{ fontSize: 16 }}>Guild</h2>
            </div>

            {errorMsg && (
                <div className="shrink-0 mx-3 mb-2 rounded-xl px-3 py-1.5 text-center" style={{ background: 'rgba(239,68,68,0.25)' }}>
                    <span className="font-bold text-white" style={{ fontSize: 10.5 }}>{errorMsg}</span>
                </div>
            )}

            {/* NO GUILD — 2-column: branding + Create on the left, a guild list on the right */}
            {!myGuild && (
                <div className="flex-1 flex gap-2 overflow-hidden px-3 pb-3">
                    <div className="w-[34%] shrink-0 flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center" style={{ background: 'rgba(0,0,0,0.18)' }}>
                        <div className="rounded-full flex items-center justify-center bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-900" style={{ width: 88, height: 88 }}>
                            <img src="/Lobby_arena.png" alt="" style={{ width: '68%', height: '68%', objectFit: 'contain' }} />
                        </div>
                        <button onClick={() => setBrowseTab('CREATE')} className="pill-green w-full">
                            <div className="pill-face" style={{ padding: '8px 8px', fontSize: '12px' }}>Create</div>
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                        <div className="shrink-0 flex gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.28)' }}>
                            {([{ key: 'RECOMMENDED' as const, label: 'Guilds' }, { key: 'TOP' as const, label: 'Rankings' }]).map(t => (
                                <button key={t.key} onClick={() => setRightBrowseTab(t.key)}
                                    className="flex-1 relative rounded-xl py-1.5 px-1 transition-all active:scale-95"
                                    style={{ background: rightBrowseTab === t.key ? 'linear-gradient(180deg,#52c215,#35900a 50%,#246606)' : 'transparent' }}>
                                    <span className="font-black block leading-tight" style={{ fontSize: 10, color: rightBrowseTab === t.key ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5">
                            {rightBrowseTab === 'RECOMMENDED' && (
                                <>
                                    <input
                                        value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Search guilds…"
                                        className="w-full rounded-full px-3 py-1.5 text-white font-bold outline-none mb-0.5"
                                        style={{ background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', fontSize: 12 }}
                                    />
                                    {loading ? (
                                        <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold py-10">Loading…</div>
                                    ) : (
                                        <GroupedList
                                            items={searchResults}
                                            keyFn={g => g.id}
                                            emptyText='No guilds found — tap "Create" to start your own.'
                                            renderRow={g => (
                                                <button onClick={() => setViewingGuildId(g.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left">
                                                    <div className={`shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br ${g.color}`} style={{ width: 38, height: 38 }}>
                                                        <img src={g.icon} alt="" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{g.name}</div>
                                                        <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Lvl {g.level}/{GUILD_MAX_LEVEL} · {g.memberCount} members{!g.isOpen ? ' · Invite Only' : ''}</div>
                                                    </div>
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); if (g.isOpen) onJoin(g.id); }}
                                                        className="pill-green shrink-0"
                                                        style={{ opacity: g.isOpen ? 1 : 0.4, pointerEvents: g.isOpen ? 'auto' : 'none' }}>
                                                        <div className="pill-face" style={{ padding: '5px 14px', fontSize: '10px' }}>Join</div>
                                                    </div>
                                                </button>
                                            )}
                                        />
                                    )}
                                </>
                            )}
                            {rightBrowseTab === 'TOP' && <TopGuildsList onSelect={setViewingGuildId} />}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE — popup modal, not a full-page swap */}
            {!myGuild && browseTab === 'CREATE' && (
                <div className="absolute inset-0 z-[220] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-pop-in"
                    onClick={() => setBrowseTab('BROWSE')}>
                <div className="w-full max-w-[320px] rounded-3xl overflow-y-auto no-scrollbar p-4 flex flex-col gap-3"
                    onClick={e => e.stopPropagation()}
                    style={{ maxHeight: '85%', background: 'linear-gradient(170deg,#5a18a0 0%,#40108a 55%,#28085e 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.45), 0 12px 40px rgba(0,0,0,0.7)' }}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-tanker text-white" style={{ fontSize: 14 }}>Create Guild</h3>
                        <div className="round-btn cursor-pointer" onClick={() => setBrowseTab('BROWSE')}><i className="ti ti-x" /></div>
                    </div>
                    <div className="flex justify-center gap-2 flex-wrap">
                        {GUILD_ICONS.map((opt, i) => (
                            <div key={i} onClick={() => setIconIdx(i)}
                                className={`rounded-full flex items-center justify-center bg-gradient-to-br ${opt.color} cursor-pointer transition-transform`}
                                style={{ width: 40, height: 40, transform: iconIdx === i ? 'scale(1.15)' : 'scale(1)', boxShadow: iconIdx === i ? '0 0 0 2px rgba(255,255,255,0.7)' : 'none' }}>
                                <img src={opt.icon} alt="" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
                            </div>
                        ))}
                    </div>
                    <input
                        value={name} onChange={e => setName(e.target.value.slice(0, 24))}
                        placeholder="Guild name"
                        className="w-full rounded-full px-3 py-2 text-white font-bold outline-none"
                        style={{ background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', fontSize: 12 }}
                    />
                    <textarea
                        value={description} onChange={e => setDescription(e.target.value.slice(0, 200))}
                        placeholder="Guild banner — announcements, recruiting info, etc. (optional)"
                        rows={3}
                        className="w-full rounded-2xl px-3 py-2 text-white font-bold outline-none resize-none"
                        style={{ background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', fontSize: 11.5 }}
                    />
                    <div className="flex items-center justify-between rounded-2xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.22)' }}>
                        <span className="font-bold text-white/80" style={{ fontSize: 11.5 }}>Anyone can join</span>
                        <div onClick={() => setOpenJoin(v => !v)} className="cursor-pointer rounded-full relative shrink-0" style={{ width: 38, height: 22, background: openJoin ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>
                            <div className="absolute rounded-full bg-white transition-all" style={{ width: 18, height: 18, top: 2, left: openJoin ? 18 : 2 }} />
                        </div>
                    </div>
                    <button
                        onClick={() => name.trim() && playerGems >= createCostGems && onCreate(name, description, GUILD_ICONS[iconIdx].icon, GUILD_ICONS[iconIdx].color, openJoin)}
                        disabled={!name.trim() || playerGems < createCostGems}
                        className="pill-green w-full mt-1"
                        style={{ opacity: !name.trim() || playerGems < createCostGems ? 0.5 : 1 }}>
                        <div className="pill-face" style={{ padding: '8px 8px', fontSize: '12px' }}>Create — {formatCommaNumber(createCostGems)} Gems</div>
                    </button>
                </div>
                </div>
            )}

            {/* IN A GUILD — 2-column: details/donations/leadership on the left,
                switchable Members/Missions/Rankings on the right (right column
                stays full height and noticeably wider than the left). */}
            {myGuild && (
                <div className="flex-1 flex gap-2 overflow-hidden px-3 pb-3">
                    {/* Left column */}
                    <div className="w-[34%] shrink-0 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                        {/* Guild identity card */}
                        <div className="rounded-2xl p-3" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.35) 0%,rgba(107,33,168,0.55) 100%)' }}>
                            <div className="flex items-center gap-2.5">
                                <div className={`shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br ${myGuild.color}`} style={{ width: 48, height: 48 }}>
                                    <img src={myGuild.icon} alt="" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-black text-white truncate" style={{ fontSize: 14 }}>{myGuild.name}</span>
                                        <span className="shrink-0 px-1.5 py-0.5 rounded-full font-black text-white" style={{ fontSize: 8, background: 'linear-gradient(180deg,#a855f7,#7e22ce)' }}>Lv.{myGuild.level}</span>
                                    </div>
                                    <div className="relative rounded-full mt-1 overflow-hidden" style={{ height: 7, background: 'rgba(0,0,0,0.35)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${atMaxLevel ? 100 : xpPct}%`, background: 'linear-gradient(90deg,#60a5fa,#3b82f6)' }} />
                                    </div>
                                    <div className="text-white/40 font-bold mt-0.5" style={{ fontSize: 8 }}>
                                        {atMaxLevel ? 'Max Level' : `${formatKShort(myGuild.xp)} / ${formatKShort(xpNeeded)} XP`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2.5 pt-2">
                                <div className="flex items-center gap-1">
                                    <i className="ti ti-users text-white/50" style={{ fontSize: 12 }} />
                                    <span className="font-bold text-white/70" style={{ fontSize: 9.5 }}>{myGuild.memberCount}/{GUILD_MAX_MEMBERS}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <i className="ti ti-star text-yellow-300" style={{ fontSize: 12 }} />
                                    <span className="font-bold text-white/70" style={{ fontSize: 9.5 }}>{formatKShort(myGuild.contributionPoints)}</span>
                                </div>
                                <div className="flex items-center gap-1 min-w-0">
                                    <i className="ti ti-crown text-yellow-300 shrink-0" style={{ fontSize: 12 }} />
                                    <span className="font-bold text-white/70 truncate" style={{ fontSize: 9.5 }}>{myGuild.members.find(m => m.role === 'LEADER')?.name || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description banner — announcement board, editable by Leader/Officers */}
                        <div className="rounded-2xl p-3 flex-1" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.35) 0%,rgba(107,33,168,0.55) 100%)', minHeight: 72 }}>
                            {editingDesc ? (
                                <div className="flex flex-col gap-2 h-full">
                                    <textarea
                                        value={descDraft} onChange={e => setDescDraft(e.target.value.slice(0, 200))}
                                        rows={3} autoFocus
                                        className="w-full rounded-xl px-2.5 py-2 text-white font-bold outline-none resize-none flex-1"
                                        style={{ background: 'rgba(0,0,0,0.3)', fontSize: 11 }}
                                    />
                                    <div className="flex gap-1.5">
                                        <button onClick={() => setEditingDesc(false)} className="flex-1 rounded-full py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
                                            <span className="font-black text-white/70" style={{ fontSize: 10 }}>Cancel</span>
                                        </button>
                                        <button onClick={() => { onUpdateDescription(descDraft); setEditingDesc(false); }} className="pill-green flex-1">
                                            <div className="pill-face" style={{ padding: '5px 8px', fontSize: '10px' }}>Save</div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 h-full">
                                    <p className="flex-1 text-white/80 font-bold" style={{ fontSize: 11, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                                        {myGuild.description || 'No announcement yet.'}
                                    </p>
                                    {(myRole === 'LEADER' || myRole === 'OFFICER') && (
                                        <i className="ti ti-pencil text-white/40 cursor-pointer shrink-0" style={{ fontSize: 15 }}
                                            onClick={() => { setDescDraft(myGuild.description); setEditingDesc(true); }} />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Daily donations */}
                        <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.35) 0%,rgba(107,33,168,0.55) 100%)' }}>
                            <span className="font-black text-white/60 uppercase tracking-widest" style={{ fontSize: 9 }}>Daily Donation (+100 Contribution each)</span>
                            <div className="flex items-center gap-2">
                                <img src="/new_coinicon.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                                <span className="flex-1 font-bold text-white/70" style={{ fontSize: 10.5 }}>Donate Coins</span>
                                <button onClick={() => !donationState.coinsDonated && onDonate('COINS')} disabled={donationState.coinsDonated}
                                    className="pill-green shrink-0" style={{ opacity: donationState.coinsDonated ? 0.5 : 1 }}>
                                    <div className="pill-face" style={{ padding: '5px 10px', fontSize: '9.5px' }}>
                                        {donationState.coinsDonated ? 'Donated' : `${formatCommaNumber(donateCoinAmount)}`}
                                    </div>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <img src="/symbols/diamond.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                                <span className="flex-1 font-bold text-white/70" style={{ fontSize: 10.5 }}>Donate Gems</span>
                                <button onClick={() => !donationState.gemsDonated && onDonate('GEMS')} disabled={donationState.gemsDonated}
                                    className="pill-green shrink-0" style={{ opacity: donationState.gemsDonated ? 0.5 : 1 }}>
                                    <div className="pill-face" style={{ padding: '5px 10px', fontSize: '9.5px' }}>
                                        {donationState.gemsDonated ? 'Donated' : `${donateGemAmount}`}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* My Contribution / Guild Rank */}
                        <div className="rounded-2xl p-3 flex" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.35) 0%,rgba(107,33,168,0.55) 100%)' }}>
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                                <i className="ti ti-star text-yellow-300" style={{ fontSize: 16 }} />
                                <span className="font-black text-white" style={{ fontSize: 14 }}>{formatKShort(me?.contribution || 0)}</span>
                                <span className="text-white/40 font-bold" style={{ fontSize: 8 }}>My Contribution</span>
                            </div>
                            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                                <i className="ti ti-trophy text-yellow-300" style={{ fontSize: 16 }} />
                                <span className="font-black text-white" style={{ fontSize: 14 }}>
                                    {(() => { const r = topGuildsByContribution.findIndex(g => g.id === myGuild.id); return r >= 0 ? `#${r + 1}` : '—'; })()}
                                </span>
                                <span className="text-white/40 font-bold" style={{ fontSize: 8 }}>Guild Rank</span>
                            </div>
                        </div>

                        {/* Leadership / membership actions */}
                        <div className="flex flex-col gap-1.5">
                            {myRole === 'LEADER' && myGuild.memberCount > 1 && (
                                pickingSuccessor ? (
                                    <div className="rounded-2xl p-2.5 flex flex-col gap-1.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <span className="font-black text-white/60" style={{ fontSize: 9.5 }}>Choose a new leader:</span>
                                        {myGuild.members.filter(m => m.deviceId !== deviceId).map(m => (
                                            <button key={m.deviceId} onClick={() => { onTransferLeadership(m.deviceId); setPickingSuccessor(false); }}
                                                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                                <img src={m.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 24, height: 24 }} />
                                                <span className="font-bold text-white flex-1 text-left" style={{ fontSize: 11 }}>{m.name}</span>
                                            </button>
                                        ))}
                                        <button onClick={() => setPickingSuccessor(false)} className="text-center py-1">
                                            <span className="font-bold text-white/40" style={{ fontSize: 9.5 }}>Cancel</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setPickingSuccessor(true)} className="w-full text-center py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <span className="font-black text-white/60" style={{ fontSize: 10.5 }}>Delegate Leadership</span>
                                    </button>
                                )
                            )}
                            {myRole === 'LEADER' ? (
                                confirmAction === 'disband' ? (
                                    <button onClick={onDisband} className="pill-red w-full">
                                        <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px', background: 'linear-gradient(180deg,#ff5555,#e01010,#b00000)' }}>Confirm — Disband Guild</div>
                                    </button>
                                ) : (
                                    <button onClick={() => setConfirmAction('disband')} className="w-full text-center py-1.5">
                                        <span className="font-bold text-white/40" style={{ fontSize: 10.5 }}>Disband Guild</span>
                                    </button>
                                )
                            ) : (
                                confirmAction === 'leave' ? (
                                    <button onClick={onLeave} className="pill-red w-full">
                                        <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px', background: 'linear-gradient(180deg,#ff5555,#e01010,#b00000)' }}>Confirm — Leave Guild</div>
                                    </button>
                                ) : (
                                    <button onClick={() => setConfirmAction('leave')} className="w-full text-center py-1.5">
                                        <span className="font-bold text-white/40" style={{ fontSize: 10.5 }}>Leave Guild</span>
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Right column — full height, swaps content via the small tab group */}
                    <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                        <div className="shrink-0 flex gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.28)' }}>
                            {([{ key: 'MEMBERS' as const, label: `Members (${myGuild.memberCount})` }, { key: 'TASKS' as const, label: 'Missions' }, { key: 'TOP' as const, label: 'Rankings' }]).map(t => (
                                <button key={t.key} onClick={() => setRightTab(t.key)}
                                    className="flex-1 relative rounded-xl py-1.5 px-1 transition-all active:scale-95"
                                    style={{ background: rightTab === t.key ? 'linear-gradient(180deg,#52c215,#35900a 50%,#246606)' : 'transparent' }}>
                                    <span className="font-black block leading-tight" style={{ fontSize: 10, color: rightTab === t.key ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5" onClick={() => setActionsOpenFor(null)}>
                            {rightTab === 'MEMBERS' && (() => {
                                const sorted = [...myGuild.members].sort((a, b) => {
                                    const roleDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
                                    return roleDiff !== 0 ? roleDiff : b.contribution - a.contribution;
                                });
                                const maxContribution = Math.max(1, ...sorted.map(m => m.contribution));
                                return (
                                <GroupedList
                                    items={sorted}
                                    keyFn={m => m.deviceId}
                                    renderRow={m => {
                                    const isMe = m.deviceId === deviceId;
                                    const confirming = confirmAction === `kick-${m.deviceId}`;
                                    const iCanKick = myRole === 'LEADER' ? m.role !== 'LEADER' : myRole === 'OFFICER' ? m.role === 'MEMBER' : false;
                                    const iCanPromote = myRole === 'LEADER' && m.role === 'MEMBER';
                                    const iCanDemote = myRole === 'LEADER' && m.role === 'OFFICER';
                                    const hasActions = !isMe && (iCanPromote || iCanDemote || iCanKick);
                                    return (
                                        <div className="relative flex items-center gap-2.5 px-3 py-2">
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); setProfileTarget({ id: m.deviceId, name: m.name, avatar: m.avatar, level: 1 }); }}>
                                                <img src={m.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 36, height: 36, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-white truncate flex items-center gap-1.5" style={{ fontSize: 12 }}>
                                                        {m.name}
                                                        {isMe && <span className="text-white/40 font-bold" style={{ fontSize: 9 }}>(You)</span>}
                                                        <span className="shrink-0 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5" style={{
                                                            fontSize: 7.5,
                                                            color: m.role === 'LEADER' ? '#3a2600' : m.role === 'OFFICER' ? '#082f49' : 'rgba(255,255,255,0.7)',
                                                            background: m.role === 'LEADER' ? 'linear-gradient(180deg,#ffe27a,#e8a200)' : m.role === 'OFFICER' ? 'linear-gradient(180deg,#7dd3fc,#0ea5e9)' : 'rgba(255,255,255,0.12)',
                                                        }}>
                                                            {m.role === 'LEADER' ? <><i className="ti ti-crown" style={{ fontSize: 8 }} />Leader</> : m.role === 'OFFICER' ? <><i className="ti ti-shield" style={{ fontSize: 8 }} />Officer</> : 'Member'}
                                                        </span>
                                                    </div>
                                                    <div className="relative rounded-full mt-1 overflow-hidden" style={{ height: 5, background: 'rgba(0,0,0,0.35)' }}>
                                                        <div className="h-full rounded-full" style={{ width: `${(m.contribution / maxContribution) * 100}%`, background: 'linear-gradient(90deg,#4ade80,#16a34a)' }} />
                                                    </div>
                                                    <div className="text-white/45 font-bold mt-0.5" style={{ fontSize: 8.5 }}>{formatKShort(m.contribution)} Contribution</div>
                                                </div>
                                            </div>
                                            <div className="text-white/35 font-bold shrink-0" style={{ fontSize: 8 }}>Joined {timeAgo(m.joinedAt)}</div>
                                            {hasActions && (
                                                <div className="relative shrink-0">
                                                    <i className="ti ti-dots-vertical text-white/50 cursor-pointer" style={{ fontSize: 16, padding: 4 }}
                                                        onClick={(e) => { e.stopPropagation(); setActionsOpenFor(prev => prev === m.deviceId ? null : m.deviceId); }} />
                                                    {actionsOpenFor === m.deviceId && (
                                                        <div className="absolute right-0 top-full mt-1 z-10 flex flex-col rounded-xl overflow-hidden"
                                                            style={{ background: '#2a0a52', boxShadow: '0 4px 14px rgba(0,0,0,0.7)', minWidth: 130 }}
                                                            onClick={e => e.stopPropagation()}>
                                                            {(iCanPromote || iCanDemote) && (
                                                                <button onClick={() => { onSetRole(m.deviceId, iCanPromote ? 'OFFICER' : 'MEMBER'); setActionsOpenFor(null); }}
                                                                    className="flex items-center gap-2 px-3 py-2 text-left" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                                    <i className={`ti ${iCanPromote ? 'ti-arrow-up' : 'ti-arrow-down'} text-white/60`} style={{ fontSize: 13 }} />
                                                                    <span className="font-bold text-white" style={{ fontSize: 10.5 }}>{iCanPromote ? 'Promote to Officer' : 'Demote to Member'}</span>
                                                                </button>
                                                            )}
                                                            {iCanKick && (
                                                                confirming ? (
                                                                    <button onClick={() => { onKick(m.deviceId); setConfirmAction(null); setActionsOpenFor(null); }}
                                                                        className="flex items-center gap-2 px-3 py-2 text-left" style={{ background: 'rgba(239,68,68,0.25)' }}>
                                                                        <span className="font-bold text-red-300" style={{ fontSize: 10.5 }}>Confirm Kick?</span>
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => setConfirmAction(`kick-${m.deviceId}`)}
                                                                        className="flex items-center gap-2 px-3 py-2 text-left">
                                                                        <i className="ti ti-user-minus text-red-400" style={{ fontSize: 13 }} />
                                                                        <span className="font-bold text-red-400" style={{ fontSize: 10.5 }}>Kick</span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                    }}
                                />
                                );
                            })()}

                            {rightTab === 'TASKS' && (
                                <GroupedList
                                    items={tasks}
                                    keyFn={t => t.id}
                                    renderRow={t => {
                                const cost = refreshCostFor(t);
                                return (
                                    <div className="flex items-center gap-2.5 px-3 py-2">
                                        <i className="ti ti-clipboard-check text-white/50 shrink-0" style={{ fontSize: 20 }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-white truncate" style={{ fontSize: 11.5 }}>{t.description}</div>
                                            <div className="relative rounded-full mt-1 overflow-hidden" style={{ height: 6, background: 'rgba(0,0,0,0.35)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (t.current / t.target) * 100)}%`, background: t.completed ? 'linear-gradient(90deg,#4ade80,#16a34a)' : 'linear-gradient(90deg,#38bdf8,#0ea5e9)' }} />
                                            </div>
                                            <div className="font-bold mt-0.5" style={{ fontSize: 8.5, color: t.rewardKind === 'GUILD_XP' ? 'rgba(250,204,21,0.75)' : 'rgba(125,211,252,0.75)' }}>
                                                +{formatKShort(t.coinReward)} Coins · +{t.pointsReward} {t.rewardKind === 'GUILD_XP' ? 'Guild XP' : 'Contribution'}
                                            </div>
                                        </div>
                                        {t.completed && !t.claimed ? (
                                            <button onClick={() => onClaimTask(t.id)} className="pill-green shrink-0">
                                                <div className="pill-face flex flex-col items-center leading-tight" style={{ padding: '5px 10px', fontSize: '9.5px' }}>
                                                    <span>Claim</span>
                                                    <span style={{ fontSize: 8 }}>+{t.pointsReward} {t.rewardKind === 'GUILD_XP' ? 'XP' : 'Contrib.'}</span>
                                                </div>
                                            </button>
                                        ) : t.claimed ? (
                                            <i className="ti ti-check text-green-400 shrink-0" style={{ fontSize: 18 }} />
                                        ) : (
                                            <button onClick={() => playerGems >= cost && onRefreshTask(t.id)} disabled={playerGems < cost}
                                                className="shrink-0 flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={{ background: 'rgba(255,255,255,0.08)', opacity: playerGems < cost ? 0.5 : 1 }}>
                                                <i className="ti ti-refresh text-white/70" style={{ fontSize: 13 }} />
                                                <span className="font-black text-white/60" style={{ fontSize: 8 }}>{cost} Gems</span>
                                            </button>
                                        )}
                                    </div>
                                );
                                    }}
                                />
                            )}

                            {rightTab === 'TOP' && <TopGuildsList onSelect={setViewingGuildId} />}
                        </div>
                    </div>
                </div>
            )}

            {profileTarget && (
                <PlayerProfileModal
                    isOpen
                    id={profileTarget.id}
                    name={profileTarget.name}
                    avatar={profileTarget.avatar}
                    level={profileTarget.level}
                    guildName={myGuild?.name}
                    isFriend={friendIds.includes(profileTarget.id)}
                    isPending={pendingFriendIds.includes(profileTarget.id)}
                    onClose={() => setProfileTarget(null)}
                    onAddFriend={() => onAddFriend(profileTarget)}
                />
            )}

            {/* Public guild profile — opened from any Browse/Search/Rankings row */}
            {viewingGuildId && (
                <div className="absolute inset-0 z-[200] flex flex-col select-none" style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)' }}>
                    <div className="shrink-0 flex items-center px-4 pt-3 pb-2 relative">
                        <div className="round-btn cursor-pointer" onClick={() => setViewingGuildId(null)}><i className="ti ti-arrow-left" /></div>
                        <h2 className="absolute left-0 right-0 text-center font-tanker text-white pointer-events-none" style={{ fontSize: 15 }}>Guild Profile</h2>
                    </div>
                    {viewingLoading || !viewingGuild ? (
                        <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold">{viewingLoading ? 'Loading…' : 'Guild not found'}</div>
                    ) : (() => {
                        const g = viewingGuild;
                        const gXpNeeded = guildXpForNextLevel(g.level);
                        const gXpPct = Math.min(100, (g.xp / gXpNeeded) * 100);
                        const leader = g.members.find(mm => mm.role === 'LEADER');
                        const levelRank = topGuildsByLevel.findIndex(x => x.id === g.id);
                        const contribRank = topGuildsByContribution.findIndex(x => x.id === g.id);
                        return (
                            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4 flex flex-col gap-2">
                                <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.22)' }}>
                                    <div className={`shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br ${g.color}`} style={{ width: 56, height: 56 }}>
                                        <img src={g.icon} alt="" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black text-white truncate" style={{ fontSize: 15 }}>{g.name}</span>
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full font-black text-white" style={{ fontSize: 8, background: 'linear-gradient(180deg,#a855f7,#7e22ce)' }}>Lv.{g.level}</span>
                                        </div>
                                        <div className="relative rounded-full mt-1 overflow-hidden" style={{ height: 7, background: 'rgba(0,0,0,0.35)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${gXpPct}%`, background: 'linear-gradient(90deg,#60a5fa,#3b82f6)' }} />
                                        </div>
                                        <div className="text-white/40 font-bold mt-0.5" style={{ fontSize: 8 }}>{formatKShort(g.xp)} / {formatKShort(gXpNeeded)} XP</div>
                                    </div>
                                    {!myGuild && (
                                        <button onClick={g.isOpen ? () => { onJoin(g.id); setViewingGuildId(null); } : undefined} disabled={!g.isOpen}
                                            className="pill-green shrink-0" style={{ opacity: g.isOpen ? 1 : 0.4 }}>
                                            <div className="pill-face" style={{ padding: '6px 14px', fontSize: '10.5px' }}>{g.isOpen ? 'Join' : 'Invite Only'}</div>
                                        </button>
                                    )}
                                </div>

                                <div className="rounded-2xl p-3 grid grid-cols-2 gap-2" style={{ background: 'rgba(0,0,0,0.18)' }}>
                                    <div className="flex items-center gap-2">
                                        <i className="ti ti-crown text-yellow-300" style={{ fontSize: 15 }} />
                                        <div className="min-w-0"><div className="text-white/40 font-bold" style={{ fontSize: 8 }}>Leader</div><div className="font-black text-white truncate" style={{ fontSize: 11 }}>{leader?.name || '—'}</div></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <i className="ti ti-users text-white/60" style={{ fontSize: 15 }} />
                                        <div className="min-w-0"><div className="text-white/40 font-bold" style={{ fontSize: 8 }}>Members</div><div className="font-black text-white" style={{ fontSize: 11 }}>{g.memberCount}/{GUILD_MAX_MEMBERS}</div></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <i className="ti ti-star text-yellow-300" style={{ fontSize: 15 }} />
                                        <div className="min-w-0"><div className="text-white/40 font-bold" style={{ fontSize: 8 }}>Contribution</div><div className="font-black text-white" style={{ fontSize: 11 }}>{formatKShort(g.contributionPoints)}</div></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <i className="ti ti-trophy text-yellow-300" style={{ fontSize: 15 }} />
                                        <div className="min-w-0"><div className="text-white/40 font-bold" style={{ fontSize: 8 }}>Ranking</div><div className="font-black text-white" style={{ fontSize: 11 }}>
                                            {contribRank >= 0 ? `#${contribRank + 1} Contrib.` : levelRank >= 0 ? `#${levelRank + 1} Level` : 'Unranked'}
                                        </div></div>
                                    </div>
                                </div>

                                {g.description && (
                                    <div className="rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.18)' }}>
                                        <p className="text-white/80 font-bold" style={{ fontSize: 11, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{g.description}</p>
                                    </div>
                                )}

                                <span className="font-black text-white/50 uppercase tracking-widest px-1" style={{ fontSize: 8.5 }}>Members</span>
                                <GroupedList
                                    items={[...g.members].sort((a, b) => (ROLE_RANK[a.role] - ROLE_RANK[b.role]) || (b.contribution - a.contribution))}
                                    keyFn={m => m.deviceId}
                                    renderRow={m => (
                                        <div className="flex items-center gap-2.5 px-3 py-2">
                                            <img src={m.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 32, height: 32 }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-white truncate" style={{ fontSize: 11.5 }}>{m.name}</div>
                                                <div className="font-bold" style={{ fontSize: 8.5, color: m.role === 'LEADER' ? '#facc15' : m.role === 'OFFICER' ? '#7dd3fc' : 'rgba(255,255,255,0.45)' }}>
                                                    {m.role === 'LEADER' ? 'Leader' : m.role === 'OFFICER' ? 'Officer' : 'Member'}
                                                </div>
                                            </div>
                                            <div className="text-white/50 font-bold shrink-0" style={{ fontSize: 9.5 }}>{formatKShort(m.contribution)} pts</div>
                                        </div>
                                    )}
                                />
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
