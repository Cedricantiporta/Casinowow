// Supabase Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent and returns the client_secret to the frontend.
// The device_id and item details are embedded in metadata so the webhook can
// credit the correct device when payment_intent.succeeded fires.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { deviceId, productId, itemType, itemAmount, currency, stripeAmount } = await req.json();

        if (!deviceId || !productId || !itemType || !itemAmount || !currency || !stripeAmount) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(stripeAmount),
            currency: currency.toLowerCase(),
            automatic_payment_methods: { enabled: true },
            metadata: {
                device_id: deviceId,
                product_id: productId,
                item_type: itemType,
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
