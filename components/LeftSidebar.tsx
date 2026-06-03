
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
    
    const missionsReady = missionState.activeMissions.filter(m => m.completed && !m.claimed).length;
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
        <div className="fixed left-2 md:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30 pointer-events-none items-center">
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
                        <span className="text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">🔒</span>
                        <span className="text-white text-[8px] px-1 rounded font-bold bg-red-600 shadow-md mt-0.5">Lvl 20</span>
                    </div>
                )}
            </div>

            {/* Missions Widget Group - Unlocked or Locked always visible */}
            <div className="pointer-events-auto flex flex-col gap-6 items-center animate-pop-in">
                
                {/* Mission Button */}
                <div className="relative flex flex-col items-center justify-center">
                    <button 
                        onClick={isMissionsUnlocked ? onOpenMissions : undefined}
                        className={`group relative w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-900 to-[#2e1065] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-visible z-10 ${!isMissionsUnlocked ? 'grayscale opacity-60' : ''}`}
                    >
                        <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none overflow-hidden"></div>
                        <div className="flex flex-col items-center justify-center">
                             <div className="text-2xl md:text-4xl drop-shadow-md group-hover:-translate-y-1 transition-transform mb-1">📜</div>
                             <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">
                                MISSION
                             </span>
                        </div>
                        
                        {missionsReady > 0 && isMissionsUnlocked && (
                            <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-black animate-bounce shadow-lg border-2 border-white z-20">
                                {missionsReady}
                            </div>
                        )}
                    </button>
                    
                    {!isMissionsUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px] rounded-full z-20 pointer-events-none">
                            <span className="text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">🔒</span>
                            <span className="text-white text-[8px] px-1 rounded font-bold bg-red-600 shadow-md mt-0.5">Lvl 10</span>
                        </div>
                    )}
                    
                    {/* Conditional Collect Pill - Positioned Absolute */}
                    {missionsReady > 0 && isMissionsUnlocked && (
                        <span className={`
                            absolute -bottom-1 left-1/2 -translate-x-1/2 z-20
                            px-2 py-0.5 rounded-full text-[8px] font-black uppercase drop-shadow-md animate-pulse shadow-lg border whitespace-nowrap
                            ${isMissionXpBoosted 
                                ? 'bg-yellow-500 text-black border-yellow-300' 
                                : 'bg-green-600 text-white border-green-400'}
                        `}>
                            {isMissionXpBoosted ? 'COLLECT 2X' : 'COLLECT'}
                        </span>
                    )}
                </div>

                {/* Season Pass Button */}
                <div className="relative flex flex-col items-center justify-center">
                    <button 
                        onClick={isMissionsUnlocked ? onOpenBattlePass : undefined}
                        className={`group relative w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-fuchsia-900 to-[#4a044e] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-visible z-10 ${!isMissionsUnlocked ? 'grayscale opacity-60' : ''}`}
                    >
                        <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none overflow-hidden"></div>
                        <div className="flex flex-col items-center justify-center">
                             <div className="text-2xl md:text-4xl drop-shadow-md group-hover:-translate-y-1 transition-transform mb-1">🎫</div>
                             <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">
                                PASS
                             </span>
                        </div>
                        
                        {passRewardsReady > 0 && isMissionsUnlocked && (
                            <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-black animate-bounce shadow-lg border-2 border-white z-20">
                                {passRewardsReady}
                            </div>
                        )}
                    </button>
                    
                    {!isMissionsUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px] rounded-full z-20 pointer-events-none">
                            <span className="text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">🔒</span>
                            <span className="text-white text-[8px] px-1 rounded font-bold bg-red-600 shadow-md mt-0.5">Lvl 10</span>
                        </div>
                    )}
                    
                    {passRewardsReady > 0 && isMissionsUnlocked && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 bg-green-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase drop-shadow-md animate-pulse shadow-lg border border-green-400 whitespace-nowrap">
                            COLLECT
                        </span>
                    )}
                </div>
            </div>

            {/* XP Boost Indicator (Redesigned) - Show always if active */}
            {xpMultiplier > 1 && (
                <div className="relative w-14 h-14 md:w-20 md:h-20 animate-pop-in z-30 rounded-full shadow-xl mt-2 pointer-events-auto">
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
