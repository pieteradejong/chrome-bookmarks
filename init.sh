#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Initializing Chrome Bookmarks Manager...${NC}"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is required but not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "env" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv env
    echo -e "${GREEN}Virtual environment created.${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source env/bin/activate

# Install/upgrade pip and requirements
echo -e "${YELLOW}Upgrading pip and installing requirements...${NC}"
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

# Create data directory if it doesn't exist
mkdir -p data

# Chrome bookmarks file location
CHROME_BOOKMARKS="$HOME/Library/Application Support/Google/Chrome/Profile 1/Bookmarks"
WORKING_BOOKMARKS="data/bookmarks.json"

# Check if Chrome bookmarks file exists
if [ ! -f "$CHROME_BOOKMARKS" ]; then
    echo -e "${RED}Chrome bookmarks file not found at: $CHROME_BOOKMARKS${NC}"
    echo -e "${YELLOW}Please ensure Chrome is installed and you have bookmarks.${NC}"
    echo -e "${YELLOW}You can find your profile path by visiting chrome://version in Chrome and looking for 'Profile Path'${NC}"
    exit 1
fi

# Copy Chrome bookmarks to working directory
echo -e "${YELLOW}Copying Chrome bookmarks to working directory...${NC}"
cp "$CHROME_BOOKMARKS" "$WORKING_BOOKMARKS"
echo -e "${GREEN}Bookmarks copied to: $WORKING_BOOKMARKS${NC}"

echo -e "${GREEN}Initialization complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Activate the virtual environment: source env/bin/activate"
echo "2. Start developing the CLI tool in src/cli/" 