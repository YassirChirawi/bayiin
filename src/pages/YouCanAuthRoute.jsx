import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { Loader2, Info } from 'lucide-react';
import Button from '../components/Button';
import qantra from '@youcan/qantra';

export default function YouCanAuthRoute() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const authenticate = async () => {
            try {
                // Flow 1: Custom token est déjà dans l'URL (Ancien flow ou redirect custom)
                const customToken = searchParams.get('token');
                if (customToken) {
                    const auth = getAuth();
                    await signInWithCustomToken(auth, customToken);
                    navigate('/dashboard', { replace: true });
                    return;
                }

                // Flow 2: Lancement Embedded App via Qantra
                const session = searchParams.get('session');
                const hmac = searchParams.get('hmac');

                if (session && hmac) {
                    // Initialiser Qantra
                    qantra.initialize();
                    
                    // Obtenir le Session Token JWT depuis la frame parente YouCan
                    const sessionToken = await qantra.sessionToken();

                    // Obtenir la Query String exacte, mais en retirant 'hmac' pour la vérification
                    const qParams = new URLSearchParams(location.search);
                    qParams.delete('hmac');
                    const queryStringToVerify = qParams.toString();

                    // Appeler notre backend Firebase
                    // Note: Remplacer par l'URL correcte de la Cloud Function si besoin
                    // En local, ça peut être différent. Utilisant le path standard si pas défini
                    const functionUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL 
                        ? `${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL}/exchangeYoucanToken`
                        : `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bayiin'}.cloudfunctions.net/exchangeYoucanToken`;

                    const response = await fetch(functionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_token: sessionToken,
                            hmac: hmac,
                            queryString: queryStringToVerify
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error("Échec de l'échange Qantra:", errText);
                        throw new Error('Erreur de validation YouCan');
                    }

                    const data = await response.json();
                    
                    if (data.customToken) {
                        const auth = getAuth();
                        await signInWithCustomToken(auth, data.customToken);
                        navigate('/dashboard', { replace: true });
                        return;
                    }
                }

                // Si on arrive ici, il manque des paramètres
                throw new Error('Paramètres manquants');

            } catch (err) {
                console.error("YouCan Auth Error:", err);
                setError(true);
                setLoading(false);
            }
        };

        authenticate();
    }, [searchParams, location.search, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 text-center max-w-sm">
                    <div className="h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Erreur d'authentification</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Impossible de vous connecter via YouCan. Votre session a peut-être expiré.
                    </p>
                    <Button onClick={() => window.location.href = 'https://seller-area.youcan.shop'} className="w-full">
                        Retourner sur YouCan
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-600">Configuration de votre espace BayIIn...</p>
        </div>
    );
}
