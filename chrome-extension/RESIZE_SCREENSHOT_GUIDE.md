# Quick Guide: Resize Your Screenshot

Your screenshot is **808×1004 pixels** but Chrome Web Store needs **1280×800** or **640×400**.

## Option 1: Use the Resize Script (Easiest)

1. **Drag your screenshot file** onto Terminal, or copy its full path

2. **Run this command**:
```bash
cd chrome-extension
./resize-screenshot.sh "/path/to/your/screenshot.png"
```

**Example:**
```bash
cd chrome-extension
./resize-screenshot.sh ~/screenshots/Screenshot\ 2025-11-17\ at\ 6.03.45\ PM.png
```

This will create two files in `chrome-extension/screenshots/`:
- `screenshot_1280x800.png` (recommended)
- `screenshot_640x400.png` (smaller version)

## Option 2: Manual Resize with macOS Preview

1. **Open your screenshot** in Preview (double-click it)

2. **Tools → Adjust Size** (or press ⌘⌥I)

3. **Set dimensions**:
   - **Width**: 1280 pixels
   - **Height**: 800 pixels
   - Make sure "Scale proportionally" is **unchecked**
   - Click **OK**

4. **Remove transparency**:
   - File → Export
   - Format: **PNG**
   - **Uncheck "Alpha"** (this removes transparency)
   - Save as `screenshot_1280x800.png`

5. **Upload to Chrome Web Store**

## Option 3: Use ImageMagick Directly

If you have ImageMagick installed:

```bash
# Navigate to your screenshot location
cd ~/screenshots

# Resize to 1280x800 (adds white padding if needed)
magick "Screenshot 2025-11-17 at 6.03.45 PM.png" \
  -resize '1280x800^' \
  -gravity center \
  -extent 1280x800 \
  -background white \
  -alpha remove \
  -type TrueColor \
  screenshot_1280x800.png

# Verify dimensions
magick identify screenshot_1280x800.png
```

## What the Resize Does

- **Resizes** your 808×1004 image to fit 1280×800
- **Adds white padding** on sides to make it exactly 1280×800
- **Removes alpha channel** (transparency) - Chrome Web Store requirement
- **Centers** your content

## After Resizing

1. **Check the file**:
   ```bash
   magick identify screenshot_1280x800.png
   ```
   Should show: `PNG 1280x800`

2. **Upload to Chrome Web Store**:
   - Go to Store listing → Screenshots
   - Drag and drop `screenshot_1280x800.png`
   - Should work without errors!

## Troubleshooting

**Still getting "image size is incorrect"?**
- Verify dimensions: `magick identify your-file.png`
- Make sure it's exactly 1280×800 or 640×400
- Make sure alpha channel is removed (no transparency)

**File not found?**
- Check the exact filename (spaces matter)
- Use quotes around the path: `"./path with spaces/file.png"`

---

**Quick Command** (copy-paste ready):
```bash
cd chrome-extension && ./resize-screenshot.sh ~/screenshots/Screenshot\ 2025-11-17\ at\ 6.03.45\ PM.png
```

