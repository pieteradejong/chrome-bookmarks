/**
 * Core bookmark health checking functionality
 */
class BookmarkChecker {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get all bookmarks from Chrome bookmarks API
   */
  async getAllBookmarks() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => {
        const bookmarks = this.extractBookmarksFromTree(tree);
        resolve(bookmarks);
      });
    });
  }

  /**
   * Extract all URL bookmarks from the bookmark tree
   */
  extractBookmarksFromTree(tree) {
    const bookmarks = [];
    
    const traverse = (nodes) => {
      for (const node of nodes) {
        if (node.url) {
          bookmarks.push({
            id: node.id,
            title: node.title,
            url: node.url,
            dateAdded: node.dateAdded,
            parentId: node.parentId
          });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    
    traverse(tree);
    return bookmarks;
  }

  /**
   * Check the health of a single bookmark
   */
  async checkBookmarkHealth(bookmark) {
    const cacheKey = bookmark.url;
    const cached = this.cache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return { ...cached.result, fromCache: true };
    }

    try {
      const result = await this.performUrlCheck(bookmark.url);
      const healthResult = {
        ...bookmark,
        ...result,
        timestamp: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        result: healthResult,
        timestamp: Date.now()
      });

      return healthResult;
    } catch (error) {
      const errorResult = {
        ...bookmark,
        status: 'error',
        category: 'connection-error',
        message: error.message,
        timestamp: Date.now()
      };

      this.cache.set(cacheKey, {
        result: errorResult,
        timestamp: Date.now()
      });

      return errorResult;
    }
  }

  /**
   * Perform the actual URL check
   */
  async performUrlCheck(url) {
    try {
      // Use fetch with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Required for cross-origin requests
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      // Note: With no-cors mode, we can't read the actual status
      // but if fetch succeeds, the URL is likely accessible
      return {
        status: 'ok',
        category: 'working',
        message: 'URL appears to be accessible',
        statusCode: null // Can't read with no-cors
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          status: 'error',
          category: 'timeout',
          message: 'Request timed out',
          statusCode: null
        };
      }

      // Analyze error to categorize
      return this.categorizeError(url, error);
    }
  }

  /**
   * Categorize errors and URLs based on patterns
   */
  categorizeError(url, error) {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Domain-specific categorization
    if (hostname.includes('linkedin.com')) {
      return {
        status: 'restricted',
        category: 'bot-protected',
        message: 'LinkedIn blocks automated requests',
        action: 'keep'
      };
    }

    if (hostname.includes('docs.google.com') || hostname.includes('drive.google.com')) {
      return {
        status: 'restricted',
        category: 'login-required',
        message: 'Google Docs requires authentication',
        action: 'keep'
      };
    }

    if (hostname.includes('stackoverflow.com') || hostname.includes('github.com')) {
      return {
        status: 'restricted',
        category: 'bot-protected',
        message: 'Site may block automated requests',
        action: 'keep'
      };
    }

    // Generic error categorization
    if (error.message.includes('Failed to fetch')) {
      return {
        status: 'error',
        category: 'connection-error',
        message: 'Cannot connect to server',
        action: 'review'
      };
    }

    return {
      status: 'error',
      category: 'unknown',
      message: error.message,
      action: 'review'
    };
  }

  /**
   * Check multiple bookmarks with progress callback
   */
  async checkMultipleBookmarks(bookmarks, progressCallback) {
    const results = [];
    const batchSize = 15; // Increased batch size for faster processing

    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      const batchPromises = batch.map(bookmark => this.checkBookmarkHealth(bookmark));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            ...batch[index],
            status: 'error',
            category: 'check-failed',
            message: 'Health check failed',
            action: 'review'
          });
        }
      });

      // Report progress
      if (progressCallback) {
        progressCallback({
          completed: Math.min(i + batchSize, bookmarks.length),
          total: bookmarks.length,
          percentage: Math.round((Math.min(i + batchSize, bookmarks.length) / bookmarks.length) * 100)
        });
      }

      // Removed delay for faster processing
      // await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Categorize results for display
   */
  categorizeResults(results) {
    const categories = {
      'working': [],
      'bot-protected': [],
      'login-required': [],
      'connection-error': [],
      'timeout': [],
      'unknown': [],
      'check-failed': []
    };

    results.forEach(result => {
      const category = result.category || 'unknown';
      if (categories[category]) {
        categories[category].push(result);
      } else {
        categories['unknown'].push(result);
      }
    });

    return categories;
  }

  /**
   * Get deletion recommendations
   */
  getDeletionRecommendations(categorizedResults) {
    const recommendations = {
      safeToDelete: [],
      reviewRequired: [],
      keepThese: []
    };

    // Connection errors might be safe to delete
    recommendations.reviewRequired.push(...categorizedResults['connection-error']);
    recommendations.reviewRequired.push(...categorizedResults['timeout']);
    recommendations.reviewRequired.push(...categorizedResults['unknown']);
    recommendations.reviewRequired.push(...categorizedResults['check-failed']);

    // These should be kept
    recommendations.keepThese.push(...categorizedResults['working']);
    recommendations.keepThese.push(...categorizedResults['bot-protected']);
    recommendations.keepThese.push(...categorizedResults['login-required']);

    return recommendations;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
} 