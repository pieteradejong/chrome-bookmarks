# Archived Components

This directory contains components from the previous multi-application architecture that have been archived in favor of the Chrome extension approach.

## Archived Components

### `app/` - Python Backend
- **FastAPI Application**: RESTful API for bookmark management
- **CLI Interface**: Command-line tools for bookmark operations
- **Data Models**: Pydantic models and internal data structures
- **Bookmark Store**: Core bookmark data management
- **SQLite Cache**: Multi-layer caching system

### `frontend/` - React/Vite Web Application
- **React 19**: Modern frontend framework
- **TypeScript**: Type-safe development
- **Mantine UI**: Component library
- **Bookmark Components**: UI components for bookmark display
- **API Integration**: Frontend-backend communication

### `scripts/` - Python Utility Scripts
- **Bulk Operations**: Scripts for bulk bookmark management
- **Validation Scripts**: Advanced bookmark validation tools
- **Database Scripts**: Database management and reporting
- **Fix Scripts**: Specialized scripts for specific issues

### `data/` - Data Files
- **SQLite Cache**: Persistent cache database
- **Bookmark Data**: Working directory for bookmark files

### Configuration Files
- **`requirements.txt`**: Python dependencies
- **`init.sh`**: Python environment setup script
- **`run.sh`**: Application runner script
- **`venv/`**: Python virtual environment

## Why Archived?

These components were part of a multi-application architecture that included:
1. Python backend with FastAPI
2. React frontend web application
3. Command-line interface
4. Various utility scripts

The project has transitioned to a **Chrome extension-focused approach** because:

### Advantages of Chrome Extension Approach:
1. **Better User Experience**: Native browser integration
2. **Simplified Distribution**: Single Chrome Web Store listing
3. **Reduced Complexity**: No need for separate backend/frontend
4. **Commercial Potential**: Direct monetization through Chrome Web Store
5. **Privacy Assurance**: All processing happens locally in the browser

### What the Chrome Extension Can Accomplish:
- ✅ Smart bookmark health checking
- ✅ Background scheduled scans
- ✅ Intelligent categorization
- ✅ User-friendly interface
- ✅ Automated bookmark management
- ✅ Bulk operations
- ✅ Export/import functionality
- ✅ Advanced analytics (premium)

## Preservation

These components are preserved for:
- **Reference**: Technical implementation details
- **Future Use**: Potential integration or feature extraction
- **Documentation**: Understanding of previous architecture
- **Rollback**: If needed for specific use cases

## Current Focus

The project now focuses on the `chrome-extension/` directory, which contains:
- **Manifest V3**: Latest Chrome extension standards
- **Service Worker**: Background processing
- **Popup Interface**: User interaction
- **Options Page**: Configuration management
- **Bookmark Health Checker**: Core functionality

See the main `README.md` and `prd.md` for current development plans and roadmap. 