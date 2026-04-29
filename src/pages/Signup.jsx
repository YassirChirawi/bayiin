import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getFriendlyErrorMessage } from "../utils/firebaseErrors";
import { toast } from "react-hot-toast";
import { vibrate } from "../utils/haptics";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, Eye, EyeOff, Check, X, Sparkles, ShieldCheck, Zap, BarChart3 } from "lucide-react";

// ── Animated background (shared style with Login) ─────────────────────────
function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]"
                animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                style={{ top: '-10%', left: '-5%' }}
            />
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[100px]"
                animate={{ x: [0, 60, 0], y: [0, -80, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
                style={{ bottom: '-10%', right: '-5%' }}
            />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
        </div>
    );
}

// ── Password strength indicator ────────────────────────────────────────────
function PasswordStrength({ password }) {
    const checks = useMemo(() => ({
        length: password.length >= 6,
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
    }), [password]);

    const strength = Object.values(checks).filter(Boolean).length;
    const strengthLabel = strength === 0 ? '' : strength === 1 ? 'Faible' : strength === 2 ? 'Moyen' : 'Fort';
    const strengthColor = strength === 1 ? 'bg-red-500' : strength === 2 ? 'bg-amber-500' : strength === 3 ? 'bg-emerald-500' : 'bg-white/10';

    if (!password) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2"
        >
            {/* Progress bar */}
            <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-white/10'}`} />
                ))}
            </div>
            <p className={`text-xs font-medium ${strength === 1 ? 'text-red-400' : strength === 2 ? 'text-amber-400' : strength === 3 ? 'text-emerald-400' : 'text-white/30'}`}>
                {strengthLabel}
            </p>
            {/* Rules */}
            <div className="space-y-1">
                {[
                    { key: 'length', label: '6 caractères minimum' },
                    { key: 'upper', label: 'Une majuscule' },
                    { key: 'number', label: 'Un chiffre' },
                ].map(rule => (
                    <div key={rule.key} className="flex items-center gap-2 text-xs">
                        {checks[rule.key] ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                            <X className="h-3 w-3 text-white/20" />
                        )}
                        <span className={checks[rule.key] ? 'text-emerald-400/80' : 'text-white/30'}>{rule.label}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ── Feature pill ───────────────────────────────────────────────────────────
function FeaturePill({ icon: Icon, text, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
        >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm text-white/60">{text}</span>
        </motion.div>
    );
}

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const { t } = useLanguage();
    const { signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            vibrate('error');
            toast.error(t('passwords_mismatch'));
            return;
        }

        if (!termsAccepted) {
            vibrate('error');
            toast.error("Veuillez accepter les conditions d'utilisation.");
            return;
        }

        try {
            setLoading(true);
            await signup(email, password);
            vibrate('success');
            toast.success(t('account_created') + " Veuillez vérifier votre boîte mail.");
            navigate("/onboarding");
        } catch (err) {
            vibrate('error');
            toast.error(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setLoading(true);
            await loginWithGoogle();
            vibrate('success');
            toast.success(t('welcome_toast'));
            navigate("/onboarding");
        } catch (err) {
            vibrate('error');
            toast.error(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordsMismatch = confirmPassword && password !== confirmPassword;

    return (
        <div className="min-h-screen flex relative">
            <AnimatedBackground />

            {/* Left — Features panel (desktop) */}
            <div className="hidden lg:flex w-[45%] flex-col justify-center px-16 xl:px-20 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex items-center gap-3 mb-10">
                        <img src="/logo.png" alt="BayIIn" className="h-10 w-auto drop-shadow-2xl" />
                        <span className="text-2xl font-bold text-white tracking-tight">BayIIn</span>
                    </div>

                    <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                        Lancez votre
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            business en ligne
                        </span>
                    </h2>
                    <p className="text-white/40 text-lg mb-10 max-w-md">
                        Rejoignez les marchands marocains qui utilisent BayIIn pour gérer commandes, livraisons et finances.
                    </p>

                    <div className="space-y-3 max-w-sm">
                        <FeaturePill icon={Zap} text="Commandes + WhatsApp en 1 clic" delay={0.3} />
                        <FeaturePill icon={BarChart3} text="Tableau de bord financier temps réel" delay={0.5} />
                        <FeaturePill icon={ShieldCheck} text="Sécurisé & RGPD conforme" delay={0.7} />
                        <FeaturePill icon={Sparkles} text="IA intégrée — Copilot Beya3" delay={0.9} />
                    </div>

                    <div className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500'].map((c, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-slate-900 flex items-center justify-center text-white text-[10px] font-bold`}>
                                    {['Y', 'A', 'S', 'M'][i]}
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white/80">+2,340 marchands</p>
                            <p className="text-xs text-white/30">font confiance à BayIIn</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right — Form */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md relative"
                >
                    {/* Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-[2.5rem] blur-xl opacity-60" />

                    <div className="relative bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-8 sm:p-10 shadow-2xl">
                        {/* Mobile logo */}
                        <div className="lg:hidden flex justify-center mb-6">
                            <img src="/logo.png" alt="BayIIn" className="h-10 w-auto drop-shadow-2xl" />
                        </div>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white">
                                {t('create_store_title')}
                            </h2>
                            <p className="mt-1 text-sm text-white/40">
                                {t('start_trial_subtitle')}
                            </p>
                        </div>

                        {/* Google Signup */}
                        <motion.button
                            type="button"
                            onClick={handleGoogleSignup}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white rounded-2xl text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all shadow-lg shadow-black/10 mb-6 disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 4.66c1.61 0 3.1.59 4.23 1.57l3.18-3.18C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {t('sign_up_google')}
                        </motion.button>

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 text-white/30 uppercase tracking-widest font-medium" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
                                    {t('or_continue_with')}
                                </span>
                            </div>
                        </div>

                        {/* Form */}
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={t('label_email')}
                                    className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-white placeholder-white/20 backdrop-blur-sm transition-all text-sm"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder={t('label_password')}
                                        className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-white placeholder-white/20 backdrop-blur-sm transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <PasswordStrength password={password} />
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder={t('label_confirm_password')}
                                    className={`w-full pl-12 pr-12 py-4 bg-white/5 border rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-white placeholder-white/20 backdrop-blur-sm transition-all text-sm ${
                                        passwordsMismatch ? 'border-red-500/50 focus:border-red-500/50' :
                                        passwordsMatch ? 'border-emerald-500/50 focus:border-emerald-500/50' :
                                        'border-white/10 focus:border-indigo-500/50'
                                    }`}
                                />
                                {passwordsMatch && (
                                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                                )}
                                {passwordsMismatch && (
                                    <X className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                                )}
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setTermsAccepted(!termsAccepted)}
                                    className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        termsAccepted
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'border-white/20 hover:border-white/40'
                                    }`}
                                >
                                    {termsAccepted && <Check className="h-3 w-3 text-white" />}
                                </button>
                                <p className="text-xs text-white/40 leading-relaxed">
                                    {t('agree_terms_part1') || "J'accepte les"}{" "}
                                    <Link to="/terms" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/30 transition-colors">
                                        {t('terms_link_text') || "Conditions Générales d'Utilisation"}
                                    </Link>
                                </p>
                            </div>

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={loading || !termsAccepted}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-40 disabled:shadow-none mt-2"
                            >
                                {loading ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {t('btn_sign_up')}
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <p className="text-center text-sm text-white/30 mt-6">
                            {t('have_account')}{" "}
                            <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                                {t('btn_sign_in')}
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
