import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const emailToMakeAdmin = process.argv[2];

if (!emailToMakeAdmin) {
    console.error("Veuillez fournir un e-mail : node makeAdmin.js <votre-email>");
    process.exit(1);
}

async function makeSuperAdmin(email) {
    try {
        console.log(`Recherche de l'utilisateur ${email}...`);
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error('❌ Utilisateur non trouvé avec cet e-mail :', email);
            process.exit(1);
        }

        const userDoc = querySnapshot.docs[0];

        console.log(`✅ Utilisateur trouvé (ID: ${userDoc.id}). Mise à jour du rôle...`);
        await updateDoc(doc(db, 'users', userDoc.id), {
            role: 'super_admin'
        });

        console.log(`🎉 Succès ! ${email} est maintenant super_admin.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour :', error);
        process.exit(1);
    }
}

makeSuperAdmin(emailToMakeAdmin);
