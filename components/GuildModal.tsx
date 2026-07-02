import React, { useEffect, useState } from 'react';
import { Guild, GuildRole, GuildSummary, GuildTask } from '../types';
import { GUILD_ICONS, guildXpForNextLevel } from '../services/guildService';
import { formatKShort } from '../constants';

interface GuildModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string;
    myGuild: Guild | null;
    loading: boolean;
    searchResults: GuildSummary[];
    onSearch: (query: string) => void;
    onCreate: (name: string, description: string, icon: string, color: string, isOpen: boolean) => void;
    onJoin: (guildId: string) => void;
    onLeave: () => void;
    onKick: (deviceId: string) => void;
    onSetRole: (deviceId: string, role: GuildRole) => void;
    createCost: number;
    playerBalance: number;
    tasks: GuildTask[];
    onClaimTask: (taskId: string) => void;
    errorMsg?: string;
}

export const GuildModal: React.FC<GuildModalProps> = ({
    isOpen, onClose, deviceId, myGuild, loading, searchResults, onSearch, onCreate, onJoin, onLeave, onKick, onSetRole,
    createCost, playerBalance, tasks, onClaimTask, errorMsg,
}) => {
    const [view, setView] = useState<'BROWSE' | 'CREATE'>('BROWSE');
    const [tab, setTab] = useState<'MEMBERS' | 'TASKS'>('MEMBERS');
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconIdx, setIconIdx] = useState(0);
    const [openJoin, setOpenJoin] = useState(true);
    const [confirmAction, setConfirmAction] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || myGuild) return;
        const t = setTimeout(() => onSearch(search), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, myGuild, search]);

    if (!isOpen) return null;

    const me = myGuild?.members.find(m => m.deviceId === deviceId);
    const myRole: GuildRole = me?.role || 'MEMBER';
    const canManage = myRole === 'LEADER' || myRole === 'OFFICER';

    const xpNeeded = myGuild ? guildXpForNextLevel(myGuild.level) : 0;
    const xpPct = myGuild ? Math.min(100, (myGuild.xp / xpNeeded) * 100) : 0;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
            onClick={onClose}>
            <div className="w-full max-w-[420px] flex flex-col rounded-3xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ height: 'min(88%, 560px)', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

                {/* Header */}
                <div className="shrink-0 flex items-center px-4 pt-3 pb-2 relative">
                    <h2 className="absolute left-0 right-0 text-center font-tanker text-white text-base pointer-events-none">Guild</h2>
                    {!myGuild && view === 'CREATE' && (
                        <div className="round-btn cursor-pointer z-10" onClick={() => setView('BROWSE')}><i className="ti ti-arrow-left" /></div>
                    )}
                    <div className="ml-auto round-btn cursor-pointer z-10" onClick={onClose}><i className="ti ti-x" /></div>
                </div>

                {errorMsg && (
                    <div className="shrink-0 mx-3 mb-2 rounded-xl px-3 py-1.5 text-center" style={{ background: 'rgba(239,68,68,0.25)' }}>
                        <span className="font-bold text-white" style={{ fontSize: 10.5 }}>{errorMsg}</span>
                    </div>
                )}

                {/* NO GUILD — browse / create */}
                {!myGuild && view === 'BROWSE' && (
                    <>
                        <div className="shrink-0 px-3 pb-2 flex gap-1.5">
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search guilds…"
                                className="flex-1 rounded-full px-3 py-1.5 text-white font-bold outline-none"
                                style={{ background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', fontSize: 12 }}
                            />
                            <button onClick={() => setView('CREATE')} className="pill-green shrink-0">
                                <div className="pill-face" style={{ padding: '6px 12px', fontSize: '10px' }}>Create</div>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1.5">
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold">Loading…</div>
                            ) : searchResults.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
                                    <i className="ti ti-shield text-white/30" style={{ fontSize: 34 }} />
                                    <div className="text-white/50 text-sm font-bold">No guilds found</div>
                                    <div className="text-white/35" style={{ fontSize: 11 }}>Be the first — tap "Create".</div>
                                </div>
                            ) : searchResults.map(g => (
                                <div key={g.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                    style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                    <div className={`shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br ${g.color}`} style={{ width: 38, height: 38 }}>
                                        <i className={`ti ${g.icon} text-white`} style={{ fontSize: 18 }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{g.name}</div>
                                        <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Lvl {g.level} · {g.memberCount} members{!g.isOpen ? ' · Invite Only' : ''}</div>
                                    </div>
                                    <button
                                        onClick={g.isOpen ? () => onJoin(g.id) : undefined}
                                        disabled={!g.isOpen}
                                        className="pill-green shrink-0"
                                        style={{ opacity: g.isOpen ? 1 : 0.4 }}>
                                        <div className="pill-face" style={{ padding: '5px 14px', fontSize: '10px' }}>Join</div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* CREATE */}
                {!myGuild && view === 'CREATE' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-3 flex flex-col gap-3">
                        <div className="flex justify-center gap-2 flex-wrap pt-1">
                            {GUILD_ICONS.map((opt, i) => (
                                <div key={i} onClick={() => setIconIdx(i)}
                                    className={`rounded-full flex items-center justify-center bg-gradient-to-br ${opt.color} cursor-pointer transition-transform`}
                                    style={{ width: 40, height: 40, transform: iconIdx === i ? 'scale(1.15)' : 'scale(1)', boxShadow: iconIdx === i ? '0 0 0 2px rgba(255,255,255,0.7)' : 'none' }}>
                                    <i className={`ti ${opt.icon} text-white`} style={{ fontSize: 18 }} />
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
                            value={description} onChange={e => setDescription(e.target.value.slice(0, 80))}
                            placeholder="Short description (optional)"
                            rows={2}
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
                            onClick={() => name.trim() && playerBalance >= createCost && onCreate(name, description, GUILD_ICONS[iconIdx].icon, GUILD_ICONS[iconIdx].color, openJoin)}
                            disabled={!name.trim() || playerBalance < createCost}
                            className="pill-green w-full mt-1"
                            style={{ opacity: !name.trim() || playerBalance < createCost ? 0.5 : 1 }}>
                            <div className="pill-face" style={{ padding: '8px 8px', fontSize: '12px' }}>Create — {formatKShort(createCost)} Coins</div>
                        </button>
                    </div>
                )}

                {/* IN GUILD — guild page */}
                {myGuild && (
                    <>
                        <div className="shrink-0 px-4 pb-2 flex items-center gap-3">
                            <div className={`shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br ${myGuild.color}`} style={{ width: 46, height: 46 }}>
                                <i className={`ti ${myGuild.icon} text-white`} style={{ fontSize: 22 }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-white truncate" style={{ fontSize: 14 }}>{myGuild.name}</div>
                                <div className="text-white/50 font-bold truncate" style={{ fontSize: 10 }}>{myGuild.description || `${myGuild.memberCount} members`}</div>
                                <div className="relative rounded-full mt-1 overflow-hidden" style={{ height: 8, background: 'rgba(0,0,0,0.35)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg,#facc15,#fde047)' }} />
                                </div>
                            </div>
                            <div className="shrink-0 text-center">
                                <div className="font-black text-yellow-300" style={{ fontSize: 14 }}>Lv{myGuild.level}</div>
                            </div>
                        </div>

                        <div className="shrink-0 px-3 pb-2">
                            <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
                                {([{ key: 'MEMBERS' as const, label: `Members (${myGuild.memberCount})` }, { key: 'TASKS' as const, label: 'Guild Tasks' }]).map(t => {
                                    const active = tab === t.key;
                                    return (
                                        <button key={t.key} onClick={() => setTab(t.key)}
                                            className="flex-1 relative rounded-xl py-1.5 px-1 transition-all active:scale-95"
                                            style={{ background: active ? 'linear-gradient(180deg,#52c215,#35900a 50%,#246606)' : 'transparent' }}>
                                            <span className="font-black block leading-tight" style={{ fontSize: 10.5, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {tab === 'MEMBERS' && (
                            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1.5">
                                {[...myGuild.members].sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : a.role === 'OFFICER' ? -1 : b.role === 'OFFICER' ? 1 : 0)).map(m => {
                                    const isMe = m.deviceId === deviceId;
                                    const confirming = confirmAction === `kick-${m.deviceId}`;
                                    const iCanKick = myRole === 'LEADER' ? m.role !== 'LEADER' : myRole === 'OFFICER' ? m.role === 'MEMBER' : false;
                                    const iCanPromote = myRole === 'LEADER' && m.role === 'MEMBER';
                                    const iCanDemote = myRole === 'LEADER' && m.role === 'OFFICER';
                                    return (
                                        <div key={m.deviceId} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                            style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                            <img src={m.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 34, height: 34, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-white truncate flex items-center gap-1" style={{ fontSize: 12 }}>
                                                    {m.name}{isMe && <span className="text-white/40 font-bold" style={{ fontSize: 9 }}>(You)</span>}
                                                </div>
                                                <div className="font-bold" style={{ fontSize: 9, color: m.role === 'LEADER' ? '#facc15' : m.role === 'OFFICER' ? '#7dd3fc' : 'rgba(255,255,255,0.45)' }}>
                                                    {m.role === 'LEADER' ? 'Leader' : m.role === 'OFFICER' ? 'Officer' : 'Member'} · {formatKShort(m.contribution)} XP
                                                </div>
                                            </div>
                                            {!isMe && (iCanPromote || iCanDemote) && (
                                                <i className={`ti ${iCanPromote ? 'ti-arrow-up' : 'ti-arrow-down'} text-white/40 cursor-pointer shrink-0`}
                                                    style={{ fontSize: 15, padding: 4 }}
                                                    onClick={() => onSetRole(m.deviceId, iCanPromote ? 'OFFICER' : 'MEMBER')} />
                                            )}
                                            {!isMe && iCanKick && (
                                                confirming ? (
                                                    <button onClick={() => { onKick(m.deviceId); setConfirmAction(null); }} className="pill-red shrink-0">
                                                        <div className="pill-face" style={{ padding: '5px 10px', fontSize: '9px', background: 'linear-gradient(180deg,#ff5555,#e01010,#b00000)' }}>Confirm?</div>
                                                    </button>
                                                ) : (
                                                    <i className="ti ti-user-minus text-white/40 cursor-pointer shrink-0" style={{ fontSize: 15, padding: 4 }}
                                                        onClick={() => setConfirmAction(`kick-${m.deviceId}`)} />
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                                <div style={{ height: 1, margin: '4px 8px', background: 'rgba(255,255,255,0.1)' }} />
                                {confirmAction === 'leave' ? (
                                    <button onClick={onLeave} className="pill-red w-full">
                                        <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px', background: 'linear-gradient(180deg,#ff5555,#e01010,#b00000)' }}>
                                            {myRole === 'LEADER' && myGuild.memberCount === 1 ? 'Confirm — Disband Guild' : 'Confirm — Leave Guild'}
                                        </div>
                                    </button>
                                ) : (
                                    <button onClick={() => setConfirmAction('leave')} className="w-full text-center py-2">
                                        <span className="font-bold text-white/40" style={{ fontSize: 10.5 }}>
                                            {myRole === 'LEADER' && myGuild.memberCount === 1 ? 'Disband Guild' : 'Leave Guild'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}

                        {tab === 'TASKS' && (
                            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1.5">
                                {tasks.map(t => (
                                    <div key={t.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                        style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                        <i className="ti ti-clipboard-check text-white/50 shrink-0" style={{ fontSize: 20 }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-white truncate" style={{ fontSize: 11.5 }}>{t.description}</div>
                                            <div className="relative rounded-full mt-1 overflow-hidden" style={{ height: 6, background: 'rgba(0,0,0,0.35)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (t.current / t.target) * 100)}%`, background: t.completed ? 'linear-gradient(90deg,#4ade80,#16a34a)' : 'linear-gradient(90deg,#38bdf8,#0ea5e9)' }} />
                                            </div>
                                            <div className="text-white/40 font-bold mt-0.5" style={{ fontSize: 8.5 }}>+{formatKShort(t.coinReward)} Coins · +{t.guildXpReward} Guild XP</div>
                                        </div>
                                        {t.completed && !t.claimed && (
                                            <button onClick={() => onClaimTask(t.id)} className="pill-green shrink-0">
                                                <div className="pill-face" style={{ padding: '5px 12px', fontSize: '9.5px' }}>Claim</div>
                                            </button>
                                        )}
                                        {t.claimed && <i className="ti ti-check text-green-400 shrink-0" style={{ fontSize: 18 }} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
