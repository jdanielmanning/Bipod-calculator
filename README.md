# Bipod Calculator — PWA

A standalone Progressive Web App for rigging force analysis on A-frame lifts.
Works on Android, iOS, and desktop. No app store needed.

## Files

```
bipod-pwa/
├── index.html      Main HTML shell
├── app.js          React app (the calculator + diagrams)
├── manifest.json   PWA manifest (icons, name, theme)
├── sw.js           Service worker (offline caching)
├── icon-192.png    App icon (small)
└── icon-512.png    App icon (large, used for splash screens)
```

## How to deploy

You need to host these files on **HTTPS** for the install-to-home-screen feature
and offline support to work. Any of these will do (all free):

### Option 1: Netlify (drag-and-drop, easiest)

1. Go to https://app.netlify.com/drop
2. Drag the entire `bipod-pwa` folder onto the page
3. You get a URL like `https://random-name-12345.netlify.app`
4. Share that URL with anyone

### Option 2: Vercel

1. Install the CLI: `npm install -g vercel`
2. From inside the `bipod-pwa` folder, run `vercel`
3. Follow the prompts

### Option 3: GitHub Pages

1. Create a public GitHub repo
2. Upload these files to it
3. In repo Settings → Pages, enable Pages from the `main` branch
4. Your URL will be `https://<username>.github.io/<repo-name>/`

### Option 4: Cloudflare Pages, Surge, Render — all work the same way

## How users install it

Once it's hosted, anyone can use it from a browser, but they can also install
it as an app:

### iPhone / iPad (Safari)
1. Open the URL in Safari (must be Safari, not Chrome on iOS)
2. Tap the **Share** button
3. Scroll down and tap **Add to Home Screen**
4. Confirm — the icon appears on the home screen and opens full-screen

### Android (Chrome / Edge / Firefox)
1. Open the URL
2. The browser will prompt "Install app" automatically — tap it
   - Or open the menu (⋮) and tap **Install app** / **Add to Home screen**
3. The icon appears in the app drawer and works offline

### Desktop (Chrome, Edge, Brave)
1. Open the URL
2. An install icon appears in the address bar — click it
3. The app opens in its own window like a native app

## Testing locally

You can't just double-click `index.html` (service workers need a proper server).
Run a local server from inside the folder:

```bash
# Python 3
python3 -m http.server 8000

# Or Node
npx serve
```

Then open http://localhost:8000

## Notes

- All calculations run in the browser. No data leaves the device.
- Once visited, the app works offline — useful in the field where signal
  is unreliable.
- To update the app after edits, change the `CACHE_NAME` value in `sw.js`
  (e.g. `bipod-calc-v2`) so users get the new version on next visit.
