import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../locales/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    // Default to French if no preference, or detect browser? 
    // User seems to prefer French / mixed. Let's default to 'fr' based on latest request.
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem("language") || "fr";
    });

    useEffect(() => {
        localStorage.setItem("language", language);
    }, [language]);

    // Translation function
    const t = (key, params = {}) => {
        let text = translations[language][key] || key;

        // Simple interpolation
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
            });
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
