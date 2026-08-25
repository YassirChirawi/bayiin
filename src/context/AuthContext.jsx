/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { auth, googleProvider } from "../lib/firebase";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sur natif, la connexion Google se fait par redirection : on récupère le résultat au retour.
        getRedirectResult(auth).catch((err) => console.warn("getRedirectResult:", err?.message));

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Les popups OAuth ne fonctionnent pas dans une WebView Capacitor → redirection en natif.
    // NB : pour une connexion Google 100% fiable en natif, installer @capacitor-firebase/authentication.
    const loginWithGoogle = () => {
        if (Capacitor.isNativePlatform()) {
            return signInWithRedirect(auth, googleProvider);
        }
        return signInWithPopup(auth, googleProvider);
    };

    const signup = async (email, password) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
            await sendEmailVerification(userCredential.user);
        } catch (err) {
            console.error("Failed to send verification email:", err);
        }
        return userCredential;
    };

    const logout = () => {
        return signOut(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const value = {
        user,
        login,
        loginWithGoogle,
        signup,
        logout,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
