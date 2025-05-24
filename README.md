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
    - Check URL accessibility
    - Categorize errors (DNS, SSL, Server, etc.)
    - Delete broken bookmarks by title
    - Cache results for performance

### Phase 2 (Web Interface - Current)
- Visual display of bookmarks with:
  - Title and description
  - Last visited timestamp
  - Basic bookmark statistics
  - Broken link detection and management:
    - Visual error categorization
    - Detailed URL check information
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
   - Implements URL accessibility checking with caching:
     - Per-URL caching with 7-day expiry
     - Error categorization (DNS, SSL, Server, etc.)
     - Detailed technical information collection
     - Batch processing for performance

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
     - `/broken`: Get broken bookmarks with caching
     - `/broken/cache`: Cache management endpoints

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
   - Multi-level caching strategy:
     - URL-level caching in backend (7 days)
     - API response caching (7 days)
     - Frontend query caching (7 days)
   - Batch processing for URL checks
   - Use of hash tables for quick lookups

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

API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

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
- Add caching for better performance
- Implement proper error handling and recovery
- Add data validation and sanitization
- Implement proper logging and monitoring
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

