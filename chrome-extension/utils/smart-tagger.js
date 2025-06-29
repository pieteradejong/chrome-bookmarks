/**
 * Smart Bookmark Tagger
 * Automatically categorizes and tags bookmarks based on URL patterns and content analysis
 */
class SmartTagger {
  constructor() {
    this.urlPatterns = this.initializeUrlPatterns();
    this.contentKeywords = this.initializeContentKeywords();
  }

  /**
   * Initialize URL patterns for automatic categorization
   */
  initializeUrlPatterns() {
    return {
      // Development & Tech
      development: [
        /github\.com/i, /stackoverflow\.com/i, /codepen\.io/i, /jsfiddle\.net/i,
        /developer\.mozilla\.org/i, /npmjs\.com/i, /pypi\.org/i, /packagist\.org/i,
        /docs\..*\.com/i, /api\..*\.com/i, /devdocs\.io/i
      ],

      // Design & Creative
      design: [
        /dribbble\.com/i, /behance\.net/i, /figma\.com/i, /sketch\.com/i,
        /adobe\.com/i, /canva\.com/i, /unsplash\.com/i, /pexels\.com/i,
        /fonts\.google\.com/i, /fontawesome\.com/i, /coolors\.co/i
      ],

      // Learning & Education
      education: [
        /coursera\.org/i, /edx\.org/i, /udemy\.com/i, /khanacademy\.org/i,
        /youtube\.com\/watch/i, /ted\.com/i, /wikipedia\.org/i, /medium\.com/i,
        /towards.*science/i, /freecodecamp\.org/i
      ],

      // Productivity & Tools
      productivity: [
        /notion\.so/i, /trello\.com/i, /slack\.com/i, /zoom\.us/i,
        /google\.com\/drive/i, /dropbox\.com/i, /calendly\.com/i,
        /zapier\.com/i, /ifttt\.com/i, /todoist\.com/i
      ],

      // News & Articles
      news: [
        /news\.ycombinator\.com/i, /reddit\.com/i, /techcrunch\.com/i,
        /arstechnica\.com/i, /theverge\.com/i, /wired\.com/i,
        /bloomberg\.com/i, /reuters\.com/i, /bbc\.com/i
      ],

      // Social Media
      social: [
        /twitter\.com/i, /x\.com/i, /linkedin\.com/i, /facebook\.com/i,
        /instagram\.com/i, /tiktok\.com/i, /discord\.com/i
      ],

      // Shopping & E-commerce
      shopping: [
        /amazon\.com/i, /ebay\.com/i, /etsy\.com/i, /shopify\.com/i,
        /stripe\.com/i, /paypal\.com/i, /aliexpress\.com/i
      ],

      // Finance & Business
      finance: [
        /bank/i, /finance/i, /invest/i, /crypto/i, /blockchain/i,
        /coinbase\.com/i, /robinhood\.com/i, /mint\.com/i
      ]
    };
  }

  /**
   * Initialize content keywords for deeper categorization
   */
  initializeContentKeywords() {
    return {
      tutorial: ['tutorial', 'how to', 'guide', 'step by step', 'learn', 'beginners'],
      reference: ['documentation', 'docs', 'api', 'reference', 'cheat sheet', 'specs'],
      tool: ['tool', 'app', 'software', 'platform', 'service', 'utility'],
      article: ['article', 'blog', 'post', 'read', 'story', 'opinion'],
      video: ['video', 'watch', 'youtube', 'tutorial', 'course', 'webinar'],
      resource: ['resource', 'collection', 'list', 'awesome', 'curated', 'library']
    };
  }

  /**
   * Analyze and tag a bookmark
   */
  analyzeBookmark(bookmark) {
    const analysis = {
      categories: [],
      tags: [],
      contentType: 'unknown',
      priority: 'normal',
      confidence: 0
    };

    // Analyze URL patterns
    const urlAnalysis = this.analyzeUrl(bookmark.url);
    analysis.categories.push(...urlAnalysis.categories);
    analysis.tags.push(...urlAnalysis.tags);

    // Analyze title and content
    const titleAnalysis = this.analyzeTitle(bookmark.title);
    analysis.tags.push(...titleAnalysis.tags);
    analysis.contentType = titleAnalysis.contentType || analysis.contentType;

    // Determine priority based on patterns
    analysis.priority = this.determinePriority(bookmark, analysis);

    // Calculate confidence score
    analysis.confidence = this.calculateConfidence(analysis);

    // Clean up duplicates
    analysis.categories = [...new Set(analysis.categories)];
    analysis.tags = [...new Set(analysis.tags)];

    return analysis;
  }

  /**
   * Analyze URL patterns
   */
  analyzeUrl(url) {
    const analysis = { categories: [], tags: [] };

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();

      // Check against URL patterns
      for (const [category, patterns] of Object.entries(this.urlPatterns)) {
        if (patterns.some(pattern => pattern.test(url))) {
          analysis.categories.push(category);
          analysis.tags.push(category);
        }
      }

      // Extract domain-based tags
      const domainParts = domain.split('.');
      const mainDomain = domainParts.length > 2 ? domainParts[domainParts.length - 2] : domainParts[0];
      analysis.tags.push(mainDomain);

      // Analyze path for additional context
      if (path.includes('/blog/')) analysis.tags.push('blog');
      if (path.includes('/docs/')) analysis.tags.push('documentation');
      if (path.includes('/api/')) analysis.tags.push('api');
      if (path.includes('/tutorial/')) analysis.tags.push('tutorial');

    } catch (error) {
      console.warn('Error analyzing URL:', url, error);
    }

    return analysis;
  }

  /**
   * Analyze bookmark title
   */
  analyzeTitle(title) {
    const analysis = { tags: [], contentType: null };

    if (!title) return analysis;

    const titleLower = title.toLowerCase();

    // Check content keywords
    for (const [type, keywords] of Object.entries(this.contentKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        analysis.tags.push(type);
        if (!analysis.contentType) {
          analysis.contentType = type;
        }
      }
    }

    // Extract technology mentions
    const techKeywords = [
      'javascript', 'python', 'react', 'vue', 'angular', 'node', 'docker',
      'kubernetes', 'aws', 'azure', 'gcp', 'css', 'html', 'typescript',
      'rust', 'go', 'java', 'swift', 'kotlin', 'flutter', 'figma', 'sketch'
    ];

    techKeywords.forEach(tech => {
      if (titleLower.includes(tech)) {
        analysis.tags.push(tech);
      }
    });

    return analysis;
  }

  /**
   * Determine bookmark priority
   */
  determinePriority(bookmark, analysis) {
    // High priority indicators
    if (analysis.categories.includes('development') &&
        analysis.tags.includes('documentation')) {
      return 'high';
    }

    if (analysis.tags.includes('tutorial') ||
        analysis.tags.includes('reference')) {
      return 'high';
    }

    // Low priority indicators
    if (analysis.categories.includes('social') ||
        analysis.categories.includes('news')) {
      return 'low';
    }

    return 'normal';
  }

  /**
   * Calculate confidence score for the analysis
   */
  calculateConfidence(analysis) {
    let score = 0;

    // More categories = higher confidence
    score += analysis.categories.length * 0.3;

    // Specific tags = higher confidence
    score += analysis.tags.length * 0.1;

    // Content type identified = higher confidence
    if (analysis.contentType !== 'unknown') {
      score += 0.4;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate smart folder suggestions
   */
  generateFolderSuggestions(bookmarks) {
    const suggestions = new Map();

    bookmarks.forEach(bookmark => {
      const analysis = this.analyzeBookmark(bookmark);

      analysis.categories.forEach(category => {
        if (!suggestions.has(category)) {
          suggestions.set(category, {
            name: this.formatCategoryName(category),
            bookmarks: [],
            confidence: 0
          });
        }

        const suggestion = suggestions.get(category);
        suggestion.bookmarks.push(bookmark);
        suggestion.confidence += analysis.confidence;
      });
    });

    // Sort by confidence and bookmark count
    return Array.from(suggestions.entries())
      .map(([key, value]) => ({
        key,
        ...value,
        avgConfidence: value.confidence / value.bookmarks.length
      }))
      .sort((a, b) => (b.bookmarks.length * b.avgConfidence) - (a.bookmarks.length * a.avgConfidence))
      .slice(0, 10); // Top 10 suggestions
  }

  /**
   * Format category name for display
   */
  formatCategoryName(category) {
    const names = {
      development: 'Development & Programming',
      design: 'Design & Creative',
      education: 'Learning & Education',
      productivity: 'Productivity & Tools',
      news: 'News & Articles',
      social: 'Social Media',
      shopping: 'Shopping & E-commerce',
      finance: 'Finance & Business'
    };

    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Detect duplicate bookmarks
   */
  detectDuplicates(bookmarks) {
    const duplicates = [];
    const urlMap = new Map();
    const titleMap = new Map();

    bookmarks.forEach((bookmark, index) => {
      // Check for exact URL duplicates
      if (urlMap.has(bookmark.url)) {
        duplicates.push({
          type: 'exact-url',
          bookmarks: [urlMap.get(bookmark.url), bookmark],
          confidence: 1.0
        });
      } else {
        urlMap.set(bookmark.url, bookmark);
      }

      // Check for similar titles
      const normalizedTitle = bookmark.title.toLowerCase().trim();
      if (normalizedTitle && titleMap.has(normalizedTitle)) {
        duplicates.push({
          type: 'similar-title',
          bookmarks: [titleMap.get(normalizedTitle), bookmark],
          confidence: 0.8
        });
      } else if (normalizedTitle) {
        titleMap.set(normalizedTitle, bookmark);
      }
    });

    return duplicates;
  }

  /**
   * Get organization recommendations
   */
  getOrganizationRecommendations(bookmarks) {
    const folderSuggestions = this.generateFolderSuggestions(bookmarks);
    const duplicates = this.detectDuplicates(bookmarks);

    const recommendations = {
      folders: folderSuggestions,
      duplicates: duplicates,
      cleanup: this.getCleanupRecommendations(bookmarks),
      priority: this.getPriorityRecommendations(bookmarks)
    };

    return recommendations;
  }

  /**
   * Get cleanup recommendations
   */
  getCleanupRecommendations(bookmarks) {
    const recommendations = [];

    // Find bookmarks with generic titles
    const genericTitles = bookmarks.filter(b =>
      !b.title ||
      b.title.length < 5 ||
      b.title.toLowerCase().includes('untitled') ||
      b.title === new URL(b.url).hostname
    );

    if (genericTitles.length > 0) {
      recommendations.push({
        type: 'generic-titles',
        count: genericTitles.length,
        suggestion: 'Update bookmark titles for better organization',
        bookmarks: genericTitles
      });
    }

    return recommendations;
  }

  /**
   * Get priority recommendations
   */
  getPriorityRecommendations(bookmarks) {
    const analyzed = bookmarks.map(b => ({
      ...b,
      analysis: this.analyzeBookmark(b)
    }));

    const highPriority = analyzed.filter(b => b.analysis.priority === 'high');
    const lowPriority = analyzed.filter(b => b.analysis.priority === 'low');

    return {
      high: highPriority.slice(0, 10), // Top 10 high priority
      low: lowPriority.slice(0, 20)    // Top 20 low priority (for cleanup)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartTagger;
} else if (typeof window !== 'undefined') {
  window.SmartTagger = SmartTagger;
}
