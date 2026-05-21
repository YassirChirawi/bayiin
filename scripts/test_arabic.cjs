const fs = require('fs');
let content = fs.readFileSync('src/locales/translations.js', 'utf8');

const arIndex = content.indexOf('ar: {');
const arSection = content.substring(arIndex);

const match = arSection.match(/help_customers_intro: "([^"]+)"/);
if (match) {
    const badText = match[1];
    console.log("Found bad text:", badText);
    
    // Try to decode it
    const buf = Buffer.from(badText, 'latin1');
    const goodText = buf.toString('utf8');
    
    console.log("Good text:", goodText);
} else {
    console.log("Not found");
}
