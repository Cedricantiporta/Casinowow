import React, { useState, useEffect } from 'react';
import { Deck, Card, CardRarity } from '../types';
import { formatNumber, PACK_COSTS, formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';

interface CardCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenShop: (tab?: 'COINS' | 'BOOSTS' | 'DIAMONDS') => void;
    initialTab?: 'ALBUM' | 'PACKS';
    decks: Deck[];
    onClaimDeckReward: (deckId: string, reward: number) => void;
    onBuyPack: (packId: string, drawCount: number) => Card[];
    onBuyCredits: (cost: number, credits: number) => void;
    onBuyCreditsWithTokens?: (amount: number, cost: number) => void;
    diamonds: number;
    playerLevel: number;
    tokens: number;
    packCredits: number;
    balance: number;
    grandPrize?: number;
    getDeckReward?: (deckId: string) => number;
    premiumPackCredits?: number;
    onBuyPremiumCredits?: (gemCost: number, credits: number) => void;
}

export const CardCollectionModal: React.FC<CardCollectionModalProps> = ({
    isOpen,
    onClose,
    onOpenShop,
    initialTab,
    decks,
    onClaimDeckReward,
    onBuyPack,
    onBuyCredits,
    onBuyCreditsWithTokens,
    diamonds,
    playerLevel,
    tokens,
    packCredits,
    balance,
    grandPrize = 0,
    getDeckReward = (_deckId: string) => 0,
    premiumPackCredits = 0,
    onBuyPremiumCredits
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ALBUM' | 'PACKS'>(initialTab || 'ALBUM');
    const [showPackBuyPopup, setShowPackBuyPopup] = useState<'standard' | 'premium' | null>(null);
    const [showExchangePanel, setShowExchangePanel] = useState(false);
    const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<string>>(new Set());
    const albumScrollRef = React.useRef<HTMLDivElement>(null);
    const deckCardsScrollRef = React.useRef<HTMLDivElement>(null);

    const scrollAlbum = (dir: 'LEFT' | 'RIGHT') => {
        albumScrollRef.current?.scrollBy({ left: dir === 'LEFT' ? -160 : 160, behavior: 'smooth' });
    };

    React.useEffect(() => {
        if (!isOpen) return;
        const addWheel = (el: HTMLDivElement | null) => {
            if (!el) return () => {};
            const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
            el.addEventListener('wheel', handler, { passive: false });
            return () => el.removeEventListener('wheel', handler);
        };
        const r1 = addWheel(albumScrollRef.current);
        const r2 = addWheel(deckCardsScrollRef.current);
        return () => { r1(); r2(); };
    }, [isOpen, selectedDeckId, activeTab]);

    const [isOpeningPack, setIsOpeningPack] = useState(false);
    const [lastPackId, setLastPackId] = useState<string | null>(null);
    const [openedCards, setOpenedCards] = useState<Card[]>([]);
    const [packStage, setPackStage] = useState<'SHAKING' | 'BURST' | 'REVEAL' | 'DONE'>('DONE');
    const [skipAnimation, setSkipAnimation] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedDeckId(null);
            setIsOpeningPack(false);
            setPackStage('DONE');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialTab) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    const closePack = () => {
        setIsOpeningPack(false);
        setPackStage('DONE');
        setOpenedCards([]);
        setLastPackId(null);
    };

    const getCardBg = (rarity: CardRarity, isLocked: boolean): string => {
        if (isLocked) {
            switch(rarity) {
                case 'LEGENDARY': return 'linear-gradient(160deg,#78350f,#451a03)';
                case 'EPIC': return 'linear-gradient(160deg,#3b0764,#1e0438)';
                case 'RARE': return 'linear-gradient(160deg,#1e3a5f,#0c1a30)';
                default: return 'linear-gradient(160deg,#1e1e2e,#0d0d1a)';
            }
        }
        switch(rarity) {
            case 'LEGENDARY': return 'linear-gradient(160deg,#d97706,#f59e0b,#b45309)';
            case 'EPIC': return 'linear-gradient(160deg,#7c3aed,#a855f7,#6d28d9)';
            case 'RARE': return 'linear-gradient(160deg,#2563eb,#3b82f6,#1d4ed8)';
            default: return 'linear-gradient(160deg,#475569,#64748b,#334155)';
        }
    };

    const getCardBorder = (rarity: CardRarity): string => {
        switch(rarity) {
            case 'LEGENDARY': return '#fde68a';
            case 'EPIC': return '#c084fc';
            case 'RARE': return '#93c5fd';
            default: return '#94a3b8';
        }
    };

    const rarityOrder: Record<CardRarity, number> = {
        'COMMON': 0, 'RARE': 1, 'EPIC': 2, 'LEGENDARY': 3
    };

    const handleDraw = (packId: string, count: number) => {
        const cards = onBuyPack(packId, count);
        if (cards.length > 0) {
            cards.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
            setLastPackId(packId);
            setOpenedCards(cards);
            setIsOpeningPack(true);
            if (skipAnimation) {
                setPackStage('REVEAL');
                audioService.playWinBig();
            } else {
                setPackStage('SHAKING');
                audioService.playClick();
                setTimeout(() => {
                    setPackStage('BURST');
                    audioService.playWinSmall();
                    setTimeout(() => {
                        setPackStage('REVEAL');
                        audioService.playWinBig();
                    }, 600);
                }, 1000);
            }
        } else {
            setIsOpeningPack(false);
        }
    };

    const packOptions = [
        { id: 'super', name: 'Standard', credits: packCredits, emoji: '🃏', color: 'from-blue-700 to-blue-900', gemRate: 4.5 },
        { id: 'ultra', name: 'Premium',  credits: premiumPackCredits, emoji: '🎴', color: 'from-yellow-600 to-yellow-800', gemRate: 18 },
    ];

    if (!isOpen) return null;

    // Gather all duplicate cards across all decks
    const allDuplicates: { deckId: string; cardIdx: number; card: import('../types').Card }[] = [];
    decks.forEach(deck => {
        deck.cards.forEach((card, idx) => {
            if (card.isDuplicate) {
                const st = String(card.symbolType);
                if (!['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && card.icon !== '🪙') {
                    allDuplicates.push({ deckId: deck.gameId, cardIdx: idx, card });
                }
            }
        });
    });

    const handleExchangeDuplicates = (ids: Set<string>) => {
        const count = ids.size;
        if (count > 0) {
            onBuyCredits(0, count); // gives pack credits for free (exchange)
        }
        setShowExchangePanel(false);
        setSelectedDuplicateIds(new Set());
    };

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in" style={{ background: 'linear-gradient(160deg,#2e1065 0%,#0f0518 100%)' }}>
            {/* Duplicate Exchange Overlay */}
            {showExchangePanel && (
                <div className="absolute inset-0 z-[170] bg-black/90 backdrop-blur-sm flex flex-col animate-pop-in">
                    <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2" style={{ background: 'linear-gradient(180deg,#b45309,#78350f)' }}>
                        <span className="font-black text-white text-sm uppercase tracking-widest flex-1">🔄 Exchange Duplicates</span>
                        <span className="text-white/70 text-xs font-bold">1 Dup = 1 📦</span>
                        <button onClick={() => { setShowExchangePanel(false); setSelectedDuplicateIds(new Set()); }}
                            className="round-btn"><i className="ti ti-x" /></button>
                    </div>
                    {allDuplicates.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold uppercase">No duplicates yet</div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-5 gap-2 content-start">
                                {allDuplicates.map((dup, i) => {
                                    const key = `${dup.deckId}-${dup.cardIdx}`;
                                    const sel = selectedDuplicateIds.has(key);
                                    const borderColor = getCardBorder(dup.card.rarity);
                                    return (
                                        <button key={key} onClick={() => {
                                            setSelectedDuplicateIds(prev => {
                                                const next = new Set(prev);
                                                sel ? next.delete(key) : next.add(key);
                                                return next;
                                            });
                                        }} className="relative rounded-xl flex flex-col items-center justify-between overflow-hidden transition-all active:scale-95"
                                            style={{ background: getCardBg(dup.card.rarity, false), border: `2px solid ${sel ? '#fde68a' : borderColor}`, aspectRatio: '2/3', boxShadow: sel ? '0 0 12px #fde68a88' : `0 2px 8px ${borderColor}33` }}>
                                            {sel && <div className="absolute inset-0 bg-yellow-400/20 z-10 rounded-xl" />}
                                            <div className="w-full px-1 pt-1 flex justify-center">
                                                <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded-full bg-black/40 text-white/80">{dup.card.rarity[0]}</span>
                                            </div>
                                            <div className="flex-1 flex items-center justify-center">
                                                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{dup.card.icon}</span>
                                            </div>
                                            <div className="w-full px-0.5 pb-1 text-center">
                                                <div className="text-[7px] font-bold text-white/80 truncate">{dup.card.name}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="shrink-0 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className="text-white/60 text-xs font-bold flex-1">{selectedDuplicateIds.size} selected → {selectedDuplicateIds.size} 📦</span>
                                <button onClick={() => setSelectedDuplicateIds(new Set(allDuplicates.map(d => `${d.deckId}-${d.cardIdx}`)))}
                                    className="btn-3d px-3 py-1.5 rounded-lg text-xs font-black text-white uppercase"
                                    style={{ background: 'rgba(255,255,255,0.15)' }}>Select All</button>
                                <button disabled={selectedDuplicateIds.size === 0}
                                    onClick={() => handleExchangeDuplicates(selectedDuplicateIds)}
                                    className="btn-3d px-4 py-1.5 rounded-lg text-xs font-black text-white uppercase"
                                    style={{ background: selectedDuplicateIds.size > 0 ? 'linear-gradient(180deg,#f59e0b,#b45309)' : '#374151', boxShadow: selectedDuplicateIds.size > 0 ? '0 3px 0 #78350f' : 'none' }}>
                                    Exchange {selectedDuplicateIds.size > 0 ? selectedDuplicateIds.size : ''}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
            {/* Pack Opening Overlay */}
            {isOpeningPack && (
                <div className="absolute inset-0 z-[160] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3">
                    {packStage === 'SHAKING' && (
                        <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] pointer-events-none">📦</div>
                    )}
                    {packStage === 'BURST' && (
                        <div className="text-6xl scale-125 transition-transform duration-300 opacity-0 pointer-events-none">💥</div>
                    )}
                    {packStage === 'REVEAL' && (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-pop-in relative py-4">
                            <div className="flex-1 w-full max-w-2xl px-2 overflow-y-auto grid grid-cols-5 gap-2 content-center justify-items-center">
                                {openedCards.filter(card => { const st = String(card.symbolType); return !['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && card.icon !== '🪙'; }).map((card, i) => {
                                    const borderColor = getCardBorder(card.rarity);
                                    return (
                                    <div
                                        key={i}
                                        className={`relative w-full max-w-[80px] rounded-xl flex flex-col items-center justify-between overflow-hidden animate-pop-in ${card.rarity === 'LEGENDARY' ? 'animate-pulse duration-700' : ''}`}
                                        style={{ animationDelay: `${i * 30}ms`, background: getCardBg(card.rarity, false), border: `2px solid ${borderColor}`, aspectRatio: '2/3', boxShadow: `0 4px 20px ${borderColor}55` }}
                                    >
                                        {/* Rarity inside top */}
                                        <div className="w-full px-1 pt-1.5 flex justify-center">
                                            <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${card.rarity === 'LEGENDARY' ? 'bg-black/40 text-yellow-200' : card.rarity === 'EPIC' ? 'bg-black/40 text-purple-200' : card.rarity === 'RARE' ? 'bg-black/40 text-blue-200' : 'bg-black/40 text-white'}`}>
                                                {card.rarity}
                                            </span>
                                        </div>
                                        {card.isNew && <div className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[7px] font-black px-1 rounded z-20">NEW</div>}
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-3xl drop-shadow-md">{card.icon}</div>
                                        </div>
                                        <div className="w-full px-1 pb-1.5 text-center">
                                            <div className="text-[8px] font-bold text-white/90 bg-black/30 rounded px-1 truncate">{card.name}</div>
                                            {card.isDuplicate && <div className="text-yellow-300 text-[7px] font-bold uppercase mt-0.5">Dup</div>}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            <div className="shrink-0 mt-4 flex flex-col sm:flex-row gap-2 z-50 items-center bg-black/70 p-2.5 rounded-xl">
                                <button onClick={closePack} className="px-5 py-1.5 bg-gray-700 rounded-lg text-white font-bold text-xs uppercase hover:bg-gray-600">Close</button>
                                {lastPackId && (
                                    <div className="flex gap-1.5 items-center">
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 1), 100); }}
                                            className="px-4 py-1.5 bg-green-600 rounded-lg text-white font-bold text-xs uppercase">1x</button>
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 10), 100); }}
                                            className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg text-white font-bold text-xs uppercase relative overflow-hidden">
                                            10x
                                            <span className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</span>
                                        </button>
                                        <label className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md cursor-pointer ml-1">
                                            <input type="checkbox" checked={skipAnimation} onChange={(e) => setSkipAnimation(e.target.checked)} className="w-3 h-3 text-yellow-500 rounded bg-gray-800 border-gray-600" />
                                            <span className="text-[8px] font-bold text-gray-300 uppercase leading-none">Skip</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

                {/* Header */}
                <div className="bg-gradient-to-r from-[#4c1d95] to-[#3b0764] px-3 py-2 flex items-center gap-2 shrink-0 z-10 shadow-lg">
                    {selectedDeckId && (
                        <button onClick={() => setSelectedDeckId(null)} className="round-btn shrink-0">
                            <i className="ti ti-arrow-left"></i>
                        </button>
                    )}
                    <h2 className="text-xs font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-200 uppercase tracking-wider shrink-0">
                        {selectedDeckId ? decks.find(d => d.gameId === selectedDeckId)?.gameName : 'Album'}
                    </h2>

                    {!selectedDeckId && (
                        <div className="flex items-center gap-1.5 ml-1">
                            {activeTab === 'ALBUM' ? (
                                <button onClick={() => setActiveTab('PACKS')}
                                    className="btn-3d px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white"
                                    style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 3px 0 #14532d' }}>
                                    🃏 Draw Cards
                                </button>
                            ) : (
                                <button onClick={() => setActiveTab('ALBUM')}
                                    className="btn-3d px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white"
                                    style={{ background: 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: '0 3px 0 #4c1d95' }}>
                                    📚 Decks
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <div className="coin">$</div>
                            <span className="num">{formatNumber(balance)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <div className="gem"></div>
                            <span className="num">{formatNumber(diamonds)}</span>
                        </div>
                        <button onClick={() => setShowPackBuyPopup('standard')}
                            className="currency-pill flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
                            style={{ cursor: 'pointer' }}>
                            <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>📦</span>
                            <span className="num">{packCredits}</span>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#4ade80', textTransform: 'uppercase' }}>+GET</span>
                        </button>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>💳</span>
                            <span className="num">{formatNumber(tokens)}</span>
                        </div>
                    </div>
                    <div className="round-btn cursor-pointer shrink-0 ml-1" onClick={onClose}><i className="ti ti-x"></i></div>
                </div>

                {/* Horizontal scroll content */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar p-3 min-h-0">

                    {/* ALBUM view */}
                    {!selectedDeckId && activeTab === 'ALBUM' && (
                        <div className="flex flex-col h-full gap-2">
                            {/* Grand reward — no container, no emoji, just text */}
                            <div className="shrink-0 text-center leading-tight">
                                <div className="text-yellow-400 text-[9px] font-black uppercase tracking-widest">Grand Reward</div>
                                <div className="text-white font-black text-xl font-mono">{formatNumber(grandPrize)}</div>
                            </div>

                            {/* Deck scroll — swipe/wheel only */}
                            <div ref={albumScrollRef} className="flex-1 overflow-x-auto flex items-stretch gap-3 no-scrollbar min-h-0">
                                {decks.map(deck => {
                                    const collected = deck.cards.filter(c => c.count > 0).length;
                                    const isComplete = collected === 8;
                                    return (
                                        <button key={deck.gameId} onClick={() => setSelectedDeckId(deck.gameId)}
                                            className="flex-none w-36 flex flex-col items-center bg-black/40 p-2 rounded-xl h-full active:scale-95 transition-transform">
                                            <div className={`w-full flex-1 rounded-lg flex items-center justify-center overflow-hidden relative min-h-0`} style={{ background: deck.theme === 'NEON' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : deck.theme === 'EGYPT' ? 'linear-gradient(135deg,#b45309,#78350f)' : deck.theme === 'DRAGON' ? 'linear-gradient(135deg,#dc2626,#7f1d1d)' : deck.theme === 'PIRATE' ? 'linear-gradient(135deg,#0369a1,#0c4a6e)' : deck.theme === 'SPACE' ? 'linear-gradient(135deg,#1d4ed8,#0f172a)' : deck.theme === 'CANDY' ? 'linear-gradient(135deg,#db2777,#9d174d)' : deck.theme === 'JUNGLE' ? 'linear-gradient(135deg,#15803d,#14532d)' : deck.theme === 'UNDERWATER' ? 'linear-gradient(135deg,#0891b2,#164e63)' : deck.theme === 'WESTERN' ? 'linear-gradient(135deg,#ca8a04,#713f12)' : deck.theme === 'SAMURAI' ? 'linear-gradient(135deg,#9f1239,#4c0519)' : deck.theme === 'PIGGY' ? 'linear-gradient(135deg,#ec4899,#9d174d)' : 'linear-gradient(135deg,#475569,#1e293b)' }}>
                                                <div className="text-[5rem] drop-shadow-2xl leading-none">{deck.theme === 'NEON' ? '🎰' : deck.theme === 'EGYPT' ? '🦂' : deck.theme === 'DRAGON' ? '🐉' : deck.theme === 'PIRATE' ? '🏴‍☠️' : deck.theme === 'SPACE' ? '👽' : deck.theme === 'PIGGY' ? '🐷' : '🃏'}</div>
                                                {isComplete && <div className="absolute top-1 right-1 text-sm">✅</div>}
                                                <div className="absolute bottom-1 text-center w-full px-1">
                                                    <div className="text-white font-mono font-black text-[15px] drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">+{formatNumber(getDeckReward(deck.gameId))}</div>
                                                </div>
                                            </div>
                                            <div className="mt-1.5 text-center w-full">
                                                <h3 className="text-white font-black font-display text-[13px] truncate leading-none">{deck.gameName}</h3>
                                                <div className="text-purple-300 font-bold text-[10px] uppercase mt-0.5">{collected}/8</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PACKS view */}
                    {!selectedDeckId && activeTab === 'PACKS' && (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            {/* Buy Packs button — above cards */}
                            <button onClick={() => setShowPackBuyPopup('standard')}
                                className="btn-3d px-6 py-2 rounded-xl font-black text-white uppercase text-xs tracking-widest"
                                style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', boxShadow: '0 3px 0 #2e1065' }}>
                                🃏 Buy Packs
                            </button>

                            {/* Two card-shaped pack containers */}
                            <div className="flex gap-4 items-center justify-center">
                                {packOptions.map(pack => {
                                    const canDrawOne = pack.credits >= 1;
                                    const canDrawTen = pack.credits >= 9;
                                    return (
                                        <div key={pack.id} className="flex flex-col items-center gap-2 rounded-2xl overflow-hidden"
                                            style={{
                                                width: 130,
                                                background: pack.id === 'super'
                                                    ? 'linear-gradient(160deg,#1e3a8a,#1e40af,#1e3a8a)'
                                                    : 'linear-gradient(160deg,#78350f,#b45309,#78350f)',
                                                border: pack.id === 'super' ? '2px solid #3b82f6' : '2px solid #f59e0b',
                                                boxShadow: pack.id === 'super' ? '0 4px 20px rgba(59,130,246,0.3)' : '0 4px 20px rgba(245,158,11,0.3)',
                                                padding: '12px 10px 10px',
                                            }}>
                                            {/* Pack emoji */}
                                            <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{pack.emoji}</span>
                                            {/* Pack name */}
                                            <div className="font-black text-white text-[11px] uppercase tracking-widest text-center leading-none">{pack.name}</div>
                                            {/* Credits count */}
                                            <div className="font-bold text-white/60 text-[10px]">{pack.credits} packs</div>
                                            {/* Draw 1x */}
                                            <button onClick={() => handleDraw(pack.id, 1)} disabled={!canDrawOne}
                                                className="btn-3d w-full py-1.5 rounded-lg font-black text-white uppercase text-[10px]"
                                                style={{ background: canDrawOne ? 'linear-gradient(180deg,#22c55e,#15803d)' : '#374151', boxShadow: canDrawOne ? '0 2px 0 #14532d' : 'none' }}>
                                                DRAW 1×
                                            </button>
                                            {/* Draw 10x */}
                                            <button onClick={() => handleDraw(pack.id, 10)} disabled={!canDrawTen}
                                                className="btn-3d w-full py-1.5 rounded-lg font-black text-white uppercase text-[10px] relative overflow-hidden"
                                                style={{ background: canDrawTen ? 'linear-gradient(180deg,#f59e0b,#b45309)' : '#374151', boxShadow: canDrawTen ? '0 2px 0 #78350f' : 'none' }}>
                                                DRAW 10×
                                                {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</div>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Exchange Dupes button — below cards */}
                            <button onClick={() => setShowExchangePanel(true)}
                                className="btn-3d px-5 py-2 rounded-xl font-black text-white uppercase text-[10px] flex items-center gap-1.5"
                                style={{ background: 'linear-gradient(180deg,#f59e0b,#b45309)', boxShadow: '0 3px 0 #78350f' }}>
                                <span>🔄</span> Exchange Dupes
                            </button>
                        </div>
                    )}

                    {/* Single Deck card view — horizontal row */}
                    {selectedDeckId && (
                        <div className="flex flex-col h-full">
                            {/* Completion reward — centered, no container */}
                            <div className="shrink-0 text-center mb-2">
                                <div className="text-yellow-400 text-[8px] font-black uppercase tracking-widest">🏆 Completion Reward</div>
                                <div className="text-white font-black text-lg font-mono leading-none">{formatCommaNumber(getDeckReward(selectedDeckId))}</div>
                                <div className="mt-1">
                                    {decks.find(d => d.gameId === selectedDeckId)?.isCompleted ? (
                                        decks.find(d => d.gameId === selectedDeckId)?.rewardClaimed ? (
                                            <span className="text-gray-500 text-[9px] font-bold uppercase">Reward Claimed</span>
                                        ) : (
                                            <button onClick={() => onClaimDeckReward(selectedDeckId!, getDeckReward(selectedDeckId))} className="btn-3d bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-1 rounded-lg font-black text-black text-[10px] uppercase shadow-md">Claim Reward</button>
                                        )
                                    ) : (
                                        <span className="text-gray-500 text-[8px] font-bold uppercase">Collect all cards to claim</span>
                                    )}
                                </div>
                            </div>
                            <div ref={deckCardsScrollRef} className="flex-1 overflow-x-auto no-scrollbar">
                                <div className="flex gap-2 h-full items-stretch min-w-max py-0.5">
                                    {decks.find(d => d.gameId === selectedDeckId)?.cards
                                        .filter(card => {
                                            const st = String(card.symbolType);
                                            if (['TEN','JACK','QUEEN','KING','ACE'].includes(st)) return false;
                                            if (st.startsWith('JACKPOT')) return false;
                                            if (card.icon === '🪙') return false;
                                            return true;
                                        })
                                        .map((card, i) => {
                                        const borderColor = getCardBorder(card.rarity);
                                        const isLocked = card.count === 0;
                                        return (
                                            <div key={i} className="flex-none rounded-xl flex flex-col items-center justify-between relative overflow-hidden"
                                                style={{ width: '140px', height: '220px', background: getCardBg(card.rarity, isLocked), border: `2px solid ${isLocked ? borderColor + '44' : borderColor}`, boxShadow: isLocked ? 'none' : `0 4px 16px ${borderColor}44` }}>
                                                {/* Rarity + count top bar */}
                                                <div className="w-full flex items-center justify-between px-2 pt-2">
                                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm ${card.rarity === 'LEGENDARY' ? 'bg-black/40 text-yellow-200' : card.rarity === 'EPIC' ? 'bg-black/40 text-purple-200' : card.rarity === 'RARE' ? 'bg-black/40 text-blue-200' : 'bg-black/40 text-white/70'}`}>{card.rarity[0]}</span>
                                                    {card.count > 0 && (
                                                        <span className="text-[10px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-sm">×{card.count}</span>
                                                    )}
                                                </div>
                                                {/* Icon — centered */}
                                                <div className="flex-1 flex items-center justify-center w-full">
                                                    <span className="text-6xl leading-none drop-shadow-md">{isLocked ? '🔒' : card.icon}</span>
                                                </div>
                                                {/* Name bar at bottom */}
                                                <div className="w-full px-2 pb-2.5">
                                                    <div className="text-[11px] font-black text-center w-full truncate leading-none py-1 rounded-sm"
                                                        style={{ background: 'rgba(0,0,0,0.35)', color: isLocked ? '#666' : 'white' }}>
                                                        {card.name}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            {/* Card Pack Buy Popup */}
            {showPackBuyPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowPackBuyPopup(null)}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 300, background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                            <div>
                                <div className="text-white font-black text-base leading-none">
                                    {showPackBuyPopup === 'standard' ? '🃏 Buy Standard Packs' : '🎴 Buy Premium Packs'}
                                </div>
                                <div className="text-purple-300/60 text-[10px] mt-0.5">
                                    {showPackBuyPopup === 'premium' ? 'Shop-only · 4× value' : 'Obtainable via spinning'}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full">
                                <span className="text-sm">💎</span>
                                <span className="text-white font-black text-sm">{formatNumber(diamonds)}</span>
                            </div>
                        </div>
                        <div className="px-4 pb-4 flex flex-col gap-2">
                            {(showPackBuyPopup === 'standard'
                                ? [
                                    { label: '10× 🃏',  packs: 10, gemCost: 45,  isBundle: false },
                                    { label: '50× 🃏',  packs: 50, gemCost: 200, isBundle: false },
                                    { label: '🎁 Starter Bundle', packs: 15, gemCost: 80,  isBundle: true },
                                    { label: '🎁 Pro Bundle',     packs: 60, gemCost: 280, isBundle: true },
                                ]
                                : [
                                    { label: '10× 🎴',  packs: 10, gemCost: 180,  isBundle: false },
                                    { label: '50× 🎴',  packs: 50, gemCost: 800,  isBundle: false },
                                    { label: '🎁 Premium Starter', packs: 15, gemCost: 320,  isBundle: true },
                                    { label: '🎁 Premium Pro',     packs: 60, gemCost: 1100, isBundle: true },
                                ]
                            ).map(opt => {
                                const canAfford = diamonds >= opt.gemCost;
                                const buyFn = showPackBuyPopup === 'standard' ? onBuyCredits : onBuyPremiumCredits;
                                return (
                                    <button key={opt.label}
                                        onClick={() => { if (!canAfford || !buyFn) return; buyFn(opt.gemCost, opt.packs); setShowPackBuyPopup(null); }}
                                        disabled={!canAfford}
                                        className="btn-3d w-full py-2.5 rounded-xl flex items-center justify-between px-3"
                                        style={{
                                            background: canAfford ? (opt.isBundle ? 'linear-gradient(180deg,#f59e0b,#b45309)' : 'linear-gradient(180deg,#7c3aed,#4c1d95)') : 'rgba(0,0,0,0.4)',
                                            boxShadow: canAfford ? (opt.isBundle ? '0 3px 0 #78350f' : '0 3px 0 #2e1065') : 'none',
                                            opacity: canAfford ? 1 : 0.5,
                                        }}>
                                        <span className="text-white font-black text-sm">{opt.label}</span>
                                        <span className="text-purple-200 font-black text-sm">💎 {opt.gemCost}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
