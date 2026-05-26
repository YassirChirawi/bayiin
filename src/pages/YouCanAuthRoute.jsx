import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { Loader2, Info, CheckCircle, Shield, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import { sessionToken } from '@youcan/qantra';
import { motion } from 'framer-motion';

export default function YouCanAuthRoute() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [statusStep, setStatusStep] = useState(1); // 1: Reading session, 2: Security check, 3: Syncing space
    const navigate = useNavigate();

    useEffect(() => {
        const authenticate = async () => {
            try {
                // Flow 1: Custom token est déjà dans l'URL (Ancien flow ou redirect custom)
                const customToken = searchParams.get('token');
                if (customToken) {
                    setStatusStep(2);
                    const auth = getAuth();
                    await signInWithCustomToken(auth, customToken);
                    setStatusStep(3);
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true });
                    }, 800);
                    return;
                }

                // Flow 2: Lancement Embedded App via Qantra
                const session = searchParams.get('session');
                const hmac = searchParams.get('hmac');

                if (session && hmac) {
                    setStatusStep(1);
                    // Obtenir le Session Token JWT depuis la frame parente YouCan
                    const jwtToken = await sessionToken();

                    setStatusStep(2);
                    // Obtenir la Query String exacte, mais en retirant 'hmac' pour la vérification
                    const qParams = new URLSearchParams(location.search);
                    qParams.delete('hmac');
                    const queryStringToVerify = qParams.toString();

                    // Appeler notre backend Firebase
                    const functionUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL 
                        ? `${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL}/exchangeYoucanToken`
                        : `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bayiin'}.cloudfunctions.net/exchangeYoucanToken`;

                    const response = await fetch(functionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_token: jwtToken,
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
                        setStatusStep(3);
                        const auth = getAuth();
                        await signInWithCustomToken(auth, data.customToken);
                        setTimeout(() => {
                            navigate('/dashboard', { replace: true });
                        }, 800);
                        return;
                    }
                }

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-rose-50/20 p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center max-w-md w-full relative overflow-hidden"
                >
                    {/* Top warning badge glow */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>

                    <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Info size={28} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 mb-3">Erreur de Connexion</h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-8">
                        Impossible de vous connecter de manière sécurisée via YouCan. Votre session a peut-être expiré ou les clés de sécurité sont incorrectes.
                    </p>

                    <div className="space-y-3">
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.location.href = 'https://seller-area.youcan.shop'} 
                            className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Retourner sur YouCan
                        </motion.button>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors"
                        >
                            Réessayer la vérification
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/20 via-slate-50 to-purple-50/20 p-6">
            <div className="max-w-sm w-full text-center space-y-8">
                {/* Brand Visual */}
                <div className="relative inline-flex mb-2">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                            repeat: Infinity, 
                            duration: 5,
                            ease: "easeInOut"
                        }}
                        className="h-20 w-20 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-black text-3xl"
                    >
                        B
                    </motion.div>
                    
                    {/* Tiny secure lock badge */}
                    <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 text-white rounded-full border-4 border-slate-50 shadow">
                        <Shield size={12} />
                    </div>
                </div>

                {/* Main Spinner & Loading Status */}
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-lg font-black text-slate-900">Connexion en cours</h3>
                        <p className="text-xs text-slate-400 font-medium">Sécurisation et liaison de votre compte marchand YouCan</p>
                    </div>
                </div>

                {/* Sub-steps Indicator (UX detailed feedback) */}
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3.5 text-left">
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${statusStep > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                            {statusStep > 1 ? <CheckCircle size={14} className="text-emerald-600" /> : "1"}
                        </div>
                        <span className={`text-xs font-bold ${statusStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>
                            Lecture de la session parente YouCan
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${statusStep > 2 ? 'bg-emerald-100 text-emerald-700' : statusStep === 2 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                            {statusStep > 2 ? <CheckCircle size={14} className="text-emerald-600" /> : "2"}
                        </div>
                        <span className={`text-xs font-bold ${statusStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>
                            Validation HMAC & Échange sécurisé de jetons
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${statusStep === 3 ? 'bg-purple-100 text-purple-700 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                            3
                        </div>
                        <span className={`text-xs font-bold ${statusStep >= 3 ? 'text-slate-800 animate-pulse' : 'text-slate-400'}`}>
                            Ouverture de votre espace de travail BayIIn
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
