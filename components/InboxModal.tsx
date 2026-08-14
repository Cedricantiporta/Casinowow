import React, { useEffect, useState } from 'react';
import { Friend } from '../types';
import { canSend, nextResetIn } from '../services/friendsService';

export type InboxMessageType = 'WELCOME' | 'DAILY_COINS' | 'DAILY_PACK' | 'VIP_CASHBACK' | 'MONTHLY_RANK' | 'GUILD_RANK' | 'FRIEND_GIFT' | 'HOLIDAY_BONUS' | 'MONTHLY_PASS_GIFT';

export interface InboxMessage {
    id: string;
    type: InboxMessageType;
    title: string;
    body: string;
    claimed: boolean;
    createdAt: number;
    expiresAt?: number;
    meta?: string; // FRIEND_GIFT: sender's device id. MONTHLY_RANK/GUILD_RANK: JSON `{ rank }` used to look up the reward tier fresh at claim time
}

interface InboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: InboxMessage[];
    onClaim: (id: string) => void;
    friends: Friend[];
    onSendGift: (friendId: string) => void;
}

const MSG_ICONS: Record<string, string> = {
    WELCOME:      '/ui/gift_mail.png',
    DAILY_COINS:  '/ui/gift_mail.png',
    DAILY_PACK:   '/ui/gift_mail.png',
    VIP_CASHBACK: '/new_coinicon.png',
    MONTHLY_RANK: '/symbols/diamond.png',
    GUILD_RANK:   '/symbols/diamond.png',
    FRIEND_GIFT:  '/ui/gift_mail.png',
    HOLIDAY_BONUS:    '/ui/gift_mail.png',
    MONTHLY_PASS_GIFT: '/ui/pass.png',
};

function daysLeft(expiresAt?: number): number | null {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));
}

const fmtCountdown = (ms: number): string => {
    const totalMin = Math.ceil(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const InboxModal: React.FC<InboxModalProps> = ({ isOpen, onClose, messages, onClaim, friends, onSendGift }) => {
    const [tab, setTab] = useState<'SYSTEM' | 'FRIENDS'>('SYSTEM');
    const [now, setNow] = useState(() => Date.now());

    // Keep gift-cooldown countdowns fresh while open.
    useEffect(() => {
        if (!isOpen) return;
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, [isOpen]);

    if (!isOpen) return null;

    const systemMessages = messages.filter(m => m.type !== 'FRIEND_GIFT');
    const friendMessages = messages.filter(m => m.type === 'FRIEND_GIFT');
    const shown = tab === 'SYSTEM' ? systemMessages : friendMessages;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none">
        <div className="w-full max-w-[420px] flex flex-col rounded-3xl overflow-hidden"
            style={{ height: 'min(80%, 520px)', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div className="shrink-0 flex items-center px-4 pt-3 pb-2 relative">
                <h2 className="absolute left-0 right-0 text-center font-tanker text-white text-base pointer-events-none">Inbox</h2>
                <div className="ml-auto round-btn cursor-pointer z-10" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-3 pb-2">
                <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.28)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
                    {([{ key: 'SYSTEM' as const, label: 'System', count: systemMessages.filter(m => !m.claimed).length }, { key: 'FRIENDS' as const, label: 'Friends', count: friendMessages.filter(m => !m.claimed).length }]).map(t => {
                        const active = tab === t.key;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className="flex-1 relative rounded-xl py-1.5 px-1 transition-all active:scale-95"
                                style={{ background: active ? 'linear-gradient(180deg,#52c215,#35900a 50%,#246606)' : 'transparent' }}>
                                <span className="font-black block leading-tight" style={{ fontSize: 11, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                                {t.count > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center leading-none" style={{ fontSize: 8, fontWeight: 900 }}>{t.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-0">
                {shown.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm font-bold">No messages</div>
                )}
                {shown.map((msg, i) => {
                    const days = daysLeft(msg.expiresAt);
                    const sender = msg.type === 'FRIEND_GIFT' && msg.meta ? friends.find(f => f.id === msg.meta) : undefined;
                    const senderSendable = sender ? canSend(sender, now) : false;
                    return (
                        <React.Fragment key={msg.id}>
                            {i > 0 && (
                                <div style={{ height: 1, marginLeft: 16, marginRight: 16, background: 'rgba(255,255,255,0.08)' }} />
                            )}
                            <div className="flex items-center gap-3 px-3 py-3"
                                style={{
                                    background: 'rgba(0,0,0,0.22)',
                                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)',
                                    borderRadius: i === 0 && shown.length === 1 ? 16
                                        : i === 0 ? '16px 16px 0 0'
                                        : i === shown.length - 1 ? '0 0 16px 16px'
                                        : 0,
                                }}>
                                <img
                                    src={MSG_ICONS[msg.type] ?? '/ui/gift_mail.png'}
                                    alt=""
                                    style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-white text-sm leading-none">{msg.title}</div>
                                    <div className="text-yellow-300/90 text-xs mt-1 leading-tight font-bold">{msg.body}</div>
                                </div>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    {msg.claimed ? (
                                        <span className="text-white/40 text-xs font-black">Claimed</span>
                                    ) : (
                                        <>
                                            <button onClick={() => onClaim(msg.id)} className="pill-green">
                                                <div className="pill-face" style={{ padding: '6px 16px', fontSize: '12px' }}>
                                                    {msg.type === 'FRIEND_GIFT' ? 'Accept' : 'Collect'}
                                                </div>
                                            </button>
                                            {days !== null && (
                                                <span className="text-white/50 font-black" style={{ fontSize: 9 }}>{days} day{days !== 1 ? 's' : ''}</span>
                                            )}
                                        </>
                                    )}
                                    {sender && (
                                        <button
                                            onClick={senderSendable ? () => onSendGift(sender.id) : undefined}
                                            disabled={!senderSendable}
                                            className="pill-blue"
                                            style={{ opacity: senderSendable ? 1 : 0.45 }}>
                                            <div className="pill-face" style={{ padding: '5px 12px', fontSize: '10px', background: senderSendable ? 'linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)' : undefined }}>
                                                {senderSendable ? 'Send Back' : fmtCountdown(nextResetIn(sender.lastSentAt, now))}
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
        </div>
    );
};
