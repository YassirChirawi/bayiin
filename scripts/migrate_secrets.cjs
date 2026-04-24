const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({
    projectId: 'commerce-saas-62f32'
});

const db = getFirestore('comsaas');

async function migrateSecrets() {
    console.log("Starting secrets migration...");
    const storesSnap = await db.collection('stores').get();
    
    let migratedCount = 0;

    for (const storeDoc of storesSnap.docs) {
        const data = storeDoc.data();
        const storeId = storeDoc.id;
        
        const secrets = {};
        const keysToMigrate = [
            'olivraisonApiKey', 'olivraisonSecretKey',
            'senditPublicKey', 'senditSecretKey',
            'wooConsumerKey', 'wooConsumerSecret', 'wooWebhookSecret'
        ];

        keysToMigrate.forEach(k => {
            if (data[k]) secrets[k] = data[k];
        });

        if (Object.keys(secrets).length > 0) {
            console.log(`Migrating secrets for store: ${storeId}`);
            
            // 1. Create/Update secrets document in sub-collection
            await db.collection('stores').doc(storeId).collection('private').doc('config').set(secrets, { merge: true });

            // 2. Remove sensitive keys from main document
            const fieldsToRemove = {};
            Object.keys(secrets).forEach(k => {
                fieldsToRemove[k] = admin.firestore.FieldValue.delete();
            });
            await storeDoc.ref.update(fieldsToRemove);
            
            migratedCount++;
        }
    }

    console.log(`Migration complete. ${migratedCount} stores updated.`);
}

migrateSecrets().catch(console.error);
