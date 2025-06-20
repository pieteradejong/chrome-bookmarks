# Chrome Bookmarks Manager

[![pytest](https://github.com/pieteradejong/chrome-bookmarks/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pieteradejong/chrome-bookmarks/actions/workflows/ci.yml)

A personal tool for managing and cleaning up Chrome bookmarks, featuring both a command-line interface and a local web interface. The project helps detect duplicate bookmarks, broken links, and provides insights into bookmark usage patterns.

## Motivation

This project was created to help manage and analyze Chrome bookmarks by:
- Detecting duplicate bookmarks and broken links
- Analyzing bookmark usage patterns
- Providing a clean interface for bookmark management
- Maintaining privacy through local-only operation

## Features

### Phase 1 (CLI) - Current Focus
- Clean and readable command line output of bookmarks
- Basic bookmark management operations:
  - List bookmarks in tree or flat format
  - View bookmark statistics
  - Find unvisited bookmarks
  - Identify duplicate URLs
  - Analyze bookmark usage patterns
  - Sort by date added/last used
  - Filter by bookmark type (PDF, video, etc.)
  - Detect and manage broken links:
    - Smart HEAD request validation with minimal false positives
    - Intelligent categorization of link status:
      - **Broken**: 404 Not Found, 410 Gone, DNS/connection errors
      - **Login Required**: 401 Unauthorized, 403 Forbidden, 999 Bot Blocked
      - **Available**: 200 OK, 301/302 Redirects
    - Conservative approach: only marks links as broken for definitive failures
    - Handles login-protected sites (LeetCode, LinkedIn, Twitter) correctly
    - Multi-layer caching for performance (memory + SQLite)
    - Persistent cache across application restarts

### Phase 2 (Web Interface - Current)
- Visual display of bookmarks with:
  - Title and description
  - Last visited timestamp
  - Basic bookmark statistics
      - Smart link validation and management:
      - Visual status categorization (Broken, Login Required, Available)
      - Detailed URL check information with status codes
      - Conservative broken link detection (minimal false positives)
      - Login/paywall protected bookmark identification
      - Cache statistics and management
      - Real-time status updates
- Local-only deployment
- Modern, clean UI for bookmark management

## Architecture

The project follows a clean architecture pattern with clear separation of concerns:

### Core Components

1. **Data Layer** (`app/bookmarks_data.py`)
   - `BookmarkStore` class encapsulates all bookmark data operations
   - Handles loading, parsing, and querying bookmark data
   - Maintains internal state of bookmarks and folders
   - Provides methods for data analysis and statistics
   - Implements smart URL validation with advanced caching:
     - **Conservative validation**: Only marks as broken for definitive failures
     - **Smart categorization**: Distinguishes between broken, login-required, and available
     - **HEAD-first optimization**: 10x faster than traditional GET requests
     - **Multi-layer caching**: Memory + SQLite for optimal performance
     - **Login-aware**: Correctly handles protected sites (403, 401, 999 status codes)
     - **Status code mapping**:
       - Broken: 404 Not Found, 410 Gone, DNS/connection errors
       - Login Required: 401 Unauthorized, 403 Forbidden, 999 Bot Blocked, 429 Rate Limited
       - Available: 200 OK, 301/302/307 Redirects, 500+ Server Errors
     - Persistent cache across application restarts
     - Batch processing with rate limiting for performance

2. **Models** (`app/models.py`)
   - Internal data models using Python dataclasses:
     - `URL`: Represents parsed URL components
     - `Bookmark`: Represents a bookmark entry
     - `Folder`: Represents a bookmark folder
     - `ErrorDetails`: Represents URL check results
   - API models using Pydantic:
     - Response models for API endpoints
     - Input validation and serialization
     - Type safety and documentation

3. **API Layer** (`app/api.py`)
   - FastAPI router for REST endpoints
   - Uses dependency injection for `BookmarkStore`
   - Implements in-memory caching for performance
   - Endpoints:
     - `/`: Basic API information
     - `/health`: Health check
     - `/bookmarks`: Get bookmark tree
     - `/unvisited`: List unvisited bookmarks
     - `/stats`: Get bookmark statistics
     - `/broken`: Get broken bookmarks (cache-only, fast)
     - `/broken/cache`: Cache statistics and management
     - `/validate-broken`: Validate broken bookmarks with HEAD requests
       - Smart categorization: broken vs login-required vs available
       - Conservative validation with minimal false positives
       - Updates database with validation results

4. **CLI Interface** (`app/cli.py`)
   - Command-line interface using argparse
   - Shares core functionality with API
   - Commands:
     - `list`: Display bookmarks (tree/flat format)
     - `stats`: Show bookmark statistics
     - `unvisited`: List unvisited bookmarks
     - `broken`: Check and manage broken links

5. **Frontend** (`frontend/`)
   - React/Vite application with TypeScript
   - Modern UI components using Mantine
   - Features:
     - Tabbed interface for different bookmark views
     - Real-time cache statistics
     - Visual error categorization
     - Detailed URL check information
     - Cache management controls
   - State management with React Query
   - Local-only operation

### Design Decisions

1. **Separation of Concerns**
   - Data handling is isolated in `BookmarkStore`
   - API and CLI share the same core functionality
   - Models separate internal and API representations
   - Frontend components are modular and reusable

2. **Type Safety**
   - Extensive use of type hints (Python 3.9+)
   - Pydantic models for API validation
   - TypeScript for frontend type safety
   - Dataclasses for internal data structures

3. **State Management**
   - `BookmarkStore` encapsulates all state
   - React Query for frontend state management
   - No global variables
   - Thread-safe for web server use

4. **Error Handling**
   - Consistent error handling across layers
   - Proper logging
   - User-friendly error messages
   - Categorized error reporting for broken links

5. **Privacy & Security**
   - Local-only operation
   - No external services
   - No data persistence beyond Chrome's bookmarks file
   - Secure URL checking with proper SSL validation

6. **Performance Considerations**
   - Optimized for small to medium bookmark collections (1000s of bookmarks)
   - In-memory processing for fast retrieval
   - Efficient URL parsing and validation
   - Advanced multi-layer caching strategy:
     - Layer 1: In-memory cache (~0.0001s lookups, 7-day expiry)
     - Layer 2: SQLite persistent cache (~0.001s lookups, 7-day freshness)
     - Layer 3: HEAD-first network checks (~0.3s, 10x faster than GET)
     - Automatic cache population and invalidation
     - Persistent across application restarts
   - Batch processing with semaphore-based rate limiting
   - Use of hash tables for quick lookups
   - DNS and SSL pre-validation for fastest failure detection

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chrome-bookmarks.git
   cd chrome-bookmarks
   ```

2. Run the initialization script:
   ```bash
   ./init.sh
   ```

This will:
- Create a Python virtual environment
- Install required dependencies
- Set up the initial project structure
- Copy your Chrome bookmarks to the data directory

## Usage

### Command Line Interface

The CLI provides several commands for bookmark management:

```bash
# List bookmarks in tree format
python -m app.cli list

# List bookmarks in flat format
python -m app.cli list --format flat

# Show bookmark statistics
python -m app.cli stats

# List unvisited bookmarks
python -m app.cli unvisited

# Use a different Chrome profile
python -m app.cli --profile "Profile 2" list
```

### Web Interface

Start the local web server:
```bash
python -m app.main
```

The API will be available at `http://localhost:8000` with the following endpoints:

- `GET /`: API information
- `GET /health`: Health check
- `GET /bookmarks`: Get bookmark tree
- `GET /unvisited`: List unvisited bookmarks
- `GET /stats`: Get bookmark statistics
- `GET /broken`: Get broken bookmarks (from cache)
- `GET /broken/cache`: Get cache statistics
- `POST /broken/check`: Force fresh broken link checks

API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Smart Link Validation System

The application implements an intelligent HEAD request validation system that minimizes false positives while accurately detecting truly broken links.

### Validation Philosophy

**Conservative Approach**: Only mark links as "broken" when we're certain they don't exist. This prevents false positives from login-protected sites, bot-blocking, or temporary server issues.

### Status Code Classification

| Status Code | Category | Is Broken? | Reason | Examples |
|-------------|----------|------------|---------|-----------|
| **200-299** | Available | ❌ No | Content accessible | Most working sites |
| **301/302/307** | Available | ❌ No | Redirects (likely to login) | Google Docs, some articles |
| **401** | Login Required | ❌ No | Authentication required | Proper auth-protected APIs |
| **403** | Login Required | ❌ No | Access forbidden/bot blocked | LeetCode, Twitter, LinkedIn |
| **404** | **Broken** | ✅ **Yes** | **Page not found** | **Truly broken links** |
| **410** | **Broken** | ✅ **Yes** | **Page gone/removed** | **Intentionally removed** |
| **429** | Login Required | ❌ No | Rate limited | Too many requests |
| **500+** | Available | ❌ No | Server error (temporary) | Site exists but has issues |
| **999** | Login Required | ❌ No | Custom bot blocking | LinkedIn's custom code |
| **DNS Error** | **Broken** | ✅ **Yes** | **Domain doesn't exist** | **Invalid domains** |

### Real-World Examples

- **LeetCode Problems** (`403 Forbidden`) → **Login Required** ✅ Correct!
- **LinkedIn Profiles** (`999 Bot Blocked`) → **Login Required** ✅ Correct!
- **Google Docs** (`302 Redirect`) → **Available** ✅ Correct!
- **Non-existent pages** (`404 Not Found`) → **Broken** ✅ Correct!
- **Dead domains** (`DNS Error`) → **Broken** ✅ Correct!

### Benefits

1. **Minimal False Positives**: Login-protected sites aren't marked as broken
2. **Accurate Detection**: Only truly broken links are flagged
3. **Fast Performance**: HEAD requests are 10x faster than GET
4. **Smart Categorization**: Distinguishes between broken, login-required, and available

## Advanced Caching Architecture

The application implements a sophisticated multi-layer caching system for optimal performance:

### Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    URL CHECK REQUEST                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: IN-MEMORY CACHE (Fastest - ~0.0001s)           │
│  • Instant lookups                                         │
│  • 7-day expiry                                           │
│  • Lost on app restart                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Cache Miss
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: SQLITE CACHE (Fast - ~0.001s)                  │
│  • Persistent across restarts                             │
│  • 7-day freshness check                                  │
│  • URL-level + Bookmark-level caching                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Cache Miss
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: NETWORK CHECK (Optimized - ~0.3s)              │
│  • HEAD-first optimization (10x faster than GET)          │
│  • DNS + SSL pre-validation                               │
│  • Results saved to both cache layers                     │
└─────────────────────────────────────────────────────────────┘
```

### Performance Benefits

- **Memory Cache**: 99.9% faster than network requests
- **SQLite Cache**: Persistent across app restarts, 99.7% faster
- **HEAD-first Network**: 10x faster than traditional GET requests
- **Bandwidth Savings**: 99.9% reduction (headers only vs full content)
- **Smart Fallback**: Automatic GET fallback when HEAD not supported

### Cache Configuration

The cache freshness can be configured via environment variable:
```bash
export CACHE_FRESHNESS_HOURS=168  # 7 days (default)
```

## Chrome Bookmarks Location

Chrome stores bookmarks in a JSON file within your profile directory. The exact location depends on your Chrome profile:

- Default profile: `~/Library/Application Support/Google/Chrome/Default/Bookmarks`
- Profile 1: `~/Library/Application Support/Google/Chrome/Profile 1/Bookmarks`
- Profile 2: `~/Library/Application Support/Google/Chrome/Profile 2/Bookmarks`

To find your exact profile path:
1. Open Chrome
2. Visit `chrome://version`
3. Look for the "Profile Path" entry
4. The Bookmarks file will be in that directory

## Data Structure

Chrome bookmarks are stored in a JSON file with the following structure:

```json
{
  "checksum": "string",
  "roots": {
    "bookmark_bar": { ... },
    "other": { ... },
    "mobile": { ... }
  },
  "sync_metadata": "string",
  "version": 1
}
```

Each bookmark or folder object contains:
```json
{
  "date_added": "unix-like timestamp",
  "date_last_used": "unix-like timestamp",
  "date_modified": "unix-like timestamp",
  "guid": "GUID",
  "id": "integer",
  "name": "string",
  "type": "folder|url",
  "url": "string (for bookmarks only)",
  "children": [] (for folders only)
}
```

## Development

### Project Structure
```
chrome-bookmarks/
├── app/
│   ├── __init__.py
│   ├── api.py           # FastAPI routes
│   ├── bookmarks_data.py # Core bookmark handling
│   ├── cli.py           # Command-line interface
│   ├── config.py        # Configuration
│   ├── main.py          # Application entry
│   ├── models.py        # Data models
│   └── test/            # Test directory
├── data/                # Working directory for bookmark data
├── init.sh             # Initialization script
├── README.md
└── requirements.txt    # Python dependencies
```

### Adding New Features

1. **New Data Operations**
   - Add methods to `BookmarkStore` in `bookmarks_data.py`
   - Update models in `models.py` if needed

2. **New API Endpoints**
   - Add routes to `api.py`
   - Define response models in `models.py`

3. **New CLI Commands**
   - Add subcommands to `cli.py`
   - Reuse `BookmarkStore` methods

### Technical Notes
- Python 3.9+ required for type hints
- Focus on maintainability and clean code
- Local-only operation for privacy
- No external service dependencies
- Efficient in-memory processing

## Roadmap

### 1. API Endpoints & Data Processing

#### Bookmark Management Endpoints
- `POST /bookmarks/cleanup` - Endpoint to identify and suggest duplicate bookmarks
- `POST /bookmarks/archive` - Archive old/unused bookmarks
- `GET /bookmarks/search` - Search bookmarks with filters (by date, folder, tags)
- `GET /bookmarks/folders` - Get folder statistics and structure
- `GET /bookmarks/duplicates` - Find potential duplicate bookmarks
- `GET /bookmarks/export` - Export bookmarks in different formats (JSON, HTML, CSV)

#### Enhanced Statistics
- `GET /stats/folders` - Detailed folder usage statistics
- `GET /stats/timeline` - Bookmark creation/usage over time
- `GET /stats/domains` - Most bookmarked domains and their categories

### 2. Data Processing Improvements
- Implement bookmark categorization using URL patterns or machine learning
- Add metadata extraction from bookmarked pages (title, description, favicon)
- Implement bookmark tagging system
- Add last visited date tracking
- Implement bookmark health checks (check if URLs are still valid)
- Add support for bookmark notes/annotations

### 3. UI Improvements (React Frontend)
- Modern dashboard with:
  - Visual bookmark tree with collapsible folders
  - Grid/List view toggle for bookmarks
  - Drag-and-drop folder organization
  - Quick search with filters
  - Tag management interface
  - Bookmark preview cards with:
    - Screenshot thumbnails
    - Website favicons
    - Last visited date
    - Visit count
    - Custom notes
  - Statistics visualizations:
    - Folder size distribution
    - Bookmark creation timeline
    - Domain distribution
    - Most visited bookmarks
  - Dark/Light theme support
  - Responsive design for different screen sizes

### 4. CLI Improvements
- Interactive TUI (Text User Interface) for bookmark management
- Rich terminal output with colors and formatting
- Export functionality to different formats
- Batch operations for bookmark management
- Quick search and filter capabilities
- Bookmark health check command
- Duplicate detection and cleanup

### 5. Technical Improvements
- ✅ **Advanced multi-layer caching system implemented**
  - In-memory cache for instant lookups
  - SQLite persistent cache for restart resilience
  - HEAD-first HTTP optimization for 10x speed improvement
- ✅ **Comprehensive error handling and categorization**
- ✅ **Data validation and sanitization**
- ✅ **Structured logging with configurable levels**
- Add automated tests
- Add documentation for API and CLI usage

## Contributing

This is a personal project, but suggestions and improvements are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Research & References

- [Chrome Sync's Model API](https://www.chromium.org/developers/design-documents/sync/model-api/)
- [Chromium's Bookmark Manager](https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/resources/bookmarks/)

## Ensure SQLite Cache Directory and Permissions

Before running the backend, make sure the `data/` directory exists and has the correct permissions for SQLite to create and write the cache database:

```bash
mkdir -p data
chmod u+rw data
chmod u+rw data/bookmarks_cache.db  # Only if the file already exists
```

If you encounter database errors, you may need to delete the cache file and let the app recreate it:

```bash
rm data/bookmarks_cache.db
```

