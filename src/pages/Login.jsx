import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Button from "../components/Button";
import Input from "../components/Input";
import { getFriendlyErrorMessage } from "../utils/firebaseErrors";
import { toast } from "react-hot-toast";
import { ArrowRight, CheckCircle, Store } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const { t } = useLanguage();
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await login(email, password);
            toast.success(t('welcome_back_toast'));
            navigate("/dashboard");
        } catch (err) {
            const message = getFriendlyErrorMessage(err);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await loginWithGoogle();
            toast.success(t('welcome_back_toast'));
            navigate("/dashboard");
        } catch (err) {
            const message = getFriendlyErrorMessage(err);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Branding & Testimonial */}
            <div className="hidden lg:flex w-1/2 bg-indigo-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-2xl font-bold">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Store className="w-8 h-8" />
                        </div>
                        BayIIn
                    </div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-bold mb-6 leading-tight">
                        Powering the next generation of e-commerce in Morocco.
                    </h2>
                    <ul className="space-y-4 text-indigo-100">
                        <li className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>Manage orders, inventory, and finances in one place</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>Automated WhatsApp notifications</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>Real-time analytics and insights</span>
                        </li>
                    </ul>
                </div>

                <div className="relative z-10 text-sm text-indigo-300">
                    &copy; {new Date().getFullYear()} BayIIn Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50/50">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="text-center lg:text-left mb-10">
                        <div className="lg:hidden flex justify-center mb-6">
                            <img src="/logo.png" alt="BayIIn Logo" className="h-12 w-auto" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {t('sign_in_title')}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {t('no_account')}{" "}
                            <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                                {t('btn_sign_up')}
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        <div className="mb-6">
                            <Button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-3 py-2.5 shadow-sm"
                                isLoading={loading}
                                variant="custom" // Using custom to override primary styles manually
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 4.66c1.61 0 3.1.59 4.23 1.57l3.18-3.18C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                {t('sign_in_google')}
                            </Button>
                        </div>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                                    {t('or_continue_with')}
                                </span>
                            </div>
                        </div>

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <Input
                                label={t('label_email')}
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="bg-white"
                            />

                            <div className="relative">
                                <Input
                                    label={t('label_password')}
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-white"
                                />
                                <div className="text-right mt-1">
                                    <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full justify-center py-3 text-base shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5"
                                isLoading={loading}
                                icon={ArrowRight}
                            >
                                {t('btn_sign_in')}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
