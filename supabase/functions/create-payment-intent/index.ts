// Supabase Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent and returns the client_secret to the frontend.
//
// SECURITY: the PRICE charged and the GEM quantity are decided here on the
// server from a canonical catalog keyed by productId — the client can no longer
// send its own stripeAmount (pay 1 cent for the top pack) or mint arbitrary
// gems. Coin packs are level-scaled by design (more coins per pack at higher
// max bet), so coin quantity is computed here from a client-supplied maxBet
// that is CLAMPED to a sane ceiling; coins are self-only soft currency with no
// cash-out, and the price is fixed, so this cannot be turned into a money
// exploit. The webhook credits strictly from the metadata set here.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Canonical catalog (server truth) ────────────────────────────────────────
// usdCents = base price. Gems have a fixed quantity; coins use coinBase to
// scale with the player's max bet (mirrors the client shop's formula).
const PRODUCTS: Record<string, { usdCents: number; itemType: 'COIN' | 'DIAMOND'; gemAmount?: number; coinBase?: number }> = {
    coin_1: { usdCents: 99,   itemType: 'COIN', coinBase: 49 },
    coin_2: { usdCents: 199,  itemType: 'COIN', coinBase: 99 },
    coin_3: { usdCents: 499,  itemType: 'COIN', coinBase: 199 },
    coin_4: { usdCents: 999,  itemType: 'COIN', coinBase: 499 },
    coin_5: { usdCents: 1999, itemType: 'COIN', coinBase: 2490 },
    gem_1:  { usdCents: 99,   itemType: 'DIAMOND', gemAmount: 100 },
    gem_2:  { usdCents: 399,  itemType: 'DIAMOND', gemAmount: 500 },
    gem_3:  { usdCents: 999,  itemType: 'DIAMOND', gemAmount: 2500 },
};

// Highest legitimate max bet a real player can reach (the game's SCALES cap).
// Clamps a spoofed maxBet so coin grants stay bounded.
const MAX_BET_CEILING = 1.5e19;

const RATES: Record<string, { rate: number; zeroDecimal: boolean }> = {
    USD: { rate: 1, zeroDecimal: false }, PHP: { rate: 57.5, zeroDecimal: false },
    CAD: { rate: 1.37, zeroDecimal: false }, GBP: { rate: 0.79, zeroDecimal: false },
    AUD: { rate: 1.53, zeroDecimal: false }, NZD: { rate: 1.65, zeroDecimal: false },
    SGD: { rate: 1.33, zeroDecimal: false }, MYR: { rate: 4.72, zeroDecimal: false },
    THB: { rate: 35.5, zeroDecimal: false }, IDR: { rate: 16300, zeroDecimal: true },
    INR: { rate: 83.5, zeroDecimal: false }, JPY: { rate: 150, zeroDecimal: true },
    KRW: { rate: 1350, zeroDecimal: true }, HKD: { rate: 7.83, zeroDecimal: false },
    AED: { rate: 3.67, zeroDecimal: false }, SAR: { rate: 3.75, zeroDecimal: false },
    EUR: { rate: 0.92, zeroDecimal: false }, BRL: { rate: 5.0, zeroDecimal: false },
    MXN: { rate: 17.2, zeroDecimal: false }, VND: { rate: 25400, zeroDecimal: true },
    MMK: { rate: 2100, zeroDecimal: false },
};

function toStripeAmount(usdCents: number, code: string): number {
    const cur = RATES[code] ?? RATES.USD;
    const usd = usdCents / 100;
    const local = usd * cur.rate;
    return cur.zeroDecimal ? Math.round(local) : Math.round(local * 100);
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { deviceId, productId, currency, maxBet } = await req.json();

        if (!deviceId || !productId) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const product = PRODUCTS[productId];
        if (!product) {
            return new Response(JSON.stringify({ error: 'Unknown product' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const code = (typeof currency === 'string' && RATES[currency]) ? currency : 'USD';
        const amount = toStripeAmount(product.usdCents, code);

        // Server-derived item quantity.
        let itemAmount: number;
        if (product.itemType === 'DIAMOND') {
            itemAmount = product.gemAmount!;
        } else {
            const mb = Math.max(0, Math.min(Number(maxBet) || 0, MAX_BET_CEILING));
            itemAmount = Math.round((product.coinBase! / 50) * mb * 100);
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: code.toLowerCase(),
            automatic_payment_methods: { enabled: true },
            metadata: {
                device_id: deviceId,
                product_id: productId,
                item_type: product.itemType,
                item_amount: String(itemAmount),
            },
        });

        return new Response(
            JSON.stringify({ clientSecret: paymentIntent.client_secret }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('create-payment-intent error:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
