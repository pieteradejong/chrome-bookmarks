#!/bin/bash

# Package Chrome Extension for Chrome Web Store Submission
# This script creates a ZIP file ready for upload to the Chrome Web Store

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
EXTENSION_NAME="chrome-bookmark-assistant"
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
OUTPUT_FILE="../${EXTENSION_NAME}-v${VERSION}.zip"

echo -e "${GREEN}📦 Packaging Chrome Extension${NC}"
echo "Extension: ${EXTENSION_NAME}"
echo "Version: ${VERSION}"
echo "Output: ${OUTPUT_FILE}"
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Error: manifest.json not found. Run this script from chrome-extension/ directory${NC}"
    exit 1
fi

# Check if zip command is available
if ! command -v zip &> /dev/null; then
    echo -e "${RED}❌ Error: zip command not found. Please install zip utility.${NC}"
    exit 1
fi

# Remove old package if it exists
if [ -f "${OUTPUT_FILE}" ]; then
    echo -e "${YELLOW}⚠️  Removing old package...${NC}"
    rm "${OUTPUT_FILE}"
fi

# Create the ZIP file, excluding unnecessary files
echo -e "${GREEN}📦 Creating package...${NC}"
zip -r "${OUTPUT_FILE}" . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "coverage/*" \
    -x "test-results/*" \
    -x "playwright-report/*" \
    -x "playwright/.cache/*" \
    -x "*.log" \
    -x "npm-debug.log*" \
    -x ".DS_Store" \
    -x "Thumbs.db" \
    -x ".vscode/*" \
    -x ".idea/*" \
    -x "*.swp" \
    -x "*.swo" \
    -x ".claude/*" \
    -x "*.zip" \
    -x "package-extension.sh" \
    -x "package-extension.test.sh" \
    -x "PUBLISHING.md" \
    -x "README.md" \
    -x "TESTING.md" \
    -x ".eslintcache" \
    -x ".npm/*" \
    -x "__tests__/*" \
    -x "**/*.test.js" \
    -x "**/*.spec.js" \
    -x "jest.config.js" \
    -x "playwright.config.js" \
    > /dev/null

# Verify the ZIP was created
if [ -f "${OUTPUT_FILE}" ]; then
    FILE_SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)
    echo -e "${GREEN}✅ Package created successfully!${NC}"
    echo ""
    echo "📄 File: ${OUTPUT_FILE}"
    echo "📊 Size: ${FILE_SIZE}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Go to Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole"
    echo "2. Click 'Add new item' or select your extension to update"
    echo "3. Upload: ${OUTPUT_FILE}"
    echo "4. Complete the store listing and submit for review"
    echo ""
    echo "See PUBLISHING.md for detailed instructions."
else
    echo -e "${RED}❌ Error: Failed to create package${NC}"
    exit 1
fi

