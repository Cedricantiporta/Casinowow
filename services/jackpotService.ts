
// Singleton jackpot service — amounts tied to current max bet
// Tiers: Mini=20x, Minor=40x, Major=60x, Mega=80x, Grand=100x of max bet
const TIER_MULTIPLIERS = [20, 40, 60, 80, 100];
const KEY = 'cw_jackpots';
// Per-slot variation factors (5–20% variation, deterministic by slot index)
const SLOT_VARS = [1.00, 0.88, 1.14, 1.08, 0.93, 1.19, 0.96, 1.07, 1.12, 0.87, 1.21];

export { SLOT_VARS };

class JackpotService {
    private baseMaxBet: number = 10000;
    private growth: number[] = [0, 0, 0, 0, 0];
    private listeners: Set<() => void> = new Set();
    private tickerHandle: ReturnType<typeof setInterval> | null = null;
    private saveHandle: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.loadGrowth();
        this.startTicker();
    }

    private loadGrowth() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const { g, t, b } = JSON.parse(raw);
                if (Array.isArray(g) && g.length === 5) {
                    const elapsed = Date.now() - Number(t);
                    const ticks = Math.min(Math.floor(elapsed / 60), 480_000);
                    this.baseMaxBet = b || 10000;
                    this.growth = g.map((v: number, i: number) =>
                        Math.floor(v + ticks * (40 + i * 30))
                    );
                    return;
                }
            }
        } catch { /* ignore */ }
        this.growth = [0, 0, 0, 0, 0];
    }

    private saveGrowth() {
        try {
            localStorage.setItem(KEY, JSON.stringify({ g: this.growth, t: Date.now(), b: this.baseMaxBet }));
        } catch { /* ignore */ }
    }

    private startTicker() {
        if (this.tickerHandle) return;
        this.tickerHandle = setInterval(() => {
            this.growth = this.growth.map((v, i) =>
                v + Math.floor(Math.random() * (50 + i * 35) + 15)
            );
            this.listeners.forEach(fn => fn());
        }, 60);
        this.saveHandle = setInterval(() => this.saveGrowth(), 8000);
    }

    setMaxBet(maxBet: number) {
        if (maxBet === this.baseMaxBet) return;
        this.baseMaxBet = maxBet;
        this.growth = [0, 0, 0, 0, 0];
        this.listeners.forEach(fn => fn());
    }

    getAmounts(): number[] {
        return TIER_MULTIPLIERS.map((m, i) => Math.floor(m * this.baseMaxBet + this.growth[i]));
    }

    getSlotAmounts(slotIdx: number): number[] {
        const v = SLOT_VARS[slotIdx % SLOT_VARS.length];
        return this.getAmounts().map(a => Math.floor(a * v));
    }

    // Lobby counter shows Grand jackpot (100x maxBet × slotVar)
    getSlotTotal(slotIdx: number): number {
        const v = SLOT_VARS[slotIdx % SLOT_VARS.length];
        const grand = Math.floor(TIER_MULTIPLIERS[4] * this.baseMaxBet + this.growth[4]);
        return Math.floor(grand * v);
    }

    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => { this.listeners.delete(fn); };
    }
}

export const jackpotService = new JackpotService();
