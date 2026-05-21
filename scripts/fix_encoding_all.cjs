const fs = require('fs');
const path = require('path');

const replacements = {
    // General Character replacements (Safe)
    'ÃƒÂ©': 'é',
    'ÃƒÂ¨': 'è',
    'ÃƒÂª': 'ê',
    'ÃƒÂ ': 'à ',
    'ÃƒÂ\t': 'à\t',
    'ÃƒÂ\n': 'à\n', // Sometimes à is followed by space, tab, or newline
    'Ãƒâ€°': 'É',
    'ÃƒÂ´': 'ô',
    'ÃƒÂ§': 'ç',
    'ÃƒÂ®': 'î',
    'ÃƒÂ¯': 'ï',
    'ÃƒÂ»': 'û',
    'ÃƒÂ¹': 'ù',
    'Ã¢â‚¬â„¢': '’',
    'Ã¢â‚¬Â¦': '…',
    'Ã¢â€šÂ¬': '€',
    'Ã…â€œ': 'œ',
    'Ã‚Â°': '°',
    'ÃƒÅ ': 'Ê',
    'ÃƒÂ¢': 'â',
    // Exact Arabic string replacement
    'Ã˜Â¨Ã˜Â§Ã™Å\xa0Ã˜Â¹Ã™Å\xa0Ã™â€\xa0.. Ã˜Â¨Ã˜Â§Ã˜Â´ Ã™Å\xa0Ã˜Â¨Ã™â€šÃ™â€° Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â²Ã™â€š Ã˜Â¨Ã˜Â§Ã™Å\xa0Ã™â€\xa0 Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â\xadÃ˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â¨Ã˜Â§Ã™Å\xa0Ã™â€\xa0.': 'بايعين.. باش يبقى الرزق باين والحساب باين.',
    'Ã˜Â¨Ã˜Â§Ã™Å Ã˜Â¹Ã™Å Ã™â€ .. Ã˜Â¨Ã˜Â§Ã˜Â´ Ã™Å Ã˜Â¨Ã™â€šÃ™â€° Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â²Ã™â€š Ã˜Â¨Ã˜Â§Ã™Å Ã™â€  Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â¨Ã˜Â§Ã™Å Ã™â€ .': 'بايعين.. باش يبقى الرزق باين والحساب باين.', // Different variation of spaces/non-printable chars
    'Ã¢Â Â¤Ã¯Â¸Â ': '❤️',
    'Ã°Å¸â€¡Â²Ã°Å¸â€¡Â¦': '🇲🇦',
    'Ã°Å¸â€˜â€¹': '👋',
    'Ã°Å¸Å¡â‚¬': '🚀'
};

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            if(file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('src');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    
    // Catch-all for "ÃƒÂ" meaning "à" if it's followed by punctuation or other things
    // e.g. "grÃƒÂ¢ce" -> "grâce", wait I handled "â" as 'ÃƒÂ¢'
    content = content.replace(/ÃƒÂ([^a-zA-Z0-9])/g, 'à$1');
    content = content.replace(/ÃƒÂ([^a-zA-Z0-9])/g, 'à$1'); // in case of overlapping

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed encoding in:', file);
    }
}

console.log('Encoding fix completed.');
