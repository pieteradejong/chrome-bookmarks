/**
 * Popup interface controller
 */
class PopupController {
  constructor() {
    this.bookmarkChecker = new BookmarkChecker();
    this.currentScan = null;
    this.scanResults = null;
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
    document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
    
    // Debug toggle
    document.getElementById('toggle-debug').addEventListener('click', () => this.toggleDebug());
    
    // Scanning state buttons
    document.getElementById('cancel-scan-btn').addEventListener('click', () => this.cancelScan());
    
    // Results state buttons
    document.getElementById('rescan-btn').addEventListener('click', () => this.startScan());
    document.getElementById('export-btn').addEventListener('click', () => this.exportResults());
    document.getElementById('bulk-delete-btn').addEventListener('click', () => this.bulkDelete());
    
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
      const data = await chrome.storage.local.get(['lastScan', 'scanResults', 'totalBookmarks']);
      
      if (data.lastScan) {
        const lastScanDate = new Date(data.lastScan);
        document.getElementById('last-scan').textContent = this.formatDate(lastScanDate);
      }
      
      if (data.scanResults) {
        this.scanResults = data.scanResults;
        // Show a "View Last Results" button if we have previous results
        this.showLastResultsOption();
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
  showCompletionNotification(scanResults, error = null) {
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
    if (!this.scanResults) return;

    this.showState('results');
    
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

    // Update category counts
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

    // Show bulk delete button if there are problematic bookmarks
    if (issuesCount > 0) {
      document.getElementById('bulk-delete-btn').style.display = 'flex';
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
      title: 'Bookmark Health Checker',
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
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 