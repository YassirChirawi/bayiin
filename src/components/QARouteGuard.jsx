import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Garde de la page Recette QA.
 *
 * Cette page n'est pas une simple checklist : elle PEUPLE la boutique courante
 * de données de démonstration — faux clients, produits, clés de livraison de
 * test — et bascule le store en plan PRO. Sur une boutique de production, cela
 * corrompt les données réelles du marchand.
 *
 * La route n'avait aucun garde : n'importe quel utilisateur authentifié pouvait
 * atteindre /qa en tapant l'URL. Seul le LIEN du menu était masqué, ce qui ne
 * protège rien.
 *
 * Les règles Firestore ne peuvent pas défendre ce cas : le marchand écrit dans
 * sa propre boutique, ce qui est légitime de leur point de vue. Le garde de
 * route est donc le seul contrôle possible.
 *
 * Accès autorisé à deux profils, correspondant à l'intention d'origine :
 *   - super_admin        — l'opérateur de la plateforme ;
 *   - store.testerMode   — les bêta-testeurs, comme le fait déjà le menu.
 *
 * `testerMode` est un signal fiable : depuis le déploiement des règles, un
 * propriétaire ne peut plus se l'attribuer lui-même (seul un super_admin le
 * peut). Avant cela, n'importe qui pouvait l'activer.
 */
export default function QARouteGuard({ children }) {
    const { user, loading: authLoading } = useAuth();
    const { store } = useTenant();
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (!cancelled) setRole(snap.exists() ? snap.data().role || "user" : "user");
            } catch (err) {
                // En cas d'échec de lecture on refuse l'accès plutôt que de
                // l'accorder par défaut.
                console.error("QARouteGuard — lecture du rôle impossible:", err);
                if (!cancelled) setRole("user");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    const allowed = role === "super_admin" || store?.testerMode === true;
    if (!allowed) return <Navigate to="/dashboard" replace />;

    return children;
}
