/**
 * Archive viewer — timeline + collection grid (published-storymap.json).
 */
(function () {
  "use strict";

  const HUB_ORDER = [
    { id: "n_011e6d0c", slug: "mobility" },
    { id: "n_ea58683f", slug: "reassembling" },
    { id: "n_5cd72ca5", slug: "work" },
  ];

  /** Preferred timeline-row thumbnails (Mobility + ORR refreshed picks).
   *  Each value: { nodeId } pulls a node from the storymap; { src } uses a static asset.
   *  Optional `objectPosition` controls how the thumb is cropped (CSS object-position). */
  const TIMELINE_THUMB_BY_HUB = {
    n_011e6d0c: { nodeId: "n_fd593951", objectPosition: "center top" },
    n_ea58683f: { src: "./assets/landing-archive-two-women.png" },
  };

  const UI_STR = {
    en: {
      explore: "Explore",
      archive: "Archive",
      backTimeline: "Back to archive",
      close: "Close",
      prev: "Previous",
      next: "Next",
      photo: "Photo",
      loading: "Loading…",
      sortLabel: "Sort by",
      sortDateDesc: "Date (newest first)",
      sortDateAsc: "Date (oldest first)",
      enterRoom: "enter the room",
    },
    ar: {
      explore: "استكشف",
      archive: "أرشيف",
      backTimeline: "العودة إلى الأرشيف",
      close: "إغلاق",
      prev: "السابق",
      next: "التالي",
      photo: "صورة",
      loading: "جارٍ التحميل…",
      sortLabel: "ترتيب حسب",
      sortDateDesc: "التاريخ (الأحدث أولًا)",
      sortDateAsc: "التاريخ (الأقدم أولًا)",
      enterRoom: "ادخل الغرفة",
    },
    it: {
      explore: "Esplora",
      archive: "Archivio",
      backTimeline: "Torna all'archivio",
      close: "Chiudi",
      prev: "Precedente",
      next: "Successivo",
      photo: "Foto",
      loading: "Caricamento…",
      sortLabel: "Ordina per",
      sortDateDesc: "Data (dalla più recente)",
      sortDateAsc: "Data (dalla più antica)",
      enterRoom: "entra nella stanza",
    },
    fr: {
      explore: "Explorer",
      archive: "Archive",
      backTimeline: "Retour à l'archive",
      close: "Fermer",
      prev: "Précédent",
      next: "Suivant",
      photo: "Photo",
      loading: "Chargement…",
      sortLabel: "Trier par",
      sortDateDesc: "Date (du plus récent)",
      sortDateAsc: "Date (du plus ancien)",
      enterRoom: "entrer dans la salle",
    },
    es: {
      explore: "Explorar",
      archive: "Archivo",
      backTimeline: "Volver al archivo",
      close: "Cerrar",
      prev: "Anterior",
      next: "Siguiente",
      photo: "Foto",
      loading: "Cargando…",
      sortLabel: "Ordenar por",
      sortDateDesc: "Fecha (más reciente primero)",
      sortDateAsc: "Fecha (más antigua primero)",
      enterRoom: "entrar en la sala",
    },
    de: {
      explore: "Erkunden",
      archive: "Archiv",
      backTimeline: "Zurück zum Archiv",
      close: "Schließen",
      prev: "Zurück",
      next: "Weiter",
      photo: "Foto",
      loading: "Wird geladen…",
      sortLabel: "Sortieren nach",
      sortDateDesc: "Datum (neueste zuerst)",
      sortDateAsc: "Datum (älteste zuerst)",
      enterRoom: "den Raum betreten",
    },
  };

  const root = document.getElementById("archiveAppRoot");
  if (!root) return;

  const track = document.getElementById("archiveTrack");
  const rowsEl = document.getElementById("archiveTimelineRows");
  const browserView = document.getElementById("archiveBrowserView");
  const breadcrumbEl = document.getElementById("archiveBreadcrumb");
  const filterTabsEl = document.getElementById("archiveFilterTabs");
  const gridEl = document.getElementById("archiveGrid");
  const btnBack = document.getElementById("archiveBtnBack");
  const browserHeroTitle = document.getElementById("archiveBrowserHeroTitle");
  const showingEl = document.getElementById("archiveShowingRange");
  const sortSelect = document.getElementById("archiveSortSelect");
  const sortLabelEl = document.getElementById("archiveSortLabel");
  const modal = document.getElementById("archiveModal");
  const modalBackdrop = document.getElementById("archiveModalBackdrop");
  const modalClose = document.getElementById("archiveModalClose");
  const modalPrev = document.getElementById("archiveModalPrev");
  const modalNext = document.getElementById("archiveModalNext");
  const modalImg = document.getElementById("archiveModalImage");
  const modalTitle = document.getElementById("archiveModalTitle");
  const modalDate = document.getElementById("archiveModalDate");
  const modalBody = document.getElementById("archiveModalBody");
  const modalBadge = document.getElementById("archiveModalBadge");

  const hubIntroEl = document.getElementById("archiveHubIntro");
  const hubIntroTitleEnEl = document.getElementById("archiveHubIntroTitleEn");
  const hubIntroTitleArEl = document.getElementById("archiveHubIntroTitleAr");
  const hubIntroBodyEl = document.getElementById("archiveHubIntroBody");
  const hubIntroDismissBtn = document.getElementById("archiveHubIntroDismiss");
  let hubIntroPendingId = null;
  let hubIntroKeyHandler = null;
  /** Each hub intro shows at most once per page load; refresh clears it. */
  const seenHubIntros = new Set();

  let sortMode = "date-desc";

  function getLang() {
    if (typeof window.storymapGetLanguage === "function") return window.storymapGetLanguage() || "en";
    return "en";
  }

  function uik(key) {
    const lang = getLang();
    const pack = UI_STR[lang] || UI_STR.en;
    return pack[key] || UI_STR.en[key] || key;
  }

  function formatShowing(lo, hi, total) {
    const lang = getLang();
    if (lang === "ar") return `عرض ${lo}–${hi} من ${total}`;
    if (lang === "de") return `${lo}–${hi} von ${total}`;
    if (lang === "fr") return `Affichage ${lo}–${hi} sur ${total}`;
    if (lang === "es") return `Mostrando ${lo}–${hi} de ${total}`;
    if (lang === "it") return `Visualizzazione ${lo}–${hi} di ${total}`;
    return `Showing ${lo}–${hi} of ${total}`;
  }

  function labelKey(n) {
    const raw = String(n?.label || n?.content || "")
      .trim()
      .replace(/\s+/g, " ");
    if (raw === "On Reassembling Relations") return "On Re-Assembling Relations";
    return raw;
  }

  function getDisplayLabel(node) {
    if (!node) return "";
    const lang = getLang();
    const base = String(node.label || "").trim() || String(node.content || "").trim();
    if (lang === "en" || typeof STORYMAP_CANVAS_NODE_I18N === "undefined") return base;
    const pack = STORYMAP_CANVAS_NODE_I18N[lang]?.[labelKey(node)];
    return pack?.label || base;
  }

  function getDisplayText(node) {
    if (!node) return "";
    const lang = getLang();
    const base = String(node.text || "");
    if (lang === "en" || typeof STORYMAP_CANVAS_NODE_I18N === "undefined") return base;
    const pack = STORYMAP_CANVAS_NODE_I18N[lang]?.[labelKey(node)];
    if (pack && pack.text) return pack.text;
    return base;
  }

  function imageSrcOf(node) {
    return String(node?.imageSrc || node?.content || "").trim();
  }

  function excerptFromText(s, maxLen) {
    const t = String(s || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) return "";
    if (t.length <= maxLen) return t;
    const cut = t.slice(0, maxLen);
    const lastPeriod = cut.lastIndexOf(".");
    const lastQuestion = cut.lastIndexOf("؟");
    const last = Math.max(lastPeriod, lastQuestion);
    if (last > maxLen * 0.45) return cut.slice(0, last + 1);
    return `${cut.trim()}…`;
  }

  function splitParagraphs(s) {
    return String(s || "")
      .split(/\n\s*\n+/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  function firstParagraph(s) {
    return splitParagraphs(s)[0] || "";
  }

  /** First N sentences of the first paragraph — used as a row preview. */
  function firstSentences(s, n) {
    const limit = n || 2;
    const para = firstParagraph(s);
    if (!para) return "";
    const parts = para.split(/(?<=[.!?؟])\s+/);
    return parts.slice(0, limit).join(" ").trim();
  }

  function getEnLabel(node) {
    return String(node?.label || node?.content || "").trim();
  }

  function getArLabel(node) {
    if (!node) return "";
    if (typeof STORYMAP_CANVAS_NODE_I18N === "undefined") return "";
    const pack = STORYMAP_CANVAS_NODE_I18N.ar?.[labelKey(node)];
    return pack?.label || "";
  }

  function extractDateHint(text) {
    const s = String(text || "");
    const m = s.match(/\b((?:1[89]|20)\d{2})\b/);
    if (m) return m[1];
    const range = s.match(/\b(\d{4})\s*[–-]\s*(\d{4})\b/);
    if (range) return `${range[1]}–${range[2]}`;
    return "";
  }

  /** Bracketed date for card chrome, e.g. [1961] */
  function bracketDateForCard(node) {
    const raw = extractDateHint(getDisplayText(node));
    return raw ? `[${raw}]` : "";
  }

  function parseSortYear(node) {
    const t = getDisplayText(node);
    const m = t.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
    if (m) return parseInt(m[1], 10);
    const r = t.match(/(\d{4})\s*[–-]\s*(\d{4})/);
    if (r) return Math.round((parseInt(r[1], 10) + parseInt(r[2], 10)) / 2);
    return null;
  }

  function sortPhotos(photos) {
    const copy = [...photos];
    const desc = sortMode === "date-desc";
    copy.sort((a, b) => {
      const ya = parseSortYear(a);
      const yb = parseSortYear(b);
      if (ya == null && yb == null) return labelKey(a).localeCompare(labelKey(b));
      if (ya == null) return 1;
      if (yb == null) return -1;
      const cmp = ya - yb;
      return desc ? -cmp : cmp;
    });
    return copy;
  }

  function buildChildrenMap(edges) {
    const m = new Map();
    for (const e of edges || []) {
      if (!e.source || !e.target) continue;
      if (!m.has(e.source)) m.set(e.source, []);
      m.get(e.source).push(e.target);
    }
    return m;
  }

  function collectPhotosForHub(nodesById, childrenOf, hubId) {
    const ids = childrenOf.get(hubId) || [];
    const out = [];
    for (const id of ids) {
      const n = nodesById.get(id);
      if (!n || n.type !== "image") continue;
      // Image-type nodes with no src are treated as text-only documents.
      out.push(n);
    }
    out.sort((a, b) => labelKey(a).localeCompare(labelKey(b)));
    return out;
  }

  function pickThumbPhoto(photos, hubId) {
    const pref = TIMELINE_THUMB_BY_HUB[hubId];
    if (pref) {
      if (pref.src) {
        return {
          node: { id: `asset_${hubId}`, imageSrc: pref.src, type: "image" },
          objectPosition: pref.objectPosition || null,
        };
      }
      if (pref.nodeId) {
        const found = photos.find((p) => p.id === pref.nodeId);
        if (found) return { node: found, objectPosition: pref.objectPosition || null };
      }
    }
    const firstWithImage = photos.find((p) => imageSrcOf(p));
    return firstWithImage ? { node: firstWithImage, objectPosition: null } : null;
  }

  /** @type {Map<string, any>} */
  let nodesById = new Map();
  /** @type {Map<string, string[]>} */
  let childrenOf = new Map();
  let hubsData = [];
  let activeHubId = HUB_ORDER[0].id;
  let modalList = [];
  let modalIndex = -1;
  let prefersReducedMotion = false;

  function tryReducedMotion() {
    prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setTrackMode(mode) {
    if (!track) return;
    tryReducedMotion();
    if (mode === "browser") {
      track.classList.add("archiveTrack--browser");
      document.body.classList.add("archiveShell--browser");
      if (browserView) {
        browserView.hidden = false;
        browserView.setAttribute("aria-hidden", "false");
      }
    } else {
      track.classList.remove("archiveTrack--browser");
      document.body.classList.remove("archiveShell--browser");
      if (browserView) {
        browserView.hidden = true;
        browserView.setAttribute("aria-hidden", "true");
      }
    }
    if (prefersReducedMotion) {
      track.style.transition = "none";
      window.requestAnimationFrame(() => {
        track.style.transition = "";
      });
    }
  }

  function fillHubIntro(hubId) {
    const hub = hubsData.find((x) => x.id === hubId);
    if (!hub) return;
    const enLabel = getEnLabel(hub.node);
    const arLabel = getArLabel(hub.node);
    if (hubIntroTitleEnEl) hubIntroTitleEnEl.textContent = enLabel;
    if (hubIntroTitleArEl) hubIntroTitleArEl.textContent = arLabel;
    if (hubIntroBodyEl) {
      hubIntroBodyEl.innerHTML = "";
      const isAr = getLang() === "ar";
      hubIntroBodyEl.setAttribute("dir", isAr ? "rtl" : "ltr");
      const paras = splitParagraphs(getDisplayText(hub.node));
      paras.forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        hubIntroBodyEl.appendChild(p);
      });
    }
    if (hubIntroDismissBtn) hubIntroDismissBtn.textContent = uik("enterRoom");
  }

  function openHubIntro(hubId) {
    if (!hubIntroEl || !hubsData.find((x) => x.id === hubId)) {
      openBrowser(hubId);
      return;
    }
    if (seenHubIntros.has(hubId)) {
      openBrowser(hubId);
      return;
    }
    seenHubIntros.add(hubId);
    hubIntroPendingId = hubId;
    fillHubIntro(hubId);
    hubIntroEl.hidden = false;
    hubIntroEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("storymapWelcomeOpen");
    window.requestAnimationFrame(() => {
      try {
        hubIntroDismissBtn?.focus();
      } catch {
        /* ignore */
      }
    });
    if (!hubIntroKeyHandler) {
      hubIntroKeyHandler = (evt) => {
        if (evt.key === "Escape") {
          evt.preventDefault();
          closeHubIntro();
        }
      };
      document.addEventListener("keydown", hubIntroKeyHandler);
    }
  }

  function closeHubIntro({ proceed = false } = {}) {
    if (!hubIntroEl) return;
    const id = hubIntroPendingId;
    hubIntroPendingId = null;
    hubIntroEl.classList.add("storymapWelcome--exiting");
    tryReducedMotion();
    const finish = () => {
      hubIntroEl.hidden = true;
      hubIntroEl.setAttribute("aria-hidden", "true");
      hubIntroEl.classList.remove("storymapWelcome--exiting");
      document.body.classList.remove("storymapWelcomeOpen");
      if (hubIntroKeyHandler) {
        document.removeEventListener("keydown", hubIntroKeyHandler);
        hubIntroKeyHandler = null;
      }
      if (proceed && id) openBrowser(id);
    };
    window.setTimeout(finish, prefersReducedMotion ? 0 : 280);
  }

  function openBrowser(hubId) {
    activeHubId = hubId || HUB_ORDER[0].id;
    renderBrowser();
    setTrackMode("browser");
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
    window.requestAnimationFrame(() => {
      try {
        btnBack?.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    });
  }

  function backToTimeline() {
    closeModal();
    setTrackMode("timeline");
  }

  function renderTimelineRows() {
    if (!rowsEl) return;
    rowsEl.innerHTML = "";
    hubsData.forEach((hub, idx) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `archiveRow archiveRow--${idx % 2 === 0 ? "a" : "b"}`;
      row.setAttribute("data-hub-id", hub.id);
      row.setAttribute("aria-label", `${getDisplayLabel(hub.node)} — ${uik("explore")}`);

      const thumb = hub.thumb;
      const thumbNode = thumb?.node || null;
      const thumbWrap = document.createElement("div");
      thumbWrap.className = "archiveRow__thumb";
      if (thumbNode && imageSrcOf(thumbNode)) {
        const img = document.createElement("img");
        img.src = imageSrcOf(thumbNode);
        img.alt = "";
        img.decoding = "async";
        img.loading = "lazy";
        if (thumb.objectPosition) img.style.objectPosition = thumb.objectPosition;
        thumbWrap.appendChild(img);
      } else {
        thumbWrap.innerHTML = '<span class="archiveRow__thumbPh"></span>';
      }

      const main = document.createElement("div");
      main.className = "archiveRow__main";
      const dir = getLang() === "ar" ? "rtl" : "ltr";
      main.setAttribute("dir", dir);
      const h2 = document.createElement("h2");
      h2.className = "archiveRow__title";
      h2.textContent = getDisplayLabel(hub.node);
      const p = document.createElement("p");
      p.className = "archiveRow__body";
      p.textContent = firstSentences(getDisplayText(hub.node), 2);
      main.appendChild(h2);
      main.appendChild(p);

      const explore = document.createElement("div");
      explore.className = "archiveRow__explore";
      explore.setAttribute("aria-hidden", "true");
      explore.textContent = `${uik("explore")} →`;

      row.appendChild(thumbWrap);
      row.appendChild(main);
      row.appendChild(explore);

      row.addEventListener("click", () => openHubIntro(hub.id));
      rowsEl.appendChild(row);
    });
  }

  function renderFilterTabs() {
    if (!filterTabsEl) return;
    filterTabsEl.innerHTML = "";
    const lang = getLang();
    const isAr = lang === "ar";
    filterTabsEl.setAttribute("dir", isAr ? "rtl" : "ltr");

    hubsData.forEach((hub) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "archiveTab" + (hub.id === activeHubId ? " archiveTab--active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", hub.id === activeHubId ? "true" : "false");
      b.dataset.hubId = hub.id;
      b.textContent = getDisplayLabel(hub.node);
      b.addEventListener("click", () => {
        if (hub.id === activeHubId) return;
        closeModal();
        openHubIntro(hub.id);
      });
      filterTabsEl.appendChild(b);
    });
  }

  function photosForActiveHub() {
    const h = hubsData.find((x) => x.id === activeHubId);
    return h ? h.photos : [];
  }

  function updateBrowserHero() {
    const hub = hubsData.find((x) => x.id === activeHubId);
    if (browserHeroTitle && hub) {
      browserHeroTitle.textContent = getDisplayLabel(hub.node);
      browserHeroTitle.setAttribute("dir", getLang() === "ar" ? "rtl" : "ltr");
    }
  }

  function updateMetaBar(sortedLen, total) {
    if (showingEl) {
      if (!total) showingEl.textContent = formatShowing(0, 0, 0);
      else showingEl.textContent = formatShowing(1, sortedLen, total);
    }
  }

  function masonryColumnCount() {
    const w = (typeof window !== "undefined" && window.innerWidth) || 1280;
    if (w <= 720) return 2;
    if (w <= 900) return 3;
    if (w <= 1200) return 4;
    return 6;
  }

  function packMasonry() {
    if (!gridEl || !gridEl.classList.contains("archiveGrid--masonry")) return;
    const cards = Array.from(gridEl.querySelectorAll(":scope > .archiveCard, :scope > .archiveMasonryCol > .archiveCard"));
    if (!cards.length) return;
    const colCount = masonryColumnCount();

    // Wait for any images to finish decoding so heights are accurate.
    const imgs = cards.flatMap((c) => Array.from(c.querySelectorAll("img")));
    const ready = Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise((res) => {
          const done = () => res();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      })
    );

    ready.then(() => {
      // Fresh column elements; shortest-column-first packing.
      const cols = [];
      for (let i = 0; i < colCount; i++) {
        const el = document.createElement("div");
        el.className = "archiveMasonryCol";
        cols.push({ el, h: 0 });
      }
      // Use original DOM order so visual order matches sortMode.
      cards.forEach((card) => {
        // measure before reparenting (heights remain valid as long as parent width is similar)
        const h = card.getBoundingClientRect().height || 1;
        let idx = 0;
        for (let i = 1; i < cols.length; i++) {
          if (cols[i].h < cols[idx].h) idx = i;
        }
        cols[idx].el.appendChild(card);
        cols[idx].h += h;
      });
      gridEl.innerHTML = "";
      cols.forEach((c) => gridEl.appendChild(c.el));
    });
  }

  let masonryResizeBound = false;
  function bindMasonryResize() {
    if (masonryResizeBound || typeof window === "undefined") return;
    masonryResizeBound = true;
    let raf = 0;
    window.addEventListener("resize", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (gridEl && gridEl.classList.contains("archiveGrid--masonry")) renderGrid();
      });
    });
  }

  function renderGrid() {
    if (!gridEl) return;
    const raw = photosForActiveHub();
    const sorted = sortPhotos(raw);
    const total = raw.length;
    gridEl.innerHTML = "";
    const hub = hubsData.find((x) => x.id === activeHubId);

    // Mobility + ORR use a masonry-style column layout so tall cards (e.g.
    // "Shahenda's Letter to Reem") don't leave gaps; On Work keeps the regular grid.
    const masonry = !!(hub && (hub.slug === "reassembling" || hub.slug === "mobility"));
    gridEl.classList.toggle("archiveGrid--masonry", masonry);
    if (masonry) bindMasonryResize();

    updateMetaBar(sorted.length, total);
    updateBreadcrumb(hub);

    sorted.forEach((node, i) => {
      const card = document.createElement("button");
      card.type = "button";
      const src = imageSrcOf(node);
      const galleryImages = Array.isArray(node.images) ? node.images.filter((it) => it && it.src) : [];
      const isGallery = galleryImages.length > 1;
      card.className = "archiveCard" + (src ? "" : " archiveCard--noImage") + (isGallery ? " archiveCard--gallery" : "");
      const cap = getDisplayLabel(node);
      const dateLine = bracketDateForCard(node);
      const ariaSuffix = isGallery ? `. ${galleryImages.length} ${uik("photo")}` : "";
      card.setAttribute("aria-label", `${cap}. ${uik("photo")} ${i + 1} / ${sorted.length}${ariaSuffix}`);

      const media = document.createElement("div");
      media.className = "archiveCard__media";
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        media.appendChild(img);
      } else {
        const ph = document.createElement("span");
        ph.className = "archiveCard__docLabel";
        ph.textContent = cap;
        media.appendChild(ph);
      }
      if (isGallery) {
        const stack = document.createElement("span");
        stack.className = "archiveCard__stack";
        stack.setAttribute("aria-hidden", "true");
        const stackCount = document.createElement("span");
        stackCount.className = "archiveCard__stackCount";
        stackCount.textContent = `+${galleryImages.length - 1}`;
        stack.appendChild(stackCount);
        media.appendChild(stack);
      }

      card.appendChild(media);
      if (src) {
        const meta = document.createElement("div");
        meta.className = "archiveCard__meta";
        if (dateLine) {
          const d = document.createElement("div");
          d.className = "archiveCard__date";
          d.textContent = dateLine;
          meta.appendChild(d);
        }
        const fn = document.createElement("div");
        fn.className = "archiveCard__caption";
        fn.textContent = cap;
        meta.appendChild(fn);
        card.appendChild(meta);
      }
      card.addEventListener("click", () => openModal(sorted, i));
      gridEl.appendChild(card);
    });

    if (!sorted.length) {
      const empty = document.createElement("p");
      empty.className = "archiveGrid__empty";
      empty.textContent = "—";
      gridEl.appendChild(empty);
    }

    if (masonry) packMasonry();
  }

  function updateBreadcrumb(hubNode) {
    if (!breadcrumbEl) return;
    breadcrumbEl.innerHTML = "";
    const isAr = getLang() === "ar";
    breadcrumbEl.setAttribute("dir", isAr ? "rtl" : "ltr");

    const a1 = document.createElement("button");
    a1.type = "button";
    a1.className = "archiveCrumb archiveCrumb--btn";
    a1.textContent = uik("archive");
    a1.addEventListener("click", backToTimeline);

    const sep1 = document.createElement("span");
    sep1.className = "archiveCrumb__sep";
    sep1.setAttribute("aria-hidden", "true");
    sep1.textContent = isAr ? " ‹ " : " › ";

    const span = document.createElement("span");
    span.className = "archiveCrumb archiveCrumb--current";
    span.textContent = hubNode && hubNode.node ? getDisplayLabel(hubNode.node) : "";

    breadcrumbEl.appendChild(a1);
    breadcrumbEl.appendChild(sep1);
    breadcrumbEl.appendChild(span);
  }

  function renderBrowser() {
    renderFilterTabs();
    updateBrowserHero();
    renderGrid();
    if (sortSelect) {
      sortSelect.value = sortMode;
    }
    syncSortControls();
  }

  function syncSortControls() {
    if (sortLabelEl) sortLabelEl.textContent = uik("sortLabel");
    if (sortSelect) {
      const opts = sortSelect.querySelectorAll("option");
      if (opts[0]) opts[0].textContent = uik("sortDateDesc");
      if (opts[1]) opts[1].textContent = uik("sortDateAsc");
    }
  }

  function openModal(photos, index) {
    if (!photos || !photos.length || !modal) return;
    modalList = photos;
    modalIndex = Math.max(0, Math.min(index, photos.length - 1));
    fillModal();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("archiveModalOpen");
    window.requestAnimationFrame(() => {
      modal.classList.add("archiveModal--visible");
    });
    try {
      modalClose?.focus();
    } catch {
      /* ignore */
    }
    updateModalBreadcrumbExtra();
  }

  function updateModalBreadcrumbExtra() {
    if (!breadcrumbEl) return;
    const hub = hubsData.find((x) => x.id === activeHubId);
    const node = modalList[modalIndex];
    updateBreadcrumb(hub);
    if (!node) return;
    const isAr = getLang() === "ar";
    const sep2 = document.createElement("span");
    sep2.className = "archiveCrumb__sep";
    sep2.setAttribute("aria-hidden", "true");
    sep2.textContent = isAr ? " ‹ " : " › ";
    const titleSp = document.createElement("span");
    titleSp.className = "archiveCrumb archiveCrumb--current";
    titleSp.textContent = getDisplayLabel(node);
    breadcrumbEl.appendChild(sep2);
    breadcrumbEl.appendChild(titleSp);
  }

  function fillModal() {
    const node = modalList[modalIndex];
    if (!node) return;
    const hub = hubsData.find((x) => x.id === activeHubId);
    const src = imageSrcOf(node);
    const figure = modalImg ? modalImg.closest(".archiveModal__figure") : null;
    const inner = modalImg ? modalImg.closest(".archiveModal__inner") : null;
    const galleryImages = Array.isArray(node.images) ? node.images.filter((it) => it && it.src) : [];
    const isGallery = galleryImages.length > 1;
    if (modalImg) {
      if (src && !isGallery) {
        modalImg.src = src;
        modalImg.alt = getDisplayLabel(node);
        modalImg.style.display = "";
      } else {
        modalImg.removeAttribute("src");
        modalImg.alt = "";
        modalImg.style.display = "none";
      }
    }
    if (figure) {
      let galleryEl = figure.querySelector(".archiveModal__gallery");
      if (isGallery) {
        if (!galleryEl) {
          galleryEl = document.createElement("div");
          galleryEl.className = "archiveModal__gallery";
          figure.appendChild(galleryEl);
        }
        galleryEl.innerHTML = "";
        galleryEl.scrollTop = 0;
        const isAr = getLang() === "ar";
        galleryImages.forEach((item, idx) => {
          const fig = document.createElement("figure");
          fig.className = "archiveModal__galleryItem";
          const im = document.createElement("img");
          im.src = item.src;
          im.alt = item.caption || "";
          im.loading = idx === 0 ? "eager" : "lazy";
          im.decoding = "async";
          fig.appendChild(im);
          if (item.caption) {
            const cap = document.createElement("figcaption");
            cap.className = "archiveModal__galleryCaption";
            cap.textContent = `${idx + 1}. ${item.caption}`;
            cap.setAttribute("dir", isAr ? "rtl" : "ltr");
            fig.appendChild(cap);
          }
          galleryEl.appendChild(fig);
        });
        galleryEl.style.display = "";
      } else if (galleryEl) {
        galleryEl.innerHTML = "";
        galleryEl.style.display = "none";
      }
      figure.style.display = src || isGallery ? "" : "none";
      figure.classList.toggle("archiveModal__figure--gallery", isGallery);
    }
    if (inner) {
      inner.classList.toggle("archiveModal__inner--noImage", !src && !isGallery);
      inner.classList.toggle("archiveModal__inner--gallery", isGallery);
    }
    if (modalTitle) modalTitle.textContent = getDisplayLabel(node);
    const bodyText = getDisplayText(node);
    const dateStr = extractDateHint(bodyText);
    if (modalDate) {
      modalDate.hidden = !dateStr;
      modalDate.textContent = dateStr;
    }
    if (modalBody) {
      modalBody.textContent = bodyText;
      modalBody.setAttribute("dir", getLang() === "ar" ? "rtl" : "ltr");
      modalBody.classList.toggle("archiveModal__body--userAdded", !!node.userAdded);
    }
    const modalCopy = document.getElementById("archiveModalCopy");
    if (modalCopy) modalCopy.setAttribute("dir", getLang() === "ar" ? "rtl" : "ltr");
    if (modalBadge && hub) {
      modalBadge.hidden = false;
      modalBadge.textContent = getDisplayLabel(hub.node);
      modalBadge.className = `archiveBadge archiveBadge--${hub.slug}`;
    }
    const hasPrev = modalIndex > 0;
    const hasNext = modalIndex < modalList.length - 1;
    if (modalPrev) modalPrev.disabled = !hasPrev;
    if (modalNext) modalNext.disabled = !hasNext;
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("archiveModal--visible");
    document.body.classList.remove("archiveModalOpen");
    const done = () => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modalList = [];
      modalIndex = -1;
      const hub = hubsData.find((x) => x.id === activeHubId);
      updateBreadcrumb(hub);
    };
    tryReducedMotion();
    if (prefersReducedMotion) done();
    else window.setTimeout(done, 240);
  }

  function stepModal(delta) {
    if (modalIndex < 0) return;
    const next = modalIndex + delta;
    if (next < 0 || next >= modalList.length) return;
    modalIndex = next;
    fillModal();
    updateModalBreadcrumbExtra();
  }

  function syncChromeStrings() {
    if (btnBack) btnBack.textContent = uik("backTimeline");
    if (modalClose) modalClose.setAttribute("aria-label", uik("close"));
    if (modalPrev) modalPrev.setAttribute("aria-label", uik("prev"));
    if (modalNext) modalNext.setAttribute("aria-label", uik("next"));
    syncSortControls();
  }

  function fullRefresh() {
    if (!hubsData.length) return;
    syncChromeStrings();
    renderTimelineRows();
    if (track && track.classList.contains("archiveTrack--browser")) renderBrowser();
    if (modal && !modal.hidden && modalIndex >= 0) {
      fillModal();
      updateModalBreadcrumbExtra();
    }
    if (hubIntroEl && !hubIntroEl.hidden && hubIntroPendingId) {
      fillHubIntro(hubIntroPendingId);
    }
  }

  window.storymapRefreshCanvasI18n = fullRefresh;

  function wireEvents() {
    btnBack?.addEventListener("click", backToTimeline);
    sortSelect?.addEventListener("change", () => {
      sortMode = sortSelect.value || "date-desc";
      closeModal();
      renderGrid();
    });
    modalBackdrop?.addEventListener("click", closeModal);
    modalClose?.addEventListener("click", closeModal);
    modalPrev?.addEventListener("click", () => stepModal(-1));
    modalNext?.addEventListener("click", () => stepModal(1));
    hubIntroDismissBtn?.addEventListener("click", () => closeHubIntro({ proceed: true }));

    document.addEventListener("keydown", (e) => {
      if (modal && !modal.hidden) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeModal();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          stepModal(getLang() === "ar" ? 1 : -1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          stepModal(getLang() === "ar" ? -1 : 1);
        }
      }
    });
  }

  function boot(data) {
    nodesById = new Map((data.nodes || []).map((n) => [n.id, n]));
    childrenOf = buildChildrenMap(data.edges || []);

    hubsData = HUB_ORDER.map((spec) => {
      const node = nodesById.get(spec.id);
      const photos = collectPhotosForHub(nodesById, childrenOf, spec.id);
      return {
        id: spec.id,
        slug: spec.slug,
        node: node || { id: spec.id, label: spec.slug, text: "" },
        photos,
        thumb: pickThumbPhoto(photos, spec.id),
      };
    });

    syncChromeStrings();
    renderTimelineRows();
    wireEvents();
    setTrackMode("timeline");

    if (typeof setStatus === "function") setStatus("");
  }

  fetch("./published-storymap.json")
    .then((r) => r.json())
    .then(boot)
    .catch((err) => {
      console.error("[archive] load failed:", err);
      if (typeof setStatus === "function") setStatus(String(err && err.message ? err.message : "Load failed"), { isError: true });
    });
})();
