# How to Run Tests

## Prerequisites

Make sure you have installed all dependencies:
```bash
cd chrome-extension
npm install
```

## Running Tests

### Unit Tests (Jest)

Run all unit tests:
```bash
npm test
```

Run tests in watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

Run tests with coverage report:
```bash
npm run test:coverage
```

Coverage reports will be generated in:
- Terminal output
- `coverage/` directory (HTML report)
- `coverage/lcov.info` (LCOV format)

### E2E Tests (Playwright)

Run all E2E tests:
```bash
npm run test:e2e
```

Run E2E tests with UI (interactive mode):
```bash
npm run test:e2e:ui
```

### Shell Script Tests

Run the package script validation tests:
```bash
./package-extension.test.sh
```

## Test Files

### Unit Tests
- `utils/bookmark-checker.test.js` - BookmarkChecker core functionality
- `utils/bookmark-checker-chrome.test.js` - Chrome API integration
- `utils/smart-tagger.test.js` - SmartTagger bookmark analysis
- `utils/smart-scanner.test.js` - SmartBookmarkScanner scan strategies
- `popup/popup.test.js` - PopupController UI logic
- `background/service-worker.test.js` - Service worker background tasks

### Integration Tests
- `__tests__/integration/popup-integration.test.js` - Component integration

### E2E Tests
- `e2e/chrome-extension.spec.js` - End-to-end browser tests

### Script Tests
- `package-extension.test.sh` - Packaging script validation

## Test Coverage Goals

Current coverage thresholds (from `jest.config.js`):
- Branches: 90%
- Functions: 90%
- Lines: 90%
- Statements: 90%

## Troubleshooting

### Tests fail with "Cannot find module"
Make sure you're in the `chrome-extension/` directory and have run `npm install`.

### E2E tests fail
Make sure Playwright browsers are installed:
```bash
npx playwright install
```

### Chrome API mocks not working
Tests use `sinon-chrome` for mocking. Make sure it's installed:
```bash
npm install --save-dev sinon-chrome
```

