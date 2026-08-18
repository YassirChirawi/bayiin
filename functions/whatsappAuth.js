/**
 * WhatsApp Auth — BayIIn / Beya3
 *
 * Handles the OAuth exchange for Meta Embedded Signup (BYON).
 * Exchanges the short-lived token for a long-lived one, fetches
 * the associated WABA ID and Phone Number ID, and saves them to the store.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore("comsaas");

exports.connectWhatsApp = onRequest(
    {
        secrets: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
        cors: true,
        maxInstances: 5
    },
    async (req, res) => {
        // Only accept POST requests
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { storeId, accessToken } = req.body;

        if (!storeId || !accessToken) {
            return res.status(400).json({ error: "Missing storeId or accessToken" });
        }

        // SEC (P0-6): authenticate the caller and verify they own the target store.
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
        if (!idToken) {
            return res.status(401).json({ error: "Unauthorized: missing ID token" });
        }
        let callerUid;
        try {
            callerUid = (await getAuth().verifyIdToken(idToken)).uid;
        } catch (e) {
            return res.status(401).json({ error: "Unauthorized: invalid ID token" });
        }
        const ownerSnap = await db.collection("stores").doc(storeId).get();
        if (!ownerSnap.exists || ownerSnap.data().ownerId !== callerUid) {
            return res.status(403).json({ error: "Forbidden: not the store owner" });
        }

        try {
            // 1. Exchange short-lived token for long-lived token
            // https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
            const tokenExchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${accessToken}`;
            
            const tokenRes = await fetch(tokenExchangeUrl);
            const tokenData = await tokenRes.json();

            if (tokenData.error) {
                console.error("[WhatsApp Auth] Token exchange failed:", tokenData.error);
                return res.status(400).json({ error: tokenData.error.message });
            }

            const longLivedToken = tokenData.access_token;

            // 2. Get the WABA ID and Phone Number ID associated with this token
            // Querying debug_token gives us the granular scopes and IDs
            const debugTokenUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${longLivedToken}&access_token=${longLivedToken}`;
            const debugRes = await fetch(debugTokenUrl);
            const debugData = await debugRes.json();

            if (debugData.error || !debugData.data || !debugData.data.is_valid) {
                console.error("[WhatsApp Auth] Token invalid:", debugData);
                return res.status(400).json({ error: "Invalid access token" });
            }

            // Extract the granular scope specifically for whatsapp_business_management
            const wabaId = debugData.data.granular_scopes?.find(
                s => s.scope === "whatsapp_business_management"
            )?.target_ids?.[0];

            if (!wabaId) {
                console.error("[WhatsApp Auth] No WABA ID found. Did the user select a business account?");
                return res.status(400).json({ error: "Aucun compte WhatsApp Business sélectionné." });
            }

            // 3. Get Phone Number ID
            const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${longLivedToken}`);
            const phoneData = await phoneRes.json();

            if (phoneData.error || !phoneData.data || phoneData.data.length === 0) {
                console.error("[WhatsApp Auth] No phone number found for WABA:", wabaId);
                return res.status(400).json({ error: "Aucun numéro de téléphone lié à ce compte." });
            }

            const phoneNumberId = phoneData.data[0].id; // We take the first connected number
            const displayPhoneNumber = phoneData.data[0].display_phone_number;

            // 4. Subscribe the Webhook to this WABA (optional but recommended)
            // Assuming BayIIn's App ID webhook is configured centrally
            await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${longLivedToken}` }
            });

            // 5. Save to Firestore
            await db.collection("stores").doc(storeId).update({
                whatsappAccessToken: longLivedToken,
                whatsappPhoneNumberId: phoneNumberId,
                whatsappWabaId: wabaId,
                whatsappNumber: displayPhoneNumber,
                whatsappEnabled: true
            });

            console.log(`[WhatsApp Auth] Successfully connected store ${storeId} to WABA ${wabaId}`);

            return res.status(200).json({
                success: true,
                whatsappAccessToken: longLivedToken,
                whatsappPhoneNumberId: phoneNumberId,
                whatsappWabaId: wabaId
            });

        } catch (error) {
            console.error("[WhatsApp Auth] Unexpected error:", error);
            return res.status(500).json({ error: "Erreur serveur lors de la connexion WhatsApp." });
        }
    }
);
