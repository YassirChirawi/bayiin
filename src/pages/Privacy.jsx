import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Politique de Confidentialité" description="Politique de Confidentialité conforme à la loi 09-08." />
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <div className="mb-6">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">← Retour à l'accueil</Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialité</h1>

                <div className="prose prose-indigo max-w-none text-gray-600">
                    <p className="mb-4 text-sm text-gray-500">Dernière mise à jour : {new Date().toLocaleDateString()}</p>

                    <p>
                        La présente politique de confidentialité décrit comment BayIIn (ci-après "nous") collecte, utilise et protège vos données personnelles,
                        conformément à la <strong>Loi n° 09-08</strong> relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">1. Collecte des Données</h2>
                    <p>
                        Nous collectons les informations que vous nous fournissez directement lors de la création de votre compte, de l'utilisation de notre plateforme SaaS,
                        ou lors de vos échanges avec notre support. Les données collectées peuvent inclure :
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Identité (Nom, Prénom)</li>
                        <li>Coordonnées (Email, Téléphone, Adresse)</li>
                        <li>Données commerciales (Commandes, Produits, Clients)</li>
                        <li>Données techniques (Adresse IP, Logs de connexion)</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">2. Finalité du Traitement</h2>
                    <p>Vos données sont traitées pour les finalités suivantes :</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Fourniture et gestion de nos services SaaS.</li>
                        <li>Gestion de la relation client et support technique.</li>
                        <li>Amélioration de nos services et analyses statistiques (anonymisées).</li>
                        <li>Respect des obligations légales et réglementaires.</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">3. Protection et Partage</h2>
                    <p>
                        Vos données sont hébergées de manière sécurisée. Nous ne vendons ni ne louons vos données personnelles à des tiers.
                        Elles peuvent être accessibles par nos prestataires techniques (hébergeurs) sous obligation de confidentialité stricte.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">4. Vos Droits (Loi 09-08)</h2>
                    <p>
                        Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition au traitement de vos données personnelles.
                        Ce traitement a fait l'objet d'une déclaration auprès de la <strong>CNDP</strong> (Commission Nationale de contrôle de la protection des Données à caractère Personnel).
                    </p>
                    <p className="mt-2">
                        Pour exercer ces droits, vous pouvez nous contacter à : <a href="mailto:support@bayiin.shop" className="text-indigo-600">support@bayiin.shop</a>
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">5. Cookies</h2>
                    <p>
                        Ce site utilise des cookies pour assurer son bon fonctionnement et améliorer votre expérience utilisateur. En continuant à naviguer, vous acceptez leur utilisation.
                        Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut limiter certaines fonctionnalités.
                    </p>
                </div>
            </div>
        </div>
    );
}
