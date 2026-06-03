
// Singleton jackpot service — persists across page views and refreshes
const TIER_MULTIPLIERS = [20, 40, 60, 80, 100];
const KEY = 'cw_jackpots';
// Per-slot variation factors (5–20% variation, deterministic by slot index)
const SLOT_VARS = [1.00, 0.88, 1.14, 1.08, 0.93, 1.19, 0.96, 1.07, 1.12, 0.87, 1.21];

export { SLOT_VARS };

class JackpotService {
    private amounts: number[] = [];
    private listeners: Set<() => void> = new Set();
    private tickerHandle: ReturnType<typeof setInterval> | null = null;
    private saveHandle: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.amounts = this.loadAmounts();
        this.startTicker();
    }

    private loadAmounts(): number[] {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const { a, t } = JSON.parse(raw);
                if (Array.isArray(a) && a.length === 5) {
                    const elapsed = Date.now() - Number(t);
                    // Cap simulated growth at ~8 hours of absence
                    const ticks = Math.min(Math.floor(elapsed / 60), 480_000);
                    return a.map((v: number, i: number) => {
                        const growthPerTick = 80 + i * 120;
                        return Math.floor(v + ticks * growthPerTick * (0.6 + Math.random() * 0.8));
                    });
                }
            }
        } catch { /* ignore */ }
        return TIER_MULTIPLIERS.map((m, i) => m * 6000 + i * 4000 + Math.floor(Math.random() * m * 2000));
    }

    private saveAmounts() {
        try {
            localStorage.setItem(KEY, JSON.stringify({ a: this.amounts, t: Date.now() }));
        } catch { /* ignore */ }
    }

    private startTicker() {
        if (this.tickerHandle) return;
        this.tickerHandle = setInterval(() => {
            this.amounts = this.amounts.map((v, i) => {
                const tick = Math.floor(Math.random() * (180 + i * 140) + 60);
                return v + tick;
            });
            this.listeners.forEach(fn => fn());
        }, 60);
        this.saveHandle = setInterval(() => this.saveAmounts(), 8000);
    }

    getAmounts(): number[] { return [...this.amounts]; }

    getSlotAmounts(slotIdx: number): number[] {
        const v = SLOT_VARS[slotIdx % SLOT_VARS.length];
        return this.amounts.map(a => Math.floor(a * v));
    }

    getSlotTotal(slotIdx: number): number {
        return this.getSlotAmounts(slotIdx).reduce((s, a) => s + a, 0);
    }

    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => { this.listeners.delete(fn); };
    }
}

export const jackpotService = new JackpotService();
