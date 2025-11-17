const chrome = require('sinon-chrome');
const { BookmarkChecker } = require('../../utils/bookmark-checker');
const SmartTagger = require('../../utils/smart-tagger');

// Mock the global chrome object
global.chrome = chrome;

// Mock DOM APIs
global.document = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn()
  }
};

global.window = {
  close: jest.fn()
};

global.BookmarkChecker = BookmarkChecker;
global.SmartTagger = SmartTagger;

const PopupController = require('../../popup/popup');

describe('PopupController Integration Tests', () => {
  let controller;
  let mockElements;

  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();

    mockElements = {
      'scan-btn': { addEventListener: jest.fn() },
      'organize-btn': { addEventListener: jest.fn() },
      'settings-btn': { addEventListener: jest.fn() },
      'toggle-debug': { addEventListener: jest.fn(), textContent: 'Show Debug' },
      'total-bookmarks': { textContent: '' },
      'quick-stats': { style: { display: 'none' } },
      'debug-log': { appendChild: jest.fn(), scrollTop: 0, scrollHeight: 0 },
      'debug-console': { style: { display: 'none' } },
      'initial-state': { classList: { remove: jest.fn() }, style: { display: 'none' } }
    };

    document.getElementById.mockImplementation((id) => mockElements[id] || null);
    document.querySelector.mockReturnValue({ textContent: '' });
    document.querySelectorAll.mockReturnValue([]);
    document.createElement.mockImplementation(() => ({
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      dataset: {},
      addEventListener: jest.fn(),
      classList: { add: jest.fn(), remove: jest.fn() }
    }));

    chrome.bookmarks.getTree.yields([{
      id: '1',
      title: 'Bookmarks Bar',
      children: []
    }]);

    chrome.storage.local.get.yields({});
    chrome.storage.local.set.yields();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    document.addEventListener = jest.fn();
    controller = new PopupController();
    controller.showState = jest.fn();
  });

  afterEach(() => {
    chrome.flush();
  });

  describe('PopupController + BookmarkChecker Integration', () => {
    test('uses BookmarkChecker to get all bookmarks', async() => {
      const mockBookmarks = [
        { id: '1', title: 'Test 1', url: 'https://example.com/1', dateAdded: Date.now() },
        { id: '2', title: 'Test 2', url: 'https://example.com/2', dateAdded: Date.now() }
      ];

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);

      const bookmarks = await controller.bookmarkChecker.getAllBookmarks();

      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0].title).toBe('Test 1');
    });

    test('uses BookmarkChecker to check bookmark health', async() => {
      const bookmark = {
        id: '1',
        title: 'Test',
        url: 'https://example.com'
      };

      global.fetch.mockResolvedValue({ ok: true });

      const result = await controller.bookmarkChecker.checkBookmarkHealth(bookmark);

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.category).toBe('working');
    });

    test('uses BookmarkChecker to categorize results', () => {
      const results = [
        { category: 'working', title: 'Working' },
        { category: 'connection-error', title: 'Error' },
        { category: 'working', title: 'Another Working' }
      ];

      const categorized = controller.bookmarkChecker.categorizeResults(results);

      expect(categorized.working).toHaveLength(2);
      expect(categorized['connection-error']).toHaveLength(1);
    });

    test('integrates scan workflow with BookmarkChecker', async() => {
      const mockBookmarks = [
        { id: '1', title: 'Test', url: 'https://example.com', dateAdded: Date.now() }
      ];

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);

      global.fetch.mockResolvedValue({ ok: true });
      chrome.storage.local.set.yields();

      // Simulate scan workflow
      const bookmarks = await controller.bookmarkChecker.getAllBookmarks();
      const results = await controller.bookmarkChecker.checkMultipleBookmarks(bookmarks, null);
      const categorized = controller.bookmarkChecker.categorizeResults(results);

      expect(categorized).toBeDefined();
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('PopupController + SmartTagger Integration', () => {
    test('uses SmartTagger to analyze bookmarks', () => {
      const bookmark = {
        id: '1',
        title: 'React Tutorial',
        url: 'https://github.com/react'
      };

      const analysis = controller.smartTagger.analyzeBookmark(bookmark);

      expect(analysis).toBeDefined();
      expect(analysis.categories).toBeDefined();
      expect(analysis.tags).toBeDefined();
      expect(analysis.priority).toBeDefined();
    });

    test('uses SmartTagger to generate organization recommendations', () => {
      const bookmarks = [
        { id: '1', title: 'React Docs', url: 'https://github.com/react' },
        { id: '2', title: 'Vue Guide', url: 'https://github.com/vue' },
        { id: '3', title: 'Design', url: 'https://dribbble.com/design' }
      ];

      const recommendations = controller.smartTagger.getOrganizationRecommendations(bookmarks);

      expect(recommendations).toBeDefined();
      expect(recommendations.folders).toBeDefined();
      expect(recommendations.duplicates).toBeDefined();
      expect(recommendations.cleanup).toBeDefined();
      expect(recommendations.priority).toBeDefined();
    });

    test('integrates organization workflow with SmartTagger', async() => {
      const mockBookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://github.com/react', dateAdded: Date.now() },
        { id: '2', title: 'Vue Guide', url: 'https://github.com/vue', dateAdded: Date.now() }
      ];

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);

      chrome.storage.local.set.yields();

      // Simulate organization workflow
      const bookmarks = await controller.bookmarkChecker.getAllBookmarks();
      const recommendations = controller.smartTagger.getOrganizationRecommendations(bookmarks);

      expect(recommendations.folders.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Integration', () => {
    test('saves scan results to Chrome storage', async() => {
      const scanResults = {
        timestamp: Date.now(),
        totalScanned: 10,
        categories: {
          working: [],
          'connection-error': []
        }
      };

      chrome.storage.local.set.yields();

      await chrome.storage.local.set({
        lastScan: Date.now(),
        scanResults: scanResults
      });

      expect(chrome.storage.local.set).toHaveBeenCalled();
      const callArgs = chrome.storage.local.set.getCall(0).args[0];
      expect(callArgs.scanResults).toBeDefined();
      expect(callArgs.scanResults.totalScanned).toBe(10);
    });

    test('loads scan results from Chrome storage', async() => {
      const storedResults = {
        lastScan: Date.now(),
        scanResults: {
          timestamp: Date.now(),
          totalScanned: 5,
          categories: {
            working: [{ id: '1', title: 'Test', url: 'https://example.com' }]
          }
        }
      };

      chrome.storage.local.get.yields(storedResults);

      const data = await chrome.storage.local.get(['lastScan', 'scanResults']);

      expect(data.lastScan).toBeDefined();
      expect(data.scanResults).toBeDefined();
      expect(data.scanResults.totalScanned).toBe(5);
    });
  });

  describe('Error Handling Integration', () => {
    test('handles BookmarkChecker errors gracefully', async() => {
      chrome.bookmarks.getTree.yields(undefined);

      try {
        await controller.bookmarkChecker.getAllBookmarks();
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined();
      }
    });

    test('handles network errors during bookmark check', async() => {
      const bookmark = {
        id: '1',
        title: 'Test',
        url: 'https://example.com'
      };

      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await controller.bookmarkChecker.checkBookmarkHealth(bookmark);

      expect(result.status).toBe('error');
      expect(result.category).toBeDefined();
    });

    test('handles storage errors gracefully', async() => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await chrome.storage.local.set({ test: 'data' });
      } catch (error) {
        expect(error).toBeDefined();
      }

      consoleErrorSpy.mockRestore();
    });
  });
});

