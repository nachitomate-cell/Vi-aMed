/**
 * seed-paciente-prueba.ts
 * Inserta el paciente de prueba "Ignacio Mateluna" en Firestore (colección 'users')
 * y lo registra también en 'pacientes' para el panel de Pacientes.
 * Ejecutar: npx tsx seed-paciente-prueba.ts
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdedhr4yUsc1F665UXeBWBEj03U-ttO6Y",
  authDomain: "vinamed-10b76.firebaseapp.com",
  projectId: "vinamed-10b76",
  storageBucket: "vinamed-10b76.firebasestorage.app",
  messagingSenderId: "902644783277",
  appId: "1:902644783277:web:ce55f4024a6ce4fd578e24",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const uid = 'paciente-prueba-ignacio-001';

  const pacienteData = {
    uid,
    rut: '11111111-1',
    rutFormateado: '11.111.111-1',
    nombreCompleto: 'Ignacio Mateluna Paciente Prueba',
    nombres: 'Ignacio',
    apellidoPaterno: 'Mateluna',
    apellidoMaterno: 'Paciente Prueba',
    telefono: '+56900000001',
    correo: 'ignacio.prueba@vinamed.cl',
    sexo: 'Masculino',
    fechaNacimiento: '1990-01-01',
    direccion: 'Av. Prueba 123, Viña del Mar',
    tipoDocumento: 'rut',
    pais: 'Chile',
    esPacientePrueba: true,
    creadoEn: serverTimestamp(),
  };

  // En colección 'users' (portal paciente)
  await setDoc(doc(db, 'users', uid), pacienteData);
  console.log('✅ Paciente insertado en /users/', uid);

  // En colección 'pacientes' (dashboard)
  await setDoc(doc(db, 'pacientes', uid), pacienteData);
  console.log('✅ Paciente insertado en /pacientes/', uid);

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error al insertar paciente:', err);
  process.exit(1);
});
