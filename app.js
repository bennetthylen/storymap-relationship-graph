/* global cytoscape */

const STORAGE_KEY = "storymapGraphV1";
const LANG_STORAGE_KEY = "storymapLangV1";

const SUPPORTED_LANGS = ["en", "ar", "it", "fr", "es", "de"];

/** Short label shown on the language button (layout stays LTR). */
const LANG_BUTTON_CODES = { en: "EN", ar: "AR", it: "IT", fr: "FR", es: "ES", de: "DE" };

const BODY_MODE = document.body?.dataset?.mode;
const MODE = BODY_MODE === "admin" || BODY_MODE === "history" ? BODY_MODE : "viewer";
const IS_STORYMAP_PAGE = /(^|\/)storymap\.html$/i.test(window.location.pathname || "");
const ADMIN_UNLOCK_KEY = "storymapAdminUnlockedV1";
const ADMIN_PASSWORD = "beebo";
const CONTENT_STORAGE_KEY = "storymapExhibitionContentV1";
const DISCUSSION_STORAGE_KEY = "storymap-discussions";
const STORYMAP_CANVAS_PUBLIC_KEY = "storymapCanvasPublicV1";
const STORYMAP_CANVAS_ADMIN_KEY = "storymapCanvasAdminV1";
const STORYMAP_CANVAS_RELEASE_KEY = "storymapCanvasPublishedReleaseV1";
const STORYMAP_PROGRESS_KEY = "storymapProgressV1";
/** Admin-only “Preview as user” progress so testing unlock state does not overwrite the real viewer key. */
const STORYMAP_PROGRESS_PREVIEW_KEY = "storymapProgressPreviewV1";
/** Persists across browser restarts so you reuse one PAT; clear with "Forget PAT". */
const GITHUB_TOKEN_STORAGE_KEY = "storymapGithubPublishTokenV1";

/**
 * All localStorage keys used by this app (same origin = shared across pages; never synced across browsers).
 * Use `storymapDumpLocalStorage()` in the console to inspect sizes and parse JSON values.
 */
const STORYMAP_STORAGE_KEYS = {
  graph: STORAGE_KEY,
  lang: LANG_STORAGE_KEY,
  content: CONTENT_STORAGE_KEY,
  discussion: DISCUSSION_STORAGE_KEY,
  canvasPublic: STORYMAP_CANVAS_PUBLIC_KEY,
  canvasAdmin: STORYMAP_CANVAS_ADMIN_KEY,
  canvasRelease: STORYMAP_CANVAS_RELEASE_KEY,
  progress: STORYMAP_PROGRESS_KEY,
  progressPreview: STORYMAP_PROGRESS_PREVIEW_KEY,
  githubToken: GITHUB_TOKEN_STORAGE_KEY,
};

function storymapClearableStorageKeys() {
  return [
    STORYMAP_PROGRESS_KEY,
    STORYMAP_PROGRESS_PREVIEW_KEY,
    STORYMAP_CANVAS_PUBLIC_KEY,
    STORYMAP_CANVAS_ADMIN_KEY,
    STORYMAP_CANVAS_RELEASE_KEY,
    CONTENT_STORAGE_KEY,
    DISCUSSION_STORAGE_KEY,
    LANG_STORAGE_KEY,
    STORAGE_KEY,
  ];
}

/** Console helper: table of storymap-related localStorage entries (JSON pretty-printed when small). */
function storymapDumpLocalStorage() {
  if (typeof localStorage === "undefined") return;
  const rows = [];
  const all = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) all.push(k);
    }
  } catch {
    return;
  }
  const storyKeys = all.filter((k) => /^storymap/i.test(k) || k === STORAGE_KEY);
  storyKeys.sort();
  storyKeys.forEach((key) => {
    let raw = "";
    try {
      raw = localStorage.getItem(key) || "";
    } catch {
      raw = "(unreadable)";
    }
    let preview = raw;
    if (raw.length > 200) preview = `${raw.slice(0, 200)}… (${raw.length} chars)`;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        preview = JSON.stringify(parsed, null, 0).length > 220 ? `${JSON.stringify(parsed).slice(0, 220)}…` : JSON.stringify(parsed);
      }
    } catch {
      /* keep raw preview */
    }
    rows.push({ key, length: raw.length, preview });
  });
  if (typeof console !== "undefined" && console.table) console.table(rows);
  else if (typeof console !== "undefined" && console.log) console.log(rows);
  return rows;
}

function applyStorymapUrlStorageHints() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  let q;
  try {
    q = new URLSearchParams(window.location.search);
  } catch {
    return;
  }
  if (q.has("clearStorymapProgress")) {
    try {
      localStorage.removeItem(STORYMAP_PROGRESS_KEY);
      localStorage.removeItem(STORYMAP_PROGRESS_PREVIEW_KEY);
      if (typeof console !== "undefined" && console.info) {
        console.info("[storymap] Removed viewer + preview progress keys (?clearStorymapProgress=1)");
      }
    } catch {
      /* ignore */
    }
  }
  if (q.has("clearStorymapStorage")) {
    storymapClearableStorageKeys().forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
    if (q.has("clearStorymapGithubToken")) {
      try {
        localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    if (typeof console !== "undefined" && console.info) {
      console.info(
        "[storymap] Cleared storymap storage keys (?clearStorymapStorage=1). Add &clearStorymapGithubToken=1 to also remove the GitHub PAT."
      );
    }
  }
  if (q.has("debugStorymapStorage")) storymapDumpLocalStorage();
}

/**
 * Hard refresh (Ctrl/Cmd+Shift+R, Ctrl+F5) cannot be detected after the fact in JS.
 * We arm sessionStorage on those shortcuts; the next load clears viewer progress so the storymap
 * UI resets. A normal refresh (F5 / Cmd+R) does not arm, so progress persists.
 * (Reload from the browser menu without the shortcut is still a "normal" refresh for this purpose.)
 */
const STORYMAP_HARD_RELOAD_NEXT_KEY = "storymapHardReloadNext";

function applyStorymapHardRefreshReset() {
  if (typeof sessionStorage === "undefined" || typeof localStorage === "undefined") return;
  try {
    if (sessionStorage.getItem(STORYMAP_HARD_RELOAD_NEXT_KEY) !== "1") return;
    sessionStorage.removeItem(STORYMAP_HARD_RELOAD_NEXT_KEY);
    localStorage.removeItem(STORYMAP_PROGRESS_KEY);
    localStorage.removeItem(STORYMAP_PROGRESS_PREVIEW_KEY);
    if (typeof console !== "undefined" && console.info) {
      console.info("[storymap] Viewer progress cleared after hard-refresh shortcut (see STORYMAP_HARD_RELOAD_NEXT_KEY).");
    }
  } catch {
    /* ignore */
  }
}

function installStorymapHardRefreshArming() {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;
  window.addEventListener(
    "keydown",
    (e) => {
      const key = e.key || "";
      const hardReloadCombo =
        (e.ctrlKey || e.metaKey) && e.shiftKey && (key === "r" || key === "R");
      const ctrlF5 = e.ctrlKey && !e.metaKey && !e.shiftKey && (key === "F5" || key === "f5");
      if (!hardReloadCombo && !ctrlF5) return;
      try {
        sessionStorage.setItem(STORYMAP_HARD_RELOAD_NEXT_KEY, "1");
      } catch {
        /* ignore */
      }
    },
    true
  );
}

if (typeof window !== "undefined") {
  window.STORYMAP_STORAGE_KEYS = STORYMAP_STORAGE_KEYS;
  window.storymapDumpLocalStorage = storymapDumpLocalStorage;
  window.findCentralRootNodes = findCentralRootNodes;
  window.findStorymapHubEntryNodes = findStorymapHubEntryNodes;
}

const GITHUB_PUBLISHED_CANVAS_PATH = "published-storymap.json";
const GITHUB_REPO_OWNER = "bennetthylen";
const GITHUB_REPO_NAME = "storymap-relationship-graph";
const GITHUB_REPO_BRANCH = "main";

const DEFAULT_CONTENT = {
  heroTitle: "doing well, don't worry",
  heroSubtitle:
    "A digital collaboration between The Women and Memory Forum (Egypt) and Georgetown University (USA) students in the SFS Centennial Lab Class, Arab Studies 4478: Heritage and Development in the Arab World.",
  heroCta: "experience the storymap",
  landingBody:
      "Women are always on the move. Women engage in different types of work and mobility that inform their journeys through life. They work at home, in the fields, in the workshops, in big cities, small towns, or in other countries. Their work and their movement traverse different spaces, reassembling their relationships as they become part of many other people's lives. This exhibition introduces glimpses into the lives of 21 women \u2013 women, who have worked and moved as doctors, maids, actresses, students, accountants, filmmakers, embroiderers, teachers, artists, and as mothers, daughters, mentors and friends. They live in Egypt, Jordan, Lebanon and Denmark, yet their lives invite us to travel across many more spaces, peoples, and times, and inspire us to rethink familiar meanings and assumptions about women, mobility and work. This exhibition is based on interviews with these diverse women. We are a group of researchers, archivists, museum professionals and young people in these professions, who all share an interest in telling and sharing the stories of these women, whose inspiring tales should be kept and remembered for generations to come. We invite you on a journey through their lives to see how they have moved and for what different reasons. We shed light on the effect that these movements and their work have on their relationships with the people around them and delve into their different types of work to see how they contribute to not only their own lives but also to their families, friends, co-workers and to society.",
  historyTitle: "Feminism in Egypt and Beyond",
  historyBody:
    "[EXAMPLE TEXT] The archive is best understood when contextualized. Thus, some nodes will reflect historical transformations in 20th and 21st century Egypt. Several events in the evolution of feminist discourse are particularly important. Feminist politics grew after the 1952 Revolution; under Nasser, feminism was tied to anti-colonial and anti-capitalist discourses that comprised the larger political milieu (Ibrahim 2017, 4-5). Still, Egyptian activists struggled to connect with the working-class, and the discourse \"creat[ed] a paternalistic and detached dynamic\" (Ibrahim 2017, 3). Within the state, opportunities for women's work and education were expanded just as women's political space was shut down (Ibrahim 2017, 6; Gaul 2025, 78-79, 101). Alongside shifts in feminist discourse, the state's expansion of education access-especially for the poor-would shape feminism to better incorporate working class women (Ibrahim 2017, 13). These state-led interventions into women's experiences would come into tension with Sadat's policy of economic liberalization (infitah). Women's activism focused less on colonialism and more on the economic and political realities of the time (Ibrahim 2017, 15). In this political iteration, the \"modern\" West became the normative goal of feminism (Ibrahim 2017, 16). These unresolved tensions would reemerge in the 2011 Arab Spring as feminism reasserted itself through a more intersectional lens (Ibrahim 2017, 20). Hatem (2011) documents women, \"young and old, veiled and unveiled, poor and affluent,\" joining together in Tahrir Square against the rule of the state (36). This experience was likewise translated into discourse: feminists discredited both historical and contemporaneous versions of state-sponsored feminism (Hatem 2011, 37). These social transformations do not only function as historical context. They also shape the archival material of \"Doing Well, Don't Worry.\" Nasser's education policies contour the archives of a rural teacher; Sadat's infitah frames Mitri's prison correspondence; and the Arab Spring echoes the diverse coalitions in Tahrir square (Hassan 2021; Hatem 2011, 36).",
};

function buildPageUrl(pageName) {
  const url = new URL(window.location.href);
  const pathname = url.pathname || "/";
  if (pathname.endsWith(".html")) {
    url.pathname = pathname.replace(/[^/]+$/, pageName);
  } else if (pathname.endsWith("/")) {
    url.pathname = `${pathname}${pageName}`;
  } else {
    url.pathname = `${pathname}/${pageName}`;
  }
  return url.toString();
}

function isAdminUnlocked() {
  try {
    return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

if (MODE === "admin" && !isAdminUnlocked()) {
  window.location.href = buildPageUrl("index.html");
}

const TRANSLATIONS = {
  en: {
    appTitle: "Storymap Relationship Graph",
    appPeopleLabel: "People",
    appEventsLabel: "Events",
    resetDemo: "Reset Demo",
    addPersonTitle: "Add Person",
    personNameLabel: "Name",
    personNamePlaceholder: "e.g., Ada Lovelace",
    personDescLabel: "Description (optional)",
    personDescPlaceholder: "Short context",
    addPersonButton: "Add Person",
    addEventTitle: "Add Event",
    eventTitleLabel: "Title",
    eventTitlePlaceholder: "e.g., Summer Workshop",
    eventDateLabel: "Date (optional)",
    eventDatePlaceholder: "e.g., 2020-08-14 or 'Spring 1936'",
    addEventButton: "Add Event",
    createRelationshipTitle: "Create Relationship",
    personSelectLabel: "Person",
    eventSelectLabel: "Event",
    edgeRoleLabel: "Role / Label (optional)",
    edgeRolePlaceholder: "e.g., attended, worked on, mentioned in",
    linkButton: "Link Person → Event",
    tipText: "Tip: click nodes/edges in the graph to view details and delete.",
    layoutLabel: "Layout",
    layoutOptionForce: "Force (cose)",
    layoutOptionBreadth: "Breadth-first",
    layoutOptionGrid: "Grid",
    reLayoutButton: "Re-layout",
    selectedTitle: "Selected",
    nothingSelectedYet: "Nothing selected yet.",
    deleteButton: "Delete",
    storyOrderTitle: "Story Order",
    storyOrderInstruction: "Control the order you want for story nodes.",
    moveUpButton: "Move Up",
    moveDownButton: "Move Down",
    importExportTitle: "Import / Export",
    graphJsonLabel: "Graph JSON",
    jsonAreaPlaceholder: '{"nodes":[...],"edges":[...]}',
    exportJsonButton: "Export JSON",
    importJsonButton: "Import JSON",
    shareableLinkTitle: "Shareable Link",
    shareableLinkInstruction:
      "Creates a URL containing your graph state (best for small-to-medium graphs).",
    createLinkButton: "Create Link",
    shareLinkPlaceholder: "Click “Create Link”",
    nodePerson: "Person",
    nodeEvent: "Event",
    labelName: "Name",
    labelDescription: "Description",
    labelTitle: "Title",
    labelDate: "Date",
    labelUploadPhoto: "Upload photo (stored locally)",
    labelPhotoUrlOptional: "Or photo URL (optional)",
    noPhotoYet: "No photo yet. Add one below.",
    removePhoto: "Remove Photo",
    labelNotes: "Text / Notes",
    labelStoryOrder: "Story order (for display)",
    saveNodeDetails: "Save Node Details",
    noteLongLinks: "Note: if you upload photos, share links may get very long.",
    optionalContextPlaceholder: "Optional context",
    optionalDatePlaceholder: "Optional (e.g., 2020-08-14)",
    photoUrlPlaceholder: "https://...",
    notesPlaceholder: "Add story text for this node...",
    storyOrderInputPlaceholder: "e.g., 0",
    relationshipTitle: "Relationship",
    edgeLabelPerson: "Person",
    edgeLabelEvent: "Event",
    edgeLabelRole: "Role",
    noRoleLabel: "No role label.",
  },
  ar: {
    appTitle: "مخطط القصة والعلاقات",
    appPeopleLabel: "الأشخاص",
    appEventsLabel: "الأحداث",
    resetDemo: "إعادة ضبط العرض",
    addPersonTitle: "إضافة شخص",
    personNameLabel: "الاسم",
    personNamePlaceholder: "مثال: آدا لوفليس",
    personDescLabel: "وصف (اختياري)",
    personDescPlaceholder: "سياق مختصر",
    addPersonButton: "إضافة شخص",
    addEventTitle: "إضافة حدث",
    eventTitleLabel: "العنوان",
    eventTitlePlaceholder: "مثال: ورشة الصيف",
    eventDateLabel: "التاريخ (اختياري)",
    eventDatePlaceholder: "مثال: 2020-08-14 أو 'ربيع 1936'",
    addEventButton: "إضافة حدث",
    createRelationshipTitle: "إنشاء علاقة",
    personSelectLabel: "الشخص",
    eventSelectLabel: "الحدث",
    edgeRoleLabel: "الدور / التسمية (اختياري)",
    edgeRolePlaceholder: "مثال: حضر، عمل على، ذُكر في",
    linkButton: "ربط الشخص → الحدث",
    tipText: "نصيحة: انقر على العقد/الحواف لعرض التفاصيل والحذف.",
    layoutLabel: "التخطيط",
    layoutOptionForce: "القوة (cose)",
    layoutOptionBreadth: "عرض-أول",
    layoutOptionGrid: "شبكة",
    reLayoutButton: "إعادة التخطيط",
    selectedTitle: "المحدد",
    nothingSelectedYet: "لم يتم تحديد أي شيء بعد.",
    deleteButton: "حذف",
    storyOrderTitle: "ترتيب القصة",
    storyOrderInstruction: "تحكم في ترتيب عقد القصة كما تريد.",
    moveUpButton: "تحريك للأعلى",
    moveDownButton: "تحريك للأسفل",
    importExportTitle: "استيراد / تصدير",
    graphJsonLabel: "JSON للمخطط",
    jsonAreaPlaceholder: '{"nodes":[...],"edges":[...]}',
    exportJsonButton: "تصدير JSON",
    importJsonButton: "استيراد JSON",
    shareableLinkTitle: "رابط قابل للمشاركة",
    shareableLinkInstruction: "ينشئ رابطًا يحتوي على حالة المخطط (مناسب لعدد عقد متوسط أو صغير).",
    createLinkButton: "إنشاء رابط",
    shareLinkPlaceholder: 'انقر “إنشاء رابط”',
    nodePerson: "شخص",
    nodeEvent: "حدث",
    labelName: "الاسم",
    labelDescription: "الوصف",
    labelTitle: "العنوان",
    labelDate: "التاريخ",
    labelUploadPhoto: "رفع صورة (يتم حفظها محليًا)",
    labelPhotoUrlOptional: "أو رابط صورة (اختياري)",
    noPhotoYet: "لا توجد صورة بعد. أضف واحدة أدناه.",
    removePhoto: "إزالة الصورة",
    labelNotes: "النص / الملاحظات",
    labelStoryOrder: "ترتيب القصة (للعرض)",
    saveNodeDetails: "حفظ تفاصيل العقدة",
    noteLongLinks: "ملاحظة: إذا رفعت صورًا، قد تصبح الروابط طويلة جدًا.",
    optionalContextPlaceholder: "سياق اختياري",
    optionalDatePlaceholder: "اختياري (مثال: 2020-08-14)",
    photoUrlPlaceholder: "https://...",
    notesPlaceholder: "أضف نص القصة لهذه العقدة...",
    storyOrderInputPlaceholder: "مثال: 0",
    relationshipTitle: "العلاقة",
    edgeLabelPerson: "الشخص",
    edgeLabelEvent: "الحدث",
    edgeLabelRole: "الدور",
    noRoleLabel: "لا يوجد تسمية للدور.",
  },
  es: {
    appTitle: "Mapa de Historia: Grafo de Relaciones",
    appPeopleLabel: "Personas",
    appEventsLabel: "Eventos",
    resetDemo: "Restablecer demo",
    addPersonTitle: "Añadir Persona",
    personNameLabel: "Nombre",
    personNamePlaceholder: "p. ej., Ada Lovelace",
    personDescLabel: "Descripción (opcional)",
    personDescPlaceholder: "Contexto breve",
    addPersonButton: "Añadir Persona",
    addEventTitle: "Añadir Evento",
    eventTitleLabel: "Título",
    eventTitlePlaceholder: "p. ej., Taller de verano",
    eventDateLabel: "Fecha (opcional)",
    eventDatePlaceholder: "p. ej., 2020-08-14 o 'Primavera de 1936'",
    addEventButton: "Añadir Evento",
    createRelationshipTitle: "Crear Relación",
    personSelectLabel: "Persona",
    eventSelectLabel: "Evento",
    edgeRoleLabel: "Rol / Etiqueta (opcional)",
    edgeRolePlaceholder: "p. ej., asistió, trabajó en, mencionado en",
    linkButton: "Enlazar Persona → Evento",
    tipText: "Consejo: haz clic en nodos/aristas para ver detalles y eliminar.",
    layoutLabel: "Diseño",
    layoutOptionForce: "Fuerza (cose)",
    layoutOptionBreadth: "Anchura primero",
    layoutOptionGrid: "Cuadrícula",
    reLayoutButton: "Re-diseñar",
    selectedTitle: "Seleccionado",
    nothingSelectedYet: "Aún no has seleccionado nada.",
    deleteButton: "Eliminar",
    storyOrderTitle: "Orden de la historia",
    storyOrderInstruction: "Controla el orden que quieres para los nodos de la historia.",
    moveUpButton: "Subir",
    moveDownButton: "Bajar",
    importExportTitle: "Importar / Exportar",
    graphJsonLabel: "JSON del grafo",
    jsonAreaPlaceholder: '{"nodes":[...],"edges":[...]}',
    exportJsonButton: "Exportar JSON",
    importJsonButton: "Importar JSON",
    shareableLinkTitle: "Enlace para compartir",
    shareableLinkInstruction:
      "Crea una URL que contiene el estado de tu grafo (ideal para grafos pequeños a medianos).",
    createLinkButton: "Crear enlace",
    shareLinkPlaceholder: 'Haz clic en “Crear enlace”',
    nodePerson: "Persona",
    nodeEvent: "Evento",
    labelName: "Nombre",
    labelDescription: "Descripción",
    labelTitle: "Título",
    labelDate: "Fecha",
    labelUploadPhoto: "Subir foto (guardada localmente)",
    labelPhotoUrlOptional: "O URL de la foto (opcional)",
    noPhotoYet: "Aún no hay foto. Añade una abajo.",
    removePhoto: "Eliminar foto",
    labelNotes: "Texto / Notas",
    labelStoryOrder: "Orden de la historia (para mostrar)",
    saveNodeDetails: "Guardar detalles del nodo",
    noteLongLinks: "Nota: si subes fotos, los enlaces para compartir pueden ser muy largos.",
    optionalContextPlaceholder: "Contexto opcional",
    optionalDatePlaceholder: "Opcional (p. ej., 2020-08-14)",
    photoUrlPlaceholder: "https://...",
    notesPlaceholder: "Añade texto de historia para este nodo...",
    storyOrderInputPlaceholder: "p. ej., 0",
    relationshipTitle: "Relación",
    edgeLabelPerson: "Persona",
    edgeLabelEvent: "Evento",
    edgeLabelRole: "Rol",
    noRoleLabel: "Sin etiqueta de rol.",
  },
  fr: {
    appTitle: "Carte d'Histoire : Graphe de Relations",
    appPeopleLabel: "Personnes",
    appEventsLabel: "Événements",
    resetDemo: "Réinitialiser la démo",
    addPersonTitle: "Ajouter une personne",
    personNameLabel: "Nom",
    personNamePlaceholder: "ex. Ada Lovelace",
    personDescLabel: "Description (optionnel)",
    personDescPlaceholder: "Contexte bref",
    addPersonButton: "Ajouter une personne",
    addEventTitle: "Ajouter un événement",
    eventTitleLabel: "Titre",
    eventTitlePlaceholder: "ex. Atelier d'été",
    eventDateLabel: "Date (optionnel)",
    eventDatePlaceholder: "ex. 2020-08-14 ou 'Printemps 1936'",
    addEventButton: "Ajouter un événement",
    createRelationshipTitle: "Créer une relation",
    personSelectLabel: "Personne",
    eventSelectLabel: "Événement",
    edgeRoleLabel: "Rôle / Libellé (optionnel)",
    edgeRolePlaceholder: "ex. a assisté, a travaillé sur, mentionné dans",
    linkButton: "Relier Personne → Événement",
    tipText: "Astuce : cliquez sur les nœuds/arêtes pour voir les détails et supprimer.",
    layoutLabel: "Mise en page",
    layoutOptionForce: "Forces (cose)",
    layoutOptionBreadth: "Parcours en largeur",
    layoutOptionGrid: "Grille",
    reLayoutButton: "Re-mise en page",
    selectedTitle: "Sélection",
    nothingSelectedYet: "Aucune sélection pour le moment.",
    deleteButton: "Supprimer",
    storyOrderTitle: "Ordre de l'histoire",
    storyOrderInstruction: "Contrôlez l'ordre que vous voulez pour les nœuds de l'histoire.",
    moveUpButton: "Monter",
    moveDownButton: "Descendre",
    importExportTitle: "Importer / Exporter",
    graphJsonLabel: "JSON du graphe",
    jsonAreaPlaceholder: '{"nodes":[...],"edges":[...]}',
    exportJsonButton: "Exporter JSON",
    importJsonButton: "Importer JSON",
    shareableLinkTitle: "Lien partageable",
    shareableLinkInstruction:
      "Crée une URL qui contient l'état de votre graphe (idéal pour les graphes petits à moyens).",
    createLinkButton: "Créer un lien",
    shareLinkPlaceholder: 'Cliquez sur “Créer un lien”',
    nodePerson: "Personne",
    nodeEvent: "Événement",
    labelName: "Nom",
    labelDescription: "Description",
    labelTitle: "Titre",
    labelDate: "Date",
    labelUploadPhoto: "Téléverser une photo (stockée localement)",
    labelPhotoUrlOptional: "Ou URL de photo (optionnel)",
    noPhotoYet: "Aucune photo pour le moment. Ajoutez-en une ci-dessous.",
    removePhoto: "Supprimer la photo",
    labelNotes: "Texte / Notes",
    labelStoryOrder: "Ordre de l'histoire (pour l'affichage)",
    saveNodeDetails: "Enregistrer les détails du nœud",
    noteLongLinks: "Note : si vous téléversez des photos, les liens de partage peuvent devenir très longs.",
    optionalContextPlaceholder: "Contexte optionnel",
    optionalDatePlaceholder: "Optionnel (ex. 2020-08-14)",
    photoUrlPlaceholder: "https://...",
    notesPlaceholder: "Ajoutez le texte de l'histoire pour ce nœud...",
    storyOrderInputPlaceholder: "ex. 0",
    relationshipTitle: "Relation",
    edgeLabelPerson: "Personne",
    edgeLabelEvent: "Événement",
    edgeLabelRole: "Rôle",
    noRoleLabel: "Aucune étiquette de rôle.",
  },
  de: {
    appTitle: "Storymap: Beziehungsdiagramm",
    appPeopleLabel: "Personen",
    appEventsLabel: "Ereignisse",
    resetDemo: "Demo zurücksetzen",
    addPersonTitle: "Person hinzufügen",
    personNameLabel: "Name",
    personNamePlaceholder: "z.B. Ada Lovelace",
    personDescLabel: "Beschreibung (optional)",
    personDescPlaceholder: "Kurzer Kontext",
    addPersonButton: "Person hinzufügen",
    addEventTitle: "Ereignis hinzufügen",
    eventTitleLabel: "Titel",
    eventTitlePlaceholder: "z.B. Sommer-Workshop",
    eventDateLabel: "Datum (optional)",
    eventDatePlaceholder: "z.B. 2020-08-14 oder 'Frühling 1936'",
    addEventButton: "Ereignis hinzufügen",
    createRelationshipTitle: "Beziehung erstellen",
    personSelectLabel: "Person",
    eventSelectLabel: "Ereignis",
    edgeRoleLabel: "Rolle / Label (optional)",
    edgeRolePlaceholder: "z.B. teilgenommen, gearbeitet an, erwähnt in",
    linkButton: "Person → Ereignis verknüpfen",
    tipText: "Tipp: Klicke auf Knoten/Kanten, um Details zu sehen und zu löschen.",
    layoutLabel: "Layout",
    layoutOptionForce: "Kräfte (cose)",
    layoutOptionBreadth: "Breitensuche",
    layoutOptionGrid: "Gitter",
    reLayoutButton: "Neu anordnen",
    selectedTitle: "Ausgewählt",
    nothingSelectedYet: "Noch nichts ausgewählt.",
    deleteButton: "Löschen",
    storyOrderTitle: "Story-Reihenfolge",
    storyOrderInstruction: "Steuere die Reihenfolge der Story-Knoten.",
    moveUpButton: "Nach oben",
    moveDownButton: "Nach unten",
    importExportTitle: "Import / Export",
    graphJsonLabel: "Graph-JSON",
    jsonAreaPlaceholder: '{"nodes":[...],"edges":[...]}',
    exportJsonButton: "JSON exportieren",
    importJsonButton: "JSON importieren",
    shareableLinkTitle: "Teilbarer Link",
    shareableLinkInstruction:
      "Erstellt eine URL mit dem Zustand deines Graphen (ideal für kleine bis mittlere Graphen).",
    createLinkButton: "Link erstellen",
    shareLinkPlaceholder: 'Klicke auf „Link erstellen“',
    nodePerson: "Person",
    nodeEvent: "Ereignis",
    labelName: "Name",
    labelDescription: "Beschreibung",
    labelTitle: "Titel",
    labelDate: "Datum",
    labelUploadPhoto: "Foto hochladen (lokal gespeichert)",
    labelPhotoUrlOptional: "Oder Foto-URL (optional)",
    noPhotoYet: "Noch kein Foto. Unten hinzufügen.",
    removePhoto: "Foto entfernen",
    labelNotes: "Text / Notizen",
    labelStoryOrder: "Story-Reihenfolge (für Anzeige)",
    saveNodeDetails: "Knotendetails speichern",
    noteLongLinks: "Hinweis: Wenn du Fotos hochlädst, können Teilen-Links sehr lang werden.",
    optionalContextPlaceholder: "Optionaler Kontext",
    optionalDatePlaceholder: "Optional (z.B. 2020-08-14)",
    photoUrlPlaceholder: "https://...",
    notesPlaceholder: "Füge Story-Text für diesen Knoten hinzu...",
    storyOrderInputPlaceholder: "z.B. 0",
    relationshipTitle: "Beziehung",
    edgeLabelPerson: "Person",
    edgeLabelEvent: "Ereignis",
    edgeLabelRole: "Rolle",
    noRoleLabel: "Keine Rollenbezeichnung.",
  },
};

TRANSLATIONS.it = { ...TRANSLATIONS.en };
Object.assign(TRANSLATIONS.it, {
  appTitle: "Mappa della storia: Grafo delle relazioni",
  appPeopleLabel: "Persone",
  appEventsLabel: "Eventi",
  resetDemo: "Reimposta demo",
  addPersonTitle: "Aggiungi persona",
  personNameLabel: "Nome",
  personNamePlaceholder: "es. Ada Lovelace",
  personDescLabel: "Descrizione (facoltativa)",
  personDescPlaceholder: "Breve contesto",
  addPersonButton: "Aggiungi persona",
  addEventTitle: "Aggiungi evento",
  eventTitleLabel: "Titolo",
  eventTitlePlaceholder: "es. Laboratorio estivo",
  eventDateLabel: "Data (facoltativa)",
  eventDatePlaceholder: "es. 2020-08-14 o «Primavera 1936»",
  addEventButton: "Aggiungi evento",
  createRelationshipTitle: "Crea relazione",
  personSelectLabel: "Persona",
  eventSelectLabel: "Evento",
  edgeRoleLabel: "Ruolo / etichetta (facoltativo)",
  edgeRolePlaceholder: "es. ha partecipato, ha lavorato a, menzionato in",
  linkButton: "Collega persona → evento",
  tipText: "Suggerimento: clic su nodi/archi per dettagli ed eliminazione.",
  layoutLabel: "Layout",
  layoutOptionForce: "Forza (cose)",
  layoutOptionBreadth: "Ampiezza prima",
  layoutOptionGrid: "Griglia",
  reLayoutButton: "Ri-layout",
  selectedTitle: "Selezione",
  nothingSelectedYet: "Nessuna selezione.",
  deleteButton: "Elimina",
  storyOrderTitle: "Ordine della storia",
  storyOrderInstruction: "Controlla l'ordine dei nodi della storia.",
  moveUpButton: "Su",
  moveDownButton: "Giù",
  importExportTitle: "Importa / Esporta",
  graphJsonLabel: "JSON del grafo",
  jsonAreaPlaceholder: '{"nodes":[...],"edges":[...]}',
  exportJsonButton: "Esporta JSON",
  importJsonButton: "Importa JSON",
  shareableLinkTitle: "Link condivisibile",
  shareableLinkInstruction:
    "Crea un URL con lo stato del grafo (adatto a grafi piccoli e medi).",
  createLinkButton: "Crea link",
  shareLinkPlaceholder: "Clicca «Crea link»",
  nodePerson: "Persona",
  nodeEvent: "Evento",
  labelName: "Nome",
  labelDescription: "Descrizione",
  labelTitle: "Titolo",
  labelDate: "Data",
  labelUploadPhoto: "Carica foto (salvata in locale)",
  labelPhotoUrlOptional: "O URL foto (facoltativo)",
  noPhotoYet: "Nessuna foto. Aggiungine una sotto.",
  removePhoto: "Rimuovi foto",
  labelNotes: "Testo / note",
  labelStoryOrder: "Ordine della storia (per la visualizzazione)",
  saveNodeDetails: "Salva dettagli nodo",
  noteLongLinks: "Nota: con le foto, i link di condivisione possono diventare molto lunghi.",
  optionalContextPlaceholder: "Contesto facoltativo",
  optionalDatePlaceholder: "Facoltativo (es. 2020-08-14)",
  photoUrlPlaceholder: "https://...",
  notesPlaceholder: "Aggiungi testo di storia per questo nodo...",
  storyOrderInputPlaceholder: "es. 0",
  relationshipTitle: "Relazione",
  edgeLabelPerson: "Persona",
  edgeLabelEvent: "Evento",
  edgeLabelRole: "Ruolo",
  noRoleLabel: "Nessuna etichetta di ruolo.",
  exhibitionTitle: "Doing Well, Don’t Worry: Un archivio femminista relazionale",
  exhibitionSubtitle:
    "The Women and Memory Forum ripensa l'archivio di Wedad Mitri come pratica di mentorship, solidarietà e apprendimento politico collettivo.",
  citationsTitle: "Riferimenti in stile Chicago",
  pedagogyTooltip:
    "Pedagogia del sentire: apprendimento femminista attraverso memoria, affetto e azione relazionale.",
});

if (typeof STORYMAP_EXTRA_I18N !== "undefined") {
  Object.keys(STORYMAP_EXTRA_I18N).forEach((lang) => {
    if (TRANSLATIONS[lang]) Object.assign(TRANSLATIONS[lang], STORYMAP_EXTRA_I18N[lang]);
  });
}

const CHICAGO_CITATIONS = [
  "Hopkins, Nicholas S., and Kirsten Westergaard, eds. 2001. Directions of Change in Rural Egypt.",
  "Hassan, Rania. 2021. Feminist Memory and Archival Praxis in Egypt.",
  "Ibrahim, Hoda. 2017. Pedagogy of Feeling and Relational Activism in Arab Feminist Movements.",
];

Object.values(TRANSLATIONS).forEach((bundle) => {
  if (!bundle.exhibitionTitle) bundle.exhibitionTitle = "Doing Well, Don’t Worry: A Relational Feminist Archive";
  if (!bundle.exhibitionSubtitle)
    bundle.exhibitionSubtitle =
      "The Women and Memory Forum reframes Wedad Mitri's archive as mentorship, solidarity, and collective political learning.";
  if (!bundle.citationsTitle) bundle.citationsTitle = "Chicago-Style References";
  if (!bundle.pedagogyTooltip)
    bundle.pedagogyTooltip =
      "Pedagogy of feeling: feminist learning through shared affect, memory, and relational action.";
  if (!bundle.labelDateRange) bundle.labelDateRange = "Date range";
  if (!bundle.labelContextTags) bundle.labelContextTags = "Context tags";
  if (!bundle.labelAudioDescription) bundle.labelAudioDescription = "Audio description";
  if (!bundle.labelPedagogyNotes) bundle.labelPedagogyNotes = "Pedagogy notes";
  if (!bundle.labelMentorshipRole) bundle.labelMentorshipRole = "Mentorship role";
  if (!bundle.labelCitationIds) bundle.labelCitationIds = "Citation IDs";
});

Object.assign(TRANSLATIONS.ar, {
  exhibitionTitle: "أنا بخير، اطمئنوا: أرشيف نسوي علائقي",
  exhibitionSubtitle:
    "تعيد «المرأة والذاكرة» قراءة أرشيف وداد متري بوصفه إرشادًا نسويًا عابرًا للأجيال والطبقات.",
  citationsTitle: "مراجع وفق أسلوب شيكاغو",
  labelDateRange: "النطاق الزمني",
  labelContextTags: "وسوم السياق",
  labelAudioDescription: "وصف صوتي",
  labelPedagogyNotes: "ملاحظات تربوية",
  labelMentorshipRole: "دور الإرشاد",
  labelCitationIds: "معرّفات المراجع",
});
Object.assign(TRANSLATIONS.es, {
  exhibitionTitle: "Doing Well, Don’t Worry: Archivo feminista relacional",
  exhibitionSubtitle:
    "The Women and Memory Forum replantea el archivo de Wedad Mitri como mentoría, solidaridad y aprendizaje político colectivo.",
  citationsTitle: "Referencias estilo Chicago",
});
Object.assign(TRANSLATIONS.de, {
  exhibitionTitle: "Doing Well, Don’t Worry: Relationales feministisches Archiv",
  exhibitionSubtitle:
    "The Women and Memory Forum rahmt Wedad Mitris Archiv als Mentoring, Solidarität und kollektives politisches Lernen neu.",
  citationsTitle: "Literatur im Chicago-Stil",
});

function readLangFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const v = q.get("lang");
    if (v && SUPPORTED_LANGS.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

let currentLang = "en";
try {
  currentLang = localStorage.getItem(LANG_STORAGE_KEY) || "en";
} catch {
  // If localStorage is blocked, keep default language.
}
const langFromUrl = readLangFromUrl();
if (langFromUrl) {
  currentLang = langFromUrl;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  } catch {
    /* ignore */
  }
}
if (!SUPPORTED_LANGS.includes(currentLang)) currentLang = "en";

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en?.[key] ?? key;
}

function syncLangToUrl() {
  try {
    const url = new URL(window.location.href);
    if (currentLang === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", currentLang);
    history.replaceState(null, "", url.toString());
  } catch {
    /* ignore */
  }
}

function setLanguage(nextLang) {
  if (!SUPPORTED_LANGS.includes(nextLang)) return;
  currentLang = nextLang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  } catch {
    // ignore
  }
  syncLangToUrl();
  applyTranslations();
  const createConnect = document.getElementById("smCreateConnectTo");
  if (createConnect && createConnect.options[0] && createConnect.options[0].value === "") {
    createConnect.options[0].textContent = t("adminNoneNoLink");
    applyTextDirToNode(createConnect.options[0]);
  }
  // Update the dynamic selected panel too.
  renderSelectedPanel();
  renderStoryOrderList();
  renderCitationOverlay();
  if (typeof viewerOpenNodeId !== "undefined" && viewerOpenNodeId) {
    if (el.viewerSidebar && el.viewerSidebar.classList.contains("viewerSidebar--open")) {
      openSidebarForNode(viewerOpenNodeId);
    }
    if (el.nodeModal && el.nodeModal.getAttribute("aria-hidden") === "false") {
      openNodeModalById(viewerOpenNodeId);
    }
  }
  if (typeof window.storymapRefreshCanvasI18n === "function") window.storymapRefreshCanvasI18n();
}

/**
 * Apply RTL only to text/display nodes for Arabic. Form controls use CSS (body.lang-ar) so widths
 * and layout stay fixed while text direction is still correct inside fields.
 */
function applyTextDirToNode(node) {
  if (!node || !node.setAttribute) return;
  const tag = (node.tagName && String(node.tagName).toLowerCase()) || "";
  if (tag === "input" || tag === "textarea" || tag === "select") {
    node.removeAttribute("dir");
    return;
  }
  if (currentLang === "ar") node.setAttribute("dir", "rtl");
  else node.removeAttribute("dir");
}

function applyTranslations() {
  // Layout stays LTR site-wide; Arabic uses RTL only on text nodes (see applyTextDirToNode).
  document.documentElement.setAttribute("dir", "ltr");
  document.documentElement.lang = currentLang === "ar" ? "ar" : currentLang;
  document.body.classList.toggle("lang-ar", currentLang === "ar");
  document.title = t("appTitle");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key);
    applyTextDirToNode(node);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (!key) return;
    node.setAttribute("placeholder", t(key));
    applyTextDirToNode(node);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    if (!key) return;
    node.setAttribute("title", t(key));
    applyTextDirToNode(node);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria-label");
    if (!key) return;
    node.setAttribute("aria-label", t(key));
  });

  document.querySelectorAll("option[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key);
    applyTextDirToNode(node);
  });

  const langBtnLabel = document.getElementById("langCurrentLabel");
  if (langBtnLabel) {
    langBtnLabel.textContent = LANG_BUTTON_CODES[currentLang] || String(currentLang).toUpperCase();
  }

  document.querySelectorAll("#langMenuList [data-lang]").forEach((btn) => {
    const code = btn.getAttribute("data-lang");
    const active = code === currentLang;
    btn.classList.toggle("is-active", active);
    if (btn.setAttribute) btn.setAttribute("aria-selected", active ? "true" : "false");
    if (code === "ar") btn.setAttribute("dir", "rtl");
    else btn.removeAttribute("dir");
  });

  applyContentConfigToPage();
  updateDiscussionBackendNotice();
  if (typeof renderDiscussionBoard === "function" && document.getElementById("discussionPosts")) {
    renderDiscussionBoard();
  }
  void refreshDiscussionAdminHintForI18n();
}

function refreshDiscussionAdminHintForI18n() {
  if (MODE !== "admin") return;
  const hint = document.getElementById("discussionAdminClearHint");
  if (!hint) return;
  void (async () => {
    await bootstrapDiscussionRemote();
    if (discussionRemoteEnabled) hint.textContent = t("adminDiscussionSupabaseHint");
    else hint.textContent = t("adminDiscussionLocalHint");
    applyTextDirToNode(hint);
  })();
}

const el = {
  btnReset: document.getElementById("btnReset"),
  btnReLayout: document.getElementById("btnReLayout"),
  btnDeleteSelected: document.getElementById("btnDeleteSelected"),
  btnExportJson: document.getElementById("btnExportJson"),
  btnImportJson: document.getElementById("btnImportJson"),
  btnMakeShareLink: document.getElementById("btnMakeShareLink"),

  layoutSelect: document.getElementById("layoutSelect"),
  cy: document.getElementById("cy"),

  selectedDetails: document.getElementById("selectedDetails"),
  jsonArea: document.getElementById("jsonArea"),

  shareLink: document.getElementById("shareLink"),
  shareWarning: document.getElementById("shareWarning"),

  storyOrderList: document.getElementById("storyOrderList"),
  btnStoryMoveUp: document.getElementById("btnStoryMoveUp"),
  btnStoryMoveDown: document.getElementById("btnStoryMoveDown"),

  // Viewer-only UI
  btnLogin: document.getElementById("btnLogin"),
  nodeModal: document.getElementById("nodeModal"),
  btnCloseNodeModal: document.getElementById("btnCloseNodeModal"),
  nodeModalTitle: document.getElementById("nodeModalTitle"),
  nodeModalMeta: document.getElementById("nodeModalMeta"),
  nodeModalDescription: document.getElementById("nodeModalDescription"),
  nodeModalImage: document.getElementById("nodeModalImage"),
  btnPrevNode: document.getElementById("btnPrevNode"),
  btnNextNode: document.getElementById("btnNextNode"),
  viewerRoot: document.getElementById("viewerRoot"),
  viewerSidebar: document.getElementById("viewerSidebar"),
  btnCloseSidebar: document.getElementById("btnCloseSidebar"),
  sidebarThumb: document.getElementById("sidebarThumb"),
  sidebarTitle: document.getElementById("sidebarTitle"),
  sidebarMeta: document.getElementById("sidebarMeta"),
  sidebarDescription: document.getElementById("sidebarDescription"),
  btnZoomIn: document.getElementById("btnZoomIn"),
  btnZoomOut: document.getElementById("btnZoomOut"),
  loginModal: document.getElementById("loginModal"),
  adminPassword: document.getElementById("adminPassword"),
  loginError: document.getElementById("loginError"),
  btnCancelLogin: document.getElementById("btnCancelLogin"),
  btnSubmitLogin: document.getElementById("btnSubmitLogin"),
  btnLogoutAdmin: document.getElementById("btnLogoutAdmin"),
  citationList: document.getElementById("citationList"),
  cfgHeroTitle: document.getElementById("cfgHeroTitle"),
  cfgHeroSubtitle: document.getElementById("cfgHeroSubtitle"),
  cfgHeroCta: document.getElementById("cfgHeroCta"),
  cfgHistoryTitle: document.getElementById("cfgHistoryTitle"),
  cfgHistoryBody: document.getElementById("cfgHistoryBody"),
  btnSaveContentConfig: document.getElementById("btnSaveContentConfig"),
  btnClearDiscussions: document.getElementById("btnClearDiscussions"),
  discussionAdminClearHint: document.getElementById("discussionAdminClearHint"),
  discussionTitle: document.getElementById("discussionTitle"),
  discussionDescription: document.getElementById("discussionDescription"),
  discussionPostBtn: document.getElementById("discussionPostBtn"),
  discussionPosts: document.getElementById("discussionPosts"),
  discussionBackendNote: document.getElementById("discussionBackendNote"),
  inlineNodeEditor: document.getElementById("inlineNodeEditor"),
  inlineNodeLabel: document.getElementById("inlineNodeLabel"),
  inlineNodeSave: document.getElementById("inlineNodeSave"),
  inlineNodeAddChild: document.getElementById("inlineNodeAddChild"),
  inlineNodeConnect: document.getElementById("inlineNodeConnect"),
  inlineConnectHandle: document.getElementById("inlineConnectHandle"),
};

function on(elm, eventName, handler) {
  if (!elm || !elm.addEventListener) return;
  elm.addEventListener(eventName, handler);
}

function setStatus(message, { isError = false, isLoading = false } = {}) {
  const status = document.getElementById("jsStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("jsStatus--hidden", !message);
  status.classList.toggle("jsStatus--error", Boolean(isError));
  status.classList.toggle("jsStatus--loading", Boolean(isLoading));
  if (message) applyTextDirToNode(status);
  else status.removeAttribute("dir");
}

function loadContentConfig() {
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONTENT };
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_CONTENT, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    // Migrate older single-word title to the current heading.
    if (String(merged.historyTitle || "").trim() === "History") {
      merged.historyTitle = DEFAULT_CONTENT.historyTitle;
    }
    return merged;
  } catch {
    return { ...DEFAULT_CONTENT };
  }
}

function saveContentConfig(config) {
  try {
    localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function formatTimestamp(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Unknown time";
  try {
    return dt.toLocaleString();
  } catch {
    return dt.toISOString();
  }
}

/** Supabase client when discussion-config.js provides URL + anon key (shared public data). */
let discussionSupabaseClient = null;
let discussionRemoteEnabled = false;

function normalizeDiscussionPosts(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((post) => post && typeof post === "object")
    .map((post) => ({
      id: Number(post.id) || Date.now(),
      title: String(post.title || "").trim(),
      description: String(post.description || "").trim(),
      timestamp: Number(post.timestamp) || Date.now(),
      replies: Array.isArray(post.replies)
        ? post.replies
            .filter((reply) => reply && typeof reply === "object")
            .map((reply) => ({
              id: Number(reply.id) || Date.now(),
              text: String(reply.text || "").trim(),
              timestamp: Number(reply.timestamp) || Date.now(),
            }))
        : [],
    }));
}

function loadDiscussionsLocal() {
  try {
    const raw = localStorage.getItem(DISCUSSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeDiscussionPosts(parsed);
  } catch {
    return [];
  }
}

function saveDiscussionsLocal(posts) {
  try {
    localStorage.setItem(DISCUSSION_STORAGE_KEY, JSON.stringify(posts));
    return true;
  } catch {
    return false;
  }
}

async function bootstrapDiscussionRemote() {
  discussionSupabaseClient = null;
  discussionRemoteEnabled = false;
  const url = typeof window !== "undefined" && String(window.STORYMAP_DISCUSSION_SUPABASE_URL || "").trim();
  const key = typeof window !== "undefined" && String(window.STORYMAP_DISCUSSION_SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) return;
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm");
    const createClient = mod.createClient;
    if (typeof createClient !== "function") return;
    discussionSupabaseClient = createClient(url, key);
    discussionRemoteEnabled = true;
  } catch (err) {
    console.warn("[discussion] Supabase client failed to load:", err);
    discussionSupabaseClient = null;
    discussionRemoteEnabled = false;
  }
}

async function loadDiscussionsRemote() {
  if (!discussionSupabaseClient) return loadDiscussionsLocal();
  const { data, error } = await discussionSupabaseClient
    .from("discussion_board")
    .select("payload")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.warn("[discussion] Remote load failed:", error);
    return loadDiscussionsLocal();
  }
  return normalizeDiscussionPosts(data?.payload);
}

/**
 * Persist discussion posts: Supabase singleton row when configured, else localStorage.
 * Mirrors to localStorage on remote success so the device keeps an offline copy.
 */
async function persistDiscussions(posts) {
  const normalized = normalizeDiscussionPosts(posts);
  discussionState = normalized;
  if (discussionRemoteEnabled && discussionSupabaseClient) {
    const { error } = await discussionSupabaseClient.from("discussion_board").upsert(
      {
        id: 1,
        payload: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("[discussion] Remote save failed:", error);
      return saveDiscussionsLocal(normalized);
    }
    try {
      localStorage.setItem(DISCUSSION_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      /* ignore */
    }
    return true;
  }
  return saveDiscussionsLocal(normalized);
}

/** Admin-only: clear online board when Supabase is configured; never pretends success if remote write fails. */
async function clearDiscussionsForAdmin() {
  await bootstrapDiscussionRemote();
  discussionState = [];
  if (discussionRemoteEnabled && discussionSupabaseClient) {
    const { error } = await discussionSupabaseClient.from("discussion_board").upsert(
      {
        id: 1,
        payload: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("[discussion] Remote clear failed:", error);
      return { ok: false, mode: "remote" };
    }
    try {
      localStorage.setItem(DISCUSSION_STORAGE_KEY, JSON.stringify([]));
    } catch {
      /* ignore */
    }
    return { ok: true, mode: "remote" };
  }
  const ok = saveDiscussionsLocal([]);
  return { ok, mode: "local" };
}

function updateDiscussionBackendNotice() {
  const node = el.discussionBackendNote || document.getElementById("discussionBackendNote");
  if (!node) return;
  if (discussionRemoteEnabled) {
    node.textContent = t("discussionBackendRemote");
    node.hidden = false;
  } else {
    node.textContent = t("discussionBackendLocal");
    node.hidden = false;
  }
  applyTextDirToNode(node);
}

function applyContentConfigToPage() {
  const cfg = loadContentConfig();
  document.querySelectorAll("[data-content-key]").forEach((node) => {
    const key = node.getAttribute("data-content-key");
    if (!key) return;
    const fromCfg = cfg[key];
    const defVal = DEFAULT_CONTENT[key];
    let value = fromCfg;
    const cfgMatchesDefault =
      typeof fromCfg === "string" && typeof defVal === "string" && fromCfg === defVal;
    const missing = typeof fromCfg !== "string";
    if (missing || cfgMatchesDefault) {
      const tr = t(key);
      if (typeof tr === "string" && tr !== key) value = tr;
      else if (typeof fromCfg === "string") value = fromCfg;
      else value = defVal;
    }
    if (typeof value !== "string") return;
    node.textContent = value;
    applyTextDirToNode(node);
  });
}

function storymapPlaceholderSvg() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <rect width="100%" height="100%" fill="#fde68a"/>
      <circle cx="90" cy="120" r="34" fill="#f59e0b"/>
      <circle cx="158" cy="118" r="32" fill="#fbbf24"/>
      <text x="128" y="214" text-anchor="middle" font-family="Inter,Arial" font-size="18" fill="#1f2937">image</text>
    </svg>`
  );
}

const PUBLISHED_STORYMAP_CANVAS = {
  "nodes": [
    {
      "id": "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092",
      "type": "image",
      "label": "Women are Always on the Move",
      "text": "WOMEN ENGAGE IN DIFFERENT TYPES of work and mobility that inform their journeys through life. They work at home, in the fields, in the workshops, in big cities, small towns, or in other countries. Their work and their movement traverse different spaces, reassembling their relationships as they become part of many other people\u2019s lives. This exhibition introduces glimpses into the lives of 21 women \u2013 women, who have worked and moved as doctors, maids, actresses, students, accountants, filmmakers, embroiderers, teachers, artists, and as mothers, daughters, mentors and friends. They live in Egypt, Jordan, Lebanon and Denmark, yet their lives invite us to travel across many more spaces, peoples, and times, and inspire us to rethink familiar meanings and assumptions about women, mobility and work.\n\nThis exhibition is based on interviews with these diverse women. We are a group of researchers, archivists, museum professionals and young people in these professions, who all share an interest in telling and sharing the stories of these women, whose inspiring tales should be kept and remembered for generations to come. We invite you on a journey through their lives to see how they have moved and for what different reasons. We shed light on the effect that these movements and their work have on their relationships with the people around them and delve into their different types of work to see how they contribute to not only their own lives but also to their families, friends, co-workers and to society.",
      "imageSrc": "",
      "content": "",
      "color": "white",
      "x": 58.576313316320764,
      "y": 30.077950572841104,
      "legacyType": "person"
    },
    {
      "id": "n_3c68e6e6",
      "type": "text",
      "label": "On Work",
      "text": "WORK IS A COMPLEX EXPERIENCE that marks women\u2019s worlds. But what is work and how does it become a central part of a life project? What is recognized as work, what has to be rendered invisible to be able to fend for one\u2019s life, and how are our bodies and affects moulded with work rhythms, routines, tools and corporeal traces? The stories of the women presented here urge us to rethink the meanings, worlds and effects of work. Work traverses women\u2019s lives from early years to late moments of being; work experiences inhabit our worlds at home, in the fields, factories, banks, schools, workshops, gas stations, galleries, and movie screens. The women you are about to meet have worked hard all their lives in many different spaces and times. Their experiences encourage us to reflect on what lies in and outside of work, how work spills over other domains of being, and how work has exuded pride and shame, happiness and sadness, leaving unmistakable marks on our bodies and the worlds we inhabit.\n\nInstead of learning how to read and write, Rawya Mohammed (b. 1978) learned the craft of pottery already at age 12. Since then, her work has inspired many other women to take up pottery and her patterns have forever changed the face of pottery in Fayoum in Egypt. Kawkab Hifni Nassef (1905 - 1999) was the first woman to ever run a hospital in Egypt. Balsam Abou Zour\u2019s (b. 1982) village did not approve of her work as a painter, but after a visit from her teachers, her fate changed. When she opened her first art exhibition, her entire village attended in celebration.",
      "imageSrc": "",
      "content": "On Work",
      "color": "green",
      "x": -39.68462401795731,
      "y": 368.76543209876536,
      "legacyType": "text"
    },
    {
      "id": "n_011e6d0c",
      "type": "text",
      "label": "On Mobility",
      "text": "SOMETIMES WOMEN MOVE BY ACCIDENT, sometimes by choice, and sometimes by force. Many never stop moving despite the obstacles on the road, with possibilities and challenges always as a potential along the way. Their movements have shaped their lives and those of others, leaving traces on who and how they are.\n\nNadia Safwat (b. 1986) travelled with her family who settled in Denmark to work, ambivalently shrouding her relations to her family in Cairo. The Nakba forced Im Ibrahim (b.1927) to flee her hometown Jaffa when it was invaded by Israeli soldiers in 1948. While fleeing on foot, she carried her embroidered costumes as inseparable parts of her being that cannot be left behind. Hind Rostum(1931 -2011) became an actress at the age of 15. As a child, she travelled together with her father whose changing professions took them all over Egypt. Her work later would take her through many more places and relationships. Safeya Gamal (b.\n1934) was one of the Nubians who were forced to move when the Aswan High Dam was built. She felt as if this was their judgement day. Wedad Mitri (1927 - 2007) came into teaching by chance. Since beginning her career she has moved to many places, and inspired many of her students. Widad Al Orfali (b. 1929) opened the first private gallery in Iraq in the 1980s. When the war began in 2003, she was forced to leave her gallery and her paintings behind.",
      "imageSrc": "",
      "content": "On Mobility",
      "color": "green",
      "x": 256.46932376816835,
      "y": -83.75197160228578,
      "legacyType": "text"
    },
    {
      "id": "n_4412adea",
      "type": "image",
      "label": "Wedad Mitri and Sedad Louka's Wedding Photo",
      "text": "Cairo, Egypt. 1961.",
      "imageSrc": "",
      "content": "Wedad Mitri and Sedad Louka's Wedding Photo",
      "color": "green",
      "x": 418.65859620208744,
      "y": -355.65481287254505,
      "legacyType": "text"
    },
    {
      "id": "n_5cd72ca5",
      "type": "text",
      "label": "On Re-Assembling Relations",
      "text": "RELATIONSHIPS ARE REASSEMBLED along the roads of women\u2019s lives, connecting and disconnecting them with people and spaces in constantly evolving life projects. From friends, neighbours, mentors, to colleagues, wives, daughters, and role models, women reconstitute their worlds for better and for worse. But the most valuable relationships can come from somewhere completely unexpected \u2013 be it from your students, neighbours, friends or from other women you live with. The photographs and other memorable traces of relationships that we present here, reveal how people and objects along life journeys make who and how we are constantly in a process of becoming.\n\nThroughout her life and career as a teacher, Wedad Mitri (1927 -2007) became a mentor to different students, who expressed their love and appreciation through postcards that filled Wedad\u2019s suitcases on her travels.\n\nThe primacy of family, particularly her daughter, transformed Hind Rustom\u2019s (1931 -2011) world. She shielded her personal life from the public gaze, ultimately giving up her career as a celebrity actress to become the mother she dreamed of being.\n\nBy observing women at the mosque in Jerusalem, Im Ibrahim (b.1927) added new embroidery patterns to her repertoire that she developed in Jaffa prior to the Nakba. Her daughters-in-law became her trainees in whom she entrusted her cherished embroidery patterns.\n\nDuring many strenuous moments in her life, Aliaa Khairy (b. 1952) learned from her mother the centrality of being part of women\u2019s world of rotating credit associations or gam\u2019iyya. Her turn to cash the money always came at the start of the school year to meet the demands of her children\u2019s education.",
      "imageSrc": "",
      "content": "On Re-Assembling Relations",
      "color": "green",
      "x": -58.32005237560773,
      "y": -107.4222889815571,
      "legacyType": "text"
    },
    {
      "id": "n_65932f6a",
      "type": "image",
      "label": "Kawkab's Certificate",
      "text": "",
      "imageSrc": "",
      "content": "Kawkab's Certificate",
      "color": "green",
      "x": 159.64832300488052,
      "y": -84.24464450048788,
      "legacyType": "image"
    },
    {
      "id": "n_3101be93",
      "type": "image",
      "label": "Hind Rustum Advertisement",
      "text": "",
      "imageSrc": "",
      "content": "Hind Rustum Advertisement",
      "color": "green",
      "x": 471.46932376816846,
      "y": -557.085304935619,
      "legacyType": "image"
    },
    {
      "id": "n_a9b1c62f",
      "type": "image",
      "label": "Wedad Mitri and her Students",
      "text": "",
      "imageSrc": "",
      "content": "Wedad Mitri and her Students",
      "color": "green",
      "x": 453.13599043483504,
      "y": -507.0853049356192,
      "legacyType": "image"
    },
    {
      "id": "n_62058234",
      "type": "image",
      "label": "Passports",
      "text": "",
      "imageSrc": "",
      "content": "Passports",
      "color": "green",
      "x": 326.4693237681683,
      "y": -527.0853049356192,
      "legacyType": "image"
    }
  ],
  "edges": [
    {
      "source": "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092",
      "target": "n_3c68e6e6",
      "label": ""
    },
    {
      "source": "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092",
      "target": "n_011e6d0c",
      "label": ""
    },
    {
      "source": "n_011e6d0c",
      "target": "n_4412adea",
      "label": ""
    },
    {
      "source": "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092",
      "target": "n_5cd72ca5",
      "label": ""
    },
    {
      "source": "n_011e6d0c",
      "target": "n_65932f6a",
      "label": ""
    },
    {
      "source": "n_011e6d0c",
      "target": "n_3101be93",
      "label": ""
    },
    {
      "source": "n_011e6d0c",
      "target": "n_a9b1c62f",
      "label": ""
    },
    {
      "source": "n_011e6d0c",
      "target": "n_62058234",
      "label": ""
    }
  ]
};
const PUBLISHED_STORYMAP_RELEASE = "2026-04-20-fallback-sync";

function cloneStorymapCanvasState(state) {
  return JSON.parse(JSON.stringify(state));
}

function syncCanvasToPublishedRelease() {
  try {
    const currentRelease = localStorage.getItem(STORYMAP_CANVAS_RELEASE_KEY);
    const hasPublishedCanvas = Boolean(localStorage.getItem(STORYMAP_CANVAS_PUBLIC_KEY));
    if (currentRelease === PUBLISHED_STORYMAP_RELEASE || hasPublishedCanvas) return;
    const serialized = JSON.stringify(PUBLISHED_STORYMAP_CANVAS);
    localStorage.setItem(STORYMAP_CANVAS_ADMIN_KEY, serialized);
    localStorage.setItem(STORYMAP_CANVAS_PUBLIC_KEY, serialized);
    localStorage.setItem(STORYMAP_CANVAS_RELEASE_KEY, PUBLISHED_STORYMAP_RELEASE);
  } catch {
    // ignore
  }
}

function defaultStorymapCanvasState() {
  return cloneStorymapCanvasState(PUBLISHED_STORYMAP_CANVAS);
}

function defaultStorymapAdminCanvasState() {
  // Admin and public now share one published baseline for cross-device consistency.
  return cloneStorymapCanvasState(PUBLISHED_STORYMAP_CANVAS);
}

/** Trim; primary id form for lookups and edge keys. */
function canonicalStorymapId(id) {
  return String(id ?? "").trim();
}

const STORYMAP_ZW_RE = /[\u200b-\u200d\ufeff\u2060]/g;
const STORYMAP_NBSP_RE = /\u00a0/g;

/** Strip pasted HTML / rich text to plain text (no tags, no inherited styles). */
function stripHtmlToPlainText(html) {
  if (html == null) return "";
  const s = String(html);
  if (!s.includes("<")) return s;
  try {
    const doc = new DOMParser().parseFromString(s, "text/html");
    return doc.body.textContent || "";
  } catch {
    return s.replace(/<[^>]+>/g, " ");
  }
}

/** Single-line title/label: no awkward mid-sentence hard breaks, consistent spacing. */
function normalizeStorymapTitleText(raw) {
  let t = stripHtmlToPlainText(raw);
  t = t.replace(STORYMAP_NBSP_RE, " ").replace(STORYMAP_ZW_RE, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/**
 * Within one pasted block: join accidental line wraps; keep list lines on their own rows.
 */
function joinSoftWrappedLinesInBlock(block) {
  const lines = block
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines[0] || "";
  const merged = [];
  let acc = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const listLine = /^\s*(\d+[\.\)]\s|[-*•]\s)/.test(line);
    if (listLine && acc.trim()) {
      merged.push(acc);
      acc = line;
    } else {
      acc = `${acc.trimEnd()} ${line.trim()}`;
    }
  }
  merged.push(acc);
  return merged.join("\n");
}

/**
 * Body/description: join soft line breaks from paste, keep real paragraph breaks.
 * Removes hidden chars; uses \\n\\n between paragraphs; single \\n preserved for list items (pre-line CSS).
 */
function normalizeStorymapBodyText(raw) {
  let t = stripHtmlToPlainText(raw);
  t = t.replace(STORYMAP_NBSP_RE, " ").replace(STORYMAP_ZW_RE, "");
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = t.split(/\n\s*\n+/);
  return parts.map((block) => joinSoftWrappedLinesInBlock(block)).filter(Boolean).join("\n\n");
}

function normalizeStorymapCanvasNode(node, index) {
  const fallbackId = `n_${index + 1}`;
  const typeRaw = String(node?.type || "text").toLowerCase();
  const contentRaw = String(node?.content || "").trim();
  const legacyPhoto = String(node?.photo || node?.image || "").trim();
  const imageSrc = String(node?.imageSrc || legacyPhoto || "").trim();
  const looksLikeInlineImage = contentRaw.startsWith("data:image/");
  const hasImagePayload = Boolean(imageSrc) || looksLikeInlineImage;
  const type = typeRaw === "tag" ? "tag" : typeRaw === "image" || hasImagePayload ? "image" : "text";
  const labelRaw = String(node?.label || node?.title || node?.name || (type === "image" ? "" : contentRaw) || "").trim();
  const label = normalizeStorymapTitleText(labelRaw);
  const text = normalizeStorymapBodyText(String(node?.text || node?.notes || node?.description || ""));
  const content = type === "image" ? contentRaw || imageSrc : label;
  const color = String(node?.color || "green").trim() || "green";
  return {
    id: canonicalStorymapId(node?.id || fallbackId) || fallbackId,
    type,
    label,
    text,
    imageSrc,
    content,
    color,
    x: Number.isFinite(Number(node?.x)) ? Number(node.x) : 120 + index * 32,
    y: Number.isFinite(Number(node?.y)) ? Number(node.y) : 120 + index * 24,
    legacyType: String(node?.legacyType || node?.type || ""),
  };
}

/**
 * If an edge endpoint string differs only by case/whitespace from a node id, map it to that node's canonical id.
 */
function remapStorymapEdgeEndpoint(raw, nodeIds, idByLowercase) {
  const s = canonicalStorymapId(raw);
  if (!s) return "";
  if (nodeIds.has(s)) return s;
  const mapped = idByLowercase.get(s.toLowerCase());
  return mapped || s;
}

function normalizeStorymapCanvasState(payload, fallbackState) {
  const source = payload && typeof payload === "object" ? payload : fallbackState;
  const nodesInput = Array.isArray(source?.nodes) ? source.nodes : fallbackState.nodes;
  const edgesInput = Array.isArray(source?.edges) ? source.edges : fallbackState.edges;
  const nodes = nodesInput.map((node, index) => normalizeStorymapCanvasNode(node, index));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const idByLowercase = new Map();
  nodes.forEach((n) => {
    const low = n.id.toLowerCase();
    if (!idByLowercase.has(low)) idByLowercase.set(low, n.id);
  });
  const mappedEdges = edgesInput.map((edge) => ({
    source: remapStorymapEdgeEndpoint(edge?.source, nodeIds, idByLowercase),
    target: remapStorymapEdgeEndpoint(edge?.target, nodeIds, idByLowercase),
    label: normalizeStorymapTitleText(String(edge?.label || edge?.role || "")),
  }));
  const edges = dedupeStorymapEdges(
    mappedEdges.filter(
      (edge) =>
        edge.source &&
        edge.target &&
        edge.source !== edge.target &&
        nodeIds.has(edge.source) &&
        nodeIds.has(edge.target)
    )
  );
  const rawEntry = Array.isArray(source?.entryNodeIds) ? source.entryNodeIds : null;
  const entryFiltered = rawEntry
    ? rawEntry.map((id) => canonicalStorymapId(id)).filter((id) => id && nodeIds.has(id))
    : [];
  const out = { nodes, edges };
  if (entryFiltered.length) out.entryNodeIds = entryFiltered;
  return out;
}

function storymapEdgeKey(a, b) {
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}

/** Brute-force directed edge check (same semantics as dedupe keys). */
function hasStorymapDirectedEdge(edges, srcId, tgtId) {
  const s = canonicalStorymapId(srcId);
  const t = canonicalStorymapId(tgtId);
  if (!s || !t) return false;
  return (edges || []).some((e) => canonicalStorymapId(e?.source) === s && canonicalStorymapId(e?.target) === t);
}

/** Directed: at most one edge per ordered pair (source → target). */
function canAddStorymapEdge(canvas, srcId, tgtId) {
  const s = canonicalStorymapId(srcId);
  const t = canonicalStorymapId(tgtId);
  if (!s || !t || s === t) return false;
  return !hasStorymapDirectedEdge(canvas?.edges, s, t);
}

/**
 * Returns a new edges array with at most one edge per (source, target); first occurrence wins.
 * Same rule as {@link normalizeStorymapCanvasState} (used on load/import/publish).
 */
function dedupeStorymapEdges(edges) {
  const edgeSeen = new Set();
  const list = Array.isArray(edges) ? edges : [];
  const out = [];
  list.forEach((edge) => {
    const source = canonicalStorymapId(edge?.source);
    const target = canonicalStorymapId(edge?.target);
    if (!source || !target || source === target) return;
    const k = `${source}\t${target}`;
    if (edgeSeen.has(k)) return;
    edgeSeen.add(k);
    out.push({
      source,
      target,
      label: normalizeStorymapTitleText(String(edge?.label || edge?.role || "")),
    });
  });
  return out;
}

/**
 * Builds adjacency lists for a directed graph (multi-edge safe; duplicates still traverse once per target).
 * @param {Array<{source: string, target: string}>} edges
 * @returns {Map<string, string[]>}
 */
function buildDirectedAdjacencyMap(edges) {
  const adj = new Map();
  if (!Array.isArray(edges)) return adj;
  edges.forEach((e) => {
    const s = canonicalStorymapId(e?.source);
    const t = canonicalStorymapId(e?.target);
    if (!s || !t || s === t) return;
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s).push(t);
  });
  return adj;
}

/**
 * BFS: nodes reachable from `startId` following directed edges (only ids in `allNodeIds`).
 * @param {string} startId
 * @param {Map<string, string[]>} adj
 * @param {Set<string>} allNodeIds
 * @returns {Set<string>}
 */
function reachableNodesFrom(startId, adj, allNodeIds) {
  const visited = new Set();
  if (!allNodeIds.has(startId)) return visited;
  const q = [startId];
  visited.add(startId);
  while (q.length) {
    const u = q.shift();
    const outs = adj.get(u);
    if (!outs) continue;
    outs.forEach((v) => {
      if (!allNodeIds.has(v) || visited.has(v)) return;
      visited.add(v);
      q.push(v);
    });
  }
  return visited;
}

/**
 * **Central / root candidates** for a directed story graph (not hardcoded):
 * - in-degree 0 (no incoming edges),
 * - at least one outgoing edge,
 * - from this node, BFS reaches **every** node in the graph (single origin spanning the map).
 *
 * Example: if **B** is the hub with edges B→A, B→C, B→D and nothing points into B, then B has in-degree 0,
 * out-degree ≥ 1, and BFS from B visits {A,B,C,D} — **B** is returned. Nodes with only incoming edges to B
 * are discovered from B, so B is the unique central root.
 *
 * @param {{ nodes: Array<{id: string}>, edges: Array<{source: string, target: string}> }} graph
 * @returns {string[]} All node ids that satisfy the definition; `[]` if none (e.g. pure cycle, or no universal root).
 */
function findCentralRootNodes(graph) {
  const nodes = graph?.nodes;
  const edges = graph?.edges;
  if (!Array.isArray(nodes) || !nodes.length) return [];
  const allNodeIds = new Set(nodes.map((n) => canonicalStorymapId(n?.id)).filter(Boolean));
  if (allNodeIds.size === 0) return [];
  const nTotal = allNodeIds.size;
  const edgeList = Array.isArray(edges) ? edges : [];
  const indegree = new Map();
  const outdegree = new Map();
  allNodeIds.forEach((id) => {
    indegree.set(id, 0);
    outdegree.set(id, 0);
  });
  edgeList.forEach((e) => {
    const s = canonicalStorymapId(e?.source);
    const t = canonicalStorymapId(e?.target);
    if (!allNodeIds.has(s) || !allNodeIds.has(t) || s === t) return;
    indegree.set(t, (indegree.get(t) || 0) + 1);
    outdegree.set(s, (outdegree.get(s) || 0) + 1);
  });
  const adj = buildDirectedAdjacencyMap(
    edgeList.filter((e) => {
      const s = canonicalStorymapId(e?.source);
      const t = canonicalStorymapId(e?.target);
      return allNodeIds.has(s) && allNodeIds.has(t) && s !== t;
    })
  );
  const roots = [];
  allNodeIds.forEach((id) => {
    if (indegree.get(id) !== 0) return;
    if ((outdegree.get(id) || 0) < 1) return;
    const reached = reachableNodesFrom(id, adj, allNodeIds);
    if (reached.size === nTotal) roots.push(id);
  });
  return roots;
}

/**
 * When no strict central root exists (in-degree 0 + full reach), pick **hub-like** entry node(s):
 * maximize out-degree (branching), then minimize in-degree, then maximize directed reach count.
 * Uniquely picks a star hub such as **B** when one node has strictly more outgoing edges than any other.
 */
function findStorymapHubEntryNodes(canvas) {
  const nodes = canvas?.nodes;
  const edges = canvas?.edges;
  if (!Array.isArray(nodes) || !nodes.length) return [];
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const indeg = new Map(ids.map((id) => [id, 0]));
  const outdeg = new Map(ids.map((id) => [id, 0]));
  (edges || []).forEach((e) => {
    const s = canonicalStorymapId(e?.source);
    const t = canonicalStorymapId(e?.target);
    if (!idSet.has(s) || !idSet.has(t) || s === t) return;
    outdeg.set(s, (outdeg.get(s) || 0) + 1);
    indeg.set(t, (indeg.get(t) || 0) + 1);
  });
  const maxOut = Math.max(0, ...ids.map((id) => outdeg.get(id) || 0));
  if (maxOut < 1) return [];
  let cand = ids.filter((id) => (outdeg.get(id) || 0) === maxOut);
  if (cand.length === 1) return cand;
  const minIn = Math.min(...cand.map((id) => indeg.get(id) || 0));
  cand = cand.filter((id) => (indeg.get(id) || 0) === minIn);
  if (cand.length === 1) return cand;
  const adj = buildDirectedAdjacencyMap(edges || []);
  const allIds = new Set(ids);
  const scored = cand.map((id) => ({ id, r: reachableNodesFrom(id, adj, allIds).size }));
  const maxR = Math.max(...scored.map((x) => x.r));
  return scored.filter((x) => x.r === maxR).map((x) => x.id);
}

/** Storymap canvas wrapper: dynamic central roots (see {@link findCentralRootNodes}). */
function getStorymapCentralRootIds(canvas) {
  return findCentralRootNodes({ nodes: canvas?.nodes || [], edges: canvas?.edges || [] });
}

/**
 * Nodes that start unlocked (full color): optional `entryNodeIds` in canvas JSON,
 * else **central root(s)** ({@link findCentralRootNodes}) when they exist — one or more origins that span the graph,
 * else **hub entry** ({@link findStorymapHubEntryNodes}) when non-empty (max out-degree heuristic),
 * else the union of **sources** and **sinks** (legacy fallback), else first node.
 *
 * **Directed unlock:** clicking node A reveals only targets of edges A → B (see `getOutgoingStorymapNeighbors`).
 * Override with `entryNodeIds` in JSON if you need a custom set.
 */
function getStorymapEntryNodeIds(canvas) {
  if (!canvas?.nodes?.length) return [];
  const valid = new Set(canvas.nodes.map((n) => n.id));
  if (Array.isArray(canvas.entryNodeIds) && canvas.entryNodeIds.length) {
    const picked = canvas.entryNodeIds.map((id) => canonicalStorymapId(id)).filter((id) => id && valid.has(id));
    if (picked.length) return picked;
  }
  const central = findCentralRootNodes(canvas);
  if (central.length) return central;
  const hub = findStorymapHubEntryNodes(canvas);
  if (hub.length) return hub;
  const ids = canvas.nodes.map((n) => n.id);
  const incoming = new Set();
  const outgoing = new Set();
  canvas.edges.forEach((e) => {
    incoming.add(e.target);
    outgoing.add(e.source);
  });
  const sources = ids.filter((id) => !incoming.has(id));
  const sinks = ids.filter((id) => !outgoing.has(id));
  const union = [...new Set([...sources, ...sinks])];
  if (union.length) return union;
  return [ids[0]];
}

/** Directed next step: targets of edges leaving `nodeId` (unlock by clicking forward along arrows). */
function getOutgoingStorymapNeighbors(canvas, nodeId) {
  const nid = canonicalStorymapId(nodeId);
  const out = [];
  canvas.edges.forEach((e) => {
    if (canonicalStorymapId(e.source) === nid) out.push(e.target);
  });
  return out;
}

function storymapGraphSignature(canvas) {
  if (!canvas?.nodes?.length) return "";
  const ids = canvas.nodes.map((n) => n.id).sort();
  const es = canvas.edges.map((e) => `${e.source}\t${e.target}`).sort();
  const ent = Array.isArray(canvas.entryNodeIds) ? [...canvas.entryNodeIds].sort().join(",") : "";
  return `${ids.join(",")}|e:${es.join(",")}|entry:${ent}|rule:centralOrHubOrSourcesSinks-out`;
}

/**
 * Loads viewer unlock/visit progress. If stored `graphSig` does not match the current canvas,
 * progress is reset (avoids stale IDs/coords after a publish or import). Cross-browser “sync”
 * is not possible with localStorage—each browser has its own partition.
 */
function loadStorymapViewerProgressForCanvas(canvas, storageKey = STORYMAP_PROGRESS_KEY) {
  const sig = storymapGraphSignature(canvas);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { unlocked: [], visited: [], hadGraphSigMismatch: false };
    const p = JSON.parse(raw);
    const storedSig = p?.graphSig;
    if (storedSig && sig && storedSig !== sig) {
      return { unlocked: [], visited: [], hadGraphSigMismatch: true };
    }
    return {
      unlocked: Array.isArray(p?.unlocked) ? p.unlocked : [],
      visited: Array.isArray(p?.visited) ? p.visited : [],
      hadGraphSigMismatch: false,
    };
  } catch {
    return { unlocked: [], visited: [], hadGraphSigMismatch: false };
  }
}

function saveStorymapViewerProgress(
  unlockedArr,
  visitedArr,
  graphSig = null,
  storageKey = STORYMAP_PROGRESS_KEY
) {
  try {
    const payload = { unlocked: [...unlockedArr], visited: [...visitedArr] };
    if (graphSig) payload.graphSig = graphSig;
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function loadStorymapCanvasState() {
  try {
    const isAdminCanvas = MODE === "admin";
    const fallback = isAdminCanvas ? defaultStorymapAdminCanvasState() : defaultStorymapCanvasState();
    if (!isAdminCanvas) {
      const publishedRaw = localStorage.getItem(STORYMAP_CANVAS_PUBLIC_KEY);
      if (publishedRaw) return normalizeStorymapCanvasState(JSON.parse(publishedRaw), fallback);
      return normalizeStorymapCanvasState(PUBLISHED_STORYMAP_CANVAS, fallback);
    }
    // Admin: prefer draft key, then fall back to whatever the public viewer last used.
    const raw = localStorage.getItem(STORYMAP_CANVAS_ADMIN_KEY) || localStorage.getItem(STORYMAP_CANVAS_PUBLIC_KEY);
    if (!raw) return normalizeStorymapCanvasState(fallback, fallback);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return normalizeStorymapCanvasState(fallback, fallback);
    }
    return normalizeStorymapCanvasState(parsed, fallback);
  } catch {
    const fallback = MODE === "admin" ? defaultStorymapAdminCanvasState() : defaultStorymapCanvasState();
    return normalizeStorymapCanvasState(fallback, fallback);
  }
}

function saveStorymapCanvasState(payload) {
  try {
    const normalized = normalizeStorymapCanvasState(payload, defaultStorymapCanvasState());
    const serialized = JSON.stringify(normalized);
    if (MODE === "admin") {
      localStorage.setItem(STORYMAP_CANVAS_ADMIN_KEY, serialized);
      // Keep public cache in sync so storymap.html shows the same canvas without a separate publish step.
      localStorage.setItem(STORYMAP_CANVAS_PUBLIC_KEY, serialized);
      return;
    }
    localStorage.setItem(STORYMAP_CANVAS_PUBLIC_KEY, serialized);
  } catch {
    // ignore
  }
}

function publishStorymapCanvasState(payload) {
  const normalized = normalizeStorymapCanvasState(payload, defaultStorymapCanvasState());
  try {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(STORYMAP_CANVAS_PUBLIC_KEY, serialized);
    localStorage.setItem(STORYMAP_CANVAS_RELEASE_KEY, PUBLISHED_STORYMAP_RELEASE);
  } catch (err) {
    // Quota errors should not block repo-backed publish.
    console.warn("Could not cache published canvas locally:", err);
  }
  return normalized;
}

function githubApiUrlForPath(pathname) {
  const cleanPath = String(pathname || "").replace(/^\/+/, "");
  return `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${cleanPath}`;
}

function utf8ToBase64(input) {
  const bytes = new TextEncoder().encode(String(input || ""));
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function parseGithubError(response) {
  let detail = "";
  try {
    const data = await response.json();
    if (data && typeof data.message === "string") detail = data.message;
    if (data && Array.isArray(data.errors) && data.errors.length) {
      const extra = data.errors
        .map((entry) => (typeof entry === "string" ? entry : entry?.message || JSON.stringify(entry)))
        .filter(Boolean)
        .join("; ");
      if (extra) detail = detail ? `${detail} (${extra})` : extra;
    }
  } catch {
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
  }
  return detail || response.statusText || "Unknown GitHub API error";
}

function githubAuthHeaders(token, scheme) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `${scheme} ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getGithubFileSha(pathname, token, scheme = "Bearer") {
  const bust = `ref=${encodeURIComponent(GITHUB_REPO_BRANCH)}&_=${Date.now()}`;
  const response = await fetch(`${githubApiUrlForPath(pathname)}?${bust}`, {
    method: "GET",
    headers: githubAuthHeaders(token, scheme),
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await parseGithubError(response);
    throw new Error(`GitHub file lookup failed (${response.status}): ${detail || response.statusText}`);
  }
  const json = await response.json();
  return json && typeof json.sha === "string" ? json.sha : null;
}

async function publishStorymapCanvasToGithubWithScheme(payload, token, commitMessage, scheme, isRetry = false) {
  if (!token) throw new Error("GitHub token is required.");
  const normalized = normalizeStorymapCanvasState(payload, defaultStorymapCanvasState());
  const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
  const sha = await getGithubFileSha(GITHUB_PUBLISHED_CANVAS_PATH, token, scheme);
  const body = {
    message: commitMessage || `Publish storymap from admin (${new Date().toISOString()})`,
    content: utf8ToBase64(serialized),
    branch: GITHUB_REPO_BRANCH,
  };
  if (sha) body.sha = sha;
  const response = await fetch(githubApiUrlForPath(GITHUB_PUBLISHED_CANVAS_PATH), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...githubAuthHeaders(token, scheme),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (response.status === 409 && !isRetry) {
    await response.text().catch(() => {});
    return publishStorymapCanvasToGithubWithScheme(payload, token, commitMessage, scheme, true);
  }
  if (!response.ok) {
    const detail = await parseGithubError(response);
    throw new Error(`GitHub publish failed (${response.status}): ${detail || response.statusText}`);
  }
  return normalized;
}

async function publishStorymapCanvasToGithub(payload, token, commitMessage) {
  try {
    return await publishStorymapCanvasToGithubWithScheme(payload, token, commitMessage, "Bearer");
  } catch (err) {
    const message = String(err?.message || "");
    const shouldRetryWithToken = /\(401\)|\(403\)|Bad credentials|Requires authentication/i.test(message);
    if (!shouldRetryWithToken) throw err;
    return publishStorymapCanvasToGithubWithScheme(payload, token, commitMessage, "token");
  }
}

async function loadPublishedStorymapFromRepo() {
  const response = await fetch(`./${GITHUB_PUBLISHED_CANVAS_PATH}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Published storymap fetch failed (${response.status})`);
  const payload = await response.json();
  return normalizeStorymapCanvasState(payload, defaultStorymapCanvasState());
}

/**
 * Point where a ray from (ax,ay) toward (bx,by) exits the axis-aligned rect [left,top]+(w,h).
 * Used so edge dashes start/end at node bounds instead of vanishing under nodes.
 */
function rayExitRectToward(ax, ay, bx, by, left, top, w, h) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-9;
  const ux = dx / len;
  const uy = dy / len;
  const right = left + w;
  const bottom = top + h;
  let tMin = Infinity;
  const tryT = (t) => {
    if (t > 1e-6 && Number.isFinite(t)) tMin = Math.min(tMin, t);
  };
  if (ux > 1e-8) tryT((right - ax) / ux);
  if (ux < -1e-8) tryT((left - ax) / ux);
  if (uy > 1e-8) tryT((bottom - ay) / uy);
  if (uy < -1e-8) tryT((top - ay) / uy);
  if (!Number.isFinite(tMin) || tMin <= 0) return { x: ax, y: ay };
  return { x: ax + ux * tMin, y: ay + uy * tMin };
}

/** Proportional on-canvas size for an image node from natural dimensions (chic, bounded). */
function computeStorymapImageNodeSize(nw, nh) {
  const iw = Math.max(1, Number(nw) || 1);
  const ih = Math.max(1, Number(nh) || 1);
  const maxSide = 232;
  const minShort = 92;
  const scale = Math.min(1, maxSide / Math.max(iw, ih));
  let dw = Math.round(iw * scale);
  let dh = Math.round(ih * scale);
  const shortSide = Math.min(dw, dh);
  if (shortSide < minShort) {
    const boost = minShort / shortSide;
    dw = Math.round(dw * boost);
    dh = Math.round(dh * boost);
  }
  const longSide = Math.max(dw, dh);
  if (longSide > maxSide + 24) {
    const shrink = (maxSide + 24) / longSide;
    dw = Math.round(dw * shrink);
    dh = Math.round(dh * shrink);
  }
  return { w: dw, h: dh };
}

function initCustomStorymapCanvas() {
  const viewport = document.getElementById("storymapViewport");
  const world = document.getElementById("storymapWorld");
  const nodesLayer = document.getElementById("storymapNodes");
  const edgesSvg = document.getElementById("storymapEdges");
  const panel = document.getElementById("storymapAdminPanel");
  if (!viewport || !world || !nodesLayer || !edgesSvg) {
    setStatus("");
    return false;
  }

  const isAdmin = MODE === "admin";
  if (isAdmin) {
    viewport.style.minHeight = "70vh";
    viewport.style.height = "70vh";
    world.style.minHeight = "100%";
    if (panel) panel.style.minHeight = "70vh";
    const canvasPanel = document.getElementById("storymapCanvasPanel");
    if (canvasPanel) canvasPanel.style.minHeight = "70vh";
  }
  let canvas = loadStorymapCanvasState();
  let selectedId = null;
  let view = { scale: 1, panX: 0, panY: 0 };
  let panDraft = null;
  let nodeDragDraft = null;
  let previewAsUser = false;
  /** Real viewer progress vs admin preview (separate localStorage keys). */
  const progressStorageKey = () =>
    isAdmin && previewAsUser ? STORYMAP_PROGRESS_PREVIEW_KEY : STORYMAP_PROGRESS_KEY;
  const createConnectSelect = document.getElementById("smCreateConnectTo");
  const previewToggle = document.getElementById("smPreviewAsUser");

  const pruneIdsToCanvas = (idSet) => {
    const valid = new Set(canvas.nodes.map((n) => n.id));
    return new Set([...idSet].filter((id) => valid.has(id)));
  };

  const mergeViewerProgress = () => {
    const key = progressStorageKey();
    const entryNodeIds = getStorymapEntryNodeIds(canvas);
    const progress = loadStorymapViewerProgressForCanvas(canvas, key);
    viewerUnlocked = pruneIdsToCanvas(new Set([...entryNodeIds, ...progress.unlocked]));
    viewerVisited = pruneIdsToCanvas(new Set(progress.visited));
    if (progress.hadGraphSigMismatch) {
      saveStorymapViewerProgress([...viewerUnlocked], [...viewerVisited], storymapGraphSignature(canvas), key);
    }
  };

  let viewerUnlocked = new Set();
  let viewerVisited = new Set();
  const pendingEdgeAnim = new Set();

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isViewerLike = () => !isAdmin || previewAsUser;

  const labelInput = document.getElementById("smNodeLabel");
  const textInput = document.getElementById("smNodeText");
  const createTypeInput = document.getElementById("smCreateType");
  const createLabelInput = document.getElementById("smCreateLabel");
  const createTextInput = document.getElementById("smCreateText");
  const createColorInput = document.getElementById("smCreateColor");
  const createNodeBtn = document.getElementById("smCreateNodeBtn");
  const imageFileInput = document.getElementById("smNodeImageFile");
  const linkTargetSelect = document.getElementById("smLinkTarget");
  const colorSelect = document.getElementById("smNodeColor");
  const publishBtn = document.getElementById("smPublishCanvasBtn");
  const githubTokenInput = document.getElementById("smGithubToken");
  const publishCommitMessageInput = document.getElementById("smPublishCommitMessage");
  const publishHelp = document.getElementById("smPublishHelp");
  const saveBtn = document.getElementById("smSaveNode");
  const addChildBtn = document.getElementById("smAddChildNode");
  const linkExistingBtn = document.getElementById("smLinkExisting");
  const deleteNodeBtn = document.getElementById("smDeleteNode");
  const zoomInBtn = document.getElementById("smZoomIn");
  const zoomOutBtn = document.getElementById("smZoomOut");
  const infoPanel = document.getElementById("smInfoPanel");
  const infoTitle = document.getElementById("smInfoTitle");
  const infoImage = document.getElementById("smInfoImage");
  const infoBody = document.getElementById("smInfoBody");
  const infoMediaWrap = document.getElementById("smInfoMediaWrap");
  const infoCloseBtn = document.getElementById("smInfoClose");

  /** Keep the viewer node info sheet between sticky header + fixed footer (viewport coords). */
  const applySmInfoPanelSafeInsets = () => {
    const root = document.documentElement;
    const nav = document.querySelector(".siteNav");
    const footer = document.querySelector(".stickyFooterLinks");
    const gap = 10;
    let topPx = gap;
    let bottomPx = gap;
    if (nav) {
      const r = nav.getBoundingClientRect();
      topPx = Math.max(gap, r.bottom + gap);
    }
    if (footer) {
      const r = footer.getBoundingClientRect();
      bottomPx = Math.max(gap, window.innerHeight - r.top + gap);
    }
    root.style.setProperty("--sm-info-panel-top", `${Math.round(topPx)}px`);
    root.style.setProperty("--sm-info-panel-bottom", `${Math.round(bottomPx)}px`);
  };

  const getNodeLabel = (node) => {
    const explicit = String(node?.label || "").trim();
    if (explicit) return normalizeStorymapTitleText(explicit);
    if (node?.type === "image") return "";
    return normalizeStorymapTitleText(String(node?.content || "").trim());
  };
  const getNodeText = (node) => normalizeStorymapBodyText(String(node?.text || ""));
  const getNodeImageSrc = (node) => String(node?.imageSrc || node?.content || "").trim();

  const storymapCanvasLabelKey = (node) => {
    const fromLabel = String(node?.label || "").trim();
    if (fromLabel) return fromLabel;
    return String(node?.content || "").trim();
  };
  const getStorymapCanvasI18nPack = (node) => {
    if (typeof STORYMAP_CANVAS_NODE_I18N === "undefined" || currentLang === "en") return null;
    const langMap = STORYMAP_CANVAS_NODE_I18N[currentLang];
    if (!langMap) return null;
    return langMap[storymapCanvasLabelKey(node)] || null;
  };
  const getStorymapCanvasDisplayLabel = (node, baseLabel) => {
    if (!isViewerLike() || currentLang === "en") return baseLabel;
    const pack = getStorymapCanvasI18nPack(node);
    if (pack && pack.label) return pack.label;
    return baseLabel;
  };
  const getStorymapCanvasDisplayText = (node, baseText) => {
    if (!isViewerLike() || currentLang === "en") return baseText;
    const pack = getStorymapCanvasI18nPack(node);
    if (pack && pack.text) return pack.text;
    return baseText;
  };

  const updateWorldTransform = () => {
    world.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.scale})`;
  };

  const screenToWorld = (clientX, clientY) => {
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.panX) / view.scale,
      y: (clientY - rect.top - view.panY) / view.scale,
    };
  };

  /**
   * Node box in world (storymap) coordinates — matches `node.x` / `node.y` space inside `#storymapWorld`.
   * Uses getBoundingClientRect + screenToWorld so edges align even when offsetParent ≠ `#storymapNodes`.
   */
  const nodeWorldRectFromEl = (el) => {
    const r = el.getBoundingClientRect();
    const tl = screenToWorld(r.left, r.top);
    const tr = screenToWorld(r.right, r.top);
    const bl = screenToWorld(r.left, r.bottom);
    const br = screenToWorld(r.right, r.bottom);
    const xs = [tl.x, tr.x, bl.x, br.x];
    const ys = [tl.y, tr.y, bl.y, br.y];
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const w = Math.max(1, right - left);
    const h = Math.max(1, bottom - top);
    return { left, top, w, h, cx: (left + right) / 2, cy: (top + bottom) / 2 };
  };

  /**
   * Grow the world + edge SVG to cover every node in world px. Otherwise the SVG viewport
   * stays viewport-sized and clips <line> coordinates past ~1400px — edges look "stubby".
   */
  const syncStorymapSheetExtent = () => {
    const vr = Math.max(1, viewport.clientWidth || 0);
    const vh = Math.max(1, viewport.clientHeight || 0);
    const nodes = nodesLayer.querySelectorAll(".smNode");
    if (!nodes.length) {
      world.style.minWidth = "";
      world.style.minHeight = "";
      nodesLayer.style.minWidth = "";
      nodesLayer.style.minHeight = "";
      edgesSvg.style.width = "";
      edgesSvg.style.height = "";
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach((el) => {
      const r = nodeWorldRectFromEl(el);
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.left + r.w);
      maxY = Math.max(maxY, r.top + r.h);
    });
    if (!Number.isFinite(minX)) return;
    const pad = 280;
    const w = Math.max(vr, maxX - Math.min(0, minX) + pad);
    const h = Math.max(vh, maxY - Math.min(0, minY) + pad);
    const cw = Math.ceil(w);
    const ch = Math.ceil(h);
    world.style.minWidth = `${cw}px`;
    world.style.minHeight = `${ch}px`;
    nodesLayer.style.minWidth = `${cw}px`;
    nodesLayer.style.minHeight = `${ch}px`;
    edgesSvg.style.width = `${cw}px`;
    edgesSvg.style.height = `${ch}px`;
  };

  const getNodeByIdLocal = (id) => canvas.nodes.find((n) => n.id === id) || null;
  const readGithubToken = () => String(githubTokenInput?.value || "").trim();
  const storeGithubToken = (tokenValue) => {
    try {
      if (!tokenValue) localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
      else localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, tokenValue);
    } catch {
      // ignore
    }
  };
  const loadStoredGithubToken = () => {
    try {
      let t = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
      if (!t) {
        const legacy = sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
        if (legacy) {
          localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, legacy);
          sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
          t = legacy;
        }
      }
      return t;
    } catch {
      return "";
    }
  };
  if (isAdmin && githubTokenInput) {
    const cachedToken = loadStoredGithubToken();
    if (cachedToken) githubTokenInput.value = cachedToken;
    const persistTokenField = () => storeGithubToken(readGithubToken());
    on(githubTokenInput, "input", persistTokenField);
    on(githubTokenInput, "change", persistTokenField);
    on(githubTokenInput, "blur", persistTokenField);
    const clearTokenBtn = document.getElementById("smClearGithubToken");
    on(clearTokenBtn, "click", () => {
      try {
        localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
      } catch {
        // ignore
      }
      if (githubTokenInput) githubTokenInput.value = "";
      if (publishHelp) publishHelp.textContent = "Saved PAT cleared from this browser.";
    });
  }

  /**
   * World-space AABB for camera fitting: uses node x/y plus estimated body size
   * (same rules as DOM layout). Fixed padding alone was too small once graphs spread out.
   */
  const estimateStorymapNodeFootprint = (node) => {
    const x = Number(node.x) || 0;
    const y = Number(node.y) || 0;
    if (node.type === "image") {
      let nw = 256;
      let nh = 256;
      const { w, h } = computeStorymapImageNodeSize(nw, nh);
      const hasCaption = Boolean(getNodeLabel(node));
      const extraCaption = hasCaption ? 48 : 0;
      return { minX: x, minY: y, maxX: x + w, maxY: y + h + extraCaption };
    }
    if (node.type === "text") {
      const baseLbl = getNodeLabel(node);
      const mw = Math.min(290, Math.max(112, 88 + Math.min(220, baseLbl.length * 2.8)));
      const body = String(node.text || "");
      const approxLines = Math.max(1, Math.ceil(body.length / 38));
      const hh = Math.min(240, Math.max(56, approxLines * 18 + 44));
      return { minX: x, minY: y, maxX: x + Math.round(mw), maxY: y + Math.round(hh) };
    }
    const sz = 58;
    return { minX: x, minY: y, maxX: x + sz, maxY: y + sz };
  };

  const fitViewToNodes = () => {
    if (!canvas.nodes.length) return;
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    canvas.nodes.forEach((n) => {
      const b = estimateStorymapNodeFootprint(n);
      minX = Math.min(minX, b.minX);
      maxX = Math.max(maxX, b.maxX);
      minY = Math.min(minY, b.minY);
      maxY = Math.max(maxY, b.maxY);
    });
    const margin = 96;
    const graphWidth = Math.max(160, maxX - minX + margin * 2);
    const graphHeight = Math.max(160, maxY - minY + margin * 2);
    const rawFit = Math.min(width / graphWidth, height / graphHeight);
    // Allow zooming out enough for wide graphs on narrow screens (do not clamp to 0.6).
    const fittedScale = Math.min(1.4, Math.max(0.08, rawFit));
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    view.scale = fittedScale;
    view.panX = width / 2 - graphCenterX * fittedScale;
    view.panY = height / 2 - graphCenterY * fittedScale;
  };

  const syncCreateConnectOptions = () => {
    if (!createConnectSelect || !isAdmin) return;
    const preserve = createConnectSelect.value;
    createConnectSelect.innerHTML = [
      `<option value="">${escapeHtml(t("adminNoneNoLink"))}</option>`,
      ...canvas.nodes.map(
        (n) => `<option value="${escapeHtml(n.id)}">${escapeHtml(getNodeLabel(n) || n.id)}</option>`
      ),
    ].join("");
    if (preserve && canvas.nodes.some((n) => n.id === preserve)) {
      createConnectSelect.value = preserve;
    } else {
      // Do not mirror the canvas selection here — linking uses the Node Editor only;
      // defaulting "from" to selected made every selected node look like a "parent" for create.
      createConnectSelect.value = "";
    }
  };

  const saveViewerState = () => {
    if (!isViewerLike()) return;
    saveStorymapViewerProgress(
      [...viewerUnlocked],
      [...viewerVisited],
      storymapGraphSignature(canvas),
      progressStorageKey()
    );
  };

  const nodeElById = (nodeId) =>
    nodesLayer.querySelector(`.smNode[data-id="${String(nodeId).replace(/"/g, '\\"')}"]`);

  const runUnlockAnim = (el, parentId, nid, edgeKey, opts = {}) => {
    const { updateProgress = true, onFinish = null, deferDomFinish = false } = opts;
    const parent = getNodeByIdLocal(parentId);
    const node = getNodeByIdLocal(nid);
    if (!el || !parent || !node) {
      if (typeof onFinish === "function") onFinish();
      return;
    }

    const runSteps = () => {
      const cs = getComputedStyle(el);
      const opParsed = parseFloat(cs.opacity);
      const opStr = String(Number.isFinite(opParsed) ? opParsed : 0.52);
      el.classList.add("smNode--unlocking");
      el.style.transition = "none";
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.transform = "scale(0.94)";
      el.style.opacity = opStr;
      const imgEl = el.querySelector("img");
      if (imgEl) {
        imgEl.style.transition = "none";
        imgEl.style.filter = "grayscale(1) saturate(0.65)";
        el.style.filter = "none";
      } else {
        el.style.filter = "grayscale(1) saturate(0.55)";
      }
      el.classList.remove("smNode--locked");
      void el.offsetWidth;

      const ease = "cubic-bezier(0.45, 0, 0.55, 1)";
      const durMs = 300;
      const dur = prefersReducedMotion() ? "0.01ms" : `${durMs}ms`;

      el.style.transition = [
        `transform ${dur} ${ease}`,
        `opacity ${dur} ${ease}`,
        imgEl ? "" : `filter ${dur} ${ease}`,
      ]
        .filter(Boolean)
        .join(", ");
      if (imgEl) {
        imgEl.style.transition = `filter ${dur} ${ease}`;
      }
      el.style.transform = "scale(1)";
      el.style.opacity = "1";
      if (imgEl) {
        imgEl.style.filter = "grayscale(0) saturate(1)";
      } else {
        el.style.filter = "none";
      }

      const structuralFinish = () => {
        pendingEdgeAnim.delete(edgeKey);
        if (updateProgress) {
          viewerUnlocked.add(nid);
          saveViewerState();
        }
        if (typeof onFinish === "function") onFinish();
        else renderCanvas();
      };

      const finish = () => {
        el.classList.remove("smNode--unlocking");
        el.style.transition = "";
        el.style.transform = "";
        el.style.opacity = "";
        el.style.filter = "";
        if (imgEl) {
          imgEl.style.transition = "";
          imgEl.style.filter = "";
        }
        structuralFinish();
      };

      if (prefersReducedMotion()) {
        finish();
        return;
      }

      let done = false;
      let fallbackTimer = null;
      const cleanup = () => {
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        el.removeEventListener("transitionend", onElTrans);
        if (imgEl) imgEl.removeEventListener("transitionend", onImgTrans);
      };
      const safeFinish = () => {
        if (done) return;
        done = true;
        cleanup();
        if (deferDomFinish) {
          structuralFinish();
        } else {
          finish();
        }
      };

      let remaining = imgEl ? 2 : 1;
      const bump = () => {
        remaining -= 1;
        if (remaining <= 0) safeFinish();
      };
      const onElTrans = (evt) => {
        if (evt.target !== el) return;
        if (evt.propertyName !== "transform") return;
        bump();
      };
      const onImgTrans = (evt) => {
        if (!imgEl || evt.target !== imgEl) return;
        if (evt.propertyName !== "filter" && evt.propertyName !== "-webkit-filter") return;
        bump();
      };
      el.addEventListener("transitionend", onElTrans);
      if (imgEl) imgEl.addEventListener("transitionend", onImgTrans);

      fallbackTimer = window.setTimeout(safeFinish, durMs + 80);
    };

    if (prefersReducedMotion()) {
      runSteps();
      return;
    }
    requestAnimationFrame(runSteps);
  };

  /**
   * Single timeline for all outgoing edges from a click (no per-neighbor stagger).
   * Keep numbers aligned with `storymap.css` overlay duration (`--sm-edge-overlay-dur`).
   */
  const queueNeighborUnlockAnimations = (clickedId) => {
    if (!isViewerLike()) return;
    const neighbors = getOutgoingStorymapNeighbors(canvas, clickedId).filter((nid) => !viewerUnlocked.has(nid));
    if (!neighbors.length) return;
    if (prefersReducedMotion()) {
      neighbors.forEach((id) => viewerUnlocked.add(id));
      saveViewerState();
      renderCanvas();
      return;
    }

    const LINE_DELAY_MS = 72;
    const EDGE_OVERLAY_MS = 980;
    const TARGET_GLOW_MS = 120;

    const parentEl = nodeElById(clickedId);
    let waveActive = 0;

    const waveDone = () => {
      waveActive -= 1;
      if (waveActive <= 0) {
        requestAnimationFrame(() => {
          neighbors.forEach((nid) => {
            const el = nodeElById(nid);
            if (!el) return;
            const imgEl = el.querySelector("img");
            el.classList.remove("smNode--unlocking");
            el.style.transition = "";
            el.style.transform = "";
            el.style.opacity = "";
            el.style.filter = "";
            if (imgEl) {
              imgEl.style.transition = "";
              imgEl.style.filter = "";
            }
          });
          renderCanvas();
        });
      }
    };

    const startUnlockPhase = () => {
      neighbors.forEach((nid) => {
        const el = nodeElById(nid);
        const ek = storymapEdgeKey(clickedId, nid);
        waveActive += 1;
        runUnlockAnim(el, clickedId, nid, ek, {
          updateProgress: true,
          onFinish: waveDone,
          deferDomFinish: true,
        });
      });
    };

    const onLineComplete = () => {
      if (parentEl) parentEl.classList.remove("smNode--edgeGlowSource");
      neighbors.forEach((nid) => {
        const el = nodeElById(nid);
        if (el) el.classList.add("smNode--edgeGlowTarget");
      });
      window.setTimeout(() => {
        neighbors.forEach((nid) => {
          const el = nodeElById(nid);
          if (el) el.classList.remove("smNode--edgeGlowTarget");
        });
        startUnlockPhase();
      }, TARGET_GLOW_MS);
    };

    const beginLineDraw = () => {
      neighbors.forEach((nid) => {
        pendingEdgeAnim.add(storymapEdgeKey(clickedId, nid));
      });
      drawEdges();
    };

    if (parentEl) parentEl.classList.add("smNode--edgeGlowSource");

    window.setTimeout(() => {
      beginLineDraw();
      window.setTimeout(onLineComplete, EDGE_OVERLAY_MS);
    }, LINE_DELAY_MS);
  };

  const syncPanel = () => {
    const node = selectedId ? getNodeByIdLocal(selectedId) : null;
    if (!isAdmin && infoPanel) {
      if (!node) {
        if (infoImage) {
          infoImage.removeAttribute("src");
          infoImage.alt = "";
          infoImage.classList.remove("smInfoImage--enter");
        }
        if (infoMediaWrap) infoMediaWrap.hidden = true;
        infoPanel.classList.remove("smInfoPanel--withImage");
        infoPanel.style.width = "";
        try {
          document.documentElement.style.removeProperty("--sm-info-panel-top");
          document.documentElement.style.removeProperty("--sm-info-panel-bottom");
        } catch {
          // ignore
        }
        if (infoTitle) {
          infoTitle.textContent = "";
          infoTitle.hidden = false;
        }
        if (infoBody) {
          infoBody.textContent = "";
          infoBody.hidden = false;
        }
        infoPanel.setAttribute("aria-hidden", "true");
      } else {
        applySmInfoPanelSafeInsets();
        const baseLabel = getNodeLabel(node);
        const baseBody = getNodeText(node);
        const label = getStorymapCanvasDisplayLabel(node, baseLabel);
        const bodyText = getStorymapCanvasDisplayText(node, baseBody);
        const imageSrc = getNodeImageSrc(node);
        const showImageSidebar = node.type === "image" && Boolean(imageSrc);

        if (infoTitle) {
          infoTitle.textContent = label;
          infoTitle.hidden = !label;
          applyTextDirToNode(infoTitle);
        }
        if (infoBody) {
          infoBody.textContent = bodyText;
          infoBody.hidden = !bodyText;
          applyTextDirToNode(infoBody);
        }

        const setInfoPanelWidth = (nw, nh) => {
          const vw = window.innerWidth;
          const half = Math.round(vw * 0.5);
          const cap = Math.max(200, vw - 24);
          let px;
          if (showImageSidebar && nw > 0 && nh > 0) {
            const ar = nw / nh;
            px = Math.min(cap, Math.max(half, Math.min(640, Math.max(288, 268 + Math.min(200, ar * 95)))));
          } else {
            const len = Math.max(baseBody.length, baseLabel.length);
            px = Math.min(cap, Math.max(half, Math.min(520, Math.max(272, 260 + Math.min(160, len * 1.6)))));
          }
          infoPanel.style.width = `${Math.round(px)}px`;
        };

        if (showImageSidebar && infoImage && infoMediaWrap) {
          infoMediaWrap.hidden = false;
          infoPanel.classList.add("smInfoPanel--withImage");
          infoImage.alt = "";
          infoImage.classList.remove("smInfoImage--enter");

          const onDecoded = () => {
            if (infoImage.naturalWidth && infoImage.naturalHeight) {
              setInfoPanelWidth(infoImage.naturalWidth, infoImage.naturalHeight);
            } else {
              setInfoPanelWidth(256, 256);
            }
            if (prefersReducedMotion()) {
              infoImage.classList.add("smInfoImage--enter");
              return;
            }
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                infoImage.classList.add("smInfoImage--enter");
              });
            });
          };

          infoImage.src = imageSrc;
          const runDecode = () => {
            if (typeof infoImage.decode === "function") {
              infoImage
                .decode()
                .then(onDecoded)
                .catch(() => onDecoded());
            } else {
              onDecoded();
            }
          };
          if (infoImage.complete && infoImage.naturalWidth) {
            runDecode();
          } else {
            infoImage.onload = () => {
              infoImage.onload = null;
              runDecode();
            };
          }
        } else {
          if (infoMediaWrap) infoMediaWrap.hidden = true;
          if (infoImage) {
            infoImage.removeAttribute("src");
            infoImage.alt = "";
            infoImage.classList.remove("smInfoImage--enter");
          }
          infoPanel.classList.remove("smInfoPanel--withImage");
          setInfoPanelWidth(0, 0);
        }

        infoPanel.setAttribute("aria-hidden", "false");
      }
    }
    if (!panel || !node || !isAdmin) {
      if (!panel) return;
      panel.classList.remove("storymapAdminPanel--open");
      panel.setAttribute("aria-hidden", "true");
      if (isAdmin) syncCreateConnectOptions();
      return;
    }
    panel.classList.add("storymapAdminPanel--open");
    panel.setAttribute("aria-hidden", "false");
    if (labelInput) labelInput.value = getNodeLabel(node);
    if (textInput) textInput.value = getNodeText(node);
    if (linkTargetSelect) {
      const options = canvas.nodes
        .filter((n) => n.id !== node.id)
        .map((n) => `<option value="${escapeHtml(n.id)}">${escapeHtml(getNodeLabel(n) || n.id)}</option>`)
        .join("");
      linkTargetSelect.innerHTML = options;
    }
    if (colorSelect) colorSelect.value = node.color || "green";
    if (imageFileInput) imageFileInput.value = "";
    syncCreateConnectOptions();
  };

  const drawEdges = () => {
    edgesSvg.querySelectorAll("line").forEach((ln) => ln.remove());
    const nodeEls = new Map();
    nodesLayer.querySelectorAll(".smNode").forEach((elNode) => {
      nodeEls.set(elNode.getAttribute("data-id"), elNode);
    });
    syncStorymapSheetExtent();
    const worldRectById = new Map();
    const getWorldRect = (id, el) => {
      if (worldRectById.has(id)) return worldRectById.get(id);
      const box = nodeWorldRectFromEl(el);
      worldRectById.set(id, box);
      return box;
    };
    // Always draw every edge (dashed base lines). Unlock state still affects nodes; hiding
    // edges by unlock step made dense graphs look "missing" lines from hubs to many leaves.
    canvas.edges.forEach((edge) => {
      const ek = storymapEdgeKey(edge.source, edge.target);
      const source = nodeEls.get(edge.source);
      const target = nodeEls.get(edge.target);
      if (!source || !target) return;
      const ra = getWorldRect(edge.source, source);
      const rb = getWorldRect(edge.target, target);
      const x1c = ra.cx;
      const y1c = ra.cy;
      const x2c = rb.cx;
      const y2c = rb.cy;
      const p1 = rayExitRectToward(x1c, y1c, x2c, y2c, ra.left, ra.top, ra.w, ra.h);
      const p2 = rayExitRectToward(x2c, y2c, x1c, y1c, rb.left, rb.top, rb.w, rb.h);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(p1.x));
      line.setAttribute("y1", String(p1.y));
      line.setAttribute("x2", String(p2.x));
      line.setAttribute("y2", String(p2.y));
      line.setAttribute("data-sm-edge-key", ek);
      edgesSvg.appendChild(line);

      // Solid overlay that fades away, revealing dashed base line underneath.
      if (pendingEdgeAnim.has(ek)) {
        const overlay = document.createElementNS("http://www.w3.org/2000/svg", "line");
        overlay.setAttribute("x1", String(p1.x));
        overlay.setAttribute("y1", String(p1.y));
        overlay.setAttribute("x2", String(p2.x));
        overlay.setAttribute("y2", String(p2.y));
        overlay.setAttribute("data-sm-edge-key", ek);
        overlay.setAttribute("data-sm-edge-overlay", "1");
        overlay.classList.add("storymapEdgeOverlay--fade");
        edgesSvg.appendChild(overlay);
      }
    });
  };

  /** After layout, fit the camera to real DOM boxes (images, captions, wrapped text). */
  const fitViewToRenderedNodes = () => {
    if (!canvas.nodes.length) return;
    const nodes = nodesLayer.querySelectorAll(".smNode");
    if (!nodes.length) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    nodes.forEach((el) => {
      const r = nodeWorldRectFromEl(el);
      minX = Math.min(minX, r.left);
      maxX = Math.max(maxX, r.left + r.w);
      minY = Math.min(minY, r.top);
      maxY = Math.max(maxY, r.top + r.h);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;
    const margin = 96;
    const graphWidth = Math.max(160, maxX - minX + margin * 2);
    const graphHeight = Math.max(160, maxY - minY + margin * 2);
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const rawFit = Math.min(width / graphWidth, height / graphHeight);
    const fittedScale = Math.min(1.4, Math.max(0.08, rawFit));
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    view.scale = fittedScale;
    view.panX = width / 2 - graphCenterX * fittedScale;
    view.panY = height / 2 - graphCenterY * fittedScale;
    updateWorldTransform();
    drawEdges();
  };

  const scheduleFitViewToRenderedNodes = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitViewToRenderedNodes();
      });
    });
  };

  const makeNodeEl = (node) => {
    const div = document.createElement("div");
    div.className = `smNode smNode--${node.type} smColor--${node.color || "green"}`;
    if (selectedId === node.id) div.classList.add("smNode--selected");
    div.dataset.id = node.id;
    div.style.left = `${node.x}px`;
    div.style.top = `${node.y}px`;

    const vl = isViewerLike();
    const unlocked = viewerUnlocked.has(node.id);
    if (vl && !unlocked) {
      div.classList.add("smNode--locked");
      div.title = "Locked — click a highlighted node you’ve already opened to unlock the next steps.";
    }
    if (vl && viewerVisited.has(node.id) && unlocked) div.classList.add("smNode--visited");

    if (node.type === "image") {
      const img = document.createElement("img");
      img.src = getNodeImageSrc(node) || storymapPlaceholderSvg();
      img.alt = "";
      const applyImageBoxSize = () => {
        let nw = img.naturalWidth || 0;
        let nh = img.naturalHeight || 0;
        if (nw < 2 || nh < 2) {
          nw = 256;
          nh = 256;
        }
        const { w, h } = computeStorymapImageNodeSize(nw, nh);
        div.style.width = `${w}px`;
        div.style.height = `${h}px`;
        div.style.aspectRatio = "auto";
        requestAnimationFrame(drawEdges);
      };
      img.addEventListener("load", applyImageBoxSize);
      img.addEventListener("error", () => {
        img.src = storymapPlaceholderSvg();
      });
      div.appendChild(img);
      if (img.complete && img.naturalWidth) applyImageBoxSize();
      const baseTitle = getNodeLabel(node);
      const title = getStorymapCanvasDisplayLabel(node, baseTitle);
      if (title) {
        const caption = document.createElement("span");
        caption.className = "smNodeImageTitle";
        caption.textContent = title;
        applyTextDirToNode(caption);
        div.appendChild(caption);
      }
    } else if (node.type === "text") {
      const inner = document.createElement("span");
      inner.className = "smNodeTextInner";
      const baseLbl = getNodeLabel(node);
      inner.textContent = getStorymapCanvasDisplayLabel(node, baseLbl);
      applyTextDirToNode(inner);
      div.appendChild(inner);
      const mw = Math.min(290, Math.max(112, 88 + Math.min(220, baseLbl.length * 2.8)));
      div.style.maxWidth = `${Math.round(mw)}px`;
    } else {
      const baseLbl = getNodeLabel(node);
      div.textContent = getStorymapCanvasDisplayLabel(node, baseLbl);
      applyTextDirToNode(div);
    }
    return div;
  };

  const handleNodeClick = (node, evt) => {
    evt.stopPropagation();
    if (isViewerLike()) {
      if (!viewerUnlocked.has(node.id)) {
        setStatus(
          "This node is still locked. Click a highlighted node you’ve already opened; new steps unlock along the arrows.",
          { isError: false }
        );
        return;
      }
      selectedId = node.id;
      viewerVisited.add(node.id);
      saveViewerState();
      renderCanvas();
      syncPanel();
      requestAnimationFrame(() => {
        window.setTimeout(
          () => queueNeighborUnlockAnimations(node.id),
          prefersReducedMotion() ? 0 : 220
        );
      });
      return;
    }
    selectedId = node.id;
    renderCanvas();
    syncPanel();
  };

  const renderCanvas = () => {
    nodesLayer.innerHTML = "";
    if (!canvas.nodes.length) {
      world.style.minWidth = "";
      world.style.minHeight = "";
      nodesLayer.style.minWidth = "";
      nodesLayer.style.minHeight = "";
      edgesSvg.style.width = "";
      edgesSvg.style.height = "";
      edgesSvg.querySelectorAll("line").forEach((ln) => ln.remove());
      return;
    }
    canvas.nodes.forEach((node) => {
      const nodeEl = makeNodeEl(node);
      nodeEl.addEventListener("click", (evt) => handleNodeClick(node, evt));
      nodeEl.addEventListener("mousedown", (evt) => {
        if (!isAdmin || previewAsUser || evt.button !== 0) return;
        evt.stopPropagation();
        const point = screenToWorld(evt.clientX, evt.clientY);
        nodeDragDraft = { id: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y };
      });
      nodesLayer.appendChild(nodeEl);
    });
    requestAnimationFrame(drawEdges);
  };

  viewport.addEventListener("mousedown", (evt) => {
    if (evt.button !== 0) return;
    const targetNode = evt.target && evt.target.closest ? evt.target.closest(".smNode") : null;
    if (!targetNode) {
      panDraft = { startX: evt.clientX, startY: evt.clientY, baseX: view.panX, baseY: view.panY };
      if (!isAdmin || previewAsUser) {
        selectedId = null;
        syncPanel();
        renderCanvas();
      }
    }
  });

  window.addEventListener("mousemove", (evt) => {
    if (nodeDragDraft && isAdmin && !previewAsUser) {
      const node = getNodeByIdLocal(nodeDragDraft.id);
      if (!node) return;
      const point = screenToWorld(evt.clientX, evt.clientY);
      node.x = point.x - nodeDragDraft.offsetX;
      node.y = point.y - nodeDragDraft.offsetY;
      renderCanvas();
      return;
    }
    if (panDraft) {
      view.panX = panDraft.baseX + (evt.clientX - panDraft.startX);
      view.panY = panDraft.baseY + (evt.clientY - panDraft.startY);
      updateWorldTransform();
    }
  });

  window.addEventListener("mouseup", () => {
    if (nodeDragDraft) saveStorymapCanvasState(canvas);
    nodeDragDraft = null;
    panDraft = null;
  });

  viewport.addEventListener(
    "wheel",
    (evt) => {
      evt.preventDefault();
      const before = screenToWorld(evt.clientX, evt.clientY);
      const scaleFactor = evt.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = Math.max(0.08, Math.min(2.4, view.scale * scaleFactor));
      const rect = viewport.getBoundingClientRect();
      view.panX = evt.clientX - rect.left - before.x * nextScale;
      view.panY = evt.clientY - rect.top - before.y * nextScale;
      view.scale = nextScale;
      updateWorldTransform();
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    if (!infoPanel || infoPanel.getAttribute("aria-hidden") === "true") return;
    applySmInfoPanelSafeInsets();
  });

  on(zoomInBtn, "click", () => {
    const rect = viewport.getBoundingClientRect();
    const cx = rect.width / 2;
    const cyPoint = rect.height / 2;
    const beforeX = (cx - view.panX) / view.scale;
    const beforeY = (cyPoint - view.panY) / view.scale;
    view.scale = Math.min(2.4, view.scale * 1.18);
    view.panX = cx - beforeX * view.scale;
    view.panY = cyPoint - beforeY * view.scale;
    updateWorldTransform();
  });

  on(zoomOutBtn, "click", () => {
    const rect = viewport.getBoundingClientRect();
    const cx = rect.width / 2;
    const cyPoint = rect.height / 2;
    const beforeX = (cx - view.panX) / view.scale;
    const beforeY = (cyPoint - view.panY) / view.scale;
    view.scale = Math.max(0.08, view.scale / 1.18);
    view.panX = cx - beforeX * view.scale;
    view.panY = cyPoint - beforeY * view.scale;
    updateWorldTransform();
  });

  on(infoCloseBtn, "click", () => {
    selectedId = null;
    if (infoPanel) {
      infoPanel.setAttribute("aria-hidden", "true");
      infoPanel.classList.remove("smInfoPanel--withImage");
      infoPanel.style.width = "";
    }
    try {
      document.documentElement.style.removeProperty("--sm-info-panel-top");
      document.documentElement.style.removeProperty("--sm-info-panel-bottom");
    } catch {
      // ignore
    }
    if (infoImage) {
      infoImage.removeAttribute("src");
      infoImage.alt = "";
      infoImage.classList.remove("smInfoImage--enter");
    }
    if (infoMediaWrap) infoMediaWrap.hidden = true;
    if (infoTitle) {
      infoTitle.textContent = "";
      infoTitle.hidden = false;
    }
    if (infoBody) {
      infoBody.textContent = "";
      infoBody.hidden = false;
    }
    renderCanvas();
  });

  on(el.btnReset, "click", () => {
    if (!isAdmin) return;
    canvas = normalizeStorymapCanvasState(defaultStorymapAdminCanvasState(), defaultStorymapAdminCanvasState());
    selectedId = null;
    mergeViewerProgress();
    fitViewToNodes();
    updateWorldTransform();
    saveStorymapCanvasState(canvas);
    renderCanvas();
    syncPanel();
    scheduleFitViewToRenderedNodes();
  });

  on(saveBtn, "click", () => {
    if (!isAdmin || !selectedId) return;
    const node = getNodeByIdLocal(selectedId);
    if (!node) return;
    const nextLabel = normalizeStorymapTitleText(labelInput ? labelInput.value : getNodeLabel(node));
    const nextText = normalizeStorymapBodyText(textInput ? textInput.value : getNodeText(node));
    node.label = nextLabel;
    node.text = nextText;
    if (node.type !== "image") node.content = nextLabel;
    if (colorSelect) node.color = colorSelect.value;
    saveStorymapCanvasState(canvas);
    renderCanvas();
  });

  on(createNodeBtn, "click", () => {
    if (!isAdmin) return;
    const type = String(createTypeInput?.value || "text");
    const label = normalizeStorymapTitleText(String(createLabelInput?.value || ""));
    if (!label) {
      alert("Node label is required.");
      return;
    }
    const text = normalizeStorymapBodyText(String(createTextInput?.value || ""));
    const color = String(createColorInput?.value || "green");
    const connectTo = String(createConnectSelect?.value || "").trim();
    const id = `n_${uuid().slice(0, 8)}`;
    const anchor = connectTo ? getNodeByIdLocal(connectTo) : selectedId ? getNodeByIdLocal(selectedId) : null;
    const nextNode = {
      id,
      type: type === "image" || type === "tag" ? type : "text",
      label,
      text,
      imageSrc: "",
      content: type === "image" ? "" : label,
      color,
      x: anchor ? anchor.x + 120 : 120 + canvas.nodes.length * 22,
      y: anchor ? anchor.y + 72 : 110 + canvas.nodes.length * 22,
      legacyType: "",
    };
    canvas.nodes.push(nextNode);
    if (connectTo && connectTo !== id) {
      if (canAddStorymapEdge(canvas, connectTo, id)) {
        canvas.edges.push({ source: connectTo, target: id, label: "" });
      }
    }
    selectedId = id;
    saveStorymapCanvasState(canvas);
    renderCanvas();
    syncPanel();
    if (connectTo && connectTo !== id) {
      const ek = storymapEdgeKey(connectTo, id);
      pendingEdgeAnim.add(ek);
      drawEdges();
      requestAnimationFrame(() => {
        const el = nodeElById(id);
        if (el) runUnlockAnim(el, connectTo, id, ek, { updateProgress: false });
      });
    }
    if (createLabelInput) createLabelInput.value = "";
    if (createTextInput) createTextInput.value = "";
  });

  on(imageFileInput, "change", (evt) => {
    if (!isAdmin || !selectedId) return;
    const file = evt.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const node = getNodeByIdLocal(selectedId);
      if (!node) return;
      node.type = "image";
      node.imageSrc = String(reader.result || "");
      saveStorymapCanvasState(canvas);
      renderCanvas();
      syncPanel();
    };
    reader.readAsDataURL(file);
  });

  on(addChildBtn, "click", () => {
    if (!isAdmin || !selectedId) return;
    const parent = getNodeByIdLocal(selectedId);
    if (!parent) return;
    const label = prompt("New node label:");
    if (!label || !label.trim()) return;
    const cleanLabel = normalizeStorymapTitleText(label.trim());
    const id = `n_${uuid().slice(0, 8)}`;
    canvas.nodes.push({
      id,
      type: "text",
      label: cleanLabel,
      text: "",
      content: cleanLabel,
      color: "green",
      x: parent.x + 130,
      y: parent.y + 80,
    });
    if (canAddStorymapEdge(canvas, parent.id, id)) {
      canvas.edges.push({ source: parent.id, target: id, label: "" });
    }
    selectedId = id;
    saveStorymapCanvasState(canvas);
    renderCanvas();
    syncPanel();
    const ek = storymapEdgeKey(parent.id, id);
    pendingEdgeAnim.add(ek);
    drawEdges();
    requestAnimationFrame(() => {
      const el = nodeElById(id);
      if (el) runUnlockAnim(el, parent.id, id, ek, { updateProgress: false });
    });
  });

  on(linkExistingBtn, "click", () => {
    if (!isAdmin || !selectedId) return;
    const pickedId = String(linkTargetSelect?.value || "").trim();
    const target = getNodeByIdLocal(pickedId);
    if (!target) return;
    if (target.id === selectedId) return;
    if (!canAddStorymapEdge(canvas, selectedId, target.id)) {
      setStatus("That directed link already exists (only one edge per source → target).", { isError: true });
      return;
    }
    canvas.edges.push({ source: selectedId, target: target.id, label: "" });
    saveStorymapCanvasState(canvas);
    renderCanvas();
  });

  on(deleteNodeBtn, "click", () => {
    if (!isAdmin || !selectedId) return;
    canvas.nodes = canvas.nodes.filter((n) => n.id !== selectedId);
    canvas.edges = canvas.edges.filter((e) => e.source !== selectedId && e.target !== selectedId);
    selectedId = null;
    saveStorymapCanvasState(canvas);
    renderCanvas();
    syncPanel();
  });

  on(publishBtn, "click", async () => {
    if (!isAdmin) return;
    const token = readGithubToken();
    if (!token) {
      setStatus("GitHub PAT is required before publishing.", { isError: true });
      if (publishHelp) publishHelp.textContent = "Enter a GitHub PAT with repo contents write access.";
      return;
    }
    storeGithubToken(token);
    if (publishBtn) publishBtn.disabled = true;
    try {
      const commitMessage = String(publishCommitMessageInput?.value || "").trim();
      setStatus("Publishing storymap to GitHub...", { isLoading: true });
      const published = await publishStorymapCanvasToGithub(canvas, token, commitMessage);
      publishStorymapCanvasState(published);
      if (publishHelp) publishHelp.textContent = `Published to ${GITHUB_PUBLISHED_CANVAS_PATH} on ${GITHUB_REPO_BRANCH}.`;
      setStatus("Storymap published globally. GitHub Pages may take a minute to refresh.");
    } catch (err) {
      console.error("Publish failed:", err);
      const reason = err && err.message ? err.message : "Unknown error";
      setStatus("Publish failed. Check token/repo permissions.", { isError: true });
      if (publishHelp) publishHelp.textContent = reason;
    } finally {
      if (publishBtn) publishBtn.disabled = false;
    }
  });

  viewport.addEventListener("click", (evt) => {
    const targetNode = evt.target && evt.target.closest ? evt.target.closest(".smNode") : null;
    if (targetNode) return;
    selectedId = null;
    syncPanel();
    renderCanvas();
  });

  if (isAdmin && previewToggle) {
    on(previewToggle, "change", () => {
      previewAsUser = previewToggle.checked;
      document.body.classList.toggle("layout--storymapPreview", previewAsUser);
      mergeViewerProgress();
      renderCanvas();
      syncPanel();
      scheduleFitViewToRenderedNodes();
    });
  }

  const bootstrapStorymapUi = () => {
    fitViewToNodes();
    updateWorldTransform();
    renderCanvas();
    syncPanel();
    scheduleFitViewToRenderedNodes();
    if (isAdmin) syncCreateConnectOptions();
    setStatus("");
  };

  let storymapResizeFitTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(storymapResizeFitTimer);
    storymapResizeFitTimer = window.setTimeout(() => {
      fitViewToNodes();
      updateWorldTransform();
      renderCanvas();
      scheduleFitViewToRenderedNodes();
    }, 140);
  });

  /**
   * Public storymap and admin must use the same source of truth: `./published-storymap.json`
   * on the deployed site. Admin previously preferred localStorage draft only, so the editor
   * often disagreed with GitHub Pages until Publish was run. We load the published file first
   * and mirror it into localStorage so edits stay aligned with what visitors see after publish.
   */
  const bootstrapAfterPublishedLoad = () => {
    mergeViewerProgress();
    selectedId = null;
    bootstrapStorymapUi();
  };

  if (isAdmin) {
    setStatus("Loading published storymap…", { isLoading: true });
    void loadPublishedStorymapFromRepo()
      .then((remoteCanvas) => {
        let replacedDraft = false;
        try {
          const raw = localStorage.getItem(STORYMAP_CANVAS_ADMIN_KEY);
          if (raw) {
            const prev = JSON.parse(raw);
            if (storymapGraphSignature(prev) !== storymapGraphSignature(remoteCanvas)) replacedDraft = true;
          }
        } catch {
          /* ignore */
        }
        canvas = remoteCanvas;
        saveStorymapCanvasState(canvas);
        setStatus(
          replacedDraft
            ? "Loaded published-storymap.json from this site (it replaced a different local draft). Publish to update GitHub."
            : ""
        );
        bootstrapAfterPublishedLoad();
      })
      .catch((err) => {
        console.warn("Admin: published storymap fetch failed; using embedded/saved draft.", err);
        setStatus("");
        bootstrapAfterPublishedLoad();
      });
  } else {
    void loadPublishedStorymapFromRepo()
      .then((remoteCanvas) => {
        canvas = remoteCanvas;
        bootstrapAfterPublishedLoad();
      })
      .catch((err) => {
        console.warn("Published storymap fetch fallback:", err);
        bootstrapAfterPublishedLoad();
      });
  }
  window.storymapRefreshCanvasI18n = () => {
    renderCanvas();
    syncPanel();
  };
  return true;
}

function uuid() {
  // `crypto.randomUUID` is supported in modern browsers; fall back for older ones.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makePersonNode({ name, description }) {
  return {
    id: `p_${uuid()}`,
    type: "person",
    label: name,
    description: description || "",
    notes: "",
    photo: "",
    storyOrder: null,
    dateRange: "",
    contextTags: "",
    audioDescription: "",
    pedagogyNotes: "",
    mentorshipRole: "mentor",
    citationIds: "",
  };
}

function makeEventNode({ title, date }) {
  return {
    id: `e_${uuid()}`,
    type: "event",
    label: title,
    date: date || "",
    notes: "",
    photo: "",
    storyOrder: null,
    dateRange: "",
    contextTags: "",
    audioDescription: "",
    pedagogyNotes: "",
    mentorshipRole: "context",
    citationIds: "",
  };
}

function makeEdge({ sourcePersonId, targetEventId, role }) {
  return {
    id: `r_${uuid()}`,
    source: sourcePersonId,
    target: targetEventId,
    role: role || "",
  };
}

function getNodeById(state, id) {
  return state.nodes.find((n) => n.id === id) || null;
}

function coerceStoryOrder(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function coerceStringOrEmpty(value) {
  return value == null ? "" : String(value);
}

function unwrapGraphElement(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.data && typeof raw.data === "object") return raw.data;
  return raw;
}

function normalizeNodeType(rawNode) {
  const t = String(rawNode?.type ?? rawNode?.nodeType ?? "").toLowerCase();
  if (t === "person" || t === "event") return t;
  const hasEventHints =
    rawNode?.date != null || rawNode?.title != null || rawNode?.eventTitle != null || rawNode?.event != null;
  return hasEventHints ? "event" : "person";
}

function normalizeNodeLabel(rawNode, type) {
  if (rawNode?.label != null) return coerceStringOrEmpty(rawNode.label);
  if (type === "person") {
    if (rawNode?.name != null) return coerceStringOrEmpty(rawNode.name);
    if (rawNode?.personName != null) return coerceStringOrEmpty(rawNode.personName);
  } else {
    if (rawNode?.title != null) return coerceStringOrEmpty(rawNode.title);
    if (rawNode?.eventTitle != null) return coerceStringOrEmpty(rawNode.eventTitle);
  }
  return "";
}

function normalizeGraph(maybeGraph) {
  const graph = maybeGraph && typeof maybeGraph === "object" ? maybeGraph : null;
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];

  // Keep only supported node types and required shape.
  const cleanedNodes = [];
  nodes.forEach((rawNode, index) => {
    const n = unwrapGraphElement(rawNode);
    if (!n) return;
    const id =
      n.id != null && String(n.id).trim()
        ? String(n.id)
        : typeof crypto?.randomUUID === "function"
          ? `n_${crypto.randomUUID()}`
          : `n_${index}_${Date.now()}`;
    const type = normalizeNodeType(n);
    cleanedNodes.push({
      id,
      type,
      label: normalizeNodeLabel(n, type),
      description: type === "person" ? coerceStringOrEmpty(n.description) : "",
      date: type === "event" ? coerceStringOrEmpty(n.date) : "",
      notes: coerceStringOrEmpty(n.notes),
      photo: coerceStringOrEmpty(n.photo),
      storyOrder: coerceStoryOrder(n.storyOrder),
      dateRange: coerceStringOrEmpty(n.dateRange),
      contextTags: coerceStringOrEmpty(n.contextTags),
      audioDescription: coerceStringOrEmpty(n.audioDescription),
      pedagogyNotes: coerceStringOrEmpty(n.pedagogyNotes),
      mentorshipRole: coerceStringOrEmpty(n.mentorshipRole),
      citationIds: coerceStringOrEmpty(n.citationIds),
    });
  });

  // Ensure every node has a storyOrder so ordering UI works.
  const existingOrders = cleanedNodes.map((n) => n.storyOrder).filter((v) => typeof v === "number" && Number.isFinite(v));
  let max = existingOrders.length ? Math.max(...existingOrders) : -1;
  cleanedNodes.forEach((n) => {
    if (n.storyOrder == null) {
      max += 1;
      n.storyOrder = max;
    }
  });

  const nodeIds = new Set(cleanedNodes.map((n) => n.id));

  // Only keep edges that connect existing person <-> event nodes.
  const cleanedEdges = edges
    .map((rawEdge, index) => {
      const edge = unwrapGraphElement(rawEdge);
      if (!edge) return null;
      const source = edge.source == null ? "" : String(edge.source);
      const target = edge.target == null ? "" : String(edge.target);
      const id =
        edge.id != null && String(edge.id).trim()
          ? String(edge.id)
          : typeof crypto?.randomUUID === "function"
            ? `r_${crypto.randomUUID()}`
            : `r_${index}_${Date.now()}`;
      return {
        id,
        source,
        target,
        role: String(edge.role ?? edge.label ?? ""),
      };
    })
    .filter((e) => e && nodeIds.has(e.source) && nodeIds.has(e.target))
    .filter((e) => {
      const s = cleanedNodes.find((n) => n.id === e.source);
      const t = cleanedNodes.find((n) => n.id === e.target);
      if (!s || !t) return false;
      return s.type === "person" && t.type === "event";
    })
    .map((e) => ({ id: e.id, source: e.source, target: e.target, role: e.role }));

  return { nodes: cleanedNodes, edges: cleanedEdges };
}

function sampleGraph() {
  const wedad = makePersonNode({
    name: "Wedad Mitri",
    description: "Educator and mentor foregrounding relational feminist pedagogy across class and literacy lines.",
  });
  wedad.notes =
    "Archive fragments show mentorship as collective care, not elite individual leadership. Oral storytelling linked rural women with urban organizers.";
  wedad.dateRange = "1950s-1980s";
  wedad.contextTags = "nasser,rural_pedagogy,working_class";
  wedad.audioDescription = "Voice note describing Wedad teaching in mixed-age rural circles.";
  wedad.pedagogyNotes = "Pedagogy of feeling; intergenerational trust-building.";
  wedad.citationIds = "1,2";

  const student = makePersonNode({
    name: "Student-Protege Collective",
    description: "Young women mentored into literacy, legal awareness, and neighborhood organizing.",
  });
  student.notes = "Some members later joined labor and neighborhood committees in Cairo and Delta regions.";
  student.dateRange = "1970s-2010s";
  student.contextTags = "infitah,arab_spring,youth";
  student.audioDescription = "Recorded testimony about learning from Wedad.";
  student.mentorshipRole = "protege";
  student.citationIds = "2,3";

  const nasser = makeEventNode({ title: "1952 Revolution & Nasser Education Policies", date: "1952-1970" });
  nasser.notes = "Expansion of education opened possibilities while preserving stratified access across region and class.";
  nasser.dateRange = "1952-1970";
  nasser.contextTags = "nasser,education_policy";
  nasser.citationIds = "1";

  const infitah = makeEventNode({ title: "Sadat Infitah Economic Liberalization", date: "1974-1981" });
  infitah.notes = "Economic opening reshaped labor precarity and women’s survival strategies, sharpening class divides.";
  infitah.dateRange = "1974-1981";
  infitah.contextTags = "infitah,class";
  infitah.citationIds = "1,3";

  const tahrir = makeEventNode({ title: "2011 Tahrir Intersectional Coalitions", date: "2011-2013" });
  tahrir.notes = "Coalitions connected labor, feminist, youth, and rural-origin activists in fluid networks of care and dissent.";
  tahrir.dateRange = "2011-2013";
  tahrir.contextTags = "arab_spring,intersectional";
  tahrir.citationIds = "2,3";

  return {
    nodes: [wedad, student, nasser, infitah, tahrir],
    edges: [
      makeEdge({ sourcePersonId: wedad.id, targetEventId: nasser.id, role: "teaches within policy shift" }),
      makeEdge({ sourcePersonId: wedad.id, targetEventId: infitah.id, role: "adapts pedagogy under precarity" }),
      makeEdge({ sourcePersonId: student.id, targetEventId: infitah.id, role: "experiences class pressure" }),
      makeEdge({ sourcePersonId: student.id, targetEventId: tahrir.id, role: "joins coalition politics" }),
      makeEdge({ sourcePersonId: wedad.id, targetEventId: tahrir.id, role: "legacy of mentorship" }),
    ],
  };
}

function encodeGraphToParam(graph) {
  const json = JSON.stringify(graph);
  const utf8 = encodeURIComponent(json);
  const b64 = btoa(utf8);
  return b64;
}

function decodeGraphFromParam(b64) {
  const utf8 = atob(b64);
  const json = decodeURIComponent(utf8);
  const parsed = JSON.parse(json);
  return normalizeGraph(parsed);
}

function loadGraph() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get("data");
  if (dataParam) {
    try {
      return decodeGraphFromParam(dataParam);
    } catch (err) {
      console.warn("Could not decode graph from URL:", err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeGraph(JSON.parse(raw));
  } catch {
    // ignore
  }

  return sampleGraph();
}

function saveGraph(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let state = loadGraph();
let cy = null;
let selected = null; // { kind: 'node'|'edge', id: string }
let connectDraft = null;
let discussionState = [];

function renderDiscussionBoard({ animatePostId = null } = {}) {
  if (!el.discussionPosts) return;
  const orderedPosts = [...discussionState].sort((a, b) => b.timestamp - a.timestamp);
  if (!orderedPosts.length) {
    el.discussionPosts.innerHTML = `
      <article class="discussionPost discussionPost--empty">
        <p class="muted">${escapeHtml(t("discussionEmpty"))}</p>
      </article>
    `;
    return;
  }

  el.discussionPosts.innerHTML = orderedPosts
    .map((post) => {
      const replies = Array.isArray(post.replies) ? post.replies : [];
      const repliesHtml = replies.length
        ? replies
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(
              (reply) => `
                <li class="discussionReplyItem">
                  <p>${escapeHtml(reply.text)}</p>
                  <time datetime="${escapeHtml(new Date(reply.timestamp).toISOString())}">${escapeHtml(
                    formatTimestamp(reply.timestamp)
                  )}</time>
                </li>
              `
            )
            .join("")
        : `<li class="discussionReplyItem discussionReplyItem--empty"><p class="muted">${escapeHtml(
            t("discussionNoReplies")
          )}</p></li>`;
      return `
        <article class="discussionPost" data-post-id="${post.id}">
          <header class="discussionPost__header">
            <h2>${escapeHtml(post.title)}</h2>
            <time datetime="${escapeHtml(new Date(post.timestamp).toISOString())}">${escapeHtml(
              formatTimestamp(post.timestamp)
            )}</time>
          </header>
          <p class="discussionPost__description">${escapeHtml(post.description)}</p>
          <ul class="discussionReplies">${repliesHtml}</ul>
          <div class="discussionPost__actions">
            <button class="btn btn--secondary discussionReplyToggleBtn" type="button" data-post-id="${post.id}">${escapeHtml(
              t("discussionReply")
            )}</button>
          </div>
          <div class="discussionReplyComposer" data-post-id="${post.id}" hidden>
            <div class="field">
              <label for="discussionReplyInput-${post.id}">${escapeHtml(t("discussionAddReply"))}</label>
              <textarea id="discussionReplyInput-${post.id}" class="discussionReplyInput" data-post-id="${
                post.id
              }" rows="2" placeholder="${escapeHtml(t("discussionReplyPlaceholder"))}"></textarea>
            </div>
            <div class="actions">
              <button class="btn discussionReplySubmitBtn" type="button" data-post-id="${post.id}">${escapeHtml(
                t("discussionPostReply")
              )}</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (animatePostId !== null) {
    const node = el.discussionPosts.querySelector(`[data-post-id="${animatePostId}"]`);
    if (node) node.classList.add("discussionPost--new");
  }
}

async function initDiscussionBoard() {
  if (!el.discussionPosts || !el.discussionPostBtn) return;
  setStatus(t("statusLoadingDiscussion"), { isLoading: true });
  let showedRemoteLoadError = false;
  try {
    await bootstrapDiscussionRemote();
    if (discussionRemoteEnabled) {
      try {
        discussionState = await loadDiscussionsRemote();
      } catch (err) {
        console.warn("[discussion] Load error, using local cache:", err);
        discussionState = loadDiscussionsLocal();
        showedRemoteLoadError = true;
        setStatus(t("statusDiscussionLoadError"), { isError: true });
      }
    } else {
      discussionState = loadDiscussionsLocal();
    }
  } finally {
    if (!showedRemoteLoadError) setStatus("");
  }
  updateDiscussionBackendNotice();
  renderDiscussionBoard();

  on(el.discussionPostBtn, "click", async () => {
    const title = el.discussionTitle ? el.discussionTitle.value.trim() : "";
    const description = el.discussionDescription ? el.discussionDescription.value.trim() : "";
    if (!title || !description) {
      setStatus(t("statusDiscussionPostMissing"), { isError: true });
      return;
    }
    const now = Date.now();
    const post = { id: now, title, description, timestamp: now, replies: [] };
    discussionState = [post, ...discussionState];
    const saved = await persistDiscussions(discussionState);
    if (!saved) {
      setStatus(t("statusDiscussionSaveFail"), { isError: true });
      return;
    }
    renderDiscussionBoard({ animatePostId: post.id });
    if (el.discussionTitle) el.discussionTitle.value = "";
    if (el.discussionDescription) el.discussionDescription.value = "";
    setStatus("");
  });

  on(el.discussionPosts, "click", async (evt) => {
    const toggleBtn = evt.target && evt.target.closest ? evt.target.closest(".discussionReplyToggleBtn") : null;
    if (toggleBtn) {
      const postId = Number(toggleBtn.getAttribute("data-post-id"));
      if (!postId) return;
      const composer = el.discussionPosts.querySelector(`.discussionReplyComposer[data-post-id="${postId}"]`);
      if (!composer) return;
      const isOpen = !composer.hasAttribute("hidden");
      if (isOpen) {
        composer.setAttribute("hidden", "");
      } else {
        composer.removeAttribute("hidden");
        const input = composer.querySelector(".discussionReplyInput");
        if (input) input.focus();
      }
      return;
    }

    const submitBtn = evt.target && evt.target.closest ? evt.target.closest(".discussionReplySubmitBtn") : null;
    if (!submitBtn) return;
    const postId = Number(submitBtn.getAttribute("data-post-id"));
    if (!postId) return;
    const composer = el.discussionPosts.querySelector(`.discussionReplyComposer[data-post-id="${postId}"]`);
    const input = composer ? composer.querySelector(".discussionReplyInput") : null;
    const text = input ? String(input.value || "").trim() : "";
    if (!text) {
      setStatus(t("statusReplyEmpty"), { isError: true });
      return;
    }
    const replyNow = Date.now();
    discussionState = discussionState.map((post) => {
      if (post.id !== postId) return post;
      const replies = Array.isArray(post.replies) ? post.replies : [];
      return {
        ...post,
        replies: [...replies, { id: replyNow, text, timestamp: replyNow }],
      };
    });
    const saved = await persistDiscussions(discussionState);
    if (!saved) {
      setStatus(t("statusReplySaveFail"), { isError: true });
      return;
    }
    renderDiscussionBoard();
    setStatus("");
  });
}

function initDiscussionAdminControls() {
  if (!el.btnClearDiscussions) return;

  async function refreshDiscussionAdminHint() {
    await bootstrapDiscussionRemote();
    const hint = el.discussionAdminClearHint;
    if (!hint) return;
    if (discussionRemoteEnabled) {
      hint.textContent = t("adminDiscussionSupabaseHint");
    } else {
      hint.textContent = t("adminDiscussionLocalHint");
    }
    applyTextDirToNode(hint);
  }

  void refreshDiscussionAdminHint();

  on(el.btnClearDiscussions, "click", async () => {
    await bootstrapDiscussionRemote();
    const msg = discussionRemoteEnabled ? t("adminClearConfirmRemote") : t("adminClearConfirmLocal");
    const ok = window.confirm(msg);
    if (!ok) return;
    const result = await clearDiscussionsForAdmin();
    if (!result.ok) {
      setStatus(t("adminClearFailed"), { isError: true });
      if (el.discussionAdminClearHint) {
        el.discussionAdminClearHint.textContent = t("adminClearFailedHint");
        applyTextDirToNode(el.discussionAdminClearHint);
      }
      return;
    }
    if (result.mode === "remote") {
      setStatus(t("adminClearOkRemote"), { isError: false });
    } else {
      setStatus(t("adminClearOkLocal"), { isError: false });
    }
    void refreshDiscussionAdminHint();
  });
}

function setSelected(next) {
  // Remove previous selection class.
  if (cy && selected) {
    const prevEl = selected.kind === "node" ? cy.getElementById(selected.id) : cy.$id(selected.id);
    if (prevEl && prevEl.length) prevEl.removeClass("selected");
  }

  selected = next;

  if (cy && selected) {
    const elToSel = selected.kind === "node" ? cy.getElementById(selected.id) : cy.$id(selected.id);
    if (elToSel && elToSel.length) elToSel.addClass("selected");
  }

  renderSelectedPanel();
  renderStoryOrderList();

  applyConnectivityHighlight();

  if (cy && selected && selected.kind === "node") focusNodeById(selected.id);
}

function renderSelectedPanel() {
  if (!el.selectedDetails || !el.btnDeleteSelected) return;
  const deleteBtn = el.btnDeleteSelected;
  if (!selected) {
    el.selectedDetails.innerHTML = `<p class="muted">${escapeHtml(t("nothingSelectedYet"))}</p>`;
    deleteBtn.disabled = true;
    return;
  }

  deleteBtn.disabled = false;

  if (selected.kind === "node") {
    const node = getNodeById(state, selected.id);
    if (!node) return;

    const isPerson = node.type === "person";
    const photo = node.photo || "";
    const photoLooksLikeUrl = /^https?:\/\//i.test(photo);
    const photoUrlValue = photoLooksLikeUrl ? photo : "";

    el.selectedDetails.innerHTML = `
      <div class="selectedItem">
        <p><strong>${isPerson ? escapeHtml(t("nodePerson")) : escapeHtml(t("nodeEvent"))}</strong></p>

        <div class="field">
          <label for="nodeLabelInput">${isPerson ? escapeHtml(t("labelName")) : escapeHtml(t("labelTitle"))}</label>
          <input id="nodeLabelInput" type="text" value="${escapeHtml(node.label || "")}" />
        </div>

        ${isPerson ? `
          <div class="field">
            <label for="nodeDescriptionInput">${escapeHtml(t("labelDescription"))}</label>
            <input id="nodeDescriptionInput" type="text" value="${escapeHtml(node.description || "")}" placeholder="${escapeHtml(t("optionalContextPlaceholder"))}" />
          </div>
        ` : `
          <div class="field">
            <label for="nodeDateInput">${escapeHtml(t("labelDate"))}</label>
            <input id="nodeDateInput" type="text" value="${escapeHtml(node.date || "")}" placeholder="${escapeHtml(t("optionalDatePlaceholder"))}" />
          </div>
        `}

        <div class="photoSection">
          ${
            photo
              ? `<img id="nodePhotoPreview" class="photoPreview" alt="Selected node photo" src="${escapeHtml(photo)}" />`
              : `<p class="muted small">${escapeHtml(t("noPhotoYet"))}</p>`
          }

          <div class="field" style="margin-bottom:0;">
            <label for="nodePhotoFile">${escapeHtml(t("labelUploadPhoto"))}</label>
            <input id="nodePhotoFile" type="file" accept="image/*" />
          </div>

          <div class="field" style="margin-bottom:0;">
            <label for="nodePhotoUrlInput">${escapeHtml(t("labelPhotoUrlOptional"))}</label>
            <input id="nodePhotoUrlInput" type="text" value="${escapeHtml(photoUrlValue)}" placeholder="${escapeHtml(t("photoUrlPlaceholder"))}" />
          </div>

          <div class="actions">
            <button id="btnRemovePhoto" class="btn btn--secondary" type="button" ${photo ? "" : "disabled"}>${escapeHtml(
              t("removePhoto")
            )}</button>
          </div>
        </div>

        <div class="field">
          <label for="nodeNotesInput">${escapeHtml(t("labelNotes"))}</label>
          <textarea id="nodeNotesInput" spellcheck="false" placeholder="${escapeHtml(t("notesPlaceholder"))}">${escapeHtml(node.notes || "")}</textarea>
        </div>

        <div class="field">
          <label for="nodeDateRangeInput">${escapeHtml(t("labelDateRange"))}</label>
          <input id="nodeDateRangeInput" type="text" value="${escapeHtml(node.dateRange || "")}" />
        </div>
        <div class="field">
          <label for="nodeContextTagsInput">${escapeHtml(t("labelContextTags"))}</label>
          <input id="nodeContextTagsInput" type="text" value="${escapeHtml(node.contextTags || "")}" placeholder="nasser,infitah,arab_spring" />
        </div>
        <div class="field">
          <label for="nodeAudioDescriptionInput">${escapeHtml(t("labelAudioDescription"))}</label>
          <textarea id="nodeAudioDescriptionInput" spellcheck="false">${escapeHtml(node.audioDescription || "")}</textarea>
        </div>
        <div class="field">
          <label for="nodePedagogyNotesInput">${escapeHtml(t("labelPedagogyNotes"))}</label>
          <textarea id="nodePedagogyNotesInput" spellcheck="false">${escapeHtml(node.pedagogyNotes || "")}</textarea>
        </div>
        <div class="field">
          <label for="nodeMentorshipRoleInput">${escapeHtml(t("labelMentorshipRole"))}</label>
          <input id="nodeMentorshipRoleInput" type="text" value="${escapeHtml(node.mentorshipRole || "")}" />
        </div>
        <div class="field">
          <label for="nodeCitationIdsInput">${escapeHtml(t("labelCitationIds"))}</label>
          <input id="nodeCitationIdsInput" type="text" value="${escapeHtml(node.citationIds || "")}" placeholder="1,2" />
        </div>

        <div class="field">
          <label for="nodeStoryOrderInput">${escapeHtml(t("labelStoryOrder"))}</label>
          <input id="nodeStoryOrderInput" type="text" value="${escapeHtml(String(node.storyOrder ?? 0))}" placeholder="${escapeHtml(t("storyOrderInputPlaceholder"))}" />
        </div>

        <button id="btnSaveNodeDetails" class="btn" type="button">${escapeHtml(t("saveNodeDetails"))}</button>
        <div class="actions actions--row" style="margin-top:10px;">
          <button id="btnAddChildNode" class="btn btn--secondary" type="button">Add Child Node</button>
          <button id="btnConnectToExisting" class="btn btn--secondary" type="button">Connect to Existing</button>
        </div>
        <p class="muted small" style="margin-top:10px;">
          ${escapeHtml(t("noteLongLinks"))}
        </p>
      </div>
    `;
    return;
  }

  // Edge selection
  if (selected.kind === "edge") {
    const edge = state.edges.find((e) => e.id === selected.id);
    if (!edge) return;

    const sourceNode = getNodeById(state, edge.source);
    const targetNode = getNodeById(state, edge.target);

    el.selectedDetails.innerHTML = `
      <div class="selectedItem">
        <p><strong>${escapeHtml(t("relationshipTitle"))}</strong></p>
        <p><strong>${escapeHtml(t("edgeLabelPerson"))}:</strong> ${escapeHtml(sourceNode?.label || edge.source)}</p>
        <p><strong>${escapeHtml(t("edgeLabelEvent"))}:</strong> ${escapeHtml(targetNode?.label || edge.target)}</p>
        ${
          edge.role
            ? `<p><strong>${escapeHtml(t("edgeLabelRole"))}:</strong> ${escapeHtml(edge.role)}</p>`
            : `<p class="muted">${escapeHtml(t("noRoleLabel"))}</p>`
        }
      </div>
    `;
  }
}

function orderedStoryNodes() {
  return [...state.nodes].sort((a, b) => {
    const ao = typeof a.storyOrder === "number" ? a.storyOrder : 0;
    const bo = typeof b.storyOrder === "number" ? b.storyOrder : 0;
    if (ao !== bo) return ao - bo;
    if (a.type !== b.type) return String(a.type).localeCompare(String(b.type));
    if (a.label !== b.label) return String(a.label).localeCompare(String(b.label));
    return a.id.localeCompare(b.id);
  });
}

function renderStoryOrderList() {
  if (!el.storyOrderList) return;

  const items = orderedStoryNodes();
  const isNodeSelected = selected && selected.kind === "node";
  const selectedId = isNodeSelected ? selected.id : null;

  el.storyOrderList.innerHTML = "";

  items.forEach((n, idx) => {
    const div = document.createElement("div");
    div.className = "storyOrderItem";
    if (selectedId && selectedId === n.id) div.classList.add("storyOrderItem--selected");
    div.dataset.nodeId = n.id;
    div.innerHTML = `
      <div class="storyOrderItem__row">
        <span class="storyOrderItem__index">#${idx + 1}</span>
        <span class="storyOrderItem__label">${escapeHtml(n.type === "person" ? t("nodePerson") : t("nodeEvent"))}: ${escapeHtml(
      n.label || n.id
    )}</span>
      </div>
      <div class="storyOrderItem__sub">
        ${n.type === "person" ? escapeHtml(n.description || "") : escapeHtml(n.date || "")}
      </div>
    `;
    div.addEventListener("click", () => {
      setSelected({ kind: "node", id: n.id });
    });
    el.storyOrderList.appendChild(div);
  });

  // Update move button enabled/disabled state.
  if (!isNodeSelected) {
    el.btnStoryMoveUp.disabled = true;
    el.btnStoryMoveDown.disabled = true;
    return;
  }

  const idx = items.findIndex((n) => n.id === selectedId);
  el.btnStoryMoveUp.disabled = idx <= 0;
  el.btnStoryMoveDown.disabled = idx < 0 || idx >= items.length - 1;
}

function renderCitationOverlay() {
  if (!el.citationList) return;
  const citationIdsRaw =
    selected && selected.kind === "node" ? getNodeById(state, selected.id)?.citationIds || "" : "";
  const ids = citationIdsRaw
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v) && v > 0);
  const source = ids.length ? ids.map((id) => CHICAGO_CITATIONS[id - 1]).filter(Boolean) : CHICAGO_CITATIONS;
  el.citationList.innerHTML = "";
  source.forEach((entry, i) => {
    const div = document.createElement("div");
    div.className = "citationItem";
    div.textContent = `${i + 1}. ${entry}`;
    el.citationList.appendChild(div);
  });
}

function connectedComponentIds(startNodeIds) {
  const startSet = new Set(startNodeIds);
  const nodeIds = new Set(startSet);
  const edgeIds = new Set();

  const queue = [...startSet];
  while (queue.length) {
    const cur = queue.shift();
    for (const e of state.edges) {
      if (e.source !== cur && e.target !== cur) continue;
      edgeIds.add(e.id);
      const other = e.source === cur ? e.target : e.source;
      if (!nodeIds.has(other)) {
        nodeIds.add(other);
        queue.push(other);
      }
    }
  }

  return { nodeIds, edgeIds };
}

function applyConnectivityHighlight() {
  if (!cy) return;

  cy.nodes().removeClass("dim");
  cy.edges().removeClass("dim");
  cy.edges().removeClass("connected");

  // If nothing is selected, keep everything visible.
  if (!selected) return;

  if (selected.kind === "node") {
    const { nodeIds, edgeIds } = connectedComponentIds([selected.id]);
    cy.edges().filter((e) => edgeIds.has(e.id())).addClass("connected");
    cy.nodes().filter((n) => !nodeIds.has(n.id())).addClass("dim");
    cy.edges().filter((e) => !edgeIds.has(e.id())).addClass("dim");
    return;
  }

  if (selected.kind === "edge") {
    const edge = state.edges.find((e) => e.id === selected.id);
    if (!edge) return;
    const { nodeIds, edgeIds } = connectedComponentIds([edge.source, edge.target]);
    cy.nodes().filter((n) => !nodeIds.has(n.id())).addClass("dim");
    cy.edges().filter((e) => !edgeIds.has(e.id())).addClass("dim");
  }
}

function focusNodeById(nodeId) {
  if (!cy) return;
  const node = cy.getElementById(nodeId);
  if (!node || !node.length) return;

  const pos = node.position();
  const targetZoom = Math.max(cy.zoom(), 1.45);
  cy.animate(
    {
      center: { x: pos.x, y: pos.y },
      zoom: targetZoom,
    },
    { duration: 260 }
  );
}

function hideInlineNodeEditor() {
  if (!el.inlineNodeEditor) return;
  el.inlineNodeEditor.setAttribute("aria-hidden", "true");
}

function showInlineNodeEditor(nodeId) {
  if (!el.inlineNodeEditor || !el.inlineNodeLabel || !cy) return;
  const node = getNodeById(state, nodeId);
  const cyNode = cy.getElementById(nodeId);
  if (!node || !cyNode || !cyNode.length) return;
  const box = cyNode.renderedBoundingBox();
  el.inlineNodeEditor.style.left = `${Math.min(cy.width() - 360, box.x2 + 10)}px`;
  el.inlineNodeEditor.style.top = `${Math.max(8, box.y1 - 8)}px`;
  el.inlineNodeEditor.setAttribute("aria-hidden", "false");
  el.inlineNodeLabel.value = node.label || "";
}

function clearConnectPreview() {
  const preview = document.getElementById("connectPreviewLine");
  if (preview) preview.remove();
}

function updateConnectPreview(clientX, clientY) {
  if (!connectDraft || !el.cy) return;
  const rect = el.cy.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const dx = x - connectDraft.startX;
  const dy = y - connectDraft.startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  let preview = document.getElementById("connectPreviewLine");
  if (!preview) {
    preview = document.createElement("div");
    preview.id = "connectPreviewLine";
    preview.className = "connectPreviewLine";
    el.cy.appendChild(preview);
  }
  preview.style.left = `${connectDraft.startX}px`;
  preview.style.top = `${connectDraft.startY}px`;
  preview.style.width = `${len}px`;
  preview.style.transform = `rotate(${angle}deg)`;
}

function moveSelectedNodeStoryOrder(delta) {
  if (!selected || selected.kind !== "node") return;
  const items = orderedStoryNodes();
  const idx = items.findIndex((n) => n.id === selected.id);
  const targetIdx = idx + delta;
  if (idx < 0 || targetIdx < 0 || targetIdx >= items.length) return;

  const a = items[idx];
  const b = items[targetIdx];

  const nextNodes = state.nodes.map((n) => {
    if (n.id === a.id) return { ...n, storyOrder: b.storyOrder };
    if (n.id === b.id) return { ...n, storyOrder: a.storyOrder };
    return n;
  });

  setGraphAndRerender({ nodes: nextNodes, edges: state.edges }, { shouldSave: true, preserveSelection: true });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function elementsFromState(graph) {
  const nodes = graph.nodes.map((n) => {
    const textLen = String(n.label || "").length;
    const notesLen = String(n.notes || "").length;
    const isTag = textLen <= 2;
    const nodeSize = isTag ? 60 : Math.max(96, Math.min(340, 62 + textLen * 6 + Math.min(36, Math.floor(notesLen / 16))));
    return {
      data: {
        id: n.id,
        type: n.type,
        nodeKind: isTag ? "tag" : "content",
        label: n.label,
        description: n.description || "",
        date: n.date || "",
        notes: n.notes || "",
        photo: n.photo || "",
        hasPhoto: n.photo ? 1 : 0,
        storyOrder: typeof n.storyOrder === "number" ? n.storyOrder : 0,
        nodeSize,
      },
    };
  });

  const edges = graph.edges.map((e) => ({
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.role || "",
    },
  }));

  return [...nodes, ...edges];
}

function makeLayoutOptions() {
  const layoutName = el.layoutSelect ? el.layoutSelect.value : "cose";
  if (layoutName === "breadthfirst") {
    return {
      name: "breadthfirst",
      directed: true,
      padding: 30,
      animate: false,
    };
  }
  if (layoutName === "grid") {
    return {
      name: "grid",
      padding: 30,
      animate: false,
    };
  }
  return {
    name: "cose",
    animate: false,
    idealEdgeLength: 120,
    nodeOverlap: 10,
  };
}

function renderGraph() {
  if (!el.cy) return;
  if (cy) {
    cy.destroy();
    cy = null;
  }

  if (typeof cytoscape !== "function") {
    el.cy.innerHTML = `
      <div class="muted" style="padding:12px;">
        Cytoscape failed to load. Check your internet connection or try a different host.
      </div>
    `;
    setStatus("Graph library failed to load. Basic page content is still available.", { isError: true });
    return;
  }

  cy = cytoscape({
    container: el.cy,
    elements: elementsFromState(state),
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-wrap": "wrap",
          "text-max-width": 220,
          color: "#0f1419",
          "font-size": 13,
          "text-valign": "center",
          "text-halign": "center",
          "overlay-padding": 2,
          "z-index": 10,
          width: "label",
          height: "label",
          "padding-left": 18,
          "padding-right": 18,
          "padding-top": 14,
          "padding-bottom": 14,
          "border-width": 0,
          "shadow-blur": 24,
          "shadow-color": "rgba(0,0,0,0.12)",
          "shadow-opacity": 0.9,
          "shadow-offset-x": 0,
          "shadow-offset-y": 6,
          "background-color": "#a8e6cf",
        },
      },
      {
        selector: 'node[nodeKind = "content"]',
        style: {
          shape: "round-rectangle",
          "background-color": "#a8e6cf",
          "background-blacken": -0.18,
        },
      },
      {
        selector: 'node[nodeKind = "tag"]',
        style: {
          shape: "ellipse",
          width: 60,
          height: 60,
          "padding-left": 0,
          "padding-right": 0,
          "padding-top": 0,
          "padding-bottom": 0,
          "background-color": "#a5d8ff",
        },
      },
      {
        selector: 'node[hasPhoto = 1]',
        style: {
          "background-image": "data(photo)",
          "background-fit": "cover",
          "background-clip": "none",
          "background-width": 30,
          "background-height": 30,
          "background-position-x": "92%",
          "background-position-y": "92%",
          "background-opacity": 1,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "curve-style": "bezier",
          "line-style": "dashed",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#bdc4d9",
          "line-color": "#bdc4d9",
          "label": "data(label)",
          "font-size": 11,
          "text-rotation": "autorotate",
          "text-background-opacity": 0.78,
          "text-background-color": "rgba(255,255,255,0.9)",
          "text-background-padding": 2,
          color: "#596273",
        },
      },
      {
        selector: "edge.connected",
        style: {
          width: 3.4,
          "line-color": "rgba(53, 166, 141, 0.75)",
          "target-arrow-color": "rgba(53, 166, 141, 0.75)",
          opacity: 1,
        },
      },
      {
        selector: "node.selected",
        style: {
          "border-width": 0,
          "overlay-color": "rgba(39,84,174,0.08)",
          "overlay-opacity": 1,
          "overlay-padding": 4,
        },
      },
      {
        selector: "node.hovered",
        style: {
          "background-blacken": -0.28,
          "shadow-blur": 28,
          "shadow-opacity": 1,
        },
      },
      {
        selector: "edge.selected",
        style: {
          "line-color": "#7c5cff",
          "target-arrow-color": "#7c5cff",
          width: 3,
        },
      },
      {
        selector: ".dim",
        style: {
          opacity: 0.08,
        },
      },
      {
        selector: ".focus",
        style: {
          opacity: 1,
        },
      },
    ],
    layout: makeLayoutOptions(),
  });

  // Keep selection highlight in sync after re-render.
  if (selected) {
    const elToSel = selected.kind === "node" ? cy.getElementById(selected.id) : cy.$id(selected.id);
    if (elToSel && elToSel.length) elToSel.addClass("selected");
  }

  applyConnectivityHighlight();

  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    setSelected({ kind: "node", id: node.id() });
    if (MODE === "viewer") {
      openNodeModalById(node.id());
      openSidebarForNode(node.id());
    } else if (MODE === "admin") {
      showInlineNodeEditor(node.id());
    }
  });

  cy.on("tap", "edge", (evt) => {
    const edge = evt.target;
    if (MODE === "admin") {
      setSelected({ kind: "edge", id: edge.id() });
      focusNodeById(edge.source().id());
    }
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      setSelected(null);
      if (MODE === "viewer") {
        closeNodeModal();
        closeSidebar();
      } else if (MODE === "admin") {
        hideInlineNodeEditor();
      }
    }
  });

  cy.on("mouseover", "node", (evt) => evt.target.addClass("hovered"));
  cy.on("mouseout", "node", (evt) => evt.target.removeClass("hovered"));

  if (MODE === "admin") {
    cy.on("cxttap", "node", (evt) => {
      const nodeId = evt.target.id();
      if (!confirm("Delete this node and its connected relationships?")) return;
      selected = { kind: "node", id: nodeId };
      deleteSelected();
    });

    on(el.inlineNodeSave, "click", () => {
      if (!selected || selected.kind !== "node" || !el.inlineNodeLabel) return;
      const label = el.inlineNodeLabel.value.trim();
      if (!label) return;
      const nextNodes = state.nodes.map((n) => (n.id === selected.id ? { ...n, label } : n));
      setGraphAndRerender({ nodes: nextNodes, edges: state.edges }, { shouldSave: true, preserveSelection: true });
      showInlineNodeEditor(selected.id);
    });

    on(el.inlineNodeAddChild, "click", () => {
      if (!selected || selected.kind !== "node") return;
      const parent = getNodeById(state, selected.id);
      if (!parent) return;
      const label = prompt("Child node label:");
      if (!label || !label.trim()) return;
      const child = parent.type === "person" ? makeEventNode({ title: label.trim(), date: "" }) : makePersonNode({ name: label.trim(), description: "" });
      const edge =
        parent.type === "person"
          ? makeEdge({ sourcePersonId: parent.id, targetEventId: child.id, role: "" })
          : makeEdge({ sourcePersonId: child.id, targetEventId: parent.id, role: "" });
      setGraphAndRerender({ nodes: [...state.nodes, child], edges: [...state.edges, edge] }, { shouldSave: true, preserveSelection: false });
    });

    on(el.inlineNodeConnect, "click", () => {
      if (!selected || selected.kind !== "node") return;
      connectDraft = { sourceId: selected.id };
    });

    on(el.inlineConnectHandle, "mousedown", (evt) => {
      if (!selected || selected.kind !== "node" || !el.cy || !cy) return;
      evt.preventDefault();
      const sourceNode = cy.getElementById(selected.id);
      if (!sourceNode || !sourceNode.length) return;
      const box = sourceNode.renderedBoundingBox();
      connectDraft = { sourceId: selected.id, startX: box.x2, startY: (box.y1 + box.y2) / 2 };
    });
  }
}

function refreshAllUI() {
  if (MODE === "admin") {
    // Disable delete if nothing selected.
    if (el.btnDeleteSelected) el.btnDeleteSelected.disabled = !selected;
    renderSelectedPanel();
    renderStoryOrderList();
  }
  renderGraph();
  renderCitationOverlay();

  // Keep JSON area in sync only when empty or it currently matches saved state.
  // (Avoid fighting the user's edits.)
}

function setGraphAndRerender(nextGraph, { shouldSave = true, preserveSelection = false } = {}) {
  state = normalizeGraph(nextGraph);
  if (shouldSave) saveGraph(state);
  if (!preserveSelection) selected = null;
  refreshAllUI();
}

function upsertJsonAreaFromState() {
  if (!el.jsonArea) return;
  el.jsonArea.value = JSON.stringify(state, null, 2);
}

function readJsonAreaAndApply() {
  if (!el.jsonArea) return;
  const raw = el.jsonArea.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    setGraphAndRerender(parsed, { shouldSave: true });
  } catch {
    setStatus("Graph data parse failed. Please check JSON format.", { isError: true });
    throw new Error("Invalid graph JSON");
  }
}

function deleteSelected() {
  if (!selected) return;

  if (selected.kind === "node") {
    const nodeId = selected.id;
    const next = {
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    };
    setGraphAndRerender(next, { shouldSave: true });
    return;
  }

  if (selected.kind === "edge") {
    const edgeId = selected.id;
    const next = {
      nodes: state.nodes,
      edges: state.edges.filter((e) => e.id !== edgeId),
    };
    setGraphAndRerender(next, { shouldSave: true });
  }
}

function makeShareLink() {
  // Encode the whole graph into URL. For large graphs this can get long quickly.
  const param = encodeGraphToParam(state);
  const url = new URL(window.location.href);
  url.searchParams.set("data", param);

  const share = url.toString();
  el.shareLink.value = share;

  if (share.length > 2000) {
    el.shareWarning.textContent = `Warning: link is ${share.length} chars; some platforms may truncate it.`;
  } else {
    el.shareWarning.textContent = "";
  }
}

// Node details editing (photo, notes, story order).
on(el.selectedDetails, "click", (evt) => {
  if (!selected || selected.kind !== "node") return;

  const target = evt.target;
  const removeBtn = target && target.closest ? target.closest("#btnRemovePhoto") : null;
  const saveBtn = target && target.closest ? target.closest("#btnSaveNodeDetails") : null;
  const addChildBtn = target && target.closest ? target.closest("#btnAddChildNode") : null;
  const connectBtn = target && target.closest ? target.closest("#btnConnectToExisting") : null;

  if (removeBtn) {
    const nodeId = selected.id;
    const nextNodes = state.nodes.map((n) => (n.id === nodeId ? { ...n, photo: "" } : n));
    setGraphAndRerender({ nodes: nextNodes, edges: state.edges }, { shouldSave: true, preserveSelection: true });
    return;
  }

  if (saveBtn) {
    const node = getNodeById(state, selected.id);
    if (!node) return;

    const labelEl = document.getElementById("nodeLabelInput");
    const notesEl = document.getElementById("nodeNotesInput");
    const orderEl = document.getElementById("nodeStoryOrderInput");
    const photoUrlEl = document.getElementById("nodePhotoUrlInput");
    const dateRangeEl = document.getElementById("nodeDateRangeInput");
    const contextTagsEl = document.getElementById("nodeContextTagsInput");
    const audioDescriptionEl = document.getElementById("nodeAudioDescriptionInput");
    const pedagogyNotesEl = document.getElementById("nodePedagogyNotesInput");
    const mentorshipRoleEl = document.getElementById("nodeMentorshipRoleInput");
    const citationIdsEl = document.getElementById("nodeCitationIdsInput");

    const label = labelEl ? labelEl.value.trim() : "";
    if (!label) {
      alert("Please provide a title/name for this story node.");
      return;
    }

    const notes = notesEl ? notesEl.value : "";
    const storyOrder = orderEl ? coerceStoryOrder(orderEl.value.trim()) : node.storyOrder;

    const patch = {
      label,
      notes,
      dateRange: dateRangeEl ? dateRangeEl.value.trim() : "",
      contextTags: contextTagsEl ? contextTagsEl.value.trim() : "",
      audioDescription: audioDescriptionEl ? audioDescriptionEl.value.trim() : "",
      pedagogyNotes: pedagogyNotesEl ? pedagogyNotesEl.value.trim() : "",
      mentorshipRole: mentorshipRoleEl ? mentorshipRoleEl.value.trim() : "",
      citationIds: citationIdsEl ? citationIdsEl.value.trim() : "",
    };
    if (typeof storyOrder === "number") patch.storyOrder = storyOrder;

    if (node.type === "person") {
      const descEl = document.getElementById("nodeDescriptionInput");
      patch.description = descEl ? descEl.value : "";
    } else {
      const dateEl = document.getElementById("nodeDateInput");
      patch.date = dateEl ? dateEl.value : "";
    }

    const photoUrl = photoUrlEl ? photoUrlEl.value.trim() : "";
    patch.photo = photoUrl;

    const nextNodes = state.nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n));
    setGraphAndRerender({ nodes: nextNodes, edges: state.edges }, { shouldSave: true, preserveSelection: true });
  }

  if (addChildBtn) {
    const parent = getNodeById(state, selected.id);
    if (!parent) return;
    const childLabel = prompt("Child node label:");
    if (!childLabel || !childLabel.trim()) return;
    const roleLabel = prompt("Connection label (optional):") || "";
    const newChild =
      parent.type === "person"
        ? makeEventNode({ title: childLabel.trim(), date: "" })
        : makePersonNode({ name: childLabel.trim(), description: "" });
    const newEdge =
      parent.type === "person"
        ? makeEdge({ sourcePersonId: parent.id, targetEventId: newChild.id, role: roleLabel })
        : makeEdge({ sourcePersonId: newChild.id, targetEventId: parent.id, role: roleLabel });
    setGraphAndRerender(
      { nodes: [...state.nodes, newChild], edges: [...state.edges, newEdge] },
      { shouldSave: true, preserveSelection: false }
    );
    return;
  }

  if (connectBtn) {
    const source = getNodeById(state, selected.id);
    if (!source) return;
    const candidates = state.nodes.filter((n) => n.id !== source.id);
    const list = candidates.map((n) => `${n.id}: ${n.label}`).join("\n");
    const picked = prompt(`Enter target node id:\n${list}`);
    if (!picked) return;
    const targetNode = getNodeById(state, picked.trim());
    if (!targetNode) {
      alert("Node not found.");
      return;
    }
    const role = prompt("Connection label (optional):") || "";
    let edgeToAdd = null;
    if (source.type === "person" && targetNode.type === "event") {
      edgeToAdd = makeEdge({ sourcePersonId: source.id, targetEventId: targetNode.id, role });
    } else if (source.type === "event" && targetNode.type === "person") {
      edgeToAdd = makeEdge({ sourcePersonId: targetNode.id, targetEventId: source.id, role });
    } else {
      alert("Connections must be between Person and Event nodes.");
      return;
    }
    setGraphAndRerender({ nodes: state.nodes, edges: [...state.edges, edgeToAdd] }, { shouldSave: true, preserveSelection: true });
  }
});

on(el.selectedDetails, "change", (evt) => {
  const target = evt.target;
  if (!target || !target.id || !selected || selected.kind !== "node") return;

  if (target.id !== "nodePhotoFile") return;

  const file = target.files && target.files[0];
  if (!file) return;

  const nodeId = selected.id;
  const reader = new FileReader();
  reader.onload = () => {
    const nextNodes = state.nodes.map((n) => (n.id === nodeId ? { ...n, photo: String(reader.result || "") } : n));
    setGraphAndRerender({ nodes: nextNodes, edges: state.edges }, { shouldSave: true, preserveSelection: true });
  };
  reader.onerror = () => {
    alert("Could not read that image file.");
  };
  reader.readAsDataURL(file);
});

function initLanguageMenu() {
  const menu = document.getElementById("langMenuList");
  if (!menu) return;
  menu.addEventListener("click", (e) => {
    const target = e.target && e.target.closest ? e.target.closest("[data-lang]") : null;
    if (!target) return;
    e.preventDefault();
    const lang = target.getAttribute("data-lang");
    if (lang && SUPPORTED_LANGS.includes(lang)) setLanguage(lang);
  });
}

initLanguageMenu();
syncLangToUrl();
applyTranslations();

/** Public hooks so embedders/tests can switch language and refresh strings after dynamic edits. */
window.storymapGetLanguage = () => currentLang;
window.storymapSetLanguage = (code) => setLanguage(code);
window.storymapApplyTranslations = () => applyTranslations();
window.storymapSupportedLanguages = () => [...SUPPORTED_LANGS];

// Wire up UI events.
on(el.btnReset, "click", () => {
  if (MODE === "admin" && document.getElementById("storymapViewport")) return;
  setGraphAndRerender(sampleGraph(), { shouldSave: true, preserveSelection: false });
  if (el.shareLink) el.shareLink.value = "";
  if (el.shareWarning) el.shareWarning.textContent = "";
});

on(el.btnReLayout, "click", () => {
  if (!cy) return;
  const layout = makeLayoutOptions();
  cy.layout(layout).run();
});

on(el.btnDeleteSelected, "click", () => deleteSelected());

on(el.btnExportJson, "click", () => upsertJsonAreaFromState());

on(el.btnImportJson, "click", () => {
  try {
    readJsonAreaAndApply();
  } catch (err) {
    alert("Invalid JSON. Check formatting and try again.");
    console.warn(err);
  }
});

on(el.btnMakeShareLink, "click", () => makeShareLink());

on(el.btnStoryMoveUp, "click", () => moveSelectedNodeStoryOrder(-1));

on(el.btnStoryMoveDown, "click", () => moveSelectedNodeStoryOrder(1));

let viewerOpenNodeId = null;

function viewerOrderedNodeIds() {
  return orderedStoryNodes().map((n) => n.id);
}

function openSidebarForNode(nodeId) {
  if (!el.viewerSidebar || !el.viewerRoot) return;
  const node = getNodeById(state, nodeId);
  if (!node) return;

  el.viewerSidebar.classList.add("viewerSidebar--open");
  el.viewerSidebar.setAttribute("aria-hidden", "false");
  el.viewerRoot.classList.add("viewer--withSidebar");

  if (el.sidebarTitle) {
    el.sidebarTitle.textContent = node.label || node.id;
    applyTextDirToNode(el.sidebarTitle);
  }
  if (el.sidebarMeta) {
    const meta = [node.type === "person" ? t("nodePerson") : t("nodeEvent")];
    if (node.type === "event" && (node.date || "").trim()) meta.push(node.date.trim());
    el.sidebarMeta.textContent = meta.join(" • ");
    applyTextDirToNode(el.sidebarMeta);
  }
  if (el.sidebarDescription) {
    const desc = (node.notes || "").trim() || (node.description || "").trim();
    const meta = [node.dateRange, node.contextTags, node.mentorshipRole].filter(Boolean).join(" | ");
    const text = [desc, meta].filter(Boolean).join("\n");
    el.sidebarDescription.textContent = text || "";
    el.sidebarDescription.style.display = text ? "block" : "none";
    applyTextDirToNode(el.sidebarDescription);
  }
  if (el.sidebarThumb) {
    if (node.photo) {
      el.sidebarThumb.src = node.photo;
      el.sidebarThumb.alt = `${node.label || "Node"} thumbnail`;
      el.sidebarThumb.style.display = "block";
    } else {
      el.sidebarThumb.removeAttribute("src");
      el.sidebarThumb.alt = "";
      el.sidebarThumb.style.display = "none";
    }
  }

  // Keep same node centered after map area shifts.
  setTimeout(() => {
    if (cy) cy.resize();
    focusNodeById(nodeId);
  }, 220);
}

function closeSidebar() {
  if (!el.viewerSidebar || !el.viewerRoot) return;
  el.viewerSidebar.classList.remove("viewerSidebar--open");
  el.viewerSidebar.setAttribute("aria-hidden", "true");
  el.viewerRoot.classList.remove("viewer--withSidebar");
  setTimeout(() => {
    if (cy) cy.resize();
  }, 220);
}

function openNodeModalById(nodeId) {
  if (!el.nodeModal || !el.nodeModalTitle || !el.nodeModalDescription || !el.nodeModalImage) return;
  const node = getNodeById(state, nodeId);
  if (!node) return;

  viewerOpenNodeId = nodeId;
  el.nodeModal.setAttribute("aria-hidden", "false");

  el.nodeModalTitle.textContent = node.label || node.id;
  applyTextDirToNode(el.nodeModalTitle);

  const metaParts = [];
  metaParts.push(node.type === "person" ? t("nodePerson") : t("nodeEvent"));
  if (node.type === "event" && (node.date || "").trim()) metaParts.push(node.date.trim());
  if (el.nodeModalMeta) {
    el.nodeModalMeta.textContent = metaParts.join(" • ");
    applyTextDirToNode(el.nodeModalMeta);
  }

  const desc =
    (node.notes || "").trim() ||
    (node.type === "person" ? (node.description || "").trim() : "") ||
    "";
  const detailParts = [];
  if ((node.dateRange || "").trim()) detailParts.push(`${t("detailPrefixDateRange")} ${node.dateRange.trim()}`);
  if ((node.contextTags || "").trim()) detailParts.push(`${t("detailPrefixTags")} ${node.contextTags.trim()}`);
  if ((node.audioDescription || "").trim()) detailParts.push(`${t("detailPrefixAudio")} ${node.audioDescription.trim()}`);
  if ((node.pedagogyNotes || "").trim()) detailParts.push(`${t("detailPrefixPedagogy")} ${node.pedagogyNotes.trim()}`);
  const combinedDesc = [desc, ...detailParts].filter(Boolean).join("\n\n");
  el.nodeModalDescription.textContent = combinedDesc || "";
  el.nodeModalDescription.style.display = combinedDesc ? "block" : "none";
  applyTextDirToNode(el.nodeModalDescription);

  const hasPhoto = Boolean((node.photo || "").trim());
  if (hasPhoto) {
    el.nodeModalImage.src = node.photo;
    el.nodeModalImage.alt = `${node.label || "Node"} ${t("nodeImageAltSuffix")}`;
    el.nodeModalImage.style.display = "block";
  } else {
    el.nodeModalImage.removeAttribute("src");
    el.nodeModalImage.alt = "";
    el.nodeModalImage.style.display = "none";
  }

  const ids = viewerOrderedNodeIds();
  const idx = ids.indexOf(nodeId);
  if (el.btnPrevNode) el.btnPrevNode.disabled = idx <= 0;
  if (el.btnNextNode) el.btnNextNode.disabled = idx < 0 || idx >= ids.length - 1;
}

function closeNodeModal() {
  if (!el.nodeModal) return;
  el.nodeModal.setAttribute("aria-hidden", "true");
  viewerOpenNodeId = null;
}

function viewerStepModal(delta) {
  const ids = viewerOrderedNodeIds();
  const idx = viewerOpenNodeId ? ids.indexOf(viewerOpenNodeId) : -1;
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= ids.length) return;
  const nextId = ids[nextIdx];
  setSelected({ kind: "node", id: nextId });
  openSidebarForNode(nextId);
  openNodeModalById(nextId);
}

function initScrollReveals() {
  const revealNodes = Array.from(document.querySelectorAll(".reveal"));
  if (!revealNodes.length) return;
  if (typeof IntersectionObserver !== "function") {
    revealNodes.forEach((n) => n.classList.add("reveal--visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("reveal--visible");
      });
    },
    { threshold: 0.12 }
  );
  revealNodes.forEach((n) => io.observe(n));
}

function initHeroParallax() {
  const hero = document.getElementById("home");
  if (!hero) return;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset || 0;
      hero.style.setProperty("--hero-parallax", `${Math.min(48, y * 0.18)}px`);
      hero.style.setProperty("--hero-node-parallax", `${Math.min(64, y * 0.26)}px`);
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/** Cream navbar “fills in” after a little scroll (visual only). */
function initNavScrollClass() {
  const nav = document.querySelector(".siteNav");
  if (!nav) return;
  const threshold = 12;
  const apply = () => {
    const y = window.scrollY || window.pageYOffset || 0;
    nav.classList.toggle("siteNav--scrolled", y > threshold);
  };
  window.addEventListener("scroll", apply, { passive: true });
  apply();
}

function initContentEditorPanel() {
  if (!el.btnSaveContentConfig) return;
  const cfg = loadContentConfig();
  if (el.cfgHeroTitle) el.cfgHeroTitle.value = cfg.heroTitle || "";
  if (el.cfgHeroSubtitle) el.cfgHeroSubtitle.value = cfg.heroSubtitle || "";
  if (el.cfgHeroCta) el.cfgHeroCta.value = cfg.heroCta || "";
  if (el.cfgHistoryTitle) el.cfgHistoryTitle.value = cfg.historyTitle || "";
  if (el.cfgHistoryBody) el.cfgHistoryBody.value = cfg.historyBody || "";

  on(el.btnSaveContentConfig, "click", () => {
    const nextCfg = {
      ...cfg,
      heroTitle: el.cfgHeroTitle ? el.cfgHeroTitle.value.trim() : cfg.heroTitle,
      heroSubtitle: el.cfgHeroSubtitle ? el.cfgHeroSubtitle.value.trim() : cfg.heroSubtitle,
      heroCta: el.cfgHeroCta ? el.cfgHeroCta.value.trim() : cfg.heroCta,
      historyTitle: el.cfgHistoryTitle ? el.cfgHistoryTitle.value.trim() : cfg.historyTitle,
      historyBody: el.cfgHistoryBody ? el.cfgHistoryBody.value.trim() : cfg.historyBody,
    };
    saveContentConfig(nextCfg);
    applyContentConfigToPage();
    setStatus(t("statusContentSaved"), { isError: false });
  });
}

on(el.btnCloseNodeModal, "click", () => closeNodeModal());
on(el.btnPrevNode, "click", () => viewerStepModal(-1));
on(el.btnNextNode, "click", () => viewerStepModal(1));
on(el.btnCloseSidebar, "click", () => closeSidebar());
on(document, "keydown", (evt) => {
  if (MODE !== "viewer") return;
  if (evt.key === "Escape") {
    if (el.loginModal && el.loginModal.getAttribute("aria-hidden") === "false") {
      hideLoginModal();
      return;
    }
    closeNodeModal();
    closeSidebar();
  }
  if (!el.nodeModal || el.nodeModal.getAttribute("aria-hidden") !== "false") return;
  if (evt.key === "ArrowLeft") viewerStepModal(-1);
  if (evt.key === "ArrowRight") viewerStepModal(1);
});

on(document, "mousemove", (evt) => {
  if (!connectDraft || !("startX" in connectDraft)) return;
  updateConnectPreview(evt.clientX, evt.clientY);
});

on(document, "mouseup", (evt) => {
  if (!connectDraft || !cy) return;
  const target = evt.target;
  const rel = target && target.closest ? target.closest("#cy") : null;
  if (!rel || !("sourceId" in connectDraft)) {
    connectDraft = null;
    clearConnectPreview();
    return;
  }
  const rect = el.cy.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const hitNode = cy.nodes().filter((n) => {
    const b = n.renderedBoundingBox();
    return x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;
  })[0];
  if (hitNode && hitNode.id() !== connectDraft.sourceId) {
    const source = getNodeById(state, connectDraft.sourceId);
    const targetNode = getNodeById(state, hitNode.id());
    let edgeToAdd = null;
    if (source && targetNode) {
      if (source.type === "person" && targetNode.type === "event") {
        edgeToAdd = makeEdge({ sourcePersonId: source.id, targetEventId: targetNode.id, role: "" });
      } else if (source.type === "event" && targetNode.type === "person") {
        edgeToAdd = makeEdge({ sourcePersonId: targetNode.id, targetEventId: source.id, role: "" });
      }
    }
    if (edgeToAdd) {
      setGraphAndRerender({ nodes: state.nodes, edges: [...state.edges, edgeToAdd] }, { shouldSave: true, preserveSelection: true });
    }
  }
  connectDraft = null;
  clearConnectPreview();
});

on(el.btnZoomIn, "click", () => {
  if (!cy) return;
  const nextZoom = Math.min(2.8, cy.zoom() * 1.2);
  cy.zoom({ level: nextZoom, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
});
on(el.btnZoomOut, "click", () => {
  if (!cy) return;
  const nextZoom = Math.max(0.35, cy.zoom() / 1.2);
  cy.zoom({ level: nextZoom, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
});
function showLoginModal() {
  if (!el.loginModal) return;
  el.loginModal.setAttribute("aria-hidden", "false");
  if (el.loginError) el.loginError.textContent = "";
  if (el.adminPassword) {
    el.adminPassword.value = "";
    el.adminPassword.focus();
  }
}

function hideLoginModal() {
  if (!el.loginModal) return;
  el.loginModal.setAttribute("aria-hidden", "true");
}

function submitLogin() {
  if (!el.adminPassword) return;
  if (el.adminPassword.value !== ADMIN_PASSWORD) {
    if (el.loginError) el.loginError.textContent = "Incorrect password.";
    return;
  }
  try {
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, "true");
  } catch {
    if (el.loginError) el.loginError.textContent = "Storage unavailable. Please enable session storage.";
    return;
  }
  window.location.href = buildPageUrl("admin.html");
}

on(el.btnLogin, "click", () => showLoginModal());
on(el.btnCancelLogin, "click", () => hideLoginModal());
on(el.btnSubmitLogin, "click", () => submitLogin());
on(el.adminPassword, "keydown", (evt) => {
  if (evt.key === "Enter") submitLogin();
});
on(el.loginModal, "click", (evt) => {
  if (evt.target && evt.target.classList && evt.target.classList.contains("loginModal__backdrop")) {
    hideLoginModal();
  }
});
on(el.btnLogoutAdmin, "click", () => {
  try {
    sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  } catch {
    // ignore
  }
  window.location.href = buildPageUrl("index.html");
});

window.addEventListener("error", (evt) => {
  setStatus(t("statusRuntimeError"), { isError: true });
  console.error("Runtime error:", evt.error || evt.message);
});

(async () => {
  try {
    installStorymapHardRefreshArming();
    applyStorymapHardRefreshReset();
    applyStorymapUrlStorageHints();
    syncCanvasToPublishedRelease();
    initScrollReveals();
    initHeroParallax();
    initNavScrollClass();
    initContentEditorPanel();
    await initDiscussionBoard();
    initDiscussionAdminControls();
    // Avoid flashing "Loading storymap" on discussion.html (discussion has its own load path)
    // or on simple static pages like information.html.
    const isInformationPage = typeof window !== "undefined" && window.location.pathname.includes("information.html");
    if (!el.discussionPosts && !isInformationPage) {
      setStatus(t("statusLoadingStorymap"), { isLoading: true });
    }
    if (document.getElementById("storymapViewport")) {
      initCustomStorymapCanvas();
      // Status cleared from bootstrapStorymapUi when the canvas is ready (viewer waits for published JSON).
    } else if (MODE === "history" || el.discussionPosts) {
      setStatus("");
    } else {
      refreshAllUI();
      if (MODE === "admin") upsertJsonAreaFromState();
      setStatus("");
    }
  } catch (err) {
    console.error(err);
    setStatus(t("statusInitFailed"), { isError: true });
    if (el && el.cy) {
      el.cy.innerHTML = `
      <div class="muted" style="padding:12px;">
        ${escapeHtml(t("statusFallbackInit"))}
      </div>
    `;
    }
  }
})();

