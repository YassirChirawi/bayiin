export const useBiometrics = () => {
    const isAvailable = async () => {
        if (!window.PublicKeyCredential) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    };

    const register = async (userId) => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions = {
                challenge,
                rp: { name: "BayIIn Retail OS", id: window.location.hostname },
                user: {
                    id: Uint8Array.from(userId, c => c.charCodeAt(0)),
                    name: userId,
                    displayName: "Store Owner",
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                timeout: 60000,
                attestation: "direct"
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            return !!credential;
        } catch (err) {
            console.error("Biometric registration failed", err);
            return false;
        }
    };

    const verify = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialRequestOptions = {
                challenge,
                timeout: 60000,
                userVerification: "required",
                rpId: window.location.hostname,
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });

            return !!assertion;
        } catch (err) {
            console.error("Biometric verification failed", err);
            return false;
        }
    };

    const getBiometricType = () => {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('iphone') || ua.includes('ipad')) {
            return 'face'; // iOS assumes FaceID mostly now (or TouchID but FaceID is standard term)
        } else if (ua.includes('android')) {
            return 'fingerprint';
        }
        return 'unknown';
    };

    return { isAvailable, register, verify, getBiometricType };
};
