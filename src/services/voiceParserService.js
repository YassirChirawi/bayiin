/**
 * Voice Parser Service
 * Extracts order entities from raw speech text using local heuristics.
 */

import { MOROCCAN_CITIES } from "../utils/moroccanCities";

export const parseVoiceOrder = (text, products = []) => {
    const entities = {
        clientName: "",
        clientPhone: "",
        clientCity: "",
        productName: "",
        price: "",
        quantity: 1
    };

    const lowerText = text.toLowerCase();

    // 1. Extract Phone (Moroccan format)
    const phoneMatch = text.match(/0[567]\d{8}/) || text.match(/0[567]\s\d{2}\s\d{2}\s\d{2}\s\d{2}/);
    if (phoneMatch) {
        entities.clientPhone = phoneMatch[0].replace(/\s/g, '');
    }

    // 2. Extract City
    for (const city of MOROCCAN_CITIES) {
        if (lowerText.includes(city.toLowerCase())) {
            entities.clientCity = city;
            break;
        }
    }

    // 3. Extract Price
    const priceMatch = text.match(/(\d+)\s?(dh|dirham|dhs)/i);
    if (priceMatch) {
        entities.price = priceMatch[1];
    }

    // 4. Extract Product (Match against known product names)
    for (const product of products) {
        if (lowerText.includes(product.name.toLowerCase())) {
            entities.productName = product.name;
            entities.productId = product.id;
            break;
        }
    }

    // 5. Extract Name (Heuristic: usually at the beginning or after 'client'/'nom')
    // This is the hardest part without LLM, but we can try basic splits
    const nameKeywords = ["client", "nom", "monsieur", "madame"];
    for (const kw of nameKeywords) {
        if (lowerText.includes(kw)) {
            const parts = lowerText.split(kw);
            if (parts[1]) {
                const words = parts[1].trim().split(' ');
                entities.clientName = words.slice(0, 2).join(' '); // Take next 2 words
                break;
            }
        }
    }

    return entities;
};
