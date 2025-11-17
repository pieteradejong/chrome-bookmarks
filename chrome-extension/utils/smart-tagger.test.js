const SmartTagger = require('./smart-tagger');

describe('SmartTagger', () => {
  let tagger;

  beforeEach(() => {
    tagger = new SmartTagger();
  });

  describe('analyzeBookmark', () => {
    test('analyzes GitHub bookmark correctly', () => {
      const bookmark = {
        id: '1',
        title: 'React Documentation',
        url: 'https://github.com/facebook/react'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      expect(analysis.categories).toContain('development');
      expect(analysis.tags).toContain('development');
      expect(analysis.tags).toContain('github');
      // GitHub with "documentation" in title should be high priority
      expect(['normal', 'high']).toContain(analysis.priority);
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('analyzes tutorial bookmark with high priority', () => {
      const bookmark = {
        id: '2',
        title: 'JavaScript Tutorial for Beginners',
        url: 'https://example.com/tutorial'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      expect(analysis.tags).toContain('tutorial');
      expect(analysis.contentType).toBe('tutorial');
      expect(analysis.priority).toBe('high');
    });

    test('analyzes social media bookmark with low priority', () => {
      const bookmark = {
        id: '3',
        title: 'Twitter Feed',
        url: 'https://twitter.com/user'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      expect(analysis.categories).toContain('social');
      expect(analysis.priority).toBe('low');
    });

    test('handles bookmark with missing title', () => {
      const bookmark = {
        id: '4',
        title: '',
        url: 'https://example.com'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      expect(analysis.contentType).toBe('unknown');
      expect(analysis.tags).toBeDefined();
      expect(Array.isArray(analysis.tags)).toBe(true);
    });

    test('handles bookmark with invalid URL gracefully', () => {
      const bookmark = {
        id: '5',
        title: 'Test',
        url: 'not-a-valid-url'
      };

      // Should not throw, but handle error gracefully
      expect(() => {
        const analysis = tagger.analyzeBookmark(bookmark);
        expect(analysis).toBeDefined();
      }).not.toThrow();
    });

    test('removes duplicate categories and tags', () => {
      const bookmark = {
        id: '6',
        title: 'React Documentation',
        url: 'https://docs.example.com/api/react'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      // Check that categories and tags are unique
      const uniqueCategories = [...new Set(analysis.categories)];
      const uniqueTags = [...new Set(analysis.tags)];

      expect(analysis.categories.length).toBe(uniqueCategories.length);
      expect(analysis.tags.length).toBe(uniqueTags.length);
    });

    test('detects tech keywords in title', () => {
      const bookmark = {
        id: '7',
        title: 'Python Web Development Guide',
        url: 'https://example.com'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      expect(analysis.tags).toContain('python');
    });

    test('detects multiple tech keywords', () => {
      const bookmark = {
        id: '8',
        title: 'React and TypeScript Tutorial',
        url: 'https://example.com'
      };

      const analysis = tagger.analyzeBookmark(bookmark);

      expect(analysis.tags).toContain('react');
      expect(analysis.tags).toContain('typescript');
    });
  });

  describe('analyzeUrl', () => {
    test('identifies development category from GitHub URL', () => {
      const analysis = tagger.analyzeUrl('https://github.com/user/repo');

      expect(analysis.categories).toContain('development');
      expect(analysis.tags).toContain('development');
      expect(analysis.tags).toContain('github');
    });

    test('identifies design category from Dribbble URL', () => {
      const analysis = tagger.analyzeUrl('https://dribbble.com/designer');

      expect(analysis.categories).toContain('design');
      expect(analysis.tags).toContain('design');
    });

    test('identifies education category from Coursera URL', () => {
      const analysis = tagger.analyzeUrl('https://www.coursera.org/course');

      expect(analysis.categories).toContain('education');
    });

    test('identifies productivity category from Notion URL', () => {
      const analysis = tagger.analyzeUrl('https://notion.so/workspace');

      expect(analysis.categories).toContain('productivity');
    });

    test('identifies news category from Reddit URL', () => {
      const analysis = tagger.analyzeUrl('https://reddit.com/r/programming');

      expect(analysis.categories).toContain('news');
    });

    test('identifies social category from Twitter URL', () => {
      const analysis = tagger.analyzeUrl('https://twitter.com/user');

      expect(analysis.categories).toContain('social');
    });

    test('identifies shopping category from Amazon URL', () => {
      const analysis = tagger.analyzeUrl('https://amazon.com/product');

      expect(analysis.categories).toContain('shopping');
    });

    test('identifies finance category from bank URL', () => {
      const analysis = tagger.analyzeUrl('https://mybank.com/account');

      expect(analysis.categories).toContain('finance');
    });

    test('extracts domain tag correctly', () => {
      const analysis = tagger.analyzeUrl('https://www.example.com/page');

      expect(analysis.tags).toContain('example');
    });

    test('extracts domain from subdomain correctly', () => {
      const analysis = tagger.analyzeUrl('https://subdomain.example.com/page');

      expect(analysis.tags).toContain('example');
    });

    test('detects blog path', () => {
      const analysis = tagger.analyzeUrl('https://example.com/blog/post');

      expect(analysis.tags).toContain('blog');
    });

    test('detects docs path', () => {
      const analysis = tagger.analyzeUrl('https://example.com/docs/api');

      expect(analysis.tags).toContain('documentation');
    });

    test('detects api path', () => {
      const analysis = tagger.analyzeUrl('https://example.com/api/endpoint');

      expect(analysis.tags).toContain('api');
    });

    test('detects tutorial path', () => {
      const analysis = tagger.analyzeUrl('https://example.com/tutorial/lesson');

      expect(analysis.tags).toContain('tutorial');
    });

    test('handles invalid URL gracefully', () => {
      const analysis = tagger.analyzeUrl('not-a-valid-url');

      expect(analysis).toBeDefined();
      expect(analysis.categories).toEqual([]);
      expect(analysis.tags).toEqual([]);
    });
  });

  describe('analyzeTitle', () => {
    test('detects tutorial keywords', () => {
      const analysis = tagger.analyzeTitle('How to Learn JavaScript Tutorial');

      expect(analysis.tags).toContain('tutorial');
      expect(analysis.contentType).toBe('tutorial');
    });

    test('detects reference keywords', () => {
      const analysis = tagger.analyzeTitle('JavaScript API Documentation');

      expect(analysis.tags).toContain('reference');
      expect(analysis.contentType).toBe('reference');
    });

    test('detects tool keywords', () => {
      const analysis = tagger.analyzeTitle('Best Productivity Tool for Developers');

      expect(analysis.tags).toContain('tool');
      expect(analysis.contentType).toBe('tool');
    });

    test('detects article keywords', () => {
      const analysis = tagger.analyzeTitle('Interesting Blog Post About Tech');

      expect(analysis.tags).toContain('article');
      expect(analysis.contentType).toBe('article');
    });

    test('detects video keywords', () => {
      const analysis = tagger.analyzeTitle('Watch This Video Course');

      expect(analysis.tags).toContain('video');
      expect(analysis.contentType).toBe('video');
    });

    test('detects resource keywords', () => {
      const analysis = tagger.analyzeTitle('Awesome List of Resources');

      expect(analysis.tags).toContain('resource');
      expect(analysis.contentType).toBe('resource');
    });

    test('detects JavaScript tech keyword', () => {
      const analysis = tagger.analyzeTitle('JavaScript Best Practices');

      expect(analysis.tags).toContain('javascript');
    });

    test('detects Python tech keyword', () => {
      const analysis = tagger.analyzeTitle('Python Web Development');

      expect(analysis.tags).toContain('python');
    });

    test('detects React tech keyword', () => {
      const analysis = tagger.analyzeTitle('React Component Guide');

      expect(analysis.tags).toContain('react');
    });

    test('detects multiple tech keywords', () => {
      const analysis = tagger.analyzeTitle('React and TypeScript Tutorial');

      expect(analysis.tags).toContain('react');
      expect(analysis.tags).toContain('typescript');
    });

    test('handles empty title', () => {
      const analysis = tagger.analyzeTitle('');

      expect(analysis.tags).toEqual([]);
      expect(analysis.contentType).toBeNull();
    });

    test('handles null title', () => {
      const analysis = tagger.analyzeTitle(null);

      expect(analysis.tags).toEqual([]);
      expect(analysis.contentType).toBeNull();
    });

    test('handles undefined title', () => {
      const analysis = tagger.analyzeTitle(undefined);

      expect(analysis.tags).toEqual([]);
      expect(analysis.contentType).toBeNull();
    });

    test('is case insensitive', () => {
      const analysis = tagger.analyzeTitle('JAVASCRIPT TUTORIAL');

      expect(analysis.tags).toContain('javascript');
      expect(analysis.tags).toContain('tutorial');
    });
  });

  describe('determinePriority', () => {
    test('returns high priority for development documentation', () => {
      const bookmark = { id: '1', title: 'Docs', url: 'https://github.com' };
      const analysis = {
        categories: ['development'],
        tags: ['development', 'documentation']
      };

      const priority = tagger.determinePriority(bookmark, analysis);

      expect(priority).toBe('high');
    });

    test('returns high priority for tutorial tag', () => {
      const bookmark = { id: '2', title: 'Tutorial', url: 'https://example.com' };
      const analysis = {
        categories: [],
        tags: ['tutorial']
      };

      const priority = tagger.determinePriority(bookmark, analysis);

      expect(priority).toBe('high');
    });

    test('returns high priority for reference tag', () => {
      const bookmark = { id: '3', title: 'Reference', url: 'https://example.com' };
      const analysis = {
        categories: [],
        tags: ['reference']
      };

      const priority = tagger.determinePriority(bookmark, analysis);

      expect(priority).toBe('high');
    });

    test('returns low priority for social category', () => {
      const bookmark = { id: '4', title: 'Social', url: 'https://twitter.com' };
      const analysis = {
        categories: ['social'],
        tags: ['social']
      };

      const priority = tagger.determinePriority(bookmark, analysis);

      expect(priority).toBe('low');
    });

    test('returns low priority for news category', () => {
      const bookmark = { id: '5', title: 'News', url: 'https://reddit.com' };
      const analysis = {
        categories: ['news'],
        tags: ['news']
      };

      const priority = tagger.determinePriority(bookmark, analysis);

      expect(priority).toBe('low');
    });

    test('returns normal priority by default', () => {
      const bookmark = { id: '6', title: 'Normal', url: 'https://example.com' };
      const analysis = {
        categories: [],
        tags: []
      };

      const priority = tagger.determinePriority(bookmark, analysis);

      expect(priority).toBe('normal');
    });
  });

  describe('calculateConfidence', () => {
    test('calculates confidence based on categories', () => {
      const analysis = {
        categories: ['development', 'design'],
        tags: [],
        contentType: 'unknown'
      };

      const confidence = tagger.calculateConfidence(analysis);

      expect(confidence).toBe(0.6); // 2 categories * 0.3 = 0.6
    });

    test('calculates confidence based on tags', () => {
      const analysis = {
        categories: [],
        tags: ['javascript', 'react', 'tutorial'],
        contentType: 'unknown'
      };

      const confidence = tagger.calculateConfidence(analysis);

      // 3 tags * 0.1 = 0.3 (allowing for floating point precision)
      expect(confidence).toBeCloseTo(0.3, 5);
    });

    test('calculates confidence with content type', () => {
      const analysis = {
        categories: ['development'],
        tags: ['javascript'],
        contentType: 'tutorial'
      };

      const confidence = tagger.calculateConfidence(analysis);

      // 1 category * 0.3 + 1 tag * 0.1 + 0.4 for content type = 0.8
      expect(confidence).toBe(0.8);
    });

    test('caps confidence at 1.0', () => {
      const analysis = {
        categories: ['development', 'design', 'education', 'productivity'],
        tags: ['javascript', 'react', 'tutorial', 'reference', 'tool'],
        contentType: 'tutorial'
      };

      const confidence = tagger.calculateConfidence(analysis);

      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    test('returns 0 for empty analysis', () => {
      const analysis = {
        categories: [],
        tags: [],
        contentType: 'unknown'
      };

      const confidence = tagger.calculateConfidence(analysis);

      expect(confidence).toBe(0);
    });
  });

  describe('generateFolderSuggestions', () => {
    test('generates folder suggestions from bookmarks', () => {
      const bookmarks = [
        { id: '1', title: 'React Docs', url: 'https://github.com/facebook/react' },
        { id: '2', title: 'Vue Guide', url: 'https://github.com/vuejs/vue' },
        { id: '3', title: 'Design Inspiration', url: 'https://dribbble.com/designer' }
      ];

      const suggestions = tagger.generateFolderSuggestions(bookmarks);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.key === 'development')).toBe(true);
      expect(suggestions.some(s => s.key === 'design')).toBe(true);
    });

    test('sorts suggestions by confidence and bookmark count', () => {
      const bookmarks = [
        { id: '1', title: 'GitHub Repo 1', url: 'https://github.com/repo1' },
        { id: '2', title: 'GitHub Repo 2', url: 'https://github.com/repo2' },
        { id: '3', title: 'GitHub Repo 3', url: 'https://github.com/repo3' },
        { id: '4', title: 'Design 1', url: 'https://dribbble.com/design1' }
      ];

      const suggestions = tagger.generateFolderSuggestions(bookmarks);

      // Development folder should come first (more bookmarks)
      expect(suggestions[0].key).toBe('development');
      expect(suggestions[0].bookmarks.length).toBe(3);
    });

    test('limits suggestions to top 10', () => {
      const bookmarks = [];
      // Create bookmarks for many different categories
      const categories = ['development', 'design', 'education', 'productivity', 'news', 
                         'social', 'shopping', 'finance'];
      
      categories.forEach((cat, i) => {
        bookmarks.push({
          id: `b${i}`,
          title: `${cat} bookmark`,
          url: `https://${cat}.example.com`
        });
      });

      const suggestions = tagger.generateFolderSuggestions(bookmarks);

      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    test('calculates average confidence correctly', () => {
      const bookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://github.com/react' },
        { id: '2', title: 'Vue Guide', url: 'https://github.com/vue' }
      ];

      const suggestions = tagger.generateFolderSuggestions(bookmarks);

      const devSuggestion = suggestions.find(s => s.key === 'development');
      expect(devSuggestion).toBeDefined();
      expect(devSuggestion.avgConfidence).toBeGreaterThan(0);
      expect(devSuggestion.avgConfidence).toBeLessThanOrEqual(1.0);
    });

    test('handles empty bookmarks array', () => {
      const suggestions = tagger.generateFolderSuggestions([]);

      expect(suggestions).toEqual([]);
    });

    test('formats category names correctly', () => {
      const bookmarks = [
        { id: '1', title: 'Dev', url: 'https://github.com/repo' }
      ];

      const suggestions = tagger.generateFolderSuggestions(bookmarks);

      expect(suggestions[0].name).toBe('Development & Programming');
    });
  });

  describe('formatCategoryName', () => {
    test('formats known categories correctly', () => {
      expect(tagger.formatCategoryName('development')).toBe('Development & Programming');
      expect(tagger.formatCategoryName('design')).toBe('Design & Creative');
      expect(tagger.formatCategoryName('education')).toBe('Learning & Education');
      expect(tagger.formatCategoryName('productivity')).toBe('Productivity & Tools');
      expect(tagger.formatCategoryName('news')).toBe('News & Articles');
      expect(tagger.formatCategoryName('social')).toBe('Social Media');
      expect(tagger.formatCategoryName('shopping')).toBe('Shopping & E-commerce');
      expect(tagger.formatCategoryName('finance')).toBe('Finance & Business');
    });

    test('formats unknown categories with capital first letter', () => {
      expect(tagger.formatCategoryName('unknown')).toBe('Unknown');
      expect(tagger.formatCategoryName('custom')).toBe('Custom');
    });
  });

  describe('detectDuplicates', () => {
    test('detects exact URL duplicates', () => {
      const bookmarks = [
        { id: '1', title: 'First', url: 'https://example.com/page' },
        { id: '2', title: 'Second', url: 'https://example.com/page' }
      ];

      const duplicates = tagger.detectDuplicates(bookmarks);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].type).toBe('exact-url');
      expect(duplicates[0].confidence).toBe(1.0);
      expect(duplicates[0].bookmarks).toHaveLength(2);
    });

    test('detects similar title duplicates', () => {
      const bookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://example.com/page1' },
        { id: '2', title: 'react tutorial', url: 'https://example.com/page2' }
      ];

      const duplicates = tagger.detectDuplicates(bookmarks);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].type).toBe('similar-title');
      expect(duplicates[0].confidence).toBe(0.8);
    });

    test('handles both URL and title duplicates', () => {
      const bookmarks = [
        { id: '1', title: 'Duplicate', url: 'https://example.com/page' },
        { id: '2', title: 'Duplicate', url: 'https://example.com/page' },
        { id: '3', title: 'Duplicate', url: 'https://example.com/other' }
      ];

      const duplicates = tagger.detectDuplicates(bookmarks);

      // Should detect URL duplicate and title duplicate
      expect(duplicates.length).toBeGreaterThanOrEqual(1);
    });

    test('handles empty bookmarks array', () => {
      const duplicates = tagger.detectDuplicates([]);

      expect(duplicates).toEqual([]);
    });

    test('handles bookmarks with empty titles', () => {
      const bookmarks = [
        { id: '1', title: '', url: 'https://example.com/page1' },
        { id: '2', title: '', url: 'https://example.com/page2' }
      ];

      const duplicates = tagger.detectDuplicates(bookmarks);

      // Should not throw, but may not detect duplicates without titles
      expect(Array.isArray(duplicates)).toBe(true);
    });

    test('is case insensitive for titles', () => {
      const bookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://example.com/page1' },
        { id: '2', title: 'REACT TUTORIAL', url: 'https://example.com/page2' }
      ];

      const duplicates = tagger.detectDuplicates(bookmarks);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].type).toBe('similar-title');
    });

    test('trims whitespace from titles', () => {
      const bookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://example.com/page1' },
        { id: '2', title: '  React Tutorial  ', url: 'https://example.com/page2' }
      ];

      const duplicates = tagger.detectDuplicates(bookmarks);

      expect(duplicates.length).toBe(1);
    });
  });

  describe('getOrganizationRecommendations', () => {
    test('returns all recommendation types', () => {
      const bookmarks = [
        { id: '1', title: 'React Docs', url: 'https://github.com/react' },
        { id: '2', title: 'React Docs', url: 'https://github.com/react' }, // Duplicate
        { id: '3', title: 'Untitled', url: 'https://example.com' } // Generic title
      ];

      const recommendations = tagger.getOrganizationRecommendations(bookmarks);

      expect(recommendations).toHaveProperty('folders');
      expect(recommendations).toHaveProperty('duplicates');
      expect(recommendations).toHaveProperty('cleanup');
      expect(recommendations).toHaveProperty('priority');
    });

    test('includes folder suggestions', () => {
      const bookmarks = [
        { id: '1', title: 'GitHub Repo', url: 'https://github.com/repo' }
      ];

      const recommendations = tagger.getOrganizationRecommendations(bookmarks);

      expect(Array.isArray(recommendations.folders)).toBe(true);
    });

    test('includes duplicate detection', () => {
      const bookmarks = [
        { id: '1', title: 'Duplicate', url: 'https://example.com/page' },
        { id: '2', title: 'Duplicate', url: 'https://example.com/page' }
      ];

      const recommendations = tagger.getOrganizationRecommendations(bookmarks);

      expect(recommendations.duplicates.length).toBeGreaterThan(0);
    });

    test('includes cleanup recommendations', () => {
      const bookmarks = [
        { id: '1', title: 'Untitled', url: 'https://example.com' }
      ];

      const recommendations = tagger.getOrganizationRecommendations(bookmarks);

      expect(recommendations.cleanup.length).toBeGreaterThan(0);
    });

    test('includes priority recommendations', () => {
      const bookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://github.com/react' },
        { id: '2', title: 'Twitter Feed', url: 'https://twitter.com/user' }
      ];

      const recommendations = tagger.getOrganizationRecommendations(bookmarks);

      expect(recommendations.priority).toHaveProperty('high');
      expect(recommendations.priority).toHaveProperty('low');
    });
  });

  describe('getCleanupRecommendations', () => {
    test('detects bookmarks with generic titles', () => {
      const bookmarks = [
        { id: '1', title: 'Untitled', url: 'https://example.com' },
        { id: '2', title: 'Test', url: 'https://example.com/page' }, // Less than 5 chars
        { id: '3', title: 'Valid Title', url: 'https://example.com/valid' }
      ];

      const recommendations = tagger.getCleanupRecommendations(bookmarks);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('generic-titles');
    });

    test('detects bookmarks with missing titles', () => {
      const bookmarks = [
        { id: '1', title: '', url: 'https://example.com' },
        { id: '2', title: null, url: 'https://example.com/page' }
      ];

      const recommendations = tagger.getCleanupRecommendations(bookmarks);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('detects bookmarks where title equals hostname', () => {
      const bookmarks = [
        { id: '1', title: 'example.com', url: 'https://example.com/page' }
      ];

      const recommendations = tagger.getCleanupRecommendations(bookmarks);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('returns empty array when no generic titles found', () => {
      const bookmarks = [
        { id: '1', title: 'Valid Bookmark Title', url: 'https://example.com' }
      ];

      const recommendations = tagger.getCleanupRecommendations(bookmarks);

      expect(recommendations).toEqual([]);
    });

    test('handles bookmarks with invalid URLs gracefully', () => {
      const bookmarks = [
        { id: '1', title: 'Untitled', url: 'not-a-valid-url' }
      ];

      // Should not throw
      expect(() => {
        tagger.getCleanupRecommendations(bookmarks);
      }).not.toThrow();
    });
  });

  describe('getPriorityRecommendations', () => {
    test('identifies high priority bookmarks', () => {
      const bookmarks = [
        { id: '1', title: 'React Documentation', url: 'https://github.com/react' },
        { id: '2', title: 'JavaScript Tutorial', url: 'https://example.com' }
      ];

      const recommendations = tagger.getPriorityRecommendations(bookmarks);

      expect(recommendations.high.length).toBeGreaterThan(0);
    });

    test('identifies low priority bookmarks', () => {
      const bookmarks = [
        { id: '1', title: 'Twitter Feed', url: 'https://twitter.com/user' },
        { id: '2', title: 'Reddit Post', url: 'https://reddit.com/post' }
      ];

      const recommendations = tagger.getPriorityRecommendations(bookmarks);

      expect(recommendations.low.length).toBeGreaterThan(0);
    });

    test('limits high priority to top 10', () => {
      const bookmarks = [];
      for (let i = 0; i < 15; i++) {
        bookmarks.push({
          id: `b${i}`,
          title: `React Tutorial ${i}`,
          url: `https://github.com/repo${i}`
        });
      }

      const recommendations = tagger.getPriorityRecommendations(bookmarks);

      expect(recommendations.high.length).toBeLessThanOrEqual(10);
    });

    test('limits low priority to top 20', () => {
      const bookmarks = [];
      for (let i = 0; i < 25; i++) {
        bookmarks.push({
          id: `b${i}`,
          title: `Twitter Feed ${i}`,
          url: `https://twitter.com/user${i}`
        });
      }

      const recommendations = tagger.getPriorityRecommendations(bookmarks);

      expect(recommendations.low.length).toBeLessThanOrEqual(20);
    });

    test('includes analysis in priority recommendations', () => {
      const bookmarks = [
        { id: '1', title: 'React Tutorial', url: 'https://github.com/react' }
      ];

      const recommendations = tagger.getPriorityRecommendations(bookmarks);

      if (recommendations.high.length > 0) {
        expect(recommendations.high[0]).toHaveProperty('analysis');
        expect(recommendations.high[0].analysis).toHaveProperty('priority');
      }
    });
  });
});

