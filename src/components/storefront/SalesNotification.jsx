import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MapPin } from 'lucide-react';

export default function SalesNotification({ theme, realData = false, productName = "ce produit" }) {
    const [visible, setVisible] = useState(false);
    const [currentSale, setCurrentSale] = useState(null);

    // Mock Data for "Fake Sales" social proof (Very common in dropshipping)
    const mockNames = ['Amine', 'Yassine', 'Sara', 'Fatima', 'Karim', 'Aya', 'Mohammed', 'Ilyas'];
    const mockCities = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir', 'Fès', 'Oujda'];
    const mockTime = ['il y a 2 minutes', 'il y a 5 minutes', 'à l\'instant', 'il y a 10 minutes', 'il y a 1 heure'];

    useEffect(() => {
        // Show a notification every 15-30 seconds
        const triggerNotification = () => {
            const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
            const randomCity = mockCities[Math.floor(Math.random() * mockCities.length)];
            const randomTime = mockTime[Math.floor(Math.random() * mockTime.length)];

            setCurrentSale({ name: randomName, city: randomCity, time: randomTime });
            setVisible(true);

            // Hide after 5 seconds
            setTimeout(() => {
                setVisible(false);
            }, 5000);
        };

        // Initial delay
        const initialTimer = setTimeout(triggerNotification, 3000);
        
        // Recurring loop
        const interval = setInterval(() => {
            triggerNotification();
        }, Math.floor(Math.random() * 15000) + 15000); // 15s to 30s interval

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);

    return (
        <AnimatePresence>
            {visible && currentSale && (
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.9 }}
                    className="fixed bottom-20 left-4 md:bottom-6 md:left-6 bg-white shadow-2xl rounded-2xl p-4 border border-slate-100 flex items-start gap-3 z-50 w-72"
                >
                    <div className="shrink-0 bg-emerald-100 text-emerald-600 p-2 rounded-full">
                        <CheckCircle2 size={20} className="fill-current text-emerald-500 bg-white rounded-full" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">
                            {currentSale.name} <span className="font-normal text-slate-500">vient d'acheter</span>
                        </div>
                        <div className="text-sm font-medium text-slate-700 truncate w-48 mb-1">
                            {productName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {currentSale.city}</span>
                            <span>•</span>
                            <span>{currentSale.time}</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
