import { useState, useEffect } from 'react';
import { useBiometrics } from '../hooks/useBiometrics';
import { useLanguage } from '../context/LanguageContext';
import Button from './Button';
import { Shield, Lock, ScanFace, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { vibrate } from '../utils/haptics';

export default function BiometricLock({ children }) {
    const [isLocked, setIsLocked] = useState(false);
    const { verify, getBiometricType } = useBiometrics();
    const { t } = useLanguage();
    const [bioInfo, setBioInfo] = useState(() => verify ? getBiometricType() : { id: 'unknown', labelKey: 'bio_type_generic', icon: 'Shield' });

    useEffect(() => {
        // Bio type is already initialized, but we can refresh it if needed or remove the effect
    }, []);

    useEffect(() => {
        const checkLockStatus = async () => {
            const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
            const lastActive = localStorage.getItem('lastActive');
            const now = Date.now();
            const GRACE_PERIOD = 2 * 60 * 1000; 

            if (biometricEnabled) {
                if (!lastActive || (now - parseInt(lastActive)) > GRACE_PERIOD) {
                    setIsLocked(true);
                }
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
    }, []);

    const handleUnlock = async () => {
        const success = await verify();
        if (success) {
            vibrate('success');
            setIsLocked(false);
        } else {
            vibrate('error');
        }
    };

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
