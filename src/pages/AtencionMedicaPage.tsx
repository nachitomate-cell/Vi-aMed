import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useDialog } from '../components/ui/DialogProvider';
import { useAuth } from '../auth/AuthContext';
import { actualizarEstadoCita, crearCita } from '../services/agendaService';
import { ESTADO_COLORS, ESTADO_LABELS } from '../types/agenda';
import type { EstadoCita } from '../types/agenda';
import {
  getFichaClinica,
  getEvoluciones,
  getEvolucionPorCita,
  getUltimoDocumento,
  guardarFicha,
  guardarDocumentoMedico,
  type Evolucion,
  type SignosVitales,
} from '../services/fichaClinicaService';
import { buscarCIE10 } from '../data/cie10';
import { crearOrdenesLaboratorio, EXAMENES_FRECUENTES } from '../services/setmService';
import { getHistorialPaciente, type EventoHistorial } from '../services/historialPacienteService';
import { normalizarRut } from '../utils/rut';

const SIGNOS_VACIOS: SignosVitales = { pa: '', fc: '', fr: '', temp: '', sat: '', peso: '', talla: '' };

// Plantillas rápidas de anamnesis por motivo frecuente.
const PLANTILLAS_ANAMNESIS: Array<{ label: string; texto: string }> = [
  { label: 'Control sano', texto: 'Paciente acude a control de salud. Asintomático. Sin molestias actuales.\nExamen físico dentro de límites normales.' },
  { label: 'Resfrío / IRA', texto: 'Cuadro de ___ días de evolución: congestión nasal, odinofagia y tos. Afebril.\nFaringe levemente eritematosa, pulmones limpios.' },
  { label: 'Dolor lumbar', texto: 'Dolor lumbar de ___ días, mecánico, sin irradiación ni déficit neurológico.\nMovilidad conservada, sin signos de alarma.' },
  { label: 'Control crónico', texto: 'Control de patología crónica. Adherente a tratamiento. Sin descompensaciones.\nRevisión de exámenes y ajuste de indicaciones.' },
  { label: 'Gastrointestinal', texto: 'Cuadro de dolor abdominal / diarrea de ___ días. Sin fiebre ni signos de deshidratación.\nAbdomen blando, depresible, sin signos peritoneales.' },
];

const calcularIMC = (peso?: string, talla?: string): string => {
  const p = parseFloat((peso || '').replace(',', '.'));
  const tCm = parseFloat((talla || '').replace(',', '.'));
  if (!p || !tCm) return '';
  const tM = tCm > 3 ? tCm / 100 : tCm; // acepta cm o m
  const imc = p / (tM * tM);
  return Number.isFinite(imc) && imc > 0 ? imc.toFixed(1) : '';
};

const clasificacionIMC = (imc: string): string => {
  const v = parseFloat(imc);
  if (!v) return '';
  if (v < 18.5) return 'Bajo peso';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Sobrepeso';
  return 'Obesidad';
};

const resumenSignos = (s?: SignosVitales): string => {
  if (!s) return '';
  const partes: string[] = [];
  if (s.pa) partes.push(`PA ${s.pa}`);
  if (s.fc) partes.push(`FC ${s.fc}`);
  if (s.temp) partes.push(`T° ${s.temp}`);
  if (s.sat) partes.push(`SatO₂ ${s.sat}%`);
  if (s.peso) partes.push(`${s.peso} kg`);
  return partes.join(' · ');
};

const CAMPOS_SIGNOS: Array<{ k: keyof SignosVitales; label: string; ph: string }> = [
  { k: 'pa', label: 'PA', ph: '120/80' },
  { k: 'fc', label: 'FC', ph: 'lpm' },
  { k: 'fr', label: 'FR', ph: 'rpm' },
  { k: 'temp', label: 'T°', ph: '°C' },
  { k: 'sat', label: 'SatO₂', ph: '%' },
  { k: 'peso', label: 'Peso', ph: 'kg' },
  { k: 'talla', label: 'Talla', ph: 'cm' },
];

interface Cita {
  id: string;
  pacienteNombre: string;
  pacienteRut: string;
  pacienteFechaNacimiento?: string;
  pacienteEdad?: string | number;
  prevision: string;
  fecha: Timestamp;
  estado: EstadoCita;
  tipoAtencion?: string;
  prestaciones?: Array<{ prestacion: string; especialidad: string; prevision?: string }>;
}

// Estados que NO se muestran en el box (cita inactiva ese día).
const ESTADOS_OCULTOS: EstadoCita[] = ['Anulado', 'No asistió', 'Reagendado'];
const hoyISO = () => new Date().toISOString().split('T')[0];

const calcularEdad = (fechaNacimiento?: string): string => {
  if (!fechaNacimiento) return '';
  const [year, month, day] = fechaNacimiento.split('-').map(Number);
  if (!year || !month || !day) return '';
  const hoy = new Date();
  let edad = hoy.getFullYear() - year;
  if (hoy < new Date(hoy.getFullYear(), month - 1, day)) edad--;
  return edad > 0 ? String(edad) : '';
};

const motivoConsulta = (c: Cita | null): string => {
  if (!c) return '';
  return (
    c.prestaciones?.find(p => p.especialidad === 'Medicina')?.prestacion ||
    c.prestaciones?.[0]?.prestacion ||
    c.tipoAtencion ||
    ''
  );
};

const fmtFechaHora = (ts?: Timestamp): string => {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const AtencionMedicaPage: React.FC = () => {
  const dialog = useDialog();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(hoyISO());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  // Datos persistentes del paciente
  const [antecedentes, setAntecedentes] = useState('');
  const [alergias, setAlergias] = useState('');
  const [alertas, setAlertas] = useState('');
  // Datos de la consulta (evolución)
  const [anamnesis, setAnamnesis] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [cie10, setCie10] = useState('');
  const [cie10Desc, setCie10Desc] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [signos, setSignos] = useState<SignosVitales>(SIGNOS_VACIOS);
  const [cie10Query, setCie10Query] = useState('');

  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Timestamp | null>(null);
  const [fichaError, setFichaError] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  // Al atender, se minimiza la lista de pacientes para dar más espacio a la ficha.
  const [listaColapsada, setListaColapsada] = useState(false);

  // Documentos médicos (licencia / receta / certificado)
  const [mostrarLicencia, setMostrarLicencia] = useState(false);
  const [mostrarReceta, setMostrarReceta] = useState(false);
  const [mostrarCertificado, setMostrarCertificado] = useState(false);
  const [licencia, setLicencia] = useState('');
  const [receta, setReceta] = useState('');
  const [certificado, setCertificado] = useState('');
  // Documentos en previsualización (antes de imprimir).
  const [previewDocs, setPreviewDocs] = useState<Array<{ titulo: string; contenido: string }> | null>(null);

  // Órdenes de laboratorio (integración con Toma de Muestras)
  const [mostrarExamenes, setMostrarExamenes] = useState(false);
  const [examenesSel, setExamenesSel] = useState<Set<string>>(new Set());
  const [examenLibre, setExamenLibre] = useState('');
  const [examenObs, setExamenObs] = useState('');
  const [enviandoExamenes, setEnviandoExamenes] = useState(false);

  // Timeline unificado del paciente (carga perezosa)
  const [historial, setHistorial] = useState<EventoHistorial[] | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mostrarTimeline, setMostrarTimeline] = useState(false);

  // Walk-in (atender paciente sin cita)
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [walkinQuery, setWalkinQuery] = useState('');
  const [walkinPacientes, setWalkinPacientes] = useState<any[]>([]);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [creandoCita, setCreandoCita] = useState(false);

  // Snapshot para detectar cambios sin guardar (todos los campos de la ficha).
  const snapshotActual = JSON.stringify({ antecedentes, alergias, alertas, anamnesis, diagnostico, cie10, cie10Desc, indicaciones, signos });
  const [baseSnapshot, setBaseSnapshot] = useState('');
  const dirty = !!selectedCita && snapshotActual !== baseSnapshot;
  const imc = calcularIMC(signos.peso, signos.talla);

  // Últimos signos vitales registrados en una consulta previa (referencia/tendencia).
  const signosPrevios = evoluciones.find(e => e.citaId !== selectedCita?.id && resumenSignos(e.signos))?.signos;

  /* ─── Suscripción a las citas del día (tiempo real) ─────────────────────── */
  useEffect(() => {
    setLoading(true);
    setListError(false);
    const [y, m, d] = selectedDate.split('-').map(Number);
    const inicio = new Date(y, m - 1, d, 0, 0, 0, 0);
    const fin = new Date(y, m - 1, d, 23, 59, 59, 999);

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(inicio)),
      where('fecha', '<=', Timestamp.fromDate(fin)),
      orderBy('fecha', 'asc'),
    );

    const unsub = onSnapshot(
      q,
      snap => {
        const medicina = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Cita))
          .filter(c => c.prestaciones?.some(p => p.especialidad === 'Medicina'))
          .filter(c => !ESTADOS_OCULTOS.includes(c.estado));
        setCitas(medicina);
        // Mantener fresco el estado de la cita seleccionada (badge / botón Finalizar).
        setSelectedCita(prev => (prev ? medicina.find(c => c.id === prev.id) ?? prev : prev));
        setLoading(false);
      },
      err => {
        console.error('Error escuchando citas de medicina:', err);
        setListError(true);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [selectedDate]);

  /* ─── Documentos médicos: plantillas ────────────────────────────────────── */
  const plantillaLicencia = (c: Cita) =>
    `Certifico que el/la paciente ${c.pacienteNombre}, RUT ${c.pacienteRut}, ` +
    `requiere reposo médico por ______ día(s) a contar del ${new Date().toLocaleDateString('es-CL')}.\n\n` +
    `Diagnóstico: \n\nIndicaciones: `;
  const plantillaReceta = () => `Rp.\n\n1) ____________________  —  ___ cada ___ hrs por ___ días\n2) \n3) \n\nIndicaciones generales: `;
  const plantillaCertificado = (c: Cita) =>
    `Certifico que el/la paciente ${c.pacienteNombre}, RUT ${c.pacienteRut}, ` +
    `fue evaluado(a) en este centro con fecha ${new Date().toLocaleDateString('es-CL')}.\n\n` +
    `Se extiende el presente certificado a petición del interesado para los fines que estime convenientes.\n\nObservaciones: `;

  const abrirLicencia = () => {
    if (selectedCita && !licencia) setLicencia(plantillaLicencia(selectedCita));
    setMostrarLicencia(v => !v);
  };
  const abrirReceta = () => {
    if (!receta) setReceta(plantillaReceta());
    setMostrarReceta(v => !v);
  };
  const abrirCertificado = () => {
    if (selectedCita && !certificado) setCertificado(plantillaCertificado(selectedCita));
    setMostrarCertificado(v => !v);
  };
  // Reutiliza la última receta emitida a este paciente.
  const reutilizarReceta = async () => {
    if (!selectedCita) return;
    const ultimo = await getUltimoDocumento(selectedCita.pacienteRut, 'Receta Médica');
    if (!ultimo?.contenido) { await dialog.alert('No hay una receta previa registrada para este paciente.'); return; }
    setReceta(ultimo.contenido);
    setMostrarReceta(true);
  };

  const toggleExamen = (ex: string) =>
    setExamenesSel(prev => { const n = new Set(prev); n.has(ex) ? n.delete(ex) : n.add(ex); return n; });

  // Carga (perezosa) el timeline unificado del paciente.
  const toggleTimeline = async () => {
    const abrir = !mostrarTimeline;
    setMostrarTimeline(abrir);
    if (abrir && historial === null && selectedCita) {
      setCargandoHistorial(true);
      const ev = await getHistorialPaciente(selectedCita.pacienteRut).catch(() => []);
      setHistorial(ev);
      setCargandoHistorial(false);
    }
  };

  // Envía las órdenes seleccionadas a la Sala de Toma de Muestras.
  const enviarExamenes = async () => {
    if (!selectedCita) return;
    const lista = [...examenesSel, ...examenLibre.split(',').map(s => s.trim()).filter(Boolean)];
    if (lista.length === 0) { await dialog.alert('Selecciona o escribe al menos un examen.'); return; }
    setEnviandoExamenes(true);
    try {
      const n = await crearOrdenesLaboratorio(
        {
          pacienteNombre: selectedCita.pacienteNombre,
          pacienteRut: selectedCita.pacienteRut,
          pacienteEdad: edadSel,
          solicitante: user?.name,
          observaciones: examenObs,
        },
        lista,
      );
      setExamenesSel(new Set()); setExamenLibre(''); setExamenObs(''); setMostrarExamenes(false);
      await dialog.alert(`${n} orden(es) enviada(s) a Toma de Muestras.`, { title: 'Exámenes solicitados' });
    } catch (e) {
      console.error(e);
      await dialog.alert('No se pudieron enviar las órdenes de examen.');
    }
    setEnviandoExamenes(false);
  };

  const escHtml = (s: string) =>
    s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

  // Logo real del centro (mismo que usan los informes de ecografía), en absoluto
  // para que cargue tanto en la ventana de impresión como en el iframe de preview.
  const LOGO_URL = `${window.location.origin}/logo2.png`;

  // Construye el HTML completo del/los documento(s) con el membrete y logo real.
  // `autoImprimir` añade el disparo de impresión cuando el logo ya cargó.
  const construirHtmlDocumentos = (
    conContenido: Array<{ titulo: string; contenido: string }>,
    autoImprimir = false,
  ): string => {
    const c = selectedCita;
    const fechaHoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const secciones = conContenido.map(d => `
      <section class="doc">
        <div class="lh">
          <img class="logo" src="${LOGO_URL}" alt="ViñaMed" />
          <div class="tipo">${escHtml(d.titulo)}</div>
        </div>
        <div class="pac">
          <div><b>Paciente:</b> ${escHtml(c?.pacienteNombre ?? '')}</div>
          <div><b>RUT:</b> ${escHtml(c?.pacienteRut ?? '')} &nbsp;&nbsp; <b>Previsión:</b> ${escHtml(c?.prevision ?? '—')} &nbsp;&nbsp; <b>F. Nac.:</b> ${escHtml(c?.pacienteFechaNacimiento ?? '—')}</div>
        </div>
        <div class="cuerpo">${escHtml(d.contenido).replace(/\n/g, '<br>')}</div>
        <div class="pie">
          <div class="firma">______________________________<br>Médico tratante — Firma y timbre</div>
          <div class="lugar">Viña del Mar, ${fechaHoy}</div>
        </div>
      </section>`).join('');

    const autoScript = autoImprimir
      ? `<script>
          function go(){ setTimeout(function(){ window.focus(); window.print(); }, 200); }
          var img = document.querySelector('img.logo');
          if (img && !img.complete) { img.addEventListener('load', go); img.addEventListener('error', go); }
          else { window.onload = go; }
        <\/script>`
      : '';

    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Documentos médicos</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: "Segoe UI", Arial, sans-serif; color: #111; margin: 0; }
        .doc { padding: 40px 48px; page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
        .doc:last-child { page-break-after: auto; }
        .lh { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0E7490; padding-bottom: 12px; }
        .logo { height: 46px; width: auto; object-fit: contain; }
        .tipo { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #334155; }
        .pac { margin: 20px 0; font-size: 14px; line-height: 1.7; }
        .cuerpo { flex: 1; font-size: 15px; line-height: 1.9; white-space: normal; }
        .pie { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 13px; color: #334155; }
        .firma { text-align: center; }
        @media print { .doc { padding: 24px 32px; } }
      </style></head><body>${secciones}${autoScript}</body></html>`;
  };

  // Persiste copia de las licencias/recetas con contenido (no la ficha).
  const persistirDocumentos = (conContenido: Array<{ titulo: string; contenido: string }>) => {
    const c = selectedCita;
    if (!c) return;
    for (const d of conContenido) {
      if (d.titulo === 'Licencia Médica' || d.titulo === 'Receta Médica') {
        guardarDocumentoMedico(c.pacienteRut, c.id, d.titulo, d.contenido, {
          uid: user?.uid, nombre: user?.name,
        }).catch(e => console.error('No se pudo guardar el documento emitido:', e));
      }
    }
  };

  // Imprime uno o varios documentos en una ventana limpia.
  const imprimirDocumentos = async (docs: Array<{ titulo: string; contenido: string }>) => {
    const conContenido = docs.filter(d => d.contenido.trim());
    if (!conContenido.length) {
      await dialog.alert('No hay contenido para imprimir.');
      return;
    }
    persistirDocumentos(conContenido);

    const win = window.open('', '_blank', 'width=820,height=1060');
    if (!win) {
      await dialog.alert('Permite las ventanas emergentes para poder imprimir.');
      return;
    }
    win.document.write(construirHtmlDocumentos(conContenido, true));
    win.document.close();
    win.focus();
  };

  // Abre la previsualización (sin imprimir ni guardar todavía).
  const previsualizarDocumento = async (docs: Array<{ titulo: string; contenido: string }>) => {
    const conContenido = docs.filter(d => d.contenido.trim());
    if (!conContenido.length) {
      await dialog.alert('No hay contenido para previsualizar.');
      return;
    }
    setPreviewDocs(conContenido);
  };

  /* ─── Selección de paciente ─────────────────────────────────────────────── */
  const openPaciente = async (cita: Cita) => {
    if (cita.id === selectedCita?.id) return;

    if (dirty) {
      const ok = await dialog.confirm(
        'Tienes cambios sin guardar en la ficha actual. ¿Descartarlos y abrir otro paciente?',
        { danger: true, confirmText: 'Descartar' },
      );
      if (!ok) return;
    }

    setSelectedCita(cita);
    setListaColapsada(true); // minimiza la lista para enfocarse en la atención
    // Reset de todos los campos
    setAntecedentes(''); setAlergias(''); setAlertas('');
    setAnamnesis(''); setDiagnostico(''); setCie10(''); setCie10Desc(''); setIndicaciones('');
    setSignos(SIGNOS_VACIOS); setCie10Query('');
    setLicencia(''); setReceta(''); setCertificado('');
    setMostrarLicencia(false); setMostrarReceta(false); setMostrarCertificado(false);
    setMostrarExamenes(false); setExamenesSel(new Set()); setExamenLibre(''); setExamenObs('');
    setHistorial(null); setMostrarTimeline(false);
    setEvoluciones([]);
    setUltimaActualizacion(null);
    setMostrarHistorial(false);
    setFichaError(false);
    setBaseSnapshot(''); // hasta cargar, cualquier estado cuenta como base vacía

    // Cargar ficha persistente + historial + evolución de esta cita.
    try {
      const [ficha, evos, evoCita] = await Promise.all([
        getFichaClinica(cita.pacienteRut),
        getEvoluciones(cita.pacienteRut),
        getEvolucionPorCita(cita.pacienteRut, cita.id),
      ]);
      const ante = ficha?.antecedentes || '';
      const ale = ficha?.alergias || '';
      const alr = ficha?.alertas || '';
      const anam = evoCita?.anamnesis || '';
      const diag = evoCita?.diagnostico || '';
      const cie = evoCita?.cie10 || '';
      const cieD = evoCita?.cie10Desc || '';
      const ind = evoCita?.indicaciones || '';
      const sig = { ...SIGNOS_VACIOS, ...(evoCita?.signos || {}) };
      setAntecedentes(ante); setAlergias(ale); setAlertas(alr);
      setAnamnesis(anam); setDiagnostico(diag); setCie10(cie); setCie10Desc(cieD); setIndicaciones(ind);
      setSignos(sig);
      setUltimaActualizacion(ficha?.ultimaActualizacion ?? null);
      setEvoluciones(evos);
      // Línea base = lo cargado, para detectar cambios reales.
      setBaseSnapshot(JSON.stringify({
        antecedentes: ante, alergias: ale, alertas: alr,
        anamnesis: anam, diagnostico: diag, cie10: cie, cie10Desc: cieD, indicaciones: ind, signos: sig,
      }));
    } catch (e) {
      console.error('Error cargando ficha:', e);
      setFichaError(true);
    }

    // Marcar atención iniciada (si la cita aún no estaba en atención/finalizada).
    if (cita.estado !== 'En atención' && cita.estado !== 'Finalizado') {
      actualizarEstadoCita(cita.id, 'En atención').catch(e =>
        console.error('No se pudo marcar la cita en atención:', e),
      );
    }
  };

  const saveFicha = async (silent = false) => {
    if (!selectedCita) return;
    if (!silent) setSaving(true);
    try {
      await guardarFicha({
        rut: selectedCita.pacienteRut,
        nombre: selectedCita.pacienteNombre,
        citaId: selectedCita.id,
        antecedentes, alergias, alertas,
        anamnesis, diagnostico, cie10, cie10Desc, indicaciones,
        signos,
        motivo: motivoConsulta(selectedCita),
        fechaCita: selectedCita.fecha,
        profesionalUid: user?.uid,
        profesionalNombre: user?.name,
      });
      setBaseSnapshot(snapshotActual);
      // Refrescar historial y marca de tiempo.
      const evos = await getEvoluciones(selectedCita.pacienteRut).catch(() => evoluciones);
      setEvoluciones(evos);
      setUltimaActualizacion(Timestamp.now());
      if (!silent) await dialog.alert('Ficha clínica guardada correctamente.');
    } catch (e) {
      console.error(e);
      if (!silent) await dialog.alert('Error al guardar la ficha.');
    }
    if (!silent) setSaving(false);
  };

  // Autoguardado: guarda en silencio tras 3s de inactividad cuando hay cambios.
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedCita || !dirty || saving) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => { saveFicha(true); }, 3000);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotActual, dirty, selectedCita?.id]);

  const finalizarAtencion = async () => {
    if (!selectedCita) return;
    if (dirty) {
      const ok = await dialog.confirm(
        'Hay cambios sin guardar. ¿Finalizar la atención de todas formas? (se perderán los cambios no guardados)',
        { danger: true, confirmText: 'Finalizar igual' },
      );
      if (!ok) return;
    } else {
      const ok = await dialog.confirm('¿Marcar esta atención como finalizada?', { confirmText: 'Finalizar' });
      if (!ok) return;
    }
    setFinalizando(true);
    try {
      await actualizarEstadoCita(selectedCita.id, 'Finalizado');
    } catch (e) {
      console.error(e);
      await dialog.alert('No se pudo finalizar la atención.');
    }
    setFinalizando(false);
  };

  // ── Walk-in: atender un paciente sin cita previa ──
  const abrirWalkin = async () => {
    setWalkinOpen(true);
    setWalkinQuery('');
    if (walkinPacientes.length === 0) {
      setWalkinLoading(true);
      try {
        const snap = await getDocs(collection(db, 'pacientes'));
        setWalkinPacientes(snap.docs.map(d => ({ rut: d.id, ...(d.data() as any) })));
      } catch (e) { console.error('Error cargando pacientes:', e); }
      setWalkinLoading(false);
    }
  };

  const atenderWalkin = async (p: any) => {
    if (creandoCita) return;
    setCreandoCita(true);
    try {
      const nombre = p.nombre || [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || 'Paciente';
      const rutNorm = normalizarRut(p.rut || '');
      const fecha = Timestamp.now();
      const id = await crearCita({
        pacienteRut: rutNorm,
        pacienteNombre: nombre,
        pacienteTelefono: p.telefono || '',
        pacienteSexo: p.sexo || '',
        pacienteFechaNacimiento: p.fechaNacimiento || '',
        pacienteEdad: p.edad || '',
        profesionalId: user?.uid || '',
        profesionalNombre: user?.name || '',
        profesionalRol: 'medico',
        tipoAtencion: 'Control médico',
        fecha,
        duracionMinutos: 20,
        box: 'Box 1',
        estado: 'En atención',
        notas: 'Atención sin cita (walk-in)',
        creadoPor: user?.uid || '',
        visiblePaciente: false,
        prevision: p.prevision || '',
        prestaciones: [{ prestacion: 'Control médico', especialidad: 'Medicina' }],
      });
      setWalkinOpen(false);
      await openPaciente({
        id,
        pacienteNombre: nombre,
        pacienteRut: rutNorm,
        pacienteFechaNacimiento: p.fechaNacimiento || '',
        pacienteEdad: p.edad || '',
        prevision: p.prevision || '',
        fecha,
        estado: 'En atención',
        tipoAtencion: 'Control médico',
        prestaciones: [{ prestacion: 'Control médico', especialidad: 'Medicina' }],
      });
    } catch (e) {
      console.error(e);
      await dialog.alert('No se pudo crear la atención.');
    }
    setCreandoCita(false);
  };

  // ── Agendar próximo control / derivar a Ecografía (cita "Agendado" sin profesional) ──
  const agendarCita = async (tipo: 'control' | 'eco') => {
    if (!selectedCita) return;
    const base = new Date();
    base.setDate(base.getDate() + 7);
    const defStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    const fechaStr = await dialog.prompt(
      tipo === 'control' ? 'Fecha del próximo control (AAAA-MM-DD):' : 'Fecha de la ecografía (AAAA-MM-DD):',
      { defaultValue: defStr, confirmText: 'Agendar' },
    );
    if (!fechaStr) return;
    const [y, m, d] = fechaStr.split('-').map(Number);
    if (!y || !m || !d) { await dialog.alert('Fecha inválida. Usa el formato AAAA-MM-DD.'); return; }
    try {
      await crearCita({
        pacienteRut: selectedCita.pacienteRut,
        pacienteNombre: selectedCita.pacienteNombre,
        pacienteTelefono: '',
        pacienteFechaNacimiento: selectedCita.pacienteFechaNacimiento || '',
        pacienteEdad: selectedCita.pacienteEdad || '',
        profesionalId: '',
        profesionalNombre: '',
        profesionalRol: 'medico',
        tipoAtencion: tipo === 'control' ? 'Control médico' : 'Ecografía',
        fecha: Timestamp.fromDate(new Date(y, m - 1, d, 9, 0, 0)),
        duracionMinutos: tipo === 'control' ? 20 : 30,
        box: 'Box 1',
        estado: 'Agendado',
        notas: tipo === 'control'
          ? 'Próximo control (agendado desde Box Medicina)'
          : `Derivación a ecografía (desde Box Medicina)${indicaciones ? ` · ${indicaciones.slice(0, 100)}` : ''}`,
        creadoPor: user?.uid || '',
        visiblePaciente: false,
        prevision: selectedCita.prevision || '',
        prestaciones: [tipo === 'control'
          ? { prestacion: 'Control médico', especialidad: 'Medicina' }
          : { prestacion: 'Ecografía', especialidad: 'Ecografia' }],
      });
      await dialog.alert(
        `${tipo === 'control' ? 'Próximo control' : 'Derivación a Ecografía'} agendado para el ${fechaStr}. Recepción/Agenda puede asignar el profesional.`,
        { title: 'Cita creada' },
      );
    } catch (e) {
      console.error(e);
      await dialog.alert('No se pudo crear la cita.');
    }
  };

  const walkinFiltrados = walkinPacientes.filter(p => {
    const t = walkinQuery.toLowerCase().trim();
    if (!t) return true;
    return (p.nombre || '').toLowerCase().includes(t) || (p.rut || '').toLowerCase().includes(t);
  }).slice(0, 30);

  const filteredCitas = citas.filter(c =>
    c.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pacienteRut.includes(searchTerm),
  );

  const edadSel = selectedCita ? (calcularEdad(selectedCita.pacienteFechaNacimiento) || String(selectedCita.pacienteEdad || '')) : '';
  const esHoy = selectedDate === hoyISO();
  const colapsada = !!selectedCita && listaColapsada;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Box Medicina</h1>
          <p className="text-sm text-slate-500">Gestión de pacientes y fichas clínicas de medicina general</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Link
            to="/atencion"
            title="Ir a Atenciones"
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#0E7490] hover:border-[#0E7490]/30 transition-all shadow-sm active:scale-95 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </Link>
          <Link
            to="/nuevopaciente"
            title="Crear Nuevo Paciente"
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#0E7490] hover:border-[#0E7490]/30 transition-all shadow-sm active:scale-95 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </Link>

          <div className="relative flex-1 md:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LISTADO DE PACIENTES */}
        <div className={colapsada ? 'hidden' : 'lg:col-span-4 space-y-4'}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {esHoy ? 'Pacientes del día' : 'Pacientes'}
                  <span className="ml-2 text-[#0E7490]">{filteredCitas.length}</span>
                </h2>
                {!esHoy && (
                  <button
                    onClick={() => setSelectedDate(hoyISO())}
                    className="text-xs font-bold text-[#0E7490] hover:underline"
                  >
                    Hoy
                  </button>
                )}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value || hoyISO())}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[#0E7490]"
              />
              <button
                onClick={abrirWalkin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#0E7490]/40 text-[#0E7490] text-sm font-semibold rounded-lg hover:bg-[#0E7490]/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Atender paciente sin cita
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-10 text-center text-slate-400">Cargando pacientes...</div>
              ) : listError ? (
                <div className="p-10 text-center text-sm text-red-500">
                  No se pudieron cargar las citas. Revisa tu conexión e inténtalo de nuevo.
                </div>
              ) : filteredCitas.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic text-sm">
                  No hay pacientes de medicina para {esHoy ? 'hoy' : 'esta fecha'}.
                </div>
              ) : (
                filteredCitas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => openPaciente(c)}
                    className={`w-full p-4 flex items-start gap-4 text-left transition-all hover:bg-slate-50 ${selectedCita?.id === c.id ? 'bg-[#0E7490]/5 border-l-4 border-[#0E7490]' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-800 truncate">{c.pacienteNombre}</div>
                      <div className="text-xs text-slate-500">{c.pacienteRut}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${ESTADO_COLORS[c.estado] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {ESTADO_LABELS[c.estado] || c.estado}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {c.fecha?.toDate().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* FICHA CLINICA */}
        <div className={colapsada ? 'lg:col-span-12' : 'lg:col-span-8'}>
          {selectedCita ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Header Ficha */}
              <div className="p-6 border-b border-l-4 border-l-[#0E7490] border-b-slate-100 bg-[#0E7490]/5 flex justify-between items-start gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <button
                      onClick={() => setListaColapsada(v => !v)}
                      title={listaColapsada ? 'Mostrar lista de pacientes' : 'Minimizar lista de pacientes'}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#0E7490] hover:text-[#0c4a6e] bg-white border border-[#0E7490]/30 hover:border-[#0E7490] rounded-lg px-2.5 py-1 transition-colors active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        {listaColapsada
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}
                      </svg>
                      {listaColapsada ? `Ver pacientes (${filteredCitas.length})` : 'Minimizar lista'}
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E7490] bg-[#0E7490]/10 px-2 py-0.5 rounded-md">
                      Atendiendo
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-800">{selectedCita.pacienteNombre}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${ESTADO_COLORS[selectedCita.estado] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {ESTADO_LABELS[selectedCita.estado] || selectedCita.estado}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">RUT:</span> {selectedCita.pacienteRut}</span>
                    {edadSel && <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">Edad:</span> {edadSel} años</span>}
                    <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">Previsión:</span> {selectedCita.prevision || '—'}</span>
                    <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">F. Nac:</span> {selectedCita.pacienteFechaNacimiento || '—'}</span>
                  </div>
                  {motivoConsulta(selectedCita) && (
                    <div className="mt-1 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">Motivo:</span> {motivoConsulta(selectedCita)}
                    </div>
                  )}
                  {ultimaActualizacion && (
                    <div className="mt-1 text-xs text-slate-400">
                      Última actualización de la ficha: {fmtFechaHora(ultimaActualizacion)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => {
                      const partes: string[] = [];
                      if (alergias.trim()) partes.push(`ALERGIAS: ${alergias.trim()}`);
                      if (alertas.trim()) partes.push(`ALERTAS: ${alertas.trim()}`);
                      if (antecedentes.trim()) partes.push(`ANTECEDENTES MÉDICOS:\n${antecedentes.trim()}`);
                      if (resumenSignos(signos) || imc) partes.push(`SIGNOS VITALES: ${[resumenSignos(signos), imc ? `IMC ${imc}` : ''].filter(Boolean).join(' · ')}`);
                      if (anamnesis.trim()) partes.push(`ANAMNESIS:\n${anamnesis.trim()}`);
                      if (diagnostico.trim() || cie10) partes.push(`DIAGNÓSTICO:\n${[cie10 ? `[${cie10}] ${cie10Desc}` : '', diagnostico.trim()].filter(Boolean).join('\n')}`);
                      if (indicaciones.trim()) partes.push(`INDICACIONES:\n${indicaciones.trim()}`);
                      imprimirDocumentos([{ titulo: 'Ficha Clínica', contenido: partes.join('\n\n') }]);
                    }}
                    title="Imprimir ficha clínica (antecedentes y anamnesis)"
                    className="flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl border transition-all active:scale-95 bg-white text-[#0E7490] border-[#0E7490]/30 hover:bg-[#0E7490]/5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Imprimir Ficha
                  </button>
                  <button
                    onClick={abrirLicencia}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl border transition-all active:scale-95 ${mostrarLicencia ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Licencia
                  </button>
                  <button
                    onClick={abrirReceta}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl border transition-all active:scale-95 ${mostrarReceta ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-violet-700 border-violet-300 hover:bg-violet-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Receta
                  </button>
                  <button
                    onClick={abrirCertificado}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl border transition-all active:scale-95 ${mostrarCertificado ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Certificado
                  </button>
                  <button
                    onClick={() => setMostrarExamenes(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl border transition-all active:scale-95 ${mostrarExamenes ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    Exámenes
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => saveFicha()}
                    className={`flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl shadow-lg shadow-[#0E7490]/20 transition-all active:scale-95 disabled:opacity-50 ${dirty ? 'bg-[#0E7490] hover:bg-[#0c6680]' : 'bg-[#0E7490]/70 hover:bg-[#0E7490]'}`}
                  >
                    {saving ? 'Guardando...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        {dirty ? 'Guardar Ficha *' : 'Guardar Ficha'}
                      </>
                    )}
                  </button>
                  {selectedCita.estado !== 'Finalizado' && (
                    <button
                      disabled={finalizando}
                      onClick={finalizarAtencion}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {finalizando ? 'Finalizando...' : 'Finalizar atención'}
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido Ficha */}
              <div className="p-6 space-y-6">
                {fichaError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    No se pudo cargar la ficha del paciente. Los campos pueden estar incompletos — guarda con cuidado.
                  </div>
                )}

                {/* Banner de alergias / alertas (siempre visible si hay datos) */}
                {(alergias.trim() || alertas.trim()) && (
                  <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-300 rounded-xl">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div className="text-sm text-red-800 leading-relaxed">
                      {alergias.trim() && <div><span className="font-bold uppercase text-xs tracking-wide">Alergias:</span> {alergias}</div>}
                      {alertas.trim() && <div><span className="font-bold uppercase text-xs tracking-wide">Alertas:</span> {alertas}</div>}
                    </div>
                  </div>
                )}

                {/* Alergias y alertas (datos persistentes del paciente) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Alergias
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Penicilina, AINEs, látex…"
                      value={alergias}
                      onChange={e => setAlergias(e.target.value)}
                      className="w-full bg-red-50/40 border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Alertas clínicas
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Anticoagulado, marcapasos, embarazo…"
                      value={alertas}
                      onChange={e => setAlertas(e.target.value)}
                      className="w-full bg-red-50/40 border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 transition-all"
                    />
                  </div>
                </div>

                {/* Signos vitales */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-[#0E7490] uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l2 5 4-10 2 5h6" /></svg>
                      Signos vitales
                    </label>
                    {signosPrevios && (
                      <span className="text-[11px] text-slate-400">Consulta anterior: {resumenSignos(signosPrevios)}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {CAMPOS_SIGNOS.map(({ k, label, ph }) => (
                      <div key={k}>
                        <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">{label}</span>
                        <input
                          type="text"
                          placeholder={ph}
                          value={signos[k] || ''}
                          onChange={e => setSignos(s => ({ ...s, [k]: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#0E7490] transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  {imc && (
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold">IMC:</span> {imc}
                      <span className="ml-1 text-slate-400">({clasificacionIMC(imc)})</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0E7490] uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Antecedentes Médicos
                    </label>
                    <textarea
                      placeholder="Alergias, patologías crónicas, cirugías previas..."
                      value={antecedentes}
                      onChange={e => setAntecedentes(e.target.value)}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-[#0E7490] transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0E7490] uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Anamnesis (Motivo de consulta y evolución)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PLANTILLAS_ANAMNESIS.map(pl => (
                        <button
                          key={pl.label}
                          type="button"
                          onClick={() => setAnamnesis(a => (a.trim() ? `${a.trim()}\n${pl.texto}` : pl.texto))}
                          title="Insertar plantilla"
                          className="text-[11px] font-semibold text-[#0E7490] bg-[#0E7490]/10 hover:bg-[#0E7490]/20 px-2 py-0.5 rounded-md transition-colors"
                        >
                          + {pl.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Describa el motivo de la consulta actual..."
                      value={anamnesis}
                      onChange={e => setAnamnesis(e.target.value)}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-[#0E7490] transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Diagnóstico (CIE-10) + indicaciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0E7490] uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Diagnóstico
                    </label>
                    {cie10 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#0E7490] bg-[#0E7490]/10 px-2 py-0.5 rounded">{cie10}</span>
                        <span className="text-slate-500 truncate">{cie10Desc}</span>
                        <button type="button" onClick={() => { setCie10(''); setCie10Desc(''); }} className="text-slate-400 hover:text-red-500" title="Quitar código">✕</button>
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar diagnóstico o código CIE-10…"
                        value={cie10Query}
                        onChange={e => setCie10Query(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0E7490] transition-all"
                      />
                      {cie10Query.trim().length >= 2 && (
                        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                          {buscarCIE10(cie10Query).length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400">Sin coincidencias. Puedes escribir el diagnóstico libre abajo.</div>
                          ) : buscarCIE10(cie10Query).map(c => (
                            <button
                              key={c.codigo}
                              type="button"
                              onClick={() => {
                                setCie10(c.codigo); setCie10Desc(c.descripcion);
                                setDiagnostico(d => d.trim() ? d : c.descripcion);
                                setCie10Query('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-[#0E7490]/5 border-b border-slate-50 last:border-0"
                            >
                              <span className="font-mono text-xs font-bold text-[#0E7490] mr-2">{c.codigo}</span>
                              <span className="text-sm text-slate-700">{c.descripcion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <textarea
                      placeholder="Diagnóstico clínico (texto libre)…"
                      value={diagnostico}
                      onChange={e => setDiagnostico(e.target.value)}
                      className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#0E7490] transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0E7490] uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Indicaciones / Plan
                    </label>
                    <textarea
                      placeholder="Tratamiento, reposo, exámenes, próximo control…"
                      value={indicaciones}
                      onChange={e => setIndicaciones(e.target.value)}
                      className="w-full h-[7.5rem] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-[#0E7490] transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Acciones de seguimiento */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => agendarCita('control')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#0E7490]/30 text-[#0E7490] text-sm font-semibold rounded-xl hover:bg-[#0E7490]/5 transition-colors active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Agendar próximo control
                  </button>
                  <button
                    onClick={() => agendarCita('eco')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    Derivar a Ecografía
                  </button>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <span className="font-bold">Nota:</span> Los <b>antecedentes</b>, <b>alergias</b> y <b>alertas</b> son persistentes y se mantienen entre consultas. La <b>anamnesis</b>, signos vitales y diagnóstico se guardan como una evolución fechada de esta atención. La ficha se <b>autoguarda</b> mientras escribes.
                  </p>
                </div>

                {/* ── Historial de evoluciones ── */}
                {evoluciones.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setMostrarHistorial(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Historial de consultas ({evoluciones.length})
                      </span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${mostrarHistorial ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {mostrarHistorial && (
                      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {evoluciones.map(ev => (
                          <div key={ev.id} className={`p-4 ${ev.citaId === selectedCita.id ? 'bg-[#0E7490]/5' : ''}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-700">{fmtFechaHora(ev.fecha) || 'Sin fecha'}</span>
                              {ev.citaId === selectedCita.id && (
                                <span className="text-[10px] font-bold text-[#0E7490] uppercase">Consulta actual</span>
                              )}
                            </div>
                            {ev.profesionalNombre && (
                              <div className="text-[11px] text-slate-400 mb-1">{ev.profesionalNombre}{ev.motivo ? ` · ${ev.motivo}` : ''}</div>
                            )}
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{ev.anamnesis || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Documentos médicos ── */}
                {mostrarLicencia && (
                  <div className="border border-amber-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Licencia Médica
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => previsualizarDocumento([{ titulo: 'Licencia Médica', contenido: licencia }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-700/80 hover:text-amber-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Vista previa
                        </button>
                        <button
                          onClick={() => imprimirDocumentos([{ titulo: 'Licencia Médica', contenido: licencia }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Imprimir
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={licencia}
                      onChange={e => setLicencia(e.target.value)}
                      className="w-full h-44 p-4 text-sm font-mono leading-relaxed focus:outline-none resize-y bg-white"
                      placeholder="Redacte la licencia médica…"
                    />
                  </div>
                )}

                {mostrarReceta && (
                  <div className="border border-violet-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-violet-50 border-b border-violet-100">
                      <span className="text-xs font-bold text-violet-800 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Receta Médica
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={reutilizarReceta}
                          title="Cargar la última receta emitida a este paciente"
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-700/80 hover:text-violet-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Reutilizar anterior
                        </button>
                        <button
                          onClick={() => previsualizarDocumento([{ titulo: 'Receta Médica', contenido: receta }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-700/80 hover:text-violet-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Vista previa
                        </button>
                        <button
                          onClick={() => imprimirDocumentos([{ titulo: 'Receta Médica', contenido: receta }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Imprimir
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={receta}
                      onChange={e => setReceta(e.target.value)}
                      className="w-full h-44 p-4 text-sm font-mono leading-relaxed focus:outline-none resize-y bg-white"
                      placeholder="Redacte la receta médica…"
                    />
                  </div>
                )}

                {mostrarCertificado && (
                  <div className="border border-sky-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-sky-50 border-b border-sky-100">
                      <span className="text-xs font-bold text-sky-800 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Certificado Médico
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => previsualizarDocumento([{ titulo: 'Certificado Médico', contenido: certificado }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-sky-700/80 hover:text-sky-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Vista previa
                        </button>
                        <button
                          onClick={() => imprimirDocumentos([{ titulo: 'Certificado Médico', contenido: certificado }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Imprimir
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={certificado}
                      onChange={e => setCertificado(e.target.value)}
                      className="w-full h-44 p-4 text-sm font-mono leading-relaxed focus:outline-none resize-y bg-white"
                      placeholder="Redacte el certificado médico…"
                    />
                  </div>
                )}

                {/* ── Timeline unificado del paciente ── */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={toggleTimeline}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                      Historial clínico del paciente {historial ? `(${historial.length})` : ''}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${mostrarTimeline ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {mostrarTimeline && (
                    <div className="max-h-80 overflow-y-auto">
                      {cargandoHistorial ? (
                        <div className="p-6 text-center text-sm text-slate-400">Cargando historial…</div>
                      ) : !historial || historial.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400 italic">Sin atenciones ni exámenes registrados.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {historial.map((ev, i) => (
                            <div key={i} className="flex items-start gap-3 p-3">
                              <span className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${ev.tipo === 'examen' ? 'bg-teal-50 text-teal-600' : 'bg-[#0E7490]/10 text-[#0E7490]'}`}>
                                {ev.tipo === 'examen' ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-800 truncate">{ev.titulo}</span>
                                  <span className="text-[11px] text-slate-400 flex-shrink-0">{ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CL') : ''}</span>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                                  {ev.detalle && <span>{ev.detalle}</span>}
                                  {ev.estado && <><span>·</span><span className="capitalize">{ev.estado}</span></>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Órdenes de laboratorio → Toma de Muestras ── */}
                {mostrarExamenes && (
                  <div className="border border-teal-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100">
                      <span className="text-xs font-bold text-teal-800 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Solicitar exámenes de laboratorio
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {EXAMENES_FRECUENTES.map(ex => {
                          const sel = examenesSel.has(ex);
                          return (
                            <button
                              key={ex}
                              type="button"
                              onClick={() => toggleExamen(ex)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${sel ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'}`}
                            >
                              {sel ? '✓ ' : '+ '}{ex}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        value={examenLibre}
                        onChange={e => setExamenLibre(e.target.value)}
                        placeholder="Otros exámenes (separados por coma)…"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                      />
                      <input
                        type="text"
                        value={examenObs}
                        onChange={e => setExamenObs(e.target.value)}
                        placeholder="Observaciones / indicaciones para el laboratorio…"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                      />
                      <button
                        disabled={enviandoExamenes}
                        onClick={enviarExamenes}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        {enviandoExamenes ? 'Enviando…' : 'Enviar a Toma de Muestras'}
                      </button>
                    </div>
                  </div>
                )}

                {[mostrarLicencia, mostrarReceta, mostrarCertificado].filter(Boolean).length >= 2 && (
                  <button
                    onClick={() => imprimirDocumentos([
                      ...(mostrarLicencia ? [{ titulo: 'Licencia Médica', contenido: licencia }] : []),
                      ...(mostrarReceta ? [{ titulo: 'Receta Médica', contenido: receta }] : []),
                      ...(mostrarCertificado ? [{ titulo: 'Certificado Médico', contenido: certificado }] : []),
                    ])}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Imprimir todos los documentos abiertos
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 bg-white border border-slate-200 border-dashed rounded-2xl">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-400">Seleccione un paciente</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">Haga clic en un paciente de la lista de la izquierda para abrir su ficha médica y registrar la anamnesis.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: atender paciente sin cita (walk-in) ── */}
      {walkinOpen && (
        <div
          onMouseDown={() => setWalkinOpen(false)}
          className="fixed inset-0 z-[10000] flex items-start justify-center p-4 pt-[10vh]"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-bold text-slate-700">Atender paciente sin cita</span>
              <button onClick={() => setWalkinOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200" title="Cerrar">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  autoFocus
                  type="text"
                  value={walkinQuery}
                  onChange={e => setWalkinQuery(e.target.value)}
                  placeholder="Buscar por nombre o RUT…"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0E7490]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Se creará una atención de "Control médico" para hoy con este paciente.</p>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100">
              {walkinLoading ? (
                <div className="p-8 text-center text-sm text-slate-400">Cargando pacientes…</div>
              ) : walkinFiltrados.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 italic">
                  {walkinQuery.trim() ? 'Sin coincidencias.' : 'Escribe para buscar un paciente.'}
                  <div className="mt-2"><Link to="/nuevopaciente" className="text-[#0E7490] font-semibold hover:underline">Registrar nuevo paciente →</Link></div>
                </div>
              ) : (
                walkinFiltrados.map(p => (
                  <button
                    key={p.rut}
                    disabled={creandoCita}
                    onClick={() => atenderWalkin(p)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{p.nombre || `${p.nombres ?? ''} ${p.apellidoPaterno ?? ''}`.trim()}</div>
                      <div className="text-xs text-slate-400">{p.rut}{p.prevision ? ` · ${p.prevision}` : ''}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de previsualización del documento ── */}
      {previewDocs && (
        <div
          onMouseDown={() => setPreviewDocs(null)}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-bold text-slate-700">
                Vista previa — {previewDocs.map(d => d.titulo).join(' + ')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const d = previewDocs; setPreviewDocs(null); if (d) imprimirDocumentos(d); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-bold rounded-lg transition-colors active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimir
                </button>
                <button
                  onClick={() => setPreviewDocs(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <iframe
              title="Vista previa documento"
              srcDoc={construirHtmlDocumentos(previewDocs)}
              className="w-full flex-1 bg-white"
              style={{ border: 'none', minHeight: '70vh' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AtencionMedicaPage;
