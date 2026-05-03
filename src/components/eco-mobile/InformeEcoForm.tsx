import React, { useState } from 'react';
import type { DatosInformeEco } from '../../services/informeEcoService';
import { buildPreview } from '../../services/informeEcoService';
import TextareaDictado from '../shared/TextareaDictado';
import { formatearRutInput } from '../../utils/rut';

interface InformeEcoFormProps {
  form: DatosInformeEco;
  onChange: (key: keyof DatosInformeEco, value: string) => void;
  prefilledKeys?: Set<keyof DatosInformeEco>;
  isMobile?: boolean;
  dictadosActivos?: number;
  setDictadosActivos?: React.Dispatch<React.SetStateAction<number>>;
  onPlantillaHallazgos?: () => void;
  onPlantillaImpresion?: () => void;
  onPlantillaRecomendaciones?: () => void;
}

/* ─── Desktop field wrapper ──────────────────────────────── */

const DesktopField: React.FC<{ label: string; prefilled?: boolean; children: React.ReactNode }> = ({ label, prefilled, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500 flex items-center gap-1.5">
      {label}
      {prefilled && (
        <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-1 py-px rounded leading-none">auto</span>
      )}
    </label>
    <div className={[
      '[&_input]:w-full [&_input]:border [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-slate-800 [&_input]:placeholder-slate-400 [&_input]:outline-none [&_input]:transition-colors',
      '[&_select]:w-full [&_select]:border [&_select]:rounded-lg [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-slate-800 [&_select]:outline-none [&_select]:transition-colors',
      '[&_textarea]:w-full [&_textarea]:border [&_textarea]:rounded-lg [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-slate-800 [&_textarea]:placeholder-slate-400 [&_textarea]:outline-none [&_textarea]:resize-none [&_textarea]:transition-colors',
      prefilled
        ? '[&_input]:bg-cyan-50/50 [&_input]:border-cyan-200 [&_select]:bg-cyan-50/50 [&_select]:border-cyan-200 [&_textarea]:bg-cyan-50/50 [&_textarea]:border-cyan-200'
        : '[&_input]:bg-white [&_input]:border-slate-200 [&_input]:focus:border-[#0E7490]/60 [&_select]:bg-white [&_select]:border-slate-200 [&_select]:focus:border-[#0E7490]/60 [&_textarea]:bg-white [&_textarea]:border-slate-200 [&_textarea]:focus:border-[#0E7490]/60',
    ].join(' ')}>
      {children}
    </div>
  </div>
);

/* ─── Mobile field wrapper ───────────────────────────────── */

interface MobileFieldProps {
  label: string;
  required?: boolean;
  prefilled?: boolean;
  children: React.ReactNode;
}

const MobileField: React.FC<MobileFieldProps> = ({ label, required, prefilled, children }) => (
  <div className="space-y-1.5">
    <label className="text-[13px] font-medium text-slate-500 flex items-center gap-1">
      {label}
      {required && <span className="text-red-400 text-[11px]">*</span>}
      {prefilled && (
        <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 rounded px-1">auto</span>
      )}
    </label>
    <div style={prefilled ? { background: '#F8FAFC' } : undefined} className="rounded-xl overflow-hidden">
      {children}
    </div>
  </div>
);

const mobileInputClass = (prefilled?: boolean) =>
  `w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[16px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#0E7490]/60 leading-snug ${prefilled ? 'bg-[#F8FAFC]' : 'bg-white'}`;

const mobileTextareaClass = (prefilled?: boolean) =>
  `w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[16px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#0E7490]/60 resize-none leading-relaxed ${prefilled ? 'bg-[#F8FAFC]' : 'bg-white'}`;

/* ─── Section header (mobile) ────────────────────────────── */

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
}> = ({ icon, title, open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between py-2 text-left"
  >
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
      {icon}
      {title}
    </div>
    <svg
      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
);

/* ─── Icons ──────────────────────────────────────────────── */

const PatientIcon = () => (
  <svg className="w-4 h-4 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const ExamIcon = () => (
  <svg className="w-4 h-4 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="6" /><path d="M12 6c2 3.5 2 8.5 0 12" /><path d="M2 12h20" />
  </svg>
);
const ReportIcon = () => (
  <svg className="w-4 h-4 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const PreviewIcon = () => (
  <svg className="w-4 h-4 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

/* ─── Mobile layout ──────────────────────────────────────── */

const MobileLayout: React.FC<InformeEcoFormProps> = ({ form, onChange, prefilledKeys = new Set(), setDictadosActivos, onPlantillaHallazgos, onPlantillaImpresion, onPlantillaRecomendaciones }) => {
  const [open, setOpen] = useState({ datos: true, examen: true, informe: true, preview: false });
  const toggle = (k: keyof typeof open) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));
  const today = new Date().toISOString().split('T')[0];
  const pf = (k: keyof DatosInformeEco) => prefilledKeys.has(k);

  return (
    <div className="space-y-0 divide-y divide-slate-100">

      {/* ── Datos del Paciente ───────────────────────────── */}
      <div className="py-3 px-4">
        <SectionHeader icon={<PatientIcon />} title="Datos del Paciente" open={open.datos} onToggle={() => toggle('datos')} />
        {open.datos && (
          <div className="mt-3 space-y-3">
            <MobileField label="Nombre completo" required prefilled={pf('nombre')}>
              <input className={mobileInputClass(pf('nombre'))} value={form.nombre} onChange={e => onChange('nombre', e.target.value)} placeholder="Nombre completo del paciente" />
            </MobileField>
            <div className="grid grid-cols-2 gap-3">
              <MobileField label="RUT" prefilled={pf('rut')}>
                <input className={mobileInputClass(pf('rut'))} value={form.rut} onChange={e => onChange('rut', formatearRutInput(e.target.value))} placeholder="12.345.678-9" />
              </MobileField>
              <MobileField label="Edad" prefilled={pf('edad')}>
                <input type="number" className={mobileInputClass(pf('edad'))} value={form.edad} onChange={e => onChange('edad', e.target.value)} min={0} max={120} placeholder="42" />
              </MobileField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileField label="Sexo" prefilled={pf('sexo')}>
                <select className={mobileInputClass(pf('sexo'))} value={form.sexo} onChange={e => onChange('sexo', e.target.value)}>
                  <option value="">—</option>
                  <option>Masculino</option>
                  <option>Femenino</option>
                  <option>No especifica</option>
                </select>
              </MobileField>
              <MobileField label="Fecha examen" prefilled={pf('fecha')}>
                <input type="date" className={mobileInputClass(pf('fecha'))} value={form.fecha || today} onChange={e => onChange('fecha', e.target.value)} />
              </MobileField>
            </div>
            <MobileField label="Médico solicitante">
              <input className={mobileInputClass()} value={form.solicitante} onChange={e => onChange('solicitante', e.target.value)} placeholder="Dr. / Dra." />
            </MobileField>
            <MobileField label="Código de examen" prefilled={pf('codigo')}>
              <input className={mobileInputClass(pf('codigo'))} value={form.codigo} onChange={e => onChange('codigo', e.target.value)} placeholder="Ej: 0404016" />
            </MobileField>
          </div>
        )}
      </div>

      {/* ── Examen ──────────────────────────────────────── */}
      <div className="py-3 px-4">
        <SectionHeader icon={<ExamIcon />} title="Examen" open={open.examen} onToggle={() => toggle('examen')} />
        {open.examen && (
          <div className="mt-3 space-y-3">
            <MobileField label="Tipo de examen *" prefilled={pf('tipo')}>
              <input className={mobileInputClass(pf('tipo'))} value={form.tipo} onChange={e => onChange('tipo', e.target.value)} placeholder="Ej: Ecografía abdominal" />
            </MobileField>
            <MobileField label="Región anatómica / detalle">
              <input className={mobileInputClass()} value={form.region} onChange={e => onChange('region', e.target.value)} placeholder="Ej: Hígado, tiroides, codo izquierdo..." />
            </MobileField>
            <MobileField label="Indicación clínica" prefilled={pf('indicacion')}>
              <textarea className={mobileTextareaClass(pf('indicacion'))} style={{ minHeight: 80 }} value={form.indicacion} onChange={e => onChange('indicacion', e.target.value)} placeholder="Ej: Dolor abdominal, control nódulo tiroideo..." />
            </MobileField>
            <MobileField label="Médico informante" prefilled={pf('informante')}>
              <input className={mobileInputClass(pf('informante'))} value={form.informante} onChange={e => onChange('informante', e.target.value)} placeholder="Nombre del médico informante" />
            </MobileField>
          </div>
        )}
      </div>

      {/* ── Informe ─────────────────────────────────────── */}
      <div className="py-3 px-4">
        <SectionHeader icon={<ReportIcon />} title="Informe" open={open.informe} onToggle={() => toggle('informe')} />
        {open.informe && (
          <div className="mt-3 space-y-3">
            <TextareaDictado label="Hallazgos" name="hallazgos" value={form.hallazgos}
              onChange={(e) => { if ('target' in e) onChange('hallazgos', e.target.value); }}
              placeholder="Describa los hallazgos ecográficos observados..." required minHeight={120}
              onIniciarDictado={() => setDictadosActivos?.((n: number) => n + 1)}
              onDetenerDictado={() => setDictadosActivos?.((n: number) => Math.max(0, n - 1))}
              onPlantilla={onPlantillaHallazgos} />
            <TextareaDictado label="Impresión ecográfica" name="impresionEcografica" value={form.diagnostico}
              onChange={(e) => { if ('target' in e) onChange('diagnostico', e.target.value); }}
              placeholder="Conclusión / impresión diagnóstica..." required minHeight={100}
              onIniciarDictado={() => setDictadosActivos?.((n: number) => n + 1)}
              onDetenerDictado={() => setDictadosActivos?.((n: number) => Math.max(0, n - 1))}
              onPlantilla={onPlantillaImpresion} />
            <TextareaDictado label="Recomendaciones" name="recomendaciones" value={form.recomendaciones}
              onChange={(e) => { if ('target' in e) onChange('recomendaciones', e.target.value); }}
              placeholder="Seguimiento, controles, derivaciones..." minHeight={80}
              onIniciarDictado={() => setDictadosActivos?.((n: number) => n + 1)}
              onDetenerDictado={() => setDictadosActivos?.((n: number) => Math.max(0, n - 1))}
              onPlantilla={onPlantillaRecomendaciones} />
          </div>
        )}
      </div>

      {/* ── Vista Previa ─────────────────────────────────── */}
      <div className="py-3 px-4">
        <SectionHeader icon={<PreviewIcon />} title="Vista Previa" open={open.preview} onToggle={() => toggle('preview')} />
        {open.preview && (
          <div className="mt-3 bg-[#F8FAFC] border border-[#0E7490]/20 rounded-xl p-4">
            <pre className="text-[13px] text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
              {buildPreview(form, today)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Desktop layout — 2 paneles ────────────────────────── */

const DesktopLayout: React.FC<InformeEcoFormProps> = ({
  form, onChange, prefilledKeys = new Set(), setDictadosActivos,
  onPlantillaHallazgos, onPlantillaImpresion, onPlantillaRecomendaciones,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const pf = (k: keyof DatosInformeEco) => prefilledKeys.has(k);

  return (
    <div className="grid grid-cols-5 gap-4 items-start">

      {/* ── Panel izquierdo: metadata (2/5) ── */}
      <div className="col-span-2 space-y-3">

        {/* Datos del paciente */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
            <PatientIcon />
            Datos del Paciente
          </div>
          <DesktopField label="Nombre completo *" prefilled={pf('nombre')}>
            <input value={form.nombre} onChange={e => onChange('nombre', e.target.value)} placeholder="Juan Pérez González" />
          </DesktopField>
          <div className="grid grid-cols-2 gap-2.5">
            <DesktopField label="RUT" prefilled={pf('rut')}>
              <input value={form.rut} onChange={e => onChange('rut', formatearRutInput(e.target.value))} placeholder="12.345.678-9" />
            </DesktopField>
            <DesktopField label="Edad" prefilled={pf('edad')}>
              <input type="number" value={form.edad} onChange={e => onChange('edad', e.target.value)} min={0} max={120} placeholder="42" />
            </DesktopField>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <DesktopField label="Sexo" prefilled={pf('sexo')}>
              <select value={form.sexo} onChange={e => onChange('sexo', e.target.value)}>
                <option value="">—</option>
                <option>Masculino</option>
                <option>Femenino</option>
                <option>No especifica</option>
              </select>
            </DesktopField>
            <DesktopField label="Fecha examen" prefilled={pf('fecha')}>
              <input type="date" value={form.fecha || today} onChange={e => onChange('fecha', e.target.value)} />
            </DesktopField>
          </div>
        </div>

        {/* Datos del examen */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
            <ExamIcon />
            Examen
          </div>
          <DesktopField label="Tipo de examen *" prefilled={pf('tipo')}>
            <input value={form.tipo} onChange={e => onChange('tipo', e.target.value)} placeholder="Ej: Ecografía abdominal" />
          </DesktopField>
          <div className="grid grid-cols-2 gap-2.5">
            <DesktopField label="Código" prefilled={pf('codigo')}>
              <input value={form.codigo} onChange={e => onChange('codigo', e.target.value)} placeholder="0404016" />
            </DesktopField>
            <DesktopField label="Región anatómica">
              <input value={form.region} onChange={e => onChange('region', e.target.value)} placeholder="Ej: Hígado..." />
            </DesktopField>
          </div>
          <DesktopField label="Indicación clínica" prefilled={pf('indicacion')}>
            <textarea rows={2} value={form.indicacion} onChange={e => onChange('indicacion', e.target.value)} placeholder="Dolor abdominal, control nódulo tiroideo..." />
          </DesktopField>
          <DesktopField label="Médico solicitante">
            <input value={form.solicitante} onChange={e => onChange('solicitante', e.target.value)} placeholder="Dr. / Dra." />
          </DesktopField>
          <DesktopField label="Médico informante *" prefilled={pf('informante')}>
            <select value={form.informante} onChange={e => onChange('informante', e.target.value)}>
              <option value="">Seleccionar médico...</option>
              <option value="Dr. Álvaro Trullenque Sánchez|MÉDICO RADIÓLOGO|7.268.691-8">Dr. Álvaro Trullenque Sánchez</option>
              <option value="Dr. [Médico de turno]|MÉDICO|—">Dr. [Médico de turno]</option>
              {/* Si llegó autocompletado desde la cita, mostrar como opción dinámica */}
              {form.informante && !['Dr. Álvaro Trullenque Sánchez|MÉDICO RADIÓLOGO|7.268.691-8', 'Dr. [Médico de turno]|MÉDICO|—', ''].includes(form.informante) && (
                <option value={form.informante}>{form.informante}</option>
              )}
            </select>
          </DesktopField>
        </div>
      </div>

      {/* ── Panel derecho: informe (3/5) ── */}
      <div className="col-span-3 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100 mb-3">
          <ReportIcon />
          Informe
          <span className="ml-auto text-[10px] font-normal text-slate-400">Los campos requeridos (*) son necesarios para guardar</span>
        </div>
        <TextareaDictado label="Hallazgos *" name="hallazgos" value={form.hallazgos}
          onChange={(e) => { if ('target' in e) onChange('hallazgos', e.target.value); }}
          placeholder="Describa en detalle los hallazgos ecográficos observados durante el examen..."
          required minHeight={160}
          onIniciarDictado={() => setDictadosActivos?.((n: number) => n + 1)}
          onDetenerDictado={() => setDictadosActivos?.((n: number) => Math.max(0, n - 1))}
          onPlantilla={onPlantillaHallazgos} />
        <TextareaDictado label="Impresión ecográfica *" name="impresionEcografica" value={form.diagnostico}
          onChange={(e) => { if ('target' in e) onChange('diagnostico', e.target.value); }}
          placeholder="Conclusión diagnóstica..."
          required minHeight={110}
          onIniciarDictado={() => setDictadosActivos?.((n: number) => n + 1)}
          onDetenerDictado={() => setDictadosActivos?.((n: number) => Math.max(0, n - 1))}
          onPlantilla={onPlantillaImpresion} />
        <TextareaDictado label="Recomendaciones" name="recomendaciones" value={form.recomendaciones}
          onChange={(e) => { if ('target' in e) onChange('recomendaciones', e.target.value); }}
          placeholder="Seguimiento, controles, derivaciones sugeridas..."
          minHeight={80}
          onIniciarDictado={() => setDictadosActivos?.((n: number) => n + 1)}
          onDetenerDictado={() => setDictadosActivos?.((n: number) => Math.max(0, n - 1))}
          onPlantilla={onPlantillaRecomendaciones} />
      </div>
    </div>
  );
};

/* ─── Export ─────────────────────────────────────────────── */

const InformeEcoForm: React.FC<InformeEcoFormProps> = (props) => {
  const hayDictadoActivo = (props.dictadosActivos ?? 0) > 0;

  return (
    <>
      {hayDictadoActivo && (
        <div style={{
          background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: 8,
          padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center',
          gap: 8, fontSize: 13, color: '#991B1B',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'pulse-ring 1s ease-out infinite', flexShrink: 0 }} />
          Micrófono activo — hablando en campo activo
        </div>
      )}
      {props.isMobile ? <MobileLayout {...props} /> : <DesktopLayout {...props} />}
    </>
  );
};

export default InformeEcoForm;
