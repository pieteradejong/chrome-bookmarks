# GitHub Pages Setup - Step-by-Step Walkthrough

## What We're Creating

A public website that hosts your privacy policy at:
**https://pieteradejong.github.io/chrome-bookmarks/**

This URL will be used in your Chrome Web Store listing.

---

## Step-by-Step Instructions

### Step 1: Navigate to GitHub Pages Settings

1. Go to your repository on GitHub:
   ```
   https://github.com/pieteradejong/chrome-bookmarks
   ```

2. Click on **Settings** (top menu bar, right side)

3. In the left sidebar, scroll down and click **Pages**

   You should see a section titled "Build and deployment"

### Step 2: Configure GitHub Pages

1. Under **Source**, you'll see a dropdown that says "None" or "Deploy from a branch"

2. Click the dropdown and select: **"Deploy from a branch"**

3. Under **Branch**, you'll see two dropdowns:
   - First dropdown: Select **`main`**
   - Second dropdown: Select **`/docs`**

4. Click **Save**

### Step 3: Wait for Deployment

1. After clicking Save, GitHub will start building your site
2. You'll see a message: "Your site is ready to be published at..."
3. Wait 1-2 minutes for the first deployment
4. You'll see a green checkmark when it's ready

### Step 4: Verify It Works

1. After deployment completes, you'll see a URL like:
   ```
   https://pieteradejong.github.io/chrome-bookmarks/
   ```

2. Click the URL or copy it and open in a new tab

3. You should see your privacy policy page with:
   - Title: "Chrome Bookmark Assistant - Privacy Policy"
   - Clean, professional layout
   - All privacy information

4. ✅ **Success!** Your privacy policy is now live

---

## What's Already on the Page

The `docs/index.html` file contains:

### Content Included:
- ✅ Privacy policy title and header
- ✅ "Data Collection: None" section
- ✅ "How We Handle Your Data" section
  - Local Processing Only
  - Data Storage
  - Network Requests
- ✅ "Permissions Used" section
  - Explanation of each permission
  - Purpose and usage for each
- ✅ "Your Privacy Rights" section
- ✅ "Changes to This Policy" section
- ✅ Contact information (GitHub repository link)

### Styling:
- ✅ Professional, clean design
- ✅ Responsive (works on mobile)
- ✅ Easy to read
- ✅ Brand colors (purple/blue theme)

---

## What You Need to Put on It

**Nothing!** The page is already complete. However, you can customize:

### Optional Customizations:

#### 1. Update Contact Information
If you want to add an email address, edit `docs/index.html`:

Find this section (around line 70):
```html
<div class="contact">
    <h2>Contact</h2>
    <p>If you have questions about this privacy policy...</p>
</div>
```

You can add:
```html
<p>Email: your-email@example.com</p>
```

#### 2. Update Last Updated Date
Find this line (around line 5):
```html
<p><strong>Last Updated:</strong> December 2024</p>
```

Change to current date if desired.

#### 3. Add More Information (Optional)
You can add sections like:
- FAQ
- Version history
- Additional contact methods

---

## Using the URL in Chrome Web Store

Once GitHub Pages is live, use this URL:

```
https://pieteradejong.github.io/chrome-bookmarks/
```

### Where to Use It:

1. **Chrome Web Store → Privacy Tab**
   - Paste URL in "Privacy Policy URL" field

2. **Chrome Web Store → Store Listing Tab** (Optional)
   - You can link to it in your description:
   ```markdown
   Privacy Policy: https://pieteradejong.github.io/chrome-bookmarks/
   ```

---

## Troubleshooting

### Page Not Loading?

**Check 1: Is GitHub Pages Enabled?**
- Go to Settings → Pages
- Verify "Deploy from a branch" is selected
- Verify branch is `main` and folder is `/docs`

**Check 2: Has It Been Deployed?**
- Look for green checkmark in Pages settings
- Check Actions tab for deployment status
- Wait 2-3 minutes for first deployment

**Check 3: Correct URL?**
- URL should be: `https://pieteradejong.github.io/chrome-bookmarks/`
- Not: `https://pieteradejong.github.io/chrome-bookmarks/docs/`
- The `/docs` folder is the source, but the URL doesn't include it

**Check 4: File Exists?**
- Verify `docs/index.html` exists in your repository
- Check that it's committed and pushed

### 404 Error?

- Wait a few more minutes (deployment can take 2-5 minutes)
- Try clearing browser cache
- Check repository Settings → Pages for any error messages
- Verify the `docs/` folder is in the `main` branch

### Want to Update the Page?

1. Edit `docs/index.html`
2. Commit and push changes
3. GitHub Pages will automatically redeploy (usually within 1-2 minutes)

---

## Visual Guide

### GitHub Pages Settings Page Should Look Like:

```
┌─────────────────────────────────────────┐
│  Pages                                  │
├─────────────────────────────────────────┤
│                                         │
│  Build and deployment                   │
│                                         │
│  Source: [Deploy from a branch ▼]     │
│                                         │
│  Branch:                                │
│    [main ▼]  [/docs ▼]                │
│                                         │
│  [Save]                                 │
│                                         │
│  Your site is published at:             │
│  https://pieteradejong.github.io/       │
│  chrome-bookmarks/                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Quick Checklist

- [ ] Go to repository Settings → Pages
- [ ] Select "Deploy from a branch"
- [ ] Select branch: `main`
- [ ] Select folder: `/docs`
- [ ] Click Save
- [ ] Wait 1-2 minutes
- [ ] Visit: https://pieteradejong.github.io/chrome-bookmarks/
- [ ] Verify privacy policy loads correctly
- [ ] Copy URL for Chrome Web Store

---

## What Happens Next?

After GitHub Pages is enabled:

1. **Immediate**: GitHub starts building your site
2. **1-2 minutes**: Site becomes live
3. **You get**: A public URL for your privacy policy
4. **Use it**: Paste URL in Chrome Web Store Privacy tab

---

## Alternative: Manual Setup (If Needed)

If the automatic workflow doesn't work, you can use manual setup:

1. Go to Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main`
4. Folder: `/docs` (not `/root`)
5. Save

The GitHub Actions workflow (`.github/workflows/pages.yml`) will handle automatic deployments when you push changes to the `docs/` folder.

---

## Summary

**What to do:**
1. Go to GitHub repository Settings → Pages
2. Select "Deploy from a branch" → `main` → `/docs`
3. Click Save
4. Wait 1-2 minutes
5. Visit the URL to verify

**What's already there:**
- Complete privacy policy HTML page
- Professional styling
- All required information
- Ready to use

**What you'll get:**
- Public URL: `https://pieteradejong.github.io/chrome-bookmarks/`
- Use this URL in Chrome Web Store listing

---

**That's it! The page content is already complete. You just need to enable GitHub Pages in settings.**

