import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Prestacion {
  id: string;
  nombre: string;
  especialidad: string;
  grupo?: string;
}

interface Plantilla {
  prestacionLabel: string;
  hallazgos: string;
  impresion: string;
  recomendaciones?: string;
}

export const makeKeyPlantilla = (label: string): string =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 100);

const PlantillasEcoPage: React.FC = () => {
  const navigate = useNavigate();
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [plantillas, setPlantillas] = useState<Record<string, Plantilla>>({});
  const [selected, setSelected] = useState<Prestacion | null>(null);
  const [editHallazgos, setEditHallazgos] = useState('');
  const [editImpresion, setEditImpresion] = useState('');
  const [editRecomendaciones, setEditRecomendaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prestSnap, plantSnap] = await Promise.all([
          getDocs(collection(db, 'gestion_prestaciones')),
          getDocs(collection(db, 'plantillas_eco')),
        ]);

        const ecoDocs = prestSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Prestacion))
          .filter(p => p.especialidad?.toLowerCase().includes('eco'));

        setPrestaciones(ecoDocs);
        const map: Record<string, Plantilla> = {};
        plantSnap.docs.forEach(d => { map[d.id] = d.data() as Plantilla; });
        setPlantillas(map);
      } catch (e) {
        console.error('Error al cargar datos:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const selectPrestacion = (p: Prestacion) => {
    setSelected(p);
    const key = makeKeyPlantilla(p.nombre);
    setEditHallazgos(plantillas[key]?.hallazgos || '');
    setEditImpresion(plantillas[key]?.impresion || '');
    setEditRecomendaciones(plantillas[key]?.recomendaciones || '');
    setSavedKey(null);
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const key = makeKeyPlantilla(selected.nombre);
    try {
      await setDoc(doc(db, 'plantillas_eco', key), {
        prestacionId: selected.id,
        prestacionLabel: selected.nombre,
        hallazgos: editHallazgos,
        impresion: editImpresion,
        recomendaciones: editRecomendaciones,
        actualizadoEn: serverTimestamp(),
      });
      setPlantillas(prev => ({
        ...prev,
        [key]: {
          prestacionLabel: selected.nombre,
          hallazgos: editHallazgos,
          impresion: editImpresion,
          recomendaciones: editRecomendaciones,
        },
      }));
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    const key = makeKeyPlantilla(selected.nombre);
    try {
      await deleteDoc(doc(db, 'plantillas_eco', key));
      setPlantillas(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditHallazgos('');
      setEditImpresion('');
      setEditRecomendaciones('');
      setConfirmDelete(false);
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  const hasTemplate = (p: Prestacion) => {
    const k = makeKeyPlantilla(p.nombre);
    return !!(plantillas[k]?.hallazgos || plantillas[k]?.impresion || plantillas[k]?.recomendaciones);
  };

  const totalConPlantilla = prestaciones.filter(hasTemplate).length;

  const grouped = prestaciones.reduce<Record<string, Prestacion[]>>((acc, p) => {
    const g = p.grupo || 'General';
    (acc[g] = acc[g] || []).push(p);
    return acc;
  }, {});

  const filtered = search.trim()
    ? prestaciones.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
    : null;

  const renderItem = (p: Prestacion) => {
    const isActive = selected?.id === p.id;
    const hasTpl = hasTemplate(p);
    return (
      <button
        key={p.id}
        onClick={() => selectPrestacion(p)}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0 ${
          isActive ? 'bg-[#0E7490]/10 text-[#0E7490]' : 'hover:bg-slate-50 text-slate-700'
        }`}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasTpl ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        <span className={`text-xs leading-snug flex-1 min-w-0 ${isActive ? 'font-semibold' : 'font-medium'}`}>{p.nombre}</span>
        {hasTpl && (
          <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  };

  const selectedKey = selected ? makeKeyPlantilla(selected.nombre) : '';
  const isSaved = savedKey === selectedKey;
  const currentHasTemplate = selected ? hasTemplate(selected) : false;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 flex-shrink-0 z-10 shadow-sm">
        <button
          onClick={() => navigate('/gestion')}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">Plantillas Ecografía</h1>
          <p className="text-xs text-slate-500 font-medium">Textos predeterminados para hallazgos, impresión y recomendaciones</p>
        </div>
        {!loading && prestaciones.length > 0 && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{totalConPlantilla}<span className="text-slate-400 font-normal">/{prestaciones.length}</span></div>
              <div className="text-[10px] text-slate-400">con plantilla</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 relative">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#10B981" strokeWidth="3"
                  strokeDasharray={`${prestaciones.length > 0 ? (totalConPlantilla / prestaciones.length) * 100 : 0} 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Con plantilla
          <span className="w-2 h-2 rounded-full bg-slate-200 inline-block ml-2" />
          Sin plantilla
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo — lista prestaciones */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar prestación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0E7490]"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin mx-auto" />
              </div>
            ) : filtered ? (
              filtered.length > 0 ? (
                <div>{filtered.map(renderItem)}</div>
              ) : (
                <p className="text-xs text-slate-400 text-center p-8">Sin resultados para "{search}"</p>
              )
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => {
                const conPlantilla = items.filter(hasTemplate).length;
                return (
                  <div key={grupo}>
                    <div className="px-4 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {grupo} <span className="text-slate-300 font-normal">({items.length})</span>
                      </span>
                      {conPlantilla > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-600">
                          {conPlantilla}/{items.length}
                        </span>
                      )}
                    </div>
                    {items.map(renderItem)}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel derecho — editor */}
        {selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prestación seleccionada</p>
                  <h2 className="text-lg font-bold text-slate-800">{selected.nombre}</h2>
                  {selected.grupo && (
                    <span className="text-xs text-slate-400">{selected.grupo}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentHasTemplate && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      Plantilla guardada
                    </span>
                  )}
                </div>
              </div>

              {/* Hallazgos */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Hallazgos</label>
                  <span className="text-xs text-slate-400">{editHallazgos.length} car.</span>
                </div>
                <p className="text-xs text-slate-400">Texto que se insertará en el campo de Hallazgos al aplicar la plantilla</p>
                <textarea
                  value={editHallazgos}
                  onChange={e => setEditHallazgos(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0E7490] resize-none leading-relaxed"
                  placeholder="Escribe aquí el texto de hallazgos predeterminado para esta prestación..."
                />
              </div>

              {/* Impresión ecográfica */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Impresión ecográfica</label>
                  <span className="text-xs text-slate-400">{editImpresion.length} car.</span>
                </div>
                <p className="text-xs text-slate-400">Texto que se insertará en el campo de Impresión ecográfica al aplicar la plantilla</p>
                <textarea
                  value={editImpresion}
                  onChange={e => setEditImpresion(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0E7490] resize-none leading-relaxed"
                  placeholder="Escribe aquí la impresión ecográfica predeterminada..."
                />
              </div>

              {/* Recomendaciones */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Recomendaciones</label>
                  <span className="text-xs text-slate-400">{editRecomendaciones.length} car.</span>
                </div>
                <p className="text-xs text-slate-400">Texto que se insertará en el campo de Recomendaciones al aplicar la plantilla (opcional)</p>
                <textarea
                  value={editRecomendaciones}
                  onChange={e => setEditRecomendaciones(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0E7490] resize-none leading-relaxed"
                  placeholder="Ej: Control en 6 meses, derivar a cirugía..."
                />
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#0E7490] hover:bg-[#0C4A6E] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#0E7490]/20 transition-all"
                >
                  {saving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                    </svg>
                  )}
                  {saving ? 'Guardando...' : 'Guardar plantilla'}
                </button>

                {isSaved && (
                  <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardado
                  </span>
                )}

                <div className="flex-1" />

                {currentHasTemplate && !confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 hover:bg-red-50 text-sm font-medium rounded-xl transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
                    </svg>
                    Eliminar plantilla
                  </button>
                )}

                {confirmDelete && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                    <span className="text-xs text-red-600 font-medium">¿Confirmar eliminación?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <svg className="w-14 h-14 mx-auto text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p className="text-sm text-slate-400">Selecciona una prestación para editar su plantilla</p>
              {!loading && totalConPlantilla === 0 && prestaciones.length > 0 && (
                <p className="text-xs text-slate-300">Aún no hay plantillas configuradas</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantillasEcoPage;
