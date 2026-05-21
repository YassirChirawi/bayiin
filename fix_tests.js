const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'tests', 'e2e');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.js') && f !== 'global.spec.js');

const robustLogin = `async function login(page) {
    await page.goto('/login');
    await page.waitForLoadState('load');

    // 1. Accept Cookies
    try {
        const btn = page.getByRole('button', { name: /J'accepte|Accept/i });
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click({ force: true });
        await page.locator('.animate-slide-up').waitFor({ state: 'hidden', timeout: 3000 });
    } catch (e) { /* ignore */ }
    
    // 2. Handle Role Picker
    try {
        const magasinBtn = page.getByText('Magasin').first();
        await magasinBtn.waitFor({ state: 'visible', timeout: 5000 });
        await magasinBtn.click();
    } catch (e) {
        try {
            const roleBtn = page.getByTestId('role-owner-button');
            if (await roleBtn.isVisible()) {
                 await roleBtn.click();
            }
        } catch(err) {}
    }
    
    // 3. Fill Credentials
    await page.waitForSelector('input[type="email"], [data-testid="login-email"]', { timeout: 15000 });
    const emailInput = await page.$('input[type="email"]') ? 'input[type="email"]' : '[data-testid="login-email"]';
    const passwordInput = await page.$('input[type="password"]') ? 'input[type="password"]' : '[data-testid="login-password"]';
    
    const emailVar = typeof TEST_EMAIL !== 'undefined' ? TEST_EMAIL : (typeof envEmail !== 'undefined' ? envEmail : process.env.TEST_EMAIL || 'amadou@abadou.com');
    const passVar = typeof TEST_PASSWORD !== 'undefined' ? TEST_PASSWORD : (typeof envPassword !== 'undefined' ? envPassword : process.env.TEST_PASSWORD || 'Amadou123!');
    
    await page.fill(emailInput, emailVar);
    await page.fill(passwordInput, passVar);
    
    // 4. Submit
    await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {}),
        page.click('button[type="submit"]')
    ]);
}`;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regex to match the login function block
    // We match 'async function login(page) {' until the next '}' that matches indentation?
    // It's safer to just replace everything from 'async function login(page)' to the line before 'test.describe' or 'test.beforeEach'
    const loginRegex = /async function login\(page\)\s*\{[\s\S]*?\n\}/g;
    
    if (loginRegex.test(content)) {
        content = content.replace(loginRegex, robustLogin);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed ' + file);
    } else {
        console.log('No login function found or already modified in ' + file);
    }
}
