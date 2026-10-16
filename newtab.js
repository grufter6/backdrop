const $ = (s) => document.querySelector(s);
const PERIOD = { tab: 0, hour: 3600e3, day: 86400e3 };

function tick() {
  const d = new Date();
  $("#time").textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
  $("#date").textContent = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function show(img) {
  const bg = $("#bg");
  const src = srcOf(img);
  const pre = new Image();
  pre.onload = () => { bg.style.backgroundImage = `url("${src}")`; bg.classList.add("ready"); };
  pre.onerror = () => { bg.classList.add("ready"); $("#credit").textContent = "This background couldn't load. Click Next."; };
  pre.src = src;
  const c = $("#credit");
  c.textContent = "";
  if (img.link) {
    const a = document.createElement("a");
    a.href = img.link; a.target = "_blank";
    a.textContent = `${img.title || "Photo"} by ${img.creator || "unknown"} · ${img.license || ""}`;
    c.appendChild(a);
  } else {
    c.textContent = img.title || "";
  }
}

// Pick the background: keep the current one inside its time window, otherwise move to a different random one.
async function choose(all, s, forceNext) {
  const cur = all.find((i) => i.id === s.current);
  const due = forceNext || !cur || (!s.pinned && Date.now() - s.shownAt >= PERIOD[s.every]);
  if (!due) return cur;
  const pool = all.length > 1 ? all.filter((i) => i.id !== s.current) : all;
  const next = pool[Math.floor(Math.random() * pool.length)];
  await setSettings({ current: next.id, shownAt: Date.now(), pinned: false });
  return next;
}

async function main() {
  const s = await getSettings();
  $("#dim").style.opacity = s.dim / 100;
  $("#clock").hidden = !s.clock;
  $("#search").hidden = !s.search;
  tick(); setInterval(tick, 1000);
  const all = await DB.all();
  if (!all.length) { $("#hint").hidden = false; $("#bg").classList.add("ready"); return; }
  if (s.pinned) await setSettings({ pinned: false });           // "Show next" from the popup applies once
  show(await choose(all, s, false));
  const next = $("#next");
  next.hidden = all.length < 2;
  next.addEventListener("click", async () => show(await choose(await DB.all(), await getSettings(), true)));
}
main();
