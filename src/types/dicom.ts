import { Timestamp } from 'firebase/firestore';

export type LadoImagen = 'izquierdo' | 'derecho' | 'bilateral';
export type EstadoImagen = 'subiendo' | 'disponible' | 'error';

export interface ImagenDICOM {
  id: string;
  pacienteRut: string;
  pacienteNombre: string;
  tipo: 'mamografia';
  modalidad: 'MG';
  descripcion: string;
  lado: LadoImagen;
  medicoSolicitante: string;
  storageRef: string; // path en Firebase Storage
  storageUrl: string; // URL de descarga
  tamanoBytes: number;
  estado: EstadoImagen;
  visiblePaciente: boolean;
  subidoPor: string;
  subidoEn: Timestamp;
  autorizadoPor: string | null;
  autorizadoEn: Timestamp | null;
}
