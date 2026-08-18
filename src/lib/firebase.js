import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import {
    getFirestore,
    connectFirestoreEmulator,
    enableIndexedDbPersistence
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
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

// Use the 'comsaas' database to match backend and scripts
export const db = getFirestore(app, 'comsaas');

export const storage = getStorage(app);

// Emulator Support (BAY-102)
// IMPORTANT : connectFirestoreEmulator DOIT être appelé avant toute opération sur
// `db` (dont enableIndexedDbPersistence, qui démarre Firestore). Sinon il lève
// "Firestore has already been started", ce throw top-level fait échouer tout le
// module et l'app rend une page blanche. On connecte donc les émulateurs d'abord.
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
console.log("Firebase Emulator Status:", useEmulator);

if (useEmulator) {
    try {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    } catch (e) { console.warn("Auth emulator connect skipped:", e.message); }
    try {
        connectFirestoreEmulator(db, "localhost", 8080);
    } catch (e) { console.warn("Firestore emulator connect skipped:", e.message); }
    try {
        connectStorageEmulator(storage, "localhost", 9199);
    } catch (e) { console.warn("Storage emulator connect skipped:", e.message); }
}

// Persistance hors-ligne : jamais en mode test, ni en mode émulateur (inutile, et
// cela démarrerait Firestore avant que l'émulateur puisse s'attacher — cf. ci-dessus).
if (import.meta.env.MODE !== 'test' && !useEmulator) {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code === 'unimplemented') {
            console.warn("The current browser does not support all of the features required to enable persistence");
        }
    });
}

// Initialize messaging conditionally
export let messaging = null;
isSupported().then((supported) => {
    if (supported) {
        messaging = getMessaging(app);
    }
}).catch((err) => console.warn("Messaging not supported", err));

export default app;
