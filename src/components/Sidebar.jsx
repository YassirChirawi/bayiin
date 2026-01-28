import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import StoreSwitcher from "./StoreSwitcher"; // Import StoreSwitcher
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Settings,
    LogOut,
    DollarSign,
    Users,
    X,
    UserPlus,
    HelpCircle
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const { store } = useTenant();

    const role = store?.role || 'owner'; // Default to owner/admin if not specified (legacy)

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Orders', href: '/orders', icon: ShoppingBag },
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Customers', href: '/customers', icon: Users },
        // Restricted links
        ...(role !== 'staff' ? [
            { name: 'Finances', href: '/finances', icon: DollarSign },
            { name: 'Team', href: '/team', icon: UserPlus }, // New Team Link
            { name: 'Settings', href: '/settings', icon: Settings },
        ] : []),
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden glass-effect"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
                md:translate-x-0 md:static md:h-screen md:flex md:flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 border-b border-gray-200 flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <StoreSwitcher />
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 mt-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav id="tour-nav" className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => onClose && onClose()} // Close on navigation (mobile)
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
                    <a
                        id="tour-support"
                        href="https://wa.me/212626156381?text=Hello%20BayIIn%20Support%2C%20I%20have%20a%20question..."
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg w-full transition-colors"
                    >
                        <HelpCircle className="mr-3 h-5 w-5" />
                        Help & Support
                    </a>
                    <button
                        onClick={() => logout()}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Log Out
                    </button>
                </div>
            </div>
        </>
    );
}
