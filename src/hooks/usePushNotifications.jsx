import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '../lib/firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const usePushNotifications = () => {
    const { user } = useAuth();
    const [token, setToken] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState(() => {
        return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    });

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            toast(
                (t) => (
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900">{payload.notification?.title}</span>
                        <span className="text-sm text-gray-600">{payload.notification?.body}</span>
                    </div>
                ),
                { duration: 5000 }
            );
        });

        return () => unsubscribe();
    }, []);

    const requestPermission = async () => {
        if (!messaging) {
            toast.error("Push notifications are not supported in this browser.");
            return;
        }
        if (!vapidKey || vapidKey === "YOUR_VAPID_KEY_HERE") {
            toast.error("VAPID key is missing in configuration.");
            console.warn("VITE_FIREBASE_VAPID_KEY is missing or invalid in .env");
            return;
        }

        try {
            if (typeof Notification === 'undefined') {
                toast.error("Votre navigateur ne supporte pas les notifications push.");
                return;
            }
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                const currentToken = await getToken(messaging, { vapidKey });
                if (currentToken) {
                    setToken(currentToken);
                    await saveTokenToFirestore(currentToken);
                    toast.success("Notifications activées !");
                } else {
                    console.log('No registration token available.');
                    toast.error("Impossible d'obtenir le token de notification.");
                }
            } else {
                toast.error("Permission de notification refusée.");
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
            toast.error("Erreur lors de l'activation des notifications.");
        }
    };

    const saveTokenToFirestore = async (fcmToken) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                fcmTokens: arrayUnion(fcmToken)
            }, { merge: true });
        } catch (err) {
            console.error('Error saving FCM token to Firestore:', err);
        }
    };

    return {
        token,
        permissionStatus,
        requestPermission
    };
};
