import { toast } from "react-hot-toast";

const API_BASE = "https://app.sendit.ma/api/v1";

let cachedDistricts = null;
// We can cache token if we want, but since 'authenticateSendit' is called with keys every time in current architecture,
// we rely on the caller or we can implement a simple key-based cache here if needed.
// For now, let's keep authentication explicit as passed by caller, but we'll cache districts.

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
            throw new Error(data.message || "Authentication failed");
        }

        // Handle different response structures
        if (data.token) return data.token;
        if (data.access_token) return data.access_token;
        if (data.data?.token) return data.data.token;

        throw new Error("Token not found in response");
    } catch (error) {
        console.error("Sendit Auth Error:", error);
        throw error;
    }
};

/**
 * Get ALL districts (Cities) with pagination handling
 * @param {string} token 
 * @returns {Promise<Array>} List of districts
 */
export const getSenditDistricts = async (token) => {
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

            // Handle different API response structures
            const districts = Array.isArray(result) ? result : (result.data || result.districts || []);

            if (districts.length === 0) {
                hasMore = false;
            } else {
                allDistricts = [...allDistricts, ...districts];
                page++;
            }

            // Safety break
            if (page > 100) hasMore = false;
        }

        // Map to standard format
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
        const match = districts.find(d => d.name && d.name.toLowerCase().trim() === normalizedCity);
        if (match) return match.id;

        // Partial match
        const partial = districts.find(d => d.name && (d.name.toLowerCase().includes(normalizedCity) || normalizedCity.includes(d.name.toLowerCase())));
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
        // 1. Ensure districts are loaded
        const districts = await getSenditDistricts(token);

        // 2. Resolve Destination District ID
        let districtId = null;
        if (order.deliveryValues?.districtId) {
            districtId = parseInt(order.deliveryValues.districtId);
        } else {
            // Fallback to name search
            districtId = await findSenditDistrictId(token, order.city || order.clientCity);
        }

        if (!districtId) {
            throw new Error(`La ville "${order.city || order.clientCity}" n'est pas reconnue par Sendit. Veuillez sélectionner une ville valide.`);
        }

        // 3. Resolve Pickup District ID
        // Priority: 1. Store Setting -> 2. Auto-detect "Casablanca" -> 3. Fallback ID 1
        let pickupId = store.senditPickupCityId ? parseInt(store.senditPickupCityId) : null;

        if (!pickupId) {
            // Auto-detect Casablanca
            const casa = districts.find(d => d.name && d.name.toLowerCase().includes("casablanca"));
            if (casa) {
                pickupId = casa.id;
                console.log(`✅ Auto-detected Sendit Pickup City: ${casa.name} (ID: ${pickupId})`);
            }
        }

        if (!pickupId) {
            console.warn("⚠️ Pickup city not found. Defaulting to 1 (Casablanca generic).");
            pickupId = 1;
        }

        // 4. Products String Format
        // Format: CODE:QTY;CODE2:QTY
        let productsString = "";
        if (order.items && order.items.length > 0) {
            productsString = order.items.map(item => {
                let cleanName = (item.article || "ITEM").replace(/[^a-zA-Z0-9]/g, '');
                if (!cleanName) cleanName = "ITEM";
                const code = cleanName.substring(0, 10).toUpperCase(); // Truncate/Cleanup
                return `${code}:${item.quantity || 1}`;
            }).join(';');
        } else {
            // Fallback for single product order structure
            // Use articleId or generic name
            let cleanName = (order.articleName || "ITEM").replace(/[^a-zA-Z0-9]/g, '');
            if (!cleanName) cleanName = "ITEM";
            const code = cleanName.substring(0, 10).toUpperCase();
            // const code = order.articleId || 'DEFAULT'; // ArticleId might be UUID, too long? Sendit limits?
            // "CODE" usually short. Let's use clean name.
            productsString = `${code}:${order.quantity || 1}`;
        }

        // 5. Construct Payload
        const payload = {
            district_id: districtId,
            pickup_district_id: pickupId,
            name: order.clientName || "Client",
            phone: order.clientPhone || "",
            address: order.clientAddress || order.address || order.city || "Adresse",
            amount: parseFloat(order.price) * parseInt(order.quantity || 1) + (parseFloat(order.shippingCost || 0)), // Total Amount to Collect
            // Note: If order.price is Unit Price, multiply by Qty. Add shipping if not included. Only if COD.
            // Assuming order.price IS the total to collect if it's a "total" field, but usually it's unit price.
            // Check usage: Orders.jsx: `${... (order.price * order.quantity).toFixed(2)}`
            // So we calculate total.
            // Also add shipping? Usually shipping is added to total.
            comment: order.note || "",
            reference: order.orderNumber || order.id || "",
            products: productsString,
            allow_try: 0,
            allow_open: 1, // Default allow open
            option_exchange: 0
        };

        console.log("Creating Sendit Package Payload:", payload);

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
            console.error("Sendit Create Error:", result);
            let errorMessage = result.message || "Erreur lors de la création du colis Sendit";
            if (result.errors) {
                // Formatting errors object
                const details = Object.entries(result.errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
                errorMessage = `${errorMessage}\n${details}`;
            }
            throw new Error(errorMessage);
        }

        // Result usually: { success: true, code: "DX...", label_url: "..." }
        // Or { data: { code: ... } }
        const trackingCode = result.code || result.data?.code;
        const status = result.status || result.data?.status || 'PENDING';
        const labelUrl = result.label_url || result.data?.label_url;

        return {
            code: trackingCode,
            status: status,
            label_url: labelUrl,
            raw: result
        };

    } catch (error) {
        console.error("Sendit Create Package Error:", error);
        throw error;
    }
};

/**
 * Get Full Package Status
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

        if (!response.ok) {
            throw new Error(data.message || "Impossible de récupérer le statut");
        }

        return data.data || data;
    } catch (error) {
        console.error("Sendit Status Error:", error);
        throw error;
    }
};


/**
 * Request a Pickup (Ramassage)
 * @param {string} token 
 * @param {object} store 
 * @param {Array<string>} trackingIds 
 */
export const requestSenditPickup = async (token, store, trackingIds, note = "Demande dashboard") => {
    try {
        // Resolve Pickup City
        const districts = await getSenditDistricts(token);

        // Priority: 1. Store Setting -> 2. Auto-detect "Casablanca" -> 3. Fallback
        let pickupId = store.senditPickupCityId ? parseInt(store.senditPickupCityId) : null;
        if (!pickupId) {
            const casa = districts.find(d => d.name && d.name.toLowerCase().includes("casablanca"));
            if (casa) pickupId = casa.id;
        }
        if (!pickupId) pickupId = 1;

        const payload = {
            district_id: pickupId,
            name: store.storeName || "Store",
            phone: store.phone || "",
            address: store.address || store.city || "Adresse",
            comment: note,
            deliveries: trackingIds.join(',')
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
            throw new Error(result.message || "Echec de la demande de ramassage");
        }

        return result;
    } catch (error) {
        console.error("Sendit Pickup Error:", error);
        throw error;
    }
};
