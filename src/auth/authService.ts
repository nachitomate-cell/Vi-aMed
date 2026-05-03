import type { AuthUser } from '../types/eco-mobile';
import { normalizarRut } from '../utils/rut';

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
    const rutNormalizado = normalizarRut(rut);
    
    // 1. Buscar primero en la colección de usuarios (staff/admin/recepcion)
    let userData: any = null;
    let email = '';
    let rolRaw = '';

    const qUsers = query(collection(dbVinamed, 'usuarios'), where('rut', '==', rutNormalizado));
    const snapUsers = await getDocs(qUsers);

    if (!snapUsers.empty) {
      userData = snapUsers.docs[0].data();
      email = userData.email;
      rolRaw = userData.rol || userData.role;
    } else {
      // 2. Si no es usuario administrativo, buscar en profesionales
      const qProf = query(collection(dbVinamed, 'profesionales'), where('rut', '==', rutNormalizado));
      const snapProf = await getDocs(qProf);

      if (!snapProf.empty) {
        userData = snapProf.docs[0].data();
        email = userData.email;
        rolRaw = userData.rol;
      }
    }

    if (!userData) {
      throw new AuthError('RUT no encontrado. Verifique sus credenciales.');
    }

    if (!email) {
      throw new AuthError('El usuario no tiene un correo electrónico asociado.');
    }

    // 3. Autenticar en Firebase Auth
    const credential = await signInWithEmailAndPassword(authVinamed, email, password);
    const fbUser = credential.user;

    // 4. Devolver el usuario formateado
    return {
      user: {
        uid: fbUser.uid,
        rut: userData.rut || rutNormalizado,
        name: userData.nombre || userData.name || 'Usuario',
        role: ROL_MAP[rolRaw?.toLowerCase()] ?? rolRaw ?? 'TECNOLOGO_MEDICO'
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
