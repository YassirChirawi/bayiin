import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Truck, CheckCircle2, Inbox, ExternalLink, Loader2 } from 'lucide-react';
import { normalizePhoneMA } from '../../utils/phone';

/** Construit le lien wa.me (format international 212…) avec message pré-rempli. */
const waLink = (phone, message) => {
    const local = normalizePhoneMA(phone);            // 0XXXXXXXXX
    const intl = local.startsWith('0') ? `212${local.slice(1)}` : local;
    return `https://wa.me/${intl}?text=${encodeURIComponent(message || '')}`;
};

const fmtDate = (ts) => {
    const ms = ts?.toMillis?.();
    return ms ? new Date(ms).toLocaleString('fr-MA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
};

const EmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-gray-500 font-medium">Aucune tâche en attente</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Les automatisations qui déclenchent un message WhatsApp ou un envoi transporteur
            déposeront ici les actions à réaliser.
        </p>
    </div>
);

export default function TasksInbox({ whatsappTasks = [], shipmentTasks = [], loading = false, markWhatsappDone, markShipmentDone }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (whatsappTasks.length === 0 && shipmentTasks.length === 0) return <EmptyState />;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* WhatsApp à envoyer */}
            {whatsappTasks.length > 0 && (
                <section>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                        Messages WhatsApp à envoyer ({whatsappTasks.length})
                    </h2>
                    <div className="space-y-3">
                        {whatsappTasks.map((task) => (
                            <div key={task.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900">{task.clientName || 'Client'}</span>
                                        {task.clientPhone && <span className="text-xs text-gray-400">· {task.clientPhone}</span>}
                                        {task.createdAt && <span className="text-[11px] text-gray-300 ml-auto sm:ml-0">{fmtDate(task.createdAt)}</span>}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap break-words">{task.message}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {task.clientPhone && (
                                        <a
                                            href={waLink(task.clientPhone, task.message)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" /> WhatsApp
                                        </a>
                                    )}
                                    <button
                                        onClick={() => markWhatsappDone(task.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                        title="Marquer comme envoyé"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Traité
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Colis à expédier */}
            {shipmentTasks.length > 0 && (
                <section>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        <Truck className="w-4 h-4 text-sky-600" />
                        Colis à expédier ({shipmentTasks.length})
                    </h2>
                    <div className="space-y-3">
                        {shipmentTasks.map((task) => (
                            <div key={task.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900">{task.clientName || 'Client'}</div>
                                    <div className="text-sm text-gray-500">{task.clientCity || 'Ville inconnue'}{task.createdAt ? ` · ${fmtDate(task.createdAt)}` : ''}</div>
                                </div>
                                <button
                                    onClick={() => markShipmentDone(task.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex-shrink-0"
                                    title="Marquer comme expédié"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Expédié
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </motion.div>
    );
}
