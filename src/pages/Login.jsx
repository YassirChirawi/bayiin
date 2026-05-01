import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getFriendlyErrorMessage } from "../utils/firebaseErrors";
import { toast } from "react-hot-toast";
import { ArrowRight, Store, Truck, ChevronLeft, Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";
import { vibrate } from "../utils/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { useBiometrics } from "../hooks/useBiometrics";
import BiometricSetupModal from "../components/BiometricSetupModal";

// ── Animated background ────────────────────────────────────────────────────
function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
            {/* Gradient orbs */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]"
                animate={{ x: [0, 80, 0], y: [0, -60, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                style={{ top: '-10%', right: '-5%' }}
            />
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[100px]"
                animate={{ x: [0, -60, 0], y: [0, 80, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                style={{ bottom: '-10%', left: '-5%' }}
            />
            <motion.div
                className="absolute w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[80px]"
                animate={{ x: [0, 40, -30, 0], y: [0, -40, 20, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                style={{ top: '40%', left: '30%' }}
            />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
        </div>
    );
}

// ── Floating stats badges ──────────────────────────────────────────────────
function FloatingBadge({ children, className, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.6, ease: "easeOut" }}
            className={`absolute hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl ${className}`}
        >
            {children}
        </motion.div>
    );
}

// ── Driver token entry ─────────────────────────────────────────────────────
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
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
                <ChevronLeft className="h-4 w-4" /> Retour
            </button>

            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/30"
                >
                    <Truck className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Espace Livreur</h2>
                <p className="mt-2 text-sm text-white/50">
                    Entrez le token attribué par votre magasin
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        required
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="ex: fatima-X7K2P"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none text-white font-mono placeholder-white/20 backdrop-blur-sm transition-all"
                        autoFocus
                        autoCapitalize="none"
                    />
                </div>
                <motion.button
                    type="submit"
                    disabled={!token.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none"
                >
                    <Truck className="h-5 w-5" />
                    Accéder à mes livraisons
                </motion.button>
            </form>

            <p className="text-center text-xs text-white/30">
                Pas encore de token ? Contactez votre responsable magasin.
            </p>
        </motion.div>
    );
}

// ── Role picker ────────────────────────────────────────────────────────────
function RolePicker({ onSelect }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
        >
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-block mb-5"
                >
                    <img src="/logo.png" alt="BayIIn" className="h-14 w-auto drop-shadow-2xl" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Bienvenue sur <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">BayIIn</span>
                </h1>
                <p className="mt-2 text-white/40 text-sm">Choisissez comment vous connecter</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <motion.button
                    onClick={() => onSelect('owner')}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex flex-col items-center gap-4 p-7 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-indigo-500/40 transition-all backdrop-blur-sm overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                        <Store className="h-8 w-8 text-white" />
                    </div>
                    <div className="relative text-center">
                        <p className="font-bold text-white text-sm">Magasin</p>
                        <p className="text-xs text-white/30 mt-0.5">Propriétaire / Équipe</p>
                    </div>
                </motion.button>

                <motion.button
                    onClick={() => onSelect('driver')}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex flex-col items-center gap-4 p-7 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-orange-500/40 transition-all backdrop-blur-sm overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                        <Truck className="h-8 w-8 text-white" />
                    </div>
                    <div className="relative text-center">
                        <p className="font-bold text-white text-sm">Livreur</p>
                        <p className="text-xs text-white/30 mt-0.5">App de livraison</p>
                    </div>
                </motion.button>
            </div>

            <p className="text-center text-sm text-white/30">
                Pas encore de compte ?{' '}
                <Link to="/signup" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                    S'inscrire gratuitement
                </Link>
            </p>
        </motion.div>
    );
}

// ── Store owner login form ─────────────────────────────────────────────────
function OwnerLoginForm({ onBack, loading, onSubmit, onGoogleLogin, onResetPassword }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { t } = useLanguage();

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
                <ChevronLeft className="h-4 w-4" /> Retour
            </button>

            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30"
                >
                    <Store className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">{t('sign_in_title')}</h2>
                <p className="mt-1 text-sm text-white/40">Accédez à votre tableau de bord</p>
            </div>

            {/* Google Login */}
            <motion.button
                type="button"
                onClick={onGoogleLogin}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white rounded-2xl text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
            >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 4.66c1.61 0 3.1.59 4.23 1.57l3.18-3.18C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('sign_in_google')}
            </motion.button>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-transparent text-white/30 uppercase tracking-widest font-medium" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
                        {t('or_continue_with')}
                    </span>
                </div>
            </div>

            {/* Email/Password Form */}
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(email, password); }}>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-white/25" />
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={t('label_email') || "Email"}
                        className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-white placeholder-white/20 backdrop-blur-sm transition-all text-sm"
                    />
                </div>
                <div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-white/25" />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder={t('label_password') || "Mot de passe"}
                            className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-white placeholder-white/20 backdrop-blur-sm transition-all text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                    </div>
                    <div className="text-right mt-2">
                        <button
                            type="button"
                            onClick={() => onResetPassword(email)}
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>
                </div>
                <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:shadow-none"
                >
                    {loading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            {t('btn_sign_in')}
                            <ArrowRight className="h-4.5 w-4.5" />
                        </>
                    )}
                </motion.button>
            </form>
        </motion.div>
    );
}

// ── Main Login Page ────────────────────────────────────────────────────────
export default function Login() {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showBioSetup, setShowBioSetup] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    
    const { t } = useLanguage();
    const { login, loginWithGoogle, resetPassword } = useAuth();
    const navigate = useNavigate();
    const { isAvailable } = useBiometrics();

    const handlePostLoginFlow = async (user) => {
        const supported = await isAvailable();
        const enabled = localStorage.getItem('biometricEnabled') === 'true';

        if (supported && !enabled) {
            setPendingUser(user);
            setShowBioSetup(true);
        } else {
            navigate('/dashboard');
        }
    };

    const handleResetPassword = async (email) => {
        if (!email) {
            toast.error("Veuillez d'abord saisir votre email.");
            return;
        }
        try {
            await resetPassword(email);
            vibrate('success');
            toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.");
        } catch (err) {
            vibrate('error');
            toast.error(getFriendlyErrorMessage(err));
        }
    };

    const handleOwnerLogin = async (email, password) => {
        try {
            setLoading(true);
            const { user } = await login(email, password);
            vibrate('success');
            toast.success(t('welcome_back_toast'));
            await handlePostLoginFlow(user);
        } catch (err) {
            vibrate('error');
            toast.error(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { user } = await loginWithGoogle();
            vibrate('success');
            toast.success(t('welcome_back_toast'));
            await handlePostLoginFlow(user);
        } catch (err) {
            vibrate('error');
            toast.error(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <AnimatedBackground />

            {/* Floating badges — desktop only */}
            <FloatingBadge className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold" delay={0.8} style={{ top: '12%', left: '8%' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                +2,340 marchands actifs
            </FloatingBadge>
            <FloatingBadge className="bg-indigo-500/10 text-indigo-300 text-xs font-semibold" delay={1.2} style={{ bottom: '18%', right: '6%' }}>
                <Sparkles className="h-3.5 w-3.5" />
                98.7% uptime
            </FloatingBadge>
            <FloatingBadge className="bg-purple-500/10 text-purple-300 text-xs font-semibold" delay={1.5} style={{ top: '22%', right: '10%' }}>
                <Store className="h-3.5 w-3.5" />
                Maroc #1 e-commerce SaaS
            </FloatingBadge>

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative w-full max-w-md mx-4"
            >
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-indigo-600/20 rounded-[2.5rem] blur-xl opacity-60" />

                <div className="relative bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-8 sm:p-10 shadow-2xl">
                    <AnimatePresence mode="wait">
                        {role === null && <RolePicker key="picker" onSelect={setRole} />}
                        {role === 'driver' && <DriverTokenEntry key="driver" onBack={() => setRole(null)} />}
                        {role === 'owner' && (
                            <OwnerLoginForm
                                key="owner"
                                onBack={() => setRole(null)}
                                loading={loading}
                                onSubmit={handleOwnerLogin}
                                onGoogleLogin={handleGoogleLogin}
                                onResetPassword={handleResetPassword}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <BiometricSetupModal 
                isOpen={showBioSetup} 
                onClose={() => {
                    setShowBioSetup(false);
                    navigate('/dashboard');
                }}
                userId={pendingUser?.uid}
            />
        </div>
    );
}
