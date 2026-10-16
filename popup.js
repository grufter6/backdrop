const $ = (s) => document.querySelector(s);
const API = "https://api.openverse.org/v1/images/";
let page = 1, lastQuery = "", added = new Set();

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 1800);
}

// ---- tabs ----
function showTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("on", p.id === name));
  if (name === "collection") renderCollection();
}
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

// ---- search (Openverse: Creative Commons photos, no key needed) ----
async function search(q, more = false) {
  page = more ? page + 1 : 1;
  lastQuery = q;
  const params = (size) => {
    const p = new URLSearchParams({ q, page, page_size: 20, mature: "false", category: "photograph" });
    if ($("#wide").checked) p.set("aspect_ratio", "wide");
    if (size) p.set("size", size);
    return p;
  };
  const box = $("#results");
  if (!more) box.innerHTML = '<p class="note">Searching…</p>';
  try {
    // High-resolution matches are rare, so ask for them separately and list them first.
    const get = async (size) => {
      const r = await fetch(API + "?" + params(size));
      if (!r.ok) throw new Error(r.status === 429 ? "Too many searches, wait a minute" : "Search failed (" + r.status + ")");
      return r.json();
    };
    const [hd, any] = await Promise.all([get("large").catch(() => ({ results: [], page_count: 0 })), get("")]);
    const seen = new Set([...box.querySelectorAll(".item")].map((e) => e.dataset.id));
    const list = [...hd.results, ...any.results].filter((x) => {
      if (seen.has(x.id) || (x.width && x.width < 1000)) return false;    // too small for a full-screen background
      seen.add(x.id); return true;
    });
    if (!more) box.innerHTML = "";
    if (!list.length && !more) box.innerHTML = '<p class="note">No photos found. Try other words.</p>';
    for (const x of list) box.appendChild(resultCard(x));
    $("#more").hidden = page >= Math.max(hd.page_count || 0, any.page_count || 1);
  } catch (e) {
    box.innerHTML = `<p class="note">${e.message}</p>`;
  }
}

function clean(s) {
  if (!s) return s;
  try { return decodeURIComponent(s); } catch { try { return unescape(s); } catch { return s; } }
}

function licenseName(x) {
  const l = (x.license || "").toLowerCase();
  if (l === "cc0") return "CC0 (public domain)";
  if (l === "pdm") return "Public domain";
  return `CC ${l.toUpperCase()} ${x.license_version || ""}`.trim();
}

function resultCard(x) {
  x.title = clean(x.title); x.creator = clean(x.creator);
  const el = document.createElement("div");
  el.className = "item";
  el.dataset.id = x.id;
  const img = document.createElement("img");
  img.src = x.thumbnail; img.alt = x.title || ""; img.loading = "lazy";
  const meta = document.createElement("div");
  meta.className = "meta"; meta.textContent = `${x.title || "Untitled"} · ${x.creator || "unknown"}`;
  const b = document.createElement("button");
  const id = "ov:" + x.id;
  b.textContent = added.has(id) ? "✓ Added" : "+ Add";
  if (added.has(id)) b.classList.add("added");
  b.addEventListener("click", async () => {
    if (added.has(id)) return;
    await DB.add({ id, url: x.url, thumb: x.thumbnail, title: x.title, creator: x.creator,
                   license: licenseName(x),
                   link: x.foreign_landing_url, width: x.width, height: x.height });
    added.add(id); b.textContent = "✓ Added"; b.classList.add("added");
    updateCount(); toast("Added to your backgrounds");
  });
  el.append(img, meta, b);
  if (x.width >= 2400) { const hd = document.createElement("span"); hd.className = "hd"; hd.textContent = "HD"; el.append(hd); }
  return el;
}

$("#q-form").addEventListener("submit", (e) => { e.preventDefault(); const q = $("#q").value.trim(); if (q) search(q); });
$("#more").addEventListener("click", () => search(lastQuery, true));
$("#wide").addEventListener("change", () => lastQuery && search(lastQuery));

// ---- upload ----
async function upload(files) {
  const imgs = [...files].filter((f) => f.type.startsWith("image/"));
  if (!imgs.length) return;
  const st = $("#upload-status");
  let n = 0;
  for (const f of imgs) {
    st.textContent = `Adding ${n + 1} of ${imgs.length}…`;
    try {
      const p = await processUpload(f);
      await DB.add({ id: "up:" + crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ""), creator: "You", ...p });
      n++;
    } catch (e) {
      console.warn("Backdrop: could not read", f.name, e);
    }
  }
  st.textContent = `Added ${n} image${n === 1 ? "" : "s"}${n < imgs.length ? ` (${imgs.length - n} couldn't be read)` : ""}.`;
  updateCount();
}
$("#files").addEventListener("change", (e) => { upload(e.target.files); e.target.value = ""; });
const drop = $("#drop");
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); upload(e.dataTransfer.files); });

// ---- collection + settings ----
async function updateCount() {
  const all = await DB.all();
  added = new Set(all.map((i) => i.id));
  $("#count").textContent = all.length;
  return all;
}

async function renderCollection() {
  const all = (await updateCount()).sort((a, b) => b.added - a.added);
  const s = await getSettings();
  const box = $("#mine");
  box.innerHTML = "";
  $("#empty").hidden = all.length > 0;
  for (const img of all) {
    const el = document.createElement("div");
    el.className = "item";
    const im = document.createElement("img"); im.src = thumbOf(img); im.alt = img.title || "";
    const meta = document.createElement("div"); meta.className = "meta";
    meta.textContent = (s.current === img.id ? "● Showing · " : "") + (img.title || "Untitled");
    const del = document.createElement("button"); del.textContent = "✕"; del.title = "Remove";
    del.addEventListener("click", async () => { await DB.remove(img.id); renderCollection(); });
    const show = document.createElement("button"); show.className = "show"; show.textContent = "Show next";
    show.title = "Use this on your next new tab";
    show.addEventListener("click", async () => { await setSettings({ current: img.id, shownAt: Date.now(), pinned: true }); toast("Shows on your next new tab"); renderCollection(); });
    el.append(im, meta, del, show);
    box.appendChild(el);
  }
}

async function loadSettings() {
  const s = await getSettings();
  $("#every").value = s.every; $("#dim").value = s.dim; $("#dim-out").textContent = s.dim + "%";
  $("#clock").checked = s.clock; $("#searchbox").checked = s.search;
}
$("#every").addEventListener("change", (e) => setSettings({ every: e.target.value }));
$("#dim").addEventListener("input", (e) => { $("#dim-out").textContent = e.target.value + "%"; setSettings({ dim: +e.target.value }); });
$("#clock").addEventListener("change", (e) => setSettings({ clock: e.target.checked }));
$("#searchbox").addEventListener("change", (e) => setSettings({ search: e.target.checked }));

updateCount(); loadSettings(); $("#q").focus();
