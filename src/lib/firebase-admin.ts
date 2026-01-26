import 'server-only';
import admin from 'firebase-admin';

// Initialize Firebase Admin safely
try {
    if (!admin.apps.length) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim()
            : undefined;

        if (!privateKey) {
            console.error('[FirebaseAdmin] Missing FIREBASE_PRIVATE_KEY environment variable.');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            storageBucket: 'onboard-panel-gx822.firebasestorage.app',
        });
        console.log('[FirebaseAdmin] Initialized successfully.');
    }
} catch (error) {
    console.error('[FirebaseAdmin] Failed to initialize Firebase Admin:', error);
    // Don't crash here, let it fail when db is accessed so we can render fallback UI if possible
    // But admin.firestore() below might crash if init failed.
}

// Export safe instances or throw clear errors when accessed
export const adminStorage = admin.storage();
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
