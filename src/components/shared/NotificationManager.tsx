import React, { useEffect, useRef, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  limit, 
  orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../auth/AuthContext';

export const NotificationManager: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [lastCitaId, setLastCitaId] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Solicitar permiso para notificaciones del navegador
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Escuchar solo la última cita creada
    const q = query(
      collection(db, 'citas'),
      orderBy('creadoEn', 'desc'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        isInitialLoad.current = false;
        return;
      }

      const doc = snapshot.docs[0];
      const citaId = doc.id;
      const data = doc.data();

      // Ignorar la carga inicial para no disparar notificación por citas viejas
      if (isInitialLoad.current) {
        setLastCitaId(citaId);
        isInitialLoad.current = false;
        return;
      }

      // Si el ID cambió, es una nueva cita
      if (citaId !== lastCitaId) {
        setLastCitaId(citaId);
        playNotification(data.pacienteNombre, data.tipoAtencion);
      }
    });

    return () => unsub();
  }, [isAuthenticated, lastCitaId]);

  const playNotification = (nombre: string, tipo: string) => {
    // Notificación del navegador (sin sonido)
    if (Notification.permission === 'granted') {
      new Notification('Nueva Cita Agendada', {
        body: `${nombre} - ${tipo}`,
        icon: '/logo.png'
      });
    }
  };

  return null; // Componente invisible
};
