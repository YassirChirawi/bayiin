import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Offline persistence with multi-tab support (Firebase SDK v11+ API)
// persistentMultipleTabManager handles concurrent tabs gracefully.
// Falls back to memory cache on unsupported browsers automatically.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
}, "comsaas");

export const storage = getStorage(app);

// Initialize messaging conditionally to prevent crashes in environments without supported push
export let messaging = null;
isSupported().then((supported) => {
    if (supported) {
        messaging = getMessaging(app);
    }
}).catch((err) => console.warn("Messaging not supported", err));

export default app;

