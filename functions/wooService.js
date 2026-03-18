const crypto = require('crypto');

/**
 * Service to interact with WooCommerce REST API
 */
class WooService {
    constructor(url, consumerKey, consumerSecret, webhookSecret) {
        this.url = url.endsWith('/') ? url.slice(0, -1) : url;
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.webhookSecret = webhookSecret;
    }

    /**
     * Verify WooCommerce Webhook Signature
     */
    verifySignature(body, signature) {
        if (!this.webhookSecret || !signature) return false;
        
        const hash = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(body, 'utf8')
            .digest('base64');
            
        return hash === signature;
    }

    /**
     * Update product stock in WooCommerce
     * @param {string} sku Product SKU
     * @param {number} stock New stock quantity
     */
    async updateStock(sku, stock) {
        if (!sku) return null;

        try {
            // First, find product ID by SKU
            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            const findResponse = await fetch(`${this.url}/wp-json/wc/v3/products?sku=${sku}`, {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            });

            if (!findResponse.ok) {
                throw new Error(`Failed to find product by SKU: ${findResponse.statusText}`);
            }

            const products = await findResponse.json();
            if (products.length === 0) {
                console.log(`WooCommerce: Product with SKU ${sku} not found.`);
                return null;
            }

            const productId = products[0].id;

            // Update product stock
            const updateResponse = await fetch(`${this.url}/wp-json/wc/v3/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    manage_stock: true,
                    stock_quantity: stock
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`Failed to update stock: ${updateResponse.statusText}`);
            }

            return await updateResponse.json();
        } catch (error) {
            console.error(`WooCommerce Sync Error (SKU: ${sku}):`, error);
            throw error;
        }
    }
}

module.exports = WooService;
