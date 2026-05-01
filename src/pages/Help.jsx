import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
    HelpCircle, LayoutDashboard, ShoppingBag, Package, Users, DollarSign, Settings,
    Smartphone, Calendar, ExternalLink, ChevronRight, CheckCircle, Zap, Send, Phone
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

export default function Help() {
    const { t } = useLanguage();
    const location = useLocation();

    // Scroll to section on load if hash exists
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location]);

    const topics = [
        {
            id: "dashboard",
            icon: LayoutDashboard,
            color: "text-blue-600 bg-blue-50",
            title: t('help_cat_dashboard'),
            content: [
                t('help_dash_intro'),
                t('help_dash_kpi'),
                t('help_dash_agenda')
            ]
        },
        {
            id: "orders",
            icon: ShoppingBag,
            color: "text-indigo-600 bg-indigo-50",
            title: t('help_cat_orders'),
            content: [
                t('help_orders_intro'),
                t('help_orders_create'),
                t('help_orders_workflow'),
                t('help_orders_whatsapp')
            ]
        },
        {
            id: "products",
            icon: Package,
            color: "text-purple-600 bg-purple-50",
            title: t('help_cat_products'),
            content: [
                t('help_products_intro'),
                t('help_products_variants'),
                t('help_products_catalog')
            ]
        },
        {
            id: "customers",
            icon: Users,
            color: "text-green-600 bg-green-50",
            title: t('help_cat_customers'),
            content: [
                t('help_customers_intro'),
                t('help_customers_profile'),
                t('help_customers_autofill')
            ]
        },
        {
            id: "finances",
            icon: DollarSign,
            color: "text-yellow-600 bg-yellow-50",
            title: t('help_cat_finances'),
            content: [
                t('help_finances_intro'),
                t('help_finances_profit'),
                t('help_finances_kpi')
            ]
        },
        {
            id: "settings",
            icon: Settings,
            color: "text-gray-600 bg-gray-50",
            title: t('help_cat_settings'),
            content: [
                t('help_settings_intro'),
                t('help_settings_identity'),
                t('help_settings_whatsapp'),
                t('help_settings_security'),
                t('help_settings_team')
            ]
        },
        {
            id: "mobile",
            icon: Smartphone,
            color: "text-pink-600 bg-pink-50",
            title: t('help_cat_mobile'),
            content: [
                "Install App (PWA): Open in Chrome/Safari -> Add to Home Screen.",
                "Offline Mode: View processed orders even without internet."
            ]
        },
        {
            id: "test_guide",
            icon: CheckCircle,
            color: "text-emerald-600 bg-emerald-50",
            title: t('help_cat_test_guide'),
            content: [
                t('help_test_orders'),
                t('help_test_stock'),
                t('help_test_security'),
                t('help_test_pro')
            ]
        },
        {
            id: "logic",
            icon: Zap,
            color: "text-amber-600 bg-amber-50",
            title: t('help_cat_logic'),
            content: [
                t('help_logic_profit'),
                t('help_logic_stock'),
                t('help_logic_grace'),
                t('help_logic_cod')
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-purple-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-3">{t('help')}</h1>
                    <p className="text-indigo-100 max-w-2xl text-lg">
                        {t('help_subtitle')}
                    </p>
                </div>
            </div>

            {/* Topics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {topics.map((topic) => (
                    <div
                        key={topic.id}
                        id={topic.id}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow scroll-mt-24"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl ${topic.color}`}>
                                <topic.icon className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{topic.title}</h2>
                        </div>

                        <ul className="space-y-3">
                            {topic.content.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-600">
                                    <div className="min-w-[6px] h-[6px] rounded-full bg-gray-300 mt-2"></div>
                                    <span className="text-sm leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Quick Links / Support */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-8">
                <div className="text-center mb-8">
                    <h3 className="text-2xl font-extrabold text-indigo-900 mb-2">{t('still_questions')}</h3>
                    <p className="text-indigo-700 max-w-lg mx-auto">{t('help_description')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* WhatsApp Direct */}
                    <a
                        href="https://wa.me/212600000000?text=Bonjour%20support%20BayIIn%2C%20j%27ai%20besoin%20d%27aide"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-4 bg-[#25D366] hover:bg-[#1DAE57] text-white p-5 rounded-2xl transition-all shadow-lg shadow-green-200 hover:-translate-y-0.5 group"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold">WhatsApp Support</p>
                            <p className="text-white/80 text-sm">+212 6 00 00 00 00 · Réponse rapide</p>
                        </div>
                        <ExternalLink className="ml-auto w-4 h-4 opacity-70 group-hover:opacity-100" />
                    </a>

                    {/* Mini Contact Form */}
                    <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
                        <InAppContactForm />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InAppContactForm() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", phone: "", message: "" });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.phone) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "contact_requests"), {
                ...form,
                type: "support",
                source: "help_page",
                status: "new",
                createdAt: serverTimestamp(),
            });
            setSent(true);
            toast.success("Message envoyé ! On vous répond très vite.");
        } catch {
            toast.error("Erreur, réessayez.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) return (
        <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="font-bold text-gray-900">Message envoyé !</p>
            <p className="text-sm text-gray-500">Notre équipe vous répond sous 2h.</p>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <p className="font-bold text-gray-800 text-sm">📝 Nous contacter</p>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Votre nom" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="WhatsApp *" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <textarea className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" rows={2} placeholder="Votre question ou problème..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors">
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <><Send className="w-4 h-4" /> Envoyer</>}
            </button>
        </form>
    );
}
