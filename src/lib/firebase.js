import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBf3CLMhx_jCzteE5h7KWOW2_68yZD34h0",
    authDomain: "commerce-saas-62f32.firebaseapp.com",
    projectId: "commerce-saas-62f32",
    storageBucket: "commerce-saas-62f32.firebasestorage.app",
    messagingSenderId: "754392533406",
    appId: "1:754392533406:web:65605ce76a6809ff43ee8f",
    measurementId: "G-XHX0NHQXN5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "comsaas");
export default app;
