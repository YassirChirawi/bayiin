const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with the project ID
initializeApp({ projectId: 'commerce-saas-62f32' });

const db = getFirestore('comsaas');

async function clean() {
    try {
        const snap = await db.collectionGroup('youcan_integration').get();
        if (snap.empty) {
            console.log('No youcan_integration documents found.');
            return;
        }
        for (let doc of snap.docs) {
            await doc.ref.delete();
            console.log('Deleted youcan_integration link:', doc.ref.path);
        }
        console.log('Cleanup complete!');
    } catch (e) {
        console.error('Error:', e);
    }
}

clean();
