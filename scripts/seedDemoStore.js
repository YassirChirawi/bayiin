/**
 * Script de peuplement (seeding) pour un store BayIIn.
 * 
 * Génère des données réalistes pour le marché marocain :
 * - 5 Produits (Tech, Mode, Beauté)
 * - 10 Clients (Villes marocaines, numéros 06...)
 * - 20 Commandes (Réparties sur 30 jours, statuts variés)
 * - 5 Dépenses (Ads, Packaging)
 * 
 * Usage: node scripts/seedDemoStore.js <storeId>
 */

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

dotenv.config();

const storeId = process.argv[2];

if (!storeId) {
    console.error('❌ Erreur: StoreID manquant.');
    console.log('Usage: node scripts/seedDemoStore.js <storeId>');
    process.exit(1);
}

// Configuration du SDK Admin
const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
let adminConfig = {};

if (existsSync(serviceAccountPath)) {
    console.log('📂 Utilisation du fichier serviceAccountKey.json...');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    adminConfig = {
        credential: admin.credential.cert(serviceAccount)
    };
} else {
    console.log('🌐 Utilisation des informations par défaut (ENV)...');
    adminConfig = {
        credential: admin.credential.applicationDefault()
    };
}

try {
    admin.initializeApp(adminConfig);
} catch (error) {
    if (error.code !== 'app/duplicate-app') {
        console.error('❌ Erreur initialisation Firebase Admin:', error);
        process.exit(1);
    }
}

const db = getFirestore('comsaas');

// --- MOCK DATA GENERATION HELPERS ---

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const MOCK_PRODUCTS = [
    { name: "Montre Classique Homme", category: "Accessoires" },
    { name: "Sac à Main Luxe", category: "Mode" },
    { name: "Chargeur Ultra Rapide 65W", category: "Tech" },
    { name: "Parfum Oud Oriental", category: "Beauté" },
    { name: "T-Shirt Coton Bio", category: "Vêtements" }
];

const MOCK_CUSTOMERS = [
    { name: "Amine El Amrani", city: "Casablanca" },
    { name: "Khadija Mansouri", city: "Rabat" },
    { name: "Yassine Bencheikh", city: "Marrakech" },
    { name: "Salma Tazi", city: "Fès" },
    { name: "Mohamed Alami", city: "Tanger" },
    { name: "Fatima Zahra", city: "Casablanca" },
    { name: "Omar Bennani", city: "Rabat" },
    { name: "Leila Haddad", city: "Marrakech" },
    { name: "Zineb Sekkat", city: "Fès" },
    { name: "Soufiane Belhaj", city: "Tanger" }
];

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Oujda", "Kénitra"];
const STATUSES = ['livré', 'livré', 'livré', 'livré', 'livré', 'livré', 'retourné', 'expédié', 'confirmation', 'reçu'];

async function seed() {
    try {
        console.log(`\n🌱 Début du seeding pour le store: ${storeId}`);
        const batch = db.batch();

        // 1. GENERATE PRODUCTS
        console.log('📦 Génération des produits...');
        const productIds = [];
        const productsMap = [];

        for (const p of MOCK_PRODUCTS) {
            const ref = db.collection('products').doc();
            const price = getRandomInt(150, 600);
            const cost = getRandomInt(50, 150);
            const stock = getRandomInt(20, 100);
            
            const productData = {
                storeId,
                name: p.name,
                category: p.category,
                basePrice: price,
                costPrice: cost,
                stock: stock,
                sku: `SKU-${getRandomInt(1000, 9999)}`,
                createdAt: FieldValue.serverTimestamp(),
                active: true
            };
            
            batch.set(ref, productData);
            productIds.push(ref.id);
            productsMap.push({ id: ref.id, ...productData });
        }

        // 2. GENERATE CUSTOMERS
        console.log('👥 Génération des clients...');
        const customerIds = [];
        const customersMap = [];

        for (const c of MOCK_CUSTOMERS) {
            const ref = db.collection('customers').doc();
            const phone = `06${getRandomInt(10000000, 99999999)}`;
            
            const customerData = {
                storeId,
                name: c.name,
                phone: phone,
                city: c.city,
                address: `Quartier ${getRandom(['Maarif', 'Agdal', 'Gueliz', 'Ville Nouvelle', 'Marchane'])}, Rue ${getRandomInt(1, 100)}`,
                orderCount: 0,
                totalSpent: 0,
                createdAt: FieldValue.serverTimestamp()
            };
            
            batch.set(ref, customerData);
            customerIds.push(ref.id);
            customersMap.push({ id: ref.id, ...customerData });
        }

        // 3. GENERATE ORDERS (20)
        console.log('🛒 Génération des commandes...');
        const now = new Date();

        for (let i = 0; i < 20; i++) {
            const ref = db.collection('orders').doc();
            const customer = getRandom(customersMap);
            const product = getRandom(productsMap);
            const status = getRandom(STATUSES);
            const qty = getRandomInt(1, 2);
            const price = product.basePrice * qty;
            const isPaid = status === 'livré';

            // Random date in the last 30 days
            const orderDate = new Date(now.getTime() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000);
            const dateStr = orderDate.toISOString().split('T')[0];

            const orderData = {
                storeId,
                orderNumber: `CMD-${1000 + i}`,
                customerId: customer.id,
                clientName: customer.name,
                clientPhone: customer.phone,
                clientCity: customer.city,
                clientAddress: customer.address,
                articleId: product.id,
                articleName: product.name,
                quantity: qty,
                price: price,
                costPrice: product.costPrice,
                status: status,
                isPaid: isPaid,
                date: dateStr,
                createdAt: FieldValue.serverTimestamp(),
                source: getRandom(['public_catalog', 'WhatsApp', 'Phone']),
                paymentMethod: 'cod'
            };

            batch.set(ref, orderData);

            // Update customer stats locally for summary (or we could use increment in batch)
            if (status === 'livré') {
                customer.totalSpent += price;
            }
            customer.orderCount += 1;
        }

        // 4. GENERATE EXPENSES (5)
        console.log('💸 Génération des dépenses...');
        const expenseCategories = ['Ads', 'Packaging', 'Software', 'Other'];
        
        for (let i = 0; i < 5; i++) {
            const ref = db.collection('expenses').doc();
            const category = getRandom(['Ads', 'Ads', 'Packaging', 'Other']);
            const amount = category === 'Ads' ? getRandomInt(500, 2000) : getRandomInt(50, 300);
            
            batch.set(ref, {
                storeId,
                description: category === 'Ads' ? `Facebook Ads Launch ${i+1}` : `Pack ${getRandomInt(100, 500)} boxes`,
                amount: amount,
                category: category.toLowerCase(),
                date: new Date(now.getTime() - getRandomInt(0, 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                createdAt: FieldValue.serverTimestamp()
            });
        }

        // 5. COMMIT BATCH
        await batch.commit();

        // 6. SYNC CUSTOMER STATS (Separate step as we can't easily read in the same batch)
        console.log('🔄 Mise à jour des compteurs clients...');
        const customerBatch = db.batch();
        for (const c of customersMap) {
            customerBatch.update(db.collection('customers').doc(c.id), {
                totalSpent: c.totalSpent,
                orderCount: c.orderCount
            });
        }
        await customerBatch.commit();

        console.log('\n✅ Seeding terminé avec succès !');
        console.log('===================================');
        console.log(`Produits créés :  5`);
        console.log(`Clients créés :   10`);
        console.log(`Commandes créées: 20`);
        console.log(`Dépenses créées: 5`);
        console.log('===================================');
        console.log('Les statistiques du dashboard seront recalculées automatiquement via les Cloud Functions.');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erreur lors du seeding :', error);
        process.exit(1);
    }
}

seed();
