# 🧪 Chrome Extension Testing Guide

## Overview

This document outlines best practices, strategies, and tools for automated testing of the Chrome Bookmarks Manager extension. It also provides a step-by-step plan to implement Jest-based unit testing for core functionality.

---

## 🏆 Best Practices for Automated Testing of Chrome Extensions

### 1. Separation of Concerns
- Keep business logic separate from UI and Chrome API calls.
- Place core logic (e.g., bookmark validation, categorization) in pure JS modules that are easy to unit test.

### 2. Unit Testing
- Use Jest, Mocha, or similar frameworks for unit testing pure functions and logic.
- Mock Chrome APIs using libraries like [sinon-chrome](https://github.com/acvetkov/sinon-chrome) or [chrome-mock](https://www.npmjs.com/package/chrome-mock).

### 3. Integration/E2E Testing
- Use [Puppeteer](https://pptr.dev/) or [Playwright](https://playwright.dev/) to automate Chrome and interact with your extension as a user would.
- Test popup UI, options page, and background scripts in a real browser context.

### 4. Testing Chrome APIs
- Mock Chrome APIs in unit tests.
- For integration tests, use a real or headless Chrome instance.

### 5. Test Manifest and Permissions
- Validate that your `manifest.json` is correct and permissions are sufficient for all features.
- Test with both minimal and full permissions to catch permission-related bugs.

### 6. Automate Build and Test
- Use npm scripts and CI (e.g., GitHub Actions) to run tests on every push.
- Lint and type-check as part of your test pipeline.

### 7. Test All Extension Contexts
- **Popup**: Test UI and user interactions.
- **Background/Service Worker**: Test event handling, alarms, and messaging.
- **Options Page**: Test settings persistence and UI.
- **Content Scripts** (if any): Test injection and DOM manipulation.

### 8. Test Edge Cases
- No bookmarks, thousands of bookmarks, deeply nested folders, etc.
- Permission denied, storage full, network errors, etc.

### 9. Use Source Maps and Logging
- Enable source maps for easier debugging of test failures.
- Use `console.log`/`console.error` in development, but clean up before release.

### 10. Document Test Coverage
- Track and improve test coverage, especially for core logic and user flows.

---

## 📚 References

- [Chrome Extension Developer Guide: Testing](https://developer.chrome.com/docs/extensions/develop/test/)
- [Google Chrome Extension Sample Tests (GitHub)](https://github.com/GoogleChrome/chrome-extensions-samples)
- [Puppeteer for Extension Testing](https://pptr.dev/guides/testing-chrome-extensions)
- [sinon-chrome for Mocking](https://github.com/acvetkov/sinon-chrome)

---

## 📝 Testing Plan

### 1. Manual Testing Checklist
- Popup UI loads and displays correctly
- Scan button triggers bookmark scan
- Results are categorized and actionable
- Options/settings persist and work
- Background features (scheduled scans, notifications) function
- Handles edge cases (no bookmarks, many bookmarks, folders, etc.)
- No console errors or permission issues

### 2. Automated Testing Roadmap

#### Phase 1: Unit Testing with Jest (Core Logic)
- Set up Jest in the `chrome-extension/` directory
- Write unit tests for pure functions in `utils/bookmark-checker.js`
- Mock Chrome APIs as needed
- Add tests for:
  - URL validation
  - Categorization logic
  - Error handling
  - Caching logic

#### Phase 2: Integration/E2E Testing
- Set up Puppeteer or Playwright for UI and workflow tests
- Automate popup, options, and background script testing
- Simulate user actions and verify UI updates

#### Phase 3: CI Integration
- Add test scripts to npm
- Run tests on every push using GitHub Actions or similar
- Enforce linting and type-checking

---

## 🚦 Next Steps

1. **Set up Jest for unit testing in `chrome-extension/`**
2. **Write initial tests for core logic in `utils/bookmark-checker.js`**
3. Expand test coverage to other modules and edge cases
4. Plan and implement integration/E2E tests
5. Integrate tests into CI pipeline

---

**This document will be updated as the testing infrastructure evolves.** 