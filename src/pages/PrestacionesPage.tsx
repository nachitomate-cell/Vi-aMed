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
  descripcion?: string;
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

/* ── Script Update Fonasa ───────────────────────────────────── */
const FONASA_DATA = [
  { "codigo": "0101001", "total": 12930, "bonificacion": 5680, "copago": 7250 },
  { "codigo": "010100SM", "total": 37930, "bonificacion": 20420, "copago": 17510 },
  { "codigo": "0101321", "total": 19220, "bonificacion": 7690, "copago": 11530 },
  { "codigo": "0404003", "total": 35840, "bonificacion": 22050, "copago": 13790 },
  { "codigo": "0404006", "total": 19070, "bonificacion": 11730, "copago": 7340 },
  { "codigo": "0404009", "total": 19930, "bonificacion": 12260, "copago": 7670 },
  { "codigo": "0404010", "total": 24840, "bonificacion": 15280, "copago": 9560 },
  { "codigo": "0404012", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404014", "total": 24650, "bonificacion": 15170, "copago": 9480 },
  { "codigo": "04040146", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404015", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016AD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016AI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016BD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016BI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016C", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CA", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CAD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CAI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CU", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016D", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016DD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016DI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016G", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016GD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016GI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HPD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HPI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016ID", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016II", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016L", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016LP", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MÑD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MÑI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MUD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MUI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016o", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016oo", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PA", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PCD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PCI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PID", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PII", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016RD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016RI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016S", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016T", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TAD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TAI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "04040416PA", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404118", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118a", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118as", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118av", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118avs", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118s", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118t", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118v", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118vs", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404119", "total": 77390, "bonificacion": 47620, "copago": 29770 },
  { "codigo": "0404121", "total": 84450, "bonificacion": 51970, "copago": 32480 },
  { "codigo": "0404121DA", "total": 84450, "bonificacion": 51970, "copago": 32480 },
  { "codigo": "0404121R", "total": 84450, "bonificacion": 51970, "copago": 32480 },
  { "codigo": "040418av2", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "040418p", "total": 81950, "bonificacion": 50430, "copago": 31520 }
];

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
        descripcion: d.data().descripcion ?? '',
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

  const handleUpdateFonasa = async () => {
    if (!window.confirm("¿Seguro que deseas actualizar los precios de Fonasa masivamente?")) return;
    setLoading(true);
    
    const map = new Map();
    for (const d of FONASA_DATA) map.set(d.codigo.toLowerCase(), d);

    let count = 0;
    try {
      const snap = await getDocs(collection(db, 'gestion_prestaciones'));
      for (const d of snap.docs) {
        const cod = (d.data().codigo || '').toLowerCase();
        const prestacionInfo = map.get(cod);
        if (prestacionInfo) {
          let valores = d.data().valoresPrevision || [];
          const index = valores.findIndex((v: any) => v.tipo === 'Fonasa Nivel 2' || v.tipo === 'Fonasa');
          
          const newValor = {
            tipo: 'Fonasa Nivel 2',
            valor: prestacionInfo.total,
            copago: prestacionInfo.copago,
            bonificacion: prestacionInfo.bonificacion // Se agrega la bonificación aunque no existiera antes
          };

          if (index >= 0) {
            valores[index] = newValor;
          } else {
            valores.push(newValor);
          }

          await updateDoc(doc(db, 'gestion_prestaciones', d.id), {
            valoresPrevision: valores
          });
          count++;
        }
      }
      alert(`¡Se actualizaron ${count} prestaciones con los precios de Fonasa Nivel 2!`);
      fetchPrestaciones();
    } catch (e) {
      console.error(e);
      alert('Error actualizando');
    }
    setLoading(false);
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">Aranceles y servicios clínicos · {prestaciones.length} registros</p>
              <button 
                onClick={handleUpdateFonasa}
                className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold hover:bg-amber-200 transition-colors"
                title="Actualizar precios de Fonasa Nivel 2 basados en los códigos provistos"
              >
                Actualizar Fonasa Masivo
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 uppercase tracking-tight">
            <span className="w-2 h-2 rounded-full bg-[#0E7490] animate-pulse" />
            {prestaciones.length} Prestaciones totales
          </div>
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
      <div className="flex-1 p-6 overflow-hidden">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full max-h-[calc(100vh-220px)]">
          {/* Thead */}
          <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="col-span-1">Código</span>
            <span className="col-span-3">Nombre</span>
            <span className="col-span-2">Especialidad</span>
            <span className="col-span-4">Fonasa Nivel 2 (Total / Bono / Copago)</span>
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
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {filtradas.map(p => (
                <div key={p.id} className="grid grid-cols-12 px-4 py-3.5 hover:bg-slate-50 transition-colors group items-center">
                  <span className="col-span-1 font-mono text-xs text-slate-500 truncate pr-2">{p.codigo || '—'}</span>
                  <span className="col-span-3 text-sm font-semibold text-slate-800 truncate pr-4" title={p.descripcion || p.nombre}>
                    {p.descripcion || p.nombre}
                  </span>
                  <span className="col-span-2 text-xs text-slate-500 truncate">{p.especialidad || '—'}</span>
                  <span className="col-span-4 text-xs">
                    {(() => {
                      const fonasa = p.valoresPrevision?.find(v => v.tipo === 'Fonasa Nivel 2' || v.tipo === 'Fonasa');
                      if (!fonasa) return <span className="text-slate-400 italic">No configurado</span>;
                      
                      // Si la bonificacion se guardó, la mostramos, sino la calculamos como Total - Copago
                      const bono = (fonasa as any).bonificacion || (fonasa.valor - fonasa.copago);
                      
                      return (
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700" title="Total">${fonasa.valor.toLocaleString('es-CL')}</span>
                          <span className="text-emerald-600" title="Bonificación">(${bono.toLocaleString('es-CL')})</span>
                          <span className="font-bold text-[#0E7490]" title="Copago Paciente">${fonasa.copago.toLocaleString('es-CL')}</span>
                        </div>
                      );
                    })()}
                  </span>
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
