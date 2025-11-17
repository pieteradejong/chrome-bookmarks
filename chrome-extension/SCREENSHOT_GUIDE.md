# Screenshot Guide for Chrome Web Store Submission

## Required Screenshots

Chrome Web Store requires at least **1 screenshot**, but **3-5 screenshots** are recommended for better visibility.

### Screenshot Specifications
- **Minimum size**: 1280x800px or 640x400px
- **Recommended size**: 1280x800px
- **Format**: PNG or JPEG
- **Maximum**: 5 screenshots
- **File size**: Keep under 1MB each

## Screenshots to Take

### 1. Main Popup Interface (Required)
**What to show:**
- Extension popup with initial state
- "Start Scan" button visible
- Bookmark count displayed
- Clean, professional appearance

**How to capture:**
1. Load extension in Chrome
2. Click extension icon to open popup
3. Resize browser window to show popup clearly
4. Use screenshot tool (Cmd+Shift+4 on Mac, Snipping Tool on Windows)
5. Crop to show popup clearly (1280x800px recommended)

**Tips:**
- Make sure popup is fully visible
- Show the welcome message and scan button
- Include the extension icon/header

### 2. Scan Results View (Highly Recommended)
**What to show:**
- Results after a scan
- Categorized bookmarks (Working, Issues, Protected)
- Tab navigation visible
- Statistics displayed

**How to capture:**
1. Run a scan with some bookmarks
2. Wait for results to appear
3. Show the results view with categories
4. Capture at 1280x800px

**Tips:**
- Show multiple categories if possible
- Display the statistics (working count, issues count)
- Show the tab navigation

### 3. Organization Features (Recommended)
**What to show:**
- Smart organization tab
- Folder suggestions
- Duplicate detection
- Organization recommendations

**How to capture:**
1. Click "Smart Organization" button
2. Wait for analysis to complete
3. Show organization tab with recommendations
4. Capture at 1280x800px

**Tips:**
- Show folder suggestions
- Display duplicate groups if available
- Highlight the smart features

### 4. Options/Settings Page (Optional)
**What to show:**
- Settings page with options
- Scheduled scan settings
- Notification preferences

**How to capture:**
1. Click settings icon (⚙️) in popup
2. Or navigate to `chrome://extensions` → Options
3. Show settings page
4. Capture at 1280x800px

### 5. Scan in Progress (Optional)
**What to show:**
- Progress bar during scan
- Live statistics updating
- Current bookmark being checked

**How to capture:**
1. Start a scan
2. Capture during progress (not too early, not too late)
3. Show progress bar and statistics
4. Capture at 1280x800px

## Screenshot Tools

### Mac
- **Built-in**: Cmd+Shift+4 (select area), Cmd+Shift+3 (full screen)
- **Preview**: File → Take Screenshot
- **Third-party**: CleanShot X, Skitch

### Windows
- **Snipping Tool**: Built-in screenshot tool
- **Windows+Shift+S**: Snip & Sketch
- **Third-party**: Greenshot, ShareX

### Chrome Extensions
- **Full Page Screen Capture**: Captures entire page
- **Awesome Screenshot**: Advanced screenshot tool
- **Nimbus Screenshot**: Full page and visible area

## Best Practices

### Composition
- ✅ Show the extension clearly
- ✅ Include relevant UI elements
- ✅ Use consistent sizing (1280x800px)
- ✅ Keep backgrounds clean
- ✅ Highlight key features

### What to Avoid
- ❌ Personal information in bookmarks
- ❌ Sensitive URLs or data
- ❌ Blurry or low-resolution images
- ❌ Too much empty space
- ❌ Overly complex screenshots

### Editing Tips
- Crop to focus on extension UI
- Add subtle borders if needed
- Ensure text is readable
- Keep file sizes reasonable (<1MB)
- Use consistent styling across screenshots

## File Naming Convention

Save screenshots with descriptive names:
```
screenshot-1-popup.png
screenshot-2-results.png
screenshot-3-organization.png
screenshot-4-settings.png
screenshot-5-progress.png
```

## Where to Store Screenshots

Create a `screenshots/` folder in the chrome-extension directory:
```
chrome-extension/
  screenshots/
    screenshot-1-popup.png
    screenshot-2-results.png
    screenshot-3-organization.png
```

**Note**: Screenshots should NOT be included in the Chrome Web Store ZIP package. They're only for the store listing.

## Quick Checklist

- [ ] Screenshot 1: Main popup interface (required)
- [ ] Screenshot 2: Scan results view (recommended)
- [ ] Screenshot 3: Organization features (recommended)
- [ ] Screenshot 4: Settings page (optional)
- [ ] Screenshot 5: Scan in progress (optional)
- [ ] All screenshots are 1280x800px
- [ ] All screenshots are under 1MB
- [ ] No personal information visible
- [ ] Text is readable
- [ ] Extension UI is clearly visible

## Uploading to Chrome Web Store

1. Go to Chrome Web Store Developer Dashboard
2. Select your extension
3. Go to Store Listing tab
4. Scroll to Screenshots section
5. Upload screenshots (drag and drop or click to browse)
6. Reorder screenshots by dragging
7. Save changes

---

**Pro Tip**: Take screenshots with a clean browser profile or incognito mode to avoid showing personal bookmarks or data.

