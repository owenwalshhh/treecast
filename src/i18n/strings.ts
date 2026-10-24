/**
 * Treecast — all user-facing strings, English and Spanish.
 *
 * Per accessibility.md: no hard-coded UI text in components. Every label the
 * user can read comes from here, keyed by a short name.
 */

export type Lang = "en" | "es" | "pt" | "fr" | "ht";

/**
 * Selectable languages, each labelled in its OWN language (native name). These
 * stay in their own script regardless of the active language — a Spanish
 * speaker still sees "Français", not a translation of it.
 *
 * Chosen for Chelsea's actual communities: large Latino (Spanish, Portuguese)
 * and Haitian (Haitian Creole) populations, plus English and French.
 *
 * en/es are fully translated. pt/fr/ht have native names + key labels; any
 * string without a translation falls back to English (see t()).
 */
export const LANGUAGES: { code: Lang; native: string }[] = [
  { code: "en", native: "English" },
  { code: "es", native: "Español" },
  { code: "pt", native: "Português" },
  { code: "fr", native: "Français" },
  { code: "ht", native: "Kreyòl Ayisyen" },
];

export const STRINGS = {
  appTitle: { en: "Treecast", es: "Treecast" },
  tagline: {
    en: "Where to plant trees to cool homes and save energy.",
    es: "Dónde plantar árboles para refrescar hogares y ahorrar energía.",
    pt: "Onde plantar árvores para refrescar casas e poupar energia.",
    fr: "Où planter des arbres pour rafraîchir les maisons et économiser l'énergie.",
    ht: "Kote pou plante pyebwa pou fè kay fre epi ekonomize enèji.",
  },
  dataReal: {
    en: "Real Chelsea buildings (Overture Maps)",
    es: "Edificios reales de Chelsea (Overture Maps)",
  },
  dataDemo: {
    en: "Demo data (sample grid)",
    es: "Datos de demostración (cuadrícula de muestra)",
  },
  budgetLabel: { en: "Tree budget", es: "Presupuesto de árboles", pt: "Orçamento de árvores", fr: "Budget d'arbres", ht: "Bidjè pyebwa" },
  budgetUnit: { en: "trees", es: "árboles", pt: "árvores", fr: "arbres", ht: "pyebwa" },
  sliderLabel: {
    en: "Energy vs. equity",
    es: "Energía frente a equidad",
    pt: "Energia vs. equidade",
    fr: "Énergie vs. équité",
    ht: "Enèji vs. ekite",
  },
  sliderEnergy: { en: "Energy", es: "Energía", pt: "Energia", fr: "Énergie", ht: "Enèji" },
  sliderEquity: { en: "Equity", es: "Equidad", pt: "Equidade", fr: "Équité", ht: "Ekite" },
  optimize: { en: "Optimize", es: "Optimizar", pt: "Otimizar", fr: "Optimiser", ht: "Optimize" },
  optimizing: { en: "Optimizing…", es: "Optimizando…", pt: "Otimizando…", fr: "Optimisation…", ht: "Ap optimize…" },
  growthLabel: { en: "Tree growth", es: "Crecimiento del árbol", pt: "Crescimento da árvore", fr: "Croissance de l'arbre", ht: "Kwasans pyebwa" },
  growthYear: { en: "Year", es: "Año", pt: "Ano", fr: "Année", ht: "Ane" },
  growthPlanted: { en: "just planted", es: "recién plantado", pt: "recém-plantado", fr: "fraîchement planté", ht: "fèk plante" },
  growthMature: { en: "mature", es: "maduro", pt: "maduro", fr: "mature", ht: "gran" },
  showNaive: { en: "Show naive plan", es: "Mostrar plan ingenuo" },
  showOptimized: { en: "Show optimized plan", es: "Mostrar plan optimizado" },
  planOptimized: { en: "Optimized plan", es: "Plan optimizado" },
  planNaive: { en: "Naive plan", es: "Plan ingenuo" },
  treesPlaced: { en: "Trees placed", es: "Árboles colocados" },
  totalScore: { en: "Plan score (relative)", es: "Puntaje del plan (relativo)" },
  scoreNote: {
    en: "A relative ranking, not kWh. Savings shown elsewhere are estimated.",
    es: "Un ranking relativo, no kWh. Los ahorros mostrados son estimados.",
  },
  mapView: { en: "Map view", es: "Vista de mapa" },
  colId: { en: "Tree", es: "Árbol" },
  colDirection: { en: "Side of building", es: "Lado del edificio" },
  colLeaf: { en: "Leaf type", es: "Tipo de hoja" },
  colScore: { en: "Score", es: "Puntaje" },
  colLocation: { en: "Location", es: "Ubicación" },
  leafDeciduous: { en: "deciduous", es: "caducifolio" },
  leafEvergreen: { en: "evergreen", es: "perenne" },
  dir_N: { en: "North", es: "Norte", pt: "Norte", fr: "Nord", ht: "Nò" },
  dir_NE: { en: "Northeast", es: "Noreste", pt: "Nordeste", fr: "Nord-est", ht: "Nòdès" },
  dir_E: { en: "East", es: "Este", pt: "Leste", fr: "Est", ht: "Lès" },
  dir_SE: { en: "Southeast", es: "Sureste", pt: "Sudeste", fr: "Sud-est", ht: "Sidès" },
  dir_S: { en: "South", es: "Sur", pt: "Sul", fr: "Sud", ht: "Sid" },
  dir_SW: { en: "Southwest", es: "Suroeste", pt: "Sudoeste", fr: "Sud-ouest", ht: "Sidwès" },
  dir_W: { en: "West", es: "Oeste", pt: "Oeste", fr: "Ouest", ht: "Lwès" },
  dir_NW: { en: "Northwest", es: "Noroeste", pt: "Noroeste", fr: "Nord-ouest", ht: "Nòdwès" },
  tier_very_dense: { en: "a very dense block", es: "una cuadra muy densa" },
  tier_dense: { en: "a dense block", es: "una cuadra densa" },
  tier_moderate: { en: "a moderately built-up block", es: "una cuadra medianamente construida" },
  tier_low_density: { en: "a low-density block", es: "una cuadra de baja densidad" },
  langEnglish: { en: "English", es: "Inglés" },
  langSpanish: { en: "Spanish", es: "Español" },
  language: { en: "Language", es: "Idioma", pt: "Idioma", fr: "Langue", ht: "Lang" },
  sectionPlan: { en: "Plan", es: "Plan", pt: "Plano", fr: "Plan", ht: "Plan" },
  sectionArea: { en: "Area", es: "Área", pt: "Área", fr: "Zone", ht: "Zòn" },
  sectionGrowth: { en: "Growth", es: "Crecimiento", pt: "Crescimento", fr: "Croissance", ht: "Kwasans" },
  tableView: { en: "Table", es: "Tabla", pt: "Tabela", fr: "Tableau", ht: "Tablo" },

  // "Why here?" popup
  whyHere: { en: "Why here?", es: "¿Por qué aquí?" },
  whyClose: { en: "Close", es: "Cerrar" },
  whyDirection: { en: "Side of building", es: "Lado del edificio" },
  whyLeaf: { en: "Tree type", es: "Tipo de árbol" },
  whyDistance: { en: "Distance to wall", es: "Distancia a la pared" },
  whyEquity: { en: "Neighborhood need", es: "Necesidad del barrio" },
  whyUtility: { en: "Electric utility", es: "Compañía eléctrica" },
  whyEjCriteria: { en: "EJ criteria", es: "Criterios JA" },
  overviewToggle: { en: "All of Inner Core", es: "Todo el Inner Core" },
  overviewBack: { en: "Back to town", es: "Volver al pueblo" },
  overviewLegendTitle: { en: "EJ block groups", es: "Grupos de JA" },
  overviewLegendNote: {
    en: "Count of EJ-flagged 2020 block groups (MassGIS). Darker = more.",
    es: "Número de grupos marcados de JA 2020 (MassGIS). Más oscuro = más.",
  },
  overviewListTitle: { en: "Inner Core towns", es: "Pueblos del Inner Core" },
  overviewOpen: { en: "Open this town", es: "Abrir este pueblo" },
  overviewNotBuilt: { en: "not built yet", es: "sin construir" },
  tableEmpty: {
    en: "Generate a tree placement first — press Optimize.",
    es: "Primero genera una ubicación de árboles — pulsa Optimizar.",
  },
  residentExit: { en: "Close", es: "Cerrar" },
  residentTapPrompt: {
    en: "Tap your home on the map to see where a tree would help it most.",
    es: "Toca tu casa en el mapa para ver dónde un árbol ayudaría más.",
  },
  residentTapAgain: { en: "Tap again to pick a different spot.", es: "Toca de nuevo para elegir otro lugar." },
  residentUseLocation: { en: "Use my location", es: "Usar mi ubicación" },
  residentResultTitle: { en: "Best spots for a tree near you", es: "Mejores lugares para un árbol cerca de ti" },
  residentNone: {
    en: "No helpful spot found right next to this home. Try tapping a nearby building.",
    es: "No se encontró un buen lugar junto a esta casa. Prueba tocar un edificio cercano.",
  },
  residentEstimate: {
    en: "Estimated from sun angle and your home's walls. We never pick a spot that would raise your heating.",
    es: "Estimado según el sol y las paredes de tu casa. Nunca elegimos un lugar que suba tu calefacción.",
  },
  residentToggle: { en: "Resident view", es: "Vista de residente" },
  reason_westBest: {
    en: "West/southwest side: the best spot. Shade here blocks hot summer afternoon sun.",
    es: "Lado oeste/suroeste: el mejor lugar. La sombra bloquea el sol caliente de la tarde en verano.",
  },
  reason_eastModest: {
    en: "East side: modest help. Morning shade, less than the west.",
    es: "Lado este: ayuda modesta. Sombra en la mañana, menos que el oeste.",
  },
  reason_northWindbreak: {
    en: "North side: small effect. Mainly a winter windbreak.",
    es: "Lado norte: efecto pequeño. Sobre todo un cortavientos de invierno.",
  },
  reason_southDeciduousOk: {
    en: "South side with a leafy tree: fine. Bare winter branches let the low sun warm the home.",
    es: "Lado sur con árbol caducifolio: bien. Las ramas sin hojas en invierno dejan pasar el sol.",
  },
  reason_southEvergreenPenalty: {
    en: "South side with an evergreen: a penalty. It blocks the winter sun and raises heating.",
    es: "Lado sur con árbol perenne: una penalización. Bloquea el sol de invierno y sube la calefacción.",
  },
  reason_evergreenWindbreakGood: {
    en: "An evergreen here makes a good winter windbreak.",
    es: "Un árbol perenne aquí es un buen cortavientos de invierno.",
  },
  reason_closeToWall: {
    en: "Close to the wall: a strong shade effect.",
    es: "Cerca de la pared: un efecto de sombra fuerte.",
  },
  reason_farFromWall: {
    en: "Far from the wall: a weaker effect.",
    es: "Lejos de la pared: un efecto más débil.",
  },
  reason_highEquity: {
    en: "A high-need neighborhood: this tree helps residents most at risk from heat.",
    es: "Un barrio de alta necesidad: este árbol ayuda a los residentes más expuestos al calor.",
  },
  reason_lowEquity: {
    en: "A lower-need neighborhood.",
    es: "Un barrio de menor necesidad.",
  },

  // Sources & limits panel
  sourcesTitle: { en: "Sources & limits", es: "Fuentes y límites" },
  sourcesIntro: {
    en: "Every number here is a modeled estimate, not a measurement. Data sources:",
    es: "Cada número aquí es una estimación modelada, no una medición. Fuentes de datos:",
  },
  sourcesUsedFor: { en: "Used for", es: "Se usa para" },
  sourcesCantTell: { en: "Can't tell us", es: "No nos dice" },
  limitsTitle: { en: "Known limits", es: "Límites conocidos" },
  limit1: {
    en: "Scores are a relative ranking, not predicted kWh or dollars.",
    es: "Los puntajes son un ranking relativo, no kWh ni dólares.",
  },
  limit2: {
    en: "Equity uses real EJ block groups; a site outside a flagged group has none.",
    es: "La equidad usa grupos de JA reales; un sitio fuera de un grupo marcado no tiene.",
  },
  limit3: {
    en: "The tree-growth curve shape is an assumption, pending the i-Tree equation.",
    es: "La curva de crecimiento es una suposición, a la espera de la ecuación i-Tree.",
  },
  limit4: {
    en: "Building heights are partly estimated: a missing height is drawn as 8 m and flagged.",
    es: "Las alturas de edificios son en parte estimadas: una altura faltante se dibuja como 8 m.",
  },
  limit5: {
    en: "Shade data exists only where the pipeline ran; a town not yet built has none.",
    es: "Los datos de sombra existen solo donde corrió el proceso; un pueblo sin construir no tiene.",
  },
  limit6: {
    en: "Any town outside MAPC's Inner Core needs a pipeline run before it appears.",
    es: "Un pueblo fuera del Inner Core de MAPC necesita correr el proceso antes de aparecer.",
  },

  // Select-area tool
  areaWhole: { en: "Whole city", es: "Toda la ciudad" },
  areaSelect: { en: "Select an area", es: "Seleccionar un área" },
  areaDrawing: {
    en: "Click the map to add corners. Double-click to finish.",
    es: "Haz clic para añadir esquinas. Doble clic para terminar.",
  },
  areaClear: { en: "Clear area", es: "Borrar área" },
  areaActive: { en: "Trees limited to your area", es: "Árboles limitados a tu área" },
  existingTrees: { en: "Existing trees", es: "Árboles existentes" },
  existingNone: {
    en: "No existing-tree data for this city yet.",
    es: "Aún no hay datos de árboles existentes para esta ciudad.",
  },
  shadeToggle: { en: "Shade map", es: "Mapa de sombra" },  shadeNone: { en: "Least shade", es: "Menos sombra" },
  shadeFull: { en: "Most shade", es: "Más sombra" },
  warnTitle: { en: "Not enough room", es: "No hay espacio suficiente", pt: "Espaço insuficiente", fr: "Pas assez de place", ht: "Pa gen ase plas" },
  warnBody: {
    en: "Only {placed} of {requested} trees fit here with the spacing and no-building rules. Draw a larger area or lower the budget.",
    es: "Solo caben {placed} de {requested} árboles aquí con las reglas de espaciado. Dibuja un área más grande o baja el presupuesto.",
  },
  warnOk: { en: "Got it", es: "Entendido", pt: "Entendi", fr: "Compris", ht: "Konprann" },
  searchCity: {
    en: "Search a Massachusetts city",
    es: "Buscar una ciudad de Massachusetts",
    pt: "Procurar uma cidade de Massachusetts",
    fr: "Rechercher une ville du Massachusetts",
    ht: "Chèche yon vil Massachusetts",
  },
  zoomIn: { en: "Zoom in", es: "Acercar", pt: "Aproximar", fr: "Zoomer", ht: "Zoume" },
  zoomOut: { en: "Zoom out", es: "Alejar", pt: "Afastar", fr: "Dézoomer", ht: "Dezoume" },
  recenter: {
    en: "Fit the whole city",
    es: "Ver toda la ciudad",
    pt: "Ver a cidade inteira",
    fr: "Voir toute la ville",
    ht: "Wè tout vil la",
  },
  mapCredit: {
    en: "© OpenFreeMap · OpenStreetMap contributors",
    es: "© OpenFreeMap · colaboradores de OpenStreetMap",
  },
  treeWord: { en: "Tree", es: "Árbol", pt: "Árvore", fr: "Arbre", ht: "Pyebwa" },
  townPicker: {
    en: "Choose a town",
    es: "Elige un municipio",
    pt: "Escolha uma cidade",
    fr: "Choisir une ville",
    ht: "Chwazi yon vil",
  },
  townLoading: { en: "Loading…", es: "Cargando…" },
  subheading: {
    en: "Serving Greater Boston",
    es: "Para el Gran Boston",
    pt: "Servindo a Grande Boston",
    fr: "Au service du Grand Boston",
    ht: "Nan sèvis Gran Boston",
  },
} as const;

export type StringKey = keyof typeof STRINGS;

/**
 * Look up one string in the chosen language, falling back to English when that
 * language has no translation for the key (pt/fr/ht are partial — names + key
 * labels native, the rest English).
 */
export function t(key: StringKey, lang: Lang): string {
  const entry = STRINGS[key] as Record<string, string>;
  return entry[lang] ?? entry.en;
}
