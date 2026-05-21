const fs = require('fs');
const path = require('path');
const dir = 'tests/e2e';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.spec.js')) {
        const p = path.join(dir, file);
        let c = fs.readFileSync(p, 'utf8');
        c = c.replace(/if\s*\(\s*await\s+magasinBtn\.isVisible\(\{\s*timeout:\s*5000\s*\}\)\s*\)\s*\{\s*await\s+magasinBtn\.click\(\);\s*\}/g, 
                      "try { await magasinBtn.waitFor({ state: 'visible', timeout: 5000 }); await magasinBtn.click(); } catch (e) {}");
        fs.writeFileSync(p, c);
        console.log('Fixed', p);
    }
});
