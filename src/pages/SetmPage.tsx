import React, { useState } from 'react';

interface Orden {
  id: number;
  nombre: string;
  tipo: string;
  lab: string;
  hora: string;
  estado: 'pendiente' | 'proceso' | 'completado';
}

interface MuestraForm {
  nombre: string;
  rut: string;
  edad: string;
  tipo: string;
  solicitante: string;
  lab: string;
  obs: string;
}

const TIPOS_EXAMEN = [
  'Hemograma', 'Hemograma + PCR', 'Bioquímica básica', 'Perfil lipídico',
  'Perfil hepático', 'Perfil tiroídeo', 'Orina completa', 'Urocultivo',
  'Serología VIH', 'VDRL', 'Hepatitis B/C', 'Coprocultivo', 'Otro',
];

const LABS = ['Diagnomed', 'Etcheverry Lab', 'Laboclin', 'Bionet', 'Endoclin'];

const TIPO_CARDS = [
  { icon: '🩸', name: 'Hemograma', desc: 'Sangre venosa · EDTA' },
  { icon: '🧪', name: 'Bioquímica', desc: 'Glucosa, perfil lipídico, hepático' },
  { icon: '💛', name: 'Orina completa', desc: 'Muestra de orina · Frasco estéril' },
  { icon: '🔬', name: 'Cultivo', desc: 'Urocultivo, coprocultivo, frotis' },
  { icon: '🧫', name: 'Serología', desc: 'VIH, hepatitis, VDRL' },
  { icon: '➕', name: 'Otro', desc: 'Examen personalizado' },
];

const LAB_STATUS = [
  { name: 'Diagnomed', meta: 'Convenio activo · Retiro en centro', badge: 'Activo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  { name: 'Etcheverry Lab', meta: 'Oferta verbal 25% margen · Logística incluida', badge: 'Verbal', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  { name: 'Laboclin', meta: 'Negociación en curso · lab@laboclin.cl', badge: 'En proceso', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  { name: 'Bionet / Endoclin', meta: 'Sin respuesta · Seguimiento pendiente', badge: 'Pendiente', color: 'bg-slate-100 text-slate-500 border-slate-200' },
];

const EMPTY_FORM: MuestraForm = { nombre: '', rut: '', edad: '', tipo: '', solicitante: '', lab: '', obs: '' };

const SetmPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MuestraForm>(EMPTY_FORM);
  const [ordenes, setOrdenes] = useState<Orden[]>([
    { id: 1, nombre: 'Carlos Muñoz', tipo: 'Hemograma + PCR', lab: 'Diagnomed', hora: '10:20', estado: 'pendiente' },
    { id: 2, nombre: 'Sofía Vega', tipo: 'Orina completa', lab: 'Laboclin', hora: '10:45', estado: 'pendiente' },
  ]);

  const openModal = (tipo = '') => {
    setForm({ ...EMPTY_FORM, tipo });
    setShowModal(true);
  };

  const set = (k: keyof MuestraForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const saveOrden = () => {
    if (!form.nombre || !form.tipo) { alert('Completa nombre y tipo de examen.'); return; }
    const hora = new Date().toTimeString().slice(0, 5);
    setOrdenes(prev => [
      ...prev,
      { id: Date.now(), nombre: form.nombre, tipo: form.tipo, lab: form.lab || '—', hora, estado: 'pendiente' },
    ]);
    setShowModal(false);
  };

  const estadoColor: Record<Orden['estado'], string> = {
    pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
    proceso: 'bg-[#0E7490]/10 text-[#0E7490] border-[#0E7490]/25',
    completado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const estadoLabel: Record<Orden['estado'], string> = {
    pendiente: 'Pendiente', proceso: 'En proceso', completado: 'Completado',
  };

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sala de Toma de Muestras</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro y seguimiento de exámenes de laboratorio</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva orden
        </button>
      </div>

      {/* Tipos de examen */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Tipos de examen disponibles</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TIPO_CARDS.map(tc => (
            <button
              key={tc.name}
              onClick={() => openModal(tc.name)}
              className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 text-left hover:border-[#0E7490]/40 transition-colors"
            >
              <div className="text-2xl mb-2">{tc.icon}</div>
              <div className="text-sm font-medium text-slate-800">{tc.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{tc.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Órdenes activas */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Órdenes activas</div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-100">
          {ordenes.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No hay órdenes activas.</div>
          ) : (
            ordenes.map((o, i) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{o.nombre}</div>
                  <div className="text-xs text-slate-500">{o.tipo} · {o.lab} · {o.hora}</div>
                </div>
                <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${estadoColor[o.estado]}`}>
                  {estadoLabel[o.estado]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Laboratorios convenio */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Laboratorios convenio</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAB_STATUS.map(lab => (
            <div key={lab.name} className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">{lab.name}</div>
                <div className="text-xs text-slate-500">{lab.meta}</div>
              </div>
              <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full flex-shrink-0 ${lab.color}`}>{lab.badge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-lg">🧪 Nueva Orden de Muestra</h3>
            <ModalField label="Paciente *">
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del paciente" />
            </ModalField>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="RUT *">
                <input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
              </ModalField>
              <ModalField label="Edad">
                <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)} placeholder="35" min={0} max={120} />
              </ModalField>
            </div>
            <ModalField label="Tipo de examen *">
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="">Seleccionar...</option>
                {TIPOS_EXAMEN.map(t => <option key={t}>{t}</option>)}
              </select>
            </ModalField>
            <ModalField label="Médico solicitante">
              <input value={form.solicitante} onChange={e => set('solicitante', e.target.value)} placeholder="Dr. / Dra." />
            </ModalField>
            <ModalField label="Laboratorio destino">
              <select value={form.lab} onChange={e => set('lab', e.target.value)}>
                <option value="">Seleccionar laboratorio...</option>
                {LABS.map(l => <option key={l}>{l}</option>)}
              </select>
            </ModalField>
            <ModalField label="Observaciones">
              <input value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Ayuno, condiciones especiales..." />
            </ModalField>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveOrden}
                className="flex-1 py-2 rounded-xl bg-[#0E7490] hover:bg-[#0c6680] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#0E7490]/20"
              >
                Registrar orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModalField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500">{label}</label>
    <div className="[&_input]:w-full [&_input]:bg-white [&_input]:border [&_input]:border-slate-200 [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-slate-800 [&_input]:placeholder-slate-400 [&_input]:outline-none [&_input]:focus:border-[#0E7490]/60 [&_select]:w-full [&_select]:bg-white [&_select]:border [&_select]:border-slate-200 [&_select]:rounded-lg [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-slate-800 [&_select]:outline-none [&_select]:focus:border-[#0E7490]/60">
      {children}
    </div>
  </div>
);

export default SetmPage;
