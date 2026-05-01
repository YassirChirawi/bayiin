import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Package, Users, Menu } from "lucide-react";
import { vibrate } from "../utils/haptics";

const NAV_ITEMS = [
    { href: "/dashboard",  icon: LayoutDashboard, label: "Accueil"   },
    { href: "/orders",     icon: ShoppingBag,     label: "Commandes" },
    { href: "/products",   icon: Package,          label: "Produits"  },
    { href: "/customers",  icon: Users,            label: "Clients"   },
];

export default function BottomNav({ onOpenMenu }) {
    const { pathname } = useLocation();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] safe-area-inset-bottom">
            <div className="flex items-stretch h-16">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            to={href}
                            onClick={() => vibrate('soft')}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                                <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            </div>
                            <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}

                {/* Menu button — opens full sidebar */}
                <button
                    onClick={() => { vibrate('soft'); onOpenMenu(); }}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5"
                >
                    <div className="p-1.5 rounded-xl">
                        <Menu className="h-5 w-5 text-gray-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400">Menu</span>
                </button>
            </div>
        </nav>
    );
}
