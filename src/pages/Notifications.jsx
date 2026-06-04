import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, Info, Filter, Search, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { format } from 'date-fns';

export default function Notifications() {
    const { alerts, dismissAlert, refreshAlerts } = useNotifications();
    const { t } = useLanguage();
    const [filter, setFilter] = useState('all'); // all, critical, warning, info
    const [search, setSearch] = useState('');

    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            const matchesFilter = filter === 'all' || alert.type === filter;
            const matchesSearch = alert.title.toLowerCase().includes(search.toLowerCase()) || 
                                  alert.message.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [alerts, filter, search]);

    const getIconForType = (type) => {
        switch (type) {
            case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColorForType = (type) => {
        switch (type) {
            case 'critical': return 'bg-red-50/50 hover:bg-red-50';
            case 'warning': return 'bg-amber-50/50 hover:bg-amber-50';
            case 'success': return 'bg-green-50/50 hover:bg-green-50';
            default: return 'bg-blue-50/50 hover:bg-blue-50';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-indigo-600" />
                        Centre de Notifications
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">Gérez vos alertes et notifications système.</p>
                </div>
                <button
                    onClick={refreshAlerts}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Check className="w-4 h-4" /> Marquer tout comme lu
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher une notification..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                    {['all', 'critical', 'warning', 'info'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                                filter === f 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {f === 'all' ? 'Toutes' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {filteredAlerts.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {filteredAlerts.map((alert) => (
                                <motion.div
                                    key={alert.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className={`p-4 transition-colors flex gap-4 ${getBgColorForType(alert.type)}`}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        {getIconForType(alert.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-sm font-bold text-gray-900">{alert.title}</h3>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {format(new Date(alert.createdAt || Date.now()), 'dd MMM yyyy, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                                        {alert.link && (
                                            <a href={alert.link} className="inline-block mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                                Voir les détails →
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => dismissAlert(alert.id)}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                                            title="Ignorer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-12 text-center"
                        >
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Aucune notification</h3>
                            <p className="text-gray-500 mt-1">Vous êtes à jour ! Profitez de la tranquillité.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
