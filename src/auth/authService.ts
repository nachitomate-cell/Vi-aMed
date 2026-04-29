import type { AuthUser } from '../types/eco-mobile';

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de respuesta del backend.
// Cuando exista la API real, este shape debe coincidir con el body del JWT
// decodificado o con la respuesta directa del endpoint POST /api/auth/login.
// ─────────────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  user: AuthUser;
}

// Error tipado para distinguir fallos de autenticación de errores de red.
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' | 'SERVER_ERROR' = 'INVALID_CREDENTIALS',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN DEMO (sin backend real)
// Usuarios extraídos del seed de la base de datos local (prisma/seed.ts).
// Contraseña por defecto para todos: VinamedCl2025!
//
// TODO: Reemplazar por la llamada real:
//   const res = await fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ rut, password }),
//   });
//   if (res.status === 401) throw new AuthError('Credenciales incorrectas.');
//   if (!res.ok) throw new AuthError('Error del servidor.', 'SERVER_ERROR');
//   const { token } = await res.json();
//   const payload = JSON.parse(atob(token.split('.')[1]));
//   return { user: { rut: payload.sub, name: payload.name, role: payload.role } };
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────


import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { dbVinamed, authVinamed } from '../lib/firebase';

const ROL_MAP: Record<string, string> = {
  medico: 'MEDICO_RADIOLOGO',
  tecnologo: 'TECNOLOGO_MEDICO',
  enfermero: 'ENFERMERO',
  admin: 'ADMIN',
  secretaria: 'SECRETARIA'
};

export async function loginWithCredentials(rut: string, password: string): Promise<LoginResponse> {
  try {
    // 1. Buscar al profesional por RUT para obtener su email
    // Nota: Ahora las reglas de Firestore permiten lectura pública de 'profesionales'
    const q = query(collection(dbVinamed, 'profesionales'), where('rut', '==', rut));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new AuthError('RUT no encontrado. Verifique sus credenciales.');
    }

    const doc = snap.docs[0];
    const data = doc.data();
    const email = data.email;

    if (!email) {
      throw new AuthError('El usuario no tiene un correo electrónico asociado.');
    }

    // 2. Autenticar en Firebase Auth
    const credential = await signInWithEmailAndPassword(authVinamed, email, password);
    const fbUser = credential.user;

    // 3. Devolver el usuario formateado para el contexto de la app
    return {
      user: {
        uid: fbUser.uid,
        rut: data.rut,
        name: data.nombre,
        role: ROL_MAP[data.rol] ?? 'TECNOLOGO_MEDICO'
      }
    };
  } catch (err: any) {
    console.error('Error en loginWithCredentials:', err);
    if (err instanceof AuthError) throw err;
    
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      throw new AuthError('Contraseña incorrecta.');
    }
    if (err.code === 'auth/user-not-found') {
      throw new AuthError('Usuario no encontrado.');
    }
    
    throw new AuthError('Error de autenticación: ' + (err.message || 'Intente nuevamente.'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ruta de destino según el rol del usuario, usada tras el login exitoso.
// El orden de los casos debe coincidir con los permisos del schema.prisma.
// ─────────────────────────────────────────────────────────────────────────────
export function getDefaultRoute(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/';
    case 'MEDICO_RADIOLOGO':
    case 'TECNOLOGO_MEDICO':
    case 'ENFERMERO':
    default:
      return '/eco-mobile';
  }
}
