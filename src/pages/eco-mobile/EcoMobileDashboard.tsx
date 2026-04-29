import React, { useState, useEffect } from 'react';
import type { ScheduledPatient } from '../../types/eco-mobile';
import InformeSheet from '../../components/eco-mobile/InformeSheet';

const TODAY_SCHEDULE: ScheduledPatient[] = [
  {
    id: 'p-001',
    rut: '12.345.678-9',
    fullName: 'Ana Valeria Morales Salas',
    age: 42,
    sex: 'F',
    examType: 'Eco de Abdomen',
    scheduledTime: '09:30',
    prevision: 'FONASA',
    priority: 'normal',
    observations: 'Paciente en ayunas. Control post-operatorio.',
  },
  {
    id: 'p-002',
    rut: '9.876.543-2',
    fullName: 'Roberto Ignacio Fuentes',
    age: 58,
    sex: 'M',
    examType: 'Eco Tiroides',
    scheduledTime: '10:15',
    prevision: 'ISAPRE',
    priority: 'urgent',
    observations: 'Nódulo detectado en control previo. Derivado de endocrinología.',
  },
  {
    id: 'p-003',
    rut: '15.432.100-K',
    fullName: 'Catalina Paz Vega Robles',
    age: 31,
    sex: 'F',
    examType: 'Eco Pélvica',
    scheduledTime: '11:00',
    prevision: 'Particular',
    priority: 'normal',
  },
];

const PREVISION_BADGE: Record<ScheduledPatient['prevision'], string> = {
  FONASA: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ISAPRE: 'bg-sky-50 text-sky-700 border border-sky-200',
  Particular: 'bg-amber-50 text-amber-700 border border-amber-200',
};

/* ─── Patient card ──────────────────────────────────────── */

interface PatientCardProps {
  patient: ScheduledPatient;
  completed: boolean;
  onStartReport: (patient: ScheduledPatient) => void;
  onViewReport: (patient: ScheduledPatient) => void;
}

const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  completed,
  onStartReport,
  onViewReport,
}) => (
  <article className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
    {patient.priority === 'urgent' && (
      <div className="flex items-center gap-2 bg-red-600 px-4 py-2">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
        <span className="text-white text-xs font-bold tracking-widest uppercase">Prioritario</span>
      </div>
    )}

    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-[17px] leading-snug truncate">
            {patient.fullName}
          </p>
          <p className="text-slate-500 text-sm mt-0.5">
            {patient.rut}&ensp;·&ensp;{patient.age} años&ensp;·&ensp;{patient.sex === 'F' ? 'Femenino' : 'Masculino'}
          </p>
        </div>
        <time
          className="shrink-0 font-bold text-[#0E7490] text-2xl tabular-nums leading-none"
          dateTime={patient.scheduledTime}
        >
          {patient.scheduledTime}
        </time>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex-1 min-w-0 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 truncate">
          {patient.examType}
        </span>
        <span className={`shrink-0 text-xs font-semibold rounded-xl px-2.5 py-2 ${PREVISION_BADGE[patient.prevision]}`}>
          {patient.prevision}
        </span>
        {completed && (
          <span className="shrink-0 text-xs font-semibold rounded-xl px-2.5 py-2 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
            ✓ Listo
          </span>
        )}
      </div>

      {patient.observations && !completed && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 bg-slate-50 rounded-xl px-3 py-2">
          {patient.observations}
        </p>
      )}

      {completed ? (
        <button
          onClick={() => onViewReport(patient)}
          className="w-full h-[52px] flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 text-slate-600 text-[15px] font-medium active:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          Ver informe
        </button>
      ) : (
        <button
          onClick={() => onStartReport(patient)}
          className="w-full h-[52px] flex items-center justify-center gap-2.5 rounded-xl bg-[#0E7490] active:bg-[#0c6680] active:scale-[0.98] transition-all font-semibold text-white text-[15px] shadow-lg shadow-[#0E7490]/20"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Iniciar Informe
        </button>
      )}
    </div>
  </article>
);

/* ─── Stat pill ─────────────────────────────────────────── */

const StatPill: React.FC<{ value: number; label: string; valueClass: string }> = ({
  value, label, valueClass,
}) => (
  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
    <span className={`font-bold text-sm tabular-nums ${valueClass}`}>{value}</span>
    <span className="text-slate-500 text-xs">{label}</span>
  </div>
);

/* ─── Section label ─────────────────────────────────────── */

const SectionLabel: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${accent}`}>{text}</p>
);

/* ─── Dashboard ─────────────────────────────────────────── */
import { useAuth } from '../../auth/AuthContext';
import { escucharCitasDelDia } from '../../services/citasService';

const EcoMobileDashboard: React.FC = () => {
  const { user: authUser } = useAuth(); // Necesitamos el UID del profesional
  const [schedule, setSchedule] = useState<ScheduledPatient[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [sheetPatient, setSheetPatient] = useState<ScheduledPatient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = escucharCitasDelDia(new Date(), (citas) => {
      const mapped = citas
        .filter(c => c.profesionalId === authUser?.uid || !c.profesionalId) // Ver sus citas o las no asignadas
        .map(c => ({
          id: c.id,
          rut: c.pacienteRut,
          fullName: c.pacienteNombre,
          age: 0, // No guardamos edad en cita, podríamos obtenerla de otro lado o dejar en 0
          sex: 'M', 
          examType: c.tipoAtencion,
          scheduledTime: c.fecha?.toDate ? c.fecha.toDate().toTimeString().slice(0, 5) : '--:--',
          prevision: 'Particular',
          priority: 'normal',
          observations: c.notas,
          reportStatus: c.estado === 'realizada' ? 'completed' : 'pending'
        }));
      
      setSchedule(mapped);
      setCompletedIds(new Set(mapped.filter(m => m.reportStatus === 'completed').map(m => m.id)));
      setLoading(false);
    });
    return () => unsub();
  }, [authUser?.uid]);

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const urgentPatients = schedule.filter(p => p.priority === 'urgent');
  const normalPatients = schedule.filter(p => p.priority === 'normal');
  const completedCount = completedIds.size;

  const handleStartReport = (patient: ScheduledPatient) => {
    setSheetPatient(patient);
  };

  const handleViewReport = (patient: ScheduledPatient) => {
    setSheetPatient(patient);
  };

  const handleSheetClose = () => {
    setSheetPatient(null);
  };

  const handleNuevoInforme = () => {
    const emptyPatient: ScheduledPatient = {
      id: `new-${Date.now()}`,
      rut: '',
      fullName: '',
      age: 0,
      sex: 'F',
      examType: '',
      scheduledTime: new Date().toTimeString().slice(0, 5),
      prevision: 'Particular',
      priority: 'normal',
    };
    setSheetPatient(emptyPatient);
  };

  const handleSaved = (patientId: string) => {
    setCompletedIds(prev => new Set([...prev, patientId]));
  };

  return (
    <>
      <div className="min-h-full px-4 py-5 space-y-6 pb-safe">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Cargando agenda...</p>
          </div>
        ) : (
          <>
            <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{today}</p>
              <h1 className="text-slate-800 text-[26px] font-bold mt-0.5 leading-tight">Agenda</h1>
            </div>
            <button
              onClick={handleNuevoInforme}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0E7490] text-white shadow-lg shadow-[#0E7490]/20 active:scale-95 transition-transform"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatPill value={schedule.length} label="Pacientes" valueClass="text-slate-800" />
            {urgentPatients.length > 0 && (
              <StatPill value={urgentPatients.length} label="Prioritarios" valueClass="text-red-400" />
            )}
            <StatPill
              value={completedCount}
              label={completedCount === 1 ? 'Completado' : 'Completados'}
              valueClass="text-emerald-400"
            />
          </div>
        </header>

        {urgentPatients.length > 0 && (
          <section>
            <SectionLabel text="Prioritarios" accent="text-red-400" />
            <div className="space-y-3">
              {urgentPatients.map(patient => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  completed={completedIds.has(patient.id)}
                  onStartReport={handleStartReport}
                  onViewReport={handleViewReport}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionLabel text="Agenda regular" accent="text-slate-400" />
          <div className="space-y-3">
            {normalPatients.map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                completed={completedIds.has(patient.id)}
                onStartReport={handleStartReport}
                onViewReport={handleViewReport}
              />
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-slate-400 text-sm">No hay más pacientes agendados</p>
        </div>
          </>
        )}
      </div>

      {sheetPatient && (
        <InformeSheet
          patient={sheetPatient}
          onClose={handleSheetClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

export default EcoMobileDashboard;
