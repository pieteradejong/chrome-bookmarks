const chrome = require('sinon-chrome');
const { BookmarkChecker } = require('./bookmark-checker');

// Mock the global chrome object
global.chrome = chrome;

describe('BookmarkChecker - Chrome API Integration', () => {
  let checker;

  beforeEach(() => {
    checker = new BookmarkChecker();
    chrome.flush(); // Clear all stubs
  });

  afterEach(() => {
    chrome.flush();
  });

  describe('getAllBookmarks', () => {
    test('retrieves bookmarks from Chrome API', async() => {
      const mockTree = [{
        id: '1',
        title: 'Bookmarks Bar',
        children: [
          {
            id: '2',
            title: 'Example',
            url: 'https://example.com',
            dateAdded: 1234567890,
            parentId: '1'
          },
          {
            id: '3',
            title: 'Folder',
            children: [
              {
                id: '4',
                title: 'Nested',
                url: 'https://nested.com',
                dateAdded: 1234567891,
                parentId: '3'
              }
            ]
          }
        ]
      }];

      // Mock chrome.bookmarks.getTree to call callback with mock data
      chrome.bookmarks.getTree.yields(mockTree);

      const bookmarks = await checker.getAllBookmarks();

      expect(chrome.bookmarks.getTree.calledOnce).toBe(true);
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0].title).toBe('Example');
      expect(bookmarks[1].title).toBe('Nested');
    });

    test('handles empty bookmark tree', async() => {
      chrome.bookmarks.getTree.yields([]);

      const bookmarks = await checker.getAllBookmarks();

      expect(bookmarks).toHaveLength(0);
    });

    test('handles Chrome API errors gracefully', async() => {
      chrome.bookmarks.getTree.yields(undefined);

      const bookmarks = await checker.getAllBookmarks();

      expect(bookmarks).toHaveLength(0);
    });
  });

  describe('checkBookmarkHealth with mocked fetch', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockRestore();
    });

    test('successfully checks a working bookmark', async() => {
      const bookmark = {
        id: '1',
        title: 'Example',
        url: 'https://example.com'
      };

      // Mock successful fetch response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await checker.checkBookmarkHealth(bookmark);

      expect(result.status).toBe('ok');
      expect(result.category).toBe('working');
      expect(result.title).toBe('Example');
    });

    test('handles fetch timeout', async() => {
      const bookmark = {
        id: '1',
        title: 'Slow Site',
        url: 'https://slowsite.com'
      };

      // Mock fetch timeout (AbortError)
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch.mockRejectedValueOnce(abortError);

      const result = await checker.checkBookmarkHealth(bookmark);

      expect(result.status).toBe('error');
      expect(result.category).toBe('timeout');
      expect(result.message).toBe('Request timed out');
    });

    test('handles network errors', async() => {
      const bookmark = {
        id: '1',
        title: 'Dead Link',
        url: 'https://deadlink.com'
      };

      // Mock network error
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await checker.checkBookmarkHealth(bookmark);

      expect(result.status).toBe('error');
      expect(result.category).toBe('connection-error');
    });

    test('uses cache for repeated requests', async() => {
      const bookmark = {
        id: '1',
        title: 'Cached Site',
        url: 'https://cached.com'
      };

      // Mock successful fetch response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // First request
      const result1 = await checker.checkBookmarkHealth(bookmark);
      expect(result1.fromCache).toBeUndefined();

      // Second request should use cache
      const result2 = await checker.checkBookmarkHealth(bookmark);
      expect(result2.fromCache).toBe(true);

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('respects cache expiry', async() => {
      const bookmark = {
        id: '1',
        title: 'Expired Cache',
        url: 'https://expired.com'
      };

      // Mock successful fetch responses
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200
      });

      // Set a very short cache expiry for testing
      checker.cacheExpiry = 1; // 1ms

      // First request
      await checker.checkBookmarkHealth(bookmark);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second request should not use cache
      const result = await checker.checkBookmarkHealth(bookmark);
      expect(result.fromCache).toBeUndefined();

      // Fetch should be called twice
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkMultipleBookmarks', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockRestore();
    });

    test('processes multiple bookmarks with progress callback', async() => {
      const bookmarks = [
        { id: '1', title: 'Site 1', url: 'https://site1.com' },
        { id: '2', title: 'Site 2', url: 'https://site2.com' },
        { id: '3', title: 'Site 3', url: 'https://site3.com' }
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200
      });

      const progressUpdates = [];
      const progressCallback = (progress) => {
        progressUpdates.push(progress);
      };

      const results = await checker.checkMultipleBookmarks(bookmarks, progressCallback);

      expect(results).toHaveLength(3);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(3);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });

    test('handles failures in batch processing', async() => {
      const bookmarks = [
        { id: '1', title: 'Good Site', url: 'https://good.com' },
        { id: '2', title: 'Bad Site', url: 'https://bad.com' }
      ];

      global.fetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error('Failed to fetch'));

      const results = await checker.checkMultipleBookmarks(bookmarks);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('ok');
      expect(results[1].status).toBe('error');
    });
  });
});
