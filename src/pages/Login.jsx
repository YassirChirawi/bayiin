import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Button from "../components/Button";
import Input from "../components/Input";
import { getFriendlyErrorMessage } from "../utils/firebaseErrors";
import { toast } from "react-hot-toast";
import { ArrowRight, CheckCircle, Store, Truck, ChevronLeft } from "lucide-react";

// ── Token entry for drivers ────────────────────────────────────────────────
function DriverTokenEntry({ onBack }) {
    const navigate = useNavigate();
    const [token, setToken] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const t = token.trim();
        if (!t) return;
        navigate(`/delivery/${t}`);
    };

    return (
        <div className="space-y-6">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
                <ChevronLeft className="h-4 w-4" /> Retour
            </button>

            <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Truck className="h-8 w-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">Espace Livreur</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Entrez le token qui vous a été attribué par votre magasin.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Token Livreur
                    </label>
                    <input
                        type="text"
                        required
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="ex: fatima-X7K2P"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm font-mono bg-white"
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                </div>
                <button
                    type="submit"
                    disabled={!token.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                >
                    <Truck className="h-5 w-5" />
                    Accéder à mes livraisons
                </button>
            </form>

            <p className="text-center text-xs text-gray-400">
                Vous n'avez pas encore de token ?{' '}
                Contactez votre responsable magasin.
            </p>
        </div>
    );
}

// ── Role picker ────────────────────────────────────────────────────────────
function RolePicker({ onSelect }) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <img src="/logo.png" alt="BayIIn" className="h-12 w-auto mx-auto mb-4" />
                <h2 className="text-2xl font-extrabold text-gray-900">Bienvenue sur BayIIn</h2>
                <p className="mt-1 text-sm text-gray-500">Choisissez comment vous connecter</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onSelect('owner')}
                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all active:scale-95"
                >
                    <div className="w-14 h-14 bg-indigo-100 group-hover:bg-indigo-200 rounded-2xl flex items-center justify-center transition-colors">
                        <Store className="h-7 w-7 text-indigo-700" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-gray-900 text-sm">Magasin</p>
                        <p className="text-xs text-gray-400 mt-0.5">Propriétaire / Équipe</p>
                    </div>
                </button>

                <button
                    onClick={() => onSelect('driver')}
                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95"
                >
                    <div className="w-14 h-14 bg-orange-100 group-hover:bg-orange-200 rounded-2xl flex items-center justify-center transition-colors">
                        <Truck className="h-7 w-7 text-orange-600" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-gray-900 text-sm">Livreur</p>
                        <p className="text-xs text-gray-400 mt-0.5">App de livraison</p>
                    </div>
                </button>
            </div>

            <p className="text-center text-xs text-gray-400">
                Pas encore de compte ?{' '}
                <Link to="/signup" className="text-indigo-600 font-medium hover:underline">S'inscrire</Link>
            </p>
        </div>
    );
}

// ── Store owner login form ─────────────────────────────────────────────────
function OwnerLoginForm({ onBack, loading, onSubmit, onGoogleLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { t } = useLanguage();

    return (
        <div className="space-y-5">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
                <ChevronLeft className="h-4 w-4" /> Retour
            </button>

            <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Store className="h-8 w-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">{t('sign_in_title')}</h2>
                <p className="mt-1 text-sm text-gray-500">Accédez à votre tableau de bord</p>
            </div>

            <Button
                type="button"
                onClick={onGoogleLogin}
                className="w-full justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-3 py-2.5 shadow-sm"
                isLoading={loading}
                variant="custom"
            >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 4.66c1.61 0 3.1.59 4.23 1.57l3.18-3.18C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('sign_in_google')}
            </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-400 text-xs uppercase tracking-wider font-semibold">{t('or_continue_with')}</span>
                </div>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(email, password); }}>
                <Input
                    label={t('label_email')}
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="bg-white"
                />
                <div>
                    <Input
                        label={t('label_password')}
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-white"
                    />
                    <div className="text-right mt-1">
                        <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Mot de passe oublié ?</a>
                    </div>
                </div>
                <Button
                    type="submit"
                    className="w-full justify-center py-3 text-base shadow-lg shadow-indigo-200"
                    isLoading={loading}
                    icon={ArrowRight}
                >
                    {t('btn_sign_in')}
                </Button>
            </form>
        </div>
    );
}

// ── Main Login Page ────────────────────────────────────────────────────────
export default function Login() {
    const [role, setRole] = useState(null); // null | 'owner' | 'driver'
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleOwnerLogin = async (email, password) => {
        try {
            setLoading(true);
            await login(email, password);
            toast.success(t('welcome_back_toast'));
            navigate('/dashboard');
        } catch (err) {
            toast.error(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await loginWithGoogle();
            toast.success(t('welcome_back_toast'));
            navigate('/dashboard');
        } catch (err) {
            toast.error(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left branding panel — desktop only */}
            <div className="hidden lg:flex w-1/2 bg-indigo-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>
                <div className="relative z-10 flex items-center gap-3 text-2xl font-bold">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                        <Store className="w-8 h-8" />
                    </div>
                    BayIIn
                </div>
                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-bold mb-6 leading-tight">
                        Powering the next generation of e-commerce in Morocco.
                    </h2>
                    <ul className="space-y-4 text-indigo-100">
                        <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /><span>Manage orders, inventory, and finances in one place</span></li>
                        <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /><span>Automated WhatsApp notifications</span></li>
                        <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /><span>Real-time analytics and insights</span></li>
                        <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /><span>Internal delivery team management</span></li>
                    </ul>
                </div>
                <div className="relative z-10 text-sm text-indigo-300">
                    &copy; {new Date().getFullYear()} BayIIn Inc. All rights reserved.
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50/50">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    {/* Mobile only logo when on role picker */}
                    {!role && (
                        <div className="lg:hidden flex justify-center mb-8">
                            <img src="/logo.png" alt="BayIIn Logo" className="h-10 w-auto" />
                        </div>
                    )}

                    {role === null && <RolePicker onSelect={setRole} />}

                    {role === 'driver' && <DriverTokenEntry onBack={() => setRole(null)} />}

                    {role === 'owner' && (
                        <OwnerLoginForm
                            onBack={() => setRole(null)}
                            loading={loading}
                            onSubmit={handleOwnerLogin}
                            onGoogleLogin={handleGoogleLogin}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
