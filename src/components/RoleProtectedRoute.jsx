import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function RoleProtectedRoute({ children, allowedRoles }) {
    const { user, loading: authLoading } = useAuth();
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchRole = async () => {
            try {
                const docRef = await getDoc(doc(db, "users", user.uid));
                if (docRef.exists()) {
                    setRole(docRef.data().role || 'user');
                } else {
                    setRole('user');
                }
            } catch (err) {
                console.error("Error fetching role:", err);
                setRole('user');
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
