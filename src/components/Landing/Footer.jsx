import React from 'react';
import { PackageSearch, Facebook, Instagram, Twitter, Linkedin, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SOCIALS, PUBLIC_CONTACT_PATH } from '../../config/brand';

export default function Footer() {
  return (
    <footer className="bg-gray-900 pt-20 pb-10 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 text-white mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <PackageSearch className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                BayIIn
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              La plateforme e-commerce tout-en-un conçue pour les marchands marocains. Automatisez vos ventes, optimisez votre logistique et prenez de meilleures décisions avec l'IA.
            </p>
            {/* Seuls les réseaux réellement ouverts sont affichés : une icône en
                href="#" est un cul-de-sac. Voir docs/LAUNCH_AUDIT.md. */}
            {(SOCIALS.facebook || SOCIALS.instagram || SOCIALS.linkedin) && (
              <div className="flex gap-4">
                {SOCIALS.facebook && (
                  <a href={SOCIALS.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {SOCIALS.instagram && (
                  <a href={SOCIALS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {SOCIALS.linkedin && (
                  <a href={SOCIALS.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Produit</h4>
            <ul className="space-y-4">
              <li><a href="#features" className="hover:text-primary-400 transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-primary-400 transition-colors">Tarifs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Ressources</h4>
            <ul className="space-y-4">
              <li><a href="#faq" className="hover:text-primary-400 transition-colors">Centre d'aide (FAQ)</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Entreprise</h4>
            <ul className="space-y-4">
              <li><Link to={PUBLIC_CONTACT_PATH} className="hover:text-primary-400 transition-colors">Contactez-nous</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-400 transition-colors">Politique de confidentialité</Link></li>
              <li><Link to="/terms" className="hover:text-primary-400 transition-colors">Conditions générales</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} BayIIn. Tous droits réservés.
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Fait avec <Heart className="w-4 h-4 text-red-500 fill-red-500" /> au Maroc
          </p>
        </div>
      </div>
    </footer>
  );
}
