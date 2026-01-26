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

            // Check if we have a saved "last active" time
            const lastActive = localStorage.getItem('lastActive');
            const now = Date.now();
            const GRACE_PERIOD = 60 * 1000; // 1 Minute

            if (biometricEnabled) {
                // If it's a fresh load (no lastActive) OR time diff > 1 min, LOCK.
                if (!lastActive || (now - parseInt(lastActive)) > GRACE_PERIOD) {
                    setIsLocked(true);
                }
            }
        };
        checkLockError();

        const handleVisibilityChange = () => {
            const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
            if (!biometricEnabled) return;

            if (document.hidden) {
                // App went to background: Save timestamp
                localStorage.setItem('lastActive', Date.now().toString());
            } else {
                // App came to foreground: Check time
                const lastActive = localStorage.getItem('lastActive');
                const now = Date.now();
                const GRACE_PERIOD = 60 * 1000; // 1 Minute

                if (lastActive && (now - parseInt(lastActive)) > GRACE_PERIOD) {
                    setIsLocked(true);
                    // Clear timestamp so we don't loop or if they unlock we set a new one? 
                    // Actually, if we lock, we wait for unlock. 
                    // Upon unlock (handleUnlock), we should probably reset/update lastActive or just rely on next background event?
                    // Let's rely on next background event, BUT we must ensure we don't spam lock.
                    // Once locked, isLocked is true.
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Also update timestamp periodically while active? 
        // No, "backgrounding" is the trigger. 
        // But what if they close the tab? "checkLockError" handles fresh load.

        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);

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
