const admin = require('firebase-admin');

// Load env variables (assuming .env is present with FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS)
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin (modify logic based on your existing setup if needed)
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
        });
    } else {
        admin.initializeApp();
    }
}
const db = admin.firestore();

function normalizeName(name) {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function syncReferralSources() {
    console.log("Starting backfill sync...");
    const snapshot = await db.collection('referrals').get();

    let createdCount = 0;
    let linkedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const { agencyId, referrerName, referralSourceId } = data;

        if (!agencyId || !referrerName) {
            continue; // Skip invalid rows
        }

        const nameNormalized = normalizeName(referrerName);

        // Does the source exist for this agency?
        const sourceQuery = await db.collection('referral_sources')
            .where('agencyId', '==', agencyId)
            .where('nameNormalized', '==', nameNormalized)
            .limit(1)
            .get();

        let finalSourceId = referralSourceId;

        if (sourceQuery.empty) {
            console.log(`Creating missing source: ${referrerName} for agency: ${agencyId}`);
            // Create the source
            const sourceRef = db.collection('referral_sources').doc();
            const now = admin.firestore.FieldValue.serverTimestamp();

            await sourceRef.set({
                id: sourceRef.id,
                agencyId,
                name: referrerName,
                nameNormalized,
                type: 'other',
                status: 'prospect',
                notes: 'Auto-created during backfill sync.',
                createdFrom: 'manual', // or 'auto'
                createdAt: now,
                updatedAt: now
            });
            finalSourceId = sourceRef.id;
            createdCount++;
        } else {
            // Source exists
            finalSourceId = sourceQuery.docs[0].id;
        }

        // Link referral to the source if it doesn't have it or has the wrong one
        if (referralSourceId !== finalSourceId) {
            console.log(`Linking referral ${doc.id} to source ${finalSourceId}`);
            await doc.ref.update({
                referralSourceId: finalSourceId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            linkedCount++;
        }
    }

    console.log("-----------------------------------------");
    console.log(`Sync complete. Created ${createdCount} new sources.`);
    console.log(`Updated ${linkedCount} referrals with the proper source ID.`);
    console.log("-----------------------------------------");
    process.exit(0);
}

syncReferralSources().catch(console.error);
