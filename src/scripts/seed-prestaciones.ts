/**
 * seed-prestaciones.ts
 * Agrega las prestaciones solicitadas a Firestore.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, getDocs, addDoc, query, where
} from 'firebase/firestore';

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

const PRESTACIONES_RAW = `
0101001	Consulta Medicina General
0101321	Consulta Médica de Especialidad en Enfermedades Respiratorias Adulto
010100SM	Consulta Médica Salud Mental
0404003	Ecografía Abdominal
0404006	Ecografía Pelviana Femenina (No Ginecológica)
0404009	Ecografía Pélvica Masculina (Incluye Vejiga y Próstata)
0404010	Ecografía Renal (Bilateral), o de Bazo
0404012	Ecografía Mamaria Bilateral (Incluye Doppler)
0404014	Ecografía Testicular
0404015	Ecografía Tiroidea (Incluye Doppler)
0404016G	Ecografía Glándulas Salivales
0404016LP	Ecografía Lumbar Pediátrica
0404118	Ecografía Doppler Arterial y Venosa Extremidad Inferior
0404118a	Ecografía Doppler Arterial Extremidad Inferior
0404118as	Ecografía Doppler Arterial Extremidad Superior
0404118av	Ecografía Doppler Arterial y Venosa Extremidad Inferior
0404118avs	Ecografía Doppler Arterial y Venosa Extremidad Superior
0404118s	Ecografía Doppler Arterial y Venosa Extremidad Superior
0404118t	Ecografía Doppler de Vasos Temporales
0404118v	Ecografía Doppler Venosa Extremidad Inferior
0404118vs	Ecografía Doppler Venosa Extremidad Superior
0404119	Ecografía Doppler de Vasos del Cuello
0404121	Ecografía Doppler de Vasos Testiculares
0404121DA	Ecografía Doppler Abdominal
0404121R	Ecografía Doppler Renal
040418av2	Ecografía Vascular Periférica Arterial y Venosa
040418p	Ecografía Doppler Arterial y Venosa Extremidad Inferior
0404016	Ecografía Partes Blandas o Musculoesquelética (General)
04040146	Ecografía Partes Blandas Rodilla Derecha
0404016AD	Ecografía Partes Blandas Antebrazo Derecho
0404016AI	Ecografía Partes Blandas Antebrazo Izquierdo
0404016BD	Ecografía Partes Blandas Brazo Derecho
0404016BI	Ecografía Partes Blandas Brazo Izquierdo
0404016C	Ecografía Partes Blandas Cabeza
0404016CA	Ecografía Partes Blandas Cara
0404016CAD	Ecografía Partes Blandas Cadera Derecha
0404016CAI	Ecografía Partes Blandas Cadera Izquierda
0404016CD	Ecografía Partes Blandas Codo Derecho
0404016CI	Ecografía Partes Blandas Codo Izquierdo
0404016CU	Ecografía Partes Blandas Cuello
0404016D	Ecografía Partes Blandas Dorsal
0404016DD	Ecografía Partes Blandas Dedo
0404016DI	Ecografía Partes Blandas Dedo
0404016GD	Ecografía Partes Blandas Glúteo Derecho
0404016GI	Ecografía Partes Blandas Glúteo Izquierdo
0404016HD	Ecografía Partes Blandas Hombro Derecho
0404016HI	Ecografía Partes Blandas Hombro Izquierdo
0404016HPD	Ecografía Partes Blandas Región Poplítea Derecha
0404016HPI	Ecografía Partes Blandas Región Poplítea Izquierda
0404016ID	Ecografía Partes Blandas Inguinal Derecha
0404016II	Ecografía Partes Blandas Inguinal Izquierda
0404016L	Ecografía Partes Blandas Lumbar
0404016MD	Ecografía Partes Blandas Mano Derecha
0404016MI	Ecografía Partes Blandas Mano Izquierda
0404016MUD	Ecografía Partes Blandas Muslo Derecho
0404016MUI	Ecografía Partes Blandas Muslo Izquierdo
0404016MÑD	Ecografía Partes Blandas Muñeca Derecha
0404016MÑI	Ecografía Partes Blandas Muñeca Izquierda
0404016o	Ecografía Partes Blandas Otras Regiones
0404016oo	Ecografía Partes Blandas Otras Regiones
0404016PA	Ecografía Partes Blandas Pared Abdominal
04040416PA	Ecografía Partes Blandas Pared Abdominal
0404016PCD	Ecografía Partes Blandas Parrilla Costal Derecha
0404016PCI	Ecografía Partes Blandas Parrilla Costal Izquierda
0404016PD	Ecografía Partes Blandas Pierna Derecha
0404016PI	Ecografía Partes Blandas Pierna Izquierda
0404016PID	Ecografía Partes Blandas Pie Derecho
0404016PII	Ecografía Partes Blandas Pie Izquierdo
0404016RD	Ecografía Partes Blandas Rodilla Derecha
0404016RI	Ecografía Partes Blandas Rodilla Izquierda
0404016S	Ecografía Partes Blandas Sacrocoxis
0404016T	Ecografía Partes Blandas Tórax
0404016TAD	Ecografía Partes Blandas Tendón de Aquiles Derecho
0404016TAI	Ecografía Partes Blandas Tendón de Aquiles Izquierdo
0404016TD	Ecografía Partes Blandas Tobillo Derecho
0404016TI	Ecografía Partes Blandas Tobillo Izquierdo
`;

async function seed() {
  console.log('Iniciando carga de prestaciones...');
  const colRef = collection(db, 'gestion_prestaciones');

  const lines = PRESTACIONES_RAW.split('\n').filter(l => l.trim().length > 0);

  for (const line of lines) {
    // Buscar el primer tab o espacio múltiple para separar código de nombre
    const match = line.match(/^(\S+)\s+(.+)$/);
    if (!match) continue;

    const [_, codigo, nombre] = match;
    const finalNombre = `${codigo} - ${nombre.trim()}`;

    // Verificar si ya existe (por nombre completo)
    const q = query(colRef, where('nombre', '==', finalNombre));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(colRef, { 
        nombre: finalNombre,
        codigo: codigo,
        descripcion: nombre.trim(),
        activo: true,
        creadoEn: new Date().toISOString()
      });
      console.log(`✅ Añadida: ${finalNombre}`);
      // Pequeña espera para evitar saturación o problemas de propagación
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log(`⚠ Saltada (ya existe): ${finalNombre}`);
    }
  }

  console.log('Proceso completado.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
