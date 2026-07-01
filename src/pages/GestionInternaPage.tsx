import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useDialog } from '../components/ui/DialogProvider';
import {
  listarColeccion, crearItem, actualizarItem, eliminarItem, sembrarSugeridos,
  crearUsuarioConPassword,
  normalizarRol, ROLES, SUGERIDOS, PermisoError,
  type GestionItem as DataItem,
} from '../services/gestionService';
import { getPrestacionesActivas, type PrestacionTarifa } from '../services/prestacionesService';
import { validarRut, formatearRutInput } from '../utils/rut';

type TabType = 'especialidades' | 'previsiones' | 'metodos_pago' | 'sexos' | 'usuarios';

const GestionInternaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dialog = useDialog();
  const isAdmin = (user?.role ?? '').toUpperCase() === 'ADMIN';

  const [activeTab, setActiveTab] = useState<TabType>('especialidades');
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState('');
  const [nuevoValor, setNuevoValor] = useState('');

  // ── Modal: alta de usuario con credenciales ─────────────────────────────────
  const [showUserModal, setShowUserModal] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [especialidadesOpts, setEspecialidadesOpts] = useState<string[]>([]);
  const [prestacionesOpts, setPrestacionesOpts] = useState<PrestacionTarifa[]>([]);
  const [userForm, setUserForm] = useState({
    nombre: '',
    rut: '',
    password: '',
    passwordConfirm: '',
    rol: 'TECNOLOGO_MEDICO',
    especialidad: '',
  });
  const [prestacionesSel, setPrestacionesSel] = useState<Set<string>>(new Set());

  const setUser = (field: keyof typeof userForm, value: string) =>
    setUserForm(prev => ({ ...prev, [field]: value }));

  const abrirModalUsuario = async () => {
    setUserError(null);
    setUserForm({ nombre: '', rut: '', password: '', passwordConfirm: '', rol: 'TECNOLOGO_MEDICO', especialidad: '' });
    setPrestacionesSel(new Set());
    setShowUserModal(true);
    try {
      const [esp, prest] = await Promise.all([
        listarColeccion('gestion_especialidades'),
        getPrestacionesActivas(),
      ]);
      setEspecialidadesOpts(esp.filter(e => e.activo !== false).map(e => e.nombre).filter(Boolean));
      setPrestacionesOpts(prest);
    } catch (e) {
      console.error(e);
    }
  };

  const togglePrestacion = (id: string) =>
    setPrestacionesSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleCrearUsuario = async () => {
    if (!validarRut(userForm.rut)) {
      setUserError('El RUT ingresado no es válido.');
      return;
    }
    if (userForm.password.length < 6) {
      setUserError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (userForm.password !== userForm.passwordConfirm) {
      setUserError('Las contraseñas no coinciden.');
      return;
    }

    setSavingUser(true);
    setUserError(null);
    try {
      const prestaciones = prestacionesOpts
        .filter(p => prestacionesSel.has(p.id))
        .map(p => ({ id: p.id, nombre: p.nombre }));
      const creado = await crearUsuarioConPassword({
        nombre: userForm.nombre,
        rut: userForm.rut,
        password: userForm.password,
        rol: userForm.rol,
        especialidad: userForm.especialidad,
        prestaciones,
      });
      if (activeTab === 'usuarios') setItems(prev => [...prev, creado]);
      setShowUserModal(false);
    } catch (e: any) {
      if (e instanceof PermisoError) {
        setUserError('Tu sesión no tiene permisos para crear usuarios.');
      } else if (e?.code === 'auth/email-already-in-use') {
        setUserError('Ya existe un usuario registrado con ese RUT.');
      } else if (e?.code === 'auth/weak-password') {
        setUserError('La contraseña es demasiado débil.');
      } else {
        console.error(e);
        setUserError(e?.message ?? 'No se pudo crear el usuario.');
      }
    } finally {
      setSavingUser(false);
    }
  };

  const TABS: { id: TabType; label: string; collectionName: string }[] = [
    { id: 'especialidades', label: 'Especialidades', collectionName: 'gestion_especialidades' },
    { id: 'previsiones', label: 'Previsiones', collectionName: 'gestion_previsiones' },
    { id: 'metodos_pago', label: 'Métodos de pago', collectionName: 'gestion_metodos_pago' },
    { id: 'sexos', label: 'Sexos', collectionName: 'gestion_sexos' },
    { id: 'usuarios', label: 'Usuarios / Profesionales', collectionName: 'usuarios' }
  ];

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const tieneSugeridos = !!SUGERIDOS[currentTab.collectionName];

  /** Traduce cualquier error en un mensaje claro para el usuario. */
  const manejarError = (e: unknown, accion: string) => {
    if (e instanceof PermisoError) {
      void dialog.alert(
        `No se pudo ${accion}: tu sesión no tiene permisos de escritura en la base de datos.\n\n` +
        'Inicia sesión con una cuenta válida (el acceso de administrador temporal es solo de lectura).',
        { title: 'Sin permisos' },
      );
    } else {
      console.error(e);
      void dialog.alert(`Error al ${accion}.`);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lectura pura: ya NO se siembra nada automáticamente.
      setItems(await listarColeccion(currentTab.collectionName));
    } catch (e) {
      console.error(e);
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCargarSugeridos = async () => {
    try {
      const creados = await sembrarSugeridos(currentTab.collectionName);
      setItems(prev => [...prev, ...creados]);
    } catch (e) {
      manejarError(e, 'cargar los valores sugeridos');
    }
  };

  const handleCreate = async () => {
    if (!nuevoValor.trim()) return;
    try {
      const id = await crearItem(currentTab.collectionName, { nombre: nuevoValor.trim(), activo: true });
      setItems([...items, { id, nombre: nuevoValor.trim(), activo: true }]);
      setNuevoValor('');
    } catch (e) {
      manejarError(e, 'crear el registro');
    }
  };

  const handleToggleStatus = async (item: DataItem) => {
    const nuevoEstado = item.activo === false;
    try {
      await actualizarItem(currentTab.collectionName, item.id, { activo: nuevoEstado });
      setItems(items.map(i => i.id === item.id ? { ...i, activo: nuevoEstado } : i));
    } catch (e) {
      manejarError(e, 'cambiar el estado');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValor.trim()) return;
    try {
      await actualizarItem(currentTab.collectionName, id, { nombre: editValor.trim() });
      setItems(items.map(i => i.id === id ? { ...i, nombre: editValor.trim() } : i));
      setEditandoId(null);
      setEditValor('');
    } catch (e) {
      manejarError(e, 'actualizar el registro');
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await actualizarItem('usuarios', id, { rol: newRole });
      setItems(items.map(i => i.id === id ? { ...i, rol: newRole } : i));
    } catch (e) {
      manejarError(e, 'actualizar el rol');
    }
  };

  const handleDelete = async (item: DataItem) => {
    // Profesionales: soft-delete (desactivar). Eliminar el documento dejaría
    // la cuenta de Firebase Auth huérfana, por eso solo se desactiva.
    if (currentTab.id === 'usuarios') {
      const ok = await dialog.confirm(
        'Esto DESACTIVA al profesional (deja de aparecer activo), pero NO elimina su cuenta de acceso.\n\n' +
        'Para eliminar las credenciales por completo, un administrador debe darlas de baja en Firebase Auth.',
        { title: 'Desactivar profesional', confirmText: 'Desactivar', danger: true },
      );
      if (!ok) return;
      try {
        await actualizarItem('usuarios', item.id, { activo: false });
        setItems(items.map(i => i.id === item.id ? { ...i, activo: false } : i));
      } catch (e) {
        manejarError(e, 'desactivar el profesional');
      }
      return;
    }

    if (!(await dialog.confirm('¿Está seguro de eliminar este registro?', { title: 'Eliminar registro', confirmText: 'Eliminar', danger: true }))) return;
    try {
      await eliminarItem(currentTab.collectionName, item.id);
      setItems(items.filter(i => i.id !== item.id));
    } catch (e) {
      manejarError(e, 'eliminar el registro');
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

        {/* Accesos rápidos */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/prestaciones')}
            className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#0E7490] hover:shadow-md transition-all group text-left"
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

          <button
            onClick={() => navigate('/plantillas-eco')}
            className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#0E7490] hover:shadow-md transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 group-hover:text-[#0E7490] transition-colors">Plantillas Ecografía</p>
              <p className="text-xs text-slate-500 mt-0.5">Textos predeterminados de hallazgos e impresión por prestación</p>
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0E7490] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

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
            {!isAdmin && (
              <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>Tu rol no es Administrador. Puedes consultar los datos, pero los cambios de rol están bloqueados y otras escrituras pueden ser rechazadas por la base de datos.</span>
              </div>
            )}
            {/* Formulario Crear */}
            {activeTab === 'usuarios' ? (
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
                <span className="text-sm text-slate-600 font-medium">
                  Crea un usuario con su RUT y contraseña, asígnale un rol, especialidad y las prestaciones que realiza:
                </span>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={abrirModalUsuario}
                    className="px-5 py-2.5 bg-[#0E7490] hover:bg-[#0C4A6E] text-white text-sm font-bold rounded-lg shadow-md transition-colors whitespace-nowrap"
                  >
                    + Agregar nuevo usuario
                  </button>
                  <button
                    onClick={() => navigate('/nuevo-profesional')}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:border-[#0E7490] text-slate-600 hover:text-[#0E7490] text-sm font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                  >
                    Registro completo
                  </button>
                </div>
              </div>
            ) : (
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
            )}

            {/* Listado */}
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No hay registros en esta categoría.
                {tieneSugeridos && (
                  <div className="mt-4">
                    <button
                      onClick={handleCargarSugeridos}
                      className="px-4 py-2 bg-[#0E7490] hover:bg-[#0C4A6E] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      Cargar valores sugeridos ({SUGERIDOS[currentTab.collectionName].length})
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Crea: {SUGERIDOS[currentTab.collectionName].join(', ')}
                    </p>
                  </div>
                )}
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
                        <div className="flex flex-col min-w-0">
                          <span className={`font-semibold text-sm transition-opacity truncate ${item.activo !== false ? 'text-slate-700' : 'text-slate-400 italic opacity-60'}`}>
                            {item.nombre}
                            {item.activo === false && <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">(Desactivado)</span>}
                          </span>
                          {activeTab === 'usuarios' && (item.email || item.rut) && (
                            <span className="text-xs text-slate-400 truncate">
                              {item.rut} {item.rut && item.email ? '·' : ''} {item.email}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      {activeTab === 'usuarios' && (
                        <select
                          value={normalizarRol(item.rol || item.role)}
                          onChange={(e) => handleRoleChange(item.id, e.target.value)}
                          disabled={!isAdmin}
                          className="mr-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 rounded-lg px-2 py-1 outline-none focus:border-[#0E7490] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      )}
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
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title={activeTab === 'usuarios' ? 'Desactivar' : 'Eliminar'}
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

      {/* Modal: alta de usuario con credenciales */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Encabezado */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Agregar nuevo usuario</h3>
                <p className="text-xs text-slate-500 mt-0.5">Inicia sesión con su RUT y la contraseña que definas aquí</p>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Cuerpo */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nombre <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={e => setUser('nombre', e.target.value)}
                  placeholder="Ej: Carlos González"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">RUT *</label>
                <input
                  type="text"
                  value={userForm.rut}
                  onChange={e => setUser('rut', formatearRutInput(e.target.value))}
                  placeholder="Ej: 12.345.678-9"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Contraseña *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUser('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Repetir contraseña *</label>
                  <input
                    type="password"
                    value={userForm.passwordConfirm}
                    onChange={e => setUser('passwordConfirm', e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Rol *</label>
                  <select
                    value={userForm.rol}
                    onChange={e => setUser('rol', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490]"
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Especialidad</label>
                  {especialidadesOpts.length > 0 ? (
                    <select
                      value={userForm.especialidad}
                      onChange={e => setUser('especialidad', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490]"
                    >
                      <option value="">Sin especialidad</option>
                      {especialidadesOpts.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={userForm.especialidad}
                      onChange={e => setUser('especialidad', e.target.value)}
                      placeholder="Ej: Ecografía"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490]"
                    />
                  )}
                </div>
              </div>

              {/* Prestaciones */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Prestaciones que realiza
                  {prestacionesSel.size > 0 && <span className="ml-2 text-xs font-bold text-[#0E7490]">({prestacionesSel.size} seleccionadas)</span>}
                </label>
                <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {prestacionesOpts.length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-4 text-center">No hay prestaciones registradas.</p>
                  ) : (
                    prestacionesOpts.map(p => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prestacionesSel.has(p.id)}
                          onChange={() => togglePrestacion(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#0E7490] focus:ring-[#0E7490]/30"
                        />
                        <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{p.nombre}</span>
                        {p.especialidad && <span className="text-[10px] text-slate-400 uppercase tracking-tight flex-shrink-0">{p.especialidad}</span>}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {userError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">
                  {userError}
                </div>
              )}
            </div>

            {/* Pie */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                onClick={() => setShowUserModal(false)}
                disabled={savingUser}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearUsuario}
                disabled={savingUser}
                className="flex-1 py-2.5 rounded-xl bg-[#0E7490] hover:bg-[#0C4A6E] disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                {savingUser ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionInternaPage;
