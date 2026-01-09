'use client';

import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

export async function signInWithGoogle(): Promise<User | null> {
    const { auth } = initializeFirebase();
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // **This is the new logic to check the user's email**
        if (user && user.email) {
            const allowedEmail = "maijelcancines2@gmail.com";
            const allowedDomain = "@actiniumholdings.com";

            if (user.email === allowedEmail || user.email.endsWith(allowedDomain)) {
                // If the email is allowed, return the user object
                return user;
            } else {
                // If the email is not allowed, sign the user out immediately
                await firebaseSignOut(auth);
                // And prevent the application from proceeding with the login
                throw new Error("User is not authorized.");
            }
        }

        // If there is no user or email, something went wrong, so sign out
        await firebaseSignOut(auth);
        return null;

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
