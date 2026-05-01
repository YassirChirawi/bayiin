export const QA_MODULES = [
  {
    id: "auth",
    name: "Authentification & Accès",
    description: "Vérifie les flux de connexion, inscription et sécurité des accès.",
    tests: [
      { 
        id: "1.1", 
        task: "Inscription Email", 
        steps: [
          "Cliquer sur 'S'inscrire' sur la page de login.",
          "Remplir le formulaire avec un email valide.",
          "Vérifier la création du store dans l'onboarding."
        ],
        expected: "Compte créé dans Firebase Auth. Redirection vers Onboarding.", 
        severity: "Critique" 
      },
      { 
        id: "1.2", 
        task: "Connexion Email valide", 
        steps: [
          "Entrer l'email et le mot de passe créés.",
          "Cliquer sur 'Connexion'."
        ],
        expected: "Login réussi. Dashboard accessible.", 
        severity: "Critique" 
      },
      { 
        id: "1.13", 
        task: "Verrouillage Biométrique", 
        steps: [
          "Activer la biométrie dans les réglages.",
          "Fermer l'application.",
          "Réouvrir l'application et vérifier que FaceID/Fingerprint est demandé."
        ],
        expected: "Demande TouchID/FaceID à l'ouverture (si activé).", 
        severity: "Majeur" 
      }
    ]
  },
  {
    id: "onboarding",
    name: "Onboarding & Configuration",
    description: "Vérifie le premier paramétrage de la boutique.",
    tests: [
      { id: "2.1", task: "Step 1 — Infos boutique", expected: "Nom, WhatsApp, ville enregistrés dans Firestore.", severity: "Critique" },
      { id: "2.2", task: "Step 2 — Devise et langue", expected: "Changement MAD/USD et FR/AR appliqué.", severity: "Majeur" },
      { id: "2.3", task: "Switch entre boutiques", expected: "Les données changent selon la boutique active.", severity: "Critique" },
      { id: "2.4", task: "Logo Upload", expected: "Logo stocké dans Firebase Storage et affiché.", severity: "Majeur" },
    ]
  },
  {
    id: "catalog",
    name: "Catalogue & Produits",
    description: "Vérifie la gestion des articles et des stocks.",
    tests: [
      { id: "3.1", task: "Création produit simple", expected: "Produit visible dans la liste immédiatement.", severity: "Critique" },
      { id: "3.2", task: "Création avec variantes", expected: "Chaque variante a son propre stock/prix.", severity: "Critique" },
      { id: "3.3", task: "Bundle / Pack", expected: "Déduit le stock de chaque composant à la commande.", severity: "Critique" },
      { id: "3.4", task: "Soft Delete", expected: "Produit masqué mais historique conservé.", severity: "Majeur" },
      { id: "3.5", task: "Import CSV Produits", expected: "Mapping des colonnes correct. Produits créés en masse.", severity: "Majeur" },
      { id: "3.6", task: "Gestion des catégories", expected: "Filtres par catégorie fonctionnels.", severity: "Majeur" },
      { id: "3.7", task: "Alertes Stock Bas", expected: "Indicateur visuel rouge quand stock < seuil.", severity: "Majeur" },
    ]
  },
  {
    id: "orders",
    name: "Cycle de Vie des Commandes",
    description: "Vérifie le flux complet d'une vente.",
    tests: [
      { 
        id: "4.1", 
        task: "Création commande manuelle", 
        steps: [
          "Aller sur la page Commandes.",
          "Cliquer sur 'Nouvelle Commande'.",
          "Remplir les infos client et sélectionner un produit.",
          "Enregistrer la commande."
        ],
        expected: "Numérotation séquentielle. Stock déduit.", 
        severity: "Critique" 
      },
      { 
        id: "4.2", 
        task: "Transition Reçu → Livré", 
        steps: [
          "Ouvrir une commande en statut 'Reçu'.",
          "Changer le statut vers 'Livré'.",
          "Vérifier l'impact dans l'onglet Finances."
        ],
        expected: "Audit log créé. Stats financières mises à jour.", 
        severity: "Critique" 
      }
    ]
  },
  {
    id: "crm",
    name: "CRM & Segmentation",
    description: "Vérifie la gestion des clients et la segmentation AI.",
    tests: [
      { id: "5.1", task: "Fiche Client détaillée", expected: "Historique d'achat et LTV affichés correctement.", severity: "Majeur" },
      { id: "5.2", task: "Segmentation AI (VIP/Risque)", expected: "Attribution correcte du segment selon les ordres.", severity: "Majeur" },
      { id: "5.3", task: "Relance WhatsApp", expected: "Lien WhatsApp s'ouvre avec le template correct.", severity: "Critique" },
    ]
  },
  {
    id: "logistics",
    name: "Logistique & Drivers",
    description: "Vérifie les expéditions et le mode Driver.",
    tests: [
      { id: "6.1", task: "Assignation Driver", expected: "Driver reçoit une notification push.", severity: "Critique" },
      { id: "6.2", task: "Interface Driver", expected: "Driver voit uniquement ses commandes assignées.", severity: "Critique" },
      { id: "6.3", task: "Scan Code Barre", expected: "Scan identifie la commande instantanément.", severity: "Majeur" },
      { id: "6.4", task: "Dépenses Driver", expected: "Carburant/Frais déduits du profit de la boutique.", severity: "Majeur" },
    ]
  },
  {
    id: "finances",
    name: "Finances & Analytique",
    description: "Vérifie l'exactitude des calculs de profit.",
    tests: [
      { id: "7.1", task: "Calcul du Profit Net", expected: "Profit = Ventes - COGS - Frais - Pub.", severity: "Critique" },
      { id: "7.2", task: "Dépenses Publicitaires", expected: "Saisie manuelle impacte le ROI en temps réel.", severity: "Critique" },
      { id: "7.3", task: "Exports Excel", expected: "Export complet avec calculs préservés.", severity: "Majeur" },
      { id: "7.4", task: "Réconciliation Cash", expected: "Montant encaissé = Montant commandes livrées.", severity: "Critique" },
    ]
  },
  {
    id: "ai",
    name: "AI Copilot Beya3",
    description: "Vérifie l'intelligence locale et les actions via chat.",
    tests: [
      { id: "8.1", task: "Brief d'Ouverture", expected: "Données réelles affichées (CA, stocks).", severity: "Critique" },
      { id: "8.2", task: "Actions via Chat", expected: "Création/Annulation commande fonctionnelle.", severity: "Critique" },
      { id: "8.3", task: "Analyse Darija", expected: "Réponse cohérente en Darija.", severity: "Mineur" },
      { id: "8.4", task: "Détection d'intentions", expected: "Beya3 comprend 'Combien j'ai vendu hier?'.", severity: "Majeur" },
    ]
  },
  {
    id: "pwa",
    name: "PWA & Mobile UI",
    description: "Vérifie l'expérience sur smartphone.",
    tests: [
      { id: "9.1", task: "Installation PWA", expected: "Bannière d'installation affichée sur mobile.", severity: "Majeur" },
      { id: "9.2", task: "Offline Mode", expected: "Consultation possible sans connexion (cache).", severity: "Majeur" },
      { id: "9.3", task: "Notifications Push", expected: "Réception même si l'app est fermée.", severity: "Critique" },
      { id: "9.4", task: "Responsive Table", expected: "Passage en vue 'Carte' sur petit écran.", severity: "Majeur" },
    ]
  },
  {
    id: "security",
    name: "Sécurité & Robustesse",
    description: "Vérifie la protection des données sensibles.",
    tests: [
      { id: "10.1", task: "Verrouillage Biométrique", expected: "Demande TouchID/FaceID à l'ouverture (si activé).", severity: "Majeur" },
      { id: "10.2", task: "Permissions Roles", expected: "Staff ne peut pas voir les profits ou settings.", severity: "Critique" },
      { id: "10.3", store: "Transactions Firestore", expected: "Pas d'erreurs en cas de pics de commandes.", severity: "Critique" },
    ]
  },
  {
    id: "e2e",
    name: "Tests Inter-Modules (E2E)",
    description: "Vérifie les flux complexes bout-en-bout.",
    tests: [
      { id: "E2E-1", task: "Flux Vente Complet", expected: "De la création à l'encaissement cash.", severity: "Critique" },
      { id: "E2E-2", task: "Abonnement Expiré", expected: "Mode lecture seule actif. Blocage création.", severity: "Critique" },
      { id: "E2E-3", task: "Retour Client complet", expected: "Annulation → Restock → Correction Finance.", severity: "Critique" },
    ]
  }
];
