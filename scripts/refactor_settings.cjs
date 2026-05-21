const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

// 1. Remove CatalogSettings and LocationSettings
content = content.replace(/function CatalogSettings[\s\S]*?function LocationSettings[\s\S]*?^export default function Settings/m, 'export default function Settings');

// 2. Add imports for new components
const newImports = `import React, { Suspense, lazy } from 'react';
const CatalogSettings = lazy(() => import('../components/settings/CatalogSettings'));
const LocationSettings = lazy(() => import('../components/settings/LocationSettings'));
const BillingSettings = lazy(() => import('../components/settings/BillingSettings'));
const ActivitySettings = lazy(() => import('../components/settings/ActivitySettings'));
`;
content = content.replace('import ShippingSettings from "./ShippingSettings";', 'import ShippingSettings from "./ShippingSettings";\n' + newImports);

// 3. Replace the 'activity' tab content
const activityStart = content.indexOf('{activeTab === "activity" && (');
const activityEnd = content.indexOf('{activeTab === "shipping" && <ShippingSettings />}');
if (activityStart !== -1 && activityEnd !== -1) {
    const activityChunk = content.substring(activityStart, activityEnd);
    content = content.replace(activityChunk, '{activeTab === "activity" && (<Suspense fallback={<div>Chargement...</div>}><ActivitySettings store={store} t={t} /></Suspense>)}\n\n                ');
}

// 4. Replace the 'billing' tab content
const billingStart = content.indexOf('{activeTab === "billing" && (');
const billingEnd = content.indexOf('{activeTab === "general" && (');
if (billingStart !== -1 && billingEnd !== -1) {
    const billingChunk = content.substring(billingStart, billingEnd);
    content = content.replace(billingChunk, '{activeTab === "billing" && (<Suspense fallback={<div>Chargement...</div>}><BillingSettings store={store} setStore={setStore} t={t} /></Suspense>)}\n\n                ');
}

// 5. Replace 'catalog' and 'locations' calls to use Suspense
content = content.replace('{activeTab === "locations" && <LocationSettings store={store} t={t} />}', '{activeTab === "locations" && <Suspense fallback={<div>Chargement...</div>}><LocationSettings store={store} t={t} /></Suspense>}');
content = content.replace('{activeTab === "catalog" && <CatalogSettings store={store} setStore={setStore} t={t} />}', '{activeTab === "catalog" && <Suspense fallback={<div>Chargement...</div>}><CatalogSettings store={store} setStore={setStore} t={t} /></Suspense>}');

// 6. Remove 'logs' state and useEffect for activity from Settings
content = content.replace(/const \[logs, setLogs\] = useState\(\[\]\);[\s\S]*?\}\, \[activeTab, store\?\.id\]\);/m, '');

fs.writeFileSync('src/pages/Settings.jsx', content);
console.log('Settings.jsx refactored');
