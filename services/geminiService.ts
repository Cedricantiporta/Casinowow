
// Static Service - AI Removed

export const generateOracleFortune = async (currentBalance: number, winAmount: number): Promise<string> => {
    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    const fallbacks = [
        "The stars align in your favor! ✨",
        "A great fortune is heading your way.",
        "Luck favors the bold spinner.",
        "Your aura shines with gold today.",
        "The spirits whisper of riches.",
        "Destiny smiles upon you!",
        "The universe grants you abundance.",
        "Golden energy surrounds you.",
        "Victory is written in the stars.",
        "A legendary win is near!"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

export const generateDailyQuest = async (level: number): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const quests = [
        "The Golden Dragon's Trial",
        "Neon Night Sprint",
        "Pharaoh's Secret Hunt",
        "The Diamond Rush",
        "Spinner's Gauntlet",
        "Lucky Streak Challenge",
        "Midnight Jackpot Run",
        "Royal Reel Quest",
        "Treasure Hunter's Path",
        "The Wild Card Gambit"
    ];

    return quests[Math.floor(Math.random() * quests.length)];
}
