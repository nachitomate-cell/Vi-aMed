import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Cita } from '../types/agenda';

interface Filtros {
  profesionalId?: string;
  estado?: string;
  tipoAtencion?: string;
}

export function useAgendaTiempoReal(fechaInicio: Date, fechaFin: Date, filtros: Filtros = {}) {
  const [citasRaw, setCitasRaw] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inicioStr = fechaInicio.toISOString();
  const finStr = fechaFin.toISOString();

  useEffect(() => {
    setCargando(true);
    setError(null);

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(new Date(inicioStr))),
      where('fecha', '<=', Timestamp.fromDate(new Date(finStr))),
      orderBy('fecha', 'asc')
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setCitasRaw(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita)));
        setCargando(false);
      },
      err => {
        setError(err.message);
        setCargando(false);
      }
    );

    return () => unsub();
  }, [inicioStr, finStr]);

  const citas = useMemo(() => {
    return citasRaw.filter(c => {
      if (filtros.profesionalId && c.profesionalId !== filtros.profesionalId) return false;
      if (filtros.estado && c.estado !== filtros.estado) return false;
      if (filtros.tipoAtencion && c.tipoAtencion !== filtros.tipoAtencion) return false;
      return true;
    });
  }, [citasRaw, filtros.profesionalId, filtros.estado, filtros.tipoAtencion]);

  return { citas, cargando, error };
}
