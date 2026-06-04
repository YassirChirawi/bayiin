/**
 * useVoiceCopilot — Hook de commande vocale pour Beya3 AI
 * 
 * Features:
 * - Web Speech API (SpeechRecognition)
 * - Support multi-langue (fr-FR, ar-MA)
 * - Résultats intermédiaires en temps réel
 * - Mode auto-send (envoie automatiquement après silence)
 * - Gestion d'état robuste (idle, listening, processing, error, unsupported)
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const SUPPORTED_LANGUAGES = {
    fr: 'fr-FR',
    ar: 'ar-MA',
    en: 'en-US'
};

export function useVoiceCopilot({ language = 'fr', autoSend = false, onTranscript = null, onFinalResult = null } = {}) {
    const [status, setStatus] = useState('idle'); // idle | listening | processing | error | unsupported
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const autoSendTimerRef = useRef(null);

    // Initialize SpeechRecognition on mount
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setIsSupported(false);
            setStatus('unsupported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.fr;

        recognition.onstart = () => {
            setStatus('listening');
            setError(null);
            setInterimTranscript('');
        };

        recognition.onend = () => {
            setStatus('idle');
            setInterimTranscript('');
        };

        recognition.onerror = (event) => {
            const errorMessages = {
                'no-speech': 'Aucune voix détectée. Réessayez.',
                'audio-capture': 'Aucun micro détecté.',
                'not-allowed': 'Accès au micro refusé. Vérifiez les permissions.',
                'network': 'Erreur réseau.',
                'aborted': null, // User cancelled, no need to show error
            };
            
            const msg = errorMessages[event.error] || `Erreur: ${event.error}`;
            if (msg) {
                setError(msg);
                setStatus('error');
            } else {
                setStatus('idle');
            }
        };

        recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            if (interimText) {
                setInterimTranscript(interimText);
            }

            if (finalText) {
                setTranscript(prev => {
                    const newTranscript = prev + (prev ? ' ' : '') + finalText.trim();
                    onTranscript?.(newTranscript);
                    return newTranscript;
                });
                setInterimTranscript('');

                // Auto-send mode: wait 1.5s of silence then call onFinalResult
                if (autoSend && onFinalResult) {
                    clearTimeout(autoSendTimerRef.current);
                    autoSendTimerRef.current = setTimeout(() => {
                        setTranscript(current => {
                            if (current.trim()) {
                                onFinalResult(current.trim());
                            }
                            return '';
                        });
                    }, 1500);
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            clearTimeout(autoSendTimerRef.current);
            try { recognition.abort(); } catch (e) { /* noop */ }
        };
    }, [language, autoSend, onTranscript, onFinalResult]);

    // Update language dynamically
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.fr;
        }
    }, [language]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) return;
        setError(null);
        setTranscript('');
        setInterimTranscript('');
        try {
            recognitionRef.current.start();
        } catch (err) {
            // Already started, stop and restart
            try {
                recognitionRef.current.stop();
                setTimeout(() => {
                    try { recognitionRef.current.start(); } catch (e) { /* noop */ }
                }, 100);
            } catch (e) { /* noop */ }
        }
    }, []);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        try {
            recognitionRef.current.stop();
        } catch (e) { /* noop */ }
    }, []);

    const toggleListening = useCallback(() => {
        if (status === 'listening') {
            stopListening();
        } else {
            startListening();
        }
    }, [status, startListening, stopListening]);

    const clearTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        // State
        status,
        isListening: status === 'listening',
        isSupported,
        transcript,
        interimTranscript,
        displayText: transcript + (interimTranscript ? ` ${interimTranscript}` : ''),
        error,

        // Actions
        startListening,
        stopListening,
        toggleListening,
        clearTranscript,
    };
}
