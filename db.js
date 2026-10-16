// Shared by the popup and the new-tab page. Images live in IndexedDB (uploads as blobs,
// search results as URLs + credit); settings live in chrome.storage.local.
const DB = (() => {
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open("backdrop", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("images", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction("images", mode);
      const out = fn(t.objectStore("images"));
      t.oncomplete = () => res(out && "result" in out ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    all: () => tx("readonly", (s) => s.getAll()),
    add: (img) => tx("readwrite", (s) => s.put({ added: Date.now(), ...img })),
    remove: (id) => tx("readwrite", (s) => s.delete(id)),
  };
})();

const DEFAULTS = { every: "tab", dim: 35, clock: true, search: true, current: null, shownAt: 0 };
const getSettings = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) });
const setSettings = (s) => chrome.storage.local.set(s);

// Object URL for an upload, the remote URL for a search result.
function srcOf(img) {
  return img.blob ? URL.createObjectURL(img.blob) : img.url;
}
function thumbOf(img) {
  return img.blob ? URL.createObjectURL(img.thumbBlob || img.blob) : img.thumb || img.url;
}

// Downscale big uploads (max 3840 px wide) and make a small thumbnail, so storage stays reasonable.
async function processUpload(file) {
  const bmp = await createImageBitmap(file);
  const scaleTo = async (maxW, quality) => {
    const s = Math.min(1, maxW / bmp.width);
    const c = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.convertToBlob({ type: "image/jpeg", quality });
  };
  const blob = bmp.width > 3840 || file.size > 6e6 ? await scaleTo(3840, 0.9) : file;
  const thumbBlob = await scaleTo(400, 0.8);
  return { blob, thumbBlob, width: bmp.width, height: bmp.height };
}
