import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PRESTACIONES_ECO } from '../constants/prestacionesEco';

export async function seedPrestacionesEco() {
  const batch = writeBatch(db);

  for (const prestacion of PRESTACIONES_ECO) {
    const ref = doc(collection(db, 'tiposAtencion'), prestacion.id);
    batch.set(ref, {
      id:     prestacion.id,
      label:  prestacion.label,
      grupo:  prestacion.grupo,
      activo: true,
    });
  }

  await batch.commit();
  console.log(`Seed completado: ${PRESTACIONES_ECO.length} prestaciones escritas en Firestore`);
}

seedPrestacionesEco().catch(console.error);
