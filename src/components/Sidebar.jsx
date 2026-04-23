import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import StoreSwitcher from "./StoreSwitcher";
import InstallGuide from "./InstallGuide";
import {
    LayoutDashboard,
    ShoppingBag,
    ShoppingCart,
    Package,
    Settings,
    LogOut,
    DollarSign,
    Users,
    X,
    UserPlus,
    HelpCircle,
    Download,
    Globe,
    Calendar,
    Workflow,
    Building2,
    Truck,
    RefreshCw,
    UserCheck,
    RotateCcw,
    Megaphone,
    Barcode
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useReconciliation } from "../hooks/useReconciliation";
import { vibrate } from "../utils/haptics";

export default function Sidebar({ isOpen, onClose }) {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const { store, isFranchiseAdmin } = useTenant();
    const { t, language, setLanguage } = useLanguage(); // NEW
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const { runReconciliation, isRecalculating } = useReconciliation(store?.id);

    const role = store?.role || 'owner';

    // Toggle Language
    const toggleLanguage = () => {
        setLanguage(prev => prev === 'min' ? 'fr' : (prev === 'fr' ? 'en' : 'fr'));
    };

    const navigation = [
        // ── Franchise Hub (franchise_admin only) ──
        ...(isFranchiseAdmin ? [
            { name: 'Franchise Hub', href: '/franchise', icon: Building2, special: true },
        ] : []),
        { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('planning') || 'Planning', href: '/planning', icon: Calendar },
        { name: t('orders'), href: '/orders', icon: ShoppingBag },
        { name: t('products'), href: '/products', icon: Package },
        { name: t('customers'), href: '/customers', icon: Users },
        { name: t('automations') || 'Automations', href: '/automations', icon: Workflow },
        { name: t('nav_warehouse') || 'Entrepôt & Scan', href: '/warehouse', icon: Barcode },
        { name: t('nav_marketing') || 'Marketing', href: '/marketing', icon: Megaphone },
        { name: t('nav_drivers') || 'Livreurs', href: '/drivers', icon: Truck },
        { name: t('nav_hr') || 'Ressources Humaines', href: '/hr', icon: UserCheck },
        { name: t('nav_assets') || 'Gestion des Assets', href: '/assets', icon: Building2 },
        { name: t('nav_purchases') || 'Achats', href: '/purchases', icon: ShoppingCart },
        { name: t('nav_returns_service') || 'SAV & Retours', href: '/returns', icon: RotateCcw },
        ...(role !== 'staff' ? [
            { name: t('finances'), href: '/finances', icon: DollarSign },
            { name: t('team'), href: '/team', icon: UserPlus },
            { name: t('settings'), href: '/settings', icon: Settings },
        ] : []),
    ];

    return (
        <>
            <InstallGuide isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => {
                        vibrate('soft');
                        onClose();
                    }}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-40 w-64 glass-sidebar transform transition-transform duration-200 ease-in-out
                md:translate-x-0 md:static md:h-screen md:flex md:flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 border-b border-gray-200 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <StoreSwitcher />
                        </div>
                        <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 mt-2">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Language Switcher */}
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                    >
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-indigo-500" />
                            <span>Language: {language === 'en' ? 'English' : 'Français'}</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 border border-indigo-200 px-1.5 rounded">{language.toUpperCase()}</span>
                    </button>
                </div>

                <nav id="tour-nav" className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return item.special ? (
                            // Franchise Hub — special gradient style
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => onClose && onClose()}
                                className={`
                    flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all mb-2
                    ${isActive
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                        : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 border border-indigo-100'}
                  `}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                                {!isActive && <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">HQ</span>}
                            </Link>
                        ) : (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => onClose && onClose()}
                                className={`
                    flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 space-y-2">
                    <button
                        onClick={() => runReconciliation()}
                        disabled={isRecalculating}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg w-full transition-all border
                            ${isRecalculating
                                ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-not-allowed'
                                : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'}`}
                    >
                        <RefreshCw className={`mr-3 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                        {isRecalculating ? t('loading') : (t('recalculate_sync') || "Sync Stats")}
                    </button>

                    <button
                        onClick={() => setShowInstallGuide(true)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg w-full transition-colors"
                    >
                        <Download className="mr-3 h-5 w-5" />
                        {t('install_app')}
                    </button>
                    <Link
                        to="/help"
                        onClick={() => onClose && onClose()}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg w-full transition-colors"
                    >
                        <HelpCircle className="mr-3 h-5 w-5" />
                        {t('help')}
                    </Link>
                    <button
                        onClick={() => logout()}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        {t('logout')}
                    </button>
                </div>
            </div>
        </>
    );
}
