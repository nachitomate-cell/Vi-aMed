// ─────────────────────────────────────────────────────────────────────────────
// Capa de servicio para el módulo "Gestión Interna" (datos maestros).
// Centraliza el acceso a Firestore para que el componente no llame al SDK
// directamente. Todas las escrituras traducen el error 'permission-denied'
// a un PermisoError tipado, para poder mostrar un mensaje claro al usuario.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../lib/firebase';
import { normalizarRut } from '../utils/rut';

export interface GestionItem {
  id: string;
  nombre: string;
  activo?: boolean;
  rol?: string;
  email?: string;
  rut?: string;
  [key: string]: any;
}

/** Error de permisos: la sesión no puede escribir en Firestore. */
export class PermisoError extends Error {
  constructor(message = 'Sin permisos de escritura en la base de datos.') {
    super(message);
    this.name = 'PermisoError';
  }
}

function traducirError(e: any): never {
  if (e?.code === 'permission-denied' || /permission|insufficient/i.test(e?.message ?? '')) {
    throw new PermisoError();
  }
  throw e;
}

// ── Roles (mapa explícito, reemplaza la cadena de .replace()) ────────────────

export const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SECRETARIA', label: 'Recepción / Secretaría' },
  { value: 'MEDICO_RADIOLOGO', label: 'Médico Radiólogo' },
  { value: 'TECNOLOGO_MEDICO', label: 'Tecnólogo Médico' },
  { value: 'ENFERMERO', label: 'Enfermería' },
] as const;

const ALIAS_ROL: Record<string, string> = {
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

const VALORES_VALIDOS = new Set<string>(ROLES.map(r => r.value));

/** Normaliza cualquier variante de rol al valor canónico. */
export function normalizarRol(raw?: string): string {
  if (!raw) return 'TECNOLOGO_MEDICO';
  const k = raw.toLowerCase().trim();
  if (ALIAS_ROL[k]) return ALIAS_ROL[k];
  const upper = raw.toUpperCase().trim();
  return VALORES_VALIDOS.has(upper) ? upper : 'TECNOLOGO_MEDICO';
}

// ── Valores sugeridos (carga explícita, ya NO se siembran al leer) ───────────

export const SUGERIDOS: Record<string, string[]> = {
  gestion_especialidades: ['Ecografía', 'Medicina General', 'Enfermería'],
  gestion_previsiones: ['Fonasa', 'Particular', 'Isapre'],
  gestion_metodos_pago: ['Débito', 'Crédito', 'Efectivo', 'Transferencia'],
  gestion_sexos: ['Masculino', 'Femenino', 'No binario'],
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listarColeccion(nombreColeccion: string): Promise<GestionItem[]> {
  const snap = await getDocs(collection(db, nombreColeccion));
  return snap.docs.map(d => {
    const data = d.data() as any;
    return { id: d.id, ...data, nombre: data.nombre ?? data.name ?? data.email ?? 'Sin nombre' };
  });
}

export async function crearItem(
  nombreColeccion: string,
  data: Record<string, any>,
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, nombreColeccion), { ...data, creadoEn: serverTimestamp() });
    return ref.id;
  } catch (e) { traducirError(e); }
}

export async function actualizarItem(
  nombreColeccion: string,
  id: string,
  data: Record<string, any>,
): Promise<void> {
  try {
    await updateDoc(doc(db, nombreColeccion, id), { ...data, actualizadoEn: serverTimestamp() });
  } catch (e) { traducirError(e); }
}

export async function eliminarItem(nombreColeccion: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, nombreColeccion, id));
  } catch (e) { traducirError(e); }
}

// ── Alta de usuarios con credenciales ────────────────────────────────────────

// Mismas credenciales del proyecto ViñaMed (ver lib/firebase.ts). Se usan para
// crear la cuenta de Auth en una app secundaria temporal, de modo que el alta
// NO cierre la sesión del administrador que está creando el usuario.
const CONFIG_VINAMED = {
  apiKey:            'AIzaSyBdedhr4yUsc1F665UXeBWBEj03U-ttO6Y',
  authDomain:        'vinamed-10b76.firebaseapp.com',
  projectId:         'vinamed-10b76',
  storageBucket:     'vinamed-10b76.firebasestorage.app',
  messagingSenderId: '902644783277',
  appId:             '1:902644783277:web:ce55f4024a6ce4fd578e24',
};

/** Referencia mínima a una prestación que realiza el usuario. */
export interface PrestacionRef {
  id: string;
  nombre: string;
}

export interface NuevoUsuarioInput {
  nombre?: string;
  rut: string;
  password: string;
  rol: string;                  // valor canónico de ROLES
  especialidad?: string;
  prestaciones?: PrestacionRef[];
}

/**
 * Crea un usuario con credenciales propias: cuenta en Firebase Auth (con la
 * contraseña que define el administrador) + documento en `usuarios`.
 *
 * Como el equipo inicia sesión por RUT (ver authService), se genera un email
 * sintético derivado del RUT. El usuario nunca lo escribe: solo usa su RUT y la
 * contraseña que aquí se define.
 */
export async function crearUsuarioConPassword(input: NuevoUsuarioInput): Promise<GestionItem> {
  const rut = normalizarRut(input.rut);
  const rutLimpio = rut.replace(/[^0-9kK]/g, '').toLowerCase();
  const email = `${rutLimpio}@rut.vinamed.cl`;

  let tempApp: ReturnType<typeof initializeApp> | null = null;
  try {
    tempApp = initializeApp(CONFIG_VINAMED, `temp-create-${Date.now()}`);
    const tempAuth = getAuth(tempApp);
    const credential = await createUserWithEmailAndPassword(tempAuth, email, input.password);
    const uid = credential.user.uid;

    const datos = {
      uid,
      nombre:       input.nombre?.trim() || rut,
      rut,
      email,
      rol:          input.rol,
      especialidad: input.especialidad?.trim() || '',
      prestaciones: input.prestaciones ?? [],
      activo:       true,
      creadoEn:     serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'usuarios'), datos);
    return { id: ref.id, ...datos };
  } catch (e) {
    return traducirError(e);
  } finally {
    if (tempApp) {
      try { await deleteApp(tempApp); } catch { /* ignore */ }
    }
  }
}

/** Crea en lote los valores sugeridos de una colección. Devuelve los items creados. */
export async function sembrarSugeridos(nombreColeccion: string): Promise<GestionItem[]> {
  const valores = SUGERIDOS[nombreColeccion];
  if (!valores?.length) return [];
  const creados: GestionItem[] = [];
  for (const nombre of valores) {
    const id = await crearItem(nombreColeccion, { nombre, activo: true });
    creados.push({ id, nombre, activo: true });
  }
  return creados;
}
