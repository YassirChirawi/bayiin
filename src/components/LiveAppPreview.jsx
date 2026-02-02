import { useState, useEffect } from "react";
import { LayoutDashboard, ShoppingBag, Users, Package, DollarSign, Settings, LogOut, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DemoDashboard from "./DemoDashboard"; // Assuming I moved it or export logic
import DemoOrders from "./demo/DemoOrders";
import DemoProducts from "./demo/DemoProducts";
import DemoCustomers from "./demo/DemoCustomers";
import DemoFinances from "./demo/DemoFinances";
import { useLanguage } from "../context/LanguageContext";

// Re-importing locally to handle path diffs if DemoDashboard is still in components root
import DemoDashboardOriginal from "./DemoDashboard";

export default function LiveAppPreview() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isHovered, setIsHovered] = useState(false);

    const tabs = [
        { id: 'dashboard', label: t('dashboard') || "Dashboard", icon: LayoutDashboard, component: DemoDashboardOriginal },
        { id: 'orders', label: t('orders') || "Commandes", icon: ShoppingBag, component: DemoOrders },
        { id: 'products', label: t('products') || "Produits", icon: Package, component: DemoProducts },
        { id: 'customers', label: t('customers') || "Clients", icon: Users, component: DemoCustomers },
        { id: 'finances', label: t('finances') || "Finances", icon: DollarSign, component: DemoFinances },
    ];

    // Auto-rotate tabs
    useEffect(() => {
        if (isHovered) return;

        const interval = setInterval(() => {
            setActiveTab(current => {
                const currentIndex = tabs.findIndex(tab => tab.id === current);
                const nextIndex = (currentIndex + 1) % tabs.length;
                return tabs[nextIndex].id;
            });
        }, 3000); // Change every 3 seconds

        return () => clearInterval(interval);
    }, [isHovered]);

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || DemoDashboardOriginal;

    return (
        <div
            className="flex h-[600px] bg-slate-50 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Fake Sidebar */}
            <div className={`w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ${isRTL ? 'border-r-0 border-l' : ''}`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">B</span>
                    </div>
                    <span className="font-bold text-xl text-slate-900 tracking-tight ml-3 hidden md:block">BayIIn</span>
                </div>

                <div className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="hidden md:block transition-opacity duration-200">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className={`absolute left-0 w-1 h-8 bg-indigo-600 rounded-r-full ${isRTL ? 'left-auto right-0 rounded-r-none rounded-l-full' : ''}`}
                                />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="hidden md:block">
                            <div className="h-3 w-20 bg-slate-200 rounded mb-1" />
                            <div className="h-2 w-12 bg-slate-100 rounded" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                {/* Fake Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
                    <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <Menu className="w-5 h-5 md:hidden" />
                        <span className="hidden md:inline">Good Morning, Demo Store</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">DS</div>
                    </div>
                </header>

                {/* Content Scroller */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-transparent" // Ensure no white bg clash
                        >
                            <ActiveComponent />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
