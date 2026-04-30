import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface GestionOptions {
  sexos: string[];
  previsiones: string[];
  metodosPago: string[];
  especialidades: string[];
  prestaciones: string[];
}

export function useGestionDatos() {
  const [opciones, setOpciones] = useState<GestionOptions>({
    sexos: [],
    previsiones: [],
    metodosPago: [],
    especialidades: [],
    prestaciones: []
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchOpciones = async () => {
      try {
        const [sexosSnap, prevSnap, pagosSnap, espSnap, prestSnap] = await Promise.all([
          getDocs(collection(db, 'gestion_sexos')),
          getDocs(collection(db, 'gestion_previsiones')),
          getDocs(collection(db, 'gestion_metodos_pago')),
          getDocs(collection(db, 'gestion_especialidades')),
          getDocs(collection(db, 'gestion_prestaciones'))
        ]);

        setOpciones({
          sexos: sexosSnap.docs.map(d => d.data().nombre),
          previsiones: prevSnap.docs.map(d => d.data().nombre),
          metodosPago: pagosSnap.docs.map(d => d.data().nombre),
          especialidades: espSnap.docs.map(d => d.data().nombre),
          prestaciones: prestSnap.docs.map(d => d.data().nombre)
        });
      } catch (err) {
        console.error('Error fetching gestion options:', err);
      } finally {
        setCargando(false);
      }
    };
    fetchOpciones();
  }, []);

  return { opciones, cargando };
}
