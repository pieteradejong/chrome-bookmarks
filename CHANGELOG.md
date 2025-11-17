# 📋 CHANGELOG

## 2024-06-28 — Major Refactor: Chrome Extension Focus

### Project Direction
- Transitioned project from a multi-app (Python backend, React frontend, CLI) to a Chrome extension-focused architecture.
- Archived all previous backend, frontend, and script components in the `archived/` directory for reference and rollback.
- Updated all documentation to reflect the new focus and roadmap.

### Directory and File Changes
- Created `archived/` directory and moved:
  - `app/` (Python backend)
  - `frontend/` (React frontend)
  - `scripts/` (Python utility scripts)
  - `data/` (SQLite cache and data files)
  - `requirements.txt`, `init.sh`, `run.sh`, `venv/`
- Added `archived/README.md` to document the purpose and contents of the archive.

### Documentation
- Updated `README.md` to focus on Chrome extension usage, features, and development.
- Created a new `prd.md` (Product Requirements Document) with a 6-phase development roadmap and clear project goals.
- Updated `TODO.md` to reflect the new development phases and tasks for the Chrome extension.
- Created `testing.md` to document best practices, references, and a step-by-step plan for automated testing.

### Testing Infrastructure
- Initialized npm in `chrome-extension/` and installed Jest for unit testing.
- Created `utils/bookmark-checker.test.js` with initial Jest tests for core logic.
- Outlined a plan for expanding test coverage, mocking Chrome APIs, and future integration/E2E testing.

### Version Control
- Committed and pushed all changes with a detailed commit message summarizing the transition and new architecture.

### Next Steps (as of this change)
- Expand Jest test coverage for core logic.
- Mock Chrome APIs in tests.
- Set up linting and CI integration.
- Plan and implement integration/E2E tests with Puppeteer or Playwright.

---

**This changelog will be updated as the project evolves.** 