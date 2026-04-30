import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type TabType = 'especialidades' | 'previsiones' | 'metodos_pago' | 'sexos' | 'usuarios';

interface DataItem {
  id: string;
  nombre: string;
  activo?: boolean;
  [key: string]: any;
}

const GestionInternaPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('especialidades');
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState('');
  const [nuevoValor, setNuevoValor] = useState('');

  const TABS: { id: TabType; label: string; collectionName: string }[] = [
    { id: 'especialidades', label: 'Especialidades', collectionName: 'gestion_especialidades' },
    { id: 'previsiones', label: 'Previsiones', collectionName: 'gestion_previsiones' },
    { id: 'metodos_pago', label: 'Métodos de pago', collectionName: 'gestion_metodos_pago' },
    { id: 'sexos', label: 'Sexos', collectionName: 'gestion_sexos' },
    { id: 'usuarios', label: 'Usuarios', collectionName: 'usuarios' }
  ];

  const currentTab = TABS.find(t => t.id === activeTab)!;

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, currentTab.collectionName));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DataItem));
      // Fallback a datos estáticos si la colección está vacía (para demostración)
      if (data.length === 0 && currentTab.id !== 'usuarios') {
        setItems([
          { id: 'mock1', nombre: `Ejemplo de ${currentTab.label} 1` },
          { id: 'mock2', nombre: `Ejemplo de ${currentTab.label} 2` }
        ]);
      } else {
        setItems(data.map(i => ({ ...i, nombre: i.nombre || i.name || i.email || 'Sin nombre' })));
      }
    } catch (e) {
      console.error(e);
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreate = async () => {
    if (!nuevoValor.trim()) return;
    try {
      const data = { nombre: nuevoValor, activo: true };
      const docRef = await addDoc(collection(db, currentTab.collectionName), data);
      setItems([...items, { id: docRef.id, ...data }]);
      setNuevoValor('');
    } catch (e) {
      console.error(e);
      alert('Error al crear registro');
    }
  };

  const handleToggleStatus = async (item: DataItem) => {
    try {
      const nuevoEstado = !item.activo;
      await updateDoc(doc(db, currentTab.collectionName, item.id), { activo: nuevoEstado });
      setItems(items.map(i => i.id === item.id ? { ...i, activo: nuevoEstado } : i));
    } catch (e) {
      console.error(e);
      alert('Error al cambiar estado');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValor.trim()) return;
    try {
      await updateDoc(doc(db, currentTab.collectionName, id), { nombre: editValor });
      setItems(items.map(i => i.id === id ? { ...i, nombre: editValor } : i));
      setEditandoId(null);
      setEditValor('');
    } catch (e) {
      console.error(e);
      alert('Error al actualizar registro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await deleteDoc(doc(db, currentTab.collectionName, id));
      setItems(items.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
      alert('Error al eliminar registro');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans flex flex-col">
      {/* Header Fijo */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Volver al Dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Gestión Interna</h1>
            <p className="text-xs text-slate-500 font-medium">Configuración base del sistema y listados maestos</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col gap-5 items-start">

        {/* Acceso rápido a Prestaciones */}
        <button
          onClick={() => navigate('/prestaciones')}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#0E7490] hover:shadow-md transition-all group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0E7490]/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#0E7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 group-hover:text-[#0E7490] transition-colors">Prestaciones</p>
            <p className="text-xs text-slate-500 mt-0.5">Aranceles, códigos, previsiones y copagos por servicio clínico</p>
          </div>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0E7490] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="w-full flex gap-8 items-start">
        
        {/* Menú Lateral de Pestañas */}
        <div className="w-64 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex-shrink-0 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-1">Categorías</p>
          <div className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setEditandoId(null); setNuevoValor(''); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#0E7490]/10 text-[#0E7490]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Principal */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">
              Administrar {currentTab.label}
            </h2>
            <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
              {items.length} Registros
            </div>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {/* Formulario Crear */}
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 shadow-sm">
              <input 
                type="text"
                placeholder={`Nuevo registro de ${currentTab.label.toLowerCase()}...`}
                value={nuevoValor}
                onChange={e => setNuevoValor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20"
              />
              <button 
                onClick={handleCreate}
                disabled={!nuevoValor.trim()}
                className="px-5 py-2 bg-[#0E7490] hover:bg-[#0C4A6E] text-white text-sm font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Agregar
              </button>
            </div>

            {/* Listado */}
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No hay registros en esta categoría.
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item.id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                    {editandoId === item.id ? (
                      <div className="flex-1 flex gap-2 mr-4">
                        <input 
                          autoFocus
                          value={editValor}
                          onChange={e => setEditValor(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                          className="flex-1 bg-white border border-[#0E7490] rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Toggle Status */}
                        <button 
                          onClick={() => handleToggleStatus(item)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors flex-shrink-0 ${item.activo !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${item.activo !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                        <span className={`font-semibold text-sm transition-opacity truncate ${item.activo !== false ? 'text-slate-700' : 'text-slate-400 italic opacity-60'}`}>
                          {item.nombre}
                          {item.activo === false && <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">(Desactivado)</span>}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-1">
                      {editandoId === item.id ? (
                        <>
                          <button 
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Guardar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button 
                            onClick={() => setEditandoId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setEditandoId(item.id); setEditValor(item.nombre); }}
                            className="p-1.5 text-slate-400 hover:text-[#0E7490] hover:bg-[#0E7490]/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        </div>

      </div>
    </div>
  );
};

export default GestionInternaPage;
