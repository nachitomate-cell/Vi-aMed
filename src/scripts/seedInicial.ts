import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizarRut } from '../utils/rut';

async function seed() {
  // Tecnólogos
  const profesionales = [
    {
      nombre: 'Juan Pablo Cárdenas Galleguillos',
      rut: normalizarRut('17479898-2'),
      rol: 'tecnologo',
      especialidad: 'Ecografía',
      color: '#0E7490',
      activo: true,
    },
    {
      nombre: 'Sebastián Monsalve Astudillo',
      rut: normalizarRut('18553131-7'),
      rol: 'tecnologo',
      especialidad: 'Ecografía',
      color: '#0F766E',
      activo: true,
    },
  ];

  for (const prof of profesionales) {
    const ref = await addDoc(collection(db, 'profesionales'), {
      ...prof,
      creadoEn: serverTimestamp(),
    });

    // Horario L-M-S 08:00-17:00
    await addDoc(collection(db, 'horarios'), {
      profesionalId:      ref.id,
      diasSemana:         [1, 3, 6],
      horaInicio:         '08:00',
      horaFin:            '17:00',
      duracionSlotMinutos: 30,
      tiempoMuertoMinutos: 10,
      activo:             true,
      creadoEn:           serverTimestamp(),
    });

    console.log('Creado:', prof.nombre, '→', ref.id);
  }
}

seed().catch(console.error);
