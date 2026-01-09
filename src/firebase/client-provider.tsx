'use client';

import { FirebaseProvider, type FirebaseContextValue } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Only initialize Firebase if the API key is present
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    // This allows the app to build and run without crashing if the key is missing.
    // The parts of the app that require Firebase will not work, but it won't be a breaking error.
    console.warn("Firebase API key is missing. Firebase features will be disabled.");
    return <>{children}</>;
  }
  
  const { firebaseApp, auth, firestore } = initializeFirebase();
  const contextValue: FirebaseContextValue = { firebaseApp, auth, firestore };

  return <FirebaseProvider value={contextValue}>{children}</FirebaseProvider>;
}
