
import React, { useState, useEffect } from 'react';
import { QuestSidebar } from './QuestSidebar';
import { QuestState, MissionState } from '../types';
import { formatTime } from '../constants';

interface LeftSidebarProps {
    quest: QuestState;
    onQuestClaim: () => void;
    xpMultiplier: number;
    xpBoostEndTime: number;
    missionState: MissionState;
    onOpenMissions: () => void;
    onOpenBattlePass: () => void;
    picks?: number;
    playerLevel: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    quest, 
    onQuestClaim, 
    xpMultiplier, 
    xpBoostEndTime,
    missionState,
    onOpenMissions,
    onOpenBattlePass,
    picks = 0,
    playerLevel
}) => {
    
    const isMissionXpBoosted = missionState.passBoostMultiplier > 1;
    
    // Only count premium rewards if user is premium
    const passRewardsReady = missionState.passRewards.filter(r => 
        r.level <= missionState.passLevel && 
        !r.claimed && 
        (r.tier === 'FREE' || (r.tier === 'PREMIUM' && missionState.isPremium))
    ).length;

    const isQuestUnlocked = playerLevel >= 20;
    const isMissionsUnlocked = playerLevel >= 10;

    return (
        <div className="fixed top-1/2 -translate-y-1/2 flex flex-col gap-8 z-30 pointer-events-none items-center" style={{ left: 'calc(env(safe-area-inset-left, 0px) + 0.5rem)' }}>
            {/* Quest Widget - Unlocked or Locked always visible */}
            <div className={`pointer-events-auto flex flex-col items-center animate-pop-in relative ${!isQuestUnlocked ? 'grayscale opacity-60' : ''}`}>
                <QuestSidebar 
                    quest={quest} 
                    onClaim={isQuestUnlocked ? onQuestClaim : () => {}}
                    xpMultiplier={xpMultiplier}
                    xpBoostEndTime={xpBoostEndTime}
                    picks={picks}
                />
                {!isQuestUnlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px] rounded-full z-20 pointer-events-none">
                        <img src="/ui/lock.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,1))' }} />
                        <span className="text-white text-[8px] px-1 rounded font-bold bg-red-600 shadow-md mt-0.5">Lvl 20</span>
                    </div>
                )}
            </div>

            {/* Missions Widget Group - Unlocked or Locked always visible */}
            <div className="pointer-events-auto flex flex-col gap-6 items-center animate-pop-in">
                
                {/* Mission button removed for in-game floating UI per request */}

                {/* Season Pass Button */}
                <div className="relative flex flex-col items-center justify-center">
                    <button 
                        onClick={isMissionsUnlocked ? onOpenBattlePass : undefined}
                        className={`group relative w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-900 to-[#4a044e] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-visible z-10 ${!isMissionsUnlocked ? 'grayscale opacity-60' : ''}`}
                    >
                        <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none overflow-hidden"></div>
                        <div className="flex flex-col items-center justify-center">
                             <img src="/ui/pass.png" alt="" className="drop-shadow-md group-hover:-translate-y-1 transition-transform mb-1" style={{ width: 54, height: 54, objectFit: 'contain' }} />
                             <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">
                                Pass
                             </span>
                        </div>
                        
                        {passRewardsReady > 0 && isMissionsUnlocked && (
                            <div className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg z-20"
                                style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
                                {passRewardsReady}
                            </div>
                        )}
                    </button>
                    
                    {!isMissionsUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px] rounded-full z-20 pointer-events-none">
                            <img src="/ui/lock.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,1))' }} />
                            <span className="text-white text-[8px] px-1 rounded font-bold bg-red-600 shadow-md mt-0.5">Lvl 10</span>
                        </div>
                    )}
                    
                    {passRewardsReady > 0 && isMissionsUnlocked && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase drop-shadow-md shadow-lg whitespace-nowrap"
                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
                            COLLECT
                        </span>
                    )}
                </div>
            </div>

            {/* XP Boost Indicator (Redesigned) - Show always if active */}
            {xpMultiplier > 1 && (
                <div className="relative w-20 h-20 animate-pop-in z-30 rounded-full shadow-xl mt-2 pointer-events-auto">
                     {/* Pulsing Glow */}
                     <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md animate-pulse opacity-60"></div>
                     
                     {/* Main Circle - Yellow Gradient, No Border Lines */}
                     <div className="relative w-full h-full rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-lg flex items-center justify-center overflow-hidden">
                         
                         <div className="flex items-center justify-center gap-0.5 -mt-2">
                             <span className="text-2xl md:text-3xl font-black text-yellow-900 drop-shadow-sm">2X</span>
                             <span className="text-[8px] font-bold text-yellow-800 uppercase mt-2">XP</span>
                         </div>

                         {/* Timer Pill at Bottom */}
                         <div className="absolute bottom-2 bg-yellow-800/30 px-2 py-0.5 rounded-full">
                             <span className="text-[8px] md:text-[10px] font-mono font-black text-yellow-900 leading-none">
                                 <XPTimer endTime={xpBoostEndTime} />
                             </span>
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};

// Helper for timer to avoid recreating intervals in main component too often for UI
const XPTimer: React.FC<{ endTime: number }> = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(Math.max(0, endTime - Date.now()));
        }, 1000);
        return () => clearInterval(interval);
    }, [endTime]);
    return <>{formatTime(timeLeft)}</>;
};
