
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousel({ slides }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    };

    return (
        <div className="relative group">
            <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden aspect-video">
                {/* Browser Window Header */}
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2 z-20 relative">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-md border border-slate-200 text-xs font-medium text-slate-500 shadow-sm transition-all duration-300">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {slides[currentIndex].title}
                        </div>
                    </div>
                    <div className="w-16"></div>
                </div>

                {/* Slides */}
                <div className="relative w-full h-full bg-slate-50 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0"
                        >
                            <img
                                src={slides[currentIndex].image}
                                alt={slides[currentIndex].title}
                                className="w-full h-full object-cover object-top"
                            />
                            {/* Gradient Overlay for Text Readability if needed, but clean is better */}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Caption Overlay - Optional */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-4 border-t border-slate-100 flex justify-between items-center transition-opacity duration-300">
                    <p className="text-sm font-medium text-slate-700">
                        {slides[currentIndex].description}
                    </p>
                    <div className="flex gap-1">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-indigo-600 w-4' : 'bg-slate-300 hover:bg-slate-400'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <button
                onClick={prevSlide}
                className="absolute top-1/2 -left-4 md:-left-12 -translate-y-1/2 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={nextSlide}
                className="absolute top-1/2 -right-4 md:-right-12 -translate-y-1/2 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}
