import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY;
        const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;

        if (!monthlyPriceId || !annualPriceId) {
            return NextResponse.json({ error: 'Price IDs not configured.' }, { status: 500 });
        }

        const [monthly, annual] = await Promise.all([
            stripe.prices.retrieve(monthlyPriceId),
            stripe.prices.retrieve(annualPriceId),
        ]);

        return NextResponse.json({
            monthly: {
                amount: (monthly.unit_amount ?? 0) / 100,
                currency: monthly.currency,
                interval: monthly.recurring?.interval ?? 'month',
            },
            annual: {
                // unit_amount for annual is the yearly total; show as monthly equivalent
                amount: (annual.unit_amount ?? 0) / 100,
                monthlyEquivalent: Math.round(((annual.unit_amount ?? 0) / 100 / 12) * 100) / 100,
                currency: annual.currency,
                interval: annual.recurring?.interval ?? 'year',
            },
        });
    } catch (error: any) {
        console.error('[/api/prices] Stripe error:', error);
        return NextResponse.json({ error: 'Failed to fetch prices.' }, { status: 500 });
    }
}
