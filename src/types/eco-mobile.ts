export type Prevision = 'FONASA' | 'ISAPRE' | 'Particular';
export type Priority = 'normal' | 'urgent';
export type ReportStatus = 'pending' | 'in-progress' | 'completed' | 'validated';

export interface ScheduledPatient {
  id: string;
  rut: string;
  fullName: string;
  age: number;
  sex: 'M' | 'F';
  examType: string;
  scheduledTime: string;
  prevision: Prevision;
  priority: Priority;
  observations?: string;
  reportStatus?: 'pending' | 'completed';
}

export interface EcoReport {
  id: string;
  patientId: string;
  examType: string;
  technicalDescription: string;
  findings: string;
  impression: string;
  recommendations: string;
  createdAt: string;
  status: ReportStatus;
  medicName: string;
  medicRut: string;
}

export interface AuthUser {
  uid: string;
  rut: string;
  name: string;
  role: string;
}
