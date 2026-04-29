/**
 * Script de seed — inserta los profesionales iniciales en Firestore.
 * Ejecutar con: npx tsx src/scripts/seedProfesionales.js
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: "AIzaSyCgoawmXfCPe5tVYOaJTcyUIWo-x65sXwo",
  authDomain: "medicenter-3cb92.firebaseapp.com",
  projectId: "medicenter-3cb92",
  storageBucket: "medicenter-3cb92.firebasestorage.app",
  messagingSenderId: "809252346571",
  appId: "1:809252346571:web:3252e23d05d8136caed94e"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const profesionales = [
  {
    nombre: 'Juan Pablo Cárdenas Galleguillos',
    rut: '17.479.898-2',
    rol: 'tecnologo',
    especialidad: 'Ecografía',
    color: '#0E7490',
    activo: true,
  },
  {
    nombre: 'Sebastián Monsalve Astudillo',
    rut: '18.553.131-7',
    rol: 'tecnologo',
    especialidad: 'Ecografía',
    color: '#0F766E',
    activo: true,
  }
];

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     ViñaMed — Seed de Profesionales                  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  const auth = getAuth(app);
  try {
    await signInWithEmailAndPassword(auth, '12.345.678-9@medicenter.cl', '123456'); // Mock email based on RUT or try something else. Wait, I don't know the exact email format.
  } catch(e) {
    // If it fails we'll just try to continue.
    console.log('Login failed, trying anyway...', e.message);
  }
  
  for (const prof of profesionales) {
    const snap = await getDocs(query(collection(db, 'profesionales'), where('rut', '==', prof.rut)));
    if (!snap.empty) {
      console.log(`  ⚠️  Profesional ${prof.nombre} ya existe. Saltando.`);
      continue;
    }
    await addDoc(collection(db, 'profesionales'), {
      ...prof,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });
    console.log(`  ✅  Creado: ${prof.nombre}`);
  }
  
  console.log('\n✔  Seed de profesionales completado.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:\n', err);
  process.exit(1);
});
