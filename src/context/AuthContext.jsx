import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    sendEmailVerification
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = () => {
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

    const value = {
        user,
        login,
        loginWithGoogle,
        signup,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
