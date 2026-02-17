
import { useState, useRef, useEffect } from "react";
import { Bell, X, ExternalLink, Trash2 } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function NotificationBell() {
    const { unreadCount, alerts, dismissAlert, refreshAlerts } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { t } = useLanguage();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Refresh when opening
    useEffect(() => {
        if (isOpen) {
            refreshAlerts();
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full ring-2 ring-white bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-2 px-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-md">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        <span className="text-xs text-gray-500">{alerts.length} {t('active') || 'active'}</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {alerts.length === 0 ? (
                            <div className="py-8 px-4 text-center text-gray-500 text-sm">
                                <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                <p>Rien à signaler ! 🎉</p>
                                <p className="text-xs mt-1">Votre business est en bonne santé.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {alerts.map((alert) => (
                                    <li key={alert.id} className={`p-4 hover:bg-gray-50 transition-colors ${alert.type === 'critical' ? 'bg-red-50/30' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className={`text-sm font-medium ${alert.type === 'critical' ? 'text-red-800' : 'text-gray-900'}`}>
                                                    {alert.title}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                    {alert.message}
                                                </p>
                                                {alert.link && (
                                                    <Link
                                                        to={alert.link}
                                                        onClick={() => setIsOpen(false)}
                                                        className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500"
                                                    >
                                                        Voir détails <ExternalLink className="ml-1 h-3 w-3" />
                                                    </Link>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    dismissAlert(alert.id);
                                                }}
                                                className="text-gray-400 hover:text-gray-500"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
