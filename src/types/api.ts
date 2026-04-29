// ─────────────────────────────────────────────────────────────────────────────
// ViñaMed — Tipos TypeScript para la capa API
//
// Estos tipos son independientes de @prisma/client y representan la forma
// de los datos que viajan entre el backend (API REST) y el frontend.
//
// Convenciones:
//   - Fechas:      string en formato ISO 8601 (JSON serializa Date → string)
//   - IDs:         string (UUID v4)
//   - Campos nulos: `field: T | null` (null explícito, no undefined, en respuestas)
//   - DTOs de entrada: undefined para omitir, null para borrar un campo opcional
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enumeraciones ────────────────────────────────────────────────────────────
// Deben mantenerse sincronizadas con los enums de prisma/schema.prisma.

export enum Profesion {
  TECNOLOGO_MEDICO = 'TECNOLOGO_MEDICO',
  MEDICO_RADIOLOGO = 'MEDICO_RADIOLOGO',
  ENFERMERO        = 'ENFERMERO',
  ADMIN            = 'ADMIN',
}

export enum ReportEstado {
  PENDIENTE  = 'PENDIENTE',
  COMPLETADO = 'COMPLETADO',
  FIRMADO    = 'FIRMADO',
}

export enum TipoExamen {
  ECO_ABDOMINAL    = 'ECO_ABDOMINAL',
  ECO_PELVICA      = 'ECO_PELVICA',
  ECO_OBSTETRICA   = 'ECO_OBSTETRICA',
  ECO_TIROIDES     = 'ECO_TIROIDES',
  ECO_MAMARIA      = 'ECO_MAMARIA',
  ECO_RENAL        = 'ECO_RENAL',
  ECO_VASCULAR     = 'ECO_VASCULAR',
  ECO_PARTES_BLANDAS = 'ECO_PARTES_BLANDAS',
  ECO_CARDIACA     = 'ECO_CARDIACA',
  OTRO             = 'OTRO',
}

export enum Sexo {
  MASCULINO = 'MASCULINO',
  FEMENINO  = 'FEMENINO',
  OTRO      = 'OTRO',
}

export enum Prevision {
  FONASA     = 'FONASA',
  ISAPRE     = 'ISAPRE',
  PARTICULAR = 'PARTICULAR',
}

export enum AuditAccion {
  CREACION      = 'CREACION',
  EDICION       = 'EDICION',
  CAMBIO_ESTADO = 'CAMBIO_ESTADO',
  FIRMA         = 'FIRMA',
  ELIMINACION   = 'ELIMINACION',
  VISUALIZACION = 'VISUALIZACION',
}

// ─── Sistema de Permisos (RBAC) ───────────────────────────────────────────────
// Los valores del array `facultades` en User.
// El backend valida estos strings en cada endpoint protegido.

export type Facultad =
  | 'ECO_WRITE'      // Crear y editar informes propios
  | 'ECO_READ_ALL'   // Leer informes de cualquier autor (filtro admin)
  | 'ECO_SIGN'       // Firmar/validar informes (solo Médico Radiólogo)
  | 'ECO_DELETE'     // Eliminar informes (borrado lógico)
  | 'STAFF_ADMIN';   // Gestionar usuarios: crear, activar/desactivar, asignar facultades

// Helper para type-guard en el frontend
export function tieneFacultad(facultades: string[], facultad: Facultad): boolean {
  return facultades.includes(facultad);
}

// ─── Entidades de Apoyo ───────────────────────────────────────────────────────

export interface PacienteDTO {
  id:         string;
  rut:        string;
  nombre:     string;
  fecha_nac:  string;       // ISO 8601 date string
  sexo:       Sexo;
  prevision:  Prevision;
  telefono:   string | null;
  email:      string | null;
}

// Perfil mínimo del autor embebido en un Report (no expone password_hash ni facultades)
export interface AutorMinDTO {
  id:           string;
  nombre:       string;
  rut:          string;
  profesion:    Profesion;
  registro_sis: string | null;
}

// ─── DTOs de AuditLog ─────────────────────────────────────────────────────────

export interface AuditCambios {
  campos_modificados: string[];
  antes:              Record<string, unknown> | null;
  despues:            Record<string, unknown> | null;
}

export interface AuditLogDTO {
  id:         string;
  report_id:  string;
  accion:     AuditAccion;
  cambios:    AuditCambios;
  ip_address: string | null;
  created_at: string;
  user:       AutorMinDTO;
}

// ─── DTOs de Report ───────────────────────────────────────────────────────────

/**
 * Payload que el frontend envía al endpoint POST /reports.
 * El backend infiere `autor_id` del token de sesión autenticado — nunca del body.
 */
export interface CreateReportDTO {
  paciente_id:    string;
  tipo_examen:    TipoExamen;
  hallazgos:      string;
  conclusion:     string;
  recomendaciones?: string;
}

/**
 * Payload que el frontend envía al endpoint PATCH /reports/:id.
 * Solo se envían los campos que efectivamente cambian.
 * El backend rechaza la petición si el Report está en estado FIRMADO.
 */
export interface UpdateReportDTO {
  tipo_examen?:     TipoExamen;
  hallazgos?:       string;
  conclusion?:      string;
  recomendaciones?: string | null;
}

/**
 * Payload para firmar un informe: PATCH /reports/:id/firmar
 * Solo ejecutable por usuarios con facultad ECO_SIGN.
 * El backend asigna `firmante_id` desde el token, registra `signed_at`
 * y cambia el estado a FIRMADO de forma atómica (transacción).
 */
export interface FirmarReportDTO {
  confirmacion: true;  // Campo centinela para evitar firmas accidentales
}

/**
 * Representación completa de un informe para visualización.
 * Incluye las tres entidades de autoría ya resueltas (JOIN del backend).
 */
export interface ReportDTO {
  id:              string;
  tipo_examen:     TipoExamen;
  hallazgos:       string;
  conclusion:      string;
  recomendaciones: string | null;
  estado:          ReportEstado;
  created_at:      string;
  updated_at:      string;
  signed_at:       string | null;

  // Trazabilidad de autoría (siempre resueltas como objetos, no como IDs crudos)
  paciente:       PacienteDTO;
  autor:          AutorMinDTO;
  firmante:       AutorMinDTO | null;
  last_edited_by: AutorMinDTO | null;
}

/**
 * Versión reducida de ReportDTO para listados y tablas.
 * Omite los textos largos (hallazgos, conclusión) para aligerar la respuesta.
 */
export interface ReportSummaryDTO {
  id:          string;
  tipo_examen: TipoExamen;
  estado:      ReportEstado;
  created_at:  string;
  signed_at:   string | null;
  paciente:    Pick<PacienteDTO, 'id' | 'rut' | 'nombre'>;
  autor:       Pick<AutorMinDTO, 'id' | 'nombre'>;
  firmante:    Pick<AutorMinDTO, 'id' | 'nombre'> | null;
}

// ─── DTOs de User / Staff ─────────────────────────────────────────────────────

/**
 * Perfil completo de un profesional clínico para vistas de administración.
 * No incluye `password_hash`.
 * `_count` es el shape que Prisma retorna al usar `include: { _count: true }`.
 */
export interface StaffProfileDTO {
  id:           string;
  rut:          string;
  nombre:       string;
  email:        string;
  registro_sis: string | null;
  profesion:    Profesion;
  facultades:   Facultad[];
  activo:       boolean;
  created_at:   string;
  updated_at:   string;
  _count: {
    informes_creados:  number;
    informes_firmados: number;
  };
}

/**
 * Payload para crear un nuevo usuario del staff.
 * Solo ejecutable por usuarios con facultad STAFF_ADMIN.
 */
export interface CreateStaffDTO {
  rut:          string;
  nombre:       string;
  email:        string;
  password:     string;
  registro_sis?: string;
  profesion:    Profesion;
  facultades:   Facultad[];
}

/**
 * Payload para actualizar facultades o datos de un profesional.
 */
export interface UpdateStaffDTO {
  nombre?:      string;
  email?:       string;
  registro_sis?: string | null;
  profesion?:   Profesion;
  facultades?:  Facultad[];
  activo?:      boolean;
}

// ─── Parámetros de Consulta ───────────────────────────────────────────────────

/**
 * Filtros disponibles en GET /reports.
 * `autor_id` está disponible solo para usuarios con facultad ECO_READ_ALL.
 * Sin ese permiso, el backend ignora el parámetro y filtra por el propio usuario.
 */
export interface FilterReportsParams {
  autor_id?:    string;
  estado?:      ReportEstado;
  tipo_examen?: TipoExamen;
  paciente_id?: string;
  from?:        string;   // ISO 8601 date
  to?:          string;   // ISO 8601 date
  page?:        number;
  limit?:       number;
}

// ─── Respuestas genéricas de la API ───────────────────────────────────────────

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message:    string;
  code:       string;   // Ej: "REPORT_LOCKED", "INSUFFICIENT_PERMISSIONS"
  timestamp:  string;
}
