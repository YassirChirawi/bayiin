import fs from 'fs';
const filename = 'sendit_api_full.json';
try {
    const data = fs.readFileSync(filename, 'utf8');
    const json = JSON.parse(data);
    if (json.paths) {
        console.log(JSON.stringify(Object.keys(json.paths), null, 2));
    } else {
        console.log('No paths found in JSON');
    }
} catch (err) {
    console.error('Error:', err.message);
}
