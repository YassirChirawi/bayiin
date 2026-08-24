/**
 * carriers.js — création de colis transporteurs CÔTÉ SERVEUR (Sendit / Olivraison / Cathedis).
 *
 * Avant : les appels transporteurs tournaient dans le NAVIGATEUR → (1) bloqués par CORS,
 * (2) secrets (clés API / mot de passe) exposés au client, (3) Cathedis cassé car le navigateur
 * ne peut pas lire l'en-tête Set-Cookie → un JSESSIONID codé en dur était utilisé.
 *
 * Ici, tout se fait en Cloud Function (Node 22, fetch global) : pas de CORS, secrets protégés,
 * et Cathedis lit réellement le cookie de session. Port FIDÈLE des payloads du client
 * (src/lib/sendit|olivraison|cathedis.js) — mêmes endpoints, mêmes champs.
 */

/** Montant COD encaissé par le transporteur (identique à src/lib/codAmount.js). */
function computeCodAmount(order, store) {
    const productTotal = (parseFloat(order && order.price) || 0) * (parseInt(order && order.quantity) || 1);
    if (!store || store.customerPaysShipping !== true) return productTotal;
    const shipping = [order && order.shippingFee, order && order.shippingCost, store.defaultShippingFee]
        .map((v) => parseFloat(v)).find((v) => !isNaN(v)) || 0;
    return productTotal + shipping;
}

const orderCity = (o) => o.clientCity || o.city || '';
const orderAddress = (o) => o.clientAddress || o.address || orderCity(o) || 'Adresse';

// ─────────────────────────── SENDIT ───────────────────────────
const SENDIT_API = 'https://app.sendit.ma/api/v1';
let _senditDistricts = null; // cache mémoire (districts globaux, non liés au store)

async function senditToken(publicKey, secretKey) {
    if (!publicKey || !secretKey) throw new Error('Clés Sendit manquantes.');
    const r = await fetch(`${SENDIT_API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ public_key: publicKey, secret_key: secretKey }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || `Auth Sendit échouée (${r.status})`);
    const token = d.token || d.access_token || (d.data && d.data.token);
    if (!token) throw new Error('Token Sendit introuvable dans la réponse.');
    return token;
}

async function senditDistricts(token) {
    if (_senditDistricts && _senditDistricts.length) return _senditDistricts;
    let all = [], page = 1, more = true;
    while (more && page <= 100) {
        const r = await fetch(`${SENDIT_API}/districts?page=${page}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
        if (!r.ok) break;
        const res = await r.json();
        const list = Array.isArray(res) ? res : (res.data || res.districts || []);
        if (!list.length) { more = false; } else { all = all.concat(list); page++; }
    }
    _senditDistricts = all.map((x) => ({
        id: x.id,
        name: x.name || x.ville || '',
        price: parseFloat(x.price || x.tarif || 0),
        delais: x.delais || x.delivery_time || '24h-48h',
        ref: x.ref || x.code || null,
        region: x.region || null,
    }));
    return _senditDistricts;
}

/** Liste des villes/districts Sendit (à partir des secrets) — pour la config d'expédition. */
async function senditDistrictsFull(secrets) {
    const token = await senditToken(secrets.senditPublicKey, secrets.senditSecretKey);
    return senditDistricts(token);
}

/** Demande de ramassage Sendit (pickup) pour une liste de colis. */
async function senditPickup(secrets, store, trackingIds, note) {
    const token = await senditToken(secrets.senditPublicKey, secrets.senditSecretKey);
    const payload = {
        district_id: parseInt(store.senditPickupCityId || 1),
        name: store.senditSenderName || store.name || 'Vendeur',
        phone: store.senditSenderPhone || store.phone || '',
        address: store.senditSenderAddress || store.address || '',
        note: note || 'Demande depuis le dashboard',
        deliveries: Array.isArray(trackingIds) ? trackingIds.join(',') : (trackingIds || ''),
    };
    const r = await fetch(`${SENDIT_API}/pickups`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(res.message || `Demande de ramassage échouée (${r.status}).`);
    return res;
}

async function senditCreate(order, store, secrets) {
    const token = await senditToken(secrets.senditPublicKey, secrets.senditSecretKey);

    let districtId = (order.deliveryValues && order.deliveryValues.districtId) || order.districtId;
    if (!districtId) {
        const districts = await senditDistricts(token);
        const city = orderCity(order).toLowerCase().trim();
        const m = districts.find((d) => d.name && d.name.toLowerCase().trim() === city)
            || districts.find((d) => d.name && d.name.toLowerCase().includes(city));
        if (m) districtId = m.id;
    }
    if (!districtId) throw new Error(`Ville « ${orderCity(order)} » non reconnue par Sendit.`);

    let pickupId = store.senditPickupCityId ? parseInt(store.senditPickupCityId) : null;
    if (!pickupId) {
        const districts = await senditDistricts(token);
        const casa = districts.find((d) => d.name && d.name.toLowerCase().includes('casablanca'));
        pickupId = casa ? casa.id : 1;
    }

    let products;
    const clean = (s) => (s || 'ITEM').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase() || 'ITEM';
    if (Array.isArray(order.products) && order.products.length) {
        products = order.products.map((it) => `${clean(it.name)}:${it.quantity || 1}`).join(';');
    } else {
        products = `${clean(order.articleName)}:${order.quantity || 1}`;
    }

    const payload = {
        district_id: parseInt(districtId),
        pickup_district_id: parseInt(pickupId),
        name: order.clientName || 'Client',
        phone: order.clientPhone || '',
        address: orderAddress(order),
        amount: computeCodAmount(order, store),
        comment: order.note || order.notes || '',
        reference: order.orderNumber || order.id || '',
        products,
        allow_try: (order.deliveryValues && order.deliveryValues.allowTry) ? 1 : 0,
        allow_open: (order.deliveryValues && order.deliveryValues.allowOpen === false) ? 0 : 1,
        option_exchange: (order.deliveryValues && order.deliveryValues.isExchange) ? 1 : 0,
    };
    const r = await fetch(`${SENDIT_API}/deliveries`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(res.message || `Erreur Sendit (${r.status})`);
    const data = res.data || res;
    return { trackingId: data.code || 'PENDING', carrierStatus: data.status || 'PENDING', labelUrl: data.label_url || '' };
}

// ─────────────────────────── OLIVRAISON ───────────────────────────
const OLI_API = 'https://partners.olivraison.com';

async function oliCreate(order, store, secrets) {
    if (!secrets.olivraisonApiKey || !secrets.olivraisonSecretKey) throw new Error('Clés O-Livraison manquantes.');
    const ra = await fetch(`${OLI_API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: secrets.olivraisonApiKey, secretKey: secrets.olivraisonSecretKey }),
    });
    const ad = await ra.json().catch(() => ({}));
    if (!ra.ok) throw new Error(ad.description || 'Auth O-Livraison échouée.');
    const token = ad.token;

    const payload = {
        name: `Order #${order.orderNumber || order.id}`,
        price: computeCodAmount(order, store),
        inventory: false,
        description: `${order.productName || order.articleName || ''} (Qty: ${order.quantity || 1})`,
        comment: order.note || '',
        destination: { name: order.clientName, phone: order.clientPhone, city: orderCity(order), streetAddress: orderAddress(order) },
        pickup_address: { company: store.name, phone: store.phone, city: store.city || 'Casablanca', streetAddress: store.address || 'Casablanca', email: store.email || '', website: '' },
    };
    const r = await fetch(`${OLI_API}/package`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(res.description || 'Création O-Livraison échouée.');
    return { trackingId: res.trackingID || 'PENDING', carrierStatus: res.status || 'CREATED', labelUrl: '' };
}

// ─────────────────────────── CATHEDIS ───────────────────────────
const CATHEDIS_API = 'https://v1.cathedis.delivery';

async function cathedisSession(username, password) {
    if (!username || !password) throw new Error('Identifiants Cathedis manquants.');
    const r = await fetch(`${CATHEDIS_API}/login.jsp`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!r.ok) throw new Error(`Auth Cathedis échouée (${r.status}).`);
    // Node/undici PEUT lire Set-Cookie (contrairement au navigateur) → plus de session codée en dur.
    let jsessionid = null;
    const setCookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    for (const c of setCookies) {
        const m = c.match(/JSESSIONID=([^;]+)/);
        if (m) { jsessionid = m[1]; break; }
    }
    if (!jsessionid) {
        const body = await r.json().catch(() => ({}));
        jsessionid = body.jsessionid || body.JSESSIONID || null;
    }
    if (!jsessionid) throw new Error('Cathedis : session (JSESSIONID) introuvable — vérifiez les identifiants.');
    return jsessionid;
}

async function cathedisCreate(order, store, secrets) {
    const jsessionid = await cathedisSession(secrets.cathedisUsername, secrets.cathedisPassword);
    const payload = {
        action: 'delivery.api.save',
        data: { context: { delivery: {
            recipient: order.clientName || 'Client',
            city: orderCity(order) || 'Casablanca',
            sector: 'Autre',
            phone: order.clientPhone || '',
            amount: String(computeCodAmount(order, store)),
            caution: '0', fragile: '0',
            declaredValue: String((parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1)),
            address: orderAddress(order),
            nomOrder: order.orderNumber || String(order.id || '').substring(0, 8),
            comment: order.note || 'Livraison via Cathedis',
            rangeWeight: 'Moins de 5Kg', weight: '1.5', width: '0', length: '0', height: '0',
            subject: order.articleName || 'Marchandise',
            paymentType: 'ESPECES', deliveryType: 'Livraison CRBT',
            packageCount: String(order.quantity || 1), allowOpening: '0',
        } } },
    };
    const r = await fetch(`${CATHEDIS_API}/ws/action`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Cookie: `JSESSIONID=${jsessionid}` },
        body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(res.description || `Erreur Cathedis (${r.status}).`);
    if (res.status !== 0 || !res.data || !res.data.length) throw new Error('Cathedis a renvoyé une erreur.');
    const delivery = res.data[0].values.delivery;
    return { trackingId: (delivery && (delivery.trackingId || delivery.code || delivery.id)) || 'PENDING', carrierStatus: 'CREATED', labelUrl: '' };
}

/** Statut de suivi d'un colis Sendit (lecture serveur — évite CORS + secrets exposés). */
async function senditTracking(secrets, trackingId) {
    const token = await senditToken(secrets.senditPublicKey, secrets.senditSecretKey);
    const r = await fetch(`${SENDIT_API}/deliveries/${trackingId}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(res.message || `Statut indisponible (${r.status}).`);
    return res.data || res;
}

/** Factures / remises Sendit (base de la réconciliation cash COD). options: {page,startDate,endDate,querystring}. */
async function senditInvoices(secrets, options = {}) {
    const token = await senditToken(secrets.senditPublicKey, secrets.senditSecretKey);
    const p = new URLSearchParams();
    if (options.page) p.append('page', options.page);
    if (options.startDate) p.append('startDate', options.startDate);
    if (options.endDate) p.append('endDate', options.endDate);
    if (options.querystring) p.append('querystring', options.querystring);
    const qs = p.toString();
    const r = await fetch(`${SENDIT_API}/invoices${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(res.message || `Factures indisponibles (${r.status}).`);
    return res.data || res;
}

/** Dispatcher : crée le colis chez le bon transporteur, renvoie { trackingId, carrierStatus, labelUrl }. */
async function createDelivery(carrier, order, store, secrets) {
    switch (carrier) {
        case 'sendit': return senditCreate(order, store, secrets);
        case 'olivraison': return oliCreate(order, store, secrets);
        case 'cathedis': return cathedisCreate(order, store, secrets);
        default: throw new Error(`Transporteur inconnu : ${carrier}`);
    }
}

module.exports = { createDelivery, senditTracking, senditInvoices, senditDistrictsFull, senditPickup, computeCodAmount };
