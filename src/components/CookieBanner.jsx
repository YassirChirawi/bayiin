import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import Button from "./Button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            // Delay slightly for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50 animate-slide-up">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-indigo-50 rounded-full shrink-0 hidden sm:block">
                        <Cookie className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="text-sm text-gray-600">
                        <p className="font-semibold text-gray-900 mb-1">
                            {t('cookie_title') || "Respect de votre vie privée"}
                        </p>
                        <p>
                            {t('cookie_text') || "Ce site utilise des cookies pour améliorer votre expérience, analyser le trafic et assurer le bon fonctionnement de notre plateforme, conformément à la loi 09-08."}{" "}
                            <Link to="/privacy" className="text-indigo-600 hover:underline">
                                {t('cookie_learn_more') || "En savoir plus"}
                            </Link>.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        onClick={handleAccept}
                        className="w-full md:w-auto justify-center"
                    >
                        {t('cookie_accept') || "J'accepte"}
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 md:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
