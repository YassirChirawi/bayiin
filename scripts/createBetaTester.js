/**
 * Script de création d'un utilisateur Beta Tester avec un store pré-configuré.
 * 
 * Ce script :
 * 1. Crée un compte Firebase Auth
 * 2. Crée un store 'pro' actif dans Firestore
 * 3. Crée un profil utilisateur lié au store
 * 4. Attribue les custom claims (role: owner)
 * 
 * Usage: node scripts/createBetaTester.js <email> <password>
 * Exemple: node scripts/createBetaTester.js tester@bayiin.com monpassword123
 */

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

dotenv.config();

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('❌ Erreur: Arguments manquants.');
    console.log('Usage: node scripts/createBetaTester.js <email> <password>');
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
    // Recherche automatique de GOOGLE_APPLICATION_CREDENTIALS ou utilise les credentials par défaut du runtime
    adminConfig = {
        credential: admin.credential.applicationDefault()
    };
}

// Initialisation de l'App Admin
try {
    admin.initializeApp(adminConfig);
} catch (error) {
    if (error.code !== 'app/duplicate-app') {
        console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error);
        process.exit(1);
    }
}

// Initialisation des services avec la base de données 'comsaas'
const db = getFirestore('comsaas');
const auth = getAuth();

async function createBetaTester() {
    try {
        console.log(`\n🚀 Lancement de la création pour : ${email}`);
        
        // 1. Création de l'utilisateur dans Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            emailVerified: true,
            displayName: 'Beta Tester'
        });

        const uid = userRecord.uid;
        console.log(`✅ Utilisateur Auth créé (UID: ${uid})`);

        // 2. Création du Store dans la collection 'stores'
        const storeRef = db.collection('stores').doc();
        const storeId = storeRef.id;

        const storeData = {
            name: 'Store Beta Test',
            owner: uid,
            plan: 'pro',
            subscriptionStatus: 'active',
            trialEndsAt: null,
            createdAt: FieldValue.serverTimestamp(),
            currency: 'MAD',
            language: 'fr',
            settings: {
                whatsappLanguage: 'fr',
                biometricLock: false
            }
        };

        await storeRef.set(storeData);
        console.log(`✅ Document Store créé (StoreID: ${storeId})`);

        // 3. Création du profil utilisateur dans la collection 'users'
        const userDocData = {
            email: email,
            role: 'owner',
            storeId: storeId,
            name: 'Beta Tester',
            createdAt: FieldValue.serverTimestamp(),
            lastLogin: null
        };

        await db.collection('users').doc(uid).set(userDocData);
        console.log(`✅ Document User créé dans Firestore`);

        // 4. Attribution des Custom Claims pour les règles de sécurité Firestore
        await auth.setCustomUserClaims(uid, { 
            role: 'owner' 
        });
        console.log(`✅ Custom Claims "owner" attribués au compte`);

        console.log('\n🎉 Opération réussie !');
        console.log('===================================');
        console.log(`UID:      ${uid}`);
        console.log(`StoreID:  ${storeId}`);
        console.log(`Email:    ${email}`);
        console.log('===================================');
        console.log('Vous pouvez maintenant vous connecter avec ces identifiants.');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erreur fatale :');
        if (error.code === 'auth/email-already-exists') {
            console.error(`L'email ${email} est déjà utilisé.`);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

createBetaTester();
