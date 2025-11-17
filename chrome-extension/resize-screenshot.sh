#!/bin/bash

# Script to resize screenshots for Chrome Web Store submission
# Requirements: 1280x800 or 640x400, no alpha channel

INPUT_FILE="$1"
OUTPUT_DIR="${2:-chrome-extension/screenshots}"

if [ -z "$INPUT_FILE" ]; then
    echo "Usage: ./resize-screenshot.sh <input-file> [output-dir]"
    echo ""
    echo "Example:"
    echo "  ./resize-screenshot.sh ~/screenshots/Screenshot.png"
    echo "  ./resize-screenshot.sh ~/screenshots/Screenshot.png chrome-extension/screenshots"
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File not found: $INPUT_FILE"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Get filename without path
BASENAME=$(basename "$INPUT_FILE")
NAME="${BASENAME%.*}"
EXT="${BASENAME##*.}"

# Output filenames
OUTPUT_1280="${OUTPUT_DIR}/${NAME}_1280x800.png"
OUTPUT_640="${OUTPUT_DIR}/${NAME}_640x400.png"

echo "Processing: $INPUT_FILE"
echo "Current dimensions:"
magick identify "$INPUT_FILE" | awk '{print "  " $3}'

echo ""
echo "Creating resized versions..."

# Resize to 1280x800 (maintains aspect ratio, adds padding if needed)
magick "$INPUT_FILE" \
    -resize 1280x800^ \
    -gravity center \
    -extent 1280x800 \
    -background white \
    -alpha remove \
    -type TrueColor \
    "$OUTPUT_1280"

# Resize to 640x400 (maintains aspect ratio, adds padding if needed)
magick "$INPUT_FILE" \
    -resize 640x400^ \
    -gravity center \
    -extent 640x400 \
    -background white \
    -alpha remove \
    -type TrueColor \
    "$OUTPUT_640"

echo ""
echo "✅ Created:"
echo "  - $OUTPUT_1280 (1280x800)"
echo "  - $OUTPUT_640 (640x400)"
echo ""
echo "Verifying dimensions:"
magick identify "$OUTPUT_1280" | awk '{print "  1280x800: " $3}'
magick identify "$OUTPUT_640" | awk '{print "  640x400: " $3}'
echo ""
echo "✅ Ready to upload to Chrome Web Store!"

