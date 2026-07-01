import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import InformeEcoForm from '../components/eco-mobile/InformeEcoForm';
import AccionesInforme from '../components/shared/AccionesInforme';
import PdfPreviewInforme from '../components/eco/PdfPreviewInforme';
import {
  INITIAL_FORM,
  guardarInformeEco,
  getInformeExistente,
  type DatosInformeEco,
} from '../services/informeEcoService';
import type { InformeParaPDF } from '../services/pdfInformeService';

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { makeKeyPlantilla } from './PlantillasEcoPage';
import { db } from '../lib/firebase';
import type { Cita } from '../types/agenda';
import { ESTADO_LABELS, ESTADO_COLORS } from '../types/agenda';

const calcularEdad = (fechaNacimiento: string): string => {
  if (!fechaNacimiento) return '';
  const [year, month, day] = fechaNacimiento.split('-').map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - year;
  if (hoy < new Date(hoy.getFullYear(), month - 1, day)) edad--;
  return edad > 0 ? String(edad) : '';
};

const parsearTipoAtencion = (tipoAtencion: string): { codigo: string; tipo: string } => {
  const match = tipoAtencion.match(/^([A-Za-z0-9]+)\s*-\s*(.+)$/);
  if (match) {
    const codigo = match[1];
    const tipoConEco = match[2];
    const tipo = tipoConEco.replace(/ecograf[íi]a\s*/i, '').trim() || tipoConEco;
    return { codigo, tipo };
  }
  const tipo = tipoAtencion.replace(/ecograf[íi]a\s*/i, '').trim() || tipoAtencion;
  return { codigo: '', tipo };
};

const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

const quitarCodigo = (s: string) => (s.includes(' - ') ? s.split(' - ').slice(1).join(' - ').trim() : s);

/**
 * Busca la plantilla que corresponde a un examen.
 * 1) Por prestacionId (vínculo exacto, lo más confiable).
 * 2) Por nombre, ignorando el código (la key de la plantilla incluye el código,
 *    el examen de la planilla normalmente no).
 * Devuelve la KEY (id del doc plantillas_eco) o null.
 */
function buscarPlantillaKey(
  examen: string,
  prestacionId: string | undefined,
  keys: Set<string>,
  porPrestacion: Map<string, string>,
): string | null {
  if (prestacionId && porPrestacion.has(prestacionId)) return porPrestacion.get(prestacionId)!;
  const nombreKey = makeKeyPlantilla(quitarCodigo(examen || ''));
  if (nombreKey) {
    if (keys.has(nombreKey)) return nombreKey;
    for (const k of keys) if (k.endsWith('_' + nombreKey)) return k;
  }
  const fullKey = makeKeyPlantilla(examen || '');
  if (fullKey && keys.has(fullKey)) return fullKey;
  return null;
}

const formatFechaDia = (date: Date) =>
  date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

const formatFechaCorta = (date: Date) =>
  date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });

const BoxEcografiaPage: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DatosInformeEco>(INITIAL_FORM);
  const [dictadosActivos, setDictadosActivos] = useState(0);
  const [saving, setSaving] = useState(false);
  const [citasDia, setCitasDia] = useState<Cita[]>([]);
  const [informeId, setInformeId] = useState<string | null>(null);
  const [informeParaPDF, setInformeParaPDF] = useState<InformeParaPDF | null>(null);
  const [citaActiva, setCitaActiva] = useState<Cita | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [plantillaActual, setPlantillaActual] = useState<{ hallazgos: string; impresion: string; recomendaciones: string } | null>(null);
  const [prestacionRaw, setPrestacionRaw] = useState<string>('');
  const [prefilledKeys, setPrefilledKeys] = useState<Set<keyof DatosInformeEco>>(new Set());
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [plantillasKeys, setPlantillasKeys] = useState<Set<string>>(new Set());
  const [plantillaPorPrest, setPlantillaPorPrest] = useState<Map<string, string>>(new Map());
  const [prestacionIdActual, setPrestacionIdActual] = useState<string | undefined>(undefined);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!form.fecha) setForm(f => ({ ...f, fecha: today }));
  }, [today]);

  useEffect(() => {
    getDocs(collection(db, 'plantillas_eco')).then(snap => {
      setPlantillasKeys(new Set(snap.docs.map(d => d.id)));
      const m = new Map<string, string>();
      snap.docs.forEach(d => { const pid = (d.data() as any).prestacionId; if (pid) m.set(pid, d.id); });
      setPlantillaPorPrest(m);
    }).catch(() => {});
  }, []);

  const ESTADOS_EXCLUIDOS = ['Anulado', 'No asistió', 'Agendado'];

  useEffect(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diffLunes, 0, 0, 0);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6, 23, 59, 59, 999);

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(lunes)),
      where('fecha', '<=', Timestamp.fromDate(domingo))
    );

    const unsub = onSnapshot(q, snap => {
      const allCitas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita));
      const ecoCitas = allCitas.filter(c => {
        if (ESTADOS_EXCLUIDOS.includes(c.estado)) return false;
        const esEcoPorTipo = c.tipoAtencion?.toLowerCase().includes('eco');
        const esEcoPorPrestacion = c.prestaciones?.some(
          p => p.especialidad?.toLowerCase().includes('eco') || p.prestacion?.toLowerCase().includes('eco')
        );
        return esEcoPorTipo || esEcoPorPrestacion;
      });
      ecoCitas.sort((a, b) => a.fecha.toMillis() - b.fecha.toMillis());
      setCitasDia(ecoCitas);
    });

    return () => unsub();
  }, [refreshKey]);

  const handleChange = (k: keyof DatosInformeEco, v: string) => {
    setForm(f => ({ ...f, [k]: v }));

    if ((k === 'nombre' || k === 'rut') && v.length >= 3) {
      const field = k === 'nombre' ? 'nombre' : 'rut';
      Promise.all([
        getDocs(query(collection(db, 'pacientes'), where(field, '>=', v), where(field, '<=', v + ''))),
        getDocs(query(collection(db, 'users'), where(field === 'nombre' ? 'name' : 'rut', '>=', v), where(field === 'nombre' ? 'name' : 'rut', '<=', v + '')))
      ]).then(([snapPac, snapUsers]) => {
        const docPac = snapPac.docs[0];
        if (docPac) {
          const p = docPac.data();
          setForm(f => ({
            ...f,
            nombre: p.nombre || p.name || f.nombre,
            rut: p.rut || f.rut,
            edad: p.edad ? String(p.edad) : f.edad,
            sexo: p.sexo || f.sexo,
          }));
        } else if (snapUsers.docs[0]) {
          const u = snapUsers.docs[0].data();
          setForm(f => ({
            ...f,
            nombre: u.name || f.nombre,
            rut: u.rut || f.rut,
            edad: u.edad ? String(u.edad) : f.edad,
            sexo: u.sexo || f.sexo,
          }));
        }
      }).catch(() => {});
    }
  };

  const canSave =
    !!form.nombre && !!form.tipo && form.hallazgos.trim().length > 0 && form.diagnostico.trim().length > 0;

  useEffect(() => {
    const examen = prestacionRaw || form.tipo;
    if (!examen) { setPlantillaActual(null); return; }
    const key = buscarPlantillaKey(examen, prestacionIdActual, plantillasKeys, plantillaPorPrest);
    if (!key) { setPlantillaActual(null); return; }
    getDoc(doc(db, 'plantillas_eco', key))
      .then(s => {
        if (s.exists()) {
          const d = s.data() as any;
          setPlantillaActual({
            hallazgos: d.hallazgos || '',
            impresion: d.impresion || '',
            recomendaciones: d.recomendaciones || '',
          });
        } else {
          setPlantillaActual(null);
        }
      })
      .catch(() => setPlantillaActual(null));
  }, [form.tipo, prestacionRaw, prestacionIdActual, plantillasKeys, plantillaPorPrest]);

  const aplicarPlantillaHallazgos = plantillaActual?.hallazgos
    ? () => handleChange('hallazgos', plantillaActual!.hallazgos)
    : undefined;
  const aplicarPlantillaImpresion = plantillaActual?.impresion
    ? () => handleChange('diagnostico', plantillaActual!.impresion)
    : undefined;
  const aplicarPlantillaRecomendaciones = plantillaActual?.recomendaciones
    ? () => handleChange('recomendaciones', plantillaActual!.recomendaciones)
    : undefined;
  const aplicarPlantillaCompleta = plantillaActual
    ? () => {
        if (plantillaActual.hallazgos) handleChange('hallazgos', plantillaActual.hallazgos);
        if (plantillaActual.impresion) handleChange('diagnostico', plantillaActual.impresion);
        if (plantillaActual.recomendaciones) handleChange('recomendaciones', plantillaActual.recomendaciones);
      }
    : undefined;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    const pdfData: InformeParaPDF = {
      pacienteNombre: form.nombre,
      pacienteRut: form.rut,
      edad: form.edad,
      sexo: form.sexo,
      tipoExamen: form.tipo,
      regionAnatomica: form.region,
      indicacionClinica: form.indicacion,
      hallazgos: form.hallazgos,
      impresionEcografica: form.diagnostico,
      recomendaciones: form.recomendaciones,
      codigoExamen: form.codigo,
      fecha: new Date().toISOString(),
    };

    let savedId: string | null = null;
    try {
      const citaIdForReport = citaActiva?.id || `box-${Date.now()}`;
      savedId = await guardarInformeEco(
        citaIdForReport,
        { pacienteRut: form.rut, pacienteNombre: form.nombre },
        form,
        user?.uid ?? '',
      );
    } catch {
      // Firestore falló — continuamos en modo local, el PDF se genera igual
    }

    setInformeId(savedId);
    setInformeParaPDF(pdfData);
    setSaving(false);
  };

  const handleNuevoInformeParaCita = async (cita: Cita) => {
    const tipoBase = cita.tipoAtencion
      || cita.prestaciones?.find(p => p.especialidad?.toLowerCase().includes('eco'))?.prestacion
      || '';
    const { codigo: codigoParsed, tipo: tipoParsed } = parsearTipoAtencion(tipoBase);
    const fechaCita = cita.fecha.toDate().toISOString().split('T')[0];

    let edadStr = cita.pacienteEdad ? String(cita.pacienteEdad) : '';
    if (!edadStr && cita.pacienteFechaNacimiento) {
      edadStr = calcularEdad(cita.pacienteFechaNacimiento);
    }
    if (!edadStr && cita.pacienteRut) {
      try {
        const pacSnap = await getDoc(doc(db, 'pacientes', cita.pacienteRut));
        if (pacSnap.exists()) {
          const pd = pacSnap.data();
          edadStr = pd.edad ? String(pd.edad) : calcularEdad(pd.fechaNacimiento || '');
        }
      } catch { /* ignorar */ }
    }

    const sexoCita = cita.pacienteSexo || '';
    setPrestacionRaw(tipoBase);
    setPrestacionIdActual((cita.prestaciones || []).map(p => (p as any).prestacionId).find(Boolean) || undefined);

    setCitaActiva(cita);
    setInformeId(cita.informeId || null);
    setInformeParaPDF(null);
    setDictadosActivos(0);
    setShowPdfPreview(false);

    if (cita.informeId) {
      const existente = await getInformeExistente(cita.id);
      if (existente) {
        setForm({
          nombre: existente.pacienteNombre || cita.pacienteNombre,
          rut: existente.pacienteRut || cita.pacienteRut,
          edad: existente.edad || edadStr,
          sexo: existente.sexo || sexoCita,
          fecha: existente.fecha
            ? (existente.fecha.toDate ? existente.fecha.toDate().toISOString().split('T')[0] : existente.fecha.split('T')[0])
            : fechaCita,
          solicitante: existente.medicoSolicitante || '',
          codigo: existente.codigoExamen || codigoParsed,
          tipo: existente.tipoExamen || tipoParsed,
          region: existente.regionAnatomica || '',
          indicacion: existente.indicacionClinica || cita.notas || '',
          informante: existente.medicoInformante || '',
          hallazgos: existente.hallazgos || '',
          diagnostico: existente.impresionEcografica || '',
          recomendaciones: existente.recomendaciones || '',
        });
        // Para informes existentes solo marcamos los campos del paciente
        const keys = new Set<keyof DatosInformeEco>(['fecha', 'tipo', 'codigo']);
        if (cita.pacienteNombre) keys.add('nombre');
        if (cita.pacienteRut) keys.add('rut');
        if (edadStr) keys.add('edad');
        if (sexoCita) keys.add('sexo');
        setPrefilledKeys(keys);
      } else {
        // Sin informe encontrado — form vacío con datos de cita
        setForm({
          ...INITIAL_FORM,
          nombre: cita.pacienteNombre,
          rut: cita.pacienteRut,
          edad: edadStr,
          sexo: sexoCita,
          fecha: fechaCita,
          codigo: codigoParsed,
          tipo: tipoParsed,
          indicacion: cita.notas || '',
          informante: cita.profesionalNombre || '',
        });
        const keys = buildPrefilledKeys(cita, edadStr, sexoCita, tipoParsed, codigoParsed);
        setPrefilledKeys(keys);
      }
    } else {
      // Nuevo informe — cargar todo lo disponible desde la cita
      setForm({
        ...INITIAL_FORM,
        nombre: cita.pacienteNombre,
        rut: cita.pacienteRut,
        edad: edadStr,
        sexo: sexoCita,
        fecha: fechaCita,
        codigo: codigoParsed,
        tipo: tipoParsed,
        indicacion: cita.notas || '',
        informante: cita.profesionalNombre || '',
      });
      const keys = buildPrefilledKeys(cita, edadStr, sexoCita, tipoParsed, codigoParsed);
      setPrefilledKeys(keys);
    }

    setShowForm(true);
  };

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Box Ecografía</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generación de informes de imagenología</p>
        </div>
        {showForm ? (
          <button
            onClick={() => {
              setForm(INITIAL_FORM);
              setInformeId(null);
              setInformeParaPDF(null);
              setCitaActiva(null);
              setShowForm(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-xl transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la lista
          </button>
        ) : (
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-[#0E7490] text-slate-500 hover:text-[#0E7490] text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.69" />
            </svg>
            Actualizar
          </button>
        )}
      </div>

      {showForm ? (
        <div className="space-y-4">
          {/* Tarjeta paciente / cita activa */}
          {citaActiva && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-[#0E7490]/10 flex items-center justify-center text-[#0E7490] font-bold text-xs flex-shrink-0 select-none">
                  {iniciales(form.nombre || citaActiva.pacienteNombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{form.nombre || citaActiva.pacienteNombre}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {form.rut && <span>{form.rut}</span>}
                    {form.edad && <><span>·</span><span>{form.edad} años</span></>}
                    {form.sexo && <><span>·</span><span>{form.sexo}</span></>}
                    {citaActiva.prevision && <><span>·</span><span className="font-medium text-slate-500">{citaActiva.prevision}</span></>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                    {form.tipo || prestacionRaw}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {formatFechaCorta(citaActiva.fecha.toDate())} · {citaActiva.fecha.toDate().toTimeString().slice(0, 5)}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border flex-shrink-0 ${ESTADO_COLORS[citaActiva.estado] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {ESTADO_LABELS[citaActiva.estado] || citaActiva.estado}
                </span>
              </div>
            </div>
          )}

          {/* Banner plantilla disponible */}
          {plantillaActual && aplicarPlantillaCompleta && (
            <div className="flex items-center justify-between gap-3 bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-cyan-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span className="text-sm text-cyan-700 truncate">
                  Plantilla disponible para <strong>{form.tipo || prestacionRaw}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={aplicarPlantillaCompleta}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Aplicar plantilla completa
              </button>
            </div>
          )}

          {/* Formulario principal */}
          <InformeEcoForm
            form={form}
            onChange={handleChange}
            dictadosActivos={dictadosActivos}
            setDictadosActivos={setDictadosActivos}
            prefilledKeys={prefilledKeys}
            onPlantillaHallazgos={aplicarPlantillaHallazgos}
            onPlantillaImpresion={aplicarPlantillaImpresion}
            onPlantillaRecomendaciones={aplicarPlantillaRecomendaciones}
          />

          {/* Toggle vista previa PDF */}
          {!informeParaPDF && (
            <div>
              <button
                onClick={() => setShowPdfPreview(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-[#0E7490] hover:text-[#0C4A6E] mb-3 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                {showPdfPreview ? 'Ocultar vista previa' : 'Ver vista previa del PDF'}
                <svg className={`w-3.5 h-3.5 transition-transform ${showPdfPreview ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showPdfPreview && (
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '117%' }}>
                  <PdfPreviewInforme form={form} fecha={today} />
                </div>
              )}
            </div>
          )}

          {/* Acciones PDF post-guardado */}
          {informeParaPDF && (
            <AccionesInforme
              informe={informeParaPDF}
              informeId={informeId}
              onActualizado={(inf) => setInformeParaPDF(inf)}
            />
          )}

          {/* Barra de acciones */}
          <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-slate-100">
            <div className="flex-1" />
            {!informeParaPDF && (
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`flex items-center gap-2 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm ${
                  canSave && !saving
                    ? 'bg-[#0E7490] hover:bg-[#0c6680] shadow-[#0E7490]/20'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
                  </svg>
                )}
                {saving ? 'Guardando...' : 'Guardar Informe'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <CitasList
          citasDia={citasDia}
          onSeleccionar={handleNuevoInformeParaCita}
          plantillasKeys={plantillasKeys}
          plantillaPorPrest={plantillaPorPrest}
        />
      )}
    </div>
  );
};

/* ─── Helpers ──────────────────────────────────────────────── */

function buildPrefilledKeys(
  cita: Cita,
  edadStr: string,
  sexoCita: string,
  tipoParsed: string,
  codigoParsed: string,
): Set<keyof DatosInformeEco> {
  const keys = new Set<keyof DatosInformeEco>(['fecha'] as (keyof DatosInformeEco)[]);
  if (cita.pacienteNombre) keys.add('nombre');
  if (cita.pacienteRut) keys.add('rut');
  if (edadStr) keys.add('edad');
  if (sexoCita) keys.add('sexo');
  if (tipoParsed) keys.add('tipo');
  if (codigoParsed) keys.add('codigo');
  if (cita.profesionalNombre) keys.add('informante');
  if (cita.notas) keys.add('indicacion');
  return keys;
}

/* ─── Lista de citas agrupada por día ─────────────────────── */

interface CitasListProps {
  citasDia: Cita[];
  onSeleccionar: (cita: Cita) => void;
  plantillasKeys: Set<string>;
  plantillaPorPrest: Map<string, string>;
}

const CitasList: React.FC<CitasListProps> = ({ citasDia, onSeleccionar, plantillasKeys, plantillaPorPrest }) => {
  // Agrupar por día (YYYY-MM-DD)
  const porDia = citasDia.reduce<Record<string, Cita[]>>((acc, c) => {
    const key = c.fecha.toDate().toISOString().split('T')[0];
    (acc[key] = acc[key] || []).push(c);
    return acc;
  }, {});

  const todayKey = new Date().toISOString().split('T')[0];
  const diasOrdenados = Object.keys(porDia).sort();

  if (citasDia.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Ecografías de la Semana</div>
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
          <svg className="w-10 h-10 mx-auto text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-sm text-slate-400">No hay ecografías esta semana.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Ecografías de la Semana</div>
      {diasOrdenados.map(dia => {
        const citas = porDia[dia];
        const esHoy = dia === todayKey;
        const fechaDate = citas[0].fecha.toDate();
        const labelDia = formatFechaDia(fechaDate);
        const completadas = citas.filter(c => c.informeId).length;

        return (
          <div key={dia}>
            {/* Encabezado del día */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`text-xs font-bold uppercase tracking-wider capitalize ${esHoy ? 'text-[#0E7490]' : 'text-slate-400'}`}>
                {esHoy ? `Hoy — ${labelDia}` : labelDia}
              </div>
              {esHoy && <span className="w-1.5 h-1.5 rounded-full bg-[#0E7490] inline-block" />}
              <div className="flex-1 h-px bg-slate-100" />
              {completadas > 0 && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  {completadas}/{citas.length} con informe
                </span>
              )}
            </div>

            {/* Tarjetas de citas */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-100">
              {citas.map(cita => {
                const hora = cita.fecha.toDate().toTimeString().slice(0, 5);
                const tipoBase = cita.tipoAtencion
                  || cita.prestaciones?.find(p => p.especialidad?.toLowerCase().includes('eco'))?.prestacion
                  || '';
                const prestacionNombre = tipoBase || 'Ecografía';
                const prevision = cita.prevision
                  || cita.prestaciones?.find(p => p.prevision)?.prevision
                  || '';
                const puedeRedactar = ['En atención', 'Rezagado', 'Finalizado', 'Confirmado', 'En espera'].includes(cita.estado);
                const tieneInforme = !!cita.informeId;

                const pidCita = (cita.prestaciones || []).map(p => (p as any).prestacionId).find(Boolean) as string | undefined;
                const tienePlantilla = !!buscarPlantillaKey(tipoBase, pidCita, plantillasKeys, plantillaPorPrest);

                return (
                  <div key={cita.id} className={`flex items-center gap-4 px-4 py-3.5 group ${tieneInforme ? 'bg-emerald-50/30' : ''}`}>
                    {/* Hora + icono estado */}
                    <div className="flex flex-col items-center flex-shrink-0 w-12">
                      <span className={`text-sm font-bold tabular-nums ${tieneInforme ? 'text-emerald-600' : 'text-slate-700'}`}>{hora}</span>
                      {tieneInforme && (
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none ${tieneInforme ? 'bg-emerald-100 text-emerald-700' : 'bg-[#0E7490]/10 text-[#0E7490]'}`}>
                      {iniciales(cita.pacienteNombre)}
                    </div>

                    {/* Info paciente */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{cita.pacienteNombre}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tienePlantilla ? 'bg-cyan-400' : 'bg-slate-300'}`}
                          title={tienePlantilla ? 'Plantilla configurada' : 'Sin plantilla'}
                        />
                        <span className="truncate">{prestacionNombre}</span>
                        {prevision && <><span>·</span><span className="font-medium text-slate-500">{prevision}</span></>}
                        {cita.profesionalNombre && <><span>·</span><span>{cita.profesionalNombre}</span></>}
                      </div>
                    </div>

                    {/* Estado + acción */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border hidden sm:inline-flex ${ESTADO_COLORS[cita.estado] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {ESTADO_LABELS[cita.estado] || cita.estado}
                      </span>
                      {puedeRedactar && (
                        <button
                          onClick={() => onSeleccionar(cita)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            tieneInforme
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : tienePlantilla
                                ? 'bg-[#0E7490] text-white border-transparent hover:bg-[#0c6680]'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {tieneInforme ? 'Ver / Editar' : tienePlantilla ? 'Completar' : 'Falta plantilla'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BoxEcografiaPage;
