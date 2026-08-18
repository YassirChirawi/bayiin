const fs = require('fs');

const file = fs.readFileSync('src/locales/translations.js', 'utf8');
const translated = JSON.parse(fs.readFileSync('missing_ar_translated.json', 'utf8'));

let arStr = '';
Object.keys(translated).forEach(k => {
    // Escape quotes and newlines
    const safeStr = translated[k].replace(/"/g, '\\"').replace(/\n/g, '\\n');
    arStr += `        ${k}: "${safeStr}",\n`;
});

const newFile = file.replace('        // Landing Page - Arabic', '        // Generated Fallbacks\n' + arStr + '        // Landing Page - Arabic');
fs.writeFileSync('src/locales/translations.js', newFile);

console.log("Translations injected successfully.");
