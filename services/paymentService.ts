// Currency detection and price conversion for the shop.

export interface CurrencyInfo {
    code: string;
    symbol: string;
    rate: number;       // units per 1 USD
    zeroDecimal: boolean; // Stripe zero-decimal currency (JPY, KRW, IDR, etc.)
    country: string;
}

// Supported currencies keyed by ISO-3166-1 alpha-2 country code.
// Rates are approximate fixed values; close enough for display.
export const CURRENCY_BY_COUNTRY: Record<string, CurrencyInfo> = {
    PH: { code: 'PHP', symbol: '₱',    rate: 57.5,   zeroDecimal: false, country: 'Philippines' },
    US: { code: 'USD', symbol: '$',     rate: 1,      zeroDecimal: false, country: 'United States' },
    CA: { code: 'CAD', symbol: 'CA$',   rate: 1.37,   zeroDecimal: false, country: 'Canada' },
    GB: { code: 'GBP', symbol: '£',     rate: 0.79,   zeroDecimal: false, country: 'United Kingdom' },
    AU: { code: 'AUD', symbol: 'A$',    rate: 1.53,   zeroDecimal: false, country: 'Australia' },
    NZ: { code: 'NZD', symbol: 'NZ$',   rate: 1.65,   zeroDecimal: false, country: 'New Zealand' },
    SG: { code: 'SGD', symbol: 'S$',    rate: 1.33,   zeroDecimal: false, country: 'Singapore' },
    MY: { code: 'MYR', symbol: 'RM',    rate: 4.72,   zeroDecimal: false, country: 'Malaysia' },
    TH: { code: 'THB', symbol: '฿',     rate: 35.5,   zeroDecimal: false, country: 'Thailand' },
    ID: { code: 'IDR', symbol: 'Rp',    rate: 16300,  zeroDecimal: true,  country: 'Indonesia' },
    IN: { code: 'INR', symbol: '₹',     rate: 83.5,   zeroDecimal: false, country: 'India' },
    JP: { code: 'JPY', symbol: '¥',     rate: 150,    zeroDecimal: true,  country: 'Japan' },
    KR: { code: 'KRW', symbol: '₩',     rate: 1350,   zeroDecimal: true,  country: 'South Korea' },
    HK: { code: 'HKD', symbol: 'HK$',   rate: 7.83,   zeroDecimal: false, country: 'Hong Kong' },
    AE: { code: 'AED', symbol: 'AED',   rate: 3.67,   zeroDecimal: false, country: 'UAE' },
    SA: { code: 'SAR', symbol: 'SAR',   rate: 3.75,   zeroDecimal: false, country: 'Saudi Arabia' },
    DE: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Germany' },
    FR: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'France' },
    ES: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Spain' },
    IT: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Italy' },
    NL: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Netherlands' },
    BE: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Belgium' },
    AT: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Austria' },
    PT: { code: 'EUR', symbol: '€',     rate: 0.92,   zeroDecimal: false, country: 'Portugal' },
    BR: { code: 'BRL', symbol: 'R$',    rate: 5.0,    zeroDecimal: false, country: 'Brazil' },
    MX: { code: 'MXN', symbol: 'MX$',   rate: 17.2,   zeroDecimal: false, country: 'Mexico' },
    VN: { code: 'VND', symbol: '₫',     rate: 25400,  zeroDecimal: true,  country: 'Vietnam' },
    MM: { code: 'MMK', symbol: 'K',     rate: 2100,   zeroDecimal: false, country: 'Myanmar' },
    KH: { code: 'USD', symbol: '$',     rate: 1,      zeroDecimal: false, country: 'Cambodia' }, // USD widely used
};

const DEFAULT_CURRENCY: CurrencyInfo = { code: 'USD', symbol: '$', rate: 1, zeroDecimal: false, country: 'Unknown' };

// Base prices in USD cents for each product.
export const PRODUCT_USD_CENTS: Record<string, number> = {
    coin_1: 99,    // Pile of Coins
    coin_2: 199,   // Double Coins
    coin_3: 499,   // Big Bag
    coin_4: 999,   // Roller
    coin_5: 1999,  // Jackpot
    gem_1:  99,    // 100 Gems
    gem_2:  399,   // 500 Gems
    gem_3:  999,   // 2,500 Gems
};

/** Converts USD cents to the target currency's Stripe amount (smallest unit). */
export function toStripeAmount(usdCents: number, currency: CurrencyInfo): number {
    const usd = usdCents / 100;
    const localAmount = usd * currency.rate;
    // Stripe zero-decimal currencies (JPY, KRW, IDR...) use the whole number
    if (currency.zeroDecimal) return Math.round(localAmount);
    return Math.round(localAmount * 100);
}

/** Formats a Stripe amount for display. */
export function formatLocalPrice(stripeAmount: number, currency: CurrencyInfo): string {
    if (currency.zeroDecimal) {
        return `${currency.symbol}${Math.round(stripeAmount).toLocaleString()}`;
    }
    const decimal = (stripeAmount / 100).toFixed(2);
    return `${currency.symbol}${parseFloat(decimal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

let _detectedCurrency: CurrencyInfo | null = null;

/** Detects the user's currency from their IP location. Cached after first call. */
export async function detectCurrency(): Promise<CurrencyInfo> {
    if (_detectedCurrency) return _detectedCurrency;
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error('ipapi failed');
        const data = await res.json();
        const country: string = data.country_code ?? 'US';
        _detectedCurrency = CURRENCY_BY_COUNTRY[country] ?? DEFAULT_CURRENCY;
    } catch {
        _detectedCurrency = DEFAULT_CURRENCY;
    }
    return _detectedCurrency;
}

/** Returns the device_id used as the payment key. */
export function getDeviceId(): string {
    let id = localStorage.getItem('cw_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('cw_device_id', id);
    }
    return id;
}
