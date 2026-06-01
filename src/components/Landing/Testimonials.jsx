import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: "Karim M.",
    role: "Fondateur, Argan Beauty",
    content: "BayIIn a littéralement sauvé ma trésorerie. L'IA m'a alerté d'un déficit imminent sur mes pubs Facebook. Le système de confirmation WhatsApp a divisé mes retours par deux.",
    rating: 5,
    image: "https://i.pravatar.cc/150?u=karim"
  },
  {
    name: "Yassine B.",
    role: "Gérant, Sneakerz MA",
    content: "Je gérais tout sur des fichiers Excel. Maintenant, mes 3 livreurs ont l'application BayIIn sur leur téléphone et je suis leurs encaissements en temps réel. Un vrai game-changer.",
    rating: 5,
    image: "https://i.pravatar.cc/150?u=yassine"
  },
  {
    name: "Salma R.",
    role: "Créatrice, Hijab Style",
    content: "Ce que j'aime le plus, c'est Beya3 l'IA. Je lui demande 'Quel produit va bientôt manquer ?' et elle me fait une liste avec des recommandations de commande. C'est comme avoir un directeur financier.",
    rating: 5,
    image: "https://i.pravatar.cc/150?u=salma"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-gray-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
      <div className="absolute -left-[20%] top-[20%] w-[40%] h-[40%] bg-primary-100/50 rounded-full blur-3xl"></div>
      <div className="absolute -right-[20%] bottom-[20%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ils ont transformé leur e-commerce
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez comment les marchands marocains utilisent BayIIn pour automatiser et développer leur activité.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 relative group hover:-translate-y-1 transition-transform"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary-100 group-hover:text-primary-200 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-700 mb-8 leading-relaxed relative z-10">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-4 mt-auto">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="w-12 h-12 rounded-full ring-2 ring-primary-50 object-cover"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
