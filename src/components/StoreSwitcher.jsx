import { useState, useRef, useEffect } from "react";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { ChevronDown, Check, Store as StoreIcon, User, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function StoreSwitcher() {
    const { store, stores, switchStore } = useTenant();
    const { t } = useLanguage(); // NEW
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!store) return <div className="animate-pulse h-10 bg-gray-200 rounded-md w-full"></div>;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100 overflow-hidden">
                        {store.logoUrl ? (
                            <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <img src="/logo.png" alt="BayIIn" className="h-full w-full object-contain p-1" />
                        )}
                    </div>
                    <div className="flex flex-col items-start truncate">
                        <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                            {store.name}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            {store.role === 'owner' ? t('role_owner') : t('role_staff_simple')}
                        </span>
                    </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-gray-100 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 divide-y divide-gray-100">
                    <div className="py-1 max-h-60 overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {t('title_my_stores')}
                        </div>
                        {stores.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    switchStore(s.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${store.id === s.id ? 'bg-indigo-50' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded flex items-center justify-center flex-shrink-0 ${store.id === s.id ? 'bg-white border border-indigo-200' : 'bg-gray-100'}`}>
                                        {s.logoUrl ? (
                                            <img src={s.logoUrl} alt="" className="h-full w-full object-cover rounded" />
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500">{s.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${store.id === s.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                                            {s.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {s.role === 'owner' ? t('role_owner') : t('role_staff_simple')}
                                        </span>
                                    </div>
                                </div>
                                {store.id === s.id && <Check className="h-4 w-4 text-indigo-600" />}
                            </button>
                        ))}
                    </div>
                    <div className="py-1">
                        <Link
                            to="/onboarding"
                            state={{ createNew: true }}
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
                        >
                            <PlusCircle className="h-4 w-4" />
                            {t('action_create_store')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
