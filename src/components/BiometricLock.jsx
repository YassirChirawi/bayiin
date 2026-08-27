import { useState, useEffect, useCallback } from 'react';
import { useBiometrics } from '../hooks/useBiometrics';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import { Shield, Lock, ScanFace, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { vibrate } from '../utils/haptics';

export default function BiometricLock({ children }) {
    const [isLocked, setIsLocked] = useState(false);
    const { verifyDetailed, isAvailable, getBiometricType } = useBiometrics();
    const { logout } = useAuth();
    const [failed, setFailed] = useState(false);
    const { t } = useLanguage();
    // getBiometricType() est une simple lecture du user-agent, sans effet de bord.
    // La condition precedente testait la presence de la fonction `verify` elle-meme,
    // ce qui n'avait pas de sens et referencait un symbole absent depuis le passage
    // a verifyDetailed — l'app plantait au montage (attrape par l'ErrorBoundary).
    const [bioInfo] = useState(getBiometricType);

    useEffect(() => {
        const checkLockStatus = async () => {
            const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
            if (!biometricEnabled) return;

            // La passkey est liée au domaine : si l'app est ouverte sur un autre
            // hôte que celui de l'enregistrement, elle est introuvable par
            // construction. On lève le verrou plutôt que d'enfermer l'utilisateur.
            const rpId = localStorage.getItem('biometricRpId');
            if (rpId && rpId !== window.location.hostname) {
                localStorage.removeItem('biometricEnabled');
                localStorage.removeItem('lastActive');
                return;
            }

            // Ne JAMAIS verrouiller un appareil incapable de déverrouiller.
            // Le drapeau vit dans localStorage, la passkey est liée au DOMAINE et
            // à l'appareil : ouvrir l'app sur un autre navigateur, un autre
            // domaine, ou après effacement des données donnait un écran de
            // verrouillage impossible à franchir.
            const supported = await isAvailable().catch(() => false);
            if (!supported) {
                localStorage.removeItem('biometricEnabled');
                localStorage.removeItem('lastActive');
                return;
            }

            const lastActive = localStorage.getItem('lastActive');
            const now = Date.now();
            const GRACE_PERIOD = 2 * 60 * 1000;
            if (!lastActive || (now - parseInt(lastActive)) > GRACE_PERIOD) {
                setIsLocked(true);
            }
        };
        checkLockStatus();

        const handleVisibilityChange = () => {
            const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
            if (!biometricEnabled) return;

            if (document.hidden) {
                localStorage.setItem('lastActive', Date.now().toString());
            } else {
                const lastActive = localStorage.getItem('lastActive');
                const now = Date.now();
                const GRACE_PERIOD = 2 * 60 * 1000; 

                if (lastActive && (now - parseInt(lastActive)) > GRACE_PERIOD) {
                    setIsLocked(true);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isAvailable]);

    const handleUnlock = async () => {
        const { ok } = await verifyDetailed();
        if (ok) {
            vibrate('success');
            setFailed(false);
            setIsLocked(false);
            return;
        }
        // Echec : on expose les portes de sortie plutôt que de vibrer dans le vide.
        vibrate('error');
        setFailed(true);
    };

    /** Retire le verrou sur CET appareil. La session reste authentifiée. */
    const handleDisableLock = useCallback(() => {
        localStorage.removeItem('biometricEnabled');
        localStorage.removeItem('biometricRpId');
        localStorage.removeItem('lastActive');
        setIsLocked(false);
    }, []);

    /** Sortie garantie, sans affaiblir la sécurité : on ferme la session. */
    const handleLogout = useCallback(async () => {
        localStorage.removeItem('lastActive');
        try {
            await logout();
        } catch (err) {
            console.error('BiometricLock — déconnexion impossible:', err);
        }
        setIsLocked(false);
    }, [logout]);

    const IconComponent = {
        ScanFace,
        Fingerprint,
        Shield
    }[bioInfo.icon] || Shield;

    return (
        <>
            <AnimatePresence>
                {isLocked && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="max-w-xs w-full space-y-8"
                        >
                            <div className="relative mx-auto w-24 h-24">
                                <motion.div 
                                    animate={{ 
                                        scale: [1, 1.05, 1],
                                        opacity: [0.5, 0.8, 0.5]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl"
                                />
                                <div className="relative bg-white/5 border border-white/10 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl backdrop-blur-md">
                                    <IconComponent className="w-12 h-12 text-indigo-400" />
                                </div>
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 shadow-lg"
                                >
                                    <Lock className="w-4 h-4 text-white" />
                                </motion.div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Accès Sécurisé</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    L'application est verrouillée pour protéger vos données financières.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Button 
                                    onClick={handleUnlock} 
                                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                                    icon={IconComponent}
                                >
                                    Déverrouiller
                                </Button>
                                
                                <p className="mt-6 text-xs text-slate-500 font-medium uppercase tracking-widest">
                                    Utilisation de {t(bioInfo.labelKey)}
                                </p>

                                {failed && (
                                    <p className="mt-5 text-sm text-amber-300/90 leading-relaxed">
                                        Aucune empreinte enregistrée pour ce site sur cet appareil.
                                        C'est normal après un changement de téléphone, de navigateur
                                        ou d'adresse du site.
                                    </p>
                                )}

                                {/* Sorties TOUJOURS disponibles. Sans elles, un échec de
                                    vérification enfermait définitivement l'utilisateur :
                                    l'écran n'offrait que « Déverrouiller ». */}
                                <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                                    {failed && (
                                        <button
                                            onClick={handleDisableLock}
                                            className="w-full text-sm font-semibold text-slate-200 hover:text-white transition-colors py-2"
                                        >
                                            Désactiver le verrouillage sur cet appareil
                                        </button>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-sm font-semibold text-slate-400 hover:text-white transition-colors py-2"
                                    >
                                        Se déconnecter
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <div className="absolute bottom-10 flex items-center gap-2 opacity-30 grayscale">
                            <img src="/logo.png" alt="BayIIn" className="h-6 w-auto" />
                            <span className="text-white font-bold tracking-tighter text-lg">BayIIn</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {children}
        </>
    );
}
