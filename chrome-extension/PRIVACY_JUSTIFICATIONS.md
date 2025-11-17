# Privacy Practices Tab - Complete Justifications

Copy and paste these justifications into the Chrome Web Store Privacy practices tab.

---

## 1. Single Purpose Description

**Question**: Does your extension have a single purpose?

**Answer**: Yes

**Description** (paste this):
```
This extension has a single purpose: to help users manage and organize their bookmarks by checking their health status and providing organization tools. All functionality is focused on bookmark management - scanning for broken links, detecting duplicates, organizing bookmarks into folders, and providing cleanup recommendations.
```

---

## 2. Permission Justifications

### bookmarks Permission

**Justification**:
```
This extension requires the bookmarks permission to read and manage user bookmarks. This is essential for the core functionality: scanning bookmarks to check their accessibility, detecting duplicates, organizing bookmarks into folders, and allowing users to delete broken bookmarks. Without this permission, the extension cannot function.
```

### storage Permission

**Justification**:
```
The storage permission is used to save scan results locally on the user's device using Chrome's storage API. This allows users to view previous scan results without re-scanning, and enables features like "View Last Results". All data is stored locally and never transmitted to external servers. Users can clear this data at any time through Chrome's extension settings.
```

### alarms Permission

**Justification**:
```
The alarms permission is used to schedule optional background bookmark scans at user-configured intervals (daily, weekly, or monthly). This allows the extension to automatically check bookmarks in the background without requiring user interaction. Users can enable or disable this feature in the extension settings. All scanning happens locally on the user's device.
```

### activeTab Permission

**Justification**:
```
The activeTab permission allows users to open bookmarks directly from the extension popup in a new browser tab. When a user clicks "Visit" on a bookmark in the results, the extension opens that bookmark URL in a new tab. This permission is only used when the user explicitly clicks a bookmark link - it does not access tabs without user interaction.
```

### notifications Permission

**Justification**:
```
The notifications permission is used to notify users when background scans complete or when issues are detected with their bookmarks. Notifications only appear when scans finish or when the extension detects broken bookmarks that need attention. Users can disable notifications in the extension settings. This helps users stay informed about their bookmark health without constantly checking the extension.
```

### downloads Permission

**Justification**:
```
The downloads permission is used to export scan results as CSV files when users click the "Export Results" button. This allows users to download their bookmark scan data for personal analysis or backup purposes. The extension only downloads files when the user explicitly requests an export - it does not download files automatically.
```

### Host Permissions (http://*/* and https://*/*)

**Justification**:
```
This extension requires access to all HTTP/HTTPS URLs to check bookmark accessibility. All checks are performed locally in your browser using fetch() requests with 'no-cors' mode, which limits the information that can be read from responses.

No bookmark data or personal information is transmitted to external servers. The extension only makes direct requests to verify if bookmarked URLs are accessible. All processing, including categorization and organization, happens entirely on your device.

The broad host permissions are necessary because bookmarks can point to any URL on the internet, and we need to check each bookmark's accessibility regardless of its domain. The extension cannot know in advance which domains users have bookmarked, so it requires access to all domains to function properly.
```

### Remote Code Use (if asked)

**Justification**:
```
This extension does not use remote code. All code is bundled locally in the extension package. The Content Security Policy is set to 'script-src self' which only allows scripts from the extension itself. No external scripts, eval(), or dynamic code execution is used. All functionality is implemented using static JavaScript files included in the extension package.
```

---

## 3. Data Usage Certification

**Question**: Does your extension collect user data?

**Answer**: No

**Explanation**:
```
This extension does not collect, transmit, or store any personal data or user information. All bookmark checking happens locally in your browser. Scan results are stored locally using Chrome's storage API and never leave your device. No external servers are contacted except to check bookmark URL accessibility, and even those requests don't transmit any personal information. No analytics, tracking, or user identification occurs.
```

**Privacy Policy URL**:
```
https://pieteradejong.github.io/chrome-bookmarks/
```

---

## 4. Account Tab Requirements

### Contact Email

1. Go to **Account** tab in Chrome Web Store Developer Dashboard
2. Enter your contact email address
3. Click **Save**

### Email Verification

1. After entering your email, check your inbox
2. Click the verification link in the email from Google
3. Return to the Account tab - it should show "Verified"

---

## Quick Checklist

**Privacy Practices Tab:**
- [ ] Single Purpose Description - ✅ Copy from section 1 above
- [ ] bookmarks justification - ✅ Copy from section 2
- [ ] storage justification - ✅ Copy from section 2
- [ ] alarms justification - ✅ Copy from section 2
- [ ] activeTab justification - ✅ Copy from section 2
- [ ] notifications justification - ✅ Copy from section 2
- [ ] downloads justification - ✅ Copy from section 2
- [ ] Host permissions justification - ✅ Copy from section 2
- [ ] Remote code justification (if shown) - ✅ Copy from section 2
- [ ] Data collection: Select "No" - ✅ Copy explanation from section 3
- [ ] Privacy Policy URL: `https://pieteradejong.github.io/chrome-bookmarks/`

**Account Tab:**
- [ ] Enter contact email
- [ ] Verify email (check inbox for verification link)

---

## Notes

- **All justifications are truthful** - your extension does process everything locally
- **No data collection** - emphasize this strongly
- **Privacy Policy** - already hosted on GitHub Pages
- **Remote Code** - if this appears, it's likely a false positive. Use the justification above explaining that all code is local.

---

## After Completing

1. Click **Save Draft** on the Privacy practices tab
2. Go to Account tab and add/verify email
3. Return to the main page and try **Submit for review** again

All errors should be resolved!

