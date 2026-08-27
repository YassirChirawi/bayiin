import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { SUPPORT_EMAIL, DPO_EMAIL, PUBLIC_CONTACT_PATH, LEGAL_ENTITY, CNDP_DECLARED } from "../config/brand";

export default function Privacy() {
    const LAST_UPDATED = "31 mai 2026";

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO
                title="Politique de Confidentialité — BayIIn"
                description="Politique de Confidentialité BayIIn conforme à la loi 09-08 et au RGPD. Données YouCan, IA Beya3, droits des marchands."
            />
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <div className="mb-6">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">← Retour à l'accueil</Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
                <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : {LAST_UPDATED}</p>

                <div className="prose prose-indigo max-w-none text-gray-600 space-y-8">

                    {/* Section 1 */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Qui sommes-nous ?</h2>
                        <p>
                            BayIIn est une plateforme SaaS de gestion commerciale destinée aux e-commerçants et détaillants
                            au Maroc. Notre service est disponible directement sur <strong>bayiin.shop</strong> et via
                            l'intégration <strong>YouCan Marketplace</strong>.
                        </p>
                        <p className="mt-2">
                            Éditeur : {LEGAL_ENTITY || 'BayIIn'} · Contact :{' '}
                            {SUPPORT_EMAIL
                                ? <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600">{SUPPORT_EMAIL}</a>
                                : <Link to={PUBLIC_CONTACT_PATH} className="text-indigo-600">formulaire de contact</Link>}
                            {DPO_EMAIL && (
                                <>
                                    <br />Délégué à la Protection des Données (DPO) :{' '}
                                    <a href={`mailto:${DPO_EMAIL}`} className="text-indigo-600">{DPO_EMAIL}</a>
                                </>
                            )}
                        </p>
                    </section>

                    {/* Section 2 — YouCan spécifique */}
                    <section className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">
                            2. Données collectées via l'intégration YouCan
                        </h2>
                        <p className="mb-3">
                            Lorsque vous installez BayIIn depuis le <strong>marketplace YouCan</strong>, nous accédons aux
                            données suivantes de votre boutique YouCan, avec votre consentement explicite lors de
                            l'autorisation OAuth :
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>Commandes</strong> (<code>orders:read</code>, <code>orders:write</code>) —
                                Importation et mise à jour des statuts de commandes dans BayIIn.
                            </li>
                            <li>
                                <strong>Produits &amp; Catalogue</strong> (<code>products:read</code>, <code>products:write</code>) —
                                Synchronisation du catalogue produit et des niveaux de stock.
                            </li>
                            <li>
                                <strong>Clients</strong> (<code>customers:read</code>) —
                                Données CRM (nom, email, téléphone, adresse de livraison) pour la gestion de la relation client.
                            </li>
                            <li>
                                <strong>Inventaire</strong> (<code>inventory:read</code>, <code>inventory:write</code>) —
                                Lecture et déduction du stock lors des livraisons confirmées.
                            </li>
                        </ul>
                        <p className="mt-3 text-sm text-indigo-700">
                            <strong>Scopes non demandés :</strong> Nous ne demandons pas l'accès aux données de paiement
                            (<code>payments:read</code>), aux thèmes (<code>themes:write</code>), ni aux analytics YouCan
                            (<code>analytics:read</code>).
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Finalité du traitement</h2>
                        <p>Vos données sont traitées pour les finalités suivantes :</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>
                                <strong>Gestion opérationnelle</strong> — Suivi des commandes, gestion du stock, CRM,
                                planification logistique.
                            </li>
                            <li>
                                <strong>IA Beya3 (Copilot CFO/COO)</strong> — Analyse de rentabilité, recommandations
                                commerciales basées sur vos données de vente. Les données sont traitées localement dans
                                votre espace BayIIn et ne sont pas partagées avec des tiers à des fins d'entraînement IA.
                            </li>
                            <li>
                                <strong>Analytics &amp; Reporting</strong> — Tableaux de bord financiers, tendances de
                                ventes, rapports d'activité.
                            </li>
                            <li>
                                <strong>Notifications automatiques</strong> — Envoi de messages WhatsApp aux clients
                                finaux (confirmations, suivi de livraison) uniquement si vous activez cette fonctionnalité.
                            </li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Durée de conservation</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>Données actives</strong> — Conservées pour toute la durée de votre abonnement BayIIn.
                            </li>
                            <li>
                                <strong>Après résiliation</strong> — Vos données sont conservées pendant <strong>3 ans</strong>
                                {' '}à compter de la fin de votre abonnement (obligation légale marocaine), puis supprimées
                                définitivement.
                            </li>
                            <li>
                                <strong>Tokens OAuth YouCan</strong> — Les jetons d'accès sont automatiquement rafraîchis
                                et révoqués lors de la désinstallation de l'app depuis YouCan.
                            </li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Protection &amp; Partage</h2>
                        <p>
                            Vos données sont hébergées sur <strong>Google Cloud Platform (Firebase)</strong> —
                            région Europe-West. Nous ne vendons ni ne louons vos données à des tiers.
                        </p>
                        <p className="mt-2">
                            Prestataires techniques avec accès limité aux données (sous accord de confidentialité) :
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Google Firebase / Firestore — Stockage &amp; authentification</li>
                            <li>Vercel — Hébergement frontend</li>
                            <li>Groq API — Traitement IA (Beya3 Copilot) — données non conservées par Groq</li>
                        </ul>
                    </section>

                    {/* Section 6 — Droits RGPD / 09-08 */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Vos droits (Loi 09-08 &amp; RGPD)</h2>
                        <p>
                            Conformément à la loi marocaine <strong>n° 09-08</strong> et au règlement européen RGPD,
                            vous disposez des droits suivants :
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Droit d'accès à vos données personnelles</li>
                            <li>Droit de rectification</li>
                            <li>Droit à l'effacement (« droit à l'oubli »)</li>
                            <li>Droit à la portabilité</li>
                            <li>Droit d'opposition au traitement</li>
                            <li>Droit de révocation de l'accès OAuth YouCan (via votre dashboard YouCan → Apps)</li>
                        </ul>
                        <p className="mt-3">
                            Pour exercer ces droits, contactez-nous :{' '}
                            {DPO_EMAIL
                                ? <a href={`mailto:${DPO_EMAIL}`} className="text-indigo-600 font-medium">{DPO_EMAIL}</a>
                                : <Link to={PUBLIC_CONTACT_PATH} className="text-indigo-600 font-medium">via le formulaire de contact</Link>}
                        </p>
                        {/* Affirmer une déclaration CNDP non déposée serait une fausse
                            déclaration sur une page légale publique. Voir docs/LAUNCH_AUDIT.md. */}
                        {CNDP_DECLARED && (
                            <p className="mt-2 text-sm text-gray-500">
                                Ce traitement a fait l'objet d'une déclaration auprès de la <strong>CNDP</strong>
                                {' '}(Commission Nationale de contrôle de la protection des Données à caractère Personnel).
                            </p>
                        )}
                    </section>

                    {/* Section 7 */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies</h2>
                        <p>
                            Ce site utilise des cookies strictement nécessaires au fonctionnement de l'application
                            (authentification, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
                        </p>
                    </section>

                </div>

                <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} BayIIn Retail OS
                    {DPO_EMAIL && <> · <a href={`mailto:${DPO_EMAIL}`} className="hover:text-gray-600">{DPO_EMAIL}</a></>}
                    {' '}·{' '}
                    <Link to="/terms" className="hover:text-gray-600">Conditions d'utilisation</Link>
                </div>
            </div>
        </div>
    );
}
