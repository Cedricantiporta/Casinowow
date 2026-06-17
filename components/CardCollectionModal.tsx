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
    onExchangeCards?: (exchanges: { deckId: string; cardIdx: number; removeCount: number }[]) => void;
    onGainGems?: (amount: number) => void;
    maxBet?: number;
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
    onBuyPremiumCredits,
    onExchangeCards,
    onGainGems,
    maxBet = 10000
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ALBUM' | 'PACKS'>(initialTab || 'ALBUM');
    const [showPackBuyPopup, setShowPackBuyPopup] = useState<'standard' | 'premium' | null>(null);
    const [showExchangePanel, setShowExchangePanel] = useState(false);
    const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<string>>(new Set());
    const albumScrollRef = React.useRef<HTMLDivElement>(null);
    const deckCardsScrollRef = React.useRef<HTMLDivElement>(null);
    const packStoreScrollRef = React.useRef<HTMLDivElement>(null);
    const packStorePremiumRef = React.useRef<HTMLDivElement>(null);

    const scrollPackStore = (section: 'standard' | 'premium') => {
        if (!packStoreScrollRef.current) return;
        if (section === 'premium' && packStorePremiumRef.current) {
            packStoreScrollRef.current.scrollTo({ left: packStorePremiumRef.current.offsetLeft - 8, behavior: 'smooth' });
        } else {
            packStoreScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };

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

    // Gather duplicate cards grouped by card identity (one entry per unique card that has extras)
    const allDuplicates: { deckId: string; cardIdx: number; card: import('../types').Card; extraCount: number }[] = [];
    decks.forEach(deck => {
        deck.cards.forEach((card, idx) => {
            const extraCopies = (card.count || 0) - 1;
            if (extraCopies > 0) {
                const st = String(card.symbolType);
                if (!['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && card.icon !== '🪙') {
                    allDuplicates.push({ deckId: deck.gameId, cardIdx: idx, card, extraCount: extraCopies });
                }
            }
        });
    });

    const getExchangeGems = (ids: Set<string>) => {
        let gems = 0;
        allDuplicates.forEach(dup => {
            const key = `${dup.deckId}-${dup.cardIdx}`;
            if (!ids.has(key)) return;
            const perCard = dup.card.rarity === 'COMMON' ? 1 : dup.card.rarity === 'RARE' ? 2 : dup.card.rarity === 'EPIC' ? 4 : 10;
            gems += dup.extraCount * perCard;
        });
        return gems;
    };

    const handleExchangeDuplicates = (ids: Set<string>) => {
        if (ids.size === 0) return;
        const gems = getExchangeGems(ids);
        if (gems > 0) onGainGems?.(gems);
        const exchanges = allDuplicates
            .filter(dup => ids.has(`${dup.deckId}-${dup.cardIdx}`))
            .map(dup => ({ deckId: dup.deckId, cardIdx: dup.cardIdx, removeCount: dup.extraCount }));
        if (exchanges.length > 0) onExchangeCards?.(exchanges);
        setShowExchangePanel(false);
        setSelectedDuplicateIds(new Set());
    };

    return (
        <div className="absolute inset-0 z-[150] flex flex-col animate-pop-in" style={{ background: 'linear-gradient(160deg,#2e1065 0%,#0f0518 100%)' }}>
            {/* Duplicate Exchange Overlay */}
            {showExchangePanel && (
                <div className="absolute inset-0 z-[170] flex flex-col animate-pop-in" style={{ background: 'linear-gradient(160deg,#2e1065 0%,#0f0518 100%)' }}>
                    {/* Purple topbar — compact */}
                    <div className="shrink-0 flex items-center gap-2 px-3 py-1.5" style={{ background: 'linear-gradient(180deg,#7c3fb5,#4a1880)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <span className="font-black text-white text-xs uppercase tracking-widest flex-1">Exchange Duplicates</span>
                        <button onClick={() => { setShowExchangePanel(false); setSelectedDuplicateIds(new Set()); }}
                            className="round-btn" style={{ width:24, height:24, fontSize:14 }}><i className="ti ti-x" /></button>
                    </div>
                    {allDuplicates.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold uppercase">No duplicates yet</div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-2 grid grid-cols-10 gap-1.5 content-start">
                                {allDuplicates.map((dup) => {
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
                                        }} className="relative rounded-lg flex flex-col items-center justify-between overflow-hidden transition-all active:scale-95"
                                            style={{ background: getCardBg(dup.card.rarity, false), border: `2px solid ${sel ? '#fde68a' : borderColor}`, aspectRatio: '2/3', boxShadow: sel ? '0 0 8px #fde68a88' : `0 1px 4px ${borderColor}44` }}>
                                            {sel && <div className="absolute inset-0 bg-yellow-400/20 z-10 rounded-lg" />}
                                            {/* Rarity label top-left */}
                                            <div className="w-full px-0.5 pt-0.5 flex justify-between items-start">
                                                <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded-full bg-black/50 text-white/80 leading-none">{dup.card.rarity[0]}</span>
                                                {dup.extraCount > 1 && (
                                                    <span className="text-[8px] font-black text-yellow-300 bg-black/60 px-0.5 rounded leading-none">×{dup.extraCount}</span>
                                                )}
                                            </div>
                                            {/* Icon */}
                                            <div className="flex-1 flex items-center justify-center">
                                                {dup.card.icon.startsWith('/') ? (
                                                    <img src={dup.card.icon} alt="" style={{ width: '1.6rem', height: '1.6rem', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{dup.card.icon}</span>
                                                )}
                                            </div>
                                            {/* Name */}
                                            <div className="w-full px-0.5 pb-0.5 text-center">
                                                <div className="text-[7px] font-bold text-white/70 truncate leading-tight">{dup.card.name}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="shrink-0 flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                {(() => {
                                    const gems = getExchangeGems(selectedDuplicateIds);
                                    return (
                                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                                            <span className="text-white/60 text-xs font-black uppercase tracking-wide shrink-0">{selectedDuplicateIds.size} Selected:</span>
                                            {gems > 0 ? <span className="text-blue-300 text-sm font-black shrink-0 flex items-center gap-1"><img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {gems} Gems</span> : <span className="text-white/20 text-xs font-bold">—</span>}
                                        </div>
                                    );
                                })()}
                                <button onClick={() => setSelectedDuplicateIds(new Set(allDuplicates.map(d => `${d.deckId}-${d.cardIdx}`)))}
                                    className="btn-3d px-3 py-1.5 rounded-lg text-xs font-black text-white uppercase"
                                    style={{ background: 'rgba(255,255,255,0.15)' }}>All</button>
                                <button disabled={selectedDuplicateIds.size === 0}
                                    onClick={() => handleExchangeDuplicates(selectedDuplicateIds)}
                                    className="btn-3d px-4 py-1.5 rounded-lg text-xs font-black text-white uppercase"
                                    style={{ background: selectedDuplicateIds.size > 0 ? 'linear-gradient(180deg,#f59e0b,#b45309)' : '#374151', boxShadow: selectedDuplicateIds.size > 0 ? '0 3px 0 #78350f' : 'none' }}>
                                    Exchange
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
                        <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] pointer-events-none">{lastPackId === 'ultra' ? '🎴' : '🃏'}</div>
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
                                            {card.icon.startsWith('/') ? (
                                                <img src={card.icon} alt="" style={{ width: '2.5rem', height: '2.5rem', objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }} />
                                            ) : (
                                                <div className="text-3xl drop-shadow-md">{card.icon}</div>
                                            )}
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
                                    Draw Cards
                                </button>
                            ) : (
                                <button onClick={() => setActiveTab('ALBUM')}
                                    className="btn-3d px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white"
                                    style={{ background: 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: '0 3px 0 #4c1d95' }}>
                                    Decks
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
                            <button onClick={() => onOpenShop('DIAMONDS')} style={{ fontSize: '10px', background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', color: '#c084fc', fontWeight: 900, lineHeight: 1 }}>+</button>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>🃏</span>
                            <span className="num">{packCredits}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>🎴</span>
                            <span className="num">{premiumPackCredits}</span>
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
                                    const isComplete = collected === 7;
                                    return (
                                        <button key={deck.gameId} onClick={() => setSelectedDeckId(deck.gameId)}
                                            className="flex-none w-36 flex flex-col items-center bg-black/40 p-2 rounded-xl h-full active:scale-95 transition-transform">
                                            <div className={`w-full flex-1 rounded-lg flex items-center justify-center overflow-hidden relative min-h-0`} style={{ background: deck.theme === 'NEON' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : deck.theme === 'EGYPT' ? 'linear-gradient(135deg,#b45309,#78350f)' : deck.theme === 'DRAGON' ? 'linear-gradient(135deg,#dc2626,#7f1d1d)' : deck.theme === 'PIRATE' ? 'linear-gradient(135deg,#0369a1,#0c4a6e)' : deck.theme === 'SPACE' ? 'linear-gradient(135deg,#1d4ed8,#0f172a)' : deck.theme === 'CANDY' ? 'linear-gradient(135deg,#db2777,#9d174d)' : deck.theme === 'JUNGLE' ? 'linear-gradient(135deg,#15803d,#14532d)' : deck.theme === 'UNDERWATER' ? 'linear-gradient(135deg,#0891b2,#164e63)' : deck.theme === 'WESTERN' ? 'linear-gradient(135deg,#ca8a04,#713f12)' : deck.theme === 'SAMURAI' ? 'linear-gradient(135deg,#9f1239,#4c0519)' : deck.theme === 'PIGGY' ? 'linear-gradient(135deg,#ec4899,#9d174d)' : 'linear-gradient(135deg,#475569,#1e293b)' }}>
                                                <div className="text-[5rem] drop-shadow-2xl leading-none">
                                                    {deck.theme === 'NEON' ? '🎰' : deck.theme === 'EGYPT' ? '🦂' : deck.theme === 'DRAGON' ? '🐉' : deck.theme === 'PIRATE' ? '🏴‍☠️' : deck.theme === 'SPACE' ? '👽' : deck.theme === 'PIGGY' ? '🐷' : deck.theme === 'CANDY' ? '🧁' : deck.theme === 'JUNGLE' ? '🦍' : deck.theme === 'UNDERWATER' ? '🦈' : deck.theme === 'WESTERN' ? '🤠' : deck.theme === 'SAMURAI' ? '⚔️' : '🃏'}
                                                </div>
                                                {isComplete && <div className="absolute top-1 right-1 text-sm">✅</div>}
                                            </div>
                                            <div className="mt-1.5 text-center w-full">
                                                <h3 className="text-white font-black font-display text-[13px] truncate leading-none">{deck.gameName}</h3>
                                                <div className="text-purple-300 font-bold text-[10px] uppercase mt-0.5">{collected}/7</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PACKS view */}
                    {!selectedDeckId && activeTab === 'PACKS' && (
                        <div className="flex h-full gap-3">
                            {/* LEFT — Two big draw cards */}
                            <div className="flex-1 flex items-center justify-center gap-4">
                                {packOptions.map(pack => {
                                    const canDrawOne = pack.credits >= 1;
                                    const canDrawTen = pack.credits >= 9;
                                    const isStandard = pack.id === 'super';
                                    return (
                                        <div key={pack.id} className="flex flex-col rounded-2xl overflow-hidden"
                                            style={{
                                                width: 160,
                                                height: '100%',
                                                maxHeight: 260,
                                                background: isStandard
                                                    ? 'linear-gradient(160deg,#0f1f55,#1a35a0,#0f1f55)'
                                                    : 'linear-gradient(160deg,#4a1a00,#8a3500,#4a1a00)',
                                                padding: '14px 12px 12px',
                                            }}>
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                                <span style={{ fontSize: '4rem', lineHeight: 1 }}>{pack.emoji}</span>
                                                <div className="font-black text-white text-sm uppercase tracking-widest text-center leading-none">{pack.name}</div>
                                                <div className="font-bold text-white/50 text-[11px]">{pack.credits} packs</div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <button onClick={() => handleDraw(pack.id, 1)} disabled={!canDrawOne}
                                                    className="btn-3d w-full py-2 rounded-xl font-black text-white uppercase text-xs"
                                                    style={{ background: canDrawOne ? 'linear-gradient(180deg,#22c55e,#15803d)' : '#374151', boxShadow: canDrawOne ? '0 3px 0 #14532d' : 'none' }}>
                                                    DRAW 1×
                                                </button>
                                                <button onClick={() => handleDraw(pack.id, 10)} disabled={!canDrawTen}
                                                    className="btn-3d w-full py-2 rounded-xl font-black text-white uppercase text-xs relative overflow-hidden"
                                                    style={{ background: canDrawTen ? 'linear-gradient(180deg,#f59e0b,#b45309)' : '#374151', boxShadow: canDrawTen ? '0 3px 0 #78350f' : 'none' }}>
                                                    DRAW 10×
                                                    {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</div>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* RIGHT PANEL — Buy Packs + Exchange Dupes */}
                            <div className="flex flex-col gap-3 shrink-0 justify-center" style={{ width: 120 }}>
                                <button onClick={() => setShowPackBuyPopup('standard')}
                                    className="btn-3d w-full rounded-xl font-black text-white uppercase flex flex-col items-center justify-center gap-1"
                                    style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', boxShadow: '0 3px 0 #2e1065', minHeight: 64, padding: '10px 8px' }}>
                                    <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🃏</span>
                                    <span className="text-[10px] tracking-widest">Buy Packs</span>
                                </button>
                                <button onClick={() => setShowExchangePanel(true)}
                                    className="btn-3d w-full rounded-xl font-black text-white uppercase flex flex-col items-center justify-center gap-1 relative"
                                    style={{ background: 'linear-gradient(180deg,#f59e0b,#b45309)', boxShadow: '0 3px 0 #78350f', minHeight: 64, padding: '10px 8px' }}>
                                    <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🔄</span>
                                    <span className="text-[10px] tracking-widest">Exch. Dupes</span>
                                    {allDuplicates.length > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{allDuplicates.length > 99 ? '99+' : allDuplicates.length}</span>
                                        </div>
                                    )}
                                </button>
                            </div>
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
                                                    {isLocked ? (
                                                        <img src="/ui/lock.png" alt="" style={{ width: '4rem', height: '4rem', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }} />
                                                    ) : card.icon.startsWith('/') ? (
                                                        <img src={card.icon} alt="" style={{ width: '4rem', height: '4rem', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }} />
                                                    ) : (
                                                        <span className="text-6xl leading-none drop-shadow-md">{card.icon}</span>
                                                    )}
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
                    <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        style={{ width: 680, height: 240, background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3">
                            <div className="font-black text-white text-sm uppercase tracking-widest flex-1">Pack Store</div>
                            <div className="flex items-center gap-1.5 ml-1">
                                <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
                                <span className="text-white font-black text-sm">{formatNumber(diamonds)}</span>
                                <button onClick={() => { setShowPackBuyPopup(null); onOpenShop('DIAMONDS'); }} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', border: 'none', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', color: '#c084fc', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                            <button onClick={() => setShowPackBuyPopup(null)} className="round-btn ml-1"><i className="ti ti-x" /></button>
                        </div>
                        {/* Horizontal scroll */}
                        <div ref={packStoreScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar px-3 pb-3">
                            <div className="flex gap-3 h-full items-stretch" style={{ minWidth: 'max-content' }}>
                                {/* Standard section label */}
                                <div className="flex flex-col justify-center shrink-0">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-blue-300/60"
                                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.2em' }}>
                                        Standard
                                    </div>
                                </div>
                                {/* Standard cards */}
                                {[
                                    { name: 'Starter', emoji: '🃏', gemCost: 80, packs: 10, contents: ['10 Standard Packs', `+${formatCommaNumber(Math.round(maxBet * 25))} Coins`], bg: 'linear-gradient(160deg,#0f1f55,#1a35a0)', accent: '#3b82f6', shadowClr: '#1e3a8a', dotColor: 'text-blue-300', textColor: 'text-blue-100/80' },
                                    { name: 'Pro Bundle', emoji: '🃏', gemCost: 280, packs: 30, contents: ['30 Standard Packs', `+${formatCommaNumber(Math.round(maxBet * 100))} Coins`], bg: 'linear-gradient(160deg,#1e3a8a,#1d4ed8)', accent: '#60a5fa', shadowClr: '#1e3a8a', dotColor: 'text-blue-300', textColor: 'text-blue-100/80' },
                                ].map(opt => {
                                    const canAfford = diamonds >= opt.gemCost;
                                    return (
                                        <div key={opt.name} className="flex-none flex flex-col rounded-2xl overflow-hidden shrink-0"
                                            style={{ width: 140, background: opt.bg, opacity: canAfford ? 1 : 0.55 }}>
                                            <div className="px-3 pt-3 pb-1 flex items-start gap-2 flex-1">
                                                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-white text-[10px] uppercase tracking-wide leading-none">{opt.name}</div>
                                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                                        {opt.contents.map((c, ci) => (
                                                            <div key={ci} className="flex items-center gap-1">
                                                                <span className={`${opt.dotColor} text-[8px]`}>✦</span>
                                                                <span className={`${opt.textColor} text-[9px] font-bold leading-tight`}>{c}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3 pt-1 shrink-0">
                                                <button onClick={() => { if (!canAfford) return; onBuyCredits(opt.gemCost, opt.packs); setShowPackBuyPopup(null); }}
                                                    disabled={!canAfford}
                                                    className="btn-3d w-full py-1.5 rounded-xl font-black text-white uppercase text-[10px] tracking-widest flex items-center justify-center gap-1"
                                                    style={{ background: canAfford ? `linear-gradient(180deg,${opt.accent},${opt.shadowClr})` : '#374151', boxShadow: canAfford ? `0 3px 0 ${opt.shadowClr}` : 'none' }}>
                                                    <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {opt.gemCost}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Section separator */}
                                <div className="w-px self-stretch bg-white/15 mx-1 shrink-0" />
                                {/* Premium section label */}
                                <div ref={packStorePremiumRef} className="flex flex-col justify-center shrink-0">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-purple-300/60"
                                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.2em' }}>
                                        Premium
                                    </div>
                                </div>
                                {/* Premium cards */}
                                {[
                                    { name: 'Starter', emoji: '🎴', gemCost: 320, packs: 10, contents: ['10 Premium Packs', `+${formatCommaNumber(Math.round(maxBet * 50))} Coins`], bg: 'linear-gradient(160deg,#2e1065,#5b21b6)', accent: '#a855f7', shadowClr: '#2e1065', dotColor: 'text-purple-300', textColor: 'text-purple-100/80' },
                                    { name: 'Pro Bundle', emoji: '🎴', gemCost: 1100, packs: 30, contents: ['30 Premium Packs', `+${formatCommaNumber(Math.round(maxBet * 200))} Coins`], bg: 'linear-gradient(160deg,#3b0764,#6d28d9)', accent: '#c084fc', shadowClr: '#3b0764', dotColor: 'text-purple-300', textColor: 'text-purple-100/80' },
                                ].map(opt => {
                                    const canAfford = diamonds >= opt.gemCost;
                                    const buyFn = onBuyPremiumCredits;
                                    return (
                                        <div key={opt.name} className="flex-none flex flex-col rounded-2xl overflow-hidden shrink-0"
                                            style={{ width: 140, background: opt.bg, opacity: canAfford ? 1 : 0.55 }}>
                                            <div className="px-3 pt-3 pb-1 flex items-start gap-2 flex-1">
                                                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-white text-[10px] uppercase tracking-wide leading-none">{opt.name}</div>
                                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                                        {opt.contents.map((c, ci) => (
                                                            <div key={ci} className="flex items-center gap-1">
                                                                <span className={`${opt.dotColor} text-[8px]`}>✦</span>
                                                                <span className={`${opt.textColor} text-[9px] font-bold leading-tight`}>{c}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3 pt-1 shrink-0">
                                                <button onClick={() => { if (!canAfford || !buyFn) return; buyFn(opt.gemCost, opt.packs); setShowPackBuyPopup(null); }}
                                                    disabled={!canAfford}
                                                    className="btn-3d w-full py-1.5 rounded-xl font-black text-white uppercase text-[10px] tracking-widest flex items-center justify-center gap-1"
                                                    style={{ background: canAfford ? `linear-gradient(180deg,${opt.accent},${opt.shadowClr})` : '#374151', boxShadow: canAfford ? `0 3px 0 ${opt.shadowClr}` : 'none' }}>
                                                    <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {opt.gemCost}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
