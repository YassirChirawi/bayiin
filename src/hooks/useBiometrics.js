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

    /**
     * Verification detaillee. WebAuthn ne distingue pas proprement « l'utilisateur
     * a annule » de « aucune passkey pour ce domaine » : les deux remontent en
     * NotAllowedError. On renvoie donc la raison brute pour que l'appelant puisse
     * expliquer la situation, sans pretendre deviner.
     *
     * Rappel important : une passkey est liee au RP ID, c'est-a-dire au DOMAINE.
     * Une passkey creee sur bayiin.shop n'existe pas sur bayiin.vercel.app.
     *
     * @returns {Promise<{ok: boolean, reason: 'ok'|'unsupported'|'failed', error?: Error}>}
     */
    const verifyDetailed = async () => {
        if (!window.PublicKeyCredential) {
            return { ok: false, reason: 'unsupported' };
        }
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    timeout: 60000,
                    userVerification: "required",
                    rpId: window.location.hostname,
                },
            });
            return assertion ? { ok: true, reason: 'ok' } : { ok: false, reason: 'failed' };
        } catch (err) {
            console.error("Biometric verification failed", err);
            return { ok: false, reason: 'failed', error: err };
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
            return {
                id: 'face',
                labelKey: 'bio_type_face',
                icon: 'ScanFace'
            };
        } else if (ua.includes('android')) {
            return {
                id: 'fingerprint',
                labelKey: 'bio_type_fingerprint',
                icon: 'Fingerprint'
            };
        }
        return {
            id: 'unknown',
            labelKey: 'bio_type_generic',
            icon: 'Shield'
        };
    };

    return { isAvailable, register, verify, verifyDetailed, getBiometricType };
};
