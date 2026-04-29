import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Cita } from '../types/agenda';

export function useProfesionalKPIs(profesionalId: string | undefined) {
  const [citasRaw, setCitasRaw] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!profesionalId) { setCargando(false); return; }
    setCargando(true);
    const q = query(
      collection(db, 'citas'),
      where('profesionalId', '==', profesionalId),
    );
    const unsub = onSnapshot(q, snap => {
      setCitasRaw(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita)));
      setCargando(false);
    }, () => setCargando(false));
    return () => unsub();
  }, [profesionalId]);

  return useMemo(() => {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioSemana = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    inicioSemana.setHours(0, 0, 0, 0);

    const realizadas = citasRaw.filter(c => c.estado === 'realizada');
    let totalMinutos = 0;
    let esteMes = 0;
    let estaSemana = 0;

    for (const c of realizadas) {
      const d = c.fecha.toDate();
      totalMinutos += c.duracionMinutos ?? 0;
      if (d >= inicioMes) esteMes++;
      if (d >= inicioSemana) estaSemana++;
    }

    return {
      total: realizadas.length,
      esteMes,
      estaSemana,
      promedioMinutos: realizadas.length > 0 ? totalMinutos / realizadas.length : 0,
      cargando,
    };
  }, [citasRaw, cargando]);
}
