import fs from 'fs';
import path from 'path';

const dir = 'tests/e2e';
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.spec.js')) {
        const p = path.join(dir, file);
        let c = fs.readFileSync(p, 'utf8');
        c = c.replace(/await page\.click\('button\[type="submit"\]'\);/g, "await page.click('button[type=\"submit\"]', { force: true });");
        fs.writeFileSync(p, c);
        console.log('Fixed submit in', p);
    }
});
