import { useLanguage } from "../context/LanguageContext";
import {
    HelpCircle, LayoutDashboard, ShoppingBag, Package, Users, DollarSign, Settings,
    Smartphone, Calendar, ExternalLink, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

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
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-8 text-center">
                <h3 className="text-xl font-bold text-indigo-900 mb-2">{t('still_questions')}</h3>
                <p className="text-indigo-700 mb-6 max-w-lg mx-auto">
                    {t('help_description')}
                </p>
                <div className="flex justify-center gap-4">
                    <a
                        href="https://wa.me/212600000000"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-500/20"
                    >
                        Chat on WhatsApp
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}
