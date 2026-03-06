import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getBusinessesForUser, createBusiness } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        let result = await getBusinessesForUser(userId);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

        // Auto-seed for development/initial setup if no businesses found
        if (result.data && result.data.length === 0) {
            console.log('Seeding initial businesses for user:', userId);

            const paulton = await createBusiness({
                id: 'paulton-kebab',
                name: 'Paulton Kebab House',
                owner_id: userId,
                logo_url: 'https://paultonkebabhouse.co.uk/logo.png'
            });

            const seafood = await createBusiness({
                id: 'seafood-plus',
                name: 'Seafood Plus',
                owner_id: userId,
                logo_url: 'https://seafoodplus.co.uk/logo.png'
            });

            if (paulton.success && seafood.success) {
                result = await getBusinessesForUser(userId);
            }
        }

        return NextResponse.json({
            success: true,
            businesses: result.data || []
        });

    } catch (error) {
        console.error('API Businesses error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
