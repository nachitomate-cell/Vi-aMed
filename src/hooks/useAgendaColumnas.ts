import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, query, collection, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Cita, Profesional } from '../types/agenda';
import type { Horario, Bloqueo, Slot, ColumnaAgenda } from '../types/horarios';

// ─── Días de trabajo de los tecnólogos de ViñaMed ────────────────────────────
export const DIAS_ATENCION_DEFAULT = [1, 3, 6]; // Lun, Mié, Sáb
export const HORA_INICIO_DEFAULT = '09:00';
export const HORA_FIN_DEFAULT = '17:00';
export const DURACION_SLOT_DEFAULT = 15;
export const TIEMPO_MUERTO_DEFAULT = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function horaToMin(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function minToHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
function dayEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Comprueba si dos rangos [a, a+da) y [b, b+db) se solapan */
function solapan(aMin: number, aDur: number, bMin: number, bDur: number): boolean {
  return aMin < bMin + bDur && aMin + aDur > bMin;
}

/** Expande un bloqueo recurrente para la fecha dada. Devuelve true si aplica. */
function bloqueoAplicaEnFecha(bloqueo: Bloqueo, fecha: Date): boolean {
  if (!bloqueo.recurrente) return true;
  const diaSemana = fecha.getDay();
  if (!bloqueo.diasRecurrencia.includes(diaSemana)) return false;
  const fechaTs = dayStart(fecha).getTime();
  if (bloqueo.fecha.toMillis() > fechaTs) return false;
  if (bloqueo.fechaFinRecurrencia && bloqueo.fechaFinRecurrencia.toMillis() < fechaTs) return false;
  if (bloqueo.fechasExcluidas?.includes(fechaTs)) return false;
  return true;
}

/** Genera los slots de un profesional para el día dado */
function generarSlots(
  fecha: Date,
  horario: Horario,
  citasDia: Cita[],
  bloqueosDia: Bloqueo[],
  sobrecupoActivo: boolean
): Slot[] {
  const inicioMin = horaToMin(horario.horaInicio);
  const horaFinNormal = horaToMin(horario.horaFin);
  const finMin = sobrecupoActivo ? horaFinNormal + 60 : horaFinNormal;
  
  // Forzar 15 minutos sin tiempo de preparación
  const durSlot = 15;
  const tiempoMuerto = 0;

  const slots: Slot[] = [];

  // Construir mapa de citas por minuto de inicio
  const citasMap = new Map<number, Cita>();
  citasDia.forEach(c => {
    const d = c.fecha.toDate();
    const min = d.getHours() * 60 + d.getMinutes();
    citasMap.set(min, c);
  });

  // Construir mapa de bloqueos por minuto de inicio (solo los que aplican este día)
  const bloqueosActivos = bloqueosDia.filter(b => bloqueoAplicaEnFecha(b, fecha));
  const bloqueoRangos: Array<{ inicio: number; fin: number; bloqueo: Bloqueo }> = [];
  bloqueosActivos.forEach(b => {
    if (b.diaCompleto) {
      bloqueoRangos.push({ inicio: 0, fin: 24 * 60, bloqueo: b });
    } else if (b.horaInicio && b.horaFin) {
      bloqueoRangos.push({
        inicio: horaToMin(b.horaInicio),
        fin: horaToMin(b.horaFin),
        bloqueo: b,
      });
    }
  });

  // Conjunto de minutos ocupados por tiempo muerto (post-cita)
  const tiempoMuertoSet = new Set<number>();
  citasDia.forEach(c => {
    const d = c.fecha.toDate();
    const citaMin = d.getHours() * 60 + d.getMinutes();
    const finCita = citaMin + c.duracionMinutos;
    for (let m = finCita; m < finCita + tiempoMuerto; m++) {
      tiempoMuertoSet.add(m);
    }
  });

  // Iterar por cada slot de 30 minutos
  let cursor = inicioMin;
  while (cursor < finMin) {
    const hora = minToHora(cursor);

    // ¿Hay una cita que empieza exactamente aquí?
    if (citasMap.has(cursor)) {
      const cita = citasMap.get(cursor)!;
      const activas = ['Confirmado', 'Agendado', 'Finalizado', 'En espera', 'En atención', 'Rezagado'];
      if (activas.includes(cita.estado)) {
        slots.push({ hora, minutosAbsolutos: cursor, tipo: 'cita', cita, duracionMinutos: cita.duracionMinutos });
        cursor += cita.duracionMinutos;
        // Agregar tiempo muerto como franja delgada
        if (tiempoMuerto > 0) {
          slots.push({ hora: minToHora(cursor), minutosAbsolutos: cursor, tipo: 'tiempo_muerto', duracionMinutos: tiempoMuerto });
          cursor += tiempoMuerto;
        }
        continue;
      }
    }

    // ¿Es tiempo muerto?
    if (tiempoMuertoSet.has(cursor)) {
      cursor++;
      continue; // el slot de tiempo muerto ya se agregó con la cita
    }

    const esSobrecupo = cursor >= horaFinNormal;

    // ¿Está bloqueado?
    const bloqueoCubre = bloqueoRangos.find(r =>
      solapan(cursor, durSlot, r.inicio, r.fin - r.inicio)
    );
    if (bloqueoCubre) {
      // Sólo añadir si el cursor está al inicio del bloqueo
      if (cursor === Math.max(bloqueoCubre.inicio, inicioMin) ||
          (cursor > inicioMin && cursor === bloqueoCubre.inicio)) {
        slots.push({
          hora,
          minutosAbsolutos: cursor,
          tipo: 'bloqueado',
          bloqueo: bloqueoCubre.bloqueo,
          duracionMinutos: bloqueoCubre.fin - bloqueoCubre.inicio,
        });
        cursor = bloqueoCubre.fin;
        continue;
      }
      // Cursor dentro de un bloqueo ya procesado — saltar el slot
      // Si cae dentro de un bloqueo ya procesado, saltar
      cursor += durSlot;
      continue;
    }

    // Slot libre
    slots.push({ hora, minutosAbsolutos: cursor, tipo: 'libre', duracionMinutos: durSlot, esSobrecupo });
    cursor += durSlot + tiempoMuerto;
  }

  return slots;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

interface Filtros {
  profesionalId?: string;
}

export function useAgendaColumnas(fecha: Date, profesionales: Profesional[], filtros: Filtros = {}) {
  const [citasDia, setCitasDia] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [horarios, setHorarios] = useState<Map<string, Horario>>(new Map());
  const [asignacionId, setAsignacionId] = useState<string | null>(null);
  const [asignacionIds, setAsignacionIds] = useState<string[]>([]);
  const [diaCerrado, setDiaCerrado] = useState(false);
  const [sobrecupoActivo, setSobrecupoActivo] = useState(false);
  const [cargando, setCargando] = useState(true);

  const fechaKey = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
  const diaSemana = fecha.getDay();

  // Profesionales activos ese día (basado en horarios + asignación del día)
  const profesionalesDelDia = useMemo(() => {
    if (profesionales.length === 0 || diaCerrado) return [];
    const filtered = filtros.profesionalId
      ? profesionales.filter(p => p.id === filtros.profesionalId)
      : profesionales;

    // Si hay asignación multi-profesional para el día, usarla
    if (asignacionIds.length > 0 && !filtros.profesionalId) {
      return filtered.filter(p => asignacionIds.includes(p.id));
    }
    // Compatibilidad legacy: asignación de un solo profesional
    if (asignacionId && !filtros.profesionalId) {
      return filtered.filter(p => p.id === asignacionId);
    }

    return filtered.filter(p => {
      const h = horarios.get(p.id);
      if (!h || !h.activo) return false;
      return h.diasSemana.includes(diaSemana);
    });
  }, [profesionales, horarios, diaSemana, filtros.profesionalId, asignacionId, asignacionIds, diaCerrado]);

  const profIds = useMemo(
    () => profesionales.filter(p => p.activo).map(p => p.id),
    [profesionales]
  );

  // Cargar horarios en tiempo real
  useEffect(() => {
    if (profIds.length === 0) return;
    const unsubs = profIds.map(pid => {
      const q = query(collection(db, 'horarios'), where('profesionalId', '==', pid));
      return onSnapshot(q, snap => {
        if (snap.empty) return;
        const h = { id: snap.docs[0].id, ...snap.docs[0].data() } as Horario;
        setHorarios(prev => new Map(prev).set(pid, h));
      });
    });
    return () => unsubs.forEach(u => u());
  }, [profIds.join(',')]);

  // Escuchar citas del día en tiempo real
  useEffect(() => {
    const inicio = Timestamp.fromDate(dayStart(fecha));
    const fin = Timestamp.fromDate(dayEnd(fecha));

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', inicio),
      where('fecha', '<=', fin),
      orderBy('fecha', 'asc')
    );

    const unsub = onSnapshot(q, snap => {
      setCitasDia(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita)));
      setCargando(false);
    }, () => setCargando(false));

    return () => unsub();
  }, [fechaKey]);

  // Escuchar asignación del día
  useEffect(() => {
    const dKey = toKey(fecha);
    const q = query(collection(db, 'asignaciones'), where('fecha', '==', dKey));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        // Soporte para array nuevo (multi) y campo legacy (single)
        const ids: string[] = Array.isArray(data.profesionalesIds)
          ? data.profesionalesIds
          : data.profesionalId ? [data.profesionalId] : [];
        setAsignacionIds(ids);
        setAsignacionId(ids[0] ?? null);
        setDiaCerrado(!!data.cerrado);
        setSobrecupoActivo(!!data.sobrecupo);
      } else {
        setAsignacionIds([]);
        setAsignacionId(null);
        setDiaCerrado(false);
        setSobrecupoActivo(false);
      }
    });
    return () => unsub();
  }, [fechaKey]);

  function toKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Escuchar bloqueos del día en tiempo real (exactos + recurrentes)
  useEffect(() => {
    if (profIds.length === 0) return;
    const inicio = Timestamp.fromDate(dayStart(fecha));
    const fin = Timestamp.fromDate(dayEnd(fecha));

    let exactos: Bloqueo[] = [];
    let recurrentes: Bloqueo[] = [];

    const merge = () => {
      const ids = new Set(exactos.map(b => b.id));
      setBloqueos([...exactos, ...recurrentes.filter(b => !ids.has(b.id))]);
    };

    const q1 = query(
      collection(db, 'bloqueos'),
      where('profesionalId', 'in', profIds),
      where('fecha', '>=', inicio),
      where('fecha', '<=', fin)
    );
    const unsub1 = onSnapshot(q1, snap => {
      exactos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bloqueo));
      merge();
    });

    const q2 = query(
      collection(db, 'bloqueos'),
      where('profesionalId', 'in', profIds),
      where('recurrente', '==', true)
    );
    const unsub2 = onSnapshot(q2, snap => {
      recurrentes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bloqueo));
      merge();
    });

    return () => { unsub1(); unsub2(); };
  }, [profIds.join(','), fechaKey]);

  // Construir columnas
  const columnas = useMemo<ColumnaAgenda[]>(() => {
    return profesionalesDelDia.map(prof => {
      const horario = horarios.get(prof.id) ?? null;
      if (!horario) {
        return { profesional: prof, horario: null, slots: [], totalCitas: 0, totalLibres: 0 };
      }

      const citasProf = citasDia.filter(c =>
        c.profesionalId === prof.id &&
        !['Anulado', 'No asistió'].includes(c.estado)
      );

      const bloqueosProf = bloqueos.filter(b => b.profesionalId === prof.id);

      const slots = generarSlots(fecha, horario, citasProf, bloqueosProf, sobrecupoActivo);

      const totalCitas = slots.filter(s => s.tipo === 'cita').length;
      const totalLibres = slots.filter(s => s.tipo === 'libre').length;

      return { profesional: prof, horario, slots, totalCitas, totalLibres };
    });
  }, [profesionalesDelDia, citasDia, bloqueos, horarios, fecha, sobrecupoActivo]);

  // ¿El día tiene atención?
  const hayAtencion = profesionalesDelDia.length > 0;

  // Próximos días con atención (para navegación rápida cuando no hay)
  const proximosDiasConAtencion = useMemo(() => {
    const result: Date[] = [];
    if (horarios.size === 0) return result;
    const diasSet = new Set<number>();
    horarios.forEach(h => h.diasSemana.forEach(d => diasSet.add(d)));
    let check = new Date(fecha.getTime() + 86400000);
    let count = 0;
    while (result.length < 3 && count < 14) {
      if (diasSet.has(check.getDay())) result.push(new Date(check));
      check = new Date(check.getTime() + 86400000);
      count++;
    }
    return result;
  }, [fecha, horarios]);

  return { columnas, hayAtencion, proximosDiasConAtencion, cargando, sobrecupoActivo, diaCerrado, asignacionId };
}
