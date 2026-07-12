import React from 'react';

// Mystic Pets — Choose Your Companion. A classic pick-your-bonus-style volatility
// choice: the player picks one of 4 companions before free spins start, each with its
// own spin count and mechanic (this pattern is common across real slots that let you
// pick a bonus path/character up front).

export type PetsCompanion = 'DRAGON' | 'UNICORN' | 'PHOENIX' | 'CAT';

interface CompanionDef {
    pet: PetsCompanion;
    name: string;
    spins: number;
    perk: string;
    icon: string;
    color: string;
}

const COMPANIONS: CompanionDef[] = [
    { pet: 'DRAGON',  name: 'Dragon',  spins: 6,  perk: 'Every win pays ×3',        icon: 'ti-flame',        color: 'linear-gradient(180deg,#f87171,#7f1d1d)' },
    { pet: 'UNICORN', name: 'Unicorn', spins: 10, perk: 'Wilds lock for the round', icon: 'ti-stars',        color: 'linear-gradient(180deg,#c084fc,#581c87)' },
    { pet: 'PHOENIX', name: 'Phoenix', spins: 8,  perk: 'Low symbols upgrade',      icon: 'ti-crown',        color: 'linear-gradient(180deg,#fbbf24,#92400e)' },
    { pet: 'CAT',     name: 'Cat',     spins: 15, perk: 'Extra wilds every spin',   icon: 'ti-target-arrow', color: 'linear-gradient(180deg,#4ade80,#14532d)' },
];

interface Props { isOpen: boolean; onComplete: (pet: PetsCompanion) => void; }

export const CompanionPickModal: React.FC<Props> = ({ isOpen, onComplete }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="w-full max-w-[420px] rounded-3xl overflow-hidden flex flex-col items-center px-6 py-6"
                style={{ background: 'linear-gradient(180deg,#6b21a8 0%,#4c1d95 40%,#1e1147 100%)', boxShadow: 'inset 0 1px 0 rgba(216,180,254,0.35), 0 8px 32px rgba(0,0,0,0.85)' }}>
                <span className="font-black text-violet-200/70" style={{ fontSize: 11 }}>Choose your companion</span>
                <span className="font-tanker text-white mt-0.5" style={{ fontSize: 18, textAlign: 'center' }}>Each pet has its own free-spin style</span>

                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                    {COMPANIONS.map(c => (
                        <button key={c.pet} onClick={() => onComplete(c.pet)}
                            className="flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 transition-transform active:scale-95"
                            style={{ background: c.color, boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
                            <i className={`ti ${c.icon} text-white`} style={{ fontSize: 30 }} />
                            <span className="font-black text-white" style={{ fontSize: 13 }}>{c.name}</span>
                            <span className="font-bold text-white/80" style={{ fontSize: 10 }}>{c.spins} Spins</span>
                            <span className="font-bold text-white/70 text-center" style={{ fontSize: 9 }}>{c.perk}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
