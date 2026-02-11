import { toast } from "react-hot-toast";

const API_BASE = "https://app.sendit.ma/api/v1";

/**
 * Authenticate with Sendit to get a Bearer Token
 * @param {string} publicKey 
 * @param {string} secretKey 
 * @returns {Promise<string>} token
 */
export const authenticateSendit = async (publicKey, secretKey) => {
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_key: publicKey,
                secret_key: secretKey
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Authentication failed");
        }

        return data.token;
    } catch (error) {
        console.error("Sendit Auth Error:", error);
        throw error;
    }
};

/**
 * Get List of Districts (Cities)
 * @param {string} token 
 * @returns {Promise<Array>} List of districts
 */
export const getSenditDistricts = async (token) => {
    try {
        const response = await fetch(`${API_BASE}/districts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // API returns array directly or { success: true, data: [...] }? 
        // Guide implies array: [{"id": 1, ...}]
        // But let's handle both just in case based on common patterns, 
        // though guide shows array.
        if (Array.isArray(data)) return data;
        if (data.data && Array.isArray(data.data)) return data.data;

        return [];
    } catch (error) {
        console.error("Sendit Districts Error:", error);
        throw error;
    }
};

/**
 * Find District ID by Name
 * @param {string} token 
 * @param {string} cityName 
 */
export const findSenditDistrictId = async (token, cityName) => {
    if (!cityName) return null;
    try {
        const districts = await getSenditDistricts(token);
        const normalizedCity = cityName.toLowerCase().trim();

        // Exact match first
        const match = districts.find(d => d.name.toLowerCase().trim() === normalizedCity);
        if (match) return match.id;

        // Partial match
        const partial = districts.find(d => d.name.toLowerCase().includes(normalizedCity) || normalizedCity.includes(d.name.toLowerCase()));
        if (partial) return partial.id;

        return null;
    } catch (error) {
        console.error("Error finding district:", error);
        return null;
    }
};

/**
 * Create a new Package in Sendit
 * @param {string} token 
 * @param {object} order - Local Order Object
 * @param {object} store - Store Details (Sender)
 */
export const createSenditPackage = async (token, order, store) => {
    try {
        // 1. Resolve Cities
        const districts = await getSenditDistricts(token);

        const findId = (name) => {
            if (!name) return null;
            const norm = name.toLowerCase().trim();
            const d = districts.find(d => d.name.toLowerCase().trim() === norm);
            return d ? d.id : null;
        };

        const destinationId = findId(order.city || order.clientCity);

        // Determine Pickup ID
        // Priority: 1. Manually selected in Settings (senditPickupCityId)
        //           2. Store City Name match
        //           3. Default to 1 (Casablanca)
        let pickupId = store.senditPickupCityId ? parseInt(store.senditPickupCityId) : null;

        if (!pickupId) {
            pickupId = findId(store.city) || 1;
        }

        if (!destinationId) {
            throw new Error(`Ville non reconnue par Sendit: ${order.city}`);
        }

        // 2. Format Products
        // Format: CODE:QTY;CODE2:QTY
        // If order has multiple items (assuming order.items array exists), valid.
        // If simple order (articleId), use valid product code or fallback.
        let productsString = "";
        if (order.items && order.items.length > 0) {
            productsString = order.items.map(i => `${i.id || 'PROD'}:${i.quantity || 1}`).join(';');
        } else {
            // Fallback for single product order structure
            const code = order.articleId || 'DEFAULT';
            const qty = order.quantity || 1;
            productsString = `${code}:${qty}`;
        }

        const payload = {
            district_id: destinationId,
            pickup_district_id: pickupId,
            name: order.clientName,
            phone: order.clientPhone,
            address: order.address || order.city, // Fallback
            amount: parseFloat(order.price) * parseInt(order.quantity || 1), // Total COD
            comment: order.note || "",
            reference: order.orderNumber || order.id,
            products: productsString,
            allow_try: 0, // Configurable? Default 0
            allow_open: 1, // Default 1 (Open allowed)
            option_exchange: 0
        };

        const response = await fetch(`${API_BASE}/deliveries`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Echec de création du colis Sendit");
        }

        return data; // { success, code, status, label_url }
    } catch (error) {
        console.error("Sendit Create Error:", error);
        throw error;
    }
};

/**
 * Request a Pickup (Ramassage)
 * @param {string} token 
 * @param {object} store 
 * @param {Array<string>} trackingIds 
 */
export const requestSenditPickup = async (token, store, trackingIds, note = "Demande automatique") => {
    try {
        const districtId = store.senditPickupCityId ? parseInt(store.senditPickupCityId) : (await findSenditDistrictId(token, store.city) || 1);

        const payload = {
            district_id: districtId,
            name: store.storeName || "My Store",
            phone: store.phone,
            address: store.address || store.city,
            note: note,
            deliveries: trackingIds.join(',')
        };

        const response = await fetch(`${API_BASE}/pickups`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Echec de la demande de ramassage");
        }

        return data; // { success, message, ... }
    } catch (error) {
        console.error("Sendit Pickup Error:", error);
        throw error;
    }
};

/**
 * Get Full Package Status (including history/audits)
 * @param {string} token 
 * @param {string} trackingId 
 */
export const getPackageStatus = async (token, trackingId) => {
    try {
        const response = await fetch(`${API_BASE}/deliveries/${trackingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // API might return { success: true, data: { ... } } or just { ... }
        if (!response.ok) {
            throw new Error(data.message || "Impossible de récupérer le statut");
        }

        return data.data || data;
    } catch (error) {
        console.error("Sendit Status Error:", error);
        throw error;
    }
};
