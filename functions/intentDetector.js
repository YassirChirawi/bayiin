/**
 * NLU Intent Detector (Darija & Français)
 * Analyzes client WhatsApp messages to determine their intent in the COD state machine.
 */

const DICTIONARY = {
    confirm: [
        "oui", "ok", "yes", "ouais", "d'accord", "parfait", "valider", "je confirme",
        "ah", "wakha", "mezian", "sift", "seft", "sifet", "jib", "jiboh", "mzyan", "siftou", "sifto",
        "inshaallah", "inchallah"
    ],
    refuse: [
        "non", "no", "cancel", "annuler", "annule", "la", "blach", "mabghitch", "ma bghitch", "batal",
        "batalt", "bttalt", "mab9itch", "ma b9itch"
    ],
    reschedule: [
        "demain", "plus tard", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
        "gheda", "ghda", "semana", "simana", "men be3d", "mn b3d", "ajjel", "khelli", "xelli", "xali",
        "après", "apres", "mois prochain"
    ],
    human_handoff: [
        "humain", "agent", "service", "client", "personne", "bghit nhder", "hder m3a", "insan", 
        "support", "reclamation", "moshkil", "mochkil", "problème", "probleme", "téléphone", "appel",
        "appeler"
    ]
};

/**
 * Detects the intent of a text message based on keyword matching.
 * @param {string} text - The raw text message from WhatsApp
 * @returns {string} - 'confirm', 'refuse', 'reschedule', 'human_handoff', or 'unknown'
 */
function detectIntent(text) {
    if (!text || typeof text !== 'string') return 'unknown';
    
    // Normalize text: lowercase, remove punctuation and extra spaces
    const normalized = text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[.,?!]/g, " ")
        .trim();
        
    // Direct exact match check first for short responses
    if (normalized.length <= 15) {
        for (const [intent, keywords] of Object.entries(DICTIONARY)) {
            if (keywords.includes(normalized)) {
                return intent;
            }
        }
    }

    // Keyword presence check
    const words = normalized.split(/\s+/);
    
    for (const [intent, keywords] of Object.entries(DICTIONARY)) {
        // Check multi-word phrases first
        for (const keyword of keywords) {
            if (keyword.includes(" ") && normalized.includes(keyword)) {
                return intent;
            }
        }
        // Check single words
        for (const word of words) {
            if (keywords.includes(word)) {
                return intent;
            }
        }
    }

    return 'unknown';
}

module.exports = {
    detectIntent
};
