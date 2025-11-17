/**
 * Background service worker for the Chrome Bookmark Assistant extension
 */

// Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Chrome Bookmark Assistant installed:', details.reason);

  if (details.reason === 'install') {
    // Set up default settings
    chrome.storage.sync.set({
      settings: {
        autoCheck: false,
        checkFrequency: 'weekly',
        notifications: true,
        autoDelete: false
      }
    });

    // Show welcome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'Chrome Bookmark Assistant',
      message: 'Extension installed! Click the icon to start checking your bookmarks.'
    });
  }
});

// Handle alarm events for scheduled scans
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);

  if (alarm.name === 'bookmark-health-check') {
    performScheduledScan();
  }
});

// Handle bookmark changes
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('Bookmark created:', bookmark);
  // Could trigger a check of the new bookmark
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('Bookmark removed:', id);
  // Update stored scan results if needed
  updateScanResultsAfterDeletion(id);
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  switch (message.type) {
  case 'SCHEDULE_SCAN':
    scheduleNextScan(message.frequency);
    sendResponse({ success: true });
    break;

  case 'CANCEL_SCHEDULED_SCAN':
    cancelScheduledScan();
    sendResponse({ success: true });
    break;

  case 'GET_SETTINGS':
    getSettings().then(settings => sendResponse(settings));
    return true; // Keep message channel open for async response

  case 'UPDATE_SETTINGS':
    updateSettings(message.settings).then(() => sendResponse({ success: true }));
    return true;

  default:
    console.warn('Unknown message type:', message.type);
  }
});

/**
 * Perform a scheduled background scan
 */
async function performScheduledScan() {
  try {
    console.log('Starting scheduled bookmark scan...');

    const settings = await getSettings();
    if (!settings.autoCheck) {
      console.log('Auto-check is disabled, skipping scan');
      return;
    }

    // Import the BookmarkChecker (note: this is a simplified approach)
    // In a real implementation, you might need to use importScripts or modules
    const { BookmarkChecker } = await import('../utils/bookmark-checker.js');
    const checker = new BookmarkChecker();

    // Get all bookmarks
    const bookmarks = await checker.getAllBookmarks();

    if (bookmarks.length === 0) {
      console.log('No bookmarks found to scan');
      return;
    }

    // Perform a quick scan (smaller batch size for background)
    const results = await checker.checkMultipleBookmarks(bookmarks, null);
    const categorizedResults = checker.categorizeResults(results);

    // Count issues
    const issueCount = categorizedResults['connection-error'].length +
                      categorizedResults.timeout.length +
                      categorizedResults.unknown.length +
                      categorizedResults['check-failed'].length;

    // Update badge
    if (issueCount > 0) {
      chrome.action.setBadgeText({ text: issueCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    // Store results
    const scanResults = {
      timestamp: Date.now(),
      totalScanned: bookmarks.length,
      categories: categorizedResults,
      recommendations: checker.getDeletionRecommendations(categorizedResults)
    };

    await chrome.storage.local.set({
      lastScan: Date.now(),
      scanResults: scanResults,
      totalBookmarks: bookmarks.length
    });

    // Show notification if issues found
    if (settings.notifications && issueCount > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon48.png',
        title: 'Bookmark Issues Found',
        message: `Found ${issueCount} problematic bookmarks. Click to review.`
      });
    }

    console.log(`Scheduled scan completed. Found ${issueCount} issues.`);

  } catch (error) {
    console.error('Scheduled scan failed:', error);
  }
}

/**
 * Schedule the next automatic scan
 */
async function scheduleNextScan(frequency = 'weekly') {
  // Clear existing alarms
  await chrome.alarms.clear('bookmark-health-check');

  let delayInMinutes;
  let periodInMinutes;

  switch (frequency) {
  case 'daily':
    delayInMinutes = 60; // Start in 1 hour
    periodInMinutes = 24 * 60; // Every 24 hours
    break;
  case 'weekly':
    delayInMinutes = 60; // Start in 1 hour
    periodInMinutes = 7 * 24 * 60; // Every week
    break;
  case 'monthly':
    delayInMinutes = 60; // Start in 1 hour
    periodInMinutes = 30 * 24 * 60; // Every 30 days
    break;
  default:
    console.log('Invalid frequency or manual mode, not scheduling');
    return;
  }

  chrome.alarms.create('bookmark-health-check', {
    delayInMinutes,
    periodInMinutes
  });

  console.log(`Scheduled bookmark health check every ${frequency}`);
}

/**
 * Cancel scheduled scans
 */
async function cancelScheduledScan() {
  await chrome.alarms.clear('bookmark-health-check');
  console.log('Cancelled scheduled bookmark health checks');
}

/**
 * Get extension settings
 */
async function getSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || {
    autoCheck: false,
    checkFrequency: 'weekly',
    notifications: true,
    autoDelete: false
  };
}

/**
 * Update extension settings
 */
async function updateSettings(newSettings) {
  await chrome.storage.sync.set({ settings: newSettings });

  // Update scheduled scans based on new settings
  if (newSettings.autoCheck) {
    await scheduleNextScan(newSettings.checkFrequency);
  } else {
    await cancelScheduledScan();
  }

  console.log('Settings updated:', newSettings);
}

/**
 * Update scan results after a bookmark is deleted
 */
async function updateScanResultsAfterDeletion(deletedBookmarkId) {
  try {
    const result = await chrome.storage.local.get('scanResults');
    if (!result.scanResults) return;

    const scanResults = result.scanResults;
    let updated = false;

    // Remove the deleted bookmark from all categories
    Object.keys(scanResults.categories).forEach(category => {
      const originalLength = scanResults.categories[category].length;
      scanResults.categories[category] = scanResults.categories[category].filter(
        bookmark => bookmark.id !== deletedBookmarkId
      );
      if (scanResults.categories[category].length !== originalLength) {
        updated = true;
      }
    });

    if (updated) {
      await chrome.storage.local.set({ scanResults });

      // Update badge count
      const issueCount = scanResults.categories['connection-error'].length +
                        scanResults.categories.timeout.length +
                        scanResults.categories.unknown.length +
                        scanResults.categories['check-failed'].length;

      if (issueCount > 0) {
        chrome.action.setBadgeText({ text: issueCount.toString() });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('Error updating scan results after deletion:', error);
  }
}

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open the extension popup when notification is clicked
  chrome.action.openPopup();
});

/**
 * Handle extension icon clicks
 */
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup (default behavior)
  // Could also open a full page if needed
});

/**
 * Initialize on startup
 */
chrome.runtime.onStartup.addListener(async() => {
  console.log('Extension startup');

  const settings = await getSettings();
  if (settings.autoCheck) {
    await scheduleNextScan(settings.checkFrequency);
  }
});

// Initialize immediately when service worker starts
(async() => {
  const settings = await getSettings();
  if (settings.autoCheck) {
    await scheduleNextScan(settings.checkFrequency);
  }
})();
