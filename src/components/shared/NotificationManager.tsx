import React, { useEffect, useRef, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  limit, 
  orderBy,
  querySnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../auth/AuthContext';

// Sonido de campana fuerte y claro
const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const NotificationManager: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [lastCitaId, setLastCitaId] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Solicitar permiso para notificaciones del navegador
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Inicializar audio
    audioRef.current = new Audio(ALERT_SOUND_URL);
    audioRef.current.volume = 1.0;

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
    // 1. Sonido fuerte
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.warn('No se pudo reproducir el sonido:', e));
    }

    // 2. Notificación del navegador
    if (Notification.permission === 'granted') {
      new Notification('Nueva Cita Agendada', {
        body: `${nombre} - ${tipo}`,
        icon: '/logo.png'
      });
    }

    // 3. Podríamos agregar un Toast visual aquí si tuviéramos una librería de toasts.
    // Por ahora, el sonido y la notificación nativa cumplen el requisito de "fuerte".
  };

  return null; // Componente invisible
};
