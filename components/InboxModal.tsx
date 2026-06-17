import React from 'react';

export type InboxMessageType = 'WELCOME' | 'DAILY_COINS' | 'DAILY_PACK' | 'VIP_CASHBACK';

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
    VIP_CASHBACK: '/symbols/coin.png',
};

export const InboxModal: React.FC<InboxModalProps> = ({ isOpen, onClose, messages, onClaim }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in">
        <div className="w-full max-w-[420px] flex flex-col rounded-2xl overflow-hidden"
            style={{ height: 'min(80%, 520px)', background: 'linear-gradient(180deg,#0d0814,#1a0535)' }}>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2">
                <h2 className="font-black text-white text-sm tracking-widest flex-1">Inbox</h2>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x" /></div>
            </div>
            {/* Message list */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
                {messages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm font-bold uppercase">No messages</div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className="rounded-2xl p-3 flex items-center gap-3"
                        style={{ background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}>
                        <img src={MSG_ICONS[msg.type] ?? '/ui/gift_mail.png'} alt="" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }} />
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-white text-xs tracking-wide leading-none">{msg.title}</div>
                            <div className="text-purple-300/80 text-xs mt-0.5 leading-tight">{msg.body}</div>
                        </div>
                        <button onClick={() => onClaim(msg.id)}
                            className="btn-3d px-3 py-1.5 rounded-lg font-black text-xs uppercase shrink-0"
                            style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 3px 0 #14532d', color: 'white' }}>
                            Claim
                        </button>
                    </div>
                ))}
            </div>
        </div>
        </div>
    );
};
