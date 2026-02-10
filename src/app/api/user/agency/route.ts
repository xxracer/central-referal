
import { NextResponse } from 'next/server';
import { findAgenciesForUser } from '@/lib/settings';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    try {
        const agencies = await findAgenciesForUser(email);

        if (agencies.length > 0) {
            // Return the first agency name
            return NextResponse.json({
                agencyName: agencies[0].companyProfile.name,
                agencyId: agencies[0].id
            });
        }

        return NextResponse.json({ agencyName: null, agencyId: null });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
