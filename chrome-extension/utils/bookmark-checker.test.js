const { BookmarkChecker } = require('./bookmark-checker');

describe('BookmarkChecker', () => {
  let checker;
  beforeEach(() => {
    checker = new BookmarkChecker();
  });

  describe('categorizeError', () => {
    test('categorizes LinkedIn as bot-protected', () => {
      const result = checker.categorizeError('https://www.linkedin.com/in/someone', { message: 'Failed to fetch' });
      expect(result.category).toBe('bot-protected');
      expect(result.status).toBe('restricted');
      expect(result.action).toBe('keep');
    });

    test('categorizes Google Docs as login-required', () => {
      const result = checker.categorizeError('https://docs.google.com/document/d/123', { message: 'Failed to fetch' });
      expect(result.category).toBe('login-required');
      expect(result.status).toBe('restricted');
      expect(result.action).toBe('keep');
    });

    test('categorizes Google Drive as login-required', () => {
      const result = checker.categorizeError('https://drive.google.com/file/d/123', { message: 'Failed to fetch' });
      expect(result.category).toBe('login-required');
      expect(result.status).toBe('restricted');
    });

    test('categorizes StackOverflow as bot-protected', () => {
      const result = checker.categorizeError('https://stackoverflow.com/questions/123', { message: 'Failed to fetch' });
      expect(result.category).toBe('bot-protected');
      expect(result.status).toBe('restricted');
    });

    test('categorizes GitHub as bot-protected', () => {
      const result = checker.categorizeError('https://github.com/user/repo', { message: 'Failed to fetch' });
      expect(result.category).toBe('bot-protected');
      expect(result.status).toBe('restricted');
    });

    test('categorizes generic fetch error as connection-error', () => {
      const result = checker.categorizeError('http://example.com/404', { message: 'Failed to fetch' });
      expect(result.category).toBe('connection-error');
      expect(result.status).toBe('error');
      expect(result.action).toBe('review');
    });

    test('categorizes unknown error', () => {
      const result = checker.categorizeError('http://example.com', { message: 'Some other error' });
      expect(result.category).toBe('unknown');
      expect(result.status).toBe('error');
      expect(result.action).toBe('review');
    });
  });

  describe('extractBookmarksFromTree', () => {
    test('extracts bookmarks from nested tree structure', () => {
      const tree = [{
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

      const bookmarks = checker.extractBookmarksFromTree(tree);
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0]).toEqual({
        id: '2',
        title: 'Example',
        url: 'https://example.com',
        dateAdded: 1234567890,
        parentId: '1'
      });
      expect(bookmarks[1]).toEqual({
        id: '4',
        title: 'Nested',
        url: 'https://nested.com',
        dateAdded: 1234567891,
        parentId: '3'
      });
    });

    test('handles empty tree', () => {
      const bookmarks = checker.extractBookmarksFromTree([]);
      expect(bookmarks).toHaveLength(0);
    });
  });

  describe('categorizeResults', () => {
    test('groups results by category', () => {
      const results = [
        { category: 'working', title: 'Working Site' },
        { category: 'bot-protected', title: 'LinkedIn' },
        { category: 'connection-error', title: 'Dead Link' },
        { category: 'working', title: 'Another Working Site' }
      ];

      const categorized = checker.categorizeResults(results);
      expect(categorized.working).toHaveLength(2);
      expect(categorized['bot-protected']).toHaveLength(1);
      expect(categorized['connection-error']).toHaveLength(1);
      expect(categorized.unknown).toHaveLength(0);
    });

    test('handles unknown categories', () => {
      const results = [
        { category: 'invalid-category', title: 'Unknown' }
      ];

      const categorized = checker.categorizeResults(results);
      expect(categorized.unknown).toHaveLength(1);
    });
  });

  describe('getDeletionRecommendations', () => {
    test('recommends keeping working and protected sites', () => {
      const categorizedResults = {
        'working': [{ title: 'Good Site' }],
        'bot-protected': [{ title: 'LinkedIn' }],
        'login-required': [{ title: 'Google Docs' }],
        'connection-error': [{ title: 'Dead Link' }],
        'timeout': [{ title: 'Slow Site' }],
        'unknown': [{ title: 'Unknown Error' }],
        'check-failed': [{ title: 'Failed Check' }]
      };

      const recommendations = checker.getDeletionRecommendations(categorizedResults);
      expect(recommendations.keepThese).toHaveLength(3);
      expect(recommendations.reviewRequired).toHaveLength(4);
      expect(recommendations.safeToDelete).toHaveLength(0);
    });
  });

  describe('caching', () => {
    test('clears cache', () => {
      checker.cache.set('test', { value: 'cached' });
      expect(checker.cache.size).toBe(1);

      checker.clearCache();
      expect(checker.cache.size).toBe(0);
    });

    test('cache expiry time is set correctly', () => {
      expect(checker.cacheExpiry).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('edge cases and error handling', () => {
    test('handles malformed URLs gracefully', () => {
      expect(() => {
        checker.categorizeError('not-a-url', { message: 'Failed to fetch' });
      }).toThrow();
    });

    test('handles null/undefined error objects', () => {
      const result = checker.categorizeError('https://example.com', null);
      expect(result.category).toBe('unknown');
      expect(result.status).toBe('error');
    });

    test('handles empty error message', () => {
      const result = checker.categorizeError('https://example.com', { message: '' });
      expect(result.category).toBe('unknown');
      expect(result.status).toBe('error');
    });

    test('categorizeResults handles missing category field', () => {
      const results = [
        { title: 'No Category' },
        { category: null, title: 'Null Category' },
        { category: undefined, title: 'Undefined Category' }
      ];

      const categorized = checker.categorizeResults(results);
      expect(categorized.unknown).toHaveLength(3);
    });

    test('extractBookmarksFromTree handles malformed nodes', () => {
      const tree = [{
        id: '1',
        children: [
          null,
          undefined,
          { id: '2', title: 'Valid', url: 'https://example.com' },
          { id: '3' }, // Missing required fields
          { children: [] } // No id
        ]
      }];

      const bookmarks = checker.extractBookmarksFromTree(tree);
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].title).toBe('Valid');
    });

    test('getDeletionRecommendations handles empty categorized results', () => {
      const emptyCategorized = {
        'working': [],
        'bot-protected': [],
        'login-required': [],
        'connection-error': [],
        'timeout': [],
        'unknown': [],
        'check-failed': []
      };

      const recommendations = checker.getDeletionRecommendations(emptyCategorized);
      expect(recommendations.keepThese).toHaveLength(0);
      expect(recommendations.reviewRequired).toHaveLength(0);
      expect(recommendations.safeToDelete).toHaveLength(0);
    });

    test('categorizeError handles various hostname formats', () => {
      const testCases = [
        ['https://www.linkedin.com', 'bot-protected'],
        ['https://linkedin.com', 'bot-protected'],
        ['https://m.linkedin.com', 'bot-protected'],
        ['https://subdomain.docs.google.com', 'login-required'],
        ['https://fakegoogle.com/docs', 'connection-error'] // Should not match google docs pattern
      ];

      testCases.forEach(([url, expectedCategory]) => {
        const result = checker.categorizeError(url, { message: 'Failed to fetch' });
        expect(result.category).toBe(expectedCategory);
      });
    });
  });
});
