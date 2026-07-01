import React from 'react';
import { Friend } from '../types';

interface Props {
    friends: Friend[];
    requestCount: number;
    onOpen: () => void;
}

// Lobby promo card for Friends — same 116px sizing as the Mission Pass / VIP /
// Arena cards, solid background (no transparency). Badge shows incoming friend
// requests waiting for a response.
export const FriendsLobbyCard: React.FC<Props> = ({ friends, requestCount, onOpen }) => {
    return (
        <button
            onClick={onOpen}
            className="row-span-2 relative overflow-hidden snap-center active:scale-95 transition-transform shrink-0 flex flex-col items-center justify-center"
            style={{
                width: 116, alignSelf: 'stretch', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
                background: 'linear-gradient(180deg, #1e6e9e 0%, #103a5e 55%, #0a1e38 100%)',
                padding: '9px 7px',
            }}>
            <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 54, background: 'linear-gradient(180deg, #38bdf8, transparent)', opacity: 0.45 }} />

            {requestCount > 0 && (
                <div className="absolute top-2 right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 z-10"
                    style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                    <span className="font-black text-white leading-none" style={{ fontSize: 9 }}>{requestCount > 99 ? '99+' : requestCount}</span>
                </div>
            )}

            <span className="relative font-tanker text-white text-sm leading-none" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Friends</span>

            <img src="/ui/gift_mail.png" alt="" className="relative my-2" style={{ width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.6))' }} />

            <span className="relative font-black text-white leading-tight text-center" style={{ fontSize: 11 }}>{friends.length} Friend{friends.length !== 1 ? 's' : ''}</span>

            <div className="relative mt-2 flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{ background: requestCount > 0 ? 'rgba(74,222,128,0.22)' : 'rgba(255,255,255,0.1)', boxShadow: requestCount > 0 ? 'inset 0 0 0 1px rgba(74,222,128,0.5)' : undefined }}>
                <i className={`ti ${requestCount > 0 ? 'ti-user-plus' : 'ti-gift'}`} style={{ fontSize: 11, color: requestCount > 0 ? '#4ade80' : 'rgba(255,255,255,0.6)' }} />
                <span className="font-black leading-none" style={{ fontSize: 9, color: requestCount > 0 ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
                    {requestCount > 0 ? `${requestCount} Request${requestCount !== 1 ? 's' : ''}` : 'Send Gifts'}
                </span>
            </div>
        </button>
    );
};
