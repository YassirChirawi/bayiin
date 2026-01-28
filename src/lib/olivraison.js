/**
 * O-Livraison Service Wrapper
 * Docs: https://partners.olivraison.com/docs/
 */

const BASE_URL = "https://partners.olivraison.com/api"; // Inferred from docs
// Note: Docs say host is partners.olivraison.com and basePath is /, so API might be at root or /api. 
// Looking at Swagger Init: basePath: "/", host: "partners.olivraison.com". 
// Paths are /auth/login, /package. So URL is https://partners.olivraison.com/auth/login

const API_URL = "https://partners.olivraison.com";

/**
 * Authenticate with O-Livraison to get a Bearer Token
 * @param {string} apiKey 
 * @param {string} secretKey 
 * @returns {Promise<string>} token
 */
export const authenticateOlivraison = async (apiKey, secretKey) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                secretKey: secretKey
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.description || 'Authentication failed');
        }

        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error("O-Livraison Auth Error:", error);
        throw error;
    }
};

/**
 * Create a new Package in O-Livraison
 * @param {string} token 
 * @param {object} order - Local Order Object
 * @param {object} store - Store Details (Sender)
 */
export const createOlivraisonPackage = async (token, order, store) => {
    try {
        // Map Local Order to O-Livraison Payload
        const payload = {
            name: `Order #${order.orderNumber}`,
            price: parseFloat(order.price) * parseInt(order.quantity || 1), // Total Price (COD)
            inventory: false,
            description: `${order.productName} (Qty: ${order.quantity})`,
            comment: order.note || "",
            destination: {
                name: order.clientName,
                phone: order.clientPhone,
                city: order.city,
                streetAddress: order.address || order.city // Fallback if address empty
            },
            pickup_address: {
                company: store.name,
                phone: store.phone,
                city: "Casablanca", // Default or from store.city? Store obj has address string. 
                streetAddress: store.address || "Casablanca",
                email: store.email || "", // Store auth email?
                website: ""
            }
        };

        const response = await fetch(`${API_URL}/package`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.description || 'Package creation failed');
        }

        const data = await response.json();
        // Returns: { status, customer, trackingID }
        return data;
    } catch (error) {
        console.error("O-Livraison Create Error:", error);
        throw error;
    }
};

/**
 * Get List of Cities (Useful for validation or dropdowns)
 */
export const getOlivraisonCities = async (token) => {
    const response = await fetch(`${API_URL}/cities`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch cities");
    return await response.json();
};
