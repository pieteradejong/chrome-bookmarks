# Chrome Bookmark Assistant - Privacy Policy

**Last Updated:** December 2024

## Data Collection: None

Chrome Bookmark Assistant does **not** collect, transmit, or store any personal data or user information.

## How We Handle Your Data

### Local Processing Only
- All bookmark checking happens **locally** in your browser
- No data is sent to external servers or third-party services
- No analytics, tracking, or user identification

### Data Storage
- Scan results are stored **locally** using Chrome's built-in storage API
- Data remains on your device and is never transmitted
- You can clear stored data at any time through Chrome's extension settings

### Network Requests
- The extension makes direct HTTP/HTTPS requests to check bookmark URLs
- These requests use `no-cors` mode, which limits the information that can be read
- Requests are made only to verify bookmark accessibility
- No request data is logged or transmitted to external services

## Permissions Used

### `bookmarks`
**Purpose:** To read and manage your bookmarks  
**Usage:** Required to scan bookmarks and organize them

### `storage`
**Purpose:** To save scan results locally  
**Usage:** Stores scan results and settings on your device only

### `downloads`
**Purpose:** To export scan results as CSV files  
**Usage:** Allows you to download your scan results for personal use

### `alarms`
**Purpose:** To schedule automatic bookmark scans  
**Usage:** Runs background scans at your chosen frequency (if enabled)

### `activeTab`
**Purpose:** To open bookmarks in new tabs  
**Usage:** Allows you to visit bookmarks directly from the extension

### `notifications`
**Purpose:** To notify you of scan completion and issues  
**Usage:** Shows notifications when scans complete or issues are found

### `http://*/*` and `https://*/*`
**Purpose:** To check bookmark URL accessibility  
**Usage:** Makes local requests to verify if bookmarks are accessible. All checks happen locally in your browser. No data is transmitted to external servers.

## Your Privacy Rights

- **No Data Collection:** We don't collect any data
- **No Data Sharing:** There's no data to share
- **No Tracking:** We don't track your usage
- **Full Control:** You can disable the extension or clear its data at any time

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date. Since we don't collect data, changes would only occur if we add new features that require different permissions.

## Contact

If you have questions about this privacy policy or how the extension handles your data, please open an issue on the [GitHub repository](https://github.com/pieteradejong/chrome-bookmarks).

---

**Summary:** Chrome Bookmark Assistant processes all data locally on your device. Your bookmarks and scan results never leave your computer. No external data transmission occurs.

