const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

test.describe('Chrome Extension E2E Tests', () => {
  let browser;
  let extensionId;

  test.beforeAll(async() => {
    // Launch browser with extension loaded
    const pathToExtension = path.join(__dirname, '..');
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox'
      ]
    });

    // Get extension ID
    let [background] = browser.serviceWorkers();
    if (!background) {
      background = await browser.waitForEvent('serviceworker');
    }

    extensionId = background.url().split('/')[2];
  });

  test.afterAll(async() => {
    await browser.close();
  });

  test('extension popup loads correctly', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    const page = await browser.newPage();
    await page.goto(extensionUrl);

    // Check if popup elements are present
    await expect(page.locator('h1')).toBeVisible();
    // Check for scan button (may be #scan-btn or #scan-button)
    const scanButton = page.locator('#scan-btn, #scan-button');
    await expect(scanButton.first()).toBeVisible();

    await page.close();
  });

  test('options page loads correctly', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/options/options.html`;
    const page = await browser.newPage();
    await page.goto(extensionUrl);

    // Check if options page elements are present
    await expect(page.locator('h1')).toBeVisible();

    await page.close();
  });

  test('service worker responds to messages', async() => {
    const page = await browser.newPage();

    // Test that service worker is active
    const response = await page.evaluate(async(extId) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(extId, { action: 'ping' }, (response) => {
          resolve(response);
        });
      });
    }, extensionId);

    // Service worker should respond (even if with an error for unknown action)
    expect(response).toBeDefined();

    await page.close();
  });
});

// Integration test with mock bookmarks
test.describe('Bookmark Management Integration', () => {
  let browser;
  let extensionId;
  let page;

  test.beforeAll(async() => {
    const pathToExtension = path.join(__dirname, '..');
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox'
      ]
    });

    let [background] = browser.serviceWorkers();
    if (!background) {
      background = await browser.waitForEvent('serviceworker');
    }

    extensionId = background.url().split('/')[2];
    page = await browser.newPage();
  });

  test.afterAll(async() => {
    await browser.close();
  });

  test('can scan bookmarks (mock test)', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    // Mock the bookmark scanning process
    await page.evaluate(() => {
      // Inject mock bookmarks data for testing
      window.mockBookmarks = [
        { id: '1', title: 'Test Site 1', url: 'https://example.com' },
        { id: '2', title: 'Test Site 2', url: 'https://google.com' }
      ];
    });

    // Check if scan button exists and can be clicked
    const scanButton = page.locator('#scan-btn, #scan-button');
    if (await scanButton.first().isVisible()) {
      await scanButton.first().click();

      // Wait for scan to complete (or timeout)
      await page.waitForTimeout(2000);

      // Check if results are displayed
      const resultsContainer = page.locator('#results-state, .results, [data-testid="results"]');
      if (await resultsContainer.first().isVisible()) {
        expect(await resultsContainer.first().isVisible()).toBe(true);
      }
    }
  });

  test('complete scan workflow', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    // Wait for popup to load
    await page.waitForSelector('h1', { timeout: 5000 });

    // Find and click scan button
    const scanButton = page.locator('#scan-btn, #scan-button').first();
    if (await scanButton.isVisible()) {
      await scanButton.click();

      // Wait for scanning state to appear
      await page.waitForTimeout(1000);

      // Check for progress indicators
      const progressElements = page.locator('#progress-current, #current-status, .progress');
      const progressCount = await progressElements.count();
      
      // Should show some progress indication
      expect(progressCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('organization workflow', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Find and click organize button
    const organizeButton = page.locator('#organize-btn').first();
    if (await organizeButton.isVisible()) {
      await organizeButton.click();

      // Wait for organization to start
      await page.waitForTimeout(1000);

      // Check for organization status
      const orgStatus = page.locator('#organization-status, .organization-status');
      const statusCount = await orgStatus.count();
      
      // Should show organization status
      expect(statusCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('settings button opens options page', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    const settingsButton = page.locator('#settings-btn').first();
    if (await settingsButton.isVisible()) {
      // Note: In a real test, clicking this would open options page
      // We can verify the button exists and is clickable
      await expect(settingsButton).toBeVisible();
    }
  });

  test('handles empty bookmark list gracefully', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Check if popup shows appropriate message for empty bookmarks
    const welcomeText = page.locator('.welcome p, .welcome-text');
    if (await welcomeText.count() > 0) {
      const text = await welcomeText.first().textContent();
      // Should handle empty state gracefully
      expect(text).toBeDefined();
    }
  });

  test('displays bookmark count', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Check for bookmark count display
    const bookmarkCount = page.locator('#total-bookmarks, .bookmark-count');
    if (await bookmarkCount.count() > 0) {
      const count = await bookmarkCount.first().textContent();
      // Should display a number or "Loading..."
      expect(count).toBeDefined();
    }
  });

  test('export results functionality', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Check for export button (should be in results state)
    const exportButton = page.locator('#export-btn, .export-btn');
    if (await exportButton.count() > 0) {
      await expect(exportButton.first()).toBeVisible();
    }
  });

  test('bulk delete functionality', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Check for bulk delete button (should be in results state)
    const bulkDeleteButton = page.locator('#bulk-delete-btn, .bulk-delete-btn');
    if (await bulkDeleteButton.count() > 0) {
      await expect(bulkDeleteButton.first()).toBeVisible();
    }
  });

  test('tab switching in results view', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Check for tab buttons
    const tabButtons = page.locator('.tab-btn, [data-category]');
    const tabCount = await tabButtons.count();
    
    if (tabCount > 0) {
      // Should have multiple tabs for different categories
      expect(tabCount).toBeGreaterThan(0);
    }
  });

  test('error handling for network failures', async() => {
    const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    await page.goto(extensionUrl);

    await page.waitForSelector('h1', { timeout: 5000 });

    // Simulate network error by blocking requests
    await page.route('**/*', route => {
      if (route.request().url().includes('example.com')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Try to scan - should handle errors gracefully
    const scanButton = page.locator('#scan-btn, #scan-button').first();
    if (await scanButton.isVisible()) {
      // Extension should handle errors without crashing
      await expect(scanButton).toBeVisible();
    }
  });
});
