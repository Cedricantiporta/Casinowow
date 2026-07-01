import React, { useState, useEffect, useMemo } from 'react';
import { Friend } from '../types';
import { LeaderboardEntry, LocalPlayer } from '../services/leaderboardService';
import { getAddablePlayers, toFriend, canSend, IncomingRequest } from '../services/friendsService';

interface FriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
    friends: Friend[];
    you: LocalPlayer;
    maxBet: number;
    incomingRequests: IncomingRequest[];
    pendingRequestIds: string[];
    onAddFriend: (friend: Friend) => void;
    onAcceptRequest: (req: IncomingRequest) => void;
    onSendGift: (friendId: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
    isOpen, onClose, friends, you, maxBet, incomingRequests, pendingRequestIds, onAddFriend, onAcceptRequest, onSendGift,
}) => {
    const [tab, setTab] = useState<'FRIENDS' | 'ADD'>('FRIENDS');
    const [addable, setAddable] = useState<LeaderboardEntry[]>([]);
    const [loadingAdd, setLoadingAdd] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isOpen || tab !== 'ADD') return;
        let alive = true;
        setLoadingAdd(true);
        getAddablePlayers(you, friends.map(f => f.id)).then(list => {
            if (alive) { setAddable(list); setLoadingAdd(false); }
        });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, tab, friends.length]);

    const filteredAddable = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return addable;
        return addable.filter(e => e.name.toLowerCase().includes(q));
    }, [addable, search]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
            onClick={onClose}>
            <div className="w-full max-w-[420px] flex flex-col rounded-3xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ height: 'min(88%, 520px)', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

                {/* Header */}
                <div className="shrink-0 flex items-center px-4 pt-3 pb-2 relative">
                    <h2 className="absolute left-0 right-0 text-center font-tanker text-white text-base pointer-events-none">Friends</h2>
                    <div className="ml-auto round-btn cursor-pointer z-10" onClick={onClose}><i className="ti ti-x" /></div>
                </div>

                {/* Tabs */}
                <div className="shrink-0 px-3 pb-2">
                    <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
                        {([{ key: 'FRIENDS' as const, label: `My Friends (${friends.length})` }, { key: 'ADD' as const, label: 'Add Friends' }]).map(t => {
                            const active = tab === t.key;
                            return (
                                <button key={t.key} onClick={() => setTab(t.key)}
                                    className="flex-1 relative rounded-xl py-1.5 px-1 transition-all active:scale-95"
                                    style={{ background: active ? 'linear-gradient(180deg,#52c215,#35900a 50%,#246606)' : 'transparent' }}>
                                    <span className="font-black block leading-tight" style={{ fontSize: 10.5, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                                    {t.key === 'FRIENDS' && incomingRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center leading-none" style={{ fontSize: 8, fontWeight: 900 }}>{incomingRequests.length}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* FRIENDS tab */}
                {tab === 'FRIENDS' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1.5">
                        {/* Incoming friend requests — pinned at the top */}
                        {incomingRequests.length > 0 && (
                            <>
                                <div className="flex items-center gap-1 px-1 pt-1 pb-0.5">
                                    <i className="ti ti-user-plus text-white/50" style={{ fontSize: 11 }} />
                                    <span className="font-black text-white/60 uppercase tracking-widest" style={{ fontSize: 9 }}>Friend Requests</span>
                                </div>
                                {incomingRequests.map(req => (
                                    <div key={req.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                        style={{ background: 'rgba(74,222,128,0.14)', boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.35)' }}>
                                        <img src={req.fromAvatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 38, height: 38, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{req.fromName}</div>
                                            <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Level {req.fromLevel} · wants to be friends</div>
                                        </div>
                                        <button onClick={() => onAcceptRequest(req)} className="pill-green shrink-0">
                                            <div className="pill-face" style={{ padding: '5px 14px', fontSize: '10px' }}>Accept</div>
                                        </button>
                                    </div>
                                ))}
                                <div style={{ height: 1, margin: '4px 8px', background: 'rgba(255,255,255,0.1)' }} />
                            </>
                        )}

                        {friends.length === 0 && incomingRequests.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
                                <i className="ti ti-users text-white/30" style={{ fontSize: 34 }} />
                                <div className="text-white/50 text-sm font-bold">No friends yet</div>
                                <div className="text-white/35" style={{ fontSize: 11 }}>Tap "Add Friends" to start sending gifts.</div>
                            </div>
                        )}
                        {friends.map(f => {
                            const sendable = canSend(f);
                            return (
                                <div key={f.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                    style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                    <img src={f.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 38, height: 38, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{f.name}</div>
                                        <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Level {f.level}{!f.isAI ? ' · Friend' : ''}</div>
                                    </div>
                                    <button
                                        onClick={sendable ? () => onSendGift(f.id) : undefined}
                                        disabled={!sendable}
                                        className="pill-blue shrink-0"
                                        style={{ opacity: sendable ? 1 : 0.45 }}>
                                        <div className="pill-face" style={{ padding: '5px 10px', fontSize: '9px', background: 'linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)' }}>
                                            {sendable ? 'Send Gift' : 'Sent'}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ADD tab */}
                {tab === 'ADD' && (
                    <>
                        <div className="shrink-0 px-3 pb-2">
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search players…"
                                className="w-full rounded-full px-3 py-1.5 text-white font-bold outline-none"
                                style={{ background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', fontSize: 12 }}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1.5">
                            {loadingAdd ? (
                                <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold">Loading…</div>
                            ) : filteredAddable.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-white/40 text-sm font-bold">No players found</div>
                            ) : filteredAddable.map(e => {
                                const requestSent = pendingRequestIds.includes(e.id);
                                return (
                                    <div key={e.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                        style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                        <img src={e.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 38, height: 38, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{e.name}</div>
                                            <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Level {e.level}</div>
                                        </div>
                                        <button
                                            onClick={requestSent ? undefined : () => onAddFriend(toFriend(e, Date.now()))}
                                            disabled={requestSent}
                                            className="pill-green shrink-0"
                                            style={{ opacity: requestSent ? 0.5 : 1 }}>
                                            <div className="pill-face" style={{ padding: '5px 14px', fontSize: '10px' }}>
                                                {requestSent ? 'Request Sent' : 'Add Friend'}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
