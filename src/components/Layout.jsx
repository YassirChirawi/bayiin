import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTenant } from "../context/TenantContext";
import { Loader2, Menu, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Layout() {
    const { store, loading } = useTenant();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [announcement, setAnnouncement] = useState(null);

    // Fetch Announcement
    useEffect(() => {
        getDoc(doc(db, "system", "announcements")).then(snap => {
            if (snap.exists() && snap.data().active) {
                setAnnouncement(snap.data());
            }
        });
    }, []);

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
                    {!isDashboard ? (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
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
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <main className="flex-1 overflow-auto h-[calc(100vh-65px)] md:h-screen w-full">
                {announcement && (
                    <div className={`w-full px-4 py-3 text-white text-center shadow-sm ${announcement.type === 'warning' ? 'bg-orange-600' : 'bg-indigo-600'}`}>
                        <p className="font-medium text-sm md:text-base">{announcement.message}</p>
                    </div>
                )}
                <div className="p-4 md:p-8">
                    <AnimatePresence mode="wait">
                        <PageTransition key={location.pathname}>
                            <Outlet />
                        </PageTransition>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
