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
  const MIN_CHILD_GAP = 20;
  const MOBILITY_HUB = "n_011e6d0c";
  const WORK_HUB = "n_5cd72ca5";
  const REASSEMBLING_HUB = "n_ea58683f";

  // ── DOM refs ──
  const viewport = document.getElementById("storymapViewport");
  const world = document.getElementById("storymapWorld");
  const nodesLayer = document.getElementById("storymapNodes");
  const edgesSvg = document.getElementById("storymapEdges");
  const infoPanel = document.getElementById("smInfoPanel");
  const infoTitle = document.getElementById("smInfoTitle");
  const infoBody = document.getElementById("smInfoBody");
  const infoImage = document.getElementById("infoImage");
  const infoMediaWrap = document.getElementById("infoMediaWrap");
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
  let worldW = 0;
  let worldH = 0;
  /** Pending info panel close animation listener (display:none after transitionend). */
  let infoPanelHideTransitionEnd = null;

  /** Estimated layout box per node (matches CSS-driven rendering; used for spacing and edge anchors). */
  function nodeDimensions(n) {
    if (!n) return { w: 120, h: 80 };
    if (n.id === CENTRAL_ID) return { w: 200, h: 320 };
    if (HUB_SET.has(n.id)) return { w: 420, h: 54 };
    if (n.imageSrc) return { w: 180, h: 260 };
    return { w: 180, h: 48 };
  }

  function layoutBoundsNodes() {
    let minx = Infinity;
    let miny = Infinity;
    let maxx = -Infinity;
    let maxy = -Infinity;
    nodes.forEach((n) => {
      const d = nodeDimensions(n);
      minx = Math.min(minx, n.x);
      miny = Math.min(miny, n.y);
      maxx = Math.max(maxx, n.x + d.w);
      maxy = Math.max(maxy, n.y + d.h);
    });
    return { minx, miny, maxx, maxy };
  }

  /** Places the central node's bbox center at (worldW/2, worldH/2) and sets worldW/worldH. */
  function recenterCentralInWorld() {
    const central = nodes.find((n) => n.id === CENTRAL_ID);
    if (!central) return;
    const dc = nodeDimensions(central);
    const b = layoutBoundsNodes();
    const ccx = central.x + dc.w / 2;
    const ccy = central.y + dc.h / 2;
    const halfW = Math.max(ccx - b.minx, b.maxx - ccx);
    const halfH = Math.max(ccy - b.miny, b.maxy - ccy);
    const EDGE = 800;
    const canvasW = 2 * halfW + EDGE;
    const canvasH = 2 * halfH + EDGE;
    const targetLeft = canvasW / 2 - dc.w / 2;
    const targetTop = canvasH / 2 - dc.h / 2;
    const dx = targetLeft - central.x;
    const dy = targetTop - central.y;
    nodes.forEach((n) => {
      n.x = Math.round(n.x + dx);
      n.y = Math.round(n.y + dy);
    });
    const b2 = layoutBoundsNodes();
    worldW = Math.max(canvasW, b2.maxx + EDGE / 2);
    worldH = Math.max(canvasH, b2.maxy + EDGE / 2);
    console.log("[storymap layout] central AFTER (bbox center at world/2):", {
      worldSize: { w: worldW, h: worldH },
      centralTopLeft: { x: central.x, y: central.y },
      centralCenter: { x: central.x + dc.w / 2, y: central.y + dc.h / 2 },
    });
  }

  // ── Layout ──
  function layout() {
    worldW = 0;
    worldH = 0;
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
    
    // #region agent log
    fetch('http://127.0.0.1:7478/ingest/7a20c658-54ad-4565-b4df-99efe61d8de8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ede851'},body:JSON.stringify({sessionId:'ede851',location:'storymap-canvas.js:68',message:'Hub positions calculated',data:{hubs:HUB_IDS.map(h=>({id:h,x:pos[h].x,y:pos[h].y})),centralPos:pos[CENTRAL_ID]},timestamp:Date.now(),hypothesisId:'H1a'})}).catch(()=>{});
    // #endregion

    HUB_IDS.forEach((hid) => {
      const kids = (childrenOf[hid] || []).filter((c) => ids.has(c));
      if (!kids.length) return;
      const hub = pos[hid];
      const bearing = Math.atan2(hub.y, hub.x);
      const half = ARC_SPAN / 2;
      const useTwo = kids.length > PER_RING;
      const ring1 = useTwo ? kids.slice(0, PER_RING) : kids;
      const ring2 = useTwo ? kids.slice(PER_RING) : [];

      const arcCX = hub.x + 120 * Math.cos(bearing);
      const arcCY = hub.y + 120 * Math.sin(bearing);

      function placeRingGap(list, rStart) {
        const listN = list.length;
        if (!listN) return;
        const dims = list.map((id) => nodeDimensions(nodes.find((nd) => nd.id === id)));
        let Rcur = rStart;
        function computeDeltas(rad) {
          const d = [];
          if (listN <= 1) return { deltas: d, sum: 0 };
          for (let i = 0; i < listN - 1; i++) {
            const chordNeed = dims[i].w / 2 + dims[i + 1].w / 2 + MIN_CHILD_GAP;
            const x = Math.min(1, chordNeed / (2 * rad));
            d.push(2 * Math.asin(x));
          }
          const sum = d.reduce((a, b) => a + b, 0);
          return { deltas: d, sum };
        }
        let ag = computeDeltas(Rcur);
        while (ag.sum > ARC_SPAN && Rcur < 4000) {
          Rcur *= 1.06;
          ag = computeDeltas(Rcur);
        }
        const deltas = ag.deltas;
        if (listN === 1) {
          const id = list[0];
          const cx = arcCX + Rcur * Math.cos(bearing);
          const cy = arcCY + Rcur * Math.sin(bearing);
          pos[id] = { x: cx - dims[0].w / 2, y: cy - dims[0].h / 2 };
          return;
        }
        const sumD = deltas.reduce((a, b) => a + b, 0);
        let ang = bearing - sumD / 2;
        list.forEach((id, i) => {
          const cx = arcCX + Rcur * Math.cos(ang);
          const cy = arcCY + Rcur * Math.sin(ang);
          pos[id] = { x: cx - dims[i].w / 2, y: cy - dims[i].h / 2 };
          if (i < listN - 1) ang += deltas[i];
        });
      }

      if (hid === MOBILITY_HUB || hid === REASSEMBLING_HUB) {
        const beforePts = [];
        ring1.forEach((id, i) => {
          const rn = ring1.length;
          const t = rn === 1 ? 0 : -half + ARC_SPAN * (i / (rn - 1));
          beforePts.push({
            id,
            arcPoint: {
              x: arcCX + ARC_INNER * Math.cos(bearing + t),
              y: arcCY + ARC_INNER * Math.sin(bearing + t),
            },
          });
        });
        ring2.forEach((id, i) => {
          const rn = ring2.length;
          const t = rn === 1 ? 0 : -half + ARC_SPAN * (i / (rn - 1));
          beforePts.push({
            id,
            arcPoint: {
              x: arcCX + ARC_OUTER * Math.cos(bearing + t),
              y: arcCY + ARC_OUTER * Math.sin(bearing + t),
            },
          });
        });
        console.log("[storymap layout] hub " + hid + " children BEFORE (arc reference points):", beforePts);

        placeRingGap(ring1, ARC_INNER);
        if (ring2.length) placeRingGap(ring2, ARC_OUTER);

        const afterLog = kids.map((id) => {
          const node = nodes.find((x) => x.id === id);
          const d = nodeDimensions(node);
          return {
            id,
            topLeft: { x: pos[id].x, y: pos[id].y },
            center: { x: pos[id].x + d.w / 2, y: pos[id].y + d.h / 2 },
            size: d,
          };
        });
        console.log("[storymap layout] hub " + hid + " children AFTER (bbox-aware fan):", afterLog);
        // #region agent log
        const childPositions = kids.map(k => ({id: k, x: pos[k].x, y: pos[k].y})); const distances = []; for(let i=0; i<childPositions.length-1; i++){for(let j=i+1; j<childPositions.length; j++){const dx=childPositions[i].x-childPositions[j].x; const dy=childPositions[i].y-childPositions[j].y; distances.push({pair:[childPositions[i].id,childPositions[j].id],dist:Math.hypot(dx,dy)});}} fetch('http://127.0.0.1:7478/ingest/7a20c658-54ad-4565-b4df-99efe61d8de8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ede851'},body:JSON.stringify({sessionId:'ede851',location:'storymap-canvas.js:92',message:'Child node spacing',data:{hubId:hid,kidsCount:kids.length,useTwo:useTwo,ring1Count:ring1.length,ring2Count:ring2.length,ARC_SPAN:ARC_SPAN,minDist:distances.length?Math.min(...distances.map(d=>d.dist)):null,allDistances:distances},timestamp:Date.now(),hypothesisId:'H2a,H2b,H2c'})}).catch(()=>{});
        // #endregion
      } else {
        const placeArc = (list, r) => {
          const n = list.length;
          list.forEach((id, i) => {
            const t = n === 1 ? 0 : -half + ARC_SPAN * (i / (n - 1));
            pos[id] = { x: arcCX + r * Math.cos(bearing + t), y: arcCY + r * Math.sin(bearing + t) };
          });
        };
        placeArc(ring1, ARC_INNER);
        if (ring2.length) placeArc(ring2, ARC_OUTER);

        if (hid === WORK_HUB) {
          const workBefore = kids.map((id) => {
            const inR1 = ring1.includes(id);
            const list = inR1 ? ring1 : ring2;
            const idx = list.indexOf(id);
            const rn = list.length;
            const r = inR1 ? ARC_INNER : ARC_OUTER;
            const t = rn === 1 ? 0 : -half + ARC_SPAN * (idx / (rn - 1));
            return {
              id,
              arcPoint: { x: arcCX + r * Math.cos(bearing + t), y: arcCY + r * Math.sin(bearing + t) },
            };
          });
          console.log("[storymap layout] On Work children BEFORE (arc reference points):", workBefore);
          const workAfter = kids.map((id) => {
            const node = nodes.find((x) => x.id === id);
            const d = nodeDimensions(node);
            return {
              id,
              topLeft: { x: pos[id].x, y: pos[id].y },
              center: { x: pos[id].x + d.w / 2, y: pos[id].y + d.h / 2 },
            };
          });
          console.log("[storymap layout] On Work children AFTER (top-left placement):", workAfter);
        }

        // #region agent log
        const childPositions = kids.map(k => ({id: k, x: pos[k].x, y: pos[k].y})); const distances = []; for(let i=0; i<childPositions.length-1; i++){for(let j=i+1; j<childPositions.length; j++){const dx=childPositions[i].x-childPositions[j].x; const dy=childPositions[i].y-childPositions[j].y; distances.push({pair:[childPositions[i].id,childPositions[j].id],dist:Math.hypot(dx,dy)});}} fetch('http://127.0.0.1:7478/ingest/7a20c658-54ad-4565-b4df-99efe61d8de8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ede851'},body:JSON.stringify({sessionId:'ede851',location:'storymap-canvas.js:92',message:'Child node spacing',data:{hubId:hid,kidsCount:kids.length,useTwo:useTwo,ring1Count:ring1.length,ring2Count:ring2.length,ARC_SPAN:ARC_SPAN,minDist:distances.length?Math.min(...distances.map(d=>d.dist)):null,allDistances:distances},timestamp:Date.now(),hypothesisId:'H2a,H2b,H2c'})}).catch(()=>{});
        // #endregion
      }
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

    const centralBefore = nodes.find((n) => n.id === CENTRAL_ID);
    if (centralBefore) {
      const db = nodeDimensions(centralBefore);
      console.log("[storymap layout] central BEFORE recenter", {
        topLeft: { x: centralBefore.x, y: centralBefore.y },
        center: { x: centralBefore.x + db.w / 2, y: centralBefore.y + db.h / 2 },
      });
    }

    recenterCentralInWorld();

    // #region agent log
    const centralNode = nodes.find(n => n.id === CENTRAL_ID); const hubNodes = nodes.filter(n => HUB_IDS.includes(n.id)); const hubCenterX = hubNodes.reduce((s,h)=>s+h.x,0)/hubNodes.length; const hubCenterY = hubNodes.reduce((s,h)=>s+h.y,0)/hubNodes.length; fetch('http://127.0.0.1:7478/ingest/7a20c658-54ad-4565-b4df-99efe61d8de8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ede851'},body:JSON.stringify({sessionId:'ede851',location:'storymap-canvas.js:109',message:'Final node positions after shift',data:{centralFinalPos:{x:centralNode.x,y:centralNode.y},hubCenterPos:{x:hubCenterX,y:hubCenterY},offsetFromHubCenter:{x:centralNode.x-hubCenterX,y:centralNode.y-hubCenterY},hubFinalPos:hubNodes.map(h=>({id:h.id,x:h.x,y:h.y}))},timestamp:Date.now(),hypothesisId:'H1b'})}).catch(()=>{});
    // #endregion
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

  /** World-space center of node div (left/top + half size). */
  function edgeAnchor(n) {
    const d = nodeDimensions(n);
    const p = displayPos(n);
    return { x: p.x + d.w / 2, y: p.y + d.h / 2 };
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
      } else if (n.imageSrc) {
        el.classList.add("smNode--image");
      } else {
        el.classList.add("smNode--text");
      }

      if (selectedId === n.id) el.classList.add("smNode--selected");

      // Content
      if (n.imageSrc || n.id === CENTRAL_ID) {
        imgOrd++;
        const src = n.imageSrc || n.content || "";
        if (src) {
          const img = document.createElement("img");
          img.src = src;
          img.alt = n.label || "";
          img.style.width = "100%";
          img.style.maxWidth = "none";
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
    
    // #region agent log
    const edgeSamples = [];
    // #endregion

    edges.forEach((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      if (!s || !t) return;

      if (isChild(t) && hubOf(t.id) !== expandedHub) return;

      const sp = displayPos(s);
      const tp = displayPos(t);
      const legDx = tp.x - sp.x;
      const legDy = tp.y - sp.y;
      const legDist = Math.hypot(legDx, legDy) || 1;
      const ux = legDx / legDist;
      const uy = legDy / legDist;
      const inset = 60;

      const sa = edgeAnchor(s);
      const ta = edgeAnchor(t);

      if (HUB_SET.has(s.id) && isChild(t)) {
        const beforePayload = {
          hubId: s.id,
          targetId: t.id,
          x1: sp.x + ux * inset,
          y1: sp.y + uy * inset,
          x2: tp.x - ux * inset,
          y2: tp.y - uy * inset,
        };
        const afterPayload = {
          hubId: s.id,
          targetId: t.id,
          sourceCenter: sa,
          targetCenter: ta,
          x1: sa.x,
          y1: sa.y,
          x2: ta.x,
          y2: ta.y,
        };
        if (s.id === WORK_HUB) {
          console.log("[storymap edges] On Work edge BEFORE (top-left + inset 60)", beforePayload);
          console.log("[storymap edges] On Work edge AFTER (node center anchors)", afterPayload);
        }
        if (s.id === MOBILITY_HUB || s.id === REASSEMBLING_HUB) {
          console.log("[storymap edges] hub " + s.id + " child edge BEFORE (top-left + inset 60)", beforePayload);
          console.log("[storymap edges] hub " + s.id + " child edge AFTER (node center anchors)", afterPayload);
        }
      }

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(sa.x));
      line.setAttribute("y1", String(sa.y));
      line.setAttribute("x2", String(ta.x));
      line.setAttribute("y2", String(ta.y));

      if (s.id === CENTRAL_ID) line.classList.add("storymapEdge--fromCenter");
      else if (HUB_SET.has(s.id)) line.classList.add("storymapEdge--hubSpoke");

      edgesSvg.appendChild(line);
      
      // #region agent log
      if (HUB_SET.has(s.id) && isChild(t)) {
        edgeSamples.push({
          source: s.id,
          target: t.id,
          sourceCenter: sa,
          targetCenter: ta,
          lineX1: sa.x,
          lineY1: sa.y,
          lineX2: ta.x,
          lineY2: ta.y,
        });
      }
      // #endregion
    });
    
    // #region agent log
    if(edgeSamples.length>0){fetch('http://127.0.0.1:7478/ingest/7a20c658-54ad-4565-b4df-99efe61d8de8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ede851'},body:JSON.stringify({sessionId:'ede851',location:'storymap-canvas.js:259',message:'Edge drawing samples for hub-to-child connections',data:{samples:edgeSamples.slice(0,5),expandedHub:expandedHub},timestamp:Date.now(),hypothesisId:'H4a,H4b,H4c'})}).catch(()=>{});}
    // #endregion
  }

  function sizeWorld() {
    let w;
    let h;
    if (worldW > 0 && worldH > 0) {
      w = worldW;
      h = worldH;
    } else {
      const b = layoutBoundsNodes();
      w = b.maxx + 800;
      h = b.maxy + 800;
    }
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

  function finishHideInfoPanel() {
    if (!infoPanel) return;
    if (infoPanelHideTransitionEnd) {
      infoPanel.removeEventListener("transitionend", infoPanelHideTransitionEnd);
      infoPanelHideTransitionEnd = null;
    }
    infoPanel.classList.remove("smInfoPanel--closing", "smInfoPanel--open");
    infoPanel.style.display = "none";
    infoPanel.setAttribute("aria-hidden", "true");
    infoPanel.classList.remove("smInfoPanel--withImage");
    if (infoImage) infoImage.removeAttribute("src");
    if (infoTitle) infoTitle.textContent = "";
    if (infoBody) infoBody.textContent = "";
    if (infoMediaWrap) infoMediaWrap.hidden = true;
    selectedId = null;
  }

  function revealInfoPanel() {
    if (!infoPanel) return;
    if (infoPanelHideTransitionEnd) {
      infoPanel.removeEventListener("transitionend", infoPanelHideTransitionEnd);
      infoPanelHideTransitionEnd = null;
    }
    const wasOpen = infoPanel.classList.contains("smInfoPanel--open");
    infoPanel.style.display = "flex";
    infoPanel.setAttribute("aria-hidden", "false");
    infoPanel.classList.remove("smInfoPanel--closing");
    if (!wasOpen) {
      infoPanel.classList.remove("smInfoPanel--open");
      void infoPanel.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          infoPanel.classList.add("smInfoPanel--open");
        });
      });
    }
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

    const src = n.imageSrc || "";

    if (src && infoImage && infoMediaWrap) {
      infoImage.src = src;
      infoMediaWrap.hidden = false;
      infoPanel.classList.add("smInfoPanel--withImage");
    } else {
      if (infoMediaWrap) infoMediaWrap.hidden = true;
      if (infoImage) infoImage.removeAttribute("src");
      infoPanel.classList.remove("smInfoPanel--withImage");
    }
    revealInfoPanel();
  }

  function hideInfo() {
    if (!infoPanel) return;
    if (infoPanel.classList.contains("smInfoPanel--closing")) return;
    if (!infoPanel.classList.contains("smInfoPanel--open")) {
      finishHideInfoPanel();
      return;
    }
    if (infoPanelHideTransitionEnd) {
      infoPanel.removeEventListener("transitionend", infoPanelHideTransitionEnd);
      infoPanelHideTransitionEnd = null;
    }
    infoPanel.classList.remove("smInfoPanel--open");
    infoPanel.classList.add("smInfoPanel--closing");
    infoPanelHideTransitionEnd = (e) => {
      if (e.target !== infoPanel) return;
      if (e.propertyName !== "opacity") return;
      infoPanel.removeEventListener("transitionend", infoPanelHideTransitionEnd);
      infoPanelHideTransitionEnd = null;
      finishHideInfoPanel();
    };
    infoPanel.addEventListener("transitionend", infoPanelHideTransitionEnd);
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
