#!/bin/bash

# Chrome Extension Test Runner
# This script runs all tests for the Chrome extension project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version $NODE_VERSION detected. Recommended: 18 or later."
fi

print_success "Prerequisites check passed"

# Change to chrome-extension directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Working directory: $(pwd)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Parse command line arguments
RUN_LINT=true
RUN_UNIT=true
RUN_E2E=false
RUN_COVERAGE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-lint)
            RUN_LINT=false
            shift
            ;;
        --no-unit)
            RUN_UNIT=false
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --coverage)
            RUN_COVERAGE=true
            shift
            ;;
        --all)
            RUN_E2E=true
            RUN_COVERAGE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Chrome Extension Test Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-lint     Skip linting"
            echo "  --no-unit     Skip unit tests"
            echo "  --e2e         Run E2E tests (requires Chrome)"
            echo "  --coverage    Generate coverage report"
            echo "  --all         Run all tests including E2E and coverage"
            echo "  --verbose,-v  Verbose output"
            echo "  --help,-h     Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run lint and unit tests"
            echo "  $0 --all             # Run all tests"
            echo "  $0 --e2e --coverage  # Run E2E tests and generate coverage"
            echo "  $0 --no-lint         # Skip linting, run unit tests only"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_status "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test step
run_test_step() {
    local step_name="$1"
    local command="$2"
    
    print_status "Running $step_name..."
    
    if [ "$VERBOSE" = true ]; then
        if eval "$command"; then
            print_success "$step_name passed"
            ((TESTS_PASSED++))
        else
            print_error "$step_name failed"
            ((TESTS_FAILED++))
            return 1
        fi
    else
        if eval "$command" >/dev/null 2>&1; then
            print_success "$step_name passed"
            ((TESTS_PASSED++))
        else
            print_error "$step_name failed"
            print_status "Re-running with verbose output for debugging..."
            eval "$command"
            ((TESTS_FAILED++))
            return 1
        fi
    fi
}

# Run linting
if [ "$RUN_LINT" = true ]; then
    run_test_step "ESLint" "npm run lint"
fi

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
    if [ "$RUN_COVERAGE" = true ]; then
        run_test_step "Unit tests with coverage" "npm run test:coverage"
        if [ -d "coverage" ]; then
            print_status "Coverage report generated in coverage/ directory"
            if command_exists open; then
                print_status "Open coverage/lcov-report/index.html to view detailed coverage"
            fi
        fi
    else
        run_test_step "Unit tests" "npm test"
    fi
fi

# Run E2E tests
if [ "$RUN_E2E" = true ]; then
    print_status "Installing Playwright browsers (this may take a while)..."
    npx playwright install chromium >/dev/null 2>&1 || {
        print_warning "Failed to install Playwright browsers automatically"
        print_status "You may need to run: npx playwright install chromium"
    }
    
    run_test_step "E2E tests" "npm run test:e2e"
    
    if [ -d "playwright-report" ]; then
        print_status "Playwright report generated in playwright-report/ directory"
    fi
fi

# Summary
echo ""
print_status "=== Test Summary ==="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed! 🎉"
    exit 0
else
    print_error "Some tests failed. Please check the output above."
    exit 1
fi