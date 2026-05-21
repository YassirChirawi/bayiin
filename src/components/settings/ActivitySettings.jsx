import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { format } from "date-fns";

export default function ActivitySettings({ store, t }) {
    const [logs, setLogs] = useState([]);
    
    useEffect(() => {
        if (store?.id) {
            const fetchLogs = async () => {
                const q = query(
                    collection(db, "stores", store.id, "audit_logs"),
                    orderBy("timestamp", "desc"),
                    limit(50)
                );
                const snap = await getDocs(q);
                setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            };
            fetchLogs();
        }
    }, [store?.id]);

    return (
        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-100">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{t('section_recent_activity') || 'Activité récente'}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('activity_log_desc') || 'Historique des actions critiques sur la boutique.'}</p>
            </div>
            <ul className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                    <li className="px-4 py-4 text-sm text-gray-500 text-center">{t('no_activity') || 'Aucune activité'}</li>
                ) : logs.map((log) => (
                    <li key={log.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-indigo-600 truncate">{log.action}</p>
                                <p className="flex items-center text-sm text-gray-500 cursor-help" title={JSON.stringify(log.metadata || {})}>
                                    <span className="truncate">{log.details}</span>
                                </p>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-xs text-gray-900 font-semibold">{log.user?.name || log.user?.email}</p>
                                <p className="text-xs text-gray-500">
                                    {log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : '-'}
                                </p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
