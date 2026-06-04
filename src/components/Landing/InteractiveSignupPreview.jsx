import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Store } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function InteractiveSignupPreview() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [storeName, setStoreName] = useState("");
    const [isHovered, setIsHovered] = useState(false);

    const handleCreate = (e) => {
        e.preventDefault();
        if (storeName.trim()) {
            navigate(`/signup?storeName=${encodeURIComponent(storeName.trim())}`);
        } else {
            navigate("/signup");
        }
    };

    return (
        <section className="py-32 relative overflow-hidden bg-slate-950 text-white border-y border-white/10">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-600/30 to-purple-600/30 blur-[100px] rounded-[100%] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-slate-300">Votre empire e-commerce commence ici</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                        Quel nom donneriez-vous <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                            à votre succès ?
                        </span>
                    </h2>
                    
                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                        Testez gratuitement pendant 14 jours. Aucune carte bancaire requise. Annulez à tout moment.
                    </p>

                    <form 
                        onSubmit={handleCreate}
                        className="relative max-w-xl mx-auto"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <div className={`absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-30 transition-opacity duration-500 ${isHovered ? 'opacity-60' : ''}`}></div>
                        <div className="relative flex flex-col sm:flex-row items-center bg-slate-900 border border-white/10 rounded-xl p-2 shadow-2xl">
                            <div className="flex items-center pl-4 text-slate-400 flex-shrink-0 mb-4 sm:mb-0 w-full sm:w-auto">
                                <Store className="w-5 h-5 mr-2" />
                            </div>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Nom de votre boutique..."
                                className="w-full bg-transparent text-white text-lg px-4 py-3 sm:py-2 outline-none placeholder:text-slate-600 mb-4 sm:mb-0"
                            />
                            <button
                                type="submit"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 sm:py-3 rounded-lg font-bold text-lg transition-colors whitespace-nowrap"
                            >
                                Créer maintenant <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Setup immédiat</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Données sécurisées</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Support 24/7</div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
