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


/**
 * Alerte l'équipe BayIIn qu'une nouvelle demande de contact est arrivée.
 * Destinataire : SUPPORT_INBOX_EMAIL. Aucun repli : une adresse par défaut qui
 * n'est pas relevée ferait disparaître l'alerte en silence, la demande étant
 * marquée comme notifiée alors que personne ne l'a reçue.
 * @param {string} requestId
 * @param {object} req  Document contact_requests
 */
const CONTACT_TYPE_LABELS = {
    support: 'Support technique',
    devis: 'Demande de devis',
    integration: 'Intégration complète',
    franchise: 'Franchise / Réseau',
};

async function sendContactRequestAlert(requestId, req) {
    if (!req) return false;

    const inbox = (process.env.SUPPORT_INBOX_EMAIL || '').trim();
    if (!inbox) {
        // Retour false délibéré : le doc sera estampillé notifyError et la demande
        // remontera avec un marqueur rouge dans l'AdminDashboard. Mieux vaut un
        // échec visible qu'un envoi vers une boîte inexistante.
        console.error('[Resend] SUPPORT_INBOX_EMAIL non configuré — alerte de contact NON envoyée '
            + `(demande ${requestId}). La demande reste visible dans Admin → Contacts.`);
        return false;
    }
    const label = CONTACT_TYPE_LABELS[req.type] || 'Contact';
    const name = req.name || 'Sans nom';
    const phone = req.phone || '';
    const waLink = phone ? `https://wa.me/${String(phone).replace(/[^0-9]/g, '')}` : null;

    const row = (k, v) => v
        ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;white-space:nowrap">${escapeHtml(k)}</td>
             <td style="padding:6px 0;color:#0f172a;font-weight:600">${escapeHtml(v)}</td></tr>`
        : '';

    const options = Array.isArray(req.integrationOptions) && req.integrationOptions.length
        ? `<p style="margin:16px 0 4px;color:#64748b">Options demandées</p>
           <ul style="margin:0;padding-left:18px;color:#0f172a">
             ${req.integrationOptions.slice(0, 20).map(o => `<li>${escapeHtml(o)}</li>`).join('')}
           </ul>`
        : '';

    const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
            <p style="display:inline-block;margin:0 0 16px;padding:4px 12px;border-radius:999px;
                      background:#eef2ff;color:#4338ca;font-size:12px;font-weight:700;text-transform:uppercase">
                ${escapeHtml(label)}
            </p>
            <h2 style="margin:0 0 4px;color:#0f172a">Nouvelle demande de contact</h2>
            <p style="margin:0 0 20px;color:#64748b">Source : ${escapeHtml(req.source || 'landing')}</p>
            <table style="border-collapse:collapse;font-size:14px">
                ${row('Nom', name)}
                ${row('Téléphone', phone)}
                ${row('Email', req.email)}
                ${row('Société', req.company)}
                ${row('Nb boutiques', req.storeCount)}
                ${row('Budget', req.budget)}
            </table>
            ${req.message ? `<p style="margin:16px 0 4px;color:#64748b">Message</p>
                <p style="margin:0;padding:12px 14px;background:#f8fafc;border-left:3px solid #6366f1;
                          border-radius:6px;color:#0f172a;white-space:pre-wrap">${escapeHtml(req.message)}</p>` : ''}
            ${options}
            ${waLink ? `<p style="margin:24px 0 0">
                <a href="${escapeHtml(waLink)}" style="display:inline-block;padding:10px 18px;background:#25D366;
                   color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Répondre sur WhatsApp</a></p>` : ''}
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
                Réf. ${escapeHtml(requestId)} · Traiter dans Admin → 📬 Contacts
            </p>
        </div>
    `;

    try {
        const { error } = await resend.emails.send({
            from: 'BayIIn Contact <contact@bayiin.shop>',
            to: [inbox],
            replyTo: req.email || undefined,
            subject: `[${label}] ${name}${phone ? ' — ' + phone : ''}`,
            html,
        });

        if (error) {
            console.error('[Resend] Failed to send contact alert:', error);
            return false;
        }
        console.log(`[Resend] Contact alert sent to ${inbox} (request ${requestId})`);
        return true;
    } catch (err) {
        console.error('[Resend] sendContactRequestAlert Error:', err);
        return false;
    }
}

module.exports = {
    sendStockAlert,
    sendInvoiceEmail,
    sendContactRequestAlert
};
