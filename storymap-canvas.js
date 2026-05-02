/**
 * storymap-canvas.js — Clean storymap constellation renderer.
 * Reads published-storymap.json → radial layout → pan/zoom canvas.
 * Children hidden by default; click a hub to fan them out.
 */
(function () {
  "use strict";

  const CENTRAL_ID = "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092";
  const HUB_IDS = ["n_011e6d0c", "n_5cd72ca5", "n_ea58683f"];
  const HUB_SET = new Set(HUB_IDS);
  const HUB_ANGLES = {
    n_011e6d0c: -Math.PI / 2,
    n_5cd72ca5: -Math.PI / 2 + (2 * Math.PI) / 3,
    n_ea58683f: -Math.PI / 2 + (4 * Math.PI) / 3,
  };
  const HUB_ORBIT = 600;
  const ARC_INNER = 550;
  const ARC_OUTER = 900;
  const ARC_SPAN = (200 * Math.PI) / 180;
  const PER_RING = 9;

  // ── DOM refs ──
  const viewport = document.getElementById("storymapViewport");
  const world = document.getElementById("storymapWorld");
  const nodesLayer = document.getElementById("storymapNodes");
  const edgesSvg = document.getElementById("storymapEdges");
  const infoPanel = document.getElementById("smInfoPanel");
  const infoTitle = document.getElementById("smInfoTitle");
  const infoBody = document.getElementById("smInfoBody");
  const infoImage = document.getElementById("smInfoImage");
  const infoMediaWrap = document.getElementById("smInfoMediaWrap");
  const infoCloseBtn = document.getElementById("smInfoClose");
  const zoomInBtn = document.getElementById("smZoomIn");
  const zoomOutBtn = document.getElementById("smZoomOut");

  if (!viewport || !world || !nodesLayer || !edgesSvg) return;

  // ── State ──
  let nodes = [];
  let edges = [];
  let childrenOf = {};
  let parentOf = {};
  let expandedHub = null;
  let selectedId = null;
  let view = { scale: 1, panX: 0, panY: 0 };
  let panDraft = null;

  // ── Layout ──
  function layout() {
    const ids = new Set(nodes.map((n) => n.id));
    childrenOf = {};
    parentOf = {};
    edges.forEach((e) => {
      if (e.source && e.target) {
        (childrenOf[e.source] || (childrenOf[e.source] = [])).push(e.target);
        parentOf[e.target] = e.source;
      }
    });

    const pos = {};
    pos[CENTRAL_ID] = { x: 0, y: 0 };

    HUB_IDS.forEach((hid) => {
      const a = HUB_ANGLES[hid];
      pos[hid] = { x: HUB_ORBIT * Math.cos(a), y: HUB_ORBIT * Math.sin(a) };
    });

    HUB_IDS.forEach((hid) => {
      const kids = (childrenOf[hid] || []).filter((c) => ids.has(c));
      if (!kids.length) return;
      const hub = pos[hid];
      const bearing = Math.atan2(hub.y, hub.x);
      const half = ARC_SPAN / 2;
      const useTwo = kids.length > PER_RING;
      const ring1 = useTwo ? kids.slice(0, PER_RING) : kids;
      const ring2 = useTwo ? kids.slice(PER_RING) : [];

      // Arc center is pushed outward from the hub so children appear beyond the label
      const arcCX = hub.x + 120 * Math.cos(bearing);
      const arcCY = hub.y + 120 * Math.sin(bearing);

      const placeArc = (list, r) => {
        const n = list.length;
        list.forEach((id, i) => {
          const t = n === 1 ? 0 : -half + ARC_SPAN * (i / (n - 1));
          pos[id] = { x: arcCX + r * Math.cos(bearing + t), y: arcCY + r * Math.sin(bearing + t) };
        });
      };
      placeArc(ring1, ARC_INNER);
      if (ring2.length) placeArc(ring2, ARC_OUTER);
    });

    // Shift to positive space
    const all = Object.values(pos);
    const minX = Math.min(...all.map((p) => p.x));
    const minY = Math.min(...all.map((p) => p.y));
    const pad = 400;
    nodes.forEach((n) => {
      const p = pos[n.id];
      if (p) {
        n.x = Math.round(p.x - minX + pad);
        n.y = Math.round(p.y - minY + pad);
      } else {
        n.x = pad;
        n.y = pad;
      }
    });
  }

  // ── Helpers ──
  function hubOf(nid) {
    if (HUB_SET.has(nid) || nid === CENTRAL_ID) return null;
    let cur = nid;
    const seen = new Set();
    while (cur) {
      if (seen.has(cur)) return null;
      seen.add(cur);
      if (HUB_SET.has(cur)) return cur;
      cur = parentOf[cur];
    }
    return null;
  }

  function isChild(n) {
    return n.id !== CENTRAL_ID && !HUB_SET.has(n.id) && !!hubOf(n.id);
  }

  function displayPos(n) {
    if (!isChild(n)) return { x: n.x, y: n.y };
    const h = hubOf(n.id);
    if (h === expandedHub) return { x: n.x, y: n.y };
    const hub = nodes.find((nd) => nd.id === h);
    return hub ? { x: hub.x, y: hub.y } : { x: n.x, y: n.y };
  }

  function isVisible(n) {
    return !isChild(n) || hubOf(n.id) === expandedHub;
  }

  // ── Render ──
  function render() {
    nodesLayer.innerHTML = "";
    let imgOrd = 0;

    nodes.forEach((n) => {
      const pos = displayPos(n);
      const visible = isVisible(n);
      const el = document.createElement("div");
      el.className = "smNode";
      el.dataset.id = n.id;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.position = "absolute";

      if (!visible) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.transform = "scale(0.3)";
      }

      if (n.id === CENTRAL_ID) {
        el.classList.add("smNode--image", "smNode--central");
      } else if (HUB_SET.has(n.id)) {
        el.classList.add("smNode--text", "smNode--hub");
        if (n.id === expandedHub) el.classList.add("smNode--hubActive");
      } else if (n.type === "image") {
        el.classList.add("smNode--image");
      } else {
        el.classList.add("smNode--text");
      }

      if (selectedId === n.id) el.classList.add("smNode--selected");

      // Content
      if (n.type === "image" || n.id === CENTRAL_ID) {
        imgOrd++;
        const src = n.imageSrc || n.content || "";
        if (src && src.startsWith("data:")) {
          const img = document.createElement("img");
          img.src = src;
          img.alt = n.label || "";
          img.style.width = "100%";
          img.style.maxWidth = "200px";
          img.style.display = "block";
          img.style.borderRadius = "3px";
          el.appendChild(img);
        }
        if (n.label) {
          const cap = document.createElement("div");
          cap.className = "smNodeImageCaption";
          const fig = document.createElement("span");
          fig.className = "smNodeImageCaption__fig";
          fig.textContent = `fig. ${String(imgOrd).padStart(2, "0")} / `;
          cap.appendChild(fig);
          const en = document.createElement("span");
          en.className = "smNodeImageCaption__en";
          en.textContent = n.label;
          cap.appendChild(en);
          el.appendChild(cap);
        }
      } else if (HUB_SET.has(n.id)) {
        const wrap = document.createElement("div");
        wrap.className = "smNodeHub";
        const row = document.createElement("div");
        row.className = "smNodeHubRow";
        const lat = document.createElement("span");
        lat.className = "smNodeHubLatin";
        lat.textContent = n.label || n.content || "";
        row.appendChild(lat);
        wrap.appendChild(row);
        el.appendChild(wrap);
      } else {
        el.textContent = n.label || n.content || n.id;
      }

      el.addEventListener("click", (evt) => {
        evt.stopPropagation();
        onNodeClick(n);
      });

      nodesLayer.appendChild(el);
    });

    drawEdges();
    sizeWorld();
  }

  function drawEdges() {
    edgesSvg.querySelectorAll("line").forEach((l) => l.remove());

    edges.forEach((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      if (!s || !t) return;

      if (isChild(t) && hubOf(t.id) !== expandedHub) return;

      const sp = displayPos(s);
      const tp = displayPos(t);
      const dx = tp.x - sp.x;
      const dy = tp.y - sp.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const inset = 60;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(sp.x + ux * inset));
      line.setAttribute("y1", String(sp.y + uy * inset));
      line.setAttribute("x2", String(tp.x - ux * inset));
      line.setAttribute("y2", String(tp.y - uy * inset));

      if (s.id === CENTRAL_ID) line.classList.add("storymapEdge--fromCenter");
      else if (HUB_SET.has(s.id)) line.classList.add("storymapEdge--hubSpoke");

      edgesSvg.appendChild(line);
    });
  }

  function sizeWorld() {
    let maxX = 0, maxY = 0;
    nodes.forEach((n) => {
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    const w = maxX + 800;
    const h = maxY + 800;
    world.style.minWidth = `${w}px`;
    world.style.minHeight = `${h}px`;
    nodesLayer.style.minWidth = `${w}px`;
    nodesLayer.style.minHeight = `${h}px`;
    edgesSvg.setAttribute("width", String(w));
    edgesSvg.setAttribute("height", String(h));
    edgesSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    edgesSvg.style.width = `${w}px`;
    edgesSvg.style.height = `${h}px`;
  }

  // ── Animation ──
  function animatePositions() {
    nodesLayer.querySelectorAll(".smNode").forEach((el) => {
      const n = nodes.find((nd) => nd.id === el.dataset.id);
      if (!n) return;
      const pos = displayPos(n);
      const vis = isVisible(n);

      el.style.transition =
        "left 0.5s cubic-bezier(0.4,0,0.2,1), top 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)";
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.opacity = vis ? "" : "0";
      el.style.pointerEvents = vis ? "" : "none";
      el.style.transform = vis ? "" : "scale(0.3)";

      el.classList.toggle("smNode--hubActive", HUB_SET.has(n.id) && n.id === expandedHub);
    });
    drawEdges();
  }

  // ── Camera ──
  function updateTransform() {
    world.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.scale})`;
  }

  function fitView() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    const margin = 250;
    const gw = Math.max(400, maxX - minX + margin * 2);
    const gh = Math.max(400, maxY - minY + margin * 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rect = viewport.getBoundingClientRect();
    const vw = Math.max(1, rect.width);
    const vh = Math.max(1, rect.height);
    view.scale = Math.min(1, Math.max(0.08, Math.min(vw / gw, vh / gh)));
    view.panX = vw / 2 - cx * view.scale;
    view.panY = vh / 2 - cy * view.scale;
    updateTransform();
  }

  function screenToWorld(clientX, clientY) {
    const r = viewport.getBoundingClientRect();
    return {
      x: (clientX - r.left - view.panX) / view.scale,
      y: (clientY - r.top - view.panY) / view.scale,
    };
  }

  // ── Interaction ──
  function onNodeClick(n) {
    if (HUB_SET.has(n.id)) {
      expandedHub = expandedHub === n.id ? null : n.id;
      animatePositions();
    }
    selectedId = n.id;
    showInfo(n);
  }

  function showInfo(n) {
    if (!infoPanel) return;

    const nav = document.querySelector(".siteNav");
    const footer = document.querySelector(".stickyFooterLinks");
    const topPx = nav ? Math.max(10, nav.getBoundingClientRect().bottom + 10) : 10;
    const bottomPx = footer ? Math.max(10, window.innerHeight - footer.getBoundingClientRect().top + 10) : 10;
    document.documentElement.style.setProperty("--sm-info-panel-top", `${Math.round(topPx)}px`);
    document.documentElement.style.setProperty("--sm-info-panel-bottom", `${Math.round(bottomPx)}px`);

    if (infoTitle) infoTitle.textContent = n.label || "";
    if (infoBody) infoBody.textContent = n.text || "";

    const src = n.type === "image" ? (n.imageSrc || n.content || "") : "";
    if (src && src.startsWith("data:") && infoImage && infoMediaWrap) {
      infoImage.src = src;
      infoMediaWrap.hidden = false;
      infoPanel.classList.add("smInfoPanel--withImage");
    } else {
      if (infoMediaWrap) infoMediaWrap.hidden = true;
      if (infoImage) infoImage.removeAttribute("src");
      infoPanel.classList.remove("smInfoPanel--withImage");
    }
    infoPanel.setAttribute("aria-hidden", "false");
  }

  function hideInfo() {
    if (!infoPanel) return;
    infoPanel.setAttribute("aria-hidden", "true");
    infoPanel.classList.remove("smInfoPanel--withImage");
    if (infoImage) infoImage.removeAttribute("src");
    if (infoTitle) infoTitle.textContent = "";
    if (infoBody) infoBody.textContent = "";
    if (infoMediaWrap) infoMediaWrap.hidden = true;
    selectedId = null;
  }

  // ── Events ──
  if (infoCloseBtn) infoCloseBtn.addEventListener("click", hideInfo);

  let didDrag = false;

  viewport.addEventListener("mousedown", (evt) => {
    if (evt.button !== 0) return;
    if (evt.target.closest(".smNode")) return;
    panDraft = { sx: evt.clientX, sy: evt.clientY, bx: view.panX, by: view.panY };
    didDrag = false;
  });

  window.addEventListener("mousemove", (evt) => {
    if (!panDraft) return;
    didDrag = true;
    view.panX = panDraft.bx + (evt.clientX - panDraft.sx);
    view.panY = panDraft.by + (evt.clientY - panDraft.sy);
    updateTransform();
  });

  window.addEventListener("mouseup", () => {
    panDraft = null;
  });

  viewport.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    const before = screenToWorld(evt.clientX, evt.clientY);
    const factor = evt.deltaY > 0 ? 0.9 : 1.1;
    view.scale = Math.max(0.05, Math.min(3, view.scale * factor));
    const r = viewport.getBoundingClientRect();
    view.panX = evt.clientX - r.left - before.x * view.scale;
    view.panY = evt.clientY - r.top - before.y * view.scale;
    updateTransform();
  }, { passive: false });

  viewport.addEventListener("click", (evt) => {
    if (didDrag) return;
    if (evt.target.closest(".smNode")) return;
    hideInfo();
  });

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      const r = viewport.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const wx = (cx - view.panX) / view.scale;
      const wy = (cy - view.panY) / view.scale;
      view.scale = Math.min(3, view.scale * 1.2);
      view.panX = cx - wx * view.scale;
      view.panY = cy - wy * view.scale;
      updateTransform();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      const r = viewport.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const wx = (cx - view.panX) / view.scale;
      const wy = (cy - view.panY) / view.scale;
      view.scale = Math.max(0.05, view.scale / 1.2);
      view.panX = cx - wx * view.scale;
      view.panY = cy - wy * view.scale;
      updateTransform();
    });
  }

  window.addEventListener("resize", () => fitView());

  // ── Boot ──
  fetch("./published-storymap.json?t=" + Date.now())
    .then((r) => r.json())
    .then((data) => {
      nodes = data.nodes || [];
      edges = data.edges || [];
      layout();
      render();
      requestAnimationFrame(() => requestAnimationFrame(fitView));
    })
    .catch((err) => console.error("Storymap load failed:", err));
})();
