import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  doc, getDocs, where, Timestamp, serverTimestamp, writeBatch, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/* ── Types ──────────────────────────────────────────────────────── */
interface OrdenSetm {
  id: string;
  pacienteNombre: string;
  pacienteRut: string;
  pacienteEdad: string;
  tipoExamen: string;
  solicitante: string;
  laboratorio: string;
  observaciones: string;
  estado: 'pendiente' | 'retirado' | 'completado';
  creadoEn: Timestamp;
  retiroId?: string;
  fechaRetiro?: Timestamp;
  resultados?: {
    texto: string;
    parametros: { nombre: string; valor: string; unidad: string }[];
  };
  fechaResultados?: Timestamp;
}

interface RetiroSetm {
  id: string;
  creadoEn: Timestamp;
  laboratorio: string;
  cantidadMuestras: number;
  ordenIds: string[];
  notas: string;
}

interface MuestraForm {
  nombre: string; rut: string; edad: string;
  tipo: string; solicitante: string; lab: string; obs: string;
}

/* ── Constantes (se mantienen igual que el original) ────────────── */
const TIPOS_EXAMEN = [
  'Hemograma', 'Hemograma + PCR', 'Bioquímica básica', 'Perfil lipídico',
  'Perfil hepático', 'Perfil tiroídeo', 'Orina completa', 'Urocultivo',
  'Serología VIH', 'VDRL', 'Hepatitis B/C', 'Coprocultivo', 'Otro',
];

const LABS = ['Diagnomed', 'Etcheverry Lab', 'Laboclin', 'Bionet', 'Endoclin'];

const TIPO_CARDS = [
  { icon: <svg className="w-7 h-7 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.5c-3.31 0-6-2.69-6-6 0-3.31 6-12.5 6-12.5s6 9.19 6 12.5c0 3.31-2.69 6-6 6z"/></svg>, name: 'Hemograma', desc: 'Sangre venosa · EDTA' },
  { icon: <svg className="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/></svg>, name: 'Bioquímica', desc: 'Glucosa, perfil lipídico, hepático' },
  { icon: <svg className="w-7 h-7 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6"/><path d="M10 3v4l-3 4v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11l-3-4V3"/><path d="M7 16h10"/></svg>, name: 'Orina completa', desc: 'Muestra de orina · Frasco estéril' },
  { icon: <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>, name: 'Cultivo', desc: 'Urocultivo, coprocultivo, frotis' },
  { icon: <svg className="w-7 h-7 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, name: 'Serología', desc: 'VIH, hepatitis, VDRL' },
  { icon: <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>, name: 'Otro', desc: 'Examen personalizado' },
];

const LAB_STATUS = [
  { name: 'Diagnomed',       meta: 'Convenio activo · Retiro en centro',                  badge: 'Activo',     color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  { name: 'Etcheverry Lab',  meta: 'Oferta verbal 25% margen · Logística incluida',        badge: 'Verbal',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  { name: 'Laboclin',        meta: 'Negociación en curso · lab@laboclin.cl',               badge: 'En proceso', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  { name: 'Bionet / Endoclin', meta: 'Sin respuesta · Seguimiento pendiente',              badge: 'Pendiente',  color: 'bg-slate-100 text-slate-500 border-slate-200' },
];

const EMPTY_FORM: MuestraForm = { nombre: '', rut: '', edad: '', tipo: '', solicitante: '', lab: '', obs: '' };

const estadoConfig = {
  pendiente:  { label: 'Pendiente',           cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  retirado:   { label: 'En laboratorio',       cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completado: { label: 'Completado',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtHora  = (ts?: Timestamp) => ts ? ts.toDate().toLocaleTimeString ('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtFecha = (ts?: Timestamp) => ts ? ts.toDate().toLocaleDateString ('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const esHoy = (ts?: Timestamp) => {
  if (!ts) return false;
  return ts.toDate().toDateString() === new Date().toDateString();
};

/* ── Component ───────────────────────────────────────────────────── */
const SetmPage: React.FC = () => {
  const navigate = useNavigate();

  /* state */
  const [ordenes,  setOrdenes]  = useState<OrdenSetm[]>([]);
  const [retiros,  setRetiros]  = useState<RetiroSetm[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [showModal,           setShowModal]           = useState(false);
  const [showRetiroModal,     setShowRetiroModal]     = useState(false);
  const [showResultadosModal, setShowResultadosModal] = useState(false);
  const [showHistorial,       setShowHistorial]       = useState(false);

  const [form,      setForm]      = useState<MuestraForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [savingOrden,  setSavingOrden]  = useState(false);
  const [savingRetiro, setSavingRetiro] = useState(false);
  const [savingRes,    setSavingRes]    = useState(false);

  const [ordenSel, setOrdenSel] = useState<OrdenSetm | null>(null);
  const [retiroNotas,    setRetiroNotas]    = useState('');
  const [resultadoTexto, setResultadoTexto] = useState('');
  const [parametros,     setParametros]     = useState<{ nombre: string; valor: string; unidad: string }[]>([]);
  const [nuevoParam,     setNuevoParam]     = useState({ nombre: '', valor: '', unidad: '' });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  /* countdown */
  const [countdown,     setCountdown]     = useState('');
  const [alertaRetiro,  setAlertaRetiro]  = useState(false);

  /* patient search */
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQ,       setSearchQ]       = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching,     setSearching]     = useState(false);

  /* ── Firebase: ordenes ────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'setm_ordenes'), orderBy('creadoEn', 'desc'), limit(200));
    return onSnapshot(q, snap => {
      setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrdenSetm)));
      setLoading(false);
    });
  }, []);

  /* ── Firebase: retiros ────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'setm_retiros'), orderBy('creadoEn', 'desc'), limit(30));
    return onSnapshot(q, snap => {
      setRetiros(snap.docs.map(d => ({ id: d.id, ...d.data() } as RetiroSetm)));
    });
  }, []);

  /* ── Countdown al mediodía ────────────────────────────────────── */
  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const noon = new Date(now); noon.setHours(12, 0, 0, 0);
      if (now >= noon) noon.setDate(noon.getDate() + 1);
      const diff = noon.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m} min`);
      const tot = now.getHours() * 60 + now.getMinutes();
      setAlertaRetiro(tot >= 690 && tot <= 750); // 11:30–12:30
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── Búsqueda de pacientes ────────────────────────────────────── */
  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = searchQ.toLowerCase();
        const snap = await getDocs(
          query(collection(db, 'pacientes'),
            where('nombreLower', '>=', q),
            where('nombreLower', '<=', q + ''),
            limit(5))
        );
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [searchQ]);

  /* ── Cómputos derivados ───────────────────────────────────────── */
  const ordenesHoy = ordenes.filter(o => esHoy(o.creadoEn));
  const pendientes = ordenesHoy.filter(o => o.estado === 'pendiente');
  const enLab      = ordenesHoy.filter(o => o.estado === 'retirado');
  const completas  = ordenesHoy.filter(o => o.estado === 'completado');

  /* ── Helpers UI ───────────────────────────────────────────────── */
  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4500);
  };

  const set = (k: keyof MuestraForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openModal = (tipo = '') => {
    setForm({ ...EMPTY_FORM, tipo });
    setSearchQ('');
    setSearchResults([]);
    setFormError('');
    setShowModal(true);
    setTimeout(() => searchRef.current?.focus(), 120);
  };

  const openResultados = (o: OrdenSetm) => {
    setOrdenSel(o);
    setResultadoTexto(o.resultados?.texto || '');
    setParametros(o.resultados?.parametros || []);
    setNuevoParam({ nombre: '', valor: '', unidad: '' });
    setShowResultadosModal(true);
  };

  /* ── Acciones Firebase ────────────────────────────────────────── */
  const saveOrden = async () => {
    if (!form.nombre || !form.tipo) {
      setFormError('Nombre del paciente y tipo de examen son obligatorios.');
      return;
    }
    setFormError('');
    setSavingOrden(true);
    try {
      await addDoc(collection(db, 'setm_ordenes'), {
        pacienteNombre: form.nombre,
        pacienteRut:    form.rut,
        pacienteEdad:   form.edad,
        tipoExamen:     form.tipo,
        solicitante:    form.solicitante,
        laboratorio:    form.lab,
        observaciones:  form.obs,
        estado:         'pendiente',
        creadoEn:       serverTimestamp(),
      });
      setShowModal(false);
      notify('success', `Orden de ${form.nombre} registrada.`);
    } catch (e) {
      console.error(e);
      notify('error', 'Error al guardar la orden.');
    } finally {
      setSavingOrden(false);
    }
  };

  const confirmarRetiro = async () => {
    if (pendientes.length === 0) { notify('error', 'No hay muestras pendientes.'); return; }
    setSavingRetiro(true);
    try {
      const labMayor = (() => {
        const freq: Record<string, number> = {};
        pendientes.forEach(o => { if (o.laboratorio) freq[o.laboratorio] = (freq[o.laboratorio] || 0) + 1; });
        return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Varios';
      })();

      const retiroRef = await addDoc(collection(db, 'setm_retiros'), {
        creadoEn:        serverTimestamp(),
        laboratorio:     labMayor,
        cantidadMuestras: pendientes.length,
        ordenIds:        pendientes.map(o => o.id),
        notas:           retiroNotas,
      });

      const batch = writeBatch(db);
      pendientes.forEach(o =>
        batch.update(doc(db, 'setm_ordenes', o.id), {
          estado:      'retirado',
          retiroId:    retiroRef.id,
          fechaRetiro: serverTimestamp(),
        })
      );
      await batch.commit();

      setShowRetiroModal(false);
      setRetiroNotas('');
      notify('success', `Retiro confirmado: ${pendientes.length} muestra${pendientes.length !== 1 ? 's' : ''}.`);
    } catch (e) {
      console.error(e);
      notify('error', 'Error al registrar el retiro.');
    } finally {
      setSavingRetiro(false);
    }
  };

  const guardarResultados = async () => {
    if (!ordenSel) return;
    setSavingRes(true);
    try {
      await updateDoc(doc(db, 'setm_ordenes', ordenSel.id), {
        resultados:      { texto: resultadoTexto, parametros },
        estado:          'completado',
        fechaResultados: serverTimestamp(),
      });
      setShowResultadosModal(false);
      notify('success', 'Resultados guardados correctamente.');
    } catch (e) {
      console.error(e);
      notify('error', 'Error al guardar los resultados.');
    } finally {
      setSavingRes(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="p-5 space-y-5">

      {/* Notificación toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success'
            ? <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            : <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          {notification.msg}
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 ml-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sala de Toma de Muestras</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro y seguimiento de exámenes de laboratorio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/retiros')}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v10m0 0l-3-3m3 3l3-3"/><path d="M20 12a8 8 0 1 1-16 0"/>
            </svg>
            Retiros
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-[#0E7490]/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Nueva orden
          </button>
        </div>
      </div>

      {/* ── Banner retiro mediodía ───────────────────────────────── */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
        alertaRetiro ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${alertaRetiro ? 'bg-amber-100' : 'bg-slate-50'}`}>
          <svg className={`w-6 h-6 ${alertaRetiro ? 'text-amber-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-800">
            {alertaRetiro ? '¡Es hora del retiro de muestras!' : `Próximo retiro: ${countdown}`}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
            <span>Retiro diario · 12:00</span>
            {pendientes.length > 0 && <span className="text-amber-600 font-semibold">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>}
            {enLab.length > 0     && <span className="text-blue-600 font-semibold">{enLab.length} en lab</span>}
            {completas.length > 0 && <span className="text-emerald-600 font-semibold">{completas.length} completada{completas.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <button
          onClick={() => setShowRetiroModal(true)}
          disabled={pendientes.length === 0}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            pendientes.length > 0
              ? alertaRetiro
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          Confirmar retiro
        </button>
      </div>

      {/* ── Stats rápidas del día ────────────────────────────────── */}
      {ordenesHoy.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pendientes',  val: pendientes.length,  cls: 'text-amber-600',   bg: 'bg-amber-50  border-amber-200'  },
            { label: 'En lab',      val: enLab.length,       cls: 'text-blue-600',    bg: 'bg-blue-50   border-blue-200'   },
            { label: 'Completadas', val: completas.length,   cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${s.bg}`}>
              <span className="text-xs font-semibold text-slate-600">{s.label}</span>
              <span className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tipos de examen ──────────────────────────────────────── */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Tipos de examen disponibles</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TIPO_CARDS.map(tc => (
            <button
              key={tc.name}
              onClick={() => openModal(tc.name)}
              className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 text-left hover:border-[#0E7490]/40 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 flex items-center justify-center mb-2">{tc.icon}</div>
              <div className="text-sm font-medium text-slate-800">{tc.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{tc.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Órdenes del día ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500 uppercase tracking-widest">
            Órdenes de hoy {!loading && `(${ordenesHoy.length})`}
          </div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-100">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
            </div>
          ) : ordenesHoy.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-500">Sin órdenes hoy</p>
              <p className="text-xs text-slate-400 mt-1">Usa "Nueva orden" para registrar la primera muestra del día</p>
            </div>
          ) : (
            ordenesHoy.map((o, i) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3.5 group hover:bg-slate-50/60 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{o.pacienteNombre}</span>
                    {o.pacienteRut && (
                      <span className="text-[11px] text-slate-400 font-mono">{o.pacienteRut}</span>
                    )}
                    {o.pacienteEdad && (
                      <span className="text-[11px] text-slate-400">{o.pacienteEdad} años</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {o.tipoExamen}
                    {o.laboratorio  && ` · ${o.laboratorio}`}
                    {o.solicitante  && ` · ${o.solicitante}`}
                    {' · '}{fmtHora(o.creadoEn)}
                  </div>
                  {o.observaciones && (
                    <div className="text-xs text-slate-400 italic mt-0.5">{o.observaciones}</div>
                  )}
                  {o.estado === 'completado' && o.resultados && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/></svg>
                      Resultados cargados
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wide ${estadoConfig[o.estado].cls}`}>
                    {estadoConfig[o.estado].label}
                  </span>
                  {(o.estado === 'retirado' || o.estado === 'completado') && (
                    <button
                      onClick={() => openResultados(o)}
                      title={o.estado === 'completado' ? 'Ver / editar resultados' : 'Agregar resultados'}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[#0E7490]/10 hover:bg-[#0E7490]/20 text-[#0E7490] rounded-lg transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      {o.estado === 'completado' ? 'Ver' : 'Resultados'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Historial de retiros ─────────────────────────────────── */}
      <div>
        <button
          onClick={() => setShowHistorial(h => !h)}
          className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest mb-3 hover:text-slate-700 transition-colors"
        >
          Historial de retiros
          <svg className={`w-3 h-3 transition-transform duration-200 ${showHistorial ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        {showHistorial && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-100">
            {retiros.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Sin retiros registrados aún.</div>
            ) : retiros.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">
                    {fmtFecha(r.creadoEn)} · {fmtHora(r.creadoEn)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {r.laboratorio && `${r.laboratorio} · `}
                    {r.cantidadMuestras} muestra{r.cantidadMuestras !== 1 ? 's' : ''}
                    {r.notas && ` · ${r.notas}`}
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {r.cantidadMuestras} muestras
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Laboratorios convenio ────────────────────────────────── */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Laboratorios convenio</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAB_STATUS.map(lab => (
            <div key={lab.name} className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">{lab.name}</div>
                <div className="text-xs text-slate-500">{lab.meta}</div>
              </div>
              <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full shrink-0 ${lab.color}`}>{lab.badge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL: Nueva Orden
      ══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-[#0E7490]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Nueva Orden de Muestra</h3>
            </div>

            {/* Buscador de pacientes */}
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5">Buscar paciente en Base de Datos</label>
              <div className="relative">
                <input
                  ref={searchRef}
                  value={searchQ}
                  onChange={e => {
                    setSearchQ(e.target.value);
                    if (!e.target.value) set('nombre', '');
                  }}
                  placeholder="Nombre o RUT del paciente..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0E7490]/60 transition-colors"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
                {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin"/>}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        set('nombre', p.nombre || '');
                        set('rut',    p.rut    || '');
                        set('edad',   p.edad   ? String(p.edad) : '');
                        setSearchQ(p.nombre || '');
                        setSearchResults([]);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#0E7490]/5 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#0E7490]/10 flex items-center justify-center text-[#0E7490] text-xs font-bold shrink-0">
                        {(p.nombre || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.nombre}</p>
                        <p className="text-xs text-slate-400">{p.rut}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-semibold flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <ModalField label="Paciente *">
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="RUT">
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
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={saveOrden}
                disabled={savingOrden}
                className="flex-1 py-2.5 rounded-xl bg-[#0E7490] hover:bg-[#0c6680] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#0E7490]/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingOrden && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>}
                Registrar orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Confirmar Retiro
      ══════════════════════════════════════════════════════════ */}
      {showRetiroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Confirmar Retiro</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4 ml-12">
              {pendientes.length} muestra{pendientes.length !== 1 ? 's' : ''} · {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* Resumen muestras */}
            <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5 max-h-44 overflow-y-auto">
              {pendientes.map(o => (
                <div key={o.id} className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"/>
                  </div>
                  <span className="font-medium text-slate-700 truncate flex-1">{o.pacienteNombre}</span>
                  <span className="text-xs text-slate-400 shrink-0">{o.tipoExamen}</span>
                  {o.laboratorio && <span className="text-xs text-[#0E7490] shrink-0">{o.laboratorio}</span>}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5">Notas del retiro (opcional)</label>
              <input
                value={retiroNotas}
                onChange={e => setRetiroNotas(e.target.value)}
                placeholder="Ej: Temperatura OK, entregado a mensajero..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0E7490]/60"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRetiroModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={confirmarRetiro}
                disabled={savingRetiro}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingRetiro && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>}
                Confirmar retiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Agregar / Ver Resultados
      ══════════════════════════════════════════════════════════ */}
      {showResultadosModal && ordenSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 text-lg">Resultados del examen</h3>
              <button onClick={() => setShowResultadosModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-semibold text-slate-700">{ordenSel.pacienteNombre}</span>
              {ordenSel.pacienteRut && ` · ${ordenSel.pacienteRut}`}
              {' · '}{ordenSel.tipoExamen}
              {ordenSel.laboratorio && ` · ${ordenSel.laboratorio}`}
            </p>

            {/* Informe libre */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Informe / comentario general</label>
              <textarea
                value={resultadoTexto}
                onChange={e => setResultadoTexto(e.target.value)}
                rows={3}
                placeholder="Texto libre del informe o resultado..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0E7490]/60 resize-none transition-colors"
              />
            </div>

            {/* Parámetros estructurados */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Valores por parámetro</label>

              {parametros.length > 0 && (
                <div className="mb-3 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                  {parametros.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50/50">
                      <span className="text-sm text-slate-600 flex-1 font-medium">{p.nombre}</span>
                      <span className="text-sm font-bold text-[#0E7490]">{p.valor}</span>
                      {p.unidad && <span className="text-xs text-slate-400 w-14 text-right">{p.unidad}</span>}
                      <button
                        onClick={() => setParametros(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Agregar parámetro */}
              <div className="flex gap-2">
                <input
                  value={nuevoParam.nombre}
                  onChange={e => setNuevoParam(p => ({ ...p, nombre: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && nuevoParam.nombre && nuevoParam.valor) { setParametros(prev => [...prev, nuevoParam]); setNuevoParam({ nombre: '', valor: '', unidad: '' }); } }}
                  placeholder="Parámetro (ej: Hemoglobina)"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder-slate-400 outline-none focus:border-[#0E7490]/60"
                />
                <input
                  value={nuevoParam.valor}
                  onChange={e => setNuevoParam(p => ({ ...p, valor: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && nuevoParam.nombre && nuevoParam.valor) { setParametros(prev => [...prev, nuevoParam]); setNuevoParam({ nombre: '', valor: '', unidad: '' }); } }}
                  placeholder="Valor"
                  className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder-slate-400 outline-none focus:border-[#0E7490]/60"
                />
                <input
                  value={nuevoParam.unidad}
                  onChange={e => setNuevoParam(p => ({ ...p, unidad: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && nuevoParam.nombre && nuevoParam.valor) { setParametros(prev => [...prev, nuevoParam]); setNuevoParam({ nombre: '', valor: '', unidad: '' }); } }}
                  placeholder="Unidad"
                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder-slate-400 outline-none focus:border-[#0E7490]/60"
                />
                <button
                  onClick={() => {
                    if (!nuevoParam.nombre || !nuevoParam.valor) return;
                    setParametros(prev => [...prev, nuevoParam]);
                    setNuevoParam({ nombre: '', valor: '', unidad: '' });
                  }}
                  className="px-3 py-2 bg-[#0E7490] text-white rounded-xl hover:bg-[#0c6680] transition-colors shrink-0"
                  title="Agregar parámetro (también puedes presionar Enter)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Tip: presiona Enter para agregar rápidamente</p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setShowResultadosModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarResultados}
                disabled={savingRes}
                className="flex-1 py-2.5 rounded-xl bg-[#0E7490] hover:bg-[#0c6680] text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingRes && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>}
                Guardar resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── ModalField helper ───────────────────────────────────────────── */
const ModalField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500">{label}</label>
    <div className="[&_input]:w-full [&_input]:bg-white [&_input]:border [&_input]:border-slate-200 [&_input]:rounded-xl [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:text-slate-800 [&_input]:placeholder-slate-400 [&_input]:outline-none [&_input]:focus:border-[#0E7490]/60 [&_select]:w-full [&_select]:bg-white [&_select]:border [&_select]:border-slate-200 [&_select]:rounded-xl [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:text-slate-800 [&_select]:outline-none [&_select]:focus:border-[#0E7490]/60 [&_input]:transition-colors [&_select]:transition-colors">
      {children}
    </div>
  </div>
);

export default SetmPage;
