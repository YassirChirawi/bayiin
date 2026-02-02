import { ArrowRight, Check, ShoppingBag, Package, Users, DollarSign, Settings, Truck, TrendingUp, ShieldCheck, Phone, PenTool, Smartphone, Zap, Globe, Star, Quote, LayoutDashboard, BarChart3, Lock, ShoppingCart, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { motion } from "framer-motion";
import Footer from "../components/Footer";
import FAQ from "../components/FAQ";
import LiveAppPreview from "../components/LiveAppPreview";
import { useLanguage } from "../context/LanguageContext";

export default function Landing() {
    const { t, language, setLanguage } = useLanguage();
    const isRTL = language === 'ar';

    return (
        <div className={`bg-slate-50 min-h-screen font-sans text-slate-900 overflow-x-hidden ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <SEO
                title={isRTL ? "بايعين - منصة التجارة الإلكترونية للمغرب" : "BayIIn - La Plateforme E-commerce pour le Maroc"}
                description={t('hero_subtitle')}
            />
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                                <img src="/logo.png" alt="BayIIn" className="w-full h-full object-contain" />
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">BayIIn</span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                            <Link to="/" className="hover:text-indigo-600 transition-colors">{t('nav_home')}</Link>
                            <a href="#features" className="hover:text-indigo-600 transition-colors">{t('nav_features')}</a>
                            <a href="#pricing" className="hover:text-indigo-600 transition-colors">{t('nav_pricing')}</a>
                            {/* <a href="#testimonials" className="hover:text-indigo-600 transition-colors">Avis</a> */}
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Language Switcher */}
                            <div className="flex items-center bg-slate-100 rounded-lg p-1 mr-2">
                                <button
                                    onClick={() => setLanguage('ar')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'ar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    AR
                                </button>
                                <button
                                    onClick={() => setLanguage('fr')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'fr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    FR
                                </button>
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    EN
                                </button>
                            </div>

                            <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                                {t('nav_login')}
                            </Link>
                            <Link to="/signup" className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                {t('nav_signup')} <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative overflow-hidden">
                {/* Background Icons Pattern */}
                <div className="absolute inset-0 z-0 select-none overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 text-indigo-500/10 rotate-12 transform"><ShoppingBag className="w-24 h-24" /></div>
                    <div className="absolute top-20 right-20 text-purple-500/10 -rotate-12 transform"><ShoppingCart className="w-32 h-32" /></div>
                    <div className="absolute bottom-20 left-1/4 text-indigo-500/5 rotate-45 transform"><DollarSign className="w-40 h-40" /></div>
                    <div className="absolute top-1/3 right-10 text-pink-500/10 rotate-6 transform"><Smartphone className="w-20 h-20" /></div>
                    <div className="absolute bottom-10 right-1/3 text-slate-400/10 -rotate-6 transform"><Package className="w-28 h-28" /></div>
                    <div className="absolute top-1/2 left-0 text-indigo-300/10 rotate-12 transform"><Truck className="w-16 h-16" /></div>
                    <div className="absolute top-10 left-1/3 text-green-500/10 -rotate-12 transform"><CreditCard className="w-14 h-14" /></div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 rounded-[100%] blur-3xl -z-10 opacity-60"></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-indigo-600 text-sm font-medium mb-8 border border-indigo-50 shadow-sm hover:shadow-md transition-shadow cursor-default">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        {t('hero_badge')}
                    </div>

                    {/* Arabic Caption always visible or context specific? User wants fully translated. */}
                    <p className="text-3xl md:text-5xl text-slate-800 mb-6 max-w-4xl mx-auto leading-relaxed font-arabic font-bold drop-shadow-sm" dir="rtl">
                        {/* For AR, this matches the next H1. For FR/EN, it adds the localized cultural flavor */}
                        {language === 'ar' ? null : <span className="text-indigo-600 block mb-2 font-arabic text-2xl md:text-3xl">بايعين.. باش يبقى الرزق باين والحساب باين.</span>}
                    </p>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6 text-slate-900">
                        {t('hero_title_1')} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{t('hero_title_2')}</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                        {t('hero_subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 mb-16">
                        <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-indigo-200 hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                            {t('hero_cta_start')}
                            <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </Link>
                        <Link to="/demo" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-bold text-lg transition-all hover:border-slate-300 hover:shadow-md flex items-center justify-center gap-2">
                            {t('hero_cta_demo')}
                        </Link>
                    </div>

                </motion.div>

                {/* Live App Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-8 relative mx-auto max-w-6xl z-10"
                >
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-900 bg-slate-900">
                        <LiveAppPreview />
                    </div>
                </motion.div>
            </section>

            {/* STATS SECTION */}
            <section className="py-10 bg-white border-y border-slate-100">
                <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 gap-8 text-center">
                    <div>
                        <div className="text-4xl font-extrabold text-indigo-600 mb-1">99%</div>
                        <div className="text-sm font-medium text-slate-500">{t('stats_uptime')}</div>
                    </div>
                    <div>
                        <div className="text-4xl font-extrabold text-indigo-600 mb-1">24/7</div>
                        <div className="text-sm font-medium text-slate-500">{t('stats_support')}</div>
                    </div>
                </div>
            </section>

            {/* FEATURES GRID + STORYTELLING */}
            <div id="features" className="space-y-0 relative">

                {/* 1. CONFIGURATION & TEAM */}
                <section className="py-24 bg-white overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={`flex flex-col md:flex-row items-center gap-20`}>
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight whitespace-pre-line">{t('features_team_title')}</h2>
                                    <h3 className="text-3xl font-bold text-slate-500 font-arabic mb-6">{t('features_team_subtitle')}</h3>
                                    <p className="text-xl text-slate-600 leading-relaxed mb-6">
                                        {t('features_team_desc')}
                                    </p>
                                    <div className={`pl-6 ${isRTL ? 'border-r-4 pr-6 pl-0' : 'border-l-4'} border-indigo-200`}>
                                        <p className="text-lg text-slate-700 italic font-arabic">
                                            {t('features_team_quote')}
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-4">
                                    {[
                                        t('features_team_list_1'),
                                        t('features_team_list_2'),
                                        t('features_team_list_3')
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <span className="font-medium text-slate-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 bg-indigo-200 rounded-3xl rotate-6 group-hover:rotate-3 transition-transform duration-500"></div>
                                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3" alt="Team working" className="relative rounded-3xl shadow-2xl border-4 border-white transition-transform duration-500 group-hover:-translate-y-2" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. CYCLE DE COMMANDE & WHATSAPP */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={`flex flex-col md:flex-row-reverse items-center gap-20`}>
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-green-50 text-green-600 mb-4">
                                    <Phone className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">{t('features_antiretour_title')}</h2>
                                    <h3 className="text-3xl font-bold text-slate-500 font-arabic mb-6">{t('features_antiretour_subtitle')}</h3>

                                    <p className="text-xl text-slate-600 leading-relaxed mb-8">
                                        {t('features_antiretour_desc')}
                                    </p>

                                    <div className="grid gap-6">
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                            <div className="flex gap-4">
                                                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">⚡</div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-900">{t('features_antiretour_card1_title')}</h4>
                                                    <p className="text-slate-600 text-sm mt-1">{t('features_antiretour_card1_desc')}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                            <div className="flex gap-4">
                                                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">💬</div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-900">{t('features_antiretour_card2_title')}</h4>
                                                    <p className="text-slate-600 text-sm mt-1">{t('features_antiretour_card2_desc')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <div className="absolute top-10 -left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 z-10 relative">
                                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                                        <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg"><Phone className="w-6 h-6" /></div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-lg">WhatsApp API</div>
                                            <div className="text-sm text-slate-500">Template Darija (Automatique)</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className={`bg-slate-100 p-4 rounded-xl ${isRTL ? 'rounded-tl-none' : 'rounded-tr-none'} text-slate-800 font-arabic text-right max-w-[90%] ${isRTL ? 'mr-auto' : 'ml-auto'}`} dir="rtl">
                                            السلام عليكم سي <strong>Karim</strong>، معاك متجر <strong>BayIIn</strong>. <br />
                                            بغينا نأكدو الطلبية ديالك ديال <strong>Pack Premium</strong> ب <strong>299 DH</strong>. <br />
                                            واش العنوان هو: <strong>Casablanca, Maarif</strong> ؟
                                        </div>
                                        <div className={`bg-[#DCF8C6] p-4 rounded-xl ${isRTL ? 'rounded-tr-none' : 'rounded-tl-none'} text-slate-900 max-w-[80%] ${isRTL ? 'ml-auto' : 'mr-auto'} shadow-sm`}>
                                            Oui c'est bien ça, merci !
                                        </div>
                                    </div>
                                    <button className="w-full mt-6 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-green-100">
                                        Envoyer la confirmation (1-Click)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. DASHBOARD FINANCIER */}
                <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[120px] opacity-20"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">{t('features_finance_title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">{t('features_finance_title_highlight')}</span></h2>
                            <p className="text-slate-400 max-w-2xl mx-auto text-xl font-arabic font-medium">
                                {t('features_finance_desc')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 hover:border-indigo-500 transition-all group">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 group-hover:border-indigo-500/50 transition-colors">
                                        <BarChart3 className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">THIS MONTH</span>
                                </div>
                                <div className="text-slate-400 text-sm mb-1">{t('features_finance_revenue')}</div>
                                <div className="text-4xl font-bold text-white mb-4">124,500 <span className="text-xl text-slate-500">DH</span></div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-3/4 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 hover:border-green-500 transition-all relative overflow-hidden group transform md:-translate-y-6 shadow-2xl">
                                <div className="absolute top-0 right-0 p-3 opacity-5">
                                    <DollarSign className="w-32 h-32" />
                                </div>
                                <div className="flex items-start justify-between mb-8">
                                    <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 group-hover:border-green-500 transition-colors">
                                        <DollarSign className="w-8 h-8 text-green-400" />
                                    </div>
                                </div>
                                <div className="text-green-400 text-sm mb-1 font-bold tracking-wider uppercase">{t('features_finance_net_profit')}</div>
                                <div className="text-5xl font-extrabold text-white mb-4">42,300 <span className="text-2xl text-slate-500 font-normal">DH</span></div>
                                <p className="text-xs text-slate-400 bg-slate-900/50 inline-block px-3 py-1 rounded-full border border-slate-700">Après déduction Ads & Shipping</p>
                            </div>

                            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 hover:border-red-500 transition-all group">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 group-hover:border-red-500/50 transition-colors">
                                        <TrendingUp className="w-8 h-8 text-red-400" />
                                    </div>
                                </div>
                                <div className="text-slate-400 text-sm mb-1">{t('features_finance_expenses')}</div>
                                <div className="text-4xl font-bold text-white mb-4">82,200 <span className="text-xl text-slate-500">DH</span></div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 w-1/2 shadow-[0_0_20px_rgba(239,68,68,0.5)]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. SECURITY & PWA */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-[3rem] p-8 md:p-20 flex flex-col md:flex-row items-center gap-16 border border-indigo-100 shadow-xl">
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                                    <Lock className="w-8 h-8" />
                                </div>
                                <h2 className="text-4xl font-extrabold text-slate-900 leading-tight whitespace-pre-line">{t('features_security_title')}</h2>
                                <h3 className="text-2xl font-bold text-slate-500 font-arabic">{t('features_security_subtitle')}</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    {t('features_security_desc')}
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 bg-white px-5 py-3 rounded-xl border border-indigo-100 shadow-sm">
                                        <Smartphone className="w-5 h-5 text-indigo-600" /> App Mobile (PWA)
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 bg-white px-5 py-3 rounded-xl border border-indigo-100 shadow-sm">
                                        <Zap className="w-5 h-5 text-yellow-500" /> Mode Hors-ligne
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="relative w-72 h-[550px] border-[12px] border-slate-900 rounded-[3rem] bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                                    {/* Phone Screen Mockup */}
                                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90 z-0"></div>
                                        <div className="z-10 text-center text-white">
                                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 mx-auto ring-4 ring-white/10">
                                                <ShieldCheck className="w-10 h-10 text-white" />
                                            </div>
                                            <div className="text-2xl font-bold mb-2">Verrouillé</div>
                                            <div className="text-indigo-100 text-sm">Face ID requis</div>
                                        </div>
                                        <motion.div
                                            className="absolute bottom-10 z-10 w-16 h-1 bg-white/50 rounded-full"
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{t('pricing_title')}</h2>
                            <p className="text-xl text-slate-500">{t('pricing_subtitle')}</p>
                        </motion.div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-10 rounded-3xl border border-slate-200 hover:border-indigo-300 transition-all hover:shadow-xl group">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Starter</h3>
                            <p className="text-slate-500 mb-8 text-sm">{t('pricing_starter_desc')}</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-5xl font-extrabold">79</span>
                                <span className="text-2xl font-bold text-slate-700">DH</span>
                                <span className="text-slate-500 font-medium">{t('pricing_starter_period')}</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-3 text-slate-600"><div className="p-1 rounded-full bg-slate-100"><Check className="w-3 h-3 text-slate-900" /></div> {t('pricing_feature_50')}</li>
                                <li className="flex items-center gap-3 text-slate-600"><div className="p-1 rounded-full bg-slate-100"><Check className="w-3 h-3 text-slate-900" /></div> {t('pricing_feature_1user')}</li>
                                <li className="flex items-center gap-3 text-slate-600"><div className="p-1 rounded-full bg-slate-100"><Check className="w-3 h-3 text-slate-900" /></div> {t('pricing_feature_analytics')}</li>
                            </ul>
                            <Link to="/signup" className="block w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-900 text-center rounded-2xl font-bold transition-colors">
                                {t('pricing_cta_trial')}
                            </Link>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 text-white relative shadow-2xl overflow-hidden transform md:-translate-y-4">
                            <div className={`absolute top-0 ${isRTL ? 'left-0 rounded-br-2xl' : 'right-0 rounded-bl-2xl'} bg-indigo-500 text-xs font-bold px-4 py-2`}>{t('pricing_pro_popular')}</div>
                            <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                            <p className="text-slate-400 mb-8 text-sm">{t('pricing_pro_desc')}</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-5xl font-extrabold">179</span>
                                <span className="text-2xl font-bold text-slate-400">DH</span>
                                <span className="text-slate-500 font-medium">{t('pricing_starter_period')}</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-3 text-indigo-100"><div className="p-1 rounded-full bg-indigo-500/20"><Check className="w-3 h-3 text-indigo-400" /></div> {t('pricing_feature_unlimited_orders')}</li>
                                <li className="flex items-center gap-3 text-indigo-100"><div className="p-1 rounded-full bg-indigo-500/20"><Check className="w-3 h-3 text-indigo-400" /></div> {t('pricing_feature_unlimited_users')}</li>
                                <li className="flex items-center gap-3 text-indigo-100"><div className="p-1 rounded-full bg-indigo-500/20"><Check className="w-3 h-3 text-indigo-400" /></div> {t('pricing_feature_returns')}</li>
                                <li className="flex items-center gap-3 text-indigo-100"><div className="p-1 rounded-full bg-indigo-500/20"><Check className="w-3 h-3 text-indigo-400" /></div> {t('pricing_feature_support')}</li>
                            </ul>
                            <Link to="/signup" className="block w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-center rounded-2xl font-bold transition-colors shadow-lg shadow-indigo-900/50">
                                {t('pricing_cta_pro')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <FAQ />

            <div className="bg-slate-900 border-t border-slate-800">
                <Footer />
            </div>
        </div>
    );
}
