# Chrome Bookmark Assistant

A powerful Chrome extension that helps you find and clean up broken, duplicate, and unused bookmarks automatically.

## Features

### 🔍 **Smart Bookmark Scanning**
- Automatically checks all your bookmarks for accessibility
- Categorizes bookmarks by health status
- Identifies different types of issues (404 errors, timeouts, login required, etc.)

### 🎯 **Intelligent Categorization**
- **Working Links**: Fully accessible bookmarks
- **Login Required**: Sites that need authentication (Google Docs, private pages)
- **Bot Protected**: Sites that block automated requests (LinkedIn, StackOverflow)
- **Connection Errors**: Truly broken links that should be deleted
- **Timeouts**: Sites that are slow or temporarily unavailable

### 🗑️ **Safe Bulk Deletion**
- Only suggests deletion for truly broken bookmarks
- Preserves login-required and bot-protected links
- Confirmation dialogs prevent accidental deletions
- Individual bookmark management options

### 📊 **Detailed Reporting**
- Visual progress tracking during scans
- Comprehensive results with status explanations
- Export scan results to CSV for external analysis
- Historical scan data storage

### ⏰ **Automated Monitoring**
- Optional scheduled background scans
- Configurable scan frequency (daily, weekly, monthly)
- Badge notifications for newly detected issues
- Smart caching to avoid redundant checks

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Chrome Bookmark Assistant"
3. Click "Add to Chrome"

### Developer Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension icon will appear in your toolbar

## Usage

### Basic Scan
1. Click the extension icon in your toolbar
2. Click "Start Scan" to begin checking your bookmarks
3. Wait for the scan to complete (progress bar shows status)
4. Review categorized results in the popup

### Managing Results
- **Visit**: Click "Visit" to open a bookmark in a new tab
- **Delete**: Click "Delete" to remove individual bookmarks
- **Bulk Delete**: Use "Delete Selected" for multiple problematic bookmarks
- **Export**: Download scan results as CSV for further analysis

### Scheduled Scans
1. Click the settings icon (⚙️) in the popup
2. Enable "Automatic Scanning"
3. Choose scan frequency (daily, weekly, monthly)
4. The extension will run background scans and notify you of issues

## Understanding Results

### Status Categories

| Status | Description | Action |
|--------|-------------|---------|
| ✅ **Working** | Link is accessible | Keep |
| 🔒 **Login Required** | Needs authentication | Keep |
| 🤖 **Bot Protected** | Blocks automated requests | Keep |
| 🚫 **Connection Error** | Cannot connect to server | Consider deleting |
| ⏰ **Timeout** | Site is slow/unresponsive | Review |
| ❓ **Unknown** | Unclear status | Review |

### Smart Detection

The extension uses intelligent detection to avoid false positives:

- **LinkedIn profiles** → Marked as "Bot Protected" (not broken)
- **Google Docs/Drive** → Marked as "Login Required" (not broken)
- **StackOverflow/GitHub** → Marked as "Bot Protected" (not broken)
- **404/410 errors** → Marked as "Connection Error" (safe to delete)

## Privacy & Security

- **Local Processing**: All bookmark checking happens locally in your browser
- **No Data Collection**: Your bookmarks never leave your computer
- **No External Services**: Direct connections to your bookmarked sites only
- **Secure Storage**: Scan results stored locally using Chrome's secure storage API

## Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension standards
- **Service Worker**: Background processing for scheduled scans
- **Local Storage**: Results cached for performance
- **Batch Processing**: Respectful rate limiting to avoid overwhelming sites

### Limitations
- **CORS Restrictions**: Some sites may not be checkable due to browser security
- **Rate Limiting**: Scans are intentionally throttled to be respectful
- **No-CORS Mode**: Limited status information for cross-origin requests

### Performance
- **Caching**: Results cached for 24 hours to avoid redundant checks
- **Batch Size**: Small batches (5 concurrent requests) to avoid overwhelming
- **Progress Tracking**: Real-time updates during scanning
- **Background Efficiency**: Minimal resource usage during scheduled scans

## Development

### Project Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup/                 # Main popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/            # Background service worker
│   └── service-worker.js
├── utils/                 # Shared utilities
│   └── bookmark-checker.js
└── icons/                 # Extension icons
```

### Building
The extension is built with vanilla JavaScript for maximum compatibility and minimal dependencies.

### Testing
1. Load the extension in developer mode
2. Open the popup and run a scan
3. Check the console for any errors
4. Test with various bookmark types

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution
- Additional site-specific detection rules
- UI/UX improvements
- Performance optimizations
- Internationalization
- Advanced filtering options

## Changelog

### Version 1.0.0
- Initial release
- Basic bookmark health checking
- Smart categorization
- Bulk deletion features
- Export functionality
- Scheduled scanning

## Support

If you encounter issues or have feature requests:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include your Chrome version and extension version

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Acknowledgments

- Built with modern Chrome Extension APIs
- Inspired by the need for better bookmark management
- Thanks to the open-source community for tools and inspiration 