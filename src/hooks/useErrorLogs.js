import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * useErrorLogs (BAY-108) — lit la collection error_logs et REGROUPE par empreinte (fingerprint).
 * Chaque groupe : nb d'occurrences, dernière vue, message, source, et un échantillon (pile,
 * utilisateur, url) pour le diagnostic. Réservé super_admin (cf. règles + route /admin/errors).
 */
export const useErrorLogs = (max = 300) => {
    const [groups, setGroups] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'error_logs'), orderBy('at', 'desc'), limit(max));
        const unsub = onSnapshot(q, (snap) => {
            const byFp = new Map();
            snap.forEach((d) => {
                const e = d.data();
                const fp = e.fingerprint || 'unknown';
                const at = e.at?.toMillis?.() || 0;
                if (!byFp.has(fp)) {
                    byFp.set(fp, {
                        fingerprint: fp,
                        message: e.message || '(sans message)',
                        source: e.source || 'inconnu',
                        count: 0,
                        lastSeen: 0,
                        firstSeen: at || Infinity,
                        modes: new Set(),
                        sample: e, // le plus récent (snapshot trié desc → 1er vu = plus récent)
                    });
                }
                const g = byFp.get(fp);
                g.count += 1;
                if (at > g.lastSeen) g.lastSeen = at;
                if (at && at < g.firstSeen) g.firstSeen = at;
                if (e.mode) g.modes.add(e.mode);
            });
            const arr = [...byFp.values()]
                .map((g) => ({ ...g, modes: [...g.modes] }))
                .sort((a, b) => b.lastSeen - a.lastSeen);
            setGroups(arr);
            setTotal(snap.size);
            setLoading(false);
        }, (err) => {
            console.error('useErrorLogs', err);
            setError(err.code === 'permission-denied' ? 'Accès réservé au super-admin.' : err.message);
            setLoading(false);
        });
        return () => unsub();
    }, [max]);

    return { groups, total, loading, error };
};
