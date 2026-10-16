# Backdrop

Chrome extension: every new tab shows a background from your own collection, with a clock and a search box.

**Popup (click the toolbar icon)**
- **Search**: free photos from Openverse (Creative Commons, no account needed). HD-tagged photos are high resolution
  and listed first. Click **+ Add**. The photographer and licence are saved and shown on the new tab.
- **Upload**: drop images or pick them from your computer (big ones are shrunk to 3840 px wide to save space).
- **Collection**: remove images, pick one to show next, choose how often it changes (every new tab, hour or day),
  how dark it is, and whether to show the clock and search box.

Images stay on this computer (IndexedDB in the extension); search results are linked, not copied.

## Install
1. `chrome://extensions` → turn on **Developer mode**.
2. **Load unpacked** → choose this folder (`~/Documents/Startups/Extensions/Backdrop`).
3. Open a new tab. Chrome asks once whether to keep the extension's new-tab page: choose **Keep it**.
Don't move the folder after installing: Chrome runs the extension from it.
