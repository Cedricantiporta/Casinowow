// Shared calendar-month boundary helpers. Several features reset on the same
// cadence — local midnight on the 1st of each month — so they read as a single
// "monthly reset" to the player: the Total Coins leaderboard's reward cycle
// (App.tsx's MONTHLY_RANK check) and the Arena ranking reset both use these.

export const currentMonthKey = (now: number): string => {
    const d = new Date(now);
    return `${d.getFullYear()}-${d.getMonth()}`;
};

export const msUntilMonthlyReset = (now: number): number => {
    const d = new Date(now);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
    return Math.max(0, next.getTime() - now);
};

export const fmtResetCountdown = (ms: number): string => {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
};
