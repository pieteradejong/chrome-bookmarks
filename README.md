# Chrome Bookmarks Manager

[![pytest](https://github.com/pieteradejong/chrome-bookmarks/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pieteradejong/chrome-bookmarks/actions/workflows/ci.yml)

A comprehensive Chrome extension for managing and cleaning up Chrome bookmarks through intelligent automation and smart categorization. The extension provides advanced bookmark health checking, duplicate detection, and automated organization directly within the browser.

## 🎯 Project Focus

This project has transitioned to a **Chrome extension-focused approach** for better user experience, simplified distribution, and commercial potential through the Chrome Web Store.

### Why Chrome Extension?
- **Native Integration**: Direct access to Chrome bookmarks API
- **Better UX**: Seamless operation within the browser
- **Simplified Distribution**: Single Chrome Web Store listing
- **Commercial Viability**: Direct monetization potential
- **Privacy Assurance**: All processing happens locally

## 🚀 Features

### ✅ Core Features (Implemented)
- **Smart Bookmark Health Checking**: Intelligent URL validation with minimal false positives
- **Background Scanning**: Automated scheduled bookmark health checks
- **Intelligent Categorization**: Distinguishes between broken, login-required, and bot-protected links
- **Real-time Monitoring**: Immediate detection of new bookmark issues
- **Badge Notifications**: Visual indicators for bookmark problems
- **User-friendly Interface**: Clean popup and options page

### 🔄 Advanced Features (In Development)
- **Duplicate Detection**: Find and manage duplicate bookmarks
- **Smart Organization**: AI-powered bookmark categorization
- **Bulk Operations**: Multi-select and batch bookmark management
- **Advanced Search**: Full-text search with filters
- **Export/Import**: Multiple format support
- **Analytics Dashboard**: Comprehensive bookmark insights

## 🏗️ Architecture

### Chrome Extension Structure
```
chrome-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background processing
├── popup/
│   ├── popup.html            # Main popup interface
│   ├── popup.css
│   └── popup.js
├── options/
│   └── options.html          # Settings and configuration
├── utils/
│   └── bookmark-checker.js   # Core bookmark validation
└── icons/                    # Extension icons
```

### Smart Link Validation System
The extension implements intelligent HEAD request validation that minimizes false positives while accurately detecting truly broken links.

#### Status Code Classification
| Status Code | Category | Is Broken? | Examples |
|-------------|----------|------------|----------|
| **200-299** | Available | ❌ No | Most working sites |
| **301/302/307** | Available | ❌ No | Redirects (likely to login) |
| **401** | Login Required | ❌ No | Authentication required |
| **403** | Login Required | ❌ No | Access forbidden/bot blocked |
| **404** | **Broken** | ✅ **Yes** | **Page not found** |
| **410** | **Broken** | ✅ **Yes** | **Page gone/removed** |
| **429** | Login Required | ❌ No | Rate limited |
| **500+** | Available | ❌ No | Server error (temporary) |
| **999** | Login Required | ❌ No | Custom bot blocking |
| **DNS Error** | **Broken** | ✅ **Yes** | **Invalid domains** |

## 📦 Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Chrome Bookmarks Manager"
3. Click "Add to Chrome"

### Developer Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension icon will appear in your toolbar

## 🎮 Usage

### Basic Health Check
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

## 🔧 Development

### Project Structure
```
chrome-bookmarks/
├── chrome-extension/          # Main extension code
│   ├── manifest.json
│   ├── background/
│   ├── popup/
│   ├── options/
│   ├── utils/
│   └── icons/
├── archived/                  # Previous architecture components
├── prd.md                     # Product Requirements Document
├── README.md                  # This file
└── TODO.md                    # Development tasks
```

### Development Setup
1. Clone the repository
2. Navigate to `chrome-extension/`
3. Load the extension in Chrome developer mode
4. Make changes and reload the extension
5. Test functionality in the browser

### Key Technologies
- **Manifest V3**: Latest Chrome extension standards
- **Service Workers**: Background processing
- **Chrome APIs**: Bookmarks, storage, alarms, notifications
- **Modern JavaScript**: ES6+ features and modules
- **CSS3**: Modern styling and animations

## 📊 Roadmap

### Phase 1: Foundation Enhancement (Weeks 1-2)
- [ ] Refactor bookmark-checker.js with ES6 modules
- [ ] Implement IndexedDB storage
- [ ] Add comprehensive error handling
- [ ] Set up testing framework

### Phase 2: Core Features (Weeks 3-4)
- [ ] Duplicate detection and management
- [ ] Smart bookmark organization
- [ ] Enhanced validation with favicons
- [ ] Bulk operations interface

### Phase 3: UI Enhancement (Weeks 5-6)
- [ ] Modern UI framework implementation
- [ ] Enhanced bookmark display with previews
- [ ] Comprehensive settings page
- [ ] Context menu integration

### Phase 4: Advanced Features (Weeks 7-8)
- [ ] Advanced search and filtering
- [ ] Automation and scheduling
- [ ] Export/import functionality
- [ ] Performance optimization

### Phase 5: Commercial Features (Weeks 9-10)
- [ ] Premium features implementation
- [ ] Chrome Web Store preparation
- [ ] Monetization setup
- [ ] Marketing materials

### Phase 6: Launch (Weeks 11-12)
- [ ] Comprehensive testing
- [ ] User feedback integration
- [ ] Chrome Web Store submission
- [ ] Post-launch monitoring

## 🤝 Contributing

This is a personal project transitioning to commercial development, but suggestions and improvements are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution
- UI/UX improvements
- Performance optimizations
- Additional validation rules
- Internationalization
- Accessibility features

## 📈 Success Metrics

### Development Goals
- **Performance**: <1 second response time for all operations
- **Scalability**: Support for 10,000+ bookmarks efficiently
- **Reliability**: <1% error rate in production
- **Code Coverage**: >90% test coverage

### User Goals
- **User Adoption**: 1,000+ users within 3 months
- **User Retention**: >70% 30-day retention
- **User Satisfaction**: >4.5 stars on Chrome Web Store
- **Feature Usage**: >80% of users use core features

### Commercial Goals
- **Conversion Rate**: >5% free to premium conversion
- **Revenue**: $1,000+ monthly recurring revenue within 6 months
- **Growth**: 20% month-over-month user growth

## 🔒 Privacy & Security

- **Local Processing**: All bookmark checking happens within the browser
- **No Data Collection**: Your bookmarks never leave your computer
- **No External Services**: Direct connections to your bookmarked sites only
- **Secure Storage**: Results stored locally using Chrome's secure storage API
- **Transparent Operations**: Open source code for full transparency

## 📄 License

MIT License - see LICENSE file for details

## 📚 Documentation

- **PRD**: See `prd.md` for detailed product requirements and roadmap
- **TODO**: See `TODO.md` for current development tasks
- **Archived Components**: See `archived/README.md` for previous architecture

## 🆘 Support

If you encounter issues or have feature requests:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include your Chrome version and extension version

## 🙏 Acknowledgments

- Built with modern Chrome Extension APIs
- Inspired by the need for better bookmark management
- Thanks to the open-source community for tools and inspiration
- Special thanks to early users and contributors

