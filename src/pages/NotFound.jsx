import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                {/* 404 Illustration placeholder or text */}
                <h1 className="text-9xl font-bold text-indigo-100 font-arabic">404</h1>

                <div className="relative -mt-12 mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Page Introuvable</h2>
                    <p className="text-xl text-slate-500 font-arabic" dir="rtl">
                        هاد الصفحة ماكيناش...
                    </p>
                </div>

                <p className="text-slate-600 mb-8">
                    Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                    >
                        <Home className="w-5 h-5" />
                        Retour Accueil
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Retour Arrière
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
