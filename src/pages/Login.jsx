import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import Button from "../components/Button";
import Input from "../components/Input";
import { getFriendlyErrorMessage } from "../utils/firebaseErrors";
import { toast } from "react-hot-toast";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const { t } = useLanguage(); // NEW

    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const checkAndRedirect = async (userId) => {
        try {
            // Check if user has any stores
            const q = query(collection(db, "stores"), where("ownerId", "==", userId), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
                navigate("/dashboard");
                return;
            }

            // Check if staff
            // Note: email might not be available immediately if using Google Auth, but userId is.
            // For staff check we normally need email. 
            // If checking by email, we should use the one from Auth.
            // However, let's just default to dashboard if owner check fails, 
            // letting TenantContext handle the finer details of invited stores.
            // But to support "go directly", we want to know if we should show Onboarding.

            // If not owner, try to find in allowed_users?
            // This is safer to just let TenantContext logic handle deeply if we can't find owner doc.
            // But to avoid flicker, let's try to trust the context will eventually resolve.
            // If we found NO owner store, we navigate to dashboard anyway?
            // If we navigate to dashboard and there are NO stores (even invited), Layout redirects to Onboarding.
            // So if we find a store here -> Dashboard.
            // If we DO NOT find a store here -> ?
            // User might be a staff member.
            // Let's just go to Dashboard. It handles everything.
            // The only reason we do this check is to PREVENT going to Onboarding if we KNOW they have a store.
            // But Layout ALREADY redirects to Onboarding if NO store.
            // So this check is redundant UNLESS Layout is redirecting TOO FAST.
            // Layout waits for `loading`.

            // The original user issue was "go directly to stores".
            // If I just navigate("/dashboard"), the Layout waits for `loading` from TenantContext.
            // TenantContext fetches stores.
            // If it finds stores, `store` is set.
            // If it finds NO stores, `store` is null. -> Redirect to Onboarding.

            // So... simply navigating to dashboard SHOULD work if TenantContext permissions are fixed.
            // I fixed the permissions in the previous step.
            // So I might not even NEED this check logic if permissions are correct.
            // But to be 100% sure and satisfy the request "go directly", I will keep a simple check if I can.

            navigate("/dashboard");

        } catch (e) {
            console.error("Redirection check failed", e);
            navigate("/dashboard");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const userCredential = await login(email, password);
            toast.success(t('welcome_back_toast'));
            // Just go to dashboard, trusting the permissions fix.
            navigate("/dashboard");
        } catch (err) {
            const message = getFriendlyErrorMessage(err);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
                        {t('back_to_home')}
                    </Link>
                    <div className="mx-auto h-20 w-20 flex items-center justify-center">
                        <img src="/logo.png" alt="BayIIn Logo" className="h-full w-full object-contain" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        {t('sign_in_title')}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label={t('label_email')}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                        <Input
                            label={t('label_password')}
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={loading}
                            variant="primary"
                        >
                            {t('btn_sign_in')}
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">{t('or_continue_with')}</span>
                        </div>
                    </div>

                    <div>
                        <Button
                            type="button"
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    const userCredential = await loginWithGoogle();
                                    toast.success(t('welcome_back_toast'));
                                    navigate("/dashboard");
                                } catch (err) {
                                    const message = getFriendlyErrorMessage(err);
                                    toast.error(message);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="w-full"
                            isLoading={loading}
                            variant="secondary"
                        >
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                </form>
                <div className="text-center">
                    <p className="text-sm text-gray-600">
                        {t('no_account')}{" "}
                        <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                            {t('btn_sign_up')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
