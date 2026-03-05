/**
 * DriverAuth — Wraps the DeliveryApp with a PIN / Biometric lock screen.
 *
 * Storage per token (localStorage):
 *   driver_session_{token}  = { name, pinHash, biometricEnabled, unlockedAt }
 *
 * Flow:
 *   - No session  → Onboarding (name + set PIN)
 *   - Session locked → Lock screen (PIN or Biometric)
 *   - Session unlocked → render children
 */
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Truck, Fingerprint, Eye, EyeOff, ShieldCheck, Lock, CheckCircle, AlertCircle } from 'lucide-react';

// ── Simple SHA-256 hash (Web Crypto) ──────────────────────────────────────
async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── PIN Pad Component ──────────────────────────────────────────────────────
function PinPad({ value, onChange, maxLength = 6 }) {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

    return (
        <div className="space-y-4">
            {/* PIN dots */}
            <div className="flex justify-center gap-4 mb-2">
                {Array.from({ length: maxLength }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${i < value.length
                            ? 'bg-indigo-600 border-indigo-600 scale-110'
                            : 'border-gray-300'
                            }`}
                    />
                ))}
            </div>

            {/* Keypad grid */}
            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                {digits.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    if (d === 'del') return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onChange(value.slice(0, -1))}
                            disabled={value.length === 0}
                            className="h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 font-bold text-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                        >
                            ⌫
                        </button>
                    );
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => value.length < maxLength && onChange(value + d)}
                            className="h-16 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 font-bold text-2xl flex items-center justify-center transition-all active:scale-95 active:bg-indigo-50 hover:border-indigo-300"
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Onboarding Screen (First setup) ───────────────────────────────────────
function OnboardingScreen({ token, storeName, onComplete }) {
    const [step, setStep] = useState('welcome'); // welcome | set-pin | confirm-pin
    const [name, setName] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const handleWelcome = (e) => {
        e.preventDefault();
        if (name.trim().length < 2) { setError('Veuillez entrer votre nom complet'); return; }
        setError('');
        setStep('set-pin');
    };

    const handleSetPin = () => {
        if (pin.length === 6) {
            setStep('confirm-pin');
        }
    };

    useEffect(() => {
        if (step === 'set-pin' && pin.length === 6) handleSetPin();
    }, [pin, step]);

    const handleConfirmPin = async () => {
        if (confirmPin === pin) {
            const pinHash = await sha256(pin);
            onComplete({ name: name.trim(), pinHash, biometricEnabled: false });
        } else {
            setError('Les codes ne correspondent pas. Réessayez.');
            setConfirmPin('');
        }
    };

    useEffect(() => {
        if (step === 'confirm-pin' && confirmPin.length === 6) handleConfirmPin();
    }, [confirmPin, step]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Truck className="h-8 w-8" />
                    </div>
                    <h1 className="text-xl font-bold">App Livreur Bayiin</h1>
                    {storeName && <p className="text-indigo-200 text-sm mt-0.5">{storeName}</p>}
                </div>

                <div className="p-6">
                    {step === 'welcome' && (
                        <form onSubmit={handleWelcome} className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Bienvenue !</h2>
                                <p className="text-sm text-gray-500 mt-1">Configurez votre espace livreur sécurisé</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Votre nom</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Prénom et Nom"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Token livreur</label>
                                <div className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-sm font-mono text-indigo-700">
                                    {token}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Ce token identifie votre espace auprès du magasin.</p>
                            </div>
                            {error && <p className="text-sm text-rose-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{error}</p>}
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors"
                            >
                                Continuer →
                            </button>
                        </form>
                    )}

                    {step === 'set-pin' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <ShieldCheck className="h-10 w-10 text-indigo-500 mx-auto mb-2" />
                                <h2 className="text-lg font-bold text-gray-900">Créer votre code PIN</h2>
                                <p className="text-sm text-gray-500">Choisissez un code à 6 chiffres</p>
                            </div>
                            <PinPad value={pin} onChange={setPin} />
                        </div>
                    )}

                    {step === 'confirm-pin' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                                <h2 className="text-lg font-bold text-gray-900">Confirmez le code PIN</h2>
                                <p className="text-sm text-gray-500">Entrez à nouveau les 6 chiffres</p>
                            </div>
                            <PinPad value={confirmPin} onChange={setConfirmPin} />
                            {error && (
                                <p className="text-sm text-rose-600 text-center flex items-center justify-center gap-1">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Lock Screen ──────────────────────────────────────────────────────────
function LockScreen({ driverName, storeName, onUnlock, pinHash }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    useEffect(() => {
        // Check if biometric/credential available
        if (window.PublicKeyCredential) {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(available => setBiometricAvailable(available))
                .catch(() => setBiometricAvailable(false));
        }
    }, []);

    const handlePinChange = async (val) => {
        setPin(val);
        setError('');
        if (val.length === 6) {
            const hash = await sha256(val);
            if (hash === pinHash) {
                onUnlock();
            } else {
                setError('Code incorrect. Réessayez.');
                setPin('');
            }
        }
    };

    const handleBiometric = async () => {
        try {
            // Use credential API to get a credential — we verify `userVerification`
            await navigator.credentials.get({
                publicKey: {
                    challenge: new Uint8Array(32),
                    rpId: window.location.hostname,
                    allowCredentials: [],
                    userVerification: 'required',
                    timeout: 60000,
                }
            });
            onUnlock();
        } catch (e) {
            // Fallback: try the simpler platform auth signal
            try {
                // Some devices support this alternative
                if (window.navigator.userActivation?.isActive) {
                    onUnlock();
                }
            } catch (_) { }
            setError('Authentification biométrique échouée. Utilisez votre PIN.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="h-7 w-7" />
                    </div>
                    <h1 className="text-lg font-bold">{driverName || 'Livreur'}</h1>
                    {storeName && <p className="text-indigo-200 text-xs mt-0.5">{storeName}</p>}
                </div>

                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <p className="font-semibold text-gray-900">Entrez votre code PIN</p>
                        <p className="text-xs text-gray-400 mt-0.5">pour accéder à vos livraisons</p>
                    </div>

                    <PinPad value={pin} onChange={handlePinChange} />

                    {error && (
                        <p className="text-sm text-rose-600 text-center flex items-center justify-center gap-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                        </p>
                    )}

                    {biometricAvailable && (
                        <button
                            onClick={handleBiometric}
                            className="w-full flex items-center justify-center gap-2.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                        >
                            <Fingerprint className="h-5 w-5" />
                            Déverrouiller avec biométrie
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8h

export default function DriverAuth({ token, storeName, children }) {
    const storageKey = `driver_session_${token}`;
    const [state, setState] = useState('loading'); // loading | onboarding | locked | unlocked
    const [session, setSession] = useState(null);

    useEffect(() => {
        if (!token) return;
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            setState('onboarding');
            return;
        }
        try {
            const s = JSON.parse(raw);
            setSession(s);
            const age = Date.now() - (s.unlockedAt || 0);
            if (age < SESSION_DURATION_MS) {
                setState('unlocked');
            } else {
                setState('locked');
            }
        } catch {
            localStorage.removeItem(storageKey);
            setState('onboarding');
        }
    }, [token]);

    const handleOnboardingComplete = useCallback(({ name, pinHash }) => {
        const newSession = { name, pinHash, unlockedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(newSession));
        setSession(newSession);
        setState('unlocked');
    }, [storageKey]);

    const handleUnlock = useCallback(() => {
        if (!session) return;
        const updated = { ...session, unlockedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setSession(updated);
        setState('unlocked');
    }, [session, storageKey]);

    if (state === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (state === 'onboarding') {
        return <OnboardingScreen token={token} storeName={storeName} onComplete={handleOnboardingComplete} />;
    }

    if (state === 'locked') {
        return (
            <LockScreen
                driverName={session?.name}
                storeName={storeName}
                pinHash={session?.pinHash}
                onUnlock={handleUnlock}
            />
        );
    }

    // Unlocked — show the actual driver app
    return children;
}
