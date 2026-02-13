import { test, expect } from '@playwright/test';
import { getSeedProPublicId, API_BASE } from './fixtures';

test.describe('Pro public page', () => {
  test('pro detail page loads and shows expected content', async ({ page, request }) => {
    // 1. Get a real pro publicId from catalog
    const proPublicId = await getSeedProPublicId(request);
    expect(proPublicId).toMatch(/^pro_[0-9a-f]{32}$/);

    // 2. Navigate to pro detail page
    const baseURL = process.env.E2E_WEB_BASE_URL || 'http://localhost:3000';
    const res = await page.goto(`${baseURL}/pro/${proPublicId}`, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);

    // 3. Assert URL contains pro_ prefix (publicId, not cuid)
    expect(page.url()).toContain(`/pro/pro_`);

    // 4. Assert h1 is visible with pro name
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    expect(h1Text?.length).toBeGreaterThan(0);

    // 5. Assert "Services proposés" section visible
    const servicesHeading = page.getByText('Services proposés');
    await expect(servicesHeading).toBeVisible();
  });

  test('catalog returns only pro_ publicIds (no cuid leak)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/public/pros`);
    expect(res.ok()).toBeTruthy();
    const pros = await res.json();
    const list = Array.isArray(pros) ? pros : pros.data;

    for (const pro of list) {
      expect(pro.id).toMatch(/^pro_/);
      // Must not be a cuid
      expect(pro.id).not.toMatch(/^c[a-z0-9]{24}$/);
    }
  });
});
