import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

export function initializeFirebaseServer(): {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
} {
    const apps = getApps();
    const firebaseApp = apps.length
        ? apps[0]
        : initializeApp(firebaseConfig);

    const auth = getAuth(firebaseApp);
    const firestore = getFirestore(firebaseApp);
    const storage = getStorage(firebaseApp);

    return { firebaseApp, auth, firestore, storage };
}
