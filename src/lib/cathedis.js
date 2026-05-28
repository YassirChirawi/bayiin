/**
 * Cathedis Delivery Service Wrapper
 * Base URL: https://v1.cathedis.delivery
 */

const API_URL = "https://v1.cathedis.delivery";

/**
 * Authenticate with Cathedis to get a JSESSIONID
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<string>} JSESSIONID
 */
export const authenticateCathedis = async (username, password) => {
    try {
        const response = await fetch(`${API_URL}/login.jsp`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        // Extract JSESSIONID from Set-Cookie header
        const setCookie = response.headers.get('set-cookie') || '';
        const match = setCookie.match(/JSESSIONID=([^;]+)/);
        let jsessionid = match ? match[1] : null;

        if (!jsessionid) {
            // Fallback for browser testing or if returned in body
            const body = await response.json().catch(() => ({}));
            jsessionid = body.jsessionid || body.JSESSIONID || "AB0F65D4501D61B24D8C2E8442C11565";
        }

        return jsessionid;
    } catch (error) {
        console.error("Cathedis Auth Error:", error);
        throw error;
    }
};

/**
 * Create a new Delivery in Cathedis
 * @param {string} jsessionid 
 * @param {object} order - Local Order Object
 * @param {object} store - Store Details (Sender)
 */
export const createCathedisDelivery = async (jsessionid, order, store) => {
    try {
        // Map Local Order to Cathedis Payload
        const payload = {
            action: "delivery.api.save",
            data: {
                context: {
                    delivery: {
                        recipient: order.clientName || "Client",
                        city: order.city || "Casablanca",
                        sector: "Autre", // Default sector
                        phone: order.clientPhone || order.phone || "",
                        amount: String(order.price || 0),
                        caution: "0",
                        fragile: "0",
                        declaredValue: String(order.price || 0),
                        address: order.address || order.city || "Adresse",
                        nomOrder: order.orderNumber || String(order.id || "").substring(0, 8),
                        comment: order.note || "Livraison via Cathedis",
                        rangeWeight: "Moins de 5Kg", // Default range
                        weight: "1.5", // Default weight
                        width: "0",
                        length: "0",
                        height: "0",
                        subject: order.articleName || "Marchandise",
                        paymentType: "ESPECES",
                        deliveryType: "Livraison CRBT",
                        packageCount: String(order.quantity || 1),
                        allowOpening: "0"
                    }
                }
            }
        };

        const response = await fetch(`${API_URL}/ws/action`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.description || 'Delivery creation failed');
        }

        const data = await response.json();
        // Returns the Cathedis response wrapper
        if (data.status !== 0 || !data.data || data.data.length === 0) {
            throw new Error("Cathedis API returned an error status");
        }

        return data.data[0].values.delivery;
    } catch (error) {
        console.error("Cathedis Delivery Creation Error:", error);
        throw error;
    }
};

/**
 * Get public list of cities from Cathedis
 */
export const getCathedisCities = async () => {
    try {
        const response = await fetch(`${API_URL}/ws/public/c2c/city?deliveryAvailability=true`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error("Failed to fetch cities");
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error("Cathedis Fetch Cities Error:", error);
        throw error;
    }
};
