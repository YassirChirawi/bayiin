const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Yassir Chirawi\\.gemini\\antigravity\\scratch\\commerce-saas\\src\\locales\\translations.js';
const content = fs.readFileSync(filePath, 'utf8');

// Use regex to extract the main translations object
// This is a bit tricky because the file contains nested objects
// We want to process 'en', 'fr', 'ar' separately

function cleanLanguage(content, langCode) {
    const startMarker = `${langCode}: {`;
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return content;

    // Find the matching closing brace for this language
    let braceCount = 0;
    let endIndex = -1;
    for (let i = startIndex + startMarker.length - 1; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIndex = i;
                break;
            }
        }
    }

    if (endIndex === -1) return content;

    const langContent = content.substring(startIndex + startMarker.length, endIndex);
    
    // Split by lines and parse keys
    const lines = langContent.split('\n');
    const seenKeys = new Map();
    const resultLines = [];

    // First pass: identify all keys and their last line index
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^\s*([a-zA-Z0-9_]+):/);
        if (match) {
            seenKeys.set(match[1], i);
        }
    }

    // Second pass: only keep the last occurrence or non-key lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^\s*([a-zA-Z0-9_]+):/);
        if (match) {
            if (seenKeys.get(match[1]) === i) {
                resultLines.push(line);
            } else {
                // Skip duplicate key line
                // But keep comments if they are on that line?
                // Usually keys are one per line in this file
            }
        } else {
            resultLines.push(line);
        }
    }

    const newLangContent = resultLines.join('\n');
    return content.substring(0, startIndex + startMarker.length) + newLangContent + content.substring(endIndex);
}

let cleaned = content;
cleaned = cleanLanguage(cleaned, 'en');
cleaned = cleanLanguage(cleaned, 'fr');
cleaned = cleanLanguage(cleaned, 'ar');

fs.writeFileSync(filePath, cleaned);
console.log('Cleaned translations.js');
