#!/bin/bash

echo "Building LSAT Demon Analyzer Chrome Extension..."

# Build with Vite
npm run build

# Fix file structure
if [ -f "dist/src/popup.html" ]; then
    mv dist/src/popup.html dist/
    rmdir dist/src 2>/dev/null || true
fi

# Copy manifest
cp manifest.json dist/

echo "Build complete! Extension files are in the 'dist' folder."
echo ""
echo "To install in Chrome:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the 'dist' folder" 