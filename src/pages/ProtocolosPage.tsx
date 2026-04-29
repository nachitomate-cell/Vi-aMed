import React from 'react';

interface DocItem {
  title: string;
  meta: string;
  ext: string;
  extColor: string;
  iconColor: string;
}

const PROTOCOLOS: DocItem[] = [
  { title: 'Protocolo de Curación Avanzada', meta: 'Actualizado marzo 2025', ext: 'PDF', extColor: 'bg-red-500/10 text-red-400 border-red-500/25', iconColor: 'text-red-400' },
  { title: 'Manual de Normas y Procedimientos', meta: 'DS 283 / SEREMI V Región', ext: 'PDF', extColor: 'bg-red-500/10 text-red-400 border-red-500/25', iconColor: 'text-red-400' },
  { title: 'Protocolo REAS', meta: 'Residuos sólidos especiales hospitalarios', ext: 'PDF', extColor: 'bg-red-500/10 text-red-400 border-red-500/25', iconColor: 'text-red-400' },
  { title: 'Protocolo Toma de Muestras', meta: 'Sala de muestras · ViñaMed', ext: 'PDF', extColor: 'bg-red-500/10 text-red-400 border-red-500/25', iconColor: 'text-red-400' },
];

const FORMULARIOS: DocItem[] = [
  { title: 'Control de Stock de Insumos', meta: 'Inventario botiquín · Actualizado', ext: 'XLSX', extColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', iconColor: 'text-emerald-400' },
  { title: 'Planilla REAS Mensual', meta: 'Registro para auditoría SEREMI', ext: 'XLSX', extColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', iconColor: 'text-emerald-400' },
  { title: 'Hoja de Procedimiento Enfermería', meta: 'Curación, medicación, signos vitales', ext: 'DOCX', extColor: 'bg-[#0E7490]/10 text-[#0E7490] border-[#0E7490]/25', iconColor: 'text-[#0E7490]' },
  { title: 'Consentimiento Informado', meta: 'Procedimientos invasivos', ext: 'DOCX', extColor: 'bg-[#0E7490]/10 text-[#0E7490] border-[#0E7490]/25', iconColor: 'text-[#0E7490]' },
];

const FileIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const DocCard: React.FC<{ item: DocItem }> = ({ item }) => (
  <button className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-[#0E7490]/50 transition-colors text-left w-full shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50`}>
      <FileIcon color={item.iconColor} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-800">{item.title}</div>
      <div className="text-xs text-slate-500">{item.meta}</div>
    </div>
    <span className={`text-xs font-bold border px-2.5 py-0.5 rounded-full flex-shrink-0 ${item.extColor}`}>{item.ext}</span>
  </button>
);

const ProtocolosPage: React.FC = () => (
  <div className="p-5 space-y-5">
    <div>
      <h1 className="text-xl font-bold text-slate-800">Protocolos y Documentos</h1>
      <p className="text-sm text-slate-500 mt-0.5">Accede a planillas, protocolos clínicos y formularios del centro</p>
    </div>

    <div>
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Protocolo Clínico</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROTOCOLOS.map(d => <DocCard key={d.title} item={d} />)}
      </div>
    </div>

    <div>
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Planillas y Formularios</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORMULARIOS.map(d => <DocCard key={d.title} item={d} />)}
      </div>
    </div>

    <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
      <p className="text-xs text-slate-500">
        Puedes agregar documentos reales arrastrándolos aquí (funcionalidad disponible con backend)
      </p>
    </div>
  </div>
);

export default ProtocolosPage;
