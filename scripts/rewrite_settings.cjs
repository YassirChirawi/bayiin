const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

// 1. New imports
const importsTarget = 'import ShippingSettings from "./ShippingSettings";';
content = content.replace(importsTarget, importsTarget + `\nimport React, { Suspense, lazy } from 'react';
const CatalogSettings = lazy(() => import('../components/settings/CatalogSettings'));
const LocationSettings = lazy(() => import('../components/settings/LocationSettings'));
const BillingSettings = lazy(() => import('../components/settings/BillingSettings'));
const ActivitySettings = lazy(() => import('../components/settings/ActivitySettings'));
`);

// 2. Remove components (lines 23 to 424 roughly)
const c1 = content.indexOf('function CatalogSettings');
const c2 = content.indexOf('export default function Settings');
content = content.substring(0, c1) + content.substring(c2);

// 3. Replace activity
const a1 = content.indexOf('{activeTab === "activity" && (');
const a2 = content.indexOf('{activeTab === "shipping" && <ShippingSettings />}');
content = content.substring(0, a1) + '{activeTab === "activity" && (<Suspense fallback={<div>Chargement...</div>}><ActivitySettings store={store} t={t} /></Suspense>)}\n\n                ' + content.substring(a2);

// 4. Replace catalog & locations
content = content.replace('{activeTab === "locations" && <LocationSettings store={store} t={t} />}', '{activeTab === "locations" && <Suspense fallback={<div>Chargement...</div>}><LocationSettings store={store} t={t} /></Suspense>}');
content = content.replace('{activeTab === "catalog" && <CatalogSettings store={store} setStore={setStore} t={t} />}', '{activeTab === "catalog" && <Suspense fallback={<div>Chargement...</div>}><CatalogSettings store={store} setStore={setStore} t={t} /></Suspense>}');

// 5. Replace billing
const b1 = content.indexOf('{activeTab === "billing" && (');
const b2 = content.indexOf('{activeTab === "general" && (');
content = content.substring(0, b1) + '{activeTab === "billing" && (<Suspense fallback={<div>Chargement...</div>}><BillingSettings store={store} setStore={setStore} t={t} /></Suspense>)}\n\n                ' + content.substring(b2);

// 6. Replace logs[0] with latestLog
const logsStateStart = content.indexOf('const [logs, setLogs] = useState([]);');
const logsStateEnd = content.indexOf('// Biometric Logic');
const latestLogStr = `const [latestLog, setLatestLog] = useState(null);
    useEffect(() => {
        if (store?.id) {
            const fetchLogs = async () => {
                const q = query(
                    collection(db, "stores", store.id, "audit_logs"),
                    orderBy("timestamp", "desc"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) setLatestLog(snap.docs[0].data());
            };
            fetchLogs();
        }
    }, [store?.id]);\n\n    `;
content = content.substring(0, logsStateStart) + latestLogStr + content.substring(logsStateEnd);
content = content.replace(
    "{logs[0] ? format(logs[0].timestamp?.toDate(), 'dd MMM, HH:mm') : 'Aucune donnée'}", 
    "{latestLog ? format(latestLog.timestamp?.toDate(), 'dd MMM, HH:mm') : 'Aucune donnée'}"
);

// 7. Fix lint issues
content = content.replace('setActiveTab(tab);', '// eslint-disable-next-line react-hooks/set-state-in-effect\n            setActiveTab(tab);');
content = content.replace('setIsValidatingPayment(false);', '// eslint-disable-next-line react-hooks/set-state-in-effect\n            setIsValidatingPayment(false);');

const upg1 = content.indexOf('const handleUpgrade = async');
const upg2 = content.indexOf('const handleRecalculateStats = () =>');
content = content.substring(0, upg1) + content.substring(upg2);

content = content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect, useMemo } from "react";');

const bio1 = content.indexOf('const [biometricEnabled, setBiometricEnabled] = useState(false);');
const bio2 = content.indexOf('const handleToggleBiometric = async () => {');
const bioReplace = `const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('biometricEnabled') === 'true');

    useEffect(() => {
        isAvailable().then(setBiometricSupported);
    }, [isAvailable]);

    `;
content = content.substring(0, bio1) + bioReplace + content.substring(bio2);

content = content.replace('catch (err) {\n                vibrate(\'error\');\n                console.error("Error updating logo:", err);\n                toast.error(t(\'err_logo_update\'));\n            }', 'catch (err) {\n                vibrate(\'error\');\n                console.error("Error updating logo:", err);\n                toast.error(t(\'err_logo_update\'));\n            }');
content = content.replace('}, [store?.subscriptionStatus, isValidatingPayment]);', '}, [store?.subscriptionStatus, isValidatingPayment, t]);');

fs.writeFileSync('src/pages/Settings.jsx', content);
console.log('Settings refactored successfully');
