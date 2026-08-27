import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { Shield, Scale, FileText, Lock } from 'lucide-react';
import { SUPPORT_EMAIL, PUBLIC_CONTACT_PATH, LEGAL_ENTITY, LEGAL_ICE, LEGAL_RC, LEGAL_IF, LEGAL_ADDRESS } from "../config/brand";

export default function Terms() {
    const lastUpdated = "29 Avril 2026";

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <SEO 
                title="Conditions Générales d'Utilisation" 
                description="CGU et Mentions Légales de BayIIn Commerce SaaS - La plateforme retail OS pour le Maroc." 
            />
            
            <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium flex items-center gap-2">
                        <span>←</span> Retour à l'accueil
                    </Link>
                    <span className="text-xs text-gray-400">Dernière mise à jour : {lastUpdated}</span>
                </div>

                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Conditions Générales d'Utilisation</h1>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Merci d'utiliser BayIIn. En utilisant notre plateforme, vous acceptez les présentes conditions. Veuillez les lire attentivement.
                    </p>
                </header>

                <div className="space-y-10 text-gray-600 leading-relaxed">
                    
                    {/* Section 1 */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 text-gray-900">
                            <FileText className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">1. Objet du Service</h2>
                        </div>
                        <p>
                            BayIIn est une solution logicielle en mode SaaS (Software as a Service) destinée aux e-commerçants et détaillants au Maroc. La plateforme permet la gestion des commandes, du stock, des clients et l'analyse financière. BayIIn agit en tant que prestataire technologique et n'intervient jamais dans la transaction commerciale entre l'utilisateur (le marchand) et ses propres clients.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 text-gray-900">
                            <Shield className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">2. Protection des Données (CNDP)</h2>
                        </div>
                        <p className="mb-4">
                            Conformément à la <strong>loi n° 09-08</strong> relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel au Maroc :
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Responsabilité :</strong> Le marchand est responsable du traitement des données de ses propres clients finaux.</li>
                            <li><strong>Sécurité :</strong> BayIIn s'engage à mettre en œuvre les mesures techniques nécessaires pour sécuriser les données stockées sur ses serveurs (hébergement Cloud sécurisé).</li>
                            <li><strong>Droits :</strong> L'utilisateur dispose d'un droit d'accès, de rectification et d'opposition au traitement de ses données personnelles auprès de l'administration de BayIIn.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 text-gray-900">
                            <Scale className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">3. Abonnements et Paiements</h2>
                        </div>
                        <p>
                            L'accès aux fonctionnalités avancées de BayIIn est soumis à un abonnement mensuel ou annuel. Le défaut de paiement entraîne la suspension de l'accès aux services après un délai de grâce de 7 jours. Les tarifs sont exprimés en Dirhams (DH) et sont modifiables avec un préavis de 30 jours.
                        </p>
                    </section>

                    {/* Section 3 bis — YouCan Billing */}
                    <section className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-3 mb-4 text-gray-900">
                            <Shield className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">3 bis. Facturation via YouCan (Marchands YouCan)</h2>
                        </div>
                        <p className="mb-4">
                            Les marchands qui installent BayIIn depuis le <strong>marketplace YouCan</strong> bénéficient
                            d'une facturation gérée directement par YouCan (<em>YouCan Managed Billing</em>).
                            Les plans disponibles via YouCan sont les suivants :
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="bg-white rounded-lg p-4 border border-indigo-200">
                                <h4 className="font-bold text-gray-900 mb-1">Plan Free</h4>
                                <p className="text-2xl font-extrabold text-gray-900 mb-1">0 MAD <span className="text-sm font-normal text-gray-500">/mois</span></p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>✓ Jusqu'à 50 commandes / mois</li>
                                    <li>✓ Gestion produits &amp; stock</li>
                                    <li>✓ Synchronisation YouCan</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                                <h4 className="font-bold text-gray-900 mb-1">Plan Pro</h4>
                                <p className="text-2xl font-extrabold text-gray-900 mb-1">99 MAD <span className="text-sm font-normal text-gray-500">/mois</span></p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>✓ Commandes illimitées</li>
                                    <li>✓ IA Beya3 (CFO/COO)</li>
                                    <li>✓ Analytics avancés</li>
                                    <li>✓ 30 jours d'essai gratuit</li>
                                </ul>
                            </div>
                        </div>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>
                                <strong>Essai gratuit :</strong> Le Plan Pro inclut 30 jours d'essai gratuit. Aucune facturation
                                n'est déclenchée avant la fin de la période d'essai.
                            </li>
                            <li>
                                <strong>Renouvellement automatique :</strong> L'abonnement se renouvelle automatiquement
                                chaque mois via YouCan. Vous pouvez annuler à tout moment depuis votre dashboard YouCan.
                            </li>
                            <li>
                                <strong>Remboursement :</strong> En cas de non-satisfaction dans les <strong>30 premiers jours</strong>
                                {' '}suivant le premier paiement, vous pouvez demander un remboursement intégral{' '}
                                {SUPPORT_EMAIL
                                    ? <>à <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600">{SUPPORT_EMAIL}</a>.</>
                                    : <>via le <Link to={PUBLIC_CONTACT_PATH} className="text-indigo-600">formulaire de contact</Link>.</>}
                            </li>
                            <li>
                                <strong>Annulation :</strong> L'annulation entraîne le passage automatique au Plan Free
                                à la fin de la période en cours. Vos données sont conservées pendant 3 ans après résiliation.
                            </li>
                        </ul>
                    </section>


                    <section>
                        <div className="flex items-center gap-3 mb-4 text-gray-900">
                            <Lock className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">4. Limitation de Responsabilité</h2>
                        </div>
                        <p>
                            BayIIn ne peut être tenu responsable des pertes de revenus, des erreurs logistiques des transporteurs tiers, ou des interruptions de service dues à des facteurs externes (pannes réseau, maintenance serveurs). L'outil est fourni "tel quel" pour aider à la gestion, mais le succès commercial reste de la responsabilité exclusive de l'utilisateur.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Droit Applicable</h2>
                        <p>
                            Les présentes CGU sont régies par le droit marocain. Tout litige relatif à leur interprétation ou leur exécution sera de la compétence exclusive du <strong>Tribunal de Commerce de Casablanca</strong>.
                        </p>
                    </section>

                    {/* Section 6 (NEW) */}
                    <section className="pt-8 border-t border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Mentions Légales</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="font-bold text-gray-800">Éditeur du Site</p>
                                <p>{LEGAL_ENTITY || 'BayIIn'}</p>
                                <p>{LEGAL_ADDRESS || 'Casablanca, Maroc'}</p>
                                <p>
                                    Contact :{' '}
                                    {SUPPORT_EMAIL
                                        ? <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600">{SUPPORT_EMAIL}</a>
                                        : <Link to={PUBLIC_CONTACT_PATH} className="text-indigo-600">formulaire de contact</Link>}
                                </p>
                            </div>
                            {/* Les identifiants ne s'affichent qu'une fois réels : publier
                                un numéro d'ICE factice sur une page légale publique est
                                pire que de ne rien afficher. Voir docs/LAUNCH_AUDIT.md. */}
                            {(LEGAL_ICE || LEGAL_RC || LEGAL_IF) && (
                                <div>
                                    <p className="font-bold text-gray-800">Identifiants</p>
                                    {LEGAL_ICE && <p>ICE : {LEGAL_ICE}</p>}
                                    {LEGAL_RC && <p>RC : {LEGAL_RC}</p>}
                                    {LEGAL_IF && <p>IF : {LEGAL_IF}</p>}
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <p className="font-bold text-gray-800">Hébergement</p>
                                <p>Le site est hébergé par Google Cloud Platform (GCP) - Région Europe.</p>
                            </div>
                        </div>
                    </section>

                </div>

                <footer className="mt-16 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
                    © {new Date().getFullYear()} BayIIn Retail OS. Tous droits réservés.
                </footer>
            </div>
        </div>
    );
}
