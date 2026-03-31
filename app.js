/* global cytoscape */

const STORAGE_KEY = "storymapGraphV1";
const LANG_STORAGE_KEY = "storymapLangV1";

const SUPPORTED_LANGS = ["en"];

const BODY_MODE = document.body?.dataset?.mode;
const MODE = BODY_MODE === "admin" || BODY_MODE === "history" ? BODY_MODE : "viewer";
const IS_STORYMAP_PAGE = /(^|\/)storymap\.html$/i.test(window.location.pathname || "");
const ADMIN_UNLOCK_KEY = "storymapAdminUnlockedV1";
const ADMIN_PASSWORD = "beebo";
const CONTENT_STORAGE_KEY = "storymapExhibitionContentV1";
const STORYMAP_CANVAS_PUBLIC_KEY = "storymapCanvasPublicV1";
const STORYMAP_CANVAS_ADMIN_KEY = "storymapCanvasAdminV1";

const DEFAULT_CONTENT = {
  heroTitle: "Doing Well, Don't Worry",
  heroSubtitle:
    "A digital collaboration between Georgetown University's School of Foreign Service and The Women and Memory Forum.",
  heroCta: "Experience \"Doing Well, Don't Worry\"",
  section1: "Women are always on the move.",
  section2:
    "Women engage in different types of work and mobility that inform their journeys through life. They work at home, in the fields, in the workshops, in big cities, small towns, or in other countries. Their work and their movement traverse different spaces, reassembling their relationships as they become part of many other people’s lives. This exhibition introduces glimpses into the lives of 21 women – women, who have worked and moved as doctors, maids, actresses, students, accountants, filmmakers, embroiderers, teachers, artists, and as mothers, daughters, mentors and friends. They live in Egypt, Jordan, Lebanon and Denmark, yet their lives invite us to travel across many more spaces, peoples, and times, and inspire us to rethink familiar meanings and assumptions about women, mobility and work.",
  section3:
    "This exhibition is based on interviews with these diverse women. We are a group of researchers, archivists, museum professionals and young people in these professions, who all share an interest in telling and sharing the stories of these women, whose inspiring tales should be kept and remembered for generations to come. We invite you on a journey through their lives to see how they have moved and for what different reasons. We shed light on the effect that these movements and their work have on their relationships with the people around them and delve into their different types of work to see how they contribute to not only their own lives but also to their families, friends, co-workers and to society.",
  historyTitle: "History",
  historyBody:
    "The archive is best understood when contextualized. Thus, some nodes will reflect historical transformations in 20th and 21st century Egypt. Several events in the evolution of feminist discourse are particularly important. Feminist politics grew after the 1952 Revolution; under Nasser, feminism was tied to anti-colonial and anti-capitalist discourses that comprised the larger political milieu (Ibrahim 2017, 4-5). Still, Egyptian activists struggled to connect with the working-class, and the discourse \"creat[ed] a paternalistic and detached dynamic\" (Ibrahim 2017, 3). Within the state, opportunities for women's work and education were expanded just as women's political space was shut down (Ibrahim 2017, 6; Gaul 2025, 78-79, 101). Alongside shifts in feminist discourse, the state's expansion of education access-especially for the poor-would shape feminism to better incorporate working class women (Ibrahim 2017, 13). These state-led interventions into women's experiences would come into tension with Sadat's policy of economic liberalization (infitah). Women's activism focused less on colonialism and more on the economic and political realities of the time (Ibrahim 2017, 15). In this political iteration, the \"modern\" West became the normative goal of feminism (Ibrahim 2017, 16). These unresolved tensions would reemerge in the 2011 Arab Spring as feminism reasserted itself through a more intersectional lens (Ibrahim 2017, 20). Hatem (2011) documents women, \"young and old, veiled and unveiled, poor and affluent,\" joining together in Tahrir Square against the rule of the state (36). This experience was likewise translated into discourse: feminists discredited both historical and contemporaneous versions of state-sponsored feminism (Hatem 2011, 37). These social transformations do not only function as historical context. They also shape the archival material of \"Doing Well, Don't Worry.\" Nasser's education policies contour the archives of a rural teacher; Sadat's infitah frames Mitri's prison correspondence; and the Arab Spring echoes the diverse coalitions in Tahrir square (Hassan 2021; Hatem 2011, 36).",
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

// Ensure Italian exists even if not fully customized yet.
TRANSLATIONS.it = {
  ...TRANSLATIONS.en,
  appTitle: "Archivio Relazionale della Storymap",
  exhibitionTitle: "Doing Well, Don’t Worry: Un archivio femminista relazionale",
  exhibitionSubtitle:
    "The Women and Memory Forum ripensa l'archivio di Wedad Mitri come pratica di mentorship, solidarieta e apprendimento collettivo.",
  citationsTitle: "Riferimenti in stile Chicago",
  pedagogyTooltip:
    "Pedagogia del sentire: apprendimento femminista attraverso memoria, affetto e azione relazionale.",
};

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
  exhibitionTitle: "بخير، لا تقلقي: أرشيف نسوي علائقي",
  exhibitionSubtitle:
    "يعيد منتدى المرأة والذاكرة قراءة أرشيف وداد متري بوصفه إرشادًا نسويًا عابرًا للأجيال والطبقات.",
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

let currentLang = "en";
try {
  currentLang = localStorage.getItem(LANG_STORAGE_KEY) || "en";
} catch {
  // If localStorage is blocked, keep default language.
}
if (!SUPPORTED_LANGS.includes(currentLang)) currentLang = "en";

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en?.[key] ?? key;
}

function setLanguage(nextLang) {
  if (!SUPPORTED_LANGS.includes(nextLang)) return;
  currentLang = nextLang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  } catch {
    // ignore
  }
  applyTranslations();
  // Update the dynamic selected panel too.
  renderSelectedPanel();
  renderStoryOrderList();
  renderCitationOverlay();
}

function applyTranslations() {
  const dir = currentLang === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = currentLang === "ar" ? "ar" : currentLang;
  document.title = t("appTitle");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (!key) return;
    node.setAttribute("placeholder", t(key));
  });

  const langSelect = document.getElementById("langSelect");
  if (langSelect) langSelect.value = currentLang;
}

const el = {
  btnReset: document.getElementById("btnReset"),
  btnAddPerson: document.getElementById("btnAddPerson"),
  btnAddEvent: document.getElementById("btnAddEvent"),
  btnLink: document.getElementById("btnLink"),
  btnReLayout: document.getElementById("btnReLayout"),
  btnDeleteSelected: document.getElementById("btnDeleteSelected"),
  btnExportJson: document.getElementById("btnExportJson"),
  btnImportJson: document.getElementById("btnImportJson"),
  btnMakeShareLink: document.getElementById("btnMakeShareLink"),

  personName: document.getElementById("personName"),
  personDesc: document.getElementById("personDesc"),
  eventTitle: document.getElementById("eventTitle"),
  eventDate: document.getElementById("eventDate"),

  personSelectFrom: document.getElementById("personSelectFrom"),
  eventSelectTo: document.getElementById("eventSelectTo"),
  edgeRole: document.getElementById("edgeRole"),

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
}

function loadContentConfig() {
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONTENT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONTENT, ...(parsed && typeof parsed === "object" ? parsed : {}) };
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

function applyContentConfigToPage() {
  const cfg = loadContentConfig();
  document.querySelectorAll("[data-content-key]").forEach((node) => {
    const key = node.getAttribute("data-content-key");
    if (!key) return;
    const value = cfg[key];
    if (typeof value !== "string") return;
    node.textContent = value;
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

function defaultStorymapCanvasState() {
  return {
    nodes: [
      { id: "1", type: "text", content: "Demonstration & Lecture", color: "green", x: 100, y: 70 },
      { id: "2", type: "text", content: "Analytical Engine Workshop", color: "green", x: 70, y: 330 },
      { id: "3", type: "image", content: "/people-lantern.jpg", color: "orange", x: 430, y: 220 },
      { id: "4", type: "tag", content: "A", color: "blue", x: 600, y: 100 },
      { id: "5", type: "tag", content: "H", color: "blue", x: 570, y: 430 },
    ],
    edges: [
      { source: "1", target: "3" },
      { source: "2", target: "3" },
      { source: "2", target: "5" },
      { source: "1", target: "4" },
      { source: "2", target: "4" },
    ],
  };
}

function defaultStorymapAdminCanvasState() {
  return {
    nodes: [
      { id: "a1", type: "text", content: "Archive Intake Board", color: "green", x: 120, y: 90 },
      { id: "a2", type: "text", content: "Curation Notes Desk", color: "teal", x: 120, y: 340 },
      { id: "a3", type: "image", content: "", color: "orange", x: 470, y: 220 },
      { id: "a4", type: "tag", content: "A", color: "blue", x: 650, y: 110 },
      { id: "a5", type: "tag", content: "H", color: "blue", x: 620, y: 430 },
    ],
    edges: [
      { source: "a1", target: "a3" },
      { source: "a2", target: "a3" },
      { source: "a2", target: "a5" },
      { source: "a1", target: "a4" },
    ],
  };
}

function loadStorymapCanvasState() {
  try {
    const key = MODE === "admin" ? STORYMAP_CANVAS_ADMIN_KEY : STORYMAP_CANVAS_PUBLIC_KEY;
    const fallback = MODE === "admin" ? defaultStorymapAdminCanvasState() : defaultStorymapCanvasState();
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return fallback;
    return parsed;
  } catch {
    return MODE === "admin" ? defaultStorymapAdminCanvasState() : defaultStorymapCanvasState();
  }
}

function saveStorymapCanvasState(payload) {
  try {
    const key = MODE === "admin" ? STORYMAP_CANVAS_ADMIN_KEY : STORYMAP_CANVAS_PUBLIC_KEY;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function initCustomStorymapCanvas() {
  const viewport = document.getElementById("storymapViewport");
  const world = document.getElementById("storymapWorld");
  const nodesLayer = document.getElementById("storymapNodes");
  const edgesSvg = document.getElementById("storymapEdges");
  const panel = document.getElementById("storymapAdminPanel");
  if (!viewport || !world || !nodesLayer || !edgesSvg) return false;

  const isAdmin = MODE === "admin";
  let canvas = loadStorymapCanvasState();
  let selectedId = null;
  let view = { scale: 1, panX: 0, panY: 0 };
  let panDraft = null;
  let nodeDragDraft = null;

  const contentInput = document.getElementById("smNodeContent");
  const imageFileInput = document.getElementById("smNodeImageFile");
  const colorSelect = document.getElementById("smNodeColor");
  const saveBtn = document.getElementById("smSaveNode");
  const addChildBtn = document.getElementById("smAddChildNode");
  const linkExistingBtn = document.getElementById("smLinkExisting");
  const deleteNodeBtn = document.getElementById("smDeleteNode");
  const zoomInBtn = document.getElementById("smZoomIn");
  const zoomOutBtn = document.getElementById("smZoomOut");

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

  const getNodeByIdLocal = (id) => canvas.nodes.find((n) => n.id === id) || null;

  const syncPanel = () => {
    const node = selectedId ? getNodeByIdLocal(selectedId) : null;
    if (!panel || !node || !isAdmin) {
      if (!panel) return;
      panel.classList.remove("storymapAdminPanel--open");
      panel.setAttribute("aria-hidden", "true");
      return;
    }
    panel.classList.add("storymapAdminPanel--open");
    panel.setAttribute("aria-hidden", "false");
    if (contentInput) contentInput.value = node.content || "";
    if (colorSelect) colorSelect.value = node.color || "green";
    if (imageFileInput) imageFileInput.value = "";
  };

  const drawEdges = () => {
    edgesSvg.innerHTML = "";
    const nodeEls = new Map();
    nodesLayer.querySelectorAll(".smNode").forEach((elNode) => {
      nodeEls.set(elNode.getAttribute("data-id"), elNode);
    });
    canvas.edges.forEach((edge) => {
      const source = nodeEls.get(edge.source);
      const target = nodeEls.get(edge.target);
      if (!source || !target) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const x1 = source.offsetLeft + source.offsetWidth / 2;
      const y1 = source.offsetTop + source.offsetHeight / 2;
      const x2 = target.offsetLeft + target.offsetWidth / 2;
      const y2 = target.offsetTop + target.offsetHeight / 2;
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      edgesSvg.appendChild(line);
    });
  };

  const makeNodeEl = (node) => {
    const div = document.createElement("div");
    div.className = `smNode smNode--${node.type} smColor--${node.color || "green"}`;
    if (selectedId === node.id) div.classList.add("smNode--selected");
    div.dataset.id = node.id;
    div.style.left = `${node.x}px`;
    div.style.top = `${node.y}px`;

    if (node.type === "image") {
      const img = document.createElement("img");
      img.src = node.content || storymapPlaceholderSvg();
      img.alt = "Story node image";
      img.addEventListener("error", () => {
        img.src = storymapPlaceholderSvg();
      });
      div.appendChild(img);
    } else {
      div.textContent = node.content || "";
    }
    return div;
  };

  const renderCanvas = () => {
    nodesLayer.innerHTML = "";
    canvas.nodes.forEach((node) => {
      const nodeEl = makeNodeEl(node);
      nodeEl.addEventListener("click", (evt) => {
        evt.stopPropagation();
        selectedId = node.id;
        renderCanvas();
        syncPanel();
      });
      nodeEl.addEventListener("mousedown", (evt) => {
        if (!isAdmin || evt.button !== 0) return;
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
      if (!isAdmin) {
        selectedId = null;
        syncPanel();
        renderCanvas();
      }
    }
  });

  window.addEventListener("mousemove", (evt) => {
    if (nodeDragDraft && isAdmin) {
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
      const nextScale = Math.max(0.6, Math.min(2.4, view.scale * scaleFactor));
      const rect = viewport.getBoundingClientRect();
      view.panX = evt.clientX - rect.left - before.x * nextScale;
      view.panY = evt.clientY - rect.top - before.y * nextScale;
      view.scale = nextScale;
      updateWorldTransform();
    },
    { passive: false }
  );

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
    view.scale = Math.max(0.6, view.scale / 1.18);
    view.panX = cx - beforeX * view.scale;
    view.panY = cyPoint - beforeY * view.scale;
    updateWorldTransform();
  });

  on(saveBtn, "click", () => {
    if (!isAdmin || !selectedId) return;
    const node = getNodeByIdLocal(selectedId);
    if (!node) return;
    if (contentInput) node.content = contentInput.value.trim();
    if (colorSelect) node.color = colorSelect.value;
    saveStorymapCanvasState(canvas);
    renderCanvas();
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
      node.content = String(reader.result || "");
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
    const id = `n_${uuid().slice(0, 8)}`;
    canvas.nodes.push({
      id,
      type: "text",
      content: label.trim(),
      color: "green",
      x: parent.x + 130,
      y: parent.y + 80,
    });
    canvas.edges.push({ source: parent.id, target: id });
    selectedId = id;
    saveStorymapCanvasState(canvas);
    renderCanvas();
    syncPanel();
  });

  on(linkExistingBtn, "click", () => {
    if (!isAdmin || !selectedId) return;
    const options = canvas.nodes.filter((n) => n.id !== selectedId).map((n) => `${n.id}: ${n.content}`).join("\n");
    const id = prompt(`Target node id:\n${options}`);
    if (!id) return;
    const target = getNodeByIdLocal(id.trim());
    if (!target) return;
    const exists = canvas.edges.some((e) => e.source === selectedId && e.target === target.id);
    if (!exists) {
      canvas.edges.push({ source: selectedId, target: target.id });
      saveStorymapCanvasState(canvas);
      renderCanvas();
    }
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

  viewport.addEventListener("click", (evt) => {
    const targetNode = evt.target && evt.target.closest ? evt.target.closest(".smNode") : null;
    if (targetNode) return;
    if (!isAdmin) return;
    selectedId = null;
    syncPanel();
    renderCanvas();
  });

  updateWorldTransform();
  renderCanvas();
  syncPanel();
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

function normalizeGraph(maybeGraph) {
  const graph = maybeGraph && typeof maybeGraph === "object" ? maybeGraph : null;
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];

  // Keep only supported node types and required shape.
  const cleanedNodes = [];
  nodes.forEach((n) => {
    if (!n) return;
    if ((n.type !== "person" && n.type !== "event") || typeof n.id !== "string") return;
    cleanedNodes.push({
      id: String(n.id),
      type: n.type,
      label: coerceStringOrEmpty(n.label),
      description: n.type === "person" ? coerceStringOrEmpty(n.description) : "",
      date: n.type === "event" ? coerceStringOrEmpty(n.date) : "",
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
    .filter((e) => e && typeof e.id === "string" && nodeIds.has(e.source) && nodeIds.has(e.target))
    .filter((e) => {
      const s = cleanedNodes.find((n) => n.id === e.source);
      const t = cleanedNodes.find((n) => n.id === e.target);
      if (!s || !t) return false;
      return s.type === "person" && t.type === "event";
    })
    .map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      role: String(e.role ?? ""),
    }));

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

function updateSelectOptions() {
  if (!el.personSelectFrom || !el.eventSelectTo) return;
  const personNodes = state.nodes.filter((n) => n.type === "person");
  const eventNodes = state.nodes.filter((n) => n.type === "event");

  const prevPerson = el.personSelectFrom.value;
  const prevEvent = el.eventSelectTo.value;

  el.personSelectFrom.innerHTML = "";
  personNodes.forEach((n) => {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = n.label || n.id;
    el.personSelectFrom.appendChild(opt);
  });

  el.eventSelectTo.innerHTML = "";
  eventNodes.forEach((n) => {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = n.label || n.id;
    el.eventSelectTo.appendChild(opt);
  });

  // Restore previous selections if still present.
  if (personNodes.some((n) => n.id === prevPerson)) el.personSelectFrom.value = prevPerson;
  if (eventNodes.some((n) => n.id === prevEvent)) el.eventSelectTo.value = prevEvent;
}

function refreshAllUI() {
  if (MODE === "admin") {
    updateSelectOptions();

    // Disable link button if no valid selection.
    const canLink = state.nodes.some((n) => n.type === "person") && state.nodes.some((n) => n.type === "event");
    if (el.btnLink) el.btnLink.disabled = !canLink;

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

// Language switching.
document.getElementById("langSelect")?.addEventListener("change", (evt) => {
  const nextLang = evt.target?.value || "en";
  setLanguage(nextLang);
});

applyTranslations();

// Wire up UI events.
on(el.btnReset, "click", () => {
  setGraphAndRerender(sampleGraph(), { shouldSave: true, preserveSelection: false });
  if (el.shareLink) el.shareLink.value = "";
  if (el.shareWarning) el.shareWarning.textContent = "";
});

on(el.btnAddPerson, "click", () => {
  const name = el.personName.value.trim();
  const description = el.personDesc.value.trim();
  if (!name) {
    alert("Person name is required.");
    return;
  }

  const next = {
    nodes: [...state.nodes, makePersonNode({ name, description })],
    edges: state.edges,
  };

  setGraphAndRerender(next, { shouldSave: true });
  el.personName.value = "";
  el.personDesc.value = "";
});

on(el.btnAddEvent, "click", () => {
  const title = el.eventTitle.value.trim();
  const date = el.eventDate.value.trim();
  if (!title) {
    alert("Event title is required.");
    return;
  }

  const next = {
    nodes: [...state.nodes, makeEventNode({ title, date })],
    edges: state.edges,
  };

  setGraphAndRerender(next, { shouldSave: true });
  el.eventTitle.value = "";
  el.eventDate.value = "";
});

on(el.btnLink, "click", () => {
  const personId = el.personSelectFrom.value;
  const eventId = el.eventSelectTo.value;
  const role = el.edgeRole.value.trim();

  if (!personId || !eventId) {
    alert("Select both a person and an event.");
    return;
  }

  const person = getNodeById(state, personId);
  const event = getNodeById(state, eventId);
  if (!person || person.type !== "person" || !event || event.type !== "event") {
    alert("Invalid selection. Relationships must connect a person to an event.");
    return;
  }

  const next = {
    nodes: state.nodes,
    edges: [...state.edges, makeEdge({ sourcePersonId: personId, targetEventId: eventId, role })],
  };

  setGraphAndRerender(next, { shouldSave: true });
  el.edgeRole.value = "";
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

  if (el.sidebarTitle) el.sidebarTitle.textContent = node.label || node.id;
  if (el.sidebarMeta) {
    const meta = [node.type === "person" ? t("nodePerson") : t("nodeEvent")];
    if (node.type === "event" && (node.date || "").trim()) meta.push(node.date.trim());
    el.sidebarMeta.textContent = meta.join(" • ");
  }
  if (el.sidebarDescription) {
    const desc = (node.notes || "").trim() || (node.description || "").trim();
    const meta = [node.dateRange, node.contextTags, node.mentorshipRole].filter(Boolean).join(" | ");
    const text = [desc, meta].filter(Boolean).join("\n");
    el.sidebarDescription.textContent = text || "";
    el.sidebarDescription.style.display = text ? "block" : "none";
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

  const metaParts = [];
  metaParts.push(node.type === "person" ? t("nodePerson") : t("nodeEvent"));
  if (node.type === "event" && (node.date || "").trim()) metaParts.push(node.date.trim());
  if (el.nodeModalMeta) el.nodeModalMeta.textContent = metaParts.join(" • ");

  const desc =
    (node.notes || "").trim() ||
    (node.type === "person" ? (node.description || "").trim() : "") ||
    "";
  const detailParts = [];
  if ((node.dateRange || "").trim()) detailParts.push(`Date range: ${node.dateRange.trim()}`);
  if ((node.contextTags || "").trim()) detailParts.push(`Tags: ${node.contextTags.trim()}`);
  if ((node.audioDescription || "").trim()) detailParts.push(`Audio: ${node.audioDescription.trim()}`);
  if ((node.pedagogyNotes || "").trim()) detailParts.push(`Pedagogy: ${node.pedagogyNotes.trim()}`);
  const combinedDesc = [desc, ...detailParts].filter(Boolean).join("\n\n");
  el.nodeModalDescription.textContent = combinedDesc || "";
  el.nodeModalDescription.style.display = combinedDesc ? "block" : "none";

  const hasPhoto = Boolean((node.photo || "").trim());
  if (hasPhoto) {
    el.nodeModalImage.src = node.photo;
    el.nodeModalImage.alt = `${node.label || "Node"} image`;
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
    setStatus("Editable content saved.", { isError: false });
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

// Initial render.
if (document.readyState === "loading") {
  on(document, "DOMContentLoaded", () => console.log("Page loaded"));
} else {
  console.log("Page loaded");
}

window.addEventListener("error", (evt) => {
  setStatus("A runtime error occurred. Showing fallback content.", { isError: true });
  console.error("Runtime error:", evt.error || evt.message);
});

try {
  applyContentConfigToPage();
  initScrollReveals();
  initHeroParallax();
  initContentEditorPanel();
  setStatus("Loading storymap...", { isLoading: true });
  if (document.getElementById("storymapViewport")) {
    initCustomStorymapCanvas();
    setStatus("");
  } else if (MODE === "history") {
    setStatus("");
  } else {
    refreshAllUI();
    if (MODE === "admin") upsertJsonAreaFromState();
    setStatus("");
  }
} catch (err) {
  console.error(err);
  setStatus("Failed to initialize storymap. Check console for details.", { isError: true });
  if (el && el.cy) {
    el.cy.innerHTML = `
      <div class="muted" style="padding:12px;">
        Failed to initialize the app. See console for details.
      </div>
    `;
  }
}

