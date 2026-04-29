import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { Shield, Scale, FileText, Lock } from 'lucide-react';

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

                    {/* Section 4 */}
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
                                <p>BayIIn SARL (en cours de constitution)</p>
                                <p>Casablanca, Maroc</p>
                                <p>Email : contact@bayiin.shop</p>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">Identifiants (Placeholders)</p>
                                <p>ICE : 00XXXXXXXXXXXXX</p>
                                <p>RC : XXXXXX (Casablanca)</p>
                                <p>IF : XXXXXXXX</p>
                            </div>
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
