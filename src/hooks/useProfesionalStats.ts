import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Cita } from '../types/agenda';

export type Periodo = 'hoy' | 'semana' | 'mes' | { desde: Date; hasta: Date };

export function getPeriodoBounds(periodo: Periodo): [Date, Date] {
  const now = new Date();
  if (periodo === 'hoy') {
    return [
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
    ];
  }
  if (periodo === 'semana') {
    const inicio = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    inicio.setHours(0, 0, 0, 0);
    return [inicio, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)];
  }
  if (periodo === 'mes') {
    return [
      new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    ];
  }
  return [(periodo as { desde: Date; hasta: Date }).desde, (periodo as { desde: Date; hasta: Date }).hasta];
}

export function useProfesionalStats(profesionalId: string | undefined, periodo: Periodo = 'mes') {
  const [citasRaw, setCitasRaw] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);

  const periodoKey = typeof periodo === 'string'
    ? periodo
    : `${(periodo as { desde: Date; hasta: Date }).desde.getTime()}-${(periodo as { desde: Date; hasta: Date }).hasta.getTime()}`;

  const [inicioStr, finStr] = useMemo(() => {
    const [i, f] = getPeriodoBounds(periodo);
    return [i.toISOString(), f.toISOString()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoKey]);

  useEffect(() => {
    if (!profesionalId) { setCargando(false); return; }
    setCargando(true);
    const q = query(
      collection(db, 'citas'),
      where('profesionalId', '==', profesionalId),
      where('fecha', '>=', Timestamp.fromDate(new Date(inicioStr))),
      where('fecha', '<=', Timestamp.fromDate(new Date(finStr))),
    );
    const unsub = onSnapshot(q, snap => {
      setCitasRaw(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita)));
      setCargando(false);
    }, () => setCargando(false));
    return () => unsub();
  }, [profesionalId, inicioStr, finStr]);

  return useMemo(() => {
    const realizadas = citasRaw.filter(c => c.estado === 'Finalizado');
    const porTipo: Record<string, number> = {};
    const porDia: Record<string, number> = {};
    let totalMinutos = 0;
    for (const c of realizadas) {
      porTipo[c.tipoAtencion] = (porTipo[c.tipoAtencion] ?? 0) + 1;
      const key = c.fecha.toDate().toISOString().slice(0, 10);
      porDia[key] = (porDia[key] ?? 0) + 1;
      totalMinutos += c.duracionMinutos ?? 0;
    }
    return {
      citas: realizadas,
      totalRealizadas: realizadas.length,
      porTipo,
      porDia,
      promedioMinutos: realizadas.length > 0 ? totalMinutos / realizadas.length : 0,
      cargando,
    };
  }, [citasRaw, cargando]);
}
