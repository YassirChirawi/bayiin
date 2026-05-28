// ============================================================
// BAYIIN BUILDER — 5 TEMPLATES PRÊTS À L'EMPLOI
// ============================================================
// Chaque template contient :
//   - theme  : couleurs, typographie, boutons, header
//   - pages  : sections complètes pour home / product / contact
//   - meta   : nom, catégorie, palette, description
// ============================================================

const s = (id, type, variant, title, subtitle, extra = {}, settings = {}) => ({
    id,
    type,
    variant,
    title,
    subtitle,
    settings: {
        alignment: 'center',
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        paddingTop: 80,
        paddingBottom: 80,
        ...settings,
    },
    ...extra,
});

// ─────────────────────────────────────────────────────────────
// 1. LUXE — Mode & Vêtements Premium
// ─────────────────────────────────────────────────────────────
const LUXE = {
    id: 'luxe',
    name: 'LUXE',
    tagline: 'Mode & Vêtements Premium',
    description: 'Un design sombre et raffiné pour les boutiques de mode haut de gamme. Typographie serif, tons dorés.',
    category: 'Mode',
    emoji: '🖤',
    palette: ['#0a0a0a', '#c9a96e', '#f5f0e8', '#2d2d2d'],
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #2d2d2d 50%, #c9a96e 100%)',
    features: ['Hero Split sombre', 'Grille 3 colonnes', 'Avis glassmorphism', 'FAQ élégante'],
    theme: {
        primaryColor: '#c9a96e',
        bannerText: '✨ Nouvelle Collection — Livraison Gratuite dès 500 MAD',
        typography: { heading: 'Playfair Display', body: 'Inter' },
        headerLayout: 'left',
        buttonStyle: 'sharp',
        social: { facebook: '', instagram: '', whatsapp: '' },
    },
    pages: {
        home: {
            sections: [
                s('lx-hero', 'Hero', 'Split',
                    "L'Élégance Redéfinie",
                    "Collections exclusives · Matières nobles · Artisanat marocain",
                    { ctaText: 'Découvrir la Collection' },
                    { alignment: 'left', backgroundColor: '#0a0a0a', textColor: '#f5f0e8', paddingTop: 120, paddingBottom: 120 }
                ),
                s('lx-feat', 'Features', 'Minimal',
                    'L\'Excellence en Standard',
                    'Chaque pièce est pensée, chaque détail est soigné.',
                    { items: [
                        { emoji: '🧵', title: 'Matières Premium', content: 'Coton égyptien, soie naturelle, laine d\'agneau' },
                        { emoji: '🎁', title: 'Emballage Luxe', content: 'Boîte cadeau incluse avec chaque commande' },
                        { emoji: '🚚', title: 'Livraison Express', content: '24h dans les grandes villes du Maroc' },
                    ]},
                    { backgroundColor: '#111111', textColor: '#c9a96e', paddingTop: 80, paddingBottom: 80 }
                ),
                s('lx-img', 'ImageText', 'Standard',
                    'Une Histoire de Savoir-Faire',
                    'Nos artisans perpétuent des techniques ancestrales marocaines pour créer des pièces intemporelles qui traversent les générations.',
                    { ctaText: 'Notre Histoire' },
                    { alignment: 'left', backgroundColor: '#f5f0e8', textColor: '#0a0a0a', imagePosition: 'right', imageUrl: '', paddingTop: 80, paddingBottom: 80 }
                ),
                s('lx-prod', 'ProductGrid', 'Classic',
                    'Collection Signature',
                    'Les pièces les plus appréciées de notre clientèle.',
                    { ctaText: 'Voir tout' },
                    { alignment: 'center', backgroundColor: '#0a0a0a', textColor: '#f5f0e8', columns: 3, paddingTop: 80, paddingBottom: 80 }
                ),
                s('lx-testi', 'Testimonials', 'Glass',
                    'Ce Que Disent Nos Clients',
                    'Ils ont adopté l\'élégance LUXE.',
                    {},
                    { backgroundColor: '#111111', textColor: '#c9a96e', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
        product: {
            sections: [
                s('lx-p-prod', 'ProductGrid', 'Classic',
                    'Toute la Collection',
                    'Des pièces sélectionnées avec soin.',
                    { ctaText: 'Commander' },
                    { backgroundColor: '#f5f0e8', textColor: '#0a0a0a', columns: 3, paddingTop: 60, paddingBottom: 60 }
                ),
            ],
        },
        contact: {
            sections: [
                s('lx-c-form', 'ContactForm', 'Classic',
                    'Contactez-Nous',
                    'Notre équipe répond sous 2h en semaine.',
                    {},
                    { backgroundColor: '#0a0a0a', textColor: '#f5f0e8', phone: '', email: '', whatsapp: '', submitText: 'Envoyer', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
    },
};

// ─────────────────────────────────────────────────────────────
// 2. DIGITAL — Tech & Électronique
// ─────────────────────────────────────────────────────────────
const DIGITAL = {
    id: 'digital',
    name: 'DIGITAL',
    tagline: 'Tech & Électronique',
    description: 'Minimaliste, performant, bleu acier. Parfait pour la high-tech, les accessoires et la téléphonie.',
    category: 'Tech',
    emoji: '⚡',
    palette: ['#0f172a', '#0ea5e9', '#f0f9ff', '#334155'],
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%)',
    features: ['Hero moderne dynamique', 'Grille 4 colonnes', 'FAQ complète', 'Features vitrée'],
    theme: {
        primaryColor: '#0ea5e9',
        bannerText: '⚡ Paiement à la livraison · Garantie 1 an · SAV 7j/7',
        typography: { heading: 'Inter', body: 'Inter' },
        headerLayout: 'left',
        buttonStyle: 'sharp',
        social: { facebook: '', instagram: '', whatsapp: '' },
    },
    pages: {
        home: {
            sections: [
                s('dg-hero', 'Hero', 'Modern',
                    'La Tech au Meilleur Prix',
                    'Smartphones · Accessoires · Audio · Gaming — Tout ce qu\'il vous faut, livré chez vous',
                    { ctaText: 'Voir les Offres' },
                    { alignment: 'center', backgroundType: 'color', backgroundColor: '#0f172a', textColor: '#f0f9ff', paddingTop: 120, paddingBottom: 120 }
                ),
                s('dg-feat', 'Features', 'Glass',
                    'Pourquoi DIGITAL ?',
                    'Des garanties solides pour acheter en toute confiance.',
                    { items: [
                        { emoji: '🔒', title: 'Produits Authentiques', content: '100% originaux, facture officielle fournie' },
                        { emoji: '⚙️', title: 'SAV Professionnel', content: 'Réparation & remplacement sous 48h' },
                        { emoji: '📦', title: 'Livraison Rapide', content: 'Expédié le jour même avant 14h' },
                    ]},
                    { backgroundColor: '#0f172a', textColor: '#0ea5e9', paddingTop: 80, paddingBottom: 80 }
                ),
                s('dg-prod', 'ProductGrid', 'Classic',
                    'Meilleures Ventes',
                    'Les produits les plus populaires du moment.',
                    { ctaText: 'Tout voir' },
                    { backgroundColor: '#f0f9ff', textColor: '#0f172a', columns: 4, paddingTop: 80, paddingBottom: 80 }
                ),
                s('dg-img', 'ImageText', 'Standard',
                    'Configurez à Votre Image',
                    'Nos experts techniques vous guident vers la solution idéale selon votre budget et vos besoins. Configuration offerte à l\'achat.',
                    { ctaText: 'Consultation Gratuite' },
                    { alignment: 'left', backgroundColor: '#0f172a', textColor: '#f0f9ff', imagePosition: 'right', imageUrl: '', paddingTop: 80, paddingBottom: 80 }
                ),
                s('dg-faq', 'FAQ', 'Accordion',
                    'Questions Fréquentes',
                    'Tout ce que vous devez savoir avant d\'acheter.',
                    { items: [
                        { question: 'Les produits sont-ils originaux ?', answer: 'Oui, tous nos produits sont 100% authentiques avec facture officielle.' },
                        { question: 'Quel est le délai de livraison ?', answer: 'Entre 24 et 72h selon votre ville.' },
                        { question: 'Puis-je retourner un article ?', answer: '7 jours pour changer d\'avis, échange ou remboursement garanti.' },
                    ]},
                    { backgroundColor: '#f0f9ff', textColor: '#0f172a', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
        product: {
            sections: [
                s('dg-p-prod', 'ProductGrid', 'Classic',
                    'Notre Catalogue Complet',
                    'Filtrez par catégorie pour trouver votre produit idéal.',
                    {},
                    { backgroundColor: '#f0f9ff', textColor: '#0f172a', columns: 4, paddingTop: 60, paddingBottom: 60 }
                ),
                s('dg-p-faq', 'FAQ', 'Accordion',
                    'Aide à l\'Achat',
                    '',
                    { items: [
                        { question: 'Comment vérifier la compatibilité ?', answer: 'Contactez-nous via WhatsApp, notre équipe vous conseille gratuitement.' },
                        { question: 'Livraison vers toutes les villes ?', answer: 'Oui, nous livrons partout au Maroc.' },
                    ]},
                    { backgroundColor: '#0f172a', textColor: '#0ea5e9', paddingTop: 60, paddingBottom: 60 }
                ),
            ],
        },
        contact: {
            sections: [
                s('dg-c-form', 'ContactForm', 'Classic',
                    'Support Technique',
                    'Notre équipe répond sous 1h en jours ouvrés.',
                    {},
                    { backgroundColor: '#f0f9ff', textColor: '#0f172a', submitText: 'Envoyer', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
    },
};

// ─────────────────────────────────────────────────────────────
// 3. BLOOM — Beauté & Cosmétique
// ─────────────────────────────────────────────────────────────
const BLOOM = {
    id: 'bloom',
    name: 'BLOOM',
    tagline: 'Beauté & Cosmétique',
    description: 'Doux, féminin, élégant. Une palette rosée et des animations délicates pour sublimer vos produits beauté.',
    category: 'Beauté',
    emoji: '🌸',
    palette: ['#be185d', '#fdf2f8', '#f9a8d4', '#fff1f2'],
    gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f9a8d4 100%)',
    features: ['Hero Split féminin', 'Avis élégants', 'ImageText inspirant', 'Grille 3 colonnes'],
    theme: {
        primaryColor: '#ec4899',
        bannerText: '🌸 Beauté naturelle · Produits certifiés · Livraison soigneuse',
        typography: { heading: 'Outfit', body: 'Inter' },
        headerLayout: 'center',
        buttonStyle: 'pill',
        social: { facebook: '', instagram: '', whatsapp: '' },
    },
    pages: {
        home: {
            sections: [
                s('bl-hero', 'Hero', 'Split',
                    'Révèle Ta Beauté Naturelle',
                    'Soins & Cosmétiques premium · Formules douces · Ingrédients naturels sélectionnés',
                    { ctaText: 'Prendre Soin de Moi' },
                    { alignment: 'left', backgroundColor: '#fdf2f8', textColor: '#be185d', paddingTop: 100, paddingBottom: 100 }
                ),
                s('bl-feat', 'Features', 'Minimal',
                    'Notre Engagement Beauté',
                    'Des produits qui respectent votre peau et la planète.',
                    { items: [
                        { emoji: '🌿', title: '100% Naturel', content: 'Formulées sans parabènes, sans sulfates' },
                        { emoji: '🧪', title: 'Dermatologiquement Testé', content: 'Cliniquement validé, adapté à toutes peaux' },
                        { emoji: '💝', title: 'Emballage Éco', content: 'Packaging recyclable et biodégradable' },
                    ]},
                    { backgroundColor: '#fdf2f8', textColor: '#be185d', paddingTop: 80, paddingBottom: 80 }
                ),
                s('bl-prod', 'ProductGrid', 'Classic',
                    'Bestsellers du Moment',
                    'Les produits plébiscités par notre communauté.',
                    { ctaText: 'Explorer' },
                    { backgroundColor: '#fff1f2', textColor: '#0f172a', columns: 3, paddingTop: 80, paddingBottom: 80 }
                ),
                s('bl-img', 'ImageText', 'Standard',
                    'Un Rituel, Pas Juste un Produit',
                    'Nos soins s\'inscrivent dans une routine beauté pensée pour vous. Chaque formule est le fruit de recherches rigoureuses et d\'une passion pour le bien-être.',
                    { ctaText: 'Voir le Guide Beauté' },
                    { alignment: 'right', backgroundColor: '#fdf2f8', textColor: '#be185d', imagePosition: 'left', imageUrl: '', paddingTop: 80, paddingBottom: 80 }
                ),
                s('bl-testi', 'Testimonials', 'Glass',
                    'Elles Nous Font Confiance',
                    'Plus de 10 000 clientes satisfaites.',
                    {},
                    { backgroundColor: '#be185d', textColor: '#fdf2f8', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
        product: {
            sections: [
                s('bl-p-prod', 'ProductGrid', 'Classic',
                    'Tous Nos Soins',
                    'Trouvez le produit fait pour vous.',
                    {},
                    { backgroundColor: '#fff1f2', textColor: '#0f172a', columns: 3, paddingTop: 60, paddingBottom: 60 }
                ),
            ],
        },
        contact: {
            sections: [
                s('bl-c-form', 'ContactForm', 'Classic',
                    'Parlez-nous de Votre Peau',
                    'Notre conseillère beauté vous répond personnellement.',
                    {},
                    { backgroundColor: '#fdf2f8', textColor: '#be185d', submitText: 'Envoyer mon message', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
    },
};

// ─────────────────────────────────────────────────────────────
// 4. SAVEUR — Food, Épicerie & Traiteur
// ─────────────────────────────────────────────────────────────
const SAVEUR = {
    id: 'saveur',
    name: 'SAVEUR',
    tagline: 'Food, Épicerie & Traiteur',
    description: 'Chaud, appétissant, convivial. Tons orangés et terreux pour épiceries, restaurants et produits alimentaires.',
    category: 'Food',
    emoji: '🍊',
    palette: ['#ea580c', '#431407', '#fff7ed', '#fef3c7'],
    gradient: 'linear-gradient(135deg, #431407 0%, #9a3412 50%, #ea580c 100%)',
    features: ['Hero appétissant', 'Grille 2 colonnes', 'Story de marque', 'FAQ livraison'],
    theme: {
        primaryColor: '#ea580c',
        bannerText: '🍊 Produits frais · Commande avant 18h = Livraison demain',
        typography: { heading: 'Montserrat', body: 'Inter' },
        headerLayout: 'center',
        buttonStyle: 'rounded',
        social: { facebook: '', instagram: '', whatsapp: '' },
    },
    pages: {
        home: {
            sections: [
                s('sv-hero', 'Hero', 'Modern',
                    'Les Saveurs du Maroc, Chez Vous',
                    'Produits frais · Épices authentiques · Spécialités régionales — Commandez et recevez à domicile',
                    { ctaText: 'Commander Maintenant' },
                    { alignment: 'center', backgroundColor: '#431407', textColor: '#fff7ed', paddingTop: 120, paddingBottom: 120 }
                ),
                s('sv-feat', 'Features', 'Glass',
                    'Frais, Rapide, Savoureux',
                    'La qualité de votre épicerie de quartier, en ligne.',
                    { items: [
                        { emoji: '🛒', title: 'Commande Facile', content: 'Commandez en 2 minutes, paiement à la livraison' },
                        { emoji: '🧊', title: 'Fraîcheur Garantie', content: 'Emballage isotherme pour produits frais' },
                        { emoji: '📍', title: 'Livraison Locale', content: 'Dans votre ville et alentours' },
                    ]},
                    { backgroundColor: '#fff7ed', textColor: '#431407', paddingTop: 80, paddingBottom: 80 }
                ),
                s('sv-prod', 'ProductGrid', 'Classic',
                    'Nos Spécialités du Jour',
                    'Stock limité — Commandez vite !',
                    { ctaText: 'Tout Commander' },
                    { backgroundColor: '#431407', textColor: '#fff7ed', columns: 2, paddingTop: 80, paddingBottom: 80 }
                ),
                s('sv-img', 'ImageText', 'Standard',
                    'Du Producteur à Votre Table',
                    'Nous travaillons directement avec des producteurs locaux sélectionnés pour vous garantir des produits 100% authentiques, sans intermédiaire.',
                    { ctaText: 'En Savoir Plus' },
                    { alignment: 'left', backgroundColor: '#fff7ed', textColor: '#431407', imagePosition: 'right', imageUrl: '', paddingTop: 80, paddingBottom: 80 }
                ),
                s('sv-faq', 'FAQ', 'Accordion',
                    'Questions sur la Livraison',
                    '',
                    { items: [
                        { question: 'Quel est le délai de livraison ?', answer: 'Commandez avant 18h et recevez votre commande le lendemain matin.' },
                        { question: 'Minimum de commande ?', answer: 'Pas de minimum. La livraison est gratuite dès 150 MAD.' },
                        { question: 'Comment sont conservés les produits frais ?', answer: 'Emballage isotherme avec bloc de froid inclus.' },
                    ]},
                    { backgroundColor: '#fef3c7', textColor: '#431407', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
        product: {
            sections: [
                s('sv-p-prod', 'ProductGrid', 'Classic',
                    'Notre Catalogue Complet',
                    'Frais et disponible maintenant.',
                    {},
                    { backgroundColor: '#fff7ed', textColor: '#431407', columns: 2, paddingTop: 60, paddingBottom: 60 }
                ),
            ],
        },
        contact: {
            sections: [
                s('sv-c-form', 'ContactForm', 'Classic',
                    'Passez Commande',
                    'Vous pouvez aussi passer commande directement par WhatsApp.',
                    {},
                    { backgroundColor: '#fff7ed', textColor: '#431407', submitText: 'Envoyer ma commande', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
    },
};

// ─────────────────────────────────────────────────────────────
// 5. ÉCLAT — Généraliste Multi-catégories
// ─────────────────────────────────────────────────────────────
const ECLAT = {
    id: 'eclat',
    name: 'ÉCLAT',
    tagline: 'Généraliste Multi-catégories',
    description: 'Vibrant, moderne, polyvalent. Un dégradé violet-cyan pour les boutiques qui vendent de tout avec style.',
    category: 'Généraliste',
    emoji: '🌈',
    palette: ['#7c3aed', '#06b6d4', '#f5f3ff', '#ecfeff'],
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)',
    features: ['Hero dynamique', 'Grille 4 colonnes', 'Avis + Features', 'Contact complet'],
    theme: {
        primaryColor: '#7c3aed',
        bannerText: '🌈 -15% sur tout avec le code BIENVENUE · Livraison offerte dès 250 MAD',
        typography: { heading: 'Outfit', body: 'Inter' },
        headerLayout: 'left',
        buttonStyle: 'rounded',
        social: { facebook: '', instagram: '', whatsapp: '' },
    },
    pages: {
        home: {
            sections: [
                s('ec-hero', 'Hero', 'Modern',
                    'Tout ce Dont Vous Avez Besoin',
                    'Mode · Tech · Maison · Beauté · Sport — Une boutique, des milliers de produits',
                    { ctaText: 'Explorer le Catalogue' },
                    { alignment: 'center', backgroundType: 'color', backgroundColor: '#f5f3ff', textColor: '#1e1b4b', paddingTop: 120, paddingBottom: 120 }
                ),
                s('ec-feat', 'Features', 'Glass',
                    'Pourquoi Choisir ÉCLAT ?',
                    'La qualité, le prix, la confiance.',
                    { items: [
                        { emoji: '🛡️', title: 'Satisfait ou Remboursé', content: '30 jours pour changer d\'avis, sans question' },
                        { emoji: '💳', title: 'Paiement à la Livraison', content: 'Vous payez quand vous recevez' },
                        { emoji: '⭐', title: '4.9/5 Satisfaction', content: 'Plus de 50 000 clients ravis' },
                    ]},
                    { backgroundColor: '#7c3aed', textColor: '#ffffff', paddingTop: 80, paddingBottom: 80 }
                ),
                s('ec-prod', 'ProductGrid', 'Classic',
                    'Nos Bestsellers',
                    'Les produits que nos clients commandent encore et encore.',
                    { ctaText: 'Voir tout le catalogue' },
                    { backgroundColor: '#ffffff', textColor: '#1e1b4b', columns: 4, paddingTop: 80, paddingBottom: 80 }
                ),
                s('ec-img', 'ImageText', 'Standard',
                    'Livraison Partout au Maroc',
                    'De Tanger à Laâyoune, nous livrons dans plus de 100 villes. Suivi en temps réel et paiement à la réception.',
                    { ctaText: 'Voir les zones de livraison' },
                    { alignment: 'center', backgroundColor: '#ecfeff', textColor: '#0e7490', imagePosition: 'left', imageUrl: '', paddingTop: 80, paddingBottom: 80 }
                ),
                s('ec-testi', 'Testimonials', 'Glass',
                    'Ils Parlent de Nous',
                    '',
                    {},
                    { backgroundColor: '#f5f3ff', textColor: '#1e1b4b', paddingTop: 80, paddingBottom: 80 }
                ),
                s('ec-faq', 'FAQ', 'Accordion',
                    'Questions Fréquentes',
                    'Tout savoir avant de commander.',
                    { items: [
                        { question: 'Comment passer commande ?', answer: 'Choisissez votre produit, cliquez "Commander", entrez vos infos et c\'est tout !' },
                        { question: 'Puis-je suivre ma livraison ?', answer: 'Oui, vous recevez un SMS avec le lien de suivi dès l\'expédition.' },
                        { question: 'Que faire si le produit est abîmé ?', answer: 'Contactez-nous dans les 48h, nous remplaçons ou remboursons immédiatement.' },
                    ]},
                    { backgroundColor: '#ffffff', textColor: '#0f172a', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
        product: {
            sections: [
                s('ec-p-prod', 'ProductGrid', 'Classic',
                    'Tous Nos Produits',
                    'Filtrez et trouvez ce qu\'il vous faut.',
                    {},
                    { backgroundColor: '#f5f3ff', textColor: '#1e1b4b', columns: 4, paddingTop: 60, paddingBottom: 60 }
                ),
                s('ec-p-testi', 'Testimonials', 'Glass',
                    'Ce Que Disent Nos Acheteurs',
                    '',
                    {},
                    { backgroundColor: '#7c3aed', textColor: '#ffffff', paddingTop: 60, paddingBottom: 60 }
                ),
            ],
        },
        contact: {
            sections: [
                s('ec-c-form', 'ContactForm', 'Classic',
                    'Contactez-Nous',
                    'Réponse garantie sous 2h en semaine.',
                    {},
                    { backgroundColor: '#f5f3ff', textColor: '#1e1b4b', submitText: 'Envoyer', paddingTop: 80, paddingBottom: 80 }
                ),
            ],
        },
    },
};

// ─────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────
export const TEMPLATES = [LUXE, DIGITAL, BLOOM, SAVEUR, ECLAT];

/**
 * Apply a template to the current storefront data.
 * Preserves subdomain, existing theme.social contacts, and store name.
 */
export const applyTemplate = (template, currentStorefrontData, storeName) => {
    // Deep-clone sections and generate fresh unique IDs to avoid collisions
    const cloneSections = (sections) =>
        sections.map(section => ({
            ...section,
            id: `${section.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }));

    return {
        ...currentStorefrontData,
        theme: {
            ...template.theme,
            // Preserve existing social links if filled in
            social: currentStorefrontData.theme?.social || template.theme.social,
        },
        pages: {
            home: { sections: cloneSections(template.pages.home.sections) },
            product: { sections: cloneSections(template.pages.product.sections) },
            contact: { sections: cloneSections(template.pages.contact.sections) },
        },
    };
};
