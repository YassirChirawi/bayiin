const { Resend } = require('resend');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore('comsaas');

// Escape values interpolated into email HTML to prevent HTML/script injection via
// customer- or product-controlled fields (names, SKUs, etc.).
const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Note: Ensure RESEND_API_KEY is set in Firebase functions config or environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

/**
 * Send Stock Alert Email to Store Owner
 * @param {string} storeId
 * @param {object} product
 */
async function sendStockAlert(storeId, product) {
    if (!product) return;

    try {
        const storeDoc = await db.collection('stores').doc(storeId).get();
        if (!storeDoc.exists) return;
        const store = storeDoc.data();

        const ownerEmail = store.email || store.contactEmail;
        if (!ownerEmail) {
            console.warn(`[Resend] No email found for store ${storeId}`);
            return;
        }

        const subject = `⚠️ Alerte Stock Critique : ${product.name}`;
        const html = `
            <h2>Alerte de Stock</h2>
            <p>Bonjour,</p>
            <p>Le produit suivant a atteint un niveau de stock critique :</p>
            <ul>
                <li><strong>Produit :</strong> ${escapeHtml(product.name)}</li>
                <li><strong>SKU :</strong> ${escapeHtml(product.sku || 'N/A')}</li>
                <li><strong>Stock actuel :</strong> <span style="color: red;">${escapeHtml(product.stock)}</span></li>
            </ul>
            <p>Veuillez vous réapprovisionner au plus vite pour éviter des ruptures.</p>
            <br/>
            <p><em>Système d'alerte BayIIn</em></p>
        `;

        const { data, error } = await resend.emails.send({
            from: 'BayIIn Alerts <alerts@bayiin.shop>',
            to: [ownerEmail],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('[Resend] Failed to send stock alert:', error);
            return false;
        }

        console.log(`[Resend] Stock alert sent to ${ownerEmail} for product ${product.name}`);
        return true;
    } catch (err) {
        console.error('[Resend] sendStockAlert Error:', err);
        return false;
    }
}

/**
 * Send Invoice Email to Client
 * @param {string} clientEmail
 * @param {object} order
 * @param {object} store
 */
async function sendInvoiceEmail(clientEmail, order, store) {
    if (!clientEmail || !order) return;

    try {
        const storeName = store?.name || "Votre Boutique";
        const subject = `Facture pour votre commande #${order.orderNumber}`;
        
        let productsHtml = '';
        if (Array.isArray(order.products)) {
            order.products.forEach(p => {
                productsHtml += `<li>${escapeHtml(p.quantity)}x ${escapeHtml(p.name)} - ${escapeHtml(p.price)} DH</li>`;
            });
        } else {
            productsHtml = `<li>${escapeHtml(order.quantity || 1)}x ${escapeHtml(order.articleName)} - ${escapeHtml(order.price)} DH</li>`;
        }

        const totalAmount = Array.isArray(order.products) 
            ? order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
            : (order.price * (order.quantity || 1));

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2>Merci pour votre commande chez ${escapeHtml(storeName)} !</h2>
                <p>Bonjour ${escapeHtml(order.clientName || 'Client')},</p>
                <p>Voici le récapitulatif de votre commande <strong>#${escapeHtml(order.orderNumber)}</strong> :</p>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px;">
                    <ul style="list-style: none; padding-left: 0;">
                        ${productsHtml}
                    </ul>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb;" />
                    <h3>Total : ${totalAmount} DH</h3>
                </div>

                <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                <p>À très bientôt !</p>
                <br/>
                <p><em>L'équipe ${escapeHtml(storeName)}</em></p>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: `${storeName} <orders@bayiin.shop>`,
            to: [clientEmail],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error(`[Resend] Failed to send invoice to ${clientEmail}:`, error);
            return false;
        }

        console.log(`[Resend] Invoice sent to ${clientEmail} for order #${order.orderNumber}`);
        return true;
    } catch (err) {
        console.error('[Resend] sendInvoiceEmail Error:', err);
        return false;
    }
}

module.exports = {
    sendStockAlert,
    sendInvoiceEmail
};
