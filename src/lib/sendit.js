import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const API_BASE = "https://app.sendit.ma/api/v1";

let tokenCache = {}; // { publicKey: { token, expiration } }
let cachedDistricts = null;

/**
 * senditService
 * Robust service to interact with Sendit API
 */
const senditService = {
    /**
     * Authenticate and get Bearer Token with caching
     */
    getToken: async (publicKey, secretKey) => {
        if (!publicKey || !secretKey) {
            throw new Error("Sendit API keys are required for authentication.");
        }

        const now = new Date();
        const cached = tokenCache[publicKey];

        if (cached && cached.token && cached.expiration && now < cached.expiration) {
            return cached.token;
        }

        try {
            console.log("Authenticating with Sendit...");
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    public_key: publicKey,
                    secret_key: secretKey
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Auth failed: ${response.status}`);
            }

            let token = data.token || data.access_token || data.data?.token;
            if (!token) {
                throw new Error("Token not found in Sendit response");
            }

            // Set expiration (23 hours)
            tokenCache[publicKey] = {
                token: token,
                expiration: new Date(new Date().getTime() + 23 * 60 * 60 * 1000)
            };

            return token;
        } catch (error) {
            console.error("Sendit Auth Error:", error);
            throw error;
        }
    },

    /**
     * Get ALL districts (Cities) with pagination
     */
    getAllDistricts: async (token) => {
        if (cachedDistricts && cachedDistricts.length > 0) return cachedDistricts;

        try {
            let allDistricts = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(`${API_BASE}/districts?page=${page}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) break;
                const result = await response.json();

                const districts = Array.isArray(result) ? result : (result.data || result.districts || []);

                if (districts.length === 0) {
                    hasMore = false;
                } else {
                    allDistricts = [...allDistricts, ...districts];
                    page++;
                }

                if (page > 100) hasMore = false;
            }

            cachedDistricts = allDistricts.map(d => ({
                id: d.id,
                name: d.name || d.ville || "Inconnu",
                price: parseFloat(d.price || d.tarif || 0),
                delais: d.delais || d.delivery_time || "24h-48h",
                ref: d.ref || d.code || null,
                region: d.region || null
            }));

            return cachedDistricts;
        } catch (error) {
            console.error("Sendit Districts Error:", error);
            throw error;
        }
    },

    /**
     * Create a new package
     */
    createPackage: async (token, order, store) => {
        try {
            // 1. Resolve District ID
            let districtId = order.deliveryValues?.districtId || order.districtId;

            // If not found, try to find by name in the list
            if (!districtId) {
                const districts = await senditService.getAllDistricts(token);
                const cityName = (order.city || order.clientCity || "").toLowerCase().trim();
                const match = districts.find(d => d.name && d.name.toLowerCase().trim() === cityName)
                    || districts.find(d => d.name && d.name.toLowerCase().includes(cityName));
                if (match) districtId = match.id;
            }

            if (!districtId) {
                throw new Error(`La ville "${order.city || order.clientCity}" n'est pas reconnue par Sendit. Veuillez sélectionner une ville valide.`);
            }

            // 2. Resolve Pickup District ID
            let pickupId = store.senditPickupCityId ? parseInt(store.senditPickupCityId) : null;
            if (!pickupId) {
                const districts = await senditService.getAllDistricts(token);
                const casa = districts.find(d => d.name && d.name.toLowerCase().includes("casablanca"));
                pickupId = casa ? casa.id : 1;
            }

            // 3. Prepare Products String
            let productsString = "";
            if (order.items && order.items.length > 0) {
                productsString = order.items.map(item => {
                    let cleanName = (item.article || "ITEM").replace(/[^a-zA-Z0-9]/g, '');
                    if (!cleanName) cleanName = "ITEM";
                    const code = cleanName.substring(0, 10).toUpperCase();
                    return `${code}:${item.quantity || 1}`;
                }).join(';');
            } else {
                let cleanName = (order.articleName || "ITEM").replace(/[^a-zA-Z0-9]/g, '');
                productsString = `${cleanName.substring(0, 10).toUpperCase()}:${order.quantity || 1}`;
            }

            // 4. Construct Payload
            const payload = {
                district_id: parseInt(districtId),
                pickup_district_id: parseInt(pickupId),
                name: order.clientName || order.customer || "Client",
                phone: order.clientPhone || order.phone || "",
                address: order.clientAddress || order.address || order.city || "Adresse inconnue",
                amount: parseFloat(order.price * (order.quantity || 1)) + (parseFloat(order.shippingCost || 0)),
                comment: order.note || order.notes || "",
                reference: order.orderNumber || order.displayId || order.id || "",
                products: productsString,
                allow_try: order.deliveryValues?.allowTry ? 1 : 0,
                allow_open: (order.deliveryValues?.allowOpen !== false) ? 1 : 0,
                option_exchange: order.deliveryValues?.isExchange ? 1 : 0,
            };

            const response = await fetch(`${API_BASE}/deliveries`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                let errorMessage = result.message || `Erreur API (${response.status})`;
                if (result.errors) {
                    const details = Object.entries(result.errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
                    errorMessage = `${errorMessage}\n${details}`;
                }
                throw new Error(errorMessage);
            }

            const data = result.data || result;
            return {
                trackingID: data.code,
                status: data.status || 'PENDING',
                trackingUrl: data.label_url,
                raw: result
            };

        } catch (error) {
            console.error("Sendit Create Package Error:", error);
            throw error;
        }
    },

    /**
     * Get package status
     */
    getPackageStatus: async (token, trackingID) => {
        try {
            const response = await fetch(`${API_BASE}/deliveries/${trackingID}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Impossible de récupérer le statut (${response.status})`);
            }

            return result.data || result;
        } catch (error) {
            console.error("Sendit Get Status Error:", error);
            throw error;
        }
    },

    /**
     * Request a pickup
     */
    requestPickup: async (token, pickupData) => {
        try {
            const payload = {
                district_id: parseInt(pickupData.district_id || 1),
                name: pickupData.name || "Vendeur",
                phone: pickupData.phone || "",
                address: pickupData.address || "",
                note: pickupData.note || "Demande depuis le dashboard",
                deliveries: Array.isArray(pickupData.deliveries) ? pickupData.deliveries.join(',') : (pickupData.deliveries || "")
            };

            const response = await fetch(`${API_BASE}/pickups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Erreur lors de la demande de ramassage (${response.status})`);
            }

            return result;
        } catch (error) {
            console.error("Sendit Pickup Error:", error);
            throw error;
        }
    },

    /**
     * Request a return
     */
    requestReturn: async (token, returnData) => {
        try {
            const payload = {
                district_id: parseInt(returnData.district_id || 1),
                name: returnData.name || "Vendeur",
                phone: returnData.phone || "",
                address: returnData.address || "",
                note: returnData.note || "Retour depuis le dashboard",
                deliveries: Array.isArray(returnData.deliveries) ? returnData.deliveries.join(',') : (returnData.deliveries || "")
            };

            const response = await fetch(`${API_BASE}/returns`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Erreur lors de la demande de retour (${response.status})`);
            }

            return result;
        } catch (error) {
            console.error("Sendit Return Error:", error);
            throw error;
        }
    },

    /**
     * Get PDF labels
     */
    getLabels: async (token, deliveries, printFormat = 1) => {
        try {
            const payload = {
                deliveries: Array.isArray(deliveries) ? deliveries : [deliveries],
                printFormat: parseInt(printFormat)
            };

            const response = await fetch(`${API_BASE}/deliveries/getlabels`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Erreur lors de la récupération des étiquettes");
            }

            return result;
        } catch (error) {
            console.error("Sendit Labels Error:", error);
            throw error;
        }
    }
};

// --- Backward Compatibility Exports ---

export const authenticateSendit = async (publicKey, secretKey) => {
    return await senditService.getToken(publicKey, secretKey);
};

export const getSenditDistricts = async (token) => {
    return await senditService.getAllDistricts(token);
};

export const createSenditPackage = async (token, order, store) => {
    return await senditService.createPackage(token, order, store);
};

export const getPackageStatus = async (token, trackingID) => {
    return await senditService.getPackageStatus(token, trackingID);
};

export const requestSenditPickup = async (token, store, trackingIds, note) => {
    return await senditService.requestPickup(token, {
        district_id: store.senditPickupCityId,
        name: store.senditSenderName || store.name,
        phone: store.senditSenderPhone || store.phone,
        address: store.senditSenderAddress || store.address,
        note: note,
        deliveries: trackingIds
    });
};

export default senditService;
