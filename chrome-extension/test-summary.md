# Chrome Extension Testing Infrastructure

## Overview

This document provides a comprehensive overview of the testing infrastructure for the Chrome Bookmark Manager extension.

## Test Scripts

### 1. Local Test Runner
```bash
./run-tests.sh [options]
```

**Available Options:**
- `--no-lint`: Skip linting
- `--no-unit`: Skip unit tests  
- `--e2e`: Run E2E tests (requires Chrome)
- `--coverage`: Generate coverage report
- `--all`: Run all tests including E2E and coverage
- `--verbose, -v`: Verbose output
- `--help, -h`: Show help message

**Examples:**
```bash
./run-tests.sh                    # Run lint and unit tests
./run-tests.sh --all             # Run all tests
./run-tests.sh --e2e --coverage  # Run E2E tests and generate coverage
./run-tests.sh --no-lint         # Skip linting, run unit tests only
```

### 2. NPM Scripts
```bash
npm test                    # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Run E2E tests with UI
npm run lint               # Run linting
npm run lint:fix           # Auto-fix linting issues
```

## Test Types

### Unit Tests (Jest)
- **Location**: `utils/*.test.js`
- **Framework**: Jest with sinon-chrome for Chrome API mocking
- **Coverage**: 94.25% on core logic (`bookmark-checker.js`)
- **Features**:
  - Chrome API mocking
  - Edge case testing
  - Error handling validation
  - Caching logic verification

**Key Test Files:**
- `utils/bookmark-checker.test.js` - Core logic tests
- `utils/bookmark-checker-chrome.test.js` - Chrome API integration tests

### End-to-End Tests (Playwright)
- **Location**: `e2e/*.spec.js`
- **Framework**: Playwright with Chrome extension support
- **Features**:
  - Extension popup testing
  - Options page testing
  - Service worker communication
  - Mock bookmark scanning

**Configuration**: `playwright.config.js`

### Linting (ESLint)
- **Configuration**: `eslint.config.js`
- **Coverage**: All tested files (excluding legacy files)
- **Rules**: Chrome extension specific configuration

## Coverage Requirements

**Current Thresholds (90% minimum):**
- Statements: 90%
- Branches: 90%
- Functions: 90%
- Lines: 90%

**Coverage Reports:**
- Text output in console
- HTML report in `coverage/lcov-report/`
- LCOV format for CI integration

## CI/CD Integration

### GitHub Actions Workflow
**File**: `.github/workflows/test.yml`

**Triggers:**
- Push to `main` and `develop` branches
- Pull requests to `main` branch

**Jobs:**

#### Test Job
1. Setup Node.js 18
2. Install dependencies
3. Run linting
4. Run unit tests
5. Generate coverage report
6. Upload coverage to Codecov
7. Install Playwright browsers
8. Run E2E tests
9. Upload Playwright reports on failure

#### Security Job
1. Setup Node.js 18
2. Install dependencies
3. Run security audit
4. Check for high-severity vulnerabilities

### Validation Script
```bash
# From project root
./validate-ci.sh
```

Validates GitHub Actions workflow configuration.

## File Structure

```
chrome-extension/
├── utils/
│   ├── bookmark-checker.js          # Core logic
│   ├── bookmark-checker.test.js     # Unit tests
│   └── bookmark-checker-chrome.test.js # Chrome API tests
├── e2e/
│   └── chrome-extension.spec.js     # E2E tests
├── coverage/                        # Coverage reports
├── playwright-report/              # E2E test reports
├── jest.config.js                  # Jest configuration
├── playwright.config.js            # Playwright configuration
├── eslint.config.js               # ESLint configuration
├── run-tests.sh                   # Local test runner
├── .gitignore                     # Git ignore rules
└── package.json                   # NPM scripts and dependencies
```

## Prerequisites

- Node.js 18 or later
- npm
- Chrome browser (for E2E tests)

## Development Workflow

1. **Local Development**:
   ```bash
   ./run-tests.sh  # Quick validation
   npm run test:watch  # Continuous testing
   ```

2. **Pre-commit**:
   ```bash
   ./run-tests.sh --all  # Full test suite
   ```

3. **CI/CD**:
   - Push to branch triggers automated testing
   - Pull requests run full test suite
   - Coverage reports uploaded automatically

## Troubleshooting

### Jest Not Exiting
- Common issue with async operations
- Use `--detectOpenHandles` flag for debugging
- Check for unclosed timers or promises

### E2E Test Failures
- Ensure Chrome browser is available
- Check Playwright browser installation: `npx playwright install chromium`
- Review `playwright-report/` for detailed failure information

### Coverage Issues
- Adjust thresholds in `jest.config.js` if needed
- Add new files to `collectCoverageFrom` array
- Exclude untested legacy files

### Linting Errors
- Use `npm run lint:fix` for auto-fixable issues
- Update `eslint.config.js` ignores for problematic files
- Check ESLint documentation for rule explanations

## Best Practices

1. **Test Coverage**: Maintain >90% coverage on new code
2. **E2E Tests**: Focus on critical user workflows
3. **Mocking**: Use sinon-chrome for Chrome API testing
4. **Naming**: Use descriptive test names and organize with `describe` blocks
5. **CI/CD**: Keep tests fast and reliable for good developer experience