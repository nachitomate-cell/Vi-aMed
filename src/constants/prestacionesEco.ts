// src/constants/prestacionesEco.ts
// Fuente de verdad de las 26 prestaciones de ecografía de ViñaMed
// Mantener este archivo sincronizado con Firestore colección 'tiposAtencion'

export const PRESTACIONES_ECO = [
  // ── Doppler y vascular ──────────────────────────────────
  { id: 'eco-doppler-color',      label: 'Ecografía Doppler color',       grupo: 'Doppler y vascular' },
  { id: 'eco-doppler-renal',      label: 'Ecografía Doppler renal',       grupo: 'Doppler y vascular' },
  { id: 'eco-doppler-arterial',   label: 'Ecografía Doppler arterial',    grupo: 'Doppler y vascular' },
  { id: 'eco-doppler-venoso',     label: 'Ecografía Doppler venoso',      grupo: 'Doppler y vascular' },
  { id: 'eco-doppler-testicular', label: 'Ecografía Doppler testicular',  grupo: 'Doppler y vascular' },
  { id: 'eco-vascular-periferico',label: 'Ecografía vascular periférico', grupo: 'Doppler y vascular' },
  { id: 'eco-vasos-cuello',       label: 'Ecografía vasos del cuello',    grupo: 'Doppler y vascular' },

  // ── Cabeza y cuello ────────────────────────────────────
  { id: 'eco-tiroidea-cuello',    label: 'Ecografía tiroidea / cuello',   grupo: 'Cabeza y cuello' },
  { id: 'eco-region-facial',      label: 'Ecografía región facial',       grupo: 'Cabeza y cuello' },
  { id: 'eco-region-cervical',    label: 'Ecografía región cervical',     grupo: 'Cabeza y cuello' },

  // ── Músculo-esquelético ────────────────────────────────
  { id: 'eco-dedos-manos',        label: 'Ecografía dedos / manos',       grupo: 'Músculo-esquelético' },
  { id: 'eco-munecas-codos',      label: 'Ecografía muñecas / codos',     grupo: 'Músculo-esquelético' },
  { id: 'eco-hombros',            label: 'Ecografía hombros',             grupo: 'Músculo-esquelético' },
  { id: 'eco-region-axilar',      label: 'Ecografía región axilar',       grupo: 'Músculo-esquelético' },
  { id: 'eco-pies-tobillos',      label: 'Ecografía pies / tobillos',     grupo: 'Músculo-esquelético' },
  { id: 'eco-rodillas',           label: 'Ecografía rodillas',            grupo: 'Músculo-esquelético' },
  { id: 'eco-caderas',            label: 'Ecografía caderas',             grupo: 'Músculo-esquelético' },
  { id: 'eco-unas',               label: 'Ecografía uñas',                grupo: 'Músculo-esquelético' },

  // ── Piel y tejidos ─────────────────────────────────────
  { id: 'eco-piel',               label: 'Ecografía de piel',             grupo: 'Piel y tejidos' },

  // ── Abdominal y pélvico ────────────────────────────────
  { id: 'eco-abdominal',          label: 'Ecografía abdominal',           grupo: 'Abdominal y pélvico' },
  { id: 'eco-renal',              label: 'Ecografía renal',               grupo: 'Abdominal y pélvico' },
  { id: 'eco-pelviana',           label: 'Ecografía pelviana',            grupo: 'Abdominal y pélvico' },
  { id: 'eco-inguinal',           label: 'Ecografía inguinal',            grupo: 'Abdominal y pélvico' },

  // ── Otras ──────────────────────────────────────────────
  { id: 'eco-pediatrica',         label: 'Ecografía pediátrica',          grupo: 'Otras' },
  { id: 'eco-mamaria',            label: 'Ecografía mamaria',             grupo: 'Otras' },
  { id: 'eco-testicular',         label: 'Ecografía testicular',          grupo: 'Otras' },
];

// Helper: solo los labels para dropdowns simples
export const LABELS_ECO = PRESTACIONES_ECO.map(p => p.label);

// Helper: grupos únicos para filtros
export const GRUPOS_ECO = Array.from(new Set(PRESTACIONES_ECO.map(p => p.grupo)));
