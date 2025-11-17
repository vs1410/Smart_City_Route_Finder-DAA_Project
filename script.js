// Smart City — Low Traffic Route Finder (optimized & clean)

let nodes = {
  A: { x: 100, y: 150 },
  B: { x: 250, y: 80 },
  C: { x: 250, y: 220 },
  D: { x: 400, y: 250 },
  E: { x: 550, y: 150 },
};
let edges = {
  A: { B: 3, C: 1 },
  B: { A: 3, C: 2, E: 3 },
  C: { A: 1, B: 2, D: 2, E: 3 },
  D: { C: 2, E: 1 },
  E: { B: 3, C: 3, D: 1 },
};

let directed = false, animate = true, clickState = 0;

// --- Quick selectors ---
const $ = id => document.getElementById(id);
const ctx = $("mapCanvas").getContext("2d");
const startSel = $("start"), endSel = $("end"), output = $("output"), logBox = $("log");
const histDiv = $("history"), trendDiv = $("trendSummary");

// --- Min-Heap for Dijkstra ---
class MinHeap {
  constructor() { this.h = []; }
  push(o) { this.h.push(o); this.up(this.h.length - 1); }
  pop() {
    if (!this.h.length) return null;
    const t = this.h[0], e = this.h.pop();
    if (this.h.length) { this.h[0] = e; this.down(0); }
    return t;
  }
  up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p].priority <= this.h[i].priority) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
      i = p;
    }
  }
  down(i) {
    while (true) {
      let l = 2 * i + 1, r = 2 * i + 2, s = i;
      if (l < this.h.length && this.h[l].priority < this.h[s].priority) s = l;
      if (r < this.h.length && this.h[r].priority < this.h[s].priority) s = r;
      if (s === i) break;
      [this.h[s], this.h[i]] = [this.h[i], this.h[s]];
      i = s;
    }
  }
}

// --- Dijkstra’s Algorithm ---
function dijkstra(start, end) {
  const dist = {}, prev = {}, pq = new MinHeap(), seen = new Set();
  Object.keys(nodes).forEach(k => dist[k] = Infinity);
  dist[start] = 0; pq.push({ node: start, priority: 0 });

  while (pq.h.length) {
    const { node } = pq.pop();
    if (seen.has(node)) continue;
    seen.add(node);
    if (node === end) break;

    for (const [v, w] of Object.entries(edges[node] || {})) {
      const alt = dist[node] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = node;
        pq.push({ node: v, priority: alt });
      }
    }
  }

  if (dist[end] === Infinity) return { path: [], total: Infinity };

  const path = [];
  for (let cur = end; cur; cur = prev[cur]) path.unshift(cur);
  return { path, total: dist[end] };
}

// --- UI Updates ---
function populateSelects() {
  const list = Object.keys(nodes).sort();
  startSel.innerHTML = endSel.innerHTML = "";
  list.forEach(n => {
    startSel.add(new Option(n, n));
    endSel.add(new Option(n, n));
  });
}

function log(msg) {
  const p = document.createElement("div");
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logBox.prepend(p);
}

// --- Drawing ---
function drawGraph(path = []) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // edges
  for (const u in edges) for (const v in edges[u]) {
    if (!directed && u > v) continue;
    const a = nodes[u], b = nodes[v];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "#888"; ctx.lineWidth = 2; ctx.stroke();
    if (directed) drawArrow(a, b);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.fillStyle = "#000"; ctx.font = "12px Poppins"; ctx.fillText(edges[u][v], mx, my - 8);
  }

  // path
  if (path.length > 1) {
    ctx.strokeStyle = "#0056b3"; ctx.lineWidth = 4;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = nodes[path[i]], p2 = nodes[path[i + 1]];
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }

  // nodes
  for (const k in nodes) {
    const { x, y } = nodes[k];
    ctx.beginPath(); ctx.arc(x, y, 18, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#000"; ctx.font = "bold 14px Poppins"; ctx.fillText(k, x - 6, y + 6);
  }
}

function drawArrow(a, b) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), len = 8;
  const dx = b.x - Math.cos(ang) * 18, dy = b.y - Math.sin(ang) * 18;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(dx - len * Math.cos(ang - Math.PI / 6), dy - len * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(dx - len * Math.cos(ang + Math.PI / 6), dy - len * Math.sin(ang + Math.PI / 6));
  ctx.closePath(); ctx.fill();
}

// --- Animation ---
function animatePath(path) {
  if (!animate || path.length < 2) return;
  const pts = path.map(k => nodes[k]);
  let seg = 0, t = 0;
  const step = () => {
    drawGraph(path);
    const [p1, p2] = [pts[seg], pts[seg + 1]];
    const x = p1.x + (p2.x - p1.x) * t;
    const y = p1.y + (p2.y - p1.y) * t;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#ff4d4f"; ctx.fill();
    if ((t += 0.01) >= 1) { t = 0; seg++; }
    if (seg < pts.length - 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// --- History & Trends ---
function getHistory() {
  return JSON.parse(localStorage.getItem("routeHistory") || "[]");
}
function saveHistory(r) {
  const data = getHistory();
  data.push(r);
  localStorage.setItem("routeHistory", JSON.stringify(data));
  showHistory(data); showTrends(data);
}
function showHistory(data) {
  if (!data.length) return histDiv.innerHTML = "<em>No route history.</em>";
  histDiv.innerHTML = `<table><tr><th>Start</th><th>End</th><th>Traffic</th><th>Time</th></tr>
  ${data.slice(-10).reverse().map(r =>
    `<tr><td>${r.start}</td><td>${r.end}</td><td>${r.total}</td><td>${new Date(r.time).toLocaleString()}</td></tr>`
  ).join("")}</table>`;
}
function showTrends(data) {
  if (!data.length) return trendDiv.innerHTML = "<em>No trends yet.</em>";
  const map = {};
  data.forEach(r => (map[`${r.start}→${r.end}`] ??= []).push(r.total));
  trendDiv.innerHTML = `<table><tr><th>Route</th><th>Avg</th><th>Samples</th></tr>
  ${Object.entries(map).map(([k, arr]) => {
    const avg = (arr.reduce((a, b) => a + b) / arr.length).toFixed(2);
    return `<tr><td>${k}</td><td>${avg}</td><td>${arr.length}</td></tr>`;
  }).join("")}</table>`;
}

// --- Events ---
$("findRoute").onclick = () => {
  const s = startSel.value, e = endSel.value;
  if (!s || !e || s === e) return alert("Select valid start & end.");
  const res = dijkstra(s, e);
  if (res.total === Infinity) return output.textContent = "No path found.", drawGraph();
  output.textContent = `Route: ${res.path.join(" → ")} | Total: ${res.total}`;
  log(`Found ${res.path.join("->")} (${res.total})`);
  saveHistory({ start: s, end: e, total: res.total, time: Date.now() });
  drawGraph(res.path); animatePath(res.path);
};

$("animateBtn").onclick = () => {
  animate = !animate;
  $("animateBtn").textContent = animate ? "Toggle Animate" : "Animate Off";
  log("Animation " + (animate ? "on" : "off"));
};
$("directedToggle").onchange = e => {
  directed = e.target.checked;
  log("Directed: " + directed);
  drawGraph();
};
$("clearHistory").onclick = () => {
  localStorage.removeItem("routeHistory");
  histDiv.innerHTML = trendDiv.innerHTML = "<em>Cleared.</em>";
};
$("refreshTrends").onclick = () => showTrends(getHistory());

// --- Canvas click: choose start/end ---
$("mapCanvas").onclick = e => {
  const r = e.target.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let nearest = null, min = Infinity;
  for (const k in nodes) {
    const d = Math.hypot(nodes[k].x - x, nodes[k].y - y);
    if (d < min) { min = d; nearest = k; }
  }
  if (min > 30) return;
  if (!clickState) {
    startSel.value = nearest; clickState = 1; log("Start: " + nearest);
  } else {
    endSel.value = nearest; clickState = 0; log("End: " + nearest);
  }
  drawGraph();
};

// --- Graph Editing ---
$("addNodeBtn").onclick = () => {
  const n = $("newNodeName").value.trim();
  const x = +$("newNodeX").value, y = +$("newNodeY").value;
  if (!n || isNaN(x) || isNaN(y)) return alert("Enter valid node and coordinates.");
  if (nodes[n]) return alert("Node already exists.");
  nodes[n] = { x, y }; edges[n] = {}; log("Added node " + n);
  populateSelects(); drawGraph();
};
$("addEdgeBtn").onclick = () => {
  const a = $("edgeFrom").value.trim(), b = $("edgeTo").value.trim(), w = +$("edgeWeight").value;
  if (!a || !b || isNaN(w)) return alert("Enter valid edge.");
  edges[a] ??= {}; edges[a][b] = w;
  if (!directed) (edges[b] ??= {})[a] = w;
  log(`Edge ${a}→${b} (${w})`); drawGraph();
};
$("removeEdgeBtn").onclick = () => {
  const a = $("edgeFrom").value.trim(), b = $("edgeTo").value.trim();
  if (!a || !b) return alert("Enter from/to nodes.");
  delete edges[a]?.[b]; if (!directed) delete edges[b]?.[a];
  log(`Removed edge ${a}-${b}`); drawGraph();
};
$("removeNodeBtn").onclick = () => {
  const n = $("newNodeName").value.trim();
  if (!nodes[n]) return alert("Node not found.");
  delete nodes[n]; delete edges[n];
  for (const u in edges) delete edges[u][n];
  log("Removed node " + n); populateSelects(); drawGraph();
};
$("resetBtn").onclick = () => {
  nodes = {
    A: { x: 100, y: 150 },
    B: { x: 250, y: 80 },
    C: { x: 250, y: 220 },
    D: { x: 400, y: 250 },
    E: { x: 550, y: 150 },
  };
  edges = {
    A: { B: 3, C: 1 },
    B: { A: 3, C: 2, E: 3 },
    C: { A: 1, B: 2, D: 2, E: 3 },
    D: { C: 2, E: 1 },
    E: { B: 3, C: 3, D: 1 },
  };
  log("Graph reset."); populateSelects(); drawGraph();
};

// --- Init ---
populateSelects(); drawGraph(); showHistory(getHistory()); showTrends(getHistory());
log("Ready — Smart City Route Finder loaded.");
window.dijkstra = dijkstra;



