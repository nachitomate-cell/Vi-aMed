import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/* ── Types ─────────────────────────────────────────────────── */
interface ValorPrevision {
  tipo: string;
  valor: number;
  copago: number;
}

interface Prestacion {
  id: string;
  codigo: string;
  nombre: string;
  estado: 'activo' | 'inactivo';
  especialidad: string;
  afecto: boolean;
  valoresPrevision: ValorPrevision[];
}

const ESTADOS = ['activo', 'inactivo'] as const;
const AFECTO_OPS = [{ label: 'Afecto', val: true }, { label: 'No afecto', val: false }];

const EMPTY_FORM: Omit<Prestacion, 'id'> = {
  codigo: '', nombre: '', estado: 'activo', especialidad: '', afecto: true,
  valoresPrevision: [],
};

/* ── Helpers ────────────────────────────────────────────────── */
const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20 bg-white';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

/* ── Modal Editar / Crear ───────────────────────────────────── */
const ModalPrestacion: React.FC<{
  inicial: Omit<Prestacion, 'id'>;
  especialidades: string[];
  previsiones: string[];
  onCerrar: () => void;
  onGuardar: (datos: Omit<Prestacion, 'id'>) => Promise<void>;
}> = ({ inicial, especialidades, previsiones, onCerrar, onGuardar }) => {
  const [form, setForm] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [nuevaPrev, setNuevaPrev] = useState<ValorPrevision>({ tipo: '', valor: 0, copago: 0 });

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const addPrevision = () => {
    if (!nuevaPrev.tipo.trim()) return;
    set({ valoresPrevision: [...form.valoresPrevision, { ...nuevaPrev }] });
    setNuevaPrev({ tipo: '', valor: 0, copago: 0 });
  };

  const removePrevision = (idx: number) =>
    set({ valoresPrevision: form.valoresPrevision.filter((_, i) => i !== idx) });

  const editPrevision = (idx: number, patch: Partial<ValorPrevision>) =>
    set({
      valoresPrevision: form.valoresPrevision.map((v, i) => i === idx ? { ...v, ...patch } : v),
    });

  const handleGuardar = async () => {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.especialidad.trim()) return;
    setGuardando(true);
    await onGuardar(form);
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Editar prestación</h2>
            <p className="text-xs text-slate-400 mt-0.5">Los campos con (*) son obligatorios</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Row 1: Código, Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Código *</label>
              <input className={inputCls} value={form.codigo} onChange={e => set({ codigo: e.target.value })} placeholder="Ej: MG-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Estado *</label>
              <select className={selectCls} value={form.estado} onChange={e => set({ estado: e.target.value as 'activo' | 'inactivo' })}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Especialidad */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Especialidad *</label>
            <select className={selectCls} value={form.especialidad} onChange={e => set({ especialidad: e.target.value })}>
              <option value="">Seleccionar...</option>
              {especialidades.map(esp => <option key={esp} value={esp}>{esp}</option>)}
            </select>
          </div>

          {/* Row 3: Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nombre *</label>
            <input className={inputCls} value={form.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Ej: CONSULTA MEDICINA GENERAL" />
          </div>

          {/* Row 4: Previsión base + Afecto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Afecto</label>
              <select className={selectCls} value={String(form.afecto)} onChange={e => set({ afecto: e.target.value === 'true' })}>
                {AFECTO_OPS.map(o => <option key={String(o.val)} value={String(o.val)}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Valores por previsión */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Valores por previsión</p>
            {/* Tabla existente */}
            {form.valoresPrevision.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Tipo de Previsión</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Valor</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Copago</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.valoresPrevision.map((v, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <select className="w-full bg-transparent text-sm text-slate-700 focus:outline-none" value={v.tipo} onChange={e => editPrevision(idx, { tipo: e.target.value })}>
                            <option value={v.tipo}>{v.tipo}</option>
                            {previsiones.filter(p => p !== v.tipo).map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="w-full bg-transparent text-sm text-slate-700 focus:outline-none" value={v.valor} onChange={e => editPrevision(idx, { valor: Number(e.target.value) })} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="w-full bg-transparent text-sm text-slate-700 focus:outline-none" value={v.copago} onChange={e => editPrevision(idx, { copago: Number(e.target.value) })} />
                        </td>
                        <td className="px-1 py-2">
                          <button onClick={() => removePrevision(idx)} className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Agregar nueva previsión */}
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agregar previsión</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Previsión *</label>
                  <select className={`${selectCls} py-1.5 text-xs`} value={nuevaPrev.tipo} onChange={e => setNuevaPrev(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {previsiones.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Valor *</label>
                  <input type="number" className={`${inputCls} py-1.5 text-xs`} value={nuevaPrev.valor} onChange={e => setNuevaPrev(p => ({ ...p, valor: Number(e.target.value) }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Copago</label>
                  <input type="number" className={`${inputCls} py-1.5 text-xs`} value={nuevaPrev.copago} onChange={e => setNuevaPrev(p => ({ ...p, copago: Number(e.target.value) }))} placeholder="0" />
                </div>
              </div>
              <button onClick={addPrevision} disabled={!nuevaPrev.tipo} className="mt-2 w-full py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-[#0E7490] hover:text-[#0E7490] transition-colors disabled:opacity-40">
                + Agregar fila
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">Cancelar</button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !form.codigo.trim() || !form.nombre.trim() || !form.especialidad.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-[#0E7490] hover:bg-[#0c6680] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {guardando && <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Page principal ─────────────────────────────────────────── */
const PrestacionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Prestacion | null>(null);
  const [creando, setCreando] = useState(false);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [previsiones, setPrevisiones] = useState<string[]>([]);

  const fetchPrestaciones = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'gestion_prestaciones'));
      const data = snap.docs.map(d => ({
        id: d.id,
        codigo: d.data().codigo ?? '',
        nombre: d.data().nombre ?? '',
        estado: d.data().estado ?? 'activo',
        especialidad: d.data().especialidad ?? '',
        afecto: d.data().afecto ?? true,
        valoresPrevision: d.data().valoresPrevision ?? [],
      } as Prestacion));
      data.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setPrestaciones(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrestaciones();
    getDocs(collection(db, 'gestion_especialidades')).then(s => setEspecialidades(s.docs.map(d => d.data().nombre as string).filter(Boolean)));
    getDocs(collection(db, 'gestion_previsiones')).then(s => setPrevisiones(s.docs.map(d => d.data().nombre as string).filter(Boolean)));
  }, [fetchPrestaciones]);

  const handleGuardar = async (datos: Omit<Prestacion, 'id'>, id?: string) => {
    if (id) {
      await updateDoc(doc(db, 'gestion_prestaciones', id), { ...datos, actualizadoEn: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'gestion_prestaciones'), { ...datos, creadoEn: serverTimestamp() });
    }
    setEditando(null);
    setCreando(false);
    fetchPrestaciones();
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteDoc(doc(db, 'gestion_prestaciones', id));
    setPrestaciones(p => p.filter(x => x.id !== id));
  };

  const filtradas = prestaciones.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.especialidad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/gestion')} className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors" title="Volver a Gestión">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Prestaciones</h1>
            <p className="text-xs text-slate-500">Aranceles y servicios clínicos · {prestaciones.length} registros</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPrestaciones} className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors" title="Recargar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.69" /></svg>
          </button>
          <button onClick={() => setCreando(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
            Nueva prestación
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-6 py-4 bg-white border-b border-slate-100">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder="Buscar por nombre, código o especialidad..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Thead */}
          <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="col-span-2">Código</span>
            <span className="col-span-5">Nombre</span>
            <span className="col-span-2">Especialidad</span>
            <span className="col-span-1">Previsiones</span>
            <span className="col-span-1 text-center">Estado</span>
            <span className="col-span-1 text-right">Acciones</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {busqueda ? 'No se encontraron coincidencias.' : 'No hay prestaciones. Agrega la primera.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtradas.map(p => (
                <div key={p.id} className="grid grid-cols-12 px-4 py-3.5 hover:bg-slate-50 transition-colors group items-center">
                  <span className="col-span-2 font-mono text-xs text-slate-500 truncate">{p.codigo || '—'}</span>
                  <span className="col-span-5 text-sm font-semibold text-slate-800 truncate pr-4">{p.nombre}</span>
                  <span className="col-span-2 text-xs text-slate-500 truncate">{p.especialidad || '—'}</span>
                  <span className="col-span-1 text-xs text-slate-500">{p.valoresPrevision?.length ?? 0}</span>
                  <span className="col-span-1 text-center">
                    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${p.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {p.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </span>
                  <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditando(p)} className="p-1.5 text-slate-400 hover:text-[#0E7490] hover:bg-[#0E7490]/10 rounded-lg transition-colors" title="Editar">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleEliminar(p.id, p.nombre)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar */}
      {editando && (
        <ModalPrestacion
          inicial={{ codigo: editando.codigo, nombre: editando.nombre, estado: editando.estado, especialidad: editando.especialidad, afecto: editando.afecto, valoresPrevision: editando.valoresPrevision }}
          especialidades={especialidades}
          previsiones={previsiones}
          onCerrar={() => setEditando(null)}
          onGuardar={datos => handleGuardar(datos, editando.id)}
        />
      )}

      {/* Modal Crear */}
      {creando && (
        <ModalPrestacion
          inicial={{ ...EMPTY_FORM }}
          especialidades={especialidades}
          previsiones={previsiones}
          onCerrar={() => setCreando(false)}
          onGuardar={datos => handleGuardar(datos)}
        />
      )}
    </div>
  );
};

export default PrestacionesPage;
