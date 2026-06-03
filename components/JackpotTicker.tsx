
import React, { useState, useEffect } from 'react';
import { formatCommaNumber } from '../constants';
import { jackpotService } from '../services/jackpotService';

interface JackpotTickerProps {
    slotIdx?: number;
    currentBet?: number;
    isSpinning?: boolean;
}

const TIER_META = [
    { name: 'MINI',  tierClass: 't-green'  },
    { name: 'MINOR', tierClass: 't-cyan'   },
    { name: 'MAJOR', tierClass: 't-purple' },
    { name: 'MAXI',  tierClass: 't-red'    },
    { name: 'GRAND', tierClass: 't-gold'   },
];

export const JackpotTicker: React.FC<JackpotTickerProps> = ({ slotIdx = 0, isSpinning = false }) => {
    const [amounts, setAmounts] = useState<number[]>(() => jackpotService.getSlotAmounts(slotIdx));

    useEffect(() => {
        return jackpotService.subscribe(() => {
            setAmounts(jackpotService.getSlotAmounts(slotIdx));
        });
    }, [slotIdx]);

    return (
        <div className="jackpot font-nunito w-full select-none">
            {TIER_META.map((tier, idx) => (
                <div key={tier.name} className={`jp ${tier.tierClass}`}>
                    <div className="jp-tier">{tier.name}</div>
                    <div className="jp-amt">{formatCommaNumber(amounts[idx] ?? 0)}</div>
                </div>
            ))}
        </div>
    );
};
