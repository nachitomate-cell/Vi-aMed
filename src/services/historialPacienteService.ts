import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Timeline unificado del paciente: reúne sus atenciones/ecografías (citas) y sus
// exámenes de laboratorio (setm_ordenes) en una sola línea de tiempo.

export interface EventoHistorial {
  fecha: number; // millis (para ordenar)
  tipo: 'atencion' | 'examen';
  titulo: string;
  detalle?: string;
  estado?: string;
}

export async function getHistorialPaciente(rut: string): Promise<EventoHistorial[]> {
  const eventos: EventoHistorial[] = [];

  try {
    const snap = await getDocs(query(collection(db, 'citas'), where('pacienteRut', '==', rut)));
    snap.forEach(d => {
      const c = d.data() as any;
      const f = c.fecha as Timestamp | undefined;
      const especialidades = Array.isArray(c.prestaciones)
        ? c.prestaciones.map((p: any) => p.especialidad).filter(Boolean).join(', ')
        : '';
      eventos.push({
        fecha: f?.toMillis?.() ?? 0,
        tipo: 'atencion',
        titulo: c.tipoAtencion || c.prestaciones?.[0]?.prestacion || 'Atención',
        detalle: especialidades,
        estado: c.estado,
      });
    });
  } catch (e) {
    console.error('getHistorialPaciente · citas', e);
  }

  try {
    const snap = await getDocs(query(collection(db, 'setm_ordenes'), where('pacienteRut', '==', rut)));
    snap.forEach(d => {
      const o = d.data() as any;
      const f = o.creadoEn as Timestamp | undefined;
      eventos.push({
        fecha: f?.toMillis?.() ?? 0,
        tipo: 'examen',
        titulo: o.tipoExamen || 'Examen de laboratorio',
        detalle: o.laboratorio || '',
        estado: o.estado,
      });
    });
  } catch (e) {
    console.error('getHistorialPaciente · setm_ordenes', e);
  }

  return eventos.sort((a, b) => b.fecha - a.fecha);
}
