import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScanFace, Fingerprint, X, Check } from 'lucide-react';
import Button from './Button';
import { useBiometrics } from '../hooks/useBiometrics';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';
import { vibrate } from '../utils/haptics';

export default function BiometricSetupModal({ isOpen, onClose, userId }) {
    const { register, getBiometricType } = useBiometrics();
    const { t } = useLanguage();
    const bioInfo = getBiometricType();

    const handleEnable = async () => {
        const success = await register(userId);
        if (success) {
            localStorage.setItem('biometricEnabled', 'true');
            vibrate('success');
            toast.success(t('msg_biometric_enabled'));
            onClose();
        } else {
            vibrate('error');
            toast.error(t('err_biometric_failed'));
        }
    };

    const IconComponent = {
        ScanFace,
        Fingerprint,
        Shield
    }[bioInfo.icon] || Shield;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden"
                    >
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 pt-12 text-center space-y-6">
                            <div className="relative mx-auto w-20 h-20">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl rotate-6" />
                                <div className="absolute inset-0 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200">
                                    <IconComponent className="w-10 h-10 text-white" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {t('biometric_setup_title', { type: t(bioInfo.labelKey) })}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed px-4">
                                    {t('biometric_setup_desc')}
                                </p>
                            </div>

                            <div className="space-y-3 pt-4">
                                <Button 
                                    onClick={handleEnable}
                                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                    icon={Check}
                                >
                                    {t('btn_enable_now')}
                                </Button>
                                
                                <button 
                                    onClick={onClose}
                                    className="w-full py-3 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors"
                                >
                                    {t('btn_maybe_later')}
                                </button>
                            </div>

                            <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                <Shield size={12} />
                                Sécurisé par BayIIn
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
