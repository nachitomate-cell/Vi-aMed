import { Timestamp } from 'firebase/firestore';

export type EstadoPdf = 'generando' | 'listo' | 'error';

export interface GeneradorPdfDoc {
  id: string;
  pacienteNombre: string;
  pacienteEmail: string;
  totalImagenes: number;
  pdfStoragePath: string;
  pdfUrl: string;
  estado: EstadoPdf;
  emailEnviado: boolean;
  emailEnviadoEn: Timestamp | null;
  emailEnviadoPor: string | null;
  creadoEn: Timestamp;
  expiraEn: Timestamp;
  creadoPor: string;
  notasInternas?: string;
}
