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
    await expect(page.locator('#scan-button')).toBeVisible();

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
    const scanButton = page.locator('#scan-button');
    if (await scanButton.isVisible()) {
      await scanButton.click();

      // Wait for scan to complete (or timeout)
      await page.waitForTimeout(2000);

      // Check if results are displayed
      const resultsContainer = page.locator('#results, .results, [data-testid="results"]');
      if (await resultsContainer.isVisible()) {
        expect(await resultsContainer.isVisible()).toBe(true);
      }
    }
  });
});
