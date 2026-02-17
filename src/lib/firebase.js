import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TEMP FIX: Hardcoded config while .env is debugged
const firebaseConfig = {
    apiKey: "AIzaSyBf3CLMhx_jCzteE5h7KWOW2_68yZD34h0",
    authDomain: "commerce-saas-62f32.firebaseapp.com",
    projectId: "commerce-saas-62f32",
    storageBucket: "commerce-saas-62f32.firebasestorage.app",
    messagingSenderId: "754392533406",
    appId: "1:754392533406:web:65605ce76a6809ff43ee8f",
    measurementId: "G-XHX0NHQXN5"
};

console.log("Firebase Config Loaded:", {
    apiKey: firebaseConfig.apiKey ? "Present (" + firebaseConfig.apiKey.substring(0, 5) + "...)" : "MISSING",
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "comsaas");

// Enable Offline Persistence
// Enable Offline Persistence (Disabled for Dev Stability)
// enableIndexedDbPersistence(db).catch((err) => {
//     if (err.code == 'failed-precondition') {
//         console.warn('Persistence failed: Multiple tabs open');
//     } else if (err.code == 'unimplemented') {
//         console.warn('Persistence not supported by browser');
//     }
// });

export const storage = getStorage(app);
export default app;
