import React from 'react';

export type InboxMessageType = 'WELCOME' | 'DAILY_COINS' | 'DAILY_PACK' | 'VIP_CASHBACK' | 'MONTHLY_RANK';

export interface InboxMessage {
    id: string;
    type: InboxMessageType;
    title: string;
    body: string;
    claimed: boolean;
    createdAt: number;
    expiresAt?: number;
}

interface InboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: InboxMessage[];
    onClaim: (id: string) => void;
}

const MSG_ICONS: Record<string, string> = {
    WELCOME:      '/ui/gift_mail.png',
    DAILY_COINS:  '/ui/gift_mail.png',
    DAILY_PACK:   '/ui/gift_mail.png',
    VIP_CASHBACK: '/new_coinicon.png',
    MONTHLY_RANK: '/symbols/diamond.png',
};

function daysLeft(expiresAt?: number): number | null {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));
}

export const InboxModal: React.FC<InboxModalProps> = ({ isOpen, onClose, messages, onClaim }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none">
        <div className="w-full max-w-[420px] flex flex-col rounded-3xl overflow-hidden"
            style={{ height: 'min(80%, 520px)', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div className="shrink-0 flex items-center px-4 pt-3 pb-2 relative">
                <h2 className="absolute left-0 right-0 text-center font-tanker text-white text-base pointer-events-none">Inbox</h2>
                <div className="ml-auto round-btn cursor-pointer z-10" onClick={onClose}><i className="ti ti-x" /></div>
            </div>
            {/* Message list */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-0">
                {messages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm font-bold">No messages</div>
                )}
                {messages.map((msg, i) => {
                    const days = daysLeft(msg.expiresAt);
                    return (
                        <React.Fragment key={msg.id}>
                            {i > 0 && (
                                <div style={{ height: 1, marginLeft: 16, marginRight: 16, background: 'rgba(255,255,255,0.08)' }} />
                            )}
                            <div className="flex items-center gap-3 px-3 py-3"
                                style={{
                                    background: 'rgba(0,0,0,0.22)',
                                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)',
                                    borderRadius: i === 0 && messages.length === 1 ? 16
                                        : i === 0 ? '16px 16px 0 0'
                                        : i === messages.length - 1 ? '0 0 16px 16px'
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
                                                <div className="pill-face" style={{ padding: '6px 16px', fontSize: '12px' }}>Collect</div>
                                            </button>
                                            {days !== null && (
                                                <span className="text-white/50 font-black" style={{ fontSize: 9 }}>{days} day{days !== 1 ? 's' : ''}</span>
                                            )}
                                        </>
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
