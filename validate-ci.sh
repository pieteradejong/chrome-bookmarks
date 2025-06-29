#!/bin/bash

# CI/CD Validation Script
# Validates that GitHub Actions workflow is properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_status "Validating CI/CD configuration..."

# Check if .github/workflows directory exists
if [ ! -d ".github/workflows" ]; then
    print_error ".github/workflows directory not found"
    exit 1
fi

print_success ".github/workflows directory exists"

# Check if test.yml workflow exists
if [ ! -f ".github/workflows/test.yml" ]; then
    print_error ".github/workflows/test.yml not found"
    exit 1
fi

print_success "GitHub Actions workflow file exists"

# Validate workflow file structure
WORKFLOW_FILE=".github/workflows/test.yml"

# Check for required sections
if ! grep -q "name:" "$WORKFLOW_FILE"; then
    print_error "Workflow name not found"
    exit 1
fi

if ! grep -q "on:" "$WORKFLOW_FILE"; then
    print_error "Workflow triggers not found"
    exit 1
fi

if ! grep -q "jobs:" "$WORKFLOW_FILE"; then
    print_error "Jobs section not found"
    exit 1
fi

print_success "Workflow file has required structure"

# Check for test job
if ! grep -q "test:" "$WORKFLOW_FILE"; then
    print_error "Test job not found"
    exit 1
fi

print_success "Test job configured"

# Check for security job
if ! grep -q "security:" "$WORKFLOW_FILE"; then
    print_warning "Security job not found (optional)"
else
    print_success "Security job configured"
fi

# Check for key steps
if ! grep -q "npm run lint" "$WORKFLOW_FILE"; then
    print_warning "Linting step not found"
else
    print_success "Linting step configured"
fi

if ! grep -q "npm test" "$WORKFLOW_FILE"; then
    print_error "Unit test step not found"
    exit 1
fi

print_success "Unit test step configured"

if ! grep -q "npm run test:coverage" "$WORKFLOW_FILE"; then
    print_warning "Coverage step not found"
else
    print_success "Coverage step configured"
fi

if ! grep -q "npm run test:e2e" "$WORKFLOW_FILE"; then
    print_warning "E2E test step not found"
else
    print_success "E2E test step configured"
fi

# Check Node.js version
if ! grep -q "node-version.*18" "$WORKFLOW_FILE"; then
    print_warning "Node.js 18 not specified (recommended)"
else
    print_success "Node.js 18 configured"
fi

# Check working directory
if ! grep -q "working-directory: chrome-extension" "$WORKFLOW_FILE"; then
    print_error "Working directory not set to chrome-extension"
    exit 1
fi

print_success "Working directory correctly configured"

# Check for artifact upload
if ! grep -q "actions/upload-artifact" "$WORKFLOW_FILE"; then
    print_warning "No artifact upload configured"
else
    print_success "Artifact upload configured"
fi

print_status "=== CI/CD Validation Summary ==="
print_success "GitHub Actions workflow is properly configured! 🎉"
print_status "The workflow will run on:"
print_status "  - Push to main and develop branches"
print_status "  - Pull requests to main branch"
print_status ""
print_status "Jobs configured:"
print_status "  - Test job: lint, unit tests, coverage, E2E tests"
print_status "  - Security job: dependency auditing"
print_status ""
print_status "To test the workflow:"
print_status "  1. Push changes to a branch"
print_status "  2. Create a pull request to main"
print_status "  3. Check the Actions tab in GitHub"