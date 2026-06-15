import { useState, useEffect } from "react";
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
    Barcode,
    ClipboardCheck,
    MessageCircle,
    Paintbrush,
    Bell
} from "lucide-react";
import { useReconciliation } from "../hooks/useReconciliation";
import { vibrate } from "../utils/haptics";
import { getPendingCount, syncPendingOrders } from "../services/offlineQueue";
import { toast } from "react-hot-toast";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { usePWA } from "../context/PWAContext";
import { useLanguage } from "../context/LanguageContext";

export default function Sidebar({ isOpen, onClose }) {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const { store, isFranchiseAdmin } = useTenant();
    const { t, language, setLanguage } = useLanguage(); // NEW
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const { runReconciliation, isRecalculating } = useReconciliation(store?.id);
    const [pendingOffline, setPendingOffline] = useState(0);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const { isInstallable, installPWA, isInstalled } = usePWA();

    const role = store?.role || 'owner';

    // Offline Queue Logic
    useEffect(() => {
        const checkQueue = async () => {
            const count = await getPendingCount();
            setPendingOffline(count);
        };
        
        checkQueue();

        const handleOnline = () => {
            setIsOffline(false);
            handleSync();
        };
        const handleOffline = () => setIsOffline(true);
        const handleQueueUpdate = () => checkQueue();

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offlineQueueUpdated', handleQueueUpdate);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offlineQueueUpdated', handleQueueUpdate);
        };
    }, []);

    const handleSync = async () => {
        if (isSyncing || pendingOffline === 0) return;
        setIsSyncing(true);
        try {
            const saveOrder = async (orderData) => {
                if (!store?.id) throw new Error("No store ID");
                const ordersRef = collection(db, "stores", store.id, "orders");
                await addDoc(ordersRef, { ...orderData, createdAt: serverTimestamp() });
            };
            const result = await syncPendingOrders(saveOrder);
            if (result.synced > 0) {
                toast.success(t('msg_synced_count', { count: result.synced }) || `${result.synced} orders synced!`);
                vibrate('success');
            }
        } catch (error) {
            console.error("Sync error:", error);
            toast.error(t('err_sync_error') || 'Sync error. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };


    const navigation = [
        // ── Franchise Hub (franchise_admin only) ──
        ...(isFranchiseAdmin ? [
            { name: 'Franchise Hub', href: '/franchise', icon: Building2, special: true },
        ] : []),
        { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('planning') || 'Planning', href: '/planning', icon: Calendar },
        { name: t('orders'), href: '/orders', icon: ShoppingBag, badge: pendingOffline > 0 ? `${pendingOffline} hors ligne` : null, badgeColor: 'bg-amber-100 text-amber-700' },
        { name: t('products'), href: '/products', icon: Package },
        { name: t('customers'), href: '/customers', icon: Users },
        { name: t('notifications') || 'Notifications', href: '/notifications', icon: Bell },
        { name: t('automations') || 'Automations', href: '/automations', icon: Workflow, isLocked: true, badge: 'PRO' },
        { name: t('nav_warehouse') || 'Entrepôt & Scan', href: '/warehouse', icon: Barcode, isLocked: true, badge: 'PRO' },
        { name: t('nav_marketing') || 'Marketing', href: '/marketing', icon: Megaphone },
        { name: t('nav_drivers'), href: '/drivers', icon: Truck },
        { name: t('nav_hr') || 'Ressources Humaines', href: '/hr', icon: UserCheck, isLocked: true, badge: 'PRO' },
        { name: t('nav_assets') || 'Gestion des Assets', href: '/assets', icon: Building2, isLocked: true, badge: 'PRO' },
        { name: t('nav_purchases') || 'Achats', href: '/purchases', icon: ShoppingCart },
        { name: t('nav_returns_service') || 'SAV & Retours', href: '/returns', icon: RotateCcw },
        ...(role !== 'staff' ? [
            { name: t('finances'), href: '/finances', icon: DollarSign },
            { name: t('team'), href: '/team', icon: UserPlus },
            { name: 'Vitrine (Customizer)', href: '/customizer', icon: Paintbrush },
            { name: t('settings'), href: '/settings', icon: Settings },
        ] : []),
        ...(store?.testerMode ? [
            { name: 'Recette QA', href: '/qa', icon: ClipboardCheck },
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
                fixed inset-y-0 left-0 z-40 w-72 glass-sidebar transform transition-transform duration-300 ease-in-out
                md:translate-x-0 md:static md:h-screen md:flex md:flex-col md:w-64
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
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
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    {['fr', 'en'].map((lang) => (
                        <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${language === lang ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
                </div>

                <nav id="tour-nav" className="flex-1 p-3 space-y-0.5 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return item.special ? (
                            // Franchise Hub — special gradient style
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => { vibrate('soft'); onClose && onClose(); }}
                                className={`
                    flex items-center px-4 py-3.5 text-sm font-semibold rounded-xl transition-all mb-2
                    ${isActive
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                        : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 border border-indigo-100'}
                  `}
                            >
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                {item.name}
                                {!isActive && <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">HQ</span>}
                            </Link>
                        ) : (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => { vibrate('soft'); onClose && onClose(); }}
                                className={`
                                    flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-colors min-h-[48px]
                                    ${isActive
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : (item.isLocked && !store?.testerMode)
                                            ? 'text-gray-400 hover:bg-gray-50/50' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                `}
                            >
                                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${(item.isLocked && !store?.testerMode) ? 'text-gray-300' : ''}`} />
                                <span className="flex-1">{item.name}</span>
                                {item.badge && (
                                    <span className={`
                                        ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md
                                        ${item.badgeColor ? item.badgeColor : ((item.isLocked && !store?.testerMode) ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-indigo-100 text-indigo-600')}
                                    `}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 space-y-2">
                    {(isOffline || pendingOffline > 0) && (
                        <button
                            onClick={handleSync}
                            disabled={isOffline || isSyncing}
                            className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg w-full transition-all border
                                ${isOffline ? 'bg-red-50 text-red-500 border-red-100' : 
                                  isSyncing ? 'bg-amber-50 text-amber-500 border-amber-100' : 
                                  'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'}`}
                        >
                            <RefreshCw className={`mr-3 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isOffline ? 'Mode Hors Ligne' : 
                             isSyncing ? 'Synchronisation...' : 
                             `Synchroniser (${pendingOffline})`}
                        </button>
                    )}

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

                    {!isInstalled && (
                        <button
                            onClick={async () => {
                                if (isInstallable) {
                                    await installPWA();
                                } else {
                                    setShowInstallGuide(true);
                                }
                            }}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg w-full transition-colors"
                        >
                            <Download className="mr-3 h-5 w-5" />
                            {t('install_app')}
                        </button>
                    )}
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
