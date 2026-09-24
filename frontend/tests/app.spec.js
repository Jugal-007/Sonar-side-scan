import { test, expect } from '@playwright/test';

test.describe('MarineGuard AI Platform', () => {
  test('has title and renders dashboard', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/MarineGuard AI/);

    // Sidebar should have the project name
    const sidebarTitle = page.locator('text=MarineGuardAI').first();
    await expect(sidebarTitle).toBeVisible();

    // Dashboard title should be visible
    const dashTitle = page.locator('text=System Overview').first();
    await expect(dashTitle).toBeVisible();
    
    // Check if KPI cards are rendered
    const kpiCards = page.locator('.glass-panel');
    await expect(kpiCards.first()).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Click on Sonar Analysis link in sidebar
    await page.click('text=Sonar Analysis');
    
    // Verify we are on Analysis page
    await expect(page).toHaveURL(/.*analysis/);
    await expect(page.locator('text=Upload Source').first()).toBeVisible();

    // Click on Live Simulation
    await page.click('text=Live Simulation');
    await expect(page).toHaveURL(/.*live/);
  });
});
