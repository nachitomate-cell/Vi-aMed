/**
 * Script de seed — inserta los horarios iniciales de Juan Pablo y Sebastián en Firestore.
 * Ejecutar con: node --experimental-vm-modules src/scripts/seedHorarios.js
 * o con tsx:    npx tsx src/scripts/seedHorarios.js
 *
 * Requiere las variables de entorno de Firebase en .env (no .env.local)
 */

// @ts-nocheck
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, getDocs, query, where,
  addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer .env manualmente (sin dotenv)
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env'), 'utf-8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // Intentar con variables ya seteadas en el ambiente
  }
}
loadEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Datos de los profesionales a configurar ──────────────────────────────────
const PROFESIONALES_SEED = [
  { rut: '17.479.898-2', nombre: 'Juan Pablo Cárdenas Galleguillos' },
  { rut: '18.553.131-7', nombre: 'Sebastián Monsalve Astudillo' },
];

const HORARIO_BASE = {
  diasSemana: [1, 3, 6],          // Lun, Mié, Sáb
  horaInicio: '08:00',
  horaFin: '17:00',
  duracionSlotMinutos: 30,
  tiempoMuertoMinutos: 10,
  activo: true,
};

async function getProfesionalIdPorRut(rut) {
  // Buscar en colección 'profesionales' por campo rut
  const snap = await getDocs(query(collection(db, 'profesionales'), where('rut', '==', rut)));
  if (!snap.empty) return snap.docs[0].id;

  // Fallback: buscar en colección 'users'
  const snap2 = await getDocs(query(collection(db, 'users'), where('rut', '==', rut)));
  if (!snap2.empty) return snap2.docs[0].id;

  return null;
}

async function upsertHorario(profesionalId, nombre) {
  const snap = await getDocs(
    query(collection(db, 'horarios'), where('profesionalId', '==', profesionalId))
  );

  const datos = { ...HORARIO_BASE, profesionalId, actualizadoEn: serverTimestamp() };

  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, datos);
    console.log(`  ✅  Horario actualizado para ${nombre} (${profesionalId})`);
  } else {
    const ref = await addDoc(collection(db, 'horarios'), datos);
    console.log(`  ✅  Horario creado para ${nombre} (${ref.id})`);
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     ViñaMed — Seed de Horarios Clínicos             ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`  Proyecto: ${firebaseConfig.projectId}\n`);

  for (const prof of PROFESIONALES_SEED) {
    console.log(`  Procesando: ${prof.nombre} (RUT ${prof.rut})`);
    const pid = await getProfesionalIdPorRut(prof.rut);
    if (!pid) {
      console.warn(`  ⚠️   No se encontró profesional con RUT ${prof.rut} — saltando\n`);
      continue;
    }
    await upsertHorario(pid, prof.nombre);
    console.log(`      Días: Lun · Mié · Sáb`);
    console.log(`      Horario: 08:00 – 17:00  |  Slot: 30 min  |  Entre citas: 10 min\n`);
  }

  console.log('─'.repeat(54));
  console.log('✔   Seed de horarios completado.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Error:\n', err);
  process.exit(1);
});
