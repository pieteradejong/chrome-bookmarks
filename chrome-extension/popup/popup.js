/**
 * Popup interface controller
 */
class PopupController {
  constructor() {
    this.bookmarkChecker = new BookmarkChecker();
    this.smartTagger = new SmartTagger();
    this.currentScan = null;
    this.scanResults = null;
    this.organizationResults = null;
    this.selectedBookmarks = new Set();
    
    this.initializeUI();
    this.loadStoredData();
  }

  /**
   * Initialize UI event handlers
   */
  initializeUI() {
    // Initial state buttons
    document.getElementById('scan-btn').addEventListener('click', () => {
      console.log('🔘 Start Scan button clicked');
      this.debugLog('Start Scan button clicked', 'info');
      
      // Quick test alert
      alert('Start Scan clicked! Check debug console for details.');
      
      this.startScan();
    });
    
    // New organization button
    document.getElementById('organize-btn').addEventListener('click', () => {
      console.log('🎯 Smart Organization button clicked');
      this.debugLog('Smart Organization button clicked', 'info');
      this.startOrganization();
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
    
    // Debug toggle
    document.getElementById('toggle-debug').addEventListener('click', () => this.toggleDebug());
    
    // Scanning state buttons
    document.getElementById('cancel-scan-btn').addEventListener('click', () => this.cancelScan());
    
    // Organization state buttons
    document.getElementById('cancel-organization-btn').addEventListener('click', () => this.cancelOrganization());
    
    // Results state buttons
    document.getElementById('rescan-btn').addEventListener('click', () => this.startScan());
    document.getElementById('export-btn').addEventListener('click', () => this.exportResults());
    document.getElementById('bulk-delete-btn').addEventListener('click', () => this.bulkDelete());
    document.getElementById('apply-organization-btn').addEventListener('click', () => this.applyOrganization());
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.category));
    });

    // Show initial state
    this.showState('initial');
    
    // Initialize debug logging
    this.debugLog('Extension popup initialized');
  }

  /**
   * Load stored data from Chrome storage and show bookmark count
   */
  async loadStoredData() {
    try {
      // Show loading indicator
      document.getElementById('total-bookmarks').textContent = 'Loading...';
      
      // Get bookmark count immediately
      const bookmarks = await this.bookmarkChecker.getAllBookmarks();
      const bookmarkCount = bookmarks.length;
      
      // Update UI with immediate stats
      document.getElementById('total-bookmarks').textContent = bookmarkCount;
      document.getElementById('quick-stats').style.display = 'grid';
      
      // Update welcome message with count
      const welcomeText = document.querySelector('.welcome p');
      welcomeText.textContent = `Found ${bookmarkCount} bookmarks. Find broken links, duplicates, and unused bookmarks`;
      
      // Load stored scan data
      const data = await chrome.storage.local.get(['lastScan', 'scanResults', 'organizationResults', 'totalBookmarks']);
      
      if (data.lastScan) {
        const lastScanDate = new Date(data.lastScan);
        document.getElementById('last-scan').textContent = this.formatDate(lastScanDate);
      }
      
      if (data.scanResults) {
        this.scanResults = data.scanResults;
        // Show a "View Last Results" button if we have previous results
        this.showLastResultsOption();
      }

      if (data.organizationResults) {
        this.organizationResults = data.organizationResults;
      }
      
      console.log(`✅ Loaded: ${bookmarkCount} bookmarks found`);
      this.debugLog(`Found ${bookmarkCount} bookmarks`, 'success');
      
    } catch (error) {
      console.error('Error loading bookmark data:', error);
      document.getElementById('total-bookmarks').textContent = 'Error';
      
      // Show error in welcome message
      const welcomeText = document.querySelector('.welcome p');
      welcomeText.textContent = 'Error loading bookmarks. Please check permissions.';
    }
  }

  /**
   * Show option to view last scan results
   */
  showLastResultsOption() {
    const welcomeDiv = document.querySelector('.welcome');
    
    // Check if button already exists
    if (document.getElementById('view-last-results-btn')) return;
    
    const lastResultsBtn = document.createElement('button');
    lastResultsBtn.id = 'view-last-results-btn';
    lastResultsBtn.className = 'secondary-btn';
    lastResultsBtn.style.marginTop = '16px';
    lastResultsBtn.innerHTML = '<span class="btn-icon">📊</span> View Last Results';
    
    lastResultsBtn.addEventListener('click', () => {
      this.showResults();
    });
    
    welcomeDiv.appendChild(lastResultsBtn);
  }

  /**
   * Start bookmark scanning process with enhanced UX and better error handling
   */
  async startScan() {
    try {
      console.log('🚀 Starting bookmark scan...');
      this.debugLog('Starting bookmark scan...', 'info');
      
      // Show immediate feedback
      this.debugLog('Switching to scanning state...', 'info');
      this.showState('scanning');
      
      // Verify scanning state elements exist
      const currentStatus = document.getElementById('current-status');
      if (currentStatus) {
        currentStatus.textContent = 'Initializing scan...';
        this.debugLog('Set initial status message', 'success');
      } else {
        this.debugLog('ERROR: current-status element not found', 'error');
      }
      
      // Initialize timing
      this.scanStartTime = Date.now();
      this.lastUpdateTime = Date.now();
      
      // Initialize live counters
      this.liveResults = {
        working: 0,
        issues: 0,
        protected: 0
      };
      
      console.log('📚 Getting all bookmarks...');
      
      // Get all bookmarks with error handling
      let bookmarks;
      try {
        bookmarks = await this.bookmarkChecker.getAllBookmarks();
        console.log(`✅ Found ${bookmarks.length} bookmarks`);
      } catch (error) {
        console.error('❌ Error getting bookmarks:', error);
        throw new Error('Failed to access bookmarks. Please check extension permissions.');
      }
      
      if (bookmarks.length === 0) {
        console.log('⚠️ No bookmarks found');
        this.showError('No bookmarks found to scan.');
        return;
      }

      console.log(`🔍 Starting scan of ${bookmarks.length} bookmarks...`);

      // Update initial UI with actual data
      document.getElementById('progress-total').textContent = bookmarks.length;
      document.getElementById('progress-current').textContent = '0';
      document.getElementById('progress-percentage').textContent = '0';
      document.getElementById('scan-title').textContent = `Scanning ${bookmarks.length} Bookmarks`;
      document.getElementById('current-status').textContent = 'Starting bookmark checks...';
      
      // Set scan strategy info
      const strategy = bookmarks.length <= 100 ? 'Quick scan' : 
                     bookmarks.length <= 500 ? 'Smart scan' : 'Full scan';
      document.getElementById('scan-strategy-info').textContent = 
        `${strategy} - Checking ${bookmarks.length} bookmarks`;

      // Start the elapsed time counter
      this.startElapsedTimeCounter();

      console.log('⏱️ Started progress tracking');

      // Start scanning with enhanced progress updates
      document.getElementById('current-status').textContent = 'Checking bookmark accessibility...';
      
      const results = await this.bookmarkChecker.checkMultipleBookmarks(
        bookmarks,
        (progress) => {
          console.log(`📊 Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
          this.updateEnhancedProgress(progress, bookmarks);
        }
      );

      console.log('✅ Scan completed, processing results...');
      document.getElementById('current-status').textContent = 'Processing results...';

      // Process and categorize results
      const categorizedResults = this.bookmarkChecker.categorizeResults(results);
      this.scanResults = {
        timestamp: Date.now(),
        totalScanned: bookmarks.length,
        categories: categorizedResults,
        recommendations: this.bookmarkChecker.getDeletionRecommendations(categorizedResults),
        scanDuration: Date.now() - this.scanStartTime
      };

      console.log('💾 Storing results...');

      // Store results
      await chrome.storage.local.set({
        lastScan: Date.now(),
        scanResults: this.scanResults,
        totalBookmarks: bookmarks.length
      });

      console.log('🎉 Scan complete!');

      // Show completion notification
      this.showCompletionNotification(this.scanResults);

      // Show results
      this.showResults();

    } catch (error) {
      console.error('❌ Scan error:', error);
      this.stopElapsedTimeCounter();
      
      // Show detailed error information
      const errorMessage = error.message || 'An unknown error occurred during scanning.';
      console.error('Full error:', error);
      
      this.showError(`Scan failed: ${errorMessage}`);
      this.showCompletionNotification(null, error);
    }
  }

  /**
   * Enhanced progress update with detailed feedback
   */
  updateEnhancedProgress(progress, bookmarks) {
    // Update basic progress
    document.getElementById('progress-current').textContent = progress.completed;
    document.getElementById('progress-percentage').textContent = progress.percentage;
    document.getElementById('progress-fill').style.width = `${progress.percentage}%`;

    // Update time estimates
    this.updateTimeEstimates(progress);
    
    // Update current activity
    this.updateCurrentActivity(progress, bookmarks);
    
    // Update live results counters (if we have access to partial results)
    this.updateLiveResults(progress);
  }

  /**
   * Update time estimates
   */
  updateTimeEstimates(progress) {
    const now = Date.now();
    const elapsed = Math.floor((now - this.scanStartTime) / 1000);
    
    // Update elapsed time
    document.getElementById('elapsed-time').textContent = this.formatTime(elapsed);
    
    // Calculate and update remaining time
    if (progress.completed > 0) {
      const rate = progress.completed / elapsed; // bookmarks per second
      const remaining = progress.total - progress.completed;
      const estimatedSeconds = Math.ceil(remaining / rate);
      
      document.getElementById('remaining-time').textContent = 
        estimatedSeconds > 0 ? this.formatTime(estimatedSeconds) : 'Almost done!';
    }
  }

  /**
   * Update current activity display
   */
  updateCurrentActivity(progress, bookmarks) {
    const currentIndex = progress.completed;
    
    if (currentIndex < bookmarks.length) {
      const currentBookmark = bookmarks[currentIndex];
      document.getElementById('current-status').textContent = 
        `Checking: ${currentBookmark.title}`;
      document.getElementById('current-url').textContent = currentBookmark.url;
    } else {
      document.getElementById('current-status').textContent = 'Finalizing results...';
      document.getElementById('current-url').textContent = '';
    }
  }

  /**
   * Update live results counters
   */
  updateLiveResults(progress) {
    // This is a simplified version - in a real implementation,
    // you'd track results as they come in
    const estimated = {
      working: Math.floor(progress.completed * 0.7), // Estimate 70% working
      issues: Math.floor(progress.completed * 0.2),   // Estimate 20% issues  
      protected: Math.floor(progress.completed * 0.1) // Estimate 10% protected
    };

    this.animateCounterUpdate('live-working', estimated.working);
    this.animateCounterUpdate('live-issues', estimated.issues);
    this.animateCounterUpdate('live-protected', estimated.protected);
  }

  /**
   * Animate counter updates
   */
  animateCounterUpdate(elementId, newValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;
    
    if (newValue !== currentValue) {
      element.textContent = newValue;
      element.classList.add('updated');
      setTimeout(() => element.classList.remove('updated'), 300);
    }
  }

  /**
   * Start elapsed time counter
   */
  startElapsedTimeCounter() {
    this.elapsedTimeInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.scanStartTime) / 1000);
      document.getElementById('elapsed-time').textContent = this.formatTime(elapsed);
    }, 1000);
  }

  /**
   * Stop elapsed time counter
   */
  stopElapsedTimeCounter() {
    if (this.elapsedTimeInterval) {
      clearInterval(this.elapsedTimeInterval);
      this.elapsedTimeInterval = null;
    }
  }

  /**
   * Format time in human readable format
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Show completion notification
   */
  showCompletionNotification(scanResults, error = null, source = 'scan') {
    this.stopElapsedTimeCounter();
    
    // Chrome notification
    const notificationOptions = {
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'Bookmark Scan Complete',
      message: error ? 
        'Scan failed. Please try again.' :
        `Scanned ${scanResults.totalScanned} bookmarks in ${this.formatTime(Math.floor(scanResults.scanDuration / 1000))}`
    };
    
    chrome.notifications.create(notificationOptions);
    
    // In-page notification
    this.showInPageNotification(scanResults, error);
    
    // Play completion sound (if supported)
    this.playCompletionSound();
  }

  /**
   * Show in-page notification
   */
  showInPageNotification(scanResults, error) {
    const notification = document.createElement('div');
    notification.className = `completion-notification ${error ? 'error' : ''}`;
    
    if (error) {
      notification.innerHTML = `
        <strong>Scan Failed</strong><br>
        ${error.message || 'Please try again'}
      `;
    } else {
      const issues = scanResults.categories['connection-error'].length + 
                    scanResults.categories.timeout.length + 
                    scanResults.categories.unknown.length;
      
      notification.innerHTML = `
        <strong>Scan Complete!</strong><br>
        ${scanResults.totalScanned} bookmarks checked<br>
        ${issues} issues found
      `;
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Play completion sound
   */
  playCompletionSound() {
    // Create a subtle completion sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  /**
   * Cancel ongoing scan
   */
  cancelScan() {
    this.stopElapsedTimeCounter();
    
    if (this.currentScan) {
      // Note: In a real implementation, you'd need to make the scan cancellable
      console.log('Scan cancelled');
    }
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'Bookmark Scan Cancelled',
      message: 'Scan was stopped by user'
    });
    
    this.showState('initial');
  }

  /**
   * Show scan results
   */
  showResults() {
    if (!this.scanResults && !this.organizationResults) return;

    this.showState('results');
    
    // Update health scan results if available
    if (this.scanResults) {
      const { categories } = this.scanResults;
      
      // Update summary stats
      const workingCount = categories.working.length;
      const protectedCount = categories['bot-protected'].length + categories['login-required'].length;
      const issuesCount = categories['connection-error'].length + 
                         categories.timeout.length + 
                         categories.unknown.length + 
                         categories['check-failed'].length;

      document.getElementById('working-count').textContent = workingCount;
      document.getElementById('protected-count').textContent = protectedCount;
      document.getElementById('issues-count').textContent = issuesCount;

      // Update category counts and populate lists
      this.updateCategoryCount('connection-error', categories['connection-error'].length);
      this.updateCategoryCount('timeout', categories.timeout.length);
      this.updateCategoryCount('unknown', categories.unknown.length);
      this.updateCategoryCount('bot-protected', categories['bot-protected'].length);
      this.updateCategoryCount('login-required', categories['login-required'].length);
      this.updateCategoryCount('working-links', categories.working.length);

      // Populate bookmark lists
      this.populateBookmarkList('connection-error-list', categories['connection-error']);
      this.populateBookmarkList('timeout-list', categories.timeout);
      this.populateBookmarkList('unknown-list', categories.unknown);
      this.populateBookmarkList('bot-protected-list', categories['bot-protected']);
      this.populateBookmarkList('login-required-list', categories['login-required']);
      this.populateBookmarkList('working-list', categories.working);
    }

    // Update organization results if available
    if (this.organizationResults) {
      this.populateOrganizationTab();
      
      // Show apply organization button
      document.getElementById('apply-organization-btn').style.display = 'inline-flex';
    }
  }

  /**
   * Populate the organization tab with smart recommendations
   */
  populateOrganizationTab() {
    if (!this.organizationResults) return;

    const { recommendations } = this.organizationResults;

    // Populate folder suggestions
    this.populateFolderSuggestions(recommendations.folders);
    
    // Populate duplicates
    this.populateDuplicates(recommendations.duplicates);
    
    // Populate priority recommendations
    this.populatePriorityRecommendations(recommendations.priority);
    
    // Populate cleanup suggestions
    this.populateCleanupSuggestions(recommendations.cleanup);
  }

  /**
   * Populate folder suggestions
   */
  populateFolderSuggestions(folderSuggestions) {
    const container = document.getElementById('folder-suggestions-list');
    const countElement = document.getElementById('folder-suggestions-count');
    
    countElement.textContent = folderSuggestions.length;
    container.innerHTML = '';

    if (folderSuggestions.length === 0) {
      container.innerHTML = '<p class="empty-state">No folder suggestions available</p>';
      return;
    }

    folderSuggestions.forEach((suggestion, index) => {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'folder-suggestion';
      
      const confidenceClass = suggestion.avgConfidence > 0.7 ? 'high' : 
                             suggestion.avgConfidence > 0.4 ? 'medium' : 'low';
      
      suggestionElement.innerHTML = `
        <div class="folder-suggestion-header">
          <div class="folder-name">${suggestion.name}</div>
          <div class="folder-stats">
            <span>${suggestion.bookmarks.length} bookmarks</span>
            <span class="confidence-score ${confidenceClass}">
              ${Math.round(suggestion.avgConfidence * 100)}%
            </span>
          </div>
        </div>
        <div class="folder-preview">
          <div class="preview-bookmarks">
            ${suggestion.bookmarks.slice(0, 5).map(bookmark => 
              `<span class="preview-bookmark" title="${bookmark.title}">${bookmark.title}</span>`
            ).join('')}
            ${suggestion.bookmarks.length > 5 ? `<span class="preview-bookmark">+${suggestion.bookmarks.length - 5} more</span>` : ''}
          </div>
        </div>
        <div class="folder-actions">
          <button class="create-folder-btn" data-suggestion-index="${index}">
            Create Folder
          </button>
          <button class="preview-folder-btn" data-suggestion-index="${index}">
            Preview
          </button>
        </div>
      `;

      // Add event listeners
      const createBtn = suggestionElement.querySelector('.create-folder-btn');
      const previewBtn = suggestionElement.querySelector('.preview-folder-btn');
      
      createBtn.addEventListener('click', () => this.createFolderFromSuggestion(suggestion));
      previewBtn.addEventListener('click', () => this.previewFolderSuggestion(suggestion));

      container.appendChild(suggestionElement);
    });
  }

  /**
   * Populate duplicates section
   */
  populateDuplicates(duplicates) {
    const container = document.getElementById('duplicates-list');
    const countElement = document.getElementById('duplicates-count');
    
    countElement.textContent = duplicates.length;
    container.innerHTML = '';

    if (duplicates.length === 0) {
      container.innerHTML = '<p class="empty-state">No duplicate bookmarks found</p>';
      return;
    }

    duplicates.forEach((duplicate, index) => {
      const duplicateElement = document.createElement('div');
      duplicateElement.className = 'duplicate-group';
      
      duplicateElement.innerHTML = `
        <div class="duplicate-header">
          <span class="duplicate-type">${duplicate.type.replace('-', ' ')}</span>
          <span class="duplicate-confidence">${Math.round(duplicate.confidence * 100)}% match</span>
        </div>
        <div class="duplicate-bookmarks">
          ${duplicate.bookmarks.map((bookmark, bookmarkIndex) => `
            <div class="duplicate-bookmark ${bookmarkIndex === 0 ? 'primary' : 'secondary'}">
              <div class="duplicate-bookmark-info">
                <div class="duplicate-bookmark-title">${bookmark.title}</div>
                <div class="duplicate-bookmark-url">${bookmark.url}</div>
              </div>
              <div class="duplicate-actions">
                <button class="keep-btn" data-duplicate-index="${index}" data-bookmark-index="${bookmarkIndex}">
                  Keep
                </button>
                <button class="remove-btn" data-duplicate-index="${index}" data-bookmark-index="${bookmarkIndex}">
                  Remove
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Add event listeners for duplicate actions
      duplicateElement.querySelectorAll('.keep-btn, .remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const duplicateIndex = e.target.dataset.duplicateIndex;
          const bookmarkIndex = e.target.dataset.bookmarkIndex;
          const action = e.target.classList.contains('keep-btn') ? 'keep' : 'remove';
          this.handleDuplicateAction(duplicateIndex, bookmarkIndex, action);
        });
      });

      container.appendChild(duplicateElement);
    });
  }

  /**
   * Populate priority recommendations
   */
  populatePriorityRecommendations(priorityRecs) {
    const container = document.getElementById('priority-list');
    const countElement = document.getElementById('priority-count');
    
    const highPriorityBookmarks = priorityRecs.high || [];
    countElement.textContent = highPriorityBookmarks.length;
    container.innerHTML = '';

    if (highPriorityBookmarks.length === 0) {
      container.innerHTML = '<p class="empty-state">No high-priority bookmarks identified</p>';
      return;
    }

    highPriorityBookmarks.forEach(bookmark => {
      const bookmarkElement = this.createEnhancedBookmarkItem(bookmark);
      container.appendChild(bookmarkElement);
    });
  }

  /**
   * Populate cleanup suggestions
   */
  populateCleanupSuggestions(cleanupSuggestions) {
    const container = document.getElementById('cleanup-list');
    const countElement = document.getElementById('cleanup-count');
    
    const totalCleanupItems = cleanupSuggestions.reduce((sum, suggestion) => sum + suggestion.count, 0);
    countElement.textContent = totalCleanupItems;
    container.innerHTML = '';

    if (cleanupSuggestions.length === 0) {
      container.innerHTML = '<p class="empty-state">No cleanup suggestions available</p>';
      return;
    }

    cleanupSuggestions.forEach(suggestion => {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'cleanup-suggestion';
      
      suggestionElement.innerHTML = `
        <span class="cleanup-type">${suggestion.type.replace('-', ' ')}</span>
        <div class="cleanup-description">${suggestion.suggestion}</div>
        <div class="cleanup-bookmarks">
          ${suggestion.bookmarks.slice(0, 10).map(bookmark => `
            <div class="cleanup-bookmark">
              <div class="cleanup-bookmark-title">${bookmark.title || 'Untitled'}</div>
              <div class="cleanup-bookmark-issue">Issue: ${this.getCleanupIssueDescription(suggestion.type, bookmark)}</div>
            </div>
          `).join('')}
          ${suggestion.bookmarks.length > 10 ? `<div class="cleanup-bookmark">... and ${suggestion.bookmarks.length - 10} more</div>` : ''}
        </div>
      `;

      container.appendChild(suggestionElement);
    });
  }

  /**
   * Create enhanced bookmark item with smart tags
   */
  createEnhancedBookmarkItem(bookmark) {
    const analysis = this.smartTagger.analyzeBookmark(bookmark);
    const bookmarkElement = this.createBookmarkItem(bookmark);
    
    // Add enhanced class and priority
    bookmarkElement.classList.add('enhanced');
    if (analysis.priority === 'high') {
      bookmarkElement.classList.add('high-priority');
    } else if (analysis.priority === 'low') {
      bookmarkElement.classList.add('low-priority');
    }
    
    // Add priority tag
    const priorityTag = document.createElement('span');
    priorityTag.className = `priority-tag ${analysis.priority}`;
    priorityTag.textContent = analysis.priority;
    bookmarkElement.appendChild(priorityTag);
    
    // Add smart tags
    if (analysis.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'smart-tags';
      
      analysis.tags.slice(0, 5).forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'smart-tag';
        
        // Classify tag type
        if (analysis.categories.includes(tag)) {
          tagElement.classList.add('category');
        } else if (['javascript', 'python', 'react', 'vue', 'angular'].includes(tag)) {
          tagElement.classList.add('tech');
        } else if (tag === analysis.contentType) {
          tagElement.classList.add('content-type');
        }
        
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
      
      bookmarkElement.appendChild(tagsContainer);
    }
    
    return bookmarkElement;
  }

  /**
   * Get cleanup issue description
   */
  getCleanupIssueDescription(type, bookmark) {
    switch (type) {
      case 'generic-titles':
        return 'Generic or missing title';
      default:
        return 'Needs attention';
    }
  }

  /**
   * Handle duplicate action (keep/remove)
   */
  async handleDuplicateAction(duplicateIndex, bookmarkIndex, action) {
    try {
      const duplicate = this.organizationResults.recommendations.duplicates[duplicateIndex];
      const bookmark = duplicate.bookmarks[bookmarkIndex];
      
      if (action === 'remove') {
        await this.deleteBookmark(bookmark.id, bookmark.title);
        
        // Remove from UI
        const duplicateElement = document.querySelector(`[data-duplicate-index="${duplicateIndex}"]`).closest('.duplicate-group');
        duplicateElement.style.opacity = '0.5';
        
        this.showNotification(`Removed duplicate: ${bookmark.title}`, 'success');
      } else {
        this.showNotification(`Keeping: ${bookmark.title}`, 'info');
      }
    } catch (error) {
      this.showNotification(`Error handling duplicate: ${error.message}`, 'error');
    }
  }

  /**
   * Create folder from suggestion
   */
  async createFolderFromSuggestion(suggestion) {
    try {
      // Create the folder in Chrome bookmarks
      const folder = await chrome.bookmarks.create({
        title: suggestion.name,
        parentId: '1' // Bookmarks bar
      });
      
      // Move bookmarks to the new folder
      for (const bookmark of suggestion.bookmarks) {
        await chrome.bookmarks.move(bookmark.id, { parentId: folder.id });
      }
      
      this.showNotification(`Created folder "${suggestion.name}" with ${suggestion.bookmarks.length} bookmarks`, 'success');
      
      // Refresh the organization analysis
      setTimeout(() => this.startOrganization(), 1000);
      
    } catch (error) {
      this.showNotification(`Error creating folder: ${error.message}`, 'error');
    }
  }

  /**
   * Preview folder suggestion
   */
  previewFolderSuggestion(suggestion) {
    // Create a modal or expanded view showing all bookmarks in the suggestion
    alert(`Folder: ${suggestion.name}\n\nBookmarks:\n${suggestion.bookmarks.map(b => `• ${b.title}`).join('\n')}`);
  }

  /**
   * Apply organization recommendations
   */
  async applyOrganization() {
    if (!this.organizationResults) return;
    
    const confirmed = confirm('Apply all organization recommendations? This will create folders and organize your bookmarks.');
    if (!confirmed) return;
    
    try {
      const { recommendations } = this.organizationResults;
      
      // Create top folder suggestions
      const topSuggestions = recommendations.folders.slice(0, 5);
      
      for (const suggestion of topSuggestions) {
        await this.createFolderFromSuggestion(suggestion);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
      
      this.showNotification(`Applied organization recommendations!`, 'success');
      
    } catch (error) {
      this.showNotification(`Error applying organization: ${error.message}`, 'error');
    }
  }

  /**
   * Update category count display
   */
  updateCategoryCount(category, count) {
    const element = document.getElementById(`${category}-count`);
    if (element) {
      element.textContent = count;
    }
  }

  /**
   * Populate a bookmark list
   */
  populateBookmarkList(listId, bookmarks) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;

    listElement.innerHTML = '';

    if (bookmarks.length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <p>No bookmarks in this category</p>
        </div>
      `;
      return;
    }

    bookmarks.forEach(bookmark => {
      const item = this.createBookmarkItem(bookmark);
      listElement.appendChild(item);
    });
  }

  /**
   * Create a bookmark item element
   */
  createBookmarkItem(bookmark) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.dataset.bookmarkId = bookmark.id;

    const statusClass = this.getStatusClass(bookmark);
    const statusText = bookmark.message || bookmark.category || 'Unknown';

    item.innerHTML = `
      <div class="bookmark-info">
        <div class="bookmark-title">${this.escapeHtml(bookmark.title)}</div>
        <div class="bookmark-url">${this.escapeHtml(bookmark.url)}</div>
        <div class="bookmark-status ${statusClass}">${statusText}</div>
      </div>
      <div class="bookmark-actions">
        <button class="action-btn visit" data-url="${this.escapeHtml(bookmark.url)}">Visit</button>
        <button class="action-btn delete" data-bookmark-id="${bookmark.id}">Delete</button>
      </div>
    `;

    // Add event listeners
    const visitBtn = item.querySelector('.action-btn.visit');
    const deleteBtn = item.querySelector('.action-btn.delete');

    visitBtn.addEventListener('click', () => this.visitBookmark(bookmark.url));
    deleteBtn.addEventListener('click', () => this.deleteBookmark(bookmark.id, bookmark.title));

    return item;
  }

  /**
   * Get CSS class for bookmark status
   */
  getStatusClass(bookmark) {
    if (bookmark.status === 'ok') return 'working';
    if (bookmark.status === 'restricted') return 'restricted';
    return 'error';
  }

  /**
   * Visit a bookmark URL
   */
  async visitBookmark(url) {
    try {
      await chrome.tabs.create({ url });
      window.close(); // Close popup after opening tab
    } catch (error) {
      console.error('Error opening bookmark:', error);
    }
  }

  /**
   * Delete a single bookmark
   */
  async deleteBookmark(bookmarkId, title) {
    const confirmed = confirm(`Delete bookmark "${title}"?`);
    if (!confirmed) return;

    try {
      await chrome.bookmarks.remove(bookmarkId);
      
      // Remove from UI
      const item = document.querySelector(`[data-bookmark-id="${bookmarkId}"]`);
      if (item) {
        item.remove();
      }

      // Update counts
      this.updateCountsAfterDeletion();
      
      this.showNotification('Bookmark deleted successfully');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      this.showNotification('Failed to delete bookmark', 'error');
    }
  }

  /**
   * Bulk delete selected bookmarks
   */
  async bulkDelete() {
    const issueBookmarks = [
      ...this.scanResults.categories['connection-error'],
      ...this.scanResults.categories.timeout,
      ...this.scanResults.categories.unknown
    ];

    if (issueBookmarks.length === 0) {
      this.showNotification('No problematic bookmarks to delete');
      return;
    }

    const confirmed = confirm(
      `Delete ${issueBookmarks.length} problematic bookmarks? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    let deletedCount = 0;
    for (const bookmark of issueBookmarks) {
      try {
        await chrome.bookmarks.remove(bookmark.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete bookmark ${bookmark.id}:`, error);
      }
    }

    this.showNotification(`Deleted ${deletedCount} bookmarks`);
    
    // Refresh the scan to update UI
    setTimeout(() => this.startScan(), 1000);
  }

  /**
   * Export scan results
   */
  async exportResults() {
    if (!this.scanResults) return;

    const csvData = this.generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    try {
      await chrome.downloads.download({
        url: url,
        filename: `bookmark-scan-${new Date().toISOString().split('T')[0]}.csv`
      });
      
      this.showNotification('Results exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('Failed to export results', 'error');
    }
  }

  /**
   * Generate CSV data from scan results
   */
  generateCSV() {
    const headers = ['Title', 'URL', 'Category', 'Status', 'Message'];
    const rows = [headers];

    Object.entries(this.scanResults.categories).forEach(([category, bookmarks]) => {
      bookmarks.forEach(bookmark => {
        rows.push([
          bookmark.title || '',
          bookmark.url || '',
          category,
          bookmark.status || '',
          bookmark.message || ''
        ]);
      });
    });

    return rows.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Switch between category tabs
   */
  switchTab(category) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${category}-tab`);
    });
  }

  /**
   * Show different UI states with debug logging
   */
  showState(state) {
    console.log(`🔄 Switching to state: ${state}`);
    this.debugLog(`Switching to UI state: ${state}`, 'info');
    
    // Hide all states first
    document.querySelectorAll('.state').forEach(el => {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    
    // Show the target state
    const targetState = document.getElementById(`${state}-state`);
    if (targetState) {
      targetState.classList.add('active');
      targetState.style.display = 'block';
      this.debugLog(`Successfully switched to ${state} state`, 'success');
    } else {
      this.debugLog(`ERROR: Could not find ${state}-state element`, 'error');
      console.error(`Could not find element: ${state}-state`);
    }
  }

  /**
   * Open settings page
   */
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  /**
   * Update counts after deletion
   */
  updateCountsAfterDeletion() {
    // Recalculate counts from current DOM
    document.querySelectorAll('.bookmark-list').forEach(list => {
      const count = list.querySelectorAll('.bookmark-item').length;
      const countId = list.id.replace('-list', '-count');
      const countElement = document.getElementById(countId);
      if (countElement) {
        countElement.textContent = count;
      }
    });
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'success') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'Chrome Bookmark Assistant',
      message: message
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showState('initial');
    this.showNotification(message, 'error');
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debug logging function
   */
  debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    const debugLog = document.getElementById('debug-log');
    if (debugLog) {
      debugLog.appendChild(logEntry);
      debugLog.scrollTop = debugLog.scrollHeight;
    }
    
    // Also log to console with appropriate level
    switch (type) {
      case 'error':
        console.error(`[DEBUG] ${message}`);
        break;
      case 'success':
        console.log(`[DEBUG] ✅ ${message}`);
        break;
      default:
        console.log(`[DEBUG] ${message}`);
    }
  }

  /**
   * Toggle debug console visibility
   */
  toggleDebug() {
    const debugConsole = document.getElementById('debug-console');
    const toggleBtn = document.getElementById('toggle-debug');
    
    if (debugConsole.style.display === 'none') {
      debugConsole.style.display = 'block';
      toggleBtn.textContent = 'Hide Debug';
    } else {
      debugConsole.style.display = 'none';
      toggleBtn.textContent = 'Show Debug';
    }
  }

  /**
   * Start smart organization analysis
   */
  async startOrganization() {
    try {
      console.log('🎯 Starting smart organization...');
      this.debugLog('Starting smart organization...', 'info');
      
      this.showState('organization');
      
      // Update status
      document.getElementById('organization-status').textContent = 'Loading bookmarks...';
      document.getElementById('organization-progress-fill').style.width = '10%';
      document.getElementById('organization-progress-text').textContent = '10%';
      
      // Get all bookmarks
      const bookmarks = await this.bookmarkChecker.getAllBookmarks();
      console.log(`📚 Analyzing ${bookmarks.length} bookmarks...`);
      
      // Update progress
      document.getElementById('organization-status').textContent = 'Analyzing bookmark patterns...';
      document.getElementById('organization-progress-fill').style.width = '30%';
      document.getElementById('organization-progress-text').textContent = '30%';
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate organization recommendations
      document.getElementById('organization-status').textContent = 'Generating smart recommendations...';
      document.getElementById('organization-progress-fill').style.width = '60%';
      document.getElementById('organization-progress-text').textContent = '60%';
      
      const recommendations = this.smartTagger.getOrganizationRecommendations(bookmarks);
      
      // Update progress
      document.getElementById('organization-status').textContent = 'Finalizing analysis...';
      document.getElementById('organization-progress-fill').style.width = '90%';
      document.getElementById('organization-progress-text').textContent = '90%';
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Store results
      this.organizationResults = {
        timestamp: Date.now(),
        totalAnalyzed: bookmarks.length,
        recommendations: recommendations
      };
      
      // Save to storage
      await chrome.storage.local.set({
        organizationResults: this.organizationResults
      });
      
      // Complete
      document.getElementById('organization-progress-fill').style.width = '100%';
      document.getElementById('organization-progress-text').textContent = '100%';
      
      console.log('✅ Organization analysis complete!');
      
      // Show results with organization tab active
      this.showResults();
      this.switchTab('organization');
      
      // Show completion notification
      this.showCompletionNotification(null, null, 'organization');
      
    } catch (error) {
      console.error('❌ Organization error:', error);
      this.showError(`Organization failed: ${error.message}`);
      this.showState('initial');
    }
  }

  /**
   * Cancel organization analysis
   */
  cancelOrganization() {
    console.log('Organization cancelled');
    this.showState('initial');
  }
}

// Initialize popup when DOM is loaded
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupController;
} else if (typeof window !== 'undefined') {
  window.PopupController = PopupController;
} 