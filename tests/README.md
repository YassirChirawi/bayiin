# BayIIn E2E Tests (Playwright)

End-to-end tests for critical user flows.

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Open the interactive Playwright UI
npm run test:e2e:ui

# Run Vitest unit tests + Playwright E2E
npm run test:all
```

## Structure

- `tests/unit/`  — Pure logic tests (Vitest)
- `tests/e2e/`   — Full flow tests (Playwright + Chromium)

## Adding a Test

Create a `.spec.js` file in `tests/e2e/`:

```js
import { test, expect } from '@playwright/test';

test('page title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/BayIIn/);
});
```
