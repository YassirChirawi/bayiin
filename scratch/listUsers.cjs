const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.GCLOUD_PROJECT = 'commerce-saas-62f32';

initializeApp();
const db = getFirestore('comsaas');

async function listUsers() {
    try {
        console.log("Fetching users...");
        const s = await db.collection('users').get();
        console.log(`Found ${s.size} users`);
        s.forEach(d => {
            const data = d.data();
            console.log(`ID: ${d.id}, Email: ${data.email}, Name: ${data.name}`);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

listUsers();
