export const getFriendlyErrorMessage = (error) => {
    // Log the real error for developers
    console.warn("Raw Auth Error:", error.code, error.message);

    if (!error || !error.code) {
        return "Une erreur inattendue est survenue.";
    }

    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return "Identifiants incorrects. Veuillez vérifier votre email et mot de passe.";
        case 'auth/email-already-in-use':
            return "Cet email est déjà associé à un compte existant.";
        case 'auth/weak-password':
            return "Le mot de passe est trop faible (6 caractères minimum).";
        case 'auth/invalid-email':
            return "Format d'email invalide.";
        case 'auth/too-many-requests':
            return "Trop de tentatives échouées. Compte temporairement bloqué, réessayez plus tard.";
        case 'auth/network-request-failed':
            return "Erreur de connexion. Vérifiez votre internet.";
        case 'auth/popup-closed-by-user':
            return "Connexion annulée par l'utilisateur.";
        default:
            return "Impossible de se connecter. Veuillez réessayer.";
    }
};
