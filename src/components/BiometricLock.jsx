import { useState, useEffect } from 'react';
import { useBiometrics } from '../hooks/useBiometrics';
import Button from './Button'; // Assuming we have a Button component
import { Shield, Lock } from 'lucide-react';

export default function BiometricLock({ children }) {
    const [isLocked, setIsLocked] = useState(false);
    const { verify } = useBiometrics();

    useEffect(() => {
        const checkLockError = async () => {
            const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
            if (biometricEnabled) {
                // Determine if we should lock. 
                // Simple logic: Lock on mount (refresh/open).
                // Advanced: Lock on background (visibilityChange).
                setIsLocked(true);
                // Try to auto-unlock immediately for smooth UX
                // const success = await verify();
                // if (success) setIsLocked(false);
                // Auto-unlock might be annoying if it pops up unexpectedly, better let user tap "Unlock"
            }
        };
        checkLockError();

        // Optional: Re-lock on visibility hidden?
        const handleVisibilityCode = () => {
            if (document.hidden && localStorage.getItem('biometricEnabled') === 'true') {
                // Creating a "grace period" could be checking a timestamp here.
                // For now, strict security: Hide app content when backgrounded.
                setIsLocked(true);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityCode);
        return () => document.removeEventListener("visibilitychange", handleVisibilityCode);

    }, []);

    const handleUnlock = async () => {
        const success = await verify();
        if (success) {
            setIsLocked(false);
        } else {
            // Optional: fallback to PIN or password?
            // For now, retry.
        }
    };

    if (isLocked) {
        return (
            <div className="fixed inset-0 z-[100] bg-indigo-900 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6">
                    <div className="mx-auto bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center">
                        <Lock className="w-10 h-10 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">App Locked</h2>
                        <p className="text-gray-500 mt-2">Authentication required to access store.</p>
                    </div>
                    <Button onClick={handleUnlock} className="w-full justify-center" size="lg" icon={Shield}>
                        Unlock with FaceID
                    </Button>
                </div>
            </div>
        );
    }

    return children;
}
