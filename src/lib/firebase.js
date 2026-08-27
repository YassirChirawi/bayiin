import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    connectFirestoreEmulator,
    enableIndexedDbPersistence
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
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

// Le drapeau doit être lu AVANT la création de Firestore : initializeFirestore
// ne peut pas s'appliquer une fois l'instance démarrée.
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

// Use the 'comsaas' database to match backend and scripts.
//
// En mode émulateur uniquement : long-polling forcé. Le transport WebChannel par
// défaut n'aboutit pas sous WebKit face à l'émulateur local — l'authentification
// et l'interface fonctionnent, mais les écritures Firestore n'arrivent jamais.
// Concrètement l'onboarding restait bloqué sur « Terminer » et les 17 specs
// mobile-safari échouaient, alors que Chromium passait.
//
// Aucun effet en production : ce chemin n'est emprunté qu'avec
// VITE_USE_FIREBASE_EMULATOR=true, positionné par le lanceur de tests.
export const db = useEmulator
    ? initializeFirestore(app, { experimentalForceLongPolling: true }, 'comsaas')
    : getFirestore(app, 'comsaas');

export const storage = getStorage(app);

// Cloud Functions (région par défaut us-central1) — utilisé pour les appels serveur
// (createCarrierDelivery, etc.).
export const functions = getFunctions(app);

// Emulator Support (BAY-102)
// IMPORTANT : connectFirestoreEmulator DOIT être appelé avant toute opération sur
// `db` (dont enableIndexedDbPersistence, qui démarre Firestore). Sinon il lève
// "Firestore has already been started", ce throw top-level fait échouer tout le
// module et l'app rend une page blanche. On connecte donc les émulateurs d'abord.
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
    try {
        connectFunctionsEmulator(functions, "localhost", 5001);
    } catch (e) { console.warn("Functions emulator connect skipped:", e.message); }
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
