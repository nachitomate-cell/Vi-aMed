import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  INITIAL_FORM,
  mapearTipoAtencionAExamen,
  guardarInformeEco,
  getInformeExistente,
  type DatosInformeEco,
} from '../../services/informeEcoService';
import type { ScheduledPatient } from '../../types/eco-mobile';
import InformeEcoForm from './InformeEcoForm';
import AccionesInforme from '../shared/AccionesInforme';
import type { InformeParaPDF } from '../../services/pdfInformeService';

interface InformeSheetProps {
  patient: ScheduledPatient;
  onClose: () => void;
  onSaved: (patientId: string) => void;
}

const PREFILLED_KEYS = new Set<keyof DatosInformeEco>([
  'nombre', 'rut', 'edad', 'sexo', 'fecha', 'tipo', 'informante',
]);

function buildInitialForm(patient: ScheduledPatient, userName: string): DatosInformeEco {
  const today = new Date().toISOString().split('T')[0];
  const tipoMapped = mapearTipoAtencionAExamen(patient.examType);
  return {
    ...INITIAL_FORM,
    nombre: patient.fullName,
    rut: patient.rut,
    edad: String(patient.age),
    sexo: patient.sex === 'F' ? 'Femenino' : 'Masculino',
    fecha: today,
    tipo: tipoMapped,
    informante: userName,
  };
}

const Spinner: React.FC = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const InformeSheet: React.FC<InformeSheetProps> = ({ patient, onClose, onSaved }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<DatosInformeEco>(() =>
    buildInitialForm(patient, user?.name ?? ''),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dictadosActivos, setDictadosActivos] = useState(0);
  const [informeId, setInformeId] = useState<string | null>(null);
  const [informeParaPDF, setInformeParaPDF] = useState<InformeParaPDF | null>(null);

  /* ── Drag-to-dismiss ──────────────────────────────────── */
  const dragStartY = useRef(0);
  const dragDelta = useRef(0);
  const [translateY, setTranslateY] = useState(0);
  const isDirty = useRef(false);

  const handleChange = useCallback((key: keyof DatosInformeEco, value: string) => {
    isDirty.current = true;
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const attemptClose = useCallback(() => {
    if (isDirty.current) {
      if (!window.confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?')) return;
    }
    onClose();
  }, [onClose]);

  const onDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const onDragMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) {
      dragDelta.current = delta;
      setTranslateY(delta);
    }
  };

  const onDragEnd = () => {
    if (dragDelta.current > 120) {
      attemptClose();
    } else {
      setTranslateY(0);
    }
    dragDelta.current = 0;
  };

  /* ── Fetch existing report if any ──────────────────────── */
  useEffect(() => {
    let mounted = true;
    async function checkExisting() {
      if (patient.id.startsWith('new-')) return;
      try {
        const exist = await getInformeExistente(patient.id);
        if (mounted && exist) {
          // If it exists, we could pre-fill or show a warning.
          // For now, let's just log or set a toast, as it shouldn't normally happen
          // since the UI filters out completed ones.
          setToast('Ya existe un informe para esta cita.');
        }
      } catch (err) {
        console.error('Error checking existing informe:', err);
      }
    }
    checkExisting();
    return () => { mounted = false; };
  }, [patient.id]);

  /* ── Block body scroll while sheet is open ────────────── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── Save ─────────────────────────────────────────────── */
  const canSave = form.hallazgos.trim().length > 0 && form.diagnostico.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const cita = {
        pacienteRut: patient.rut,
        pacienteNombre: patient.fullName
      };
      const id = await guardarInformeEco(patient.id, cita, form, user?.uid ?? '');
      isDirty.current = false;
      setToast('Informe guardado correctamente');
      onSaved(patient.id);
      setInformeId(id);
      setInformeParaPDF({
        pacienteNombre: patient.fullName,
        pacienteRut: patient.rut,
        edad: String(patient.age),
        sexo: patient.sex === 'F' ? 'Femenino' : 'Masculino',
        tipoExamen: form.tipo,
        regionAnatomica: form.region,
        indicacionClinica: form.indicacion,
        hallazgos: form.hallazgos,
        impresionEcografica: form.diagnostico,
        recomendaciones: form.recomendaciones,
        codigoExamen: form.codigo,
        fecha: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el informe';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <>
      {/* Backdrop — no cierra al tocar */}
      <div className="fixed inset-0 bg-black/40 z-40" aria-hidden />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-2xl"
        style={{
          height: '95dvh',
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        {/* Drag handle + header area */}
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <button
              type="button"
              onClick={attemptClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-slate-800 truncate">
                {patient.id.startsWith('new-') ? 'Nuevo Informe' : `Informe · ${patient.fullName.split(' ').slice(0, 2).join(' ')}`}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {patient.id.startsWith('new-') ? 'Registro manual' : `${patient.examType} · ${patient.scheduledTime}`}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <InformeEcoForm
            form={form}
            onChange={handleChange}
            prefilledKeys={patient.id.startsWith('new-') ? new Set() : PREFILLED_KEYS}
            isMobile
            dictadosActivos={dictadosActivos}
            setDictadosActivos={setDictadosActivos}
          />
          {informeId && informeParaPDF && (
            <div className="px-4">
              <AccionesInforme
                informe={informeParaPDF}
                informeId={informeId}
                onActualizado={(inf) => setInformeParaPDF(inf)}
              />
            </div>
          )}
          <div className="h-6" />
        </div>

        {/* Footer fijo */}
        <div
          className="shrink-0 bg-white border-t border-slate-200 px-4 py-3 gap-2.5"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {informeId ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full h-[52px] flex items-center justify-center rounded-xl border border-slate-300 text-slate-600 text-[15px] font-medium active:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
          ) : (
            <div className="grid grid-cols-[1fr_2fr] gap-2.5">
              <button
                type="button"
                onClick={attemptClose}
                className="h-[52px] flex items-center justify-center rounded-xl border border-slate-300 text-slate-600 text-[15px] font-medium active:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`h-[52px] flex items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-all shadow-lg shadow-[#0E7490]/20 ${
                  canSave && !saving
                    ? 'bg-[#0E7490] text-white active:bg-[#0c6680] active:scale-[0.98]'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {saving ? (
                  <>
                    <Spinner />
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
                    </svg>
                    Guardar Informe
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast de error */}
      {error && (
        <div className="fixed top-4 inset-x-4 z-[60] bg-red-600 text-white text-sm font-medium rounded-xl px-4 py-3 shadow-lg flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-white/80">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Toast de éxito */}
      {toast && (
        <div className="fixed top-4 inset-x-4 z-[60] bg-emerald-600 text-white text-sm font-medium rounded-xl px-4 py-3 shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast}
        </div>
      )}
    </>
  );
};

export default InformeSheet;
