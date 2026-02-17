'use client';


import {
    getAdditionalUserInfo,
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    type User,
    type UserCredential,
    updatePassword,
    onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
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

export async function signInWithEmail(email: string, password: string): Promise<{ user: User; isNewUser: boolean }> {
    const { auth } = initializeFirebase();
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const details = getAdditionalUserInfo(result);
        return {
            user: result.user,
            isNewUser: details?.isNewUser ?? false
        };
    } catch (error) {
        console.error("Error during Email sign-in:", error);
        throw error;
    }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: User; isNewUser: boolean }> {
    const { auth } = initializeFirebase();
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const details = getAdditionalUserInfo(result);
        return {
            user: result.user,
            isNewUser: details?.isNewUser ?? true // Usually true for sign up
        };
    } catch (error) {
        console.error("Error during Email sign-up:", error);
        throw error;
    }
}

export async function sendPasswordReset(email: string): Promise<void> {
    const { auth } = initializeFirebase();
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Error sending password reset email:", error);
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
export async function updateUserPassword(password: string): Promise<void> {
    const { auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error("No user signed in");

    try {
        await updatePassword(user, password);
    } catch (error) {
        console.error("Error updating password:", error);
        throw error;
    }
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
    const { auth } = initializeFirebase();
    return firebaseOnAuthStateChanged(auth, callback);
}
