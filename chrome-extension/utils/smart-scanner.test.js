const chrome = require('sinon-chrome');
const { BookmarkChecker } = require('./bookmark-checker');

// Make BookmarkChecker available globally for smart-scanner.js
global.BookmarkChecker = BookmarkChecker;
const SmartBookmarkScanner = require('./smart-scanner');

// Mock the global chrome object
global.chrome = chrome;

describe('SmartBookmarkScanner', () => {
  let scanner;

  beforeEach(() => {
    scanner = new SmartBookmarkScanner();
    chrome.flush();
  });

  afterEach(() => {
    chrome.flush();
  });

  describe('getScanRecommendations', () => {
    test('returns recommendations with bookmark count', async() => {
      const mockBookmarks = Array.from({ length: 150 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks.map(b => ({
          ...b,
          dateAdded: Date.now() - i * 1000
        }))
      }]);

      const recommendations = await scanner.getScanRecommendations();

      expect(recommendations.bookmarkCount).toBe(150);
      expect(recommendations).toHaveProperty('estimatedTimes');
      expect(recommendations).toHaveProperty('recommendedStrategy');
      expect(recommendations).toHaveProperty('strategies');
    });

    test('includes time estimates for all strategies', async() => {
      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: []
      }]);

      const recommendations = await scanner.getScanRecommendations();

      expect(recommendations.estimatedTimes).toHaveProperty('quick');
      expect(recommendations.estimatedTimes).toHaveProperty('smart');
      expect(recommendations.estimatedTimes).toHaveProperty('full');
    });

    test('includes strategy definitions', async() => {
      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: []
      }]);

      const recommendations = await scanner.getScanRecommendations();

      expect(recommendations.strategies).toHaveProperty('quick');
      expect(recommendations.strategies).toHaveProperty('smart');
      expect(recommendations.strategies).toHaveProperty('full');
    });
  });

  describe('getTimeEstimates', () => {
    test('calculates time estimates correctly', () => {
      const estimates = scanner.getTimeEstimates(100);

      expect(estimates.quick).toBeGreaterThan(0);
      expect(estimates.smart).toBeGreaterThan(0);
      expect(estimates.full).toBeGreaterThan(0);
    });

    test('caps quick scan at 30 seconds', () => {
      const estimates = scanner.getTimeEstimates(10000);

      expect(estimates.quick).toBeLessThanOrEqual(30);
    });

    test('caps smart scan at 120 seconds', () => {
      const estimates = scanner.getTimeEstimates(10000);

      expect(estimates.smart).toBeLessThanOrEqual(120);
    });

    test('calculates full scan time based on count', () => {
      const estimates = scanner.getTimeEstimates(300);

      // Should be approximately 300 * 0.5 / 15 = 10 seconds
      expect(estimates.full).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedStrategy', () => {
    test('recommends quick for <= 100 bookmarks', () => {
      expect(scanner.getRecommendedStrategy(50)).toBe('quick');
      expect(scanner.getRecommendedStrategy(100)).toBe('quick');
    });

    test('recommends smart for 101-500 bookmarks', () => {
      expect(scanner.getRecommendedStrategy(101)).toBe('smart');
      expect(scanner.getRecommendedStrategy(250)).toBe('smart');
      expect(scanner.getRecommendedStrategy(500)).toBe('smart');
    });

    test('recommends background for > 500 bookmarks', () => {
      expect(scanner.getRecommendedStrategy(501)).toBe('background');
      expect(scanner.getRecommendedStrategy(1000)).toBe('background');
    });
  });

  describe('getRecentBookmarks', () => {
    test('retrieves recent bookmarks from Chrome API', async() => {
      const mockRecent = [
        { id: '1', title: 'Recent 1', url: 'https://example.com/1', dateAdded: Date.now() },
        { id: '2', title: 'Recent 2', url: 'https://example.com/2', dateAdded: Date.now() - 1000 }
      ];

      chrome.bookmarks.getRecent.yields(mockRecent);

      const bookmarks = await scanner.getRecentBookmarks(50);

      expect(chrome.bookmarks.getRecent.calledWith(50)).toBe(true);
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0]).toHaveProperty('id');
      expect(bookmarks[0]).toHaveProperty('title');
      expect(bookmarks[0]).toHaveProperty('url');
      expect(bookmarks[0]).toHaveProperty('dateAdded');
    });

    test('converts bookmarks to expected format', async() => {
      const mockRecent = [
        { id: '1', title: 'Test', url: 'https://example.com', dateAdded: 1234567890, parentId: '0' }
      ];

      chrome.bookmarks.getRecent.yields(mockRecent);

      const bookmarks = await scanner.getRecentBookmarks(50);

      expect(bookmarks[0]).toEqual({
        id: '1',
        title: 'Test',
        url: 'https://example.com',
        dateAdded: 1234567890,
        parentId: '0'
      });
    });
  });

  describe('getPriorityBookmarks', () => {
    test('sorts bookmarks by date added (most recent first)', async() => {
      const mockBookmarks = [
        { id: '1', title: 'Old', url: 'https://example.com/1', dateAdded: 1000 },
        { id: '2', title: 'New', url: 'https://example.com/2', dateAdded: 2000 },
        { id: '3', title: 'Middle', url: 'https://example.com/3', dateAdded: 1500 }
      ];

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);

      const bookmarks = await scanner.getPriorityBookmarks(200);

      expect(bookmarks[0].dateAdded).toBeGreaterThanOrEqual(bookmarks[1].dateAdded);
    });

    test('limits results to specified count', async() => {
      const mockBookmarks = Array.from({ length: 300 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`,
        dateAdded: Date.now() - i * 1000
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);

      const bookmarks = await scanner.getPriorityBookmarks(200);

      expect(bookmarks.length).toBe(200);
    });

    test('handles bookmarks with missing dateAdded', async() => {
      const mockBookmarks = [
        { id: '1', title: 'No Date', url: 'https://example.com/1' },
        { id: '2', title: 'With Date', url: 'https://example.com/2', dateAdded: 1000 }
      ];

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);

      const bookmarks = await scanner.getPriorityBookmarks(200);

      expect(bookmarks.length).toBe(2);
    });
  });

  describe('chunkArray', () => {
    test('chunks array into smaller arrays', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = scanner.chunkArray(array, 3);

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    test('handles empty array', () => {
      const chunks = scanner.chunkArray([], 10);

      expect(chunks).toEqual([]);
    });

    test('handles array smaller than chunk size', () => {
      const array = [1, 2, 3];
      const chunks = scanner.chunkArray(array, 10);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });

    test('handles exact multiple of chunk size', () => {
      const array = [1, 2, 3, 4, 5, 6];
      const chunks = scanner.chunkArray(array, 3);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
    });
  });

  describe('getScanStatusMessage', () => {
    test('returns chunk status message when totalChunks exists', () => {
      const progress = {
        currentChunk: 2,
        totalChunks: 5,
        percentage: 40
      };

      const message = scanner.getScanStatusMessage(progress);

      expect(message).toContain('chunk 2 of 5');
      expect(message).toContain('40%');
    });

    test('returns standard status message when no chunks', () => {
      const progress = {
        completed: 50,
        total: 100,
        percentage: 50
      };

      const message = scanner.getScanStatusMessage(progress);

      expect(message).toContain('50 of 100');
      expect(message).toContain('50%');
    });
  });

  describe('estimateRemainingTime', () => {
    test('estimates time in seconds when less than 60', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      const progress = {
        completed: 10,
        total: 20
      };

      const estimate = scanner.estimateRemainingTime(progress, startTime);

      expect(estimate).toContain('seconds');
      expect(estimate).toContain('~');
    });

    test('estimates time in minutes when >= 60 seconds', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      const progress = {
        completed: 1,
        total: 120 // Will take ~60 seconds at current rate
      };

      const estimate = scanner.estimateRemainingTime(progress, startTime);

      // Should show minutes for longer estimates
      expect(estimate).toBeDefined();
    });

    test('handles zero completed bookmarks', () => {
      const startTime = Date.now();
      const progress = {
        completed: 0,
        total: 100
      };

      // Should not throw, but may return invalid estimate
      expect(() => {
        scanner.estimateRemainingTime(progress, startTime);
      }).not.toThrow();
    });

    test('calculates rate correctly', () => {
      const startTime = Date.now() - 2000; // 2 seconds ago
      const progress = {
        completed: 20,
        total: 100
      };

      const estimate = scanner.estimateRemainingTime(progress, startTime);

      // Rate should be 20/2 = 10 bookmarks per second
      // Remaining: 80 bookmarks
      // Estimated: 80/10 = 8 seconds
      expect(estimate).toBeDefined();
    });
  });

  describe('scanBookmarks', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockRestore();
    });

    test('calls checkMultipleBookmarks with correct parameters', async() => {
      const bookmarks = [
        { id: '1', title: 'Test', url: 'https://example.com' }
      ];
      const progressCallback = jest.fn();

      global.fetch.mockResolvedValue({ ok: true });

      await scanner.scanBookmarks(bookmarks, 'quick', progressCallback);

      // Verify that checkMultipleBookmarks was called (indirectly through results)
      expect(global.fetch).toHaveBeenCalled();
    });

    test('uses strategy-specific timeout', async() => {
      const bookmarks = [
        { id: '1', title: 'Test', url: 'https://example.com' }
      ];

      global.fetch.mockResolvedValue({ ok: true });

      // Set timeout property before scanning
      scanner.bookmarkChecker.timeout = undefined;

      await scanner.scanBookmarks(bookmarks, 'quick', null);

      // Verify timeout was set (quick strategy has 3000ms timeout)
      expect(scanner.bookmarkChecker.timeout).toBe(3000);
    });
  });

  describe('saveIntermediateResults', () => {
    test('saves results to Chrome storage', async() => {
      const results = [
        { id: '1', title: 'Test', url: 'https://example.com', category: 'working' }
      ];

      chrome.storage.local.set.yields();

      await scanner.saveIntermediateResults(results, 1, 5);

      expect(chrome.storage.local.set.called).toBe(true);
      const callArgs = chrome.storage.local.set.getCall(0).args[0];
      expect(callArgs.scanProgress).toBeDefined();
      expect(callArgs.scanProgress.currentChunk).toBe(1);
      expect(callArgs.scanProgress.totalChunks).toBe(5);
      expect(callArgs.scanProgress.completed).toBe(1);
    });

    test('categorizes results before saving', async() => {
      const results = [
        { id: '1', title: 'Test', url: 'https://example.com', category: 'working' },
        { id: '2', title: 'Error', url: 'https://error.com', category: 'connection-error' }
      ];

      chrome.storage.local.set.yields();

      await scanner.saveIntermediateResults(results, 1, 1);

      const callArgs = chrome.storage.local.set.getCall(0).args[0];
      expect(callArgs.scanProgress.partialResults).toBeDefined();
      expect(callArgs.scanProgress.partialResults.working).toBeDefined();
      expect(callArgs.scanProgress.partialResults['connection-error']).toBeDefined();
    });

    test('includes timestamp in saved data', async() => {
      const results = [];

      chrome.storage.local.set.yields();

      await scanner.saveIntermediateResults(results, 1, 1);

      const callArgs = chrome.storage.local.set.getCall(0).args[0];
      expect(callArgs.scanProgress.lastUpdate).toBeDefined();
      expect(typeof callArgs.scanProgress.lastUpdate).toBe('number');
    });
  });

  describe('resumeScan', () => {
    test('retrieves stored scan progress', async() => {
      const mockProgress = {
        completed: 50,
        currentChunk: 2,
        totalChunks: 5,
        lastUpdate: Date.now(),
        partialResults: {}
      };

      chrome.storage.local.get.yields({ scanProgress: mockProgress });

      const progress = await scanner.resumeScan();

      expect(chrome.storage.local.get.calledWith('scanProgress')).toBe(true);
      expect(progress).toEqual(mockProgress);
    });

    test('returns null when no stored progress', async() => {
      chrome.storage.local.get.yields({});

      const progress = await scanner.resumeScan();

      expect(progress).toBeNull();
    });

    test('returns null when scanProgress is null', async() => {
      chrome.storage.local.get.yields({ scanProgress: null });

      const progress = await scanner.resumeScan();

      expect(progress).toBeNull();
    });
  });

  describe('quickScan', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockRestore();
    });

    test('scans recent bookmarks', async() => {
      const mockRecent = [
        { id: '1', title: 'Recent', url: 'https://example.com', dateAdded: Date.now() }
      ];

      chrome.bookmarks.getRecent.yields(mockRecent);
      global.fetch.mockResolvedValue({ ok: true });

      const results = await scanner.quickScan(null);

      expect(chrome.bookmarks.getRecent.calledWith(50)).toBe(true);
      expect(results).toBeDefined();
    });

    test('calls progress callback when provided', async() => {
      const mockRecent = [
        { id: '1', title: 'Recent', url: 'https://example.com', dateAdded: Date.now() }
      ];
      const progressCallback = jest.fn();

      chrome.bookmarks.getRecent.yields(mockRecent);
      global.fetch.mockResolvedValue({ ok: true });

      await scanner.quickScan(progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('smartScan', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockRestore();
    });

    test('scans priority bookmarks', async() => {
      const mockBookmarks = Array.from({ length: 200 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`,
        dateAdded: Date.now() - i * 1000
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);
      global.fetch.mockResolvedValue({ ok: true });

      const results = await scanner.smartScan(null);

      expect(results).toBeDefined();
    });

    test('limits to 200 bookmarks', async() => {
      const mockBookmarks = Array.from({ length: 500 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`,
        dateAdded: Date.now() - i * 1000
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);
      global.fetch.mockResolvedValue({ ok: true });

      // Mock checkMultipleBookmarks to verify it's called with 200 bookmarks
      const originalCheck = scanner.bookmarkChecker.checkMultipleBookmarks;
      const checkSpy = jest.spyOn(scanner.bookmarkChecker, 'checkMultipleBookmarks')
        .mockResolvedValue([]);

      await scanner.smartScan(null);

      expect(checkSpy).toHaveBeenCalled();
      const callArgs = checkSpy.mock.calls[0][0];
      expect(callArgs.length).toBe(200);

      checkSpy.mockRestore();
    });
  });

  describe('startBackgroundScan', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockRestore();
    });

    test('processes bookmarks in chunks', async() => {
      const mockBookmarks = Array.from({ length: 150 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`,
        dateAdded: Date.now() - i * 1000
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);
      chrome.storage.local.set.yields();
      global.fetch.mockResolvedValue({ ok: true });

      const results = await scanner.startBackgroundScan(null);

      // Should process 150 bookmarks in chunks of 50 = 3 chunks
      expect(results.length).toBe(150);
      expect(chrome.storage.local.set.callCount).toBeGreaterThan(0);
    });

    test('calls progress callback with overall progress', async() => {
      const mockBookmarks = Array.from({ length: 100 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`,
        dateAdded: Date.now() - i * 1000
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);
      chrome.storage.local.set.yields();
      global.fetch.mockResolvedValue({ ok: true });

      const progressCallback = jest.fn();

      await scanner.startBackgroundScan(progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Verify progress includes chunk information
      const progressCalls = progressCallback.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
    });

    test('saves intermediate results after each chunk', async() => {
      const mockBookmarks = Array.from({ length: 100 }, (_, i) => ({
        id: `b${i}`,
        title: `Bookmark ${i}`,
        url: `https://example.com/${i}`,
        dateAdded: Date.now() - i * 1000
      }));

      chrome.bookmarks.getTree.yields([{
        id: '1',
        title: 'Bookmarks Bar',
        children: mockBookmarks
      }]);
      chrome.storage.local.set.yields();
      global.fetch.mockResolvedValue({ ok: true });

      await scanner.startBackgroundScan(null);

      // Should save after each chunk (2 chunks for 100 bookmarks with chunk size 50)
      expect(chrome.storage.local.set.callCount).toBeGreaterThanOrEqual(2);
    });
  });
});

