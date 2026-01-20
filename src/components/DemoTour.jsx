import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DemoTour({ steps, isOpen, onClose }) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    if (!isOpen) return null;

    const currentStep = steps[currentStepIndex];

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onClose(); // Finish
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop - Optional: Make it dark to focus attention */}
            {/* <div className="absolute inset-0 bg-black/20" /> */}

            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 bg-white rounded-xl shadow-2xl border border-indigo-100 p-5 w-80 pointer-events-auto"
                    style={{
                        top: currentStep.position.top,
                        left: currentStep.position.left,
                        right: currentStep.position.right,
                        bottom: currentStep.position.bottom,
                    }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3 mb-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mt-1">
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{currentStep.title}</h3>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                {currentStep.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pl-1">
                        <div className="flex gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={currentStepIndex === 0}
                                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-200 transition-all"
                            >
                                {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
                                {currentStepIndex < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Little Triangle Pointer (Approximated) */}
                    {/* Only showing simple box for robustness, can add popper.js later if needed */}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
