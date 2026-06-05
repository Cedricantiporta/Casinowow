import React, { useState, useRef, useEffect } from 'react';
import { GameConfig } from '../types';
import { formatK } from '../constants';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: {
        level: number;
        xp: number;
        xpToNextLevel: number;
        balance: number;
        diamonds: number;
        isVip?: boolean;
        xpMultiplier?: number;
        xpBoostEndTime?: number;
        stats?: {
            maxSingleWin: number;
            maxJackpotWin: number;
            totalCoinsWon: number;
            totalGemsEarned: number;
            totalSpins: number;
            recentSlots: string[];
        };
    };
    isPremium: boolean;
    passBoostMultiplier?: number;
    passBoostEndTime?: number;
    recentGames: GameConfig[];
}

const StatRow: React.FC<{ icon: string; label: string; value: string; vip?: boolean }> = ({ icon, label, value, vip }) => (
    <div className="flex items-center gap-2.5 py-1.5">
        <span className="text-xl leading-none w-7 text-center">{icon}</span>
        <span className={`text-xs uppercase tracking-wide flex-1 font-bold ${vip ? 'text-yellow-300/60' : 'text-white/50'}`}>{label}</span>
        <span className={`font-black text-sm font-mono ${vip ? 'text-yellow-200' : 'text-white'}`}>{value}</span>
    </div>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, player, isPremium, passBoostMultiplier = 1, passBoostEndTime = 0, recentGames }) => {
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || 'Player');
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(playerName);
    const [profilePic, setProfilePic] = useState<string | null>(() => localStorage.getItem('profilePic'));
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        localStorage.setItem('playerName', playerName);
    }, [playerName]);

    const handleNameSave = () => {
        const trimmed = nameInput.trim() || 'Player';
        setPlayerName(trimmed);
        setNameInput(trimmed);
        setEditingName(false);
    };

    const handlePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const result = ev.target?.result as string;
            setProfilePic(result);
            localStorage.setItem('profilePic', result);
        };
        reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    const now = Date.now();
    const vip = !!player.isVip;
    const stats = player.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] };
    const xpPct = Math.min(100, Math.floor((player.xp / player.xpToNextLevel) * 100));
    const xpBoostActive = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > now;
    const passBoostActive = passBoostMultiplier > 1 && passBoostEndTime > now;

    const bgStyle = vip
        ? 'linear-gradient(160deg,#3b1a00 0%,#1e0f00 60%,#0d0700 100%)'
        : 'linear-gradient(160deg,#3b0764 0%,#1e0438 60%,#0d0220 100%)';
    const headerStyle = vip
        ? 'linear-gradient(180deg,#c9801a 0%,#7a5000 100%)'
        : 'linear-gradient(180deg,#6b21a8,#4c1d95)';
    const xpBarStyle = vip
        ? 'linear-gradient(90deg,#f59e0b,#fde68a,#f59e0b)'
        : 'linear-gradient(90deg,#a855f7,#d946ef)';
    const labelColor = vip ? 'text-yellow-300/50' : 'text-white/30';

    return (
        <div className="fixed inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: bgStyle }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-2.5 pb-3"
                style={{ background: headerStyle, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>

                {/* Avatar — clickable to upload */}
                <div className="relative shrink-0 cursor-pointer group" onClick={() => fileRef.current?.click()}>
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-black text-lg text-white shrink-0"
                        style={{ background: vip ? 'linear-gradient(135deg,#f59e0b,#b45309)' : 'linear-gradient(135deg,#a855f7,#7c3aed)', border: vip ? '2px solid #f0c000' : '2px solid rgba(255,255,255,0.25)' }}>
                        {profilePic
                            ? <img src={profilePic} alt="avatar" className="w-full h-full object-cover" />
                            : <span>{player.level}</span>
                        }
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[10px] text-white font-bold">📷</span>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
                </div>

                {/* Name + XP bar */}
                <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-center gap-2 mb-1">
                        {editingName ? (
                            <input
                                autoFocus
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                                className="font-black text-white text-sm uppercase tracking-wider leading-none bg-transparent border-b outline-none flex-1 min-w-0"
                                style={{ borderColor: vip ? '#f0c000' : '#a855f7' }}
                                maxLength={18}
                            />
                        ) : (
                            <span className="font-black text-white text-sm uppercase tracking-wider leading-none cursor-pointer hover:opacity-70 transition-opacity"
                                onClick={() => { setNameInput(playerName); setEditingName(true); }}>
                                {playerName}
                            </span>
                        )}
                        {/* Benefit pills — no emoji */}
                        {vip && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                style={{ background: '#991b1b', border: '1px solid #f0c000', color: '#fde68a' }}>VIP</span>
                        )}
                        {isPremium && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                style={{ background: '#14532d', border: '1px solid #86efac', color: '#bbf7d0' }}>Pass</span>
                        )}
                    </div>

                    {/* Thick XP bar with text inside */}
                    <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <div className="absolute inset-0 rounded-full transition-all" style={{ width: `${xpPct}%`, background: xpBarStyle }} />
                        <div className="absolute inset-0 flex items-center justify-center px-2.5">
                            <span className="text-[10px] font-black leading-none" style={{ color: vip ? '#fde68a' : '#e9d5ff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                {formatK(player.xp)} XP / {formatK(player.xpToNextLevel)} XP
                            </span>
                        </div>
                    </div>
                </div>

                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Two-column body */}
            <div className="flex-1 flex min-h-0">

                {/* LEFT — Stats */}
                <div className="flex-1 px-3 py-2 flex flex-col overflow-y-auto no-scrollbar">
                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>Stats</div>
                    <StatRow vip={vip} icon="🪙" label="Balance" value={formatK(player.balance)} />
                    <StatRow vip={vip} icon="💎" label="Gems" value={formatK(player.diamonds)} />
                    <StatRow vip={vip} icon="🎰" label="Total Spins" value={formatK(stats.totalSpins)} />
                    <StatRow vip={vip} icon="🏆" label="Max Win" value={formatK(stats.maxSingleWin)} />
                    <StatRow vip={vip} icon="💰" label="Total Won" value={formatK(stats.totalCoinsWon)} />
                    <StatRow vip={vip} icon="🎯" label="Max Jackpot" value={formatK(stats.maxJackpotWin)} />

                    {/* Active Boosts */}
                    {(xpBoostActive || passBoostActive || vip || isPremium) && (
                        <>
                            <div className={`text-[9px] font-black uppercase tracking-widest mt-2 mb-1 ${labelColor}`}>Active Boosts</div>
                            {vip && <StatRow vip={vip} icon="👑" label="VIP" value="Active" />}
                            {isPremium && <StatRow vip={vip} icon="🎫" label="Monthly Pass" value="Active" />}
                            {xpBoostActive && <StatRow vip={vip} icon="🚀" label="XP Boost" value={`×${player.xpMultiplier}`} />}
                            {passBoostActive && <StatRow vip={vip} icon="⚡" label="Pass Boost" value={`×${passBoostMultiplier}`} />}
                        </>
                    )}
                </div>

                {/* RIGHT — Recent Slots */}
                <div className="flex-1 px-3 py-2 flex flex-col overflow-hidden">
                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>Recent Slots</div>
                    {recentGames.length > 0 ? (
                        <div className="flex-1 grid grid-cols-2 gap-2 content-start overflow-y-auto no-scrollbar">
                            {recentGames.map((game, i) => (
                                <div key={i} className="rounded-xl overflow-hidden flex flex-col"
                                    style={{ background: game.color || 'rgba(255,255,255,0.07)' }}>
                                    <div className="h-14 flex items-center justify-center text-3xl"
                                        style={{ background: 'rgba(0,0,0,0.35)' }}>🎰</div>
                                    <div className="text-white font-black text-[9px] uppercase tracking-wide text-center px-1 py-1.5 leading-tight">{game.name}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <span className={`text-xs ${labelColor}`}>No slots played yet</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
