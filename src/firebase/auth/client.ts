'use client';

import { getAdditionalUserInfo, getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, type User, type UserCredential } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

export async function signInWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
    const { auth } = initializeFirebase();
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const details = getAdditionalUserInfo(result);
        return {
            user: result.user,
            isNewUser: details?.isNewUser ?? false
        };
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        throw error;
    }
}

export async function signOut(): Promise<void> {
    const { auth } = initializeFirebase();
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
}
