import { useState, useEffect, Suspense } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import QAGuide from "./QAGuide";
import { useTenant } from "../context/TenantContext";
import { Loader2, Menu, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Copilot from "./Copilot";
import NotificationBell from "./NotificationBell";
import { getPendingCount, syncPendingOrders } from "../services/offlineQueue";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { WifiOff, CloudUpload } from "lucide-react";

// Loader inline qui garde la sidebar et le header visibles
const InlinePageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Chargement...</p>
        </div>
    </div>
);

export default function Layout() {
    const { store, loading, isSubscriptionExpired, isGracePeriod } = useTenant();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [announcement, setAnnouncement] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    // Fetch Announcement
    useEffect(() => {
        getDoc(doc(db, "system", "announcements")).then(snap => {
            if (snap.exists() && snap.data().active) {
                setAnnouncement(snap.data());
            }
        });

        // Offline / Online listeners
        const handleOnline = () => {
            setIsOnline(true);
            triggerSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check for pending orders
        updatePendingCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updatePendingCount = async () => {
        const count = await getPendingCount();
        setPendingSyncCount(count);
    };

    const triggerSync = async () => {
        if (!navigator.onLine) return;
        
        const syncFn = async (orderData) => {
            return await addDoc(collection(db, "stores", store.id, "orders"), {
                ...orderData,
                syncedAt: serverTimestamp(),
                isOfflineCreated: true
            });
        };

        const result = await syncPendingOrders(syncFn);
        if (result.synced > 0) {
            toast.success(`${result.synced} commandes synchronisées !`);
            updatePendingCount();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!store) {
        return <Navigate to="/onboarding" />;
    }

    const isDashboard = location.pathname === '/dashboard';

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    {!isDashboard ? (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                    ) : (
                        <div className="h-8 w-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {store?.logoUrl ? (
                                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                            ) : (
                                <img src="/logo.png" alt="BayIIn" className="h-full w-full object-contain p-1" />
                            )}
                        </div>
                    )}
                    <span className="font-bold text-gray-900 truncate">
                        {store?.name}
                    </span>
                </div>
                <div className="flex gap-2">
                    {pendingSyncCount > 0 && (
                        <button 
                            onClick={triggerSync}
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-full relative"
                            title={`${pendingSyncCount} commandes en attente de sync`}
                        >
                            <CloudUpload className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                                {pendingSyncCount}
                            </span>
                        </button>
                    )}
                    <NotificationBell />
                </div>
            </div>

            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <main className="flex-1 overflow-auto h-[calc(100vh-65px)] md:h-screen w-full relative">
                {/* Desktop Header for Notifications & Search (Hidden on Mobile) */}
                <div className="hidden md:flex justify-end items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        {/* Could add Profile Dropdown here later */}
                    </div>
                </div>

                {isGracePeriod && (
                    <div className="w-full bg-amber-500 px-4 py-3 text-white text-center shadow-md">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-3">
                            <p className="font-medium text-sm">
                                ⚠️ Votre paiement a échoué. Renouvelez votre abonnement pour éviter la suspension du service.
                            </p>
                            <button 
                                onClick={() => navigate('/settings?tab=subscription')}
                                className="bg-white text-amber-600 px-4 py-1 rounded-full font-bold text-xs hover:bg-gray-100 transition-colors"
                            >
                                Mettre à jour
                            </button>
                        </div>
                    </div>
                )}

                {isSubscriptionExpired && (
                    <div className="w-full bg-red-600 px-4 py-4 text-white text-center shadow-lg border-b border-red-700 animate-pulse">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
                            <p className="font-bold text-sm md:text-lg">
                                ⚠️ Votre abonnement BayIIn a expiré. Votre compte est en mode lecture seule.
                            </p>
                            <button 
                                onClick={() => navigate('/settings?tab=subscription')}
                                className="bg-white text-red-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                Renouveler maintenant
                            </button>
                        </div>
                    </div>
                )}

                {announcement && (
                    <div className={`w-full px-4 py-3 text-white text-center shadow-sm ${announcement.type === 'warning' ? 'bg-orange-600' : 'bg-indigo-600'}`}>
                        <p className="font-medium text-sm md:text-base">{announcement.message}</p>
                    </div>
                )}

                {!isOnline && (
                    <div className="w-full bg-gray-800 px-4 py-2 text-white text-center flex items-center justify-center gap-2 sticky top-[65px] md:top-0 z-10">
                        <WifiOff className="h-4 w-4 text-gray-400" />
                        <p className="text-xs font-medium">Mode hors-ligne · Les commandes seront synchronisées dès le retour d'internet</p>
                    </div>
                )}
                {/* Extra bottom padding on mobile for bottom nav */}
                <div className="p-4 pb-24 md:pb-8 md:p-8">
                    <AnimatePresence>
                        <PageTransition key={location.pathname}>
                            <Suspense fallback={<InlinePageLoader />}>
                                <Outlet />
                            </Suspense>
                        </PageTransition>
                    </AnimatePresence>
                </div>
                <Copilot />
                <QAGuide />
                <BottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
            </main>
        </div>
    );
}
