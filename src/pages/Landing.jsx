import { ArrowRight, Check, ShoppingBag, Package, Users, DollarSign, Settings, Truck, TrendingUp, ShieldCheck, Phone, PenTool, Smartphone, Zap, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import Newsletter from "../components/Newsletter";
import { motion } from "framer-motion";

export default function Landing() {
    return (
        <div className="bg-white min-h-screen font-sans text-slate-900 overflow-x-hidden">
            <SEO
                title="BayIIn - La Plateforme E-commerce pour le Maroc"
                description="Plus qu'un simple dashboard. Une suite complète pour gérer Commandes, Stock, Équipe et Finance. Spécialement conçu pour le marché marocain."
            />
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                                <img src="/logo.png" alt="BayIIn Logo" className="h-full w-full object-contain" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">BayIIn</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                            <a href="#guide" className="hover:text-indigo-600 transition-colors">Guide</a>
                            <a href="#features" className="hover:text-indigo-600 transition-colors">Fonctionnalités</a>
                            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Prix</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                                Se connecter
                            </Link>
                            <Link to="/signup" className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-200">
                                Commencer <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div className="absolute top-20 right-20 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-8 border border-indigo-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Guide de Gestion 2026
                    </div>

                    {/* Arabic Branding & Puns */}
                    <div className="mb-6 flex flex-col items-center">
                        <h1 className="text-7xl md:text-9xl font-bold tracking-tight leading-tight font-arabic text-indigo-800 mb-4 drop-shadow-sm">
                            بايعين
                        </h1>
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-slate-900">
                            Business <span className="text-indigo-600 bg-indigo-50 px-2 rounded-xl rotate-2 inline-block">Baayin</span>.
                        </h2>
                    </div>

                    <p className="text-xl md:text-3xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed font-arabic font-bold" dir="rtl">
                        منصة بايعين.. باش يبقى الرزق باين والحساب باين.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                        <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-lg transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                            Jeter le cahier (Start Free)
                        </Link>
                        <Link to="/demo" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2">
                            Voir la Démo
                        </Link>
                    </div>
                </motion.div>

                {/* Hero Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-16 relative mx-auto max-w-5xl z-10"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 animate-pulse"></div>
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-2 backdrop-blur-sm">
                        <img
                            src="/hero-dashboard.png"
                            alt="BayIIn Dashboard"
                            className="rounded-xl shadow-2xl border border-slate-200 w-full"
                        />
                    </div>
                </motion.div>
            </section>

            {/* FEATURES GRID + STORYTELLING */}
            <div id="guide" className="space-y-0 relative">

                {/* 1. CONFIGURATION & TEAM */}
                <section className="py-24 bg-white overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row items-center gap-16">
                            <div className="flex-1 space-y-8">
                                <div className="inline-block p-3 rounded-xl bg-indigo-100 text-indigo-600">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-900 mb-2">1. Configuration & Équipe</h2>
                                    <h3 className="text-3xl font-bold text-slate-600 font-arabic mb-6" dir="rtl">الإعدادات و فريق العمل</h3>
                                    <p className="text-lg text-slate-600 leading-relaxed mb-4">
                                        <strong className="text-indigo-600">FR:</strong> Finis le cahier. Configurez votre devise (MAD), invitez vos confirmateurs (Staff), et définissez leurs permissions.
                                    </p>
                                    <p className="text-lg text-slate-600 leading-relaxed font-arabic text-right border-r-4 border-indigo-100 pr-4" dir="rtl">
                                        <strong className="text-indigo-600">AR:</strong> سالينا مع الستيلو والكناش. قاد العملة ديالك وعرض على ليكيب ديالك باش يبداو يتكلفو بليكول.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="font-semibold text-slate-900">Rôles</div>
                                        <div className="text-sm text-slate-500">Admin & Staff</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="font-semibold text-slate-900">Devise</div>
                                        <div className="text-sm text-slate-500">Multi-currency (MAD)</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Team working" className="rounded-2xl shadow-lg border border-slate-200" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. CYCLE DE COMMANDE & WHATSAPP */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                            <div className="flex-1 space-y-8">
                                <div className="inline-block p-3 rounded-xl bg-green-100 text-green-600">
                                    <Phone className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-900 mb-2">2. Le Filtre Anti-Retour</h2>
                                    <h3 className="text-3xl font-bold text-slate-600 font-arabic mb-6" dir="rtl">تقليل الرتور بالواتساب</h3>

                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">⚡</div>
                                            <div>
                                                <h4 className="font-bold text-lg">Smart Fill</h4>
                                                <p className="text-slate-600 text-sm">Si un client a déjà commandé, ses infos s'affichent automatiquement.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">💬</div>
                                            <div>
                                                <h4 className="font-bold text-lg">WhatsApp Templates</h4>
                                                <p className="text-slate-600 text-sm">Envoyez des confirmations en Darija/Français en 1 clic. Réduit les retours de 30%.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <div className="absolute top-10 -left-10 w-40 h-40 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 z-10 relative">
                                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white"><Phone className="w-5 h-5" /></div>
                                        <div>
                                            <div className="font-bold text-slate-900">WhatsApp API</div>
                                            <div className="text-xs text-slate-500">Template Darija</div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg text-sm text-slate-800 font-arabic mb-3" dir="rtl">
                                        السلام عليكم سي كريم، معاك متجر بايعين. بغينا نأكدو الطلبية ديالك...
                                    </div>
                                    <button className="w-full bg-green-600 text-white py-2 rounded-lg font-medium text-sm">Envoyer (1-Click)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. RETOURS & STOCK */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="inline-block p-3 rounded-xl bg-orange-100 text-orange-600">
                                    <Package className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-900 mb-2">3. Maîtriser les Retours</h2>
                                    <h3 className="text-3xl font-bold text-slate-600 font-arabic mb-6" dir="rtl">التحكم في المرتجعات</h3>
                                    <p className="text-lg text-slate-600 leading-relaxed">
                                        Le retour est le "tueur" du profit. BayIIn vous aide à le transformer en stock réel instantanément.
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-indigo-600 mt-1" />
                                            <div>
                                                <span className="font-bold block text-slate-900">Remise en Stock Automatique</span>
                                                <span className="text-sm text-slate-500">Dès qu'un statut passe à "Retourné", choisissez de réintégrer le stock.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-indigo-600 mt-1" />
                                            <div>
                                                <span className="font-bold block text-slate-900">Calcul du Coût Réel</span>
                                                <span className="text-sm text-slate-500">Les frais de retour sont déduits automatiquement de votre Dashboard.</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Warehouse stock" className="rounded-2xl shadow-lg border border-slate-200 grayscale hover:grayscale-0 transition-all duration-700" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. DASHBOARD FINANCIER */}
                <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">4. Finance & Profit <span className="text-green-400">Baayin</span></h2>
                            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-arabic" dir="rtl">
                                ما بقاش "الفلو" (Flou).. دابا كلشي باين.
                            </p>
                            <p className="text-slate-500 text-sm mt-2">Plus de calculs manuels. Voyez exactement ce qui reste dans votre poche.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all">
                                <div className="text-slate-400 text-sm mb-2">Chiffre d'Affaires</div>
                                <div className="text-4xl font-bold text-white mb-4">124,500 DH</div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-3/4"></div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-green-500 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <DollarSign className="w-24 h-24" />
                                </div>
                                <div className="text-green-400 text-sm mb-2 font-bold">NET PROFIT (Bénéfice Net)</div>
                                <div className="text-4xl font-bold text-white mb-4">42,300 DH</div>
                                <p className="text-xs text-slate-400">Après déduction des Ads, Livraison, et Retours.</p>
                            </div>
                            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-red-500 transition-all">
                                <div className="text-slate-400 text-sm mb-2">Dépenses (Ads + Shipping)</div>
                                <div className="text-4xl font-bold text-white mb-4">82,200 DH</div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. SECURITY & PWA */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-indigo-50 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1 space-y-6">
                                <div className="inline-block p-3 rounded-xl bg-indigo-200 text-indigo-700">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900">Sécurité Biométrique</h2>
                                <h3 className="text-2xl font-bold text-slate-600 font-arabic" dir="rtl">أمان الهاتف</h3>
                                <p className="text-lg text-slate-600">
                                    Vos données financières sont sensibles. BayIIn est une PWA installable qui peut être verrouillée par FaceID ou Empreinte Digitale.
                                </p>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 bg-white px-4 py-2 rounded-full shadow-sm">
                                        <Smartphone className="w-4 h-4" /> Installable (PWA)
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 bg-white px-4 py-2 rounded-full shadow-sm">
                                        <Zap className="w-4 h-4" /> Offline Mode
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="relative w-64 h-[500px] border-8 border-slate-900 rounded-[3rem] bg-slate-800 shadow-2xl overflow-hidden">
                                    {/* Phone Screen Mockup */}
                                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                            <ShieldCheck className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <div className="text-slate-900 font-bold mb-2">Locked</div>
                                        <div className="text-slate-400 text-sm">Touch ID to open</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Checklist Day */}
                <section className="py-24 bg-white border-t border-slate-100">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900">🚀 Checklist du Matin</h2>
                            <p className="text-slate-500 font-arabic mt-2 text-xl" dir="rtl">قائمة المهام اليومية</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: "📞",
                                    title: "Confirmer",
                                    desc: "Appeler les nouvelles commandes via le bouton WhatsApp intégré."
                                },
                                {
                                    icon: "🚚",
                                    title: "Expédier",
                                    desc: "Générer les bons de livraison pour vos livreurs (Amana, etc)."
                                },
                                {
                                    icon: "🔍",
                                    title: "Réconcilier",
                                    desc: "Vérifier les retours de la veille et les remettre en stock."
                                }
                            ].map((item, i) => (
                                <div key={i} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow text-center">
                                    <div className="text-4xl mb-4">{item.icon}</div>
                                    <h3 className="font-bold text-xl mb-3 text-slate-900">{item.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* Pricing Section - Minimal & Clean */}
            <section id="pricing" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Tarification Transparente</h2>
                        <p className="text-slate-500">Commencez petit, grandissez vite.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 hover:border-indigo-300 transition-colors">
                            <h3 className="text-lg font-medium text-slate-500 mb-4">Starter</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold">79</span>
                                <span className="text-xl font-bold">DH</span>
                                <span className="text-slate-500">/mois</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-slate-600"><Check className="w-5 h-5 text-green-500" /> 50 Commandes/mois</li>
                                <li className="flex items-center gap-3 text-slate-600"><Check className="w-5 h-5 text-green-500" /> Analytics de base</li>
                            </ul>
                            <Link to="/signup" className="block w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 text-center rounded-xl font-semibold transition-colors">
                                Essai Gratuit
                            </Link>
                        </div>
                        <div className="bg-indigo-900 p-8 rounded-3xl border border-indigo-800 text-white relative shadow-2xl">
                            <div className="absolute top-0 right-0 bg-indigo-500 text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAIRE</div>
                            <h3 className="text-lg font-medium text-indigo-200 mb-4">Pro</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold">179</span>
                                <span className="text-xl font-bold">DH</span>
                                <span className="text-slate-400">/mois</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-indigo-100"><Check className="w-5 h-5 text-indigo-400" /> Commandes Illimitées</li>
                                <li className="flex items-center gap-3 text-indigo-100"><Check className="w-5 h-5 text-indigo-400" /> Gestion des Retours Avancée</li>
                                <li className="flex items-center gap-3 text-indigo-100"><Check className="w-5 h-5 text-indigo-400" /> Support Prioritaire</li>
                            </ul>
                            <Link to="/signup" className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-center rounded-xl font-semibold transition-colors shadow-lg">
                                Devenir Pro
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                        © {new Date().getFullYear()} BayIIn Commerce SaaS.
                        <span>Made with ❤️ in Morocco.</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
