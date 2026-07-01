import React, { useState, useEffect, useMemo } from 'react';
import { formatK } from '../constants';
import { Friend } from '../types';
import { LeaderboardEntry, LocalPlayer } from '../services/leaderboardService';
import { getAddablePlayers, toFriend, canSend, canCollect, nextResetIn, sendGiftAmount, collectGiftAmount } from '../services/friendsService';

interface FriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
    friends: Friend[];
    you: LocalPlayer;
    maxBet: number;
    onAddFriend: (friend: Friend) => void;
    onSendGift: (friendId: string) => void;
    onCollectGift: (friendId: string) => void;
    onCollectAll: () => void;
}

const fmtCountdown = (ms: number): string => {
    const totalMin = Math.ceil(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const FriendsModal: React.FC<FriendsModalProps> = ({
    isOpen, onClose, friends, you, maxBet, onAddFriend, onSendGift, onCollectGift, onCollectAll,
}) => {
    const [tab, setTab] = useState<'FRIENDS' | 'ADD'>('FRIENDS');
    const [addable, setAddable] = useState<LeaderboardEntry[]>([]);
    const [loadingAdd, setLoadingAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [now, setNow] = useState(() => Date.now());

    // Keep countdowns fresh while open.
    useEffect(() => {
        if (!isOpen) return;
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, [isOpen]);

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

    const collectibleCount = friends.filter(f => canCollect(f, now)).length;
    const sendAmt = sendGiftAmount(maxBet);
    const collectAmt = collectGiftAmount(maxBet);

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
                                    {t.key === 'FRIENDS' && collectibleCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center leading-none" style={{ fontSize: 8, fontWeight: 900 }}>{collectibleCount}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* FRIENDS tab */}
                {tab === 'FRIENDS' && (
                    <>
                        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-2 flex flex-col gap-1.5">
                            {friends.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
                                    <i className="ti ti-users text-white/30" style={{ fontSize: 34 }} />
                                    <div className="text-white/50 text-sm font-bold">No friends yet</div>
                                    <div className="text-white/35" style={{ fontSize: 11 }}>Tap "Add Friends" to start sending and collecting daily gifts.</div>
                                </div>
                            )}
                            {friends.map(f => {
                                const sendable = canSend(f, now);
                                const collectable = canCollect(f, now);
                                return (
                                    <div key={f.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                        style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                        <img src={f.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 38, height: 38, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{f.name}</div>
                                            <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Level {f.level}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={sendable ? () => onSendGift(f.id) : undefined}
                                                disabled={!sendable}
                                                className="pill-blue"
                                                style={{ opacity: sendable ? 1 : 0.45 }}>
                                                <div className="pill-face" style={{ padding: '5px 9px', fontSize: '9px', background: 'linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)' }}>
                                                    {sendable ? 'Send' : fmtCountdown(nextResetIn(f.lastSentAt, now))}
                                                </div>
                                            </button>
                                            <button
                                                onClick={collectable ? () => onCollectGift(f.id) : undefined}
                                                disabled={!collectable}
                                                className="pill-gold"
                                                style={{ opacity: collectable ? 1 : 0.45 }}>
                                                <div className="pill-face" style={{ padding: '5px 9px', fontSize: '9px' }}>
                                                    {collectable ? 'Collect' : fmtCountdown(nextResetIn(f.lastCollectedAt, now))}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {friends.length > 0 && (
                            <div className="shrink-0 px-3 pb-3 pt-1 flex items-center justify-center gap-3">
                                <div className="flex items-center gap-1 text-white/55" style={{ fontSize: 10 }}>
                                    <i className="ti ti-gift" style={{ fontSize: 12 }} />
                                    Send +{formatK(sendAmt)} · Collect +{formatK(collectAmt)}
                                </div>
                                <button
                                    onClick={collectibleCount > 0 ? onCollectAll : undefined}
                                    disabled={collectibleCount === 0}
                                    className="pill-gold"
                                    style={{ opacity: collectibleCount === 0 ? 0.4 : 1 }}>
                                    <div className="pill-face" style={{ padding: '7px 16px', fontSize: '11px' }}>
                                        Collect All {collectibleCount > 0 ? `(${collectibleCount})` : ''}
                                    </div>
                                </button>
                            </div>
                        )}
                    </>
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
                            ) : filteredAddable.map(e => (
                                <div key={e.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                                    style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}>
                                    <img src={e.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 38, height: 38, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-white truncate" style={{ fontSize: 12.5 }}>{e.name}</div>
                                        <div className="text-white/50 font-bold" style={{ fontSize: 9.5 }}>Level {e.level}</div>
                                    </div>
                                    <button onClick={() => onAddFriend(toFriend(e, Date.now()))} className="pill-green shrink-0">
                                        <div className="pill-face" style={{ padding: '5px 14px', fontSize: '10px' }}>Add</div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
