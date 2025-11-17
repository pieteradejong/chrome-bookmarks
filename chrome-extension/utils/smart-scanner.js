/**
 * Smart bookmark scanner with improved UX for large collections
 */
class SmartBookmarkScanner {
  constructor() {
    this.bookmarkChecker = new BookmarkChecker();
    this.scanStrategies = {
      quick: { limit: 50, timeout: 3000, description: 'Recent bookmarks (~30 seconds)' },
      smart: { limit: 200, timeout: 5000, description: 'Priority bookmarks (~2 minutes)' },
      full: { limit: Infinity, timeout: 5000, description: 'All bookmarks (background)' }
    };
  }

  /**
   * Get scan recommendations based on bookmark count
   */
  async getScanRecommendations() {
    const allBookmarks = await this.bookmarkChecker.getAllBookmarks();
    const count = allBookmarks.length;

    const recommendations = {
      bookmarkCount: count,
      estimatedTimes: this.getTimeEstimates(count),
      recommendedStrategy: this.getRecommendedStrategy(count),
      strategies: this.scanStrategies
    };

    return recommendations;
  }

  /**
   * Get time estimates for different strategies
   */
  getTimeEstimates(count) {
    const concurrent = 15;
    const avgTimePerBookmark = 0.5; // seconds

    return {
      quick: Math.min(30, Math.ceil(50 * avgTimePerBookmark / concurrent)),
      smart: Math.min(120, Math.ceil(200 * avgTimePerBookmark / concurrent)),
      full: Math.ceil(count * avgTimePerBookmark / concurrent)
    };
  }

  /**
   * Get recommended strategy based on bookmark count
   */
  getRecommendedStrategy(count) {
    if (count <= 100) return 'quick';
    if (count <= 500) return 'smart';
    return 'background';
  }

  /**
   * Perform quick scan of most important bookmarks
   */
  async quickScan(progressCallback) {
    const recentBookmarks = await this.getRecentBookmarks(50);
    return this.scanBookmarks(recentBookmarks, 'quick', progressCallback);
  }

  /**
   * Perform smart scan with prioritization
   */
  async smartScan(progressCallback) {
    const priorityBookmarks = await this.getPriorityBookmarks(200);
    return this.scanBookmarks(priorityBookmarks, 'smart', progressCallback);
  }

  /**
   * Start background scan for large collections
   */
  async startBackgroundScan(progressCallback) {
    const allBookmarks = await this.bookmarkChecker.getAllBookmarks();

    // Process in chunks over time
    const chunkSize = 50;
    const chunks = this.chunkArray(allBookmarks, chunkSize);

    let allResults = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkResults = await this.scanBookmarks(chunk, 'full', (progress) => {
        const overallProgress = {
          completed: (i * chunkSize) + progress.completed,
          total: allBookmarks.length,
          percentage: Math.round(((i * chunkSize) + progress.completed) / allBookmarks.length * 100),
          currentChunk: i + 1,
          totalChunks: chunks.length
        };
        progressCallback(overallProgress);
      });

      allResults = allResults.concat(chunkResults);

      // Save intermediate results
      await this.saveIntermediateResults(allResults, i + 1, chunks.length);

      // Small delay between chunks to keep browser responsive
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allResults;
  }

  /**
   * Get recent bookmarks (prioritize recently added)
   */
  async getRecentBookmarks(limit) {
    return new Promise((resolve) => {
      chrome.bookmarks.getRecent(limit, (recent) => {
        // Convert to our bookmark format
        const bookmarks = recent.map(bookmark => ({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          dateAdded: bookmark.dateAdded,
          parentId: bookmark.parentId
        }));
        resolve(bookmarks);
      });
    });
  }

  /**
   * Get priority bookmarks (recent + frequently accessed folders)
   */
  async getPriorityBookmarks(limit) {
    const allBookmarks = await this.bookmarkChecker.getAllBookmarks();

    // Sort by date added (most recent first)
    const sortedBookmarks = allBookmarks.sort((a, b) =>
      (b.dateAdded || 0) - (a.dateAdded || 0)
    );

    return sortedBookmarks.slice(0, limit);
  }

  /**
   * Scan bookmarks with specific strategy settings
   */
  async scanBookmarks(bookmarks, strategy, progressCallback) {
    const settings = this.scanStrategies[strategy];

    // Temporarily override timeout for this scan
    const originalTimeout = this.bookmarkChecker.constructor.prototype.performUrlCheck;

    // Use strategy-specific timeout
    this.bookmarkChecker.timeout = settings.timeout;

    const results = await this.bookmarkChecker.checkMultipleBookmarks(
      bookmarks,
      progressCallback
    );

    return results;
  }

  /**
   * Save intermediate results to storage
   */
  async saveIntermediateResults(results, currentChunk, totalChunks) {
    const categorizedResults = this.bookmarkChecker.categorizeResults(results);

    await chrome.storage.local.set({
      scanProgress: {
        completed: results.length,
        currentChunk,
        totalChunks,
        lastUpdate: Date.now(),
        partialResults: categorizedResults
      }
    });
  }

  /**
   * Resume interrupted scan
   */
  async resumeScan() {
    const stored = await chrome.storage.local.get('scanProgress');
    if (stored.scanProgress) {
      return stored.scanProgress;
    }
    return null;
  }

  /**
   * Chunk array into smaller arrays
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get scan status for display
   */
  getScanStatusMessage(progress) {
    if (progress.totalChunks) {
      return `Processing chunk ${progress.currentChunk} of ${progress.totalChunks} (${progress.percentage}% complete)`;
    }
    return `Checked ${progress.completed} of ${progress.total} bookmarks (${progress.percentage}%)`;
  }

  /**
   * Estimate remaining time
   */
  estimateRemainingTime(progress, startTime) {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = progress.completed / elapsed; // bookmarks per second
    const remaining = progress.total - progress.completed;
    const estimatedSeconds = remaining / rate;

    if (estimatedSeconds < 60) {
      return `~${Math.round(estimatedSeconds)} seconds remaining`;
    } else {
      return `~${Math.round(estimatedSeconds / 60)} minutes remaining`;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartBookmarkScanner;
} else if (typeof window !== 'undefined') {
  window.SmartBookmarkScanner = SmartBookmarkScanner;
}
