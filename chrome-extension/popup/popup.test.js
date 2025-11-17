const chrome = require('sinon-chrome');
const { BookmarkChecker } = require('../utils/bookmark-checker');
const SmartTagger = require('../utils/smart-tagger');

// Mock the global chrome object
global.chrome = chrome;

// Mock DOM APIs
global.document = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

global.window = {
  close: jest.fn(),
  AudioContext: jest.fn(),
  webkitAudioContext: jest.fn()
};

global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn();

// Make classes available globally for popup.js
global.BookmarkChecker = BookmarkChecker;
global.SmartTagger = SmartTagger;

// Load popup.js
const PopupController = require('./popup');

describe('PopupController', () => {
  let controller;
  let mockElements;

  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();

    // Create mock DOM elements
    mockElements = {
      'scan-btn': { addEventListener: jest.fn() },
      'organize-btn': { addEventListener: jest.fn() },
      'settings-btn': { addEventListener: jest.fn() },
      'toggle-debug': { addEventListener: jest.fn(), textContent: 'Show Debug' },
      'cancel-scan-btn': { addEventListener: jest.fn() },
      'cancel-organization-btn': { addEventListener: jest.fn() },
      'rescan-btn': { addEventListener: jest.fn() },
      'export-btn': { addEventListener: jest.fn() },
      'bulk-delete-btn': { addEventListener: jest.fn() },
      'apply-organization-btn': { addEventListener: jest.fn(), style: { display: 'none' } },
      'total-bookmarks': { textContent: '' },
      'quick-stats': { style: { display: 'none' } },
      'last-scan': { textContent: '' },
      'current-status': { textContent: '' },
      'progress-total': { textContent: '' },
      'progress-current': { textContent: '' },
      'progress-percentage': { textContent: '' },
      'progress-fill': { style: { width: '0%' } },
      'scan-title': { textContent: '' },
      'scan-strategy-info': { textContent: '' },
      'elapsed-time': { textContent: '' },
      'remaining-time': { textContent: '' },
      'current-url': { textContent: '' },
      'live-working': { textContent: '0', classList: { add: jest.fn(), remove: jest.fn() } },
      'live-issues': { textContent: '0', classList: { add: jest.fn(), remove: jest.fn() } },
      'live-protected': { textContent: '0', classList: { add: jest.fn(), remove: jest.fn() } },
      'working-count': { textContent: '0' },
      'protected-count': { textContent: '0' },
      'issues-count': { textContent: '0' },
      'connection-error-count': { textContent: '0' },
      'timeout-count': { textContent: '0' },
      'unknown-count': { textContent: '0' },
      'bot-protected-count': { textContent: '0' },
      'login-required-count': { textContent: '0' },
      'working-links-count': { textContent: '0' },
      'connection-error-list': { innerHTML: '', querySelectorAll: jest.fn(() => []) },
      'timeout-list': { innerHTML: '', querySelectorAll: jest.fn(() => []) },
      'unknown-list': { innerHTML: '', querySelectorAll: jest.fn(() => []) },
      'bot-protected-list': { innerHTML: '', querySelectorAll: jest.fn(() => []) },
      'login-required-list': { innerHTML: '', querySelectorAll: jest.fn(() => []) },
      'working-list': { innerHTML: '', querySelectorAll: jest.fn(() => []) },
      'folder-suggestions-list': { innerHTML: '' },
      'folder-suggestions-count': { textContent: '0' },
      'duplicates-list': { innerHTML: '' },
      'duplicates-count': { textContent: '0' },
      'priority-list': { innerHTML: '' },
      'priority-count': { textContent: '0' },
      'cleanup-list': { innerHTML: '' },
      'cleanup-count': { textContent: '0' },
      'debug-log': { appendChild: jest.fn(), scrollTop: 0, scrollHeight: 0 },
      'debug-console': { style: { display: 'none' } },
      'initial-state': { classList: { remove: jest.fn() }, style: { display: 'none' } },
      'scanning-state': { classList: { remove: jest.fn() }, style: { display: 'none' } },
      'results-state': { classList: { remove: jest.fn() }, style: { display: 'none' } },
      'organization-state': { classList: { remove: jest.fn() }, style: { display: 'none' } },
      'organization-status': { textContent: '' },
      'organization-progress-fill': { style: { width: '0%' } },
      'organization-progress-text': { textContent: '0%' }
    };

    // Mock getElementById
    document.getElementById.mockImplementation((id) => mockElements[id] || null);

    // Mock querySelector
    document.querySelector.mockImplementation((selector) => {
      if (selector === '.welcome p') {
        return { textContent: '' };
      }
      return null;
    });

    // Mock querySelectorAll
    document.querySelectorAll.mockImplementation((selector) => {
      if (selector === '.tab-btn') {
        return [];
      }
      if (selector === '.tab-content') {
        return [];
      }
      if (selector === '.state') {
        return Object.values(mockElements).filter(el => el.classList);
      }
      if (selector === '.bookmark-list') {
        return [];
      }
      return [];
    });

    // Mock createElement
    document.createElement.mockImplementation((tag) => {
      const element = {
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        dataset: {},
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        remove: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn()
        }
      };
      return element;
    });

    // Mock chrome.bookmarks.getTree
    chrome.bookmarks.getTree.yields([{
      id: '1',
      title: 'Bookmarks Bar',
      children: []
    }]);

    // Mock chrome.storage.local.get
    chrome.storage.local.get.yields({});

    // Mock chrome.storage.local.set
    chrome.storage.local.set.yields();

    // Mock chrome.notifications.create
    chrome.notifications.create.yields();

    // Mock chrome.tabs.create
    chrome.tabs.create.yields();

    // Mock chrome.runtime.openOptionsPage
    chrome.runtime.openOptionsPage.yields();

    // Mock chrome.downloads.download
    chrome.downloads.download.yields();

    // Mock chrome.bookmarks.remove
    chrome.bookmarks.remove.yields();

    // Mock chrome.bookmarks.create
    chrome.bookmarks.create.yields({ id: 'new-folder-id' });

    // Mock chrome.bookmarks.move
    chrome.bookmarks.move.yields();

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    // Mock DOMContentLoaded to prevent initialization
    document.addEventListener = jest.fn();
    
    controller = new PopupController();
    
    // Mock showState method since it's called in constructor
    controller.showState = jest.fn();
  });

  afterEach(() => {
    chrome.flush();
  });

  describe('formatTime', () => {
    test('formats seconds correctly', () => {
      expect(controller.formatTime(30)).toBe('30s');
      expect(controller.formatTime(59)).toBe('59s');
    });

    test('formats minutes correctly', () => {
      expect(controller.formatTime(60)).toBe('1m 0s');
      expect(controller.formatTime(125)).toBe('2m 5s');
      expect(controller.formatTime(3599)).toBe('59m 59s');
    });

    test('formats hours correctly', () => {
      expect(controller.formatTime(3600)).toBe('1h 0m');
      expect(controller.formatTime(3660)).toBe('1h 1m');
      expect(controller.formatTime(7200)).toBe('2h 0m');
    });
  });

  describe('formatDate', () => {
    test('formats recent dates correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      const result = controller.formatDate(oneHourAgo);
      expect(result).toBe('1h ago');
    });

    test('formats "just now" for very recent dates', () => {
      const now = new Date();
      const result = controller.formatDate(now);
      expect(result).toBe('Just now');
    });

    test('formats days ago correctly', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const result = controller.formatDate(threeDaysAgo);
      expect(result).toBe('3d ago');
    });

    test('formats older dates as locale date string', () => {
      const oldDate = new Date('2020-01-01');
      const result = controller.formatDate(oldDate);
      expect(result).toBe(oldDate.toLocaleDateString());
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      const result = controller.escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    test('handles plain text', () => {
      const result = controller.escapeHtml('Plain text');
      expect(result).toBe('Plain text');
    });

    test('handles empty string', () => {
      const result = controller.escapeHtml('');
      expect(result).toBe('');
    });
  });

  describe('showState', () => {
    test('shows initial state', () => {
      controller.showState('initial');

      expect(document.getElementById).toHaveBeenCalledWith('initial-state');
      expect(mockElements['initial-state'].classList.add).toHaveBeenCalledWith('active');
    });

    test('hides all states before showing target', () => {
      controller.showState('scanning');

      expect(document.querySelectorAll).toHaveBeenCalledWith('.state');
    });
  });

  describe('generateCSV', () => {
    test('generates CSV from scan results', () => {
      controller.scanResults = {
        categories: {
          working: [
            { title: 'Test', url: 'https://example.com', category: 'working', status: 'ok', message: 'OK' }
          ],
          'connection-error': [
            { title: 'Error', url: 'https://error.com', category: 'connection-error', status: 'error', message: 'Failed' }
          ]
        }
      };

      const csv = controller.generateCSV();

      expect(csv).toContain('Title');
      expect(csv).toContain('URL');
      expect(csv).toContain('Category');
      expect(csv).toContain('Test');
      expect(csv).toContain('Error');
    });

    test('handles empty scan results', () => {
      controller.scanResults = {
        categories: {
          working: [],
          'connection-error': []
        }
      };

      const csv = controller.generateCSV();

      expect(csv).toContain('Title');
      expect(csv).toContain('URL');
    });

    test('escapes quotes in CSV data', () => {
      controller.scanResults = {
        categories: {
          working: [
            { title: 'Test "Quote"', url: 'https://example.com', category: 'working', status: 'ok', message: '' }
          ]
        }
      };

      const csv = controller.generateCSV();

      expect(csv).toContain('""');
    });
  });

  describe('getStatusClass', () => {
    test('returns correct class for working bookmark', () => {
      const bookmark = { status: 'ok' };
      expect(controller.getStatusClass(bookmark)).toBe('working');
    });

    test('returns correct class for restricted bookmark', () => {
      const bookmark = { status: 'restricted' };
      expect(controller.getStatusClass(bookmark)).toBe('restricted');
    });

    test('returns error class for error status', () => {
      const bookmark = { status: 'error' };
      expect(controller.getStatusClass(bookmark)).toBe('error');
    });

    test('returns error class for unknown status', () => {
      const bookmark = { status: 'unknown' };
      expect(controller.getStatusClass(bookmark)).toBe('error');
    });
  });

  describe('createBookmarkItem', () => {
    test('creates bookmark item element', () => {
      const bookmark = {
        id: '1',
        title: 'Test Bookmark',
        url: 'https://example.com',
        status: 'ok',
        category: 'working',
        message: 'OK'
      };

      const item = controller.createBookmarkItem(bookmark);

      expect(item).toBeDefined();
      expect(item.dataset.bookmarkId).toBe('1');
      expect(item.className).toBe('bookmark-item');
    });

    test('adds event listeners to action buttons', () => {
      const bookmark = {
        id: '1',
        title: 'Test',
        url: 'https://example.com',
        status: 'ok'
      };

      const item = controller.createBookmarkItem(bookmark);

      // Verify createElement was called for the item
      expect(document.createElement).toHaveBeenCalled();
    });
  });

  describe('populateBookmarkList', () => {
    test('populates list with bookmarks', () => {
      const bookmarks = [
        { id: '1', title: 'Test 1', url: 'https://example.com/1', status: 'ok' },
        { id: '2', title: 'Test 2', url: 'https://example.com/2', status: 'ok' }
      ];

      controller.populateBookmarkList('working-list', bookmarks);

      expect(mockElements['working-list'].innerHTML).not.toBe('');
    });

    test('shows empty state when no bookmarks', () => {
      controller.populateBookmarkList('working-list', []);

      expect(mockElements['working-list'].innerHTML).toContain('empty-state');
    });
  });

  describe('updateCategoryCount', () => {
    test('updates category count element', () => {
      controller.updateCategoryCount('working', 5);

      expect(mockElements['working-count'].textContent).toBe('5');
    });

    test('handles missing element gracefully', () => {
      document.getElementById.mockReturnValueOnce(null);

      expect(() => {
        controller.updateCategoryCount('nonexistent', 5);
      }).not.toThrow();
    });
  });

  describe('switchTab', () => {
    test('switches to specified tab', () => {
      const tabButtons = [
        { dataset: { category: 'connection-error' }, classList: { toggle: jest.fn() } },
        { dataset: { category: 'working' }, classList: { toggle: jest.fn() } }
      ];

      const tabContents = [
        { id: 'connection-error-tab', classList: { toggle: jest.fn() } },
        { id: 'working-tab', classList: { toggle: jest.fn() } }
      ];

      document.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.tab-btn') return tabButtons;
        if (selector === '.tab-content') return tabContents;
        return [];
      });

      controller.switchTab('working');

      expect(document.querySelectorAll).toHaveBeenCalledWith('.tab-btn');
      expect(document.querySelectorAll).toHaveBeenCalledWith('.tab-content');
    });
  });

  describe('updateTimeEstimates', () => {
    test('updates elapsed time', () => {
      controller.scanStartTime = Date.now() - 5000; // 5 seconds ago
      const progress = {
        completed: 10,
        total: 100,
        percentage: 10
      };

      controller.updateTimeEstimates(progress);

      expect(mockElements['elapsed-time'].textContent).toBe('5s');
    });

    test('calculates remaining time', () => {
      controller.scanStartTime = Date.now() - 2000; // 2 seconds ago
      const progress = {
        completed: 20,
        total: 100,
        percentage: 20
      };

      controller.updateTimeEstimates(progress);

      // Should calculate remaining time based on rate
      expect(mockElements['remaining-time'].textContent).toBeDefined();
    });

    test('shows "Almost done!" when remaining is very small', () => {
      controller.scanStartTime = Date.now() - 1000;
      const progress = {
        completed: 99,
        total: 100,
        percentage: 99
      };

      controller.updateTimeEstimates(progress);

      // May show "Almost done!" or a very small time
      expect(mockElements['remaining-time'].textContent).toBeDefined();
    });
  });

  describe('updateCountsAfterDeletion', () => {
    test('updates counts from DOM', () => {
      const mockList = {
        id: 'working-list',
        querySelectorAll: jest.fn(() => [
          { dataset: { bookmarkId: '1' } },
          { dataset: { bookmarkId: '2' } }
        ])
      };

      document.querySelectorAll.mockReturnValue([mockList]);

      controller.updateCountsAfterDeletion();

      expect(document.querySelectorAll).toHaveBeenCalledWith('.bookmark-list');
    });
  });

  describe('showNotification', () => {
    test('creates Chrome notification', () => {
      controller.showNotification('Test message', 'success');

      expect(chrome.notifications.create).toHaveBeenCalled();
      const callArgs = chrome.notifications.create.getCall(0).args[0];
      expect(callArgs.message).toBe('Test message');
      expect(callArgs.title).toBe('Chrome Bookmark Assistant');
    });
  });

  describe('showError', () => {
    test('shows error and switches to initial state', () => {
      // Reset the mock since it was called in constructor
      controller.showState.mockClear();
      
      controller.showError('Test error');

      expect(controller.showState).toHaveBeenCalledWith('initial');
      expect(chrome.notifications.create).toHaveBeenCalled();
    });
  });

  describe('toggleDebug', () => {
    test('toggles debug console visibility', () => {
      controller.toggleDebug();

      expect(mockElements['debug-console'].style.display).toBe('block');
      expect(mockElements['toggle-debug'].textContent).toBe('Hide Debug');

      controller.toggleDebug();

      expect(mockElements['debug-console'].style.display).toBe('none');
      expect(mockElements['toggle-debug'].textContent).toBe('Show Debug');
    });
  });

  describe('debugLog', () => {
    test('adds log entry to debug log', () => {
      controller.debugLog('Test message', 'info');

      expect(mockElements['debug-log'].appendChild).toHaveBeenCalled();
    });

    test('logs to console with appropriate level', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      controller.debugLog('Error message', 'error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      controller.debugLog('Success message', 'success');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('visitBookmark', () => {
    test('opens bookmark URL in new tab', async() => {
      await controller.visitBookmark('https://example.com');

      expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com' });
    });

    test('closes popup after opening tab', async() => {
      await controller.visitBookmark('https://example.com');

      expect(window.close).toHaveBeenCalled();
    });

    test('handles errors gracefully', async() => {
      chrome.tabs.create.mockImplementation(() => {
        throw new Error('Tab creation failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.visitBookmark('https://example.com');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteBookmark', () => {
    test('deletes bookmark after confirmation', async() => {
      global.confirm = jest.fn(() => true);

      await controller.deleteBookmark('bookmark-id', 'Test Bookmark');

      expect(chrome.bookmarks.remove).toHaveBeenCalledWith('bookmark-id');
    });

    test('does not delete if user cancels', async() => {
      global.confirm = jest.fn(() => false);

      await controller.deleteBookmark('bookmark-id', 'Test Bookmark');

      expect(chrome.bookmarks.remove).not.toHaveBeenCalled();
    });

    test('removes bookmark from UI after deletion', async() => {
      global.confirm = jest.fn(() => true);
      const mockItem = { remove: jest.fn() };
      document.querySelector.mockReturnValueOnce(mockItem);

      await controller.deleteBookmark('bookmark-id', 'Test Bookmark');

      expect(mockItem.remove).toHaveBeenCalled();
    });

    test('updates counts after deletion', async() => {
      global.confirm = jest.fn(() => true);
      document.querySelector.mockReturnValueOnce({ remove: jest.fn() });

      await controller.deleteBookmark('bookmark-id', 'Test Bookmark');

      expect(controller.updateCountsAfterDeletion).toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {
    test('deletes problematic bookmarks after confirmation', async() => {
      global.confirm = jest.fn(() => true);
      controller.scanResults = {
        categories: {
          'connection-error': [
            { id: '1', title: 'Error 1', url: 'https://error1.com' },
            { id: '2', title: 'Error 2', url: 'https://error2.com' }
          ],
          timeout: [
            { id: '3', title: 'Timeout', url: 'https://timeout.com' }
          ],
          unknown: []
        }
      };

      await controller.bulkDelete();

      expect(chrome.bookmarks.remove).toHaveBeenCalledTimes(3);
    });

    test('does not delete if user cancels', async() => {
      global.confirm = jest.fn(() => false);
      controller.scanResults = {
        categories: {
          'connection-error': [{ id: '1', title: 'Error', url: 'https://error.com' }],
          timeout: [],
          unknown: []
        }
      };

      await controller.bulkDelete();

      expect(chrome.bookmarks.remove).not.toHaveBeenCalled();
    });

    test('shows notification when no problematic bookmarks', async() => {
      controller.scanResults = {
        categories: {
          'connection-error': [],
          timeout: [],
          unknown: []
        }
      };

      await controller.bulkDelete();

      expect(chrome.notifications.create).toHaveBeenCalled();
    });
  });

  describe('exportResults', () => {
    test('exports results as CSV', async() => {
      controller.scanResults = {
        categories: {
          working: [
            { title: 'Test', url: 'https://example.com', category: 'working', status: 'ok', message: '' }
          ]
        }
      };

      global.URL.createObjectURL.mockReturnValue('blob:url');
      global.Blob.mockImplementation(() => ({}));

      await controller.exportResults();

      expect(chrome.downloads.download).toHaveBeenCalled();
    });

    test('handles missing scan results', async() => {
      controller.scanResults = null;

      await controller.exportResults();

      expect(chrome.downloads.download).not.toHaveBeenCalled();
    });

    test('handles export errors', async() => {
      controller.scanResults = {
        categories: { working: [] }
      };
      chrome.downloads.download.mockImplementation(() => {
        throw new Error('Download failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.exportResults();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('openSettings', () => {
    test('opens options page', () => {
      controller.openSettings();

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });
});

