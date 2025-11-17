# GitHub Pages Setup Guide

## Quick Setup (5 minutes)

### Option 1: Automatic (Recommended)

The repository already has a GitHub Actions workflow configured (`.github/workflows/pages.yml`).

**Steps:**
1. Push the `docs/` folder to your repository (already done)
2. Go to your GitHub repository: https://github.com/pieteradejong/chrome-bookmarks
3. Click **Settings** → **Pages**
4. Under **Source**, select:
   - **Deploy from a branch**
   - **Branch**: `main`
   - **Folder**: `/docs`
5. Click **Save**

The privacy policy will be live at:
**https://pieteradejong.github.io/chrome-bookmarks/**

### Option 2: Manual Setup

If the automatic workflow doesn't work:

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` → `/docs` folder
4. Save

### Verify It's Working

After enabling GitHub Pages:
1. Wait 1-2 minutes for deployment
2. Visit: https://pieteradejong.github.io/chrome-bookmarks/
3. You should see the privacy policy page

### Troubleshooting

**Page not loading?**
- Wait a few minutes (deployment takes time)
- Check repository Settings → Pages for status
- Verify `docs/index.html` exists in the repository

**404 Error?**
- Ensure GitHub Pages is enabled in Settings
- Check that `/docs` folder is selected
- Verify `docs/index.html` is committed

**Custom Domain?**
- Not needed for Chrome Web Store submission
- The GitHub Pages URL works perfectly

---

## Privacy Policy URL for Store Listing

Once GitHub Pages is enabled, use this URL in your Chrome Web Store listing:

```
https://pieteradejong.github.io/chrome-bookmarks/
```

This URL will be used in:
- Chrome Web Store Privacy tab
- Store listing description (optional)
- Privacy policy link in extension

---

## Files Created

- `docs/index.html` - Privacy policy HTML page
- `docs/README.md` - Documentation for the docs folder
- `.github/workflows/pages.yml` - Automatic deployment workflow

---

## Next Steps

1. ✅ Enable GitHub Pages (Settings → Pages)
2. ✅ Verify URL works
3. ✅ Use URL in Chrome Web Store listing
4. ✅ Submit extension!

---

*The privacy policy is already created and ready. Just enable GitHub Pages!*

