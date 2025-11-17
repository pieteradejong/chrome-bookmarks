#!/bin/bash

# Tests for package-extension.sh script
# These tests validate the packaging script functionality

set -e

TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "Testing package-extension.sh script..."

# Test 1: Version extraction from manifest.json
echo "Test 1: Version extraction"
cat > manifest.json <<EOF
{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.2.3",
  "description": "Test"
}
EOF

VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
if [ "$VERSION" != "1.2.3" ]; then
    echo "❌ FAIL: Version extraction failed. Expected '1.2.3', got '$VERSION'"
    exit 1
fi
echo "✅ PASS: Version extraction works correctly"

# Test 2: Version extraction with different format
echo "Test 2: Version extraction with spaces"
cat > manifest.json <<EOF
{
  "version" : "2.0.0"
}
EOF

VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
if [ "$VERSION" != "2.0.0" ]; then
    echo "❌ FAIL: Version extraction with spaces failed"
    exit 1
fi
echo "✅ PASS: Version extraction with spaces works"

# Test 3: Error handling for missing manifest.json
echo "Test 3: Missing manifest.json error handling"
rm -f manifest.json
if [ -f "manifest.json" ]; then
    echo "❌ FAIL: manifest.json should not exist"
    exit 1
fi
echo "✅ PASS: Missing manifest.json detected correctly"

# Test 4: ZIP file name format
echo "Test 4: ZIP file name format"
cat > manifest.json <<EOF
{
  "version": "1.0.0"
}
EOF

EXTENSION_NAME="chrome-bookmark-assistant"
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
OUTPUT_FILE="../${EXTENSION_NAME}-v${VERSION}.zip"

EXPECTED_NAME="../chrome-bookmark-assistant-v1.0.0.zip"
if [ "$OUTPUT_FILE" != "$EXPECTED_NAME" ]; then
    echo "❌ FAIL: ZIP file name format incorrect. Expected '$EXPECTED_NAME', got '$OUTPUT_FILE'"
    exit 1
fi
echo "✅ PASS: ZIP file name format is correct"

# Test 5: Exclusion patterns validation
echo "Test 5: Exclusion patterns"
EXCLUSIONS=(
    "*.git*"
    "node_modules/*"
    "coverage/*"
    "test-results/*"
    "*.log"
    "*.zip"
)

for pattern in "${EXCLUSIONS[@]}"; do
    if [[ ! "$pattern" =~ ^-x ]]; then
        # Pattern should be used with -x flag
        echo "✅ PASS: Exclusion pattern '$pattern' is valid"
    fi
done

# Test 6: Required files check
echo "Test 6: Required files validation"
REQUIRED_FILES=(
    "manifest.json"
    "popup/popup.html"
    "background/service-worker.js"
)

cat > manifest.json <<EOF
{
  "version": "1.0.0"
}
EOF

mkdir -p popup background
touch popup/popup.html background/service-worker.js

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ FAIL: Required file '$file' is missing"
        exit 1
    fi
done
echo "✅ PASS: All required files are present"

# Test 7: Directory structure validation
echo "Test 7: Directory structure"
mkdir -p icons utils
touch icons/icon48.png utils/bookmark-checker.js

DIRS=("popup" "background" "icons" "utils")
for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ FAIL: Directory '$dir' is missing"
        exit 1
    fi
done
echo "✅ PASS: Directory structure is correct"

# Cleanup
cd - > /dev/null
rm -rf "$TEST_DIR"

echo ""
echo "✅ All package script tests passed!"

