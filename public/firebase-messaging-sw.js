importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBf3CLMhx_jCzteE5h7KWOW2_68yZD34h0",
    authDomain: "commerce-saas-62f32.firebaseapp.com",
    projectId: "commerce-saas-62f32",
    storageBucket: "commerce-saas-62f32.firebasestorage.app",
    messagingSenderId: "754392533406",
    appId: "1:754392533406:web:65605ce76a6809ff43ee8f",
    measurementId: "G-XHX0NHQXN5"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Nouvelle Notification';
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/pwa-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
