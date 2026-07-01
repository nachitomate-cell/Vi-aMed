// ─────────────────────────────────────────────────────────────────────────────
// Permisos de visibilidad del sidebar (control en el cliente).
// FUENTE ÚNICA DE VERDAD: para cambiar qué ve cada rol, edita MATRIZ.
// Para ocultar un módulo a TODOS sin borrar su matriz, agrégalo a MODULOS_OCULTOS.
// ─────────────────────────────────────────────────────────────────────────────

export type Rol = 'ADMIN' | 'SECRETARIA' | 'MEDICO_RADIOLOGO' | 'TECNOLOGO_MEDICO' | 'ENFERMERO';

export type Modulo =
  | 'dashboard' | 'agenda' | 'recepcion' | 'box-medicina' | 'box-ecografia'
  | 'box-enfermeria' | 'validar-informe' | 'setm' | 'generar' | 'planilla'
  | 'protocolos' | 'pacientes' | 'nuevo-paciente' | 'profesionales'
  | 'inventario' | 'reportes' | 'gestion';

/** Módulos desactivados globalmente (no se muestran a NINGÚN rol). */
export const MODULOS_OCULTOS = new Set<Modulo>(['agenda', 'box-enfermeria', 'validar-informe', 'recepcion']);

/** Matriz rol → módulos visibles. (Ver tabla acordada). */
const MATRIZ: Record<Rol, Modulo[]> = {
  ADMIN: [
    'dashboard', 'agenda', 'recepcion', 'box-medicina', 'box-ecografia',
    'box-enfermeria', 'validar-informe', 'setm', 'generar', 'planilla',
    'protocolos', 'pacientes', 'nuevo-paciente', 'profesionales',
    'inventario', 'reportes', 'gestion',
  ],
  SECRETARIA: [
    'dashboard', 'recepcion', 'pacientes', 'nuevo-paciente', 'setm', 'generar', 'planilla',
  ],
  MEDICO_RADIOLOGO: [
    'dashboard', 'pacientes', 'nuevo-paciente', 'box-ecografia', 'box-medicina', 'setm', 'protocolos',
  ],
  TECNOLOGO_MEDICO: [
    'dashboard', 'pacientes', 'nuevo-paciente', 'box-ecografia', 'generar',
  ],
  ENFERMERO: [
    'dashboard', 'recepcion', 'pacientes', 'nuevo-paciente', 'setm',
  ],
};

// Normaliza cualquier variante de rol al valor canónico.
const ALIAS_ROL: Record<string, Rol> = {
  admin: 'ADMIN',
  secretaria: 'SECRETARIA',
  recepcion: 'SECRETARIA',
  medico: 'MEDICO_RADIOLOGO',
  medico_radiologo: 'MEDICO_RADIOLOGO',
  tecnologo: 'TECNOLOGO_MEDICO',
  tecnologo_medico: 'TECNOLOGO_MEDICO',
  enfermero: 'ENFERMERO',
  enfermeria: 'ENFERMERO',
};

export function normalizarRol(rolRaw?: string | null): Rol | null {
  if (!rolRaw) return null;
  const k = rolRaw.toLowerCase().trim();
  return ALIAS_ROL[k] ?? null;
}

/** ¿El rol puede ver este módulo? (respeta los módulos ocultos globalmente). */
export function puedeVer(rolRaw: string | null | undefined, modulo: Modulo): boolean {
  if (MODULOS_OCULTOS.has(modulo)) return false;
  const rol = normalizarRol(rolRaw);
  if (!rol) return false;
  return MATRIZ[rol].includes(modulo);
}

/** Lista de módulos visibles para un rol (por si se necesita en otras vistas). */
export function modulosVisibles(rolRaw: string | null | undefined): Modulo[] {
  const rol = normalizarRol(rolRaw);
  if (!rol) return [];
  return MATRIZ[rol].filter(m => !MODULOS_OCULTOS.has(m));
}
