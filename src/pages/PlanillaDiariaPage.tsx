import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  cargarPlanilla, guardarPlanilla, cargarBonos, guardarBonos, totalArqueo, listarJornadas,
} from '../services/planillaService';
import {
  PROFESIONALES_PLANILLA, PREVISIONES, MODOS_PAGO,
  COMISION_TRULLENQUE, filaVacia, arqueoVacio, construirFilasHorario, esColacion,
} from '../types/planilla';
import type { Planilla, FilaPlanilla, Bono } from '../types/planilla';
import {
  getPrestacionesActivas, getPrevisionesNombres, preciosDe,
} from '../services/prestacionesService';
import type { PrestacionTarifa } from '../services/prestacionesService';
import { getProfesionales } from '../services/profesionalesService';
import type { Profesional } from '../types/agenda';
import ExamenAutocomplete from '../components/planilla/ExamenAutocomplete';
import { useDialog } from '../components/ui/DialogProvider';
import { analizarPacientesPlanilla, guardarPacientesPlanilla } from '../services/pacientesPlanillaService';
import { sincronizarJornadaConCitas } from '../services/planillaSyncService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
const fmtNum = (n: number) => n.toLocaleString('es-CL');

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fracToHora(v: unknown): string {
  if (typeof v === 'number' && v > 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  return typeof v === 'string' ? v.trim() : '';
}

function serialToFecha(v: unknown): string {
  if (typeof v === 'number' && v > 1) {
    const ms = Date.UTC(1899, 11, 30) + v * 86400000;
    const d = new Date(ms);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
  return typeof v === 'string' ? v.trim() : '';
}

// Nombres EXACTOS de las columnas tal como aparecen en el Excel.
const COLUMNAS: Array<{ campo: keyof FilaPlanilla; label: string; ancho: number; tipo?: 'num' | 'prevision' | 'pago' | 'examen' }> = [
  { campo: 'hora', label: 'HORA', ancho: 58 },
  { campo: 'paciente', label: 'PACIENTE', ancho: 210 },
  { campo: 'rut', label: 'RUT', ancho: 105 },
  { campo: 'edad', label: 'EDAD', ancho: 70 },
  { campo: 'fechaNac', label: 'FECHA NACIMIENTO', ancho: 100 },
  { campo: 'fono', label: 'FONO', ancho: 95 },
  { campo: 'correo', label: 'CORREO', ancho: 190 },
  { campo: 'direccion', label: 'Dirección', ancho: 160 },
  { campo: 'prevision', label: 'PREVISON', ancho: 95, tipo: 'prevision' },
  { campo: 'examen', label: 'EXAMEN', ancho: 190, tipo: 'examen' },
  { campo: 'codigo', label: 'CÓDIGO', ancho: 90 },
  { campo: 'ordenMedica', label: 'ORDEN MÉDICA', ancho: 70 },
  { campo: 'preparacion', label: 'PREPARACION', ancho: 120 },
  { campo: 'montoCancelar', label: 'MONTO A CANCELAR', ancho: 90, tipo: 'num' },
  { campo: 'modoPago', label: 'MODO DE PAGO', ancho: 105, tipo: 'pago' },
  { campo: 'fonasa', label: 'FONASA', ancho: 85, tipo: 'num' },
];

// ── Parseo de hojas del Excel (reutilizado por importación de 1 día y de mes) ──

const DENOMS_VALIDAS = new Set(arqueoVacio().map(l => l.denominacion));

/** Extrae las filas de pacientes de una hoja (corta en "Bloqueo"). */
function parseFilasDeRows(rows: any[][]): FilaPlanilla[] {
  const headers = (rows[0] ?? []).map(h => String(h ?? '').toUpperCase());
  const tieneExamen = headers.some(h => h.includes('EXAMEN'));
  const filas: FilaPlanilla[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const paciente = String(r[1] ?? '').trim();
    if (paciente.toLowerCase() === 'bloqueo') break;
    const hora = fracToHora(r[0]);
    if (!paciente && !hora) continue;
    const examen = tieneExamen ? String(r[10] ?? '').trim() : '';
    filas.push({
      ...filaVacia(hora),
      paciente,
      rut: String(r[2] ?? '').trim(),
      edad: String(r[3] ?? '').trim(),
      fechaNac: serialToFecha(r[4]),
      fono: String(r[5] ?? '').trim(),
      correo: String(r[6] ?? '').trim(),
      direccion: String(r[7] ?? '').trim(),
      prevision: String(r[9] ?? 'Particular').trim() || 'Particular',
      examen,
      codigo: tieneExamen ? String(r[11] ?? '').trim() : '',
      ordenMedica: tieneExamen ? String(r[12] ?? '').trim() : '',
      preparacion: tieneExamen ? String(r[13] ?? '').trim() : '',
      montoCancelar: parseNum(tieneExamen ? r[14] : r[10]),
      modoPago: String((tieneExamen ? r[15] : r[11]) ?? '').trim() || 'Débito',
      fonasa: parseNum(tieneExamen ? r[16] : r[12]),
    });
  }
  return filas;
}

/** Extrae el arqueo de billetes de una hoja (busca la cabecera CANTIDAD/TIPO). */
function parseArqueoDeRows(rows: any[][]) {
  const base = arqueoVacio();
  let col = -1, hdr = -1;
  for (let i = 0; i < rows.length; i++) {
    const j = (rows[i] ?? []).findIndex(c => String(c).trim().toUpperCase() === 'CANTIDAD');
    if (j >= 0) { col = j; hdr = i; break; }
  }
  if (col < 0) return base;
  for (let i = hdr + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const den = parseNum(r[col + 1]);
    const cant = parseNum(r[col]);
    if (DENOMS_VALIDAS.has(den)) {
      const linea = base.find(l => l.denominacion === den);
      if (linea) linea.cantidad = cant;
    }
  }
  return base;
}

/** Día (DD) e iniciales del profesional desde el nombre de la hoja. */
function diaDesdeNombre(nombre: string): string | null {
  const d = (nombre.match(/(\d{1,2})/) ?? [])[1];
  return d ? d.padStart(2, '0') : null;
}
function inicialesDesdeNombre(nombre: string): string {
  const raw = (nombre.match(/\(([^)]+)\)/) ?? [])[1]?.trim() ?? '';
  return PROFESIONALES_PLANILLA.find(p => p.iniciales.toLowerCase() === raw.toLowerCase())?.iniciales ?? raw;
}

/** Parsea la hoja BONOS. */
function parseBonosDeSheet(ws: XLSX.WorkSheet): Bono[] {
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, blankrows: false });
  let tipo: 'Web' | 'Fonasa' = 'Web';
  const out: Bono[] = [];
  rows.forEach((r, i) => {
    const c0 = String(r[0] ?? '').toUpperCase();
    if (c0.includes('WEB')) tipo = 'Web';
    else if (c0.includes('FONASA')) tipo = 'Fonasa';
    if (String(r[1] ?? '').toUpperCase() === 'FECHA') return;
    if (r[2]) out.push({
      id: `b_imp_${i}`, tipo, fecha: serialToFecha(r[1]),
      rut: String(r[2]).trim(), folio: String(r[3] ?? '').trim(), valor: parseNum(r[4]),
    });
  });
  return out;
}

// Paleta de colores para las filas (estilo Excel real de la clínica).
const COLORES_FILA: Array<{ nombre: string; valor: string }> = [
  { nombre: 'Verde (Particular)', valor: '#D9EAD3' },
  { nombre: 'Azul (Fonasa)', valor: '#CFE2F3' },
  { nombre: 'Celeste (Doppler)', valor: '#A2C4C9' },
  { nombre: 'Amarillo', valor: '#FFF2CC' },
  { nombre: 'Naranjo', valor: '#FCE5CD' },
  { nombre: 'Rosa', valor: '#F4CCCC' },
  { nombre: 'Gris (Bloqueo)', valor: '#D9D9D9' },
];

/** Una Ecografía Doppler ocupa 2 bloques de hora (reserva el slot siguiente). */
const esDoppler = (f: FilaPlanilla) => /doppler/i.test(f.examen || '');

/** Columnas fijas al hacer scroll horizontal: desplazamiento izquierdo (px). */
const STICKY_LEFT: Record<string, number> = { hora: 30, paciente: 88 };

// ── Formato Sante Pacs (DICOM) ───────────────────────────────────────────────

/** Separa el nombre completo en apellidos y nombres (convención chilena). */
function separarNombre(completo: string): { apellidos: string; nombres: string } {
  const partes = completo.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { apellidos: '', nombres: '' };
  if (partes.length <= 2) return { apellidos: partes.slice(-1).join(' '), nombres: partes.slice(0, -1).join(' ') };
  // 3 o más palabras: los últimos 2 términos son apellidos.
  return { apellidos: partes.slice(-2).join(' '), nombres: partes.slice(0, -2).join(' ') };
}

/** Nombre en formato DICOM: "Apellidos^Nombres". */
function nombreDicom(completo: string): string {
  const { apellidos, nombres } = separarNombre(completo);
  if (!apellidos && !nombres) return '';
  return `${apellidos}^${nombres}`.replace(/\^$/, '');
}

/** RUT como Patient ID: sin puntos ni guión (dígitos + verificador). */
function rutDicom(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

/** Fecha de nacimiento a DICOM: aaaammdd. Acepta dd/mm/aaaa, dd-mm-aaaa o aaaa-mm-dd. */
function fechaDicom(fecha: string): string {
  const s = fecha.trim();
  let m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/); // dd/mm/aaaa
  if (m) return `${m[3]}${m[2].padStart(2, '0')}${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/); // aaaa-mm-dd
  if (m) return `${m[1]}${m[2].padStart(2, '0')}${m[3].padStart(2, '0')}`;
  return s.replace(/[^0-9]/g, '');
}

/** Iniciales legibles de un profesional (1ª letra del nombre + 1ª del apellido). */
function inicialesDe(p: Profesional): string {
  const nom = (p.nombre || '').trim().split(/\s+/);
  const ini = (nom[0]?.[0] || '') + ((p.apellidoPaterno || '').trim()[0] || nom[1]?.[0] || '');
  return ini.toUpperCase() || (p.nombre || '?').slice(0, 2).toUpperCase();
}

interface OpcionProfesional {
  key: string;          // clave de la jornada (id real del profesional o iniciales históricas)
  nombre: string;       // etiqueta mostrada
  iniciales: string;    // iniciales cortas (badge / título / pestañas)
  color: string;
  legacy: boolean;
}

// ── Componente ───────────────────────────────────────────────────────────────

const PlanillaDiariaPage: React.FC = () => {
  const dialog = useDialog();
  const [fecha, setFecha] = useState<string>(hoyISO());
  const [iniciales, setIniciales] = useState<string>(PROFESIONALES_PLANILLA[0].iniciales);
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [tab, setTab] = useState<'planilla' | 'bonos'>('planilla');
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [guardado, setGuardado] = useState<'idle' | 'guardando' | 'guardado'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);
  const fileMesRef = useRef<HTMLInputElement>(null);
  const [jornadas, setJornadas] = useState<Array<{ fecha: string; iniciales: string }>>([]);
  const [profesionalesDB, setProfesionalesDB] = useState<Profesional[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [colorMenu, setColorMenu] = useState<{ filaId: string; x: number; y: number } | null>(null);
  const [santePacs, setSantePacs] = useState(false);
  const [leyenda, setLeyenda] = useState(false);
  const [santeFilaId, setSanteFilaId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const copiarTexto = async (texto: string, key: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(key);
      setTimeout(() => setCopiado(c => (c === key ? null : c)), 1300);
    } catch { /* navegador sin permiso de portapapeles */ }
  };

  const refrescarJornadas = () => listarJornadas().then(setJornadas);
  useEffect(() => { refrescarJornadas(); }, []);

  // Profesionales reales registrados (para elegir el profesional del día).
  useEffect(() => {
    getProfesionales()
      .then(list => setProfesionalesDB(list.filter(p => p.activo !== false)))
      .catch(() => setProfesionalesDB([]));
  }, []);

  // Opciones del selector: profesionales reales + jornadas históricas (para
  // no perder acceso a datos guardados con las iniciales antiguas JP/SM/Doctor).
  const opcionesProfesionales = useMemo<OpcionProfesional[]>(() => {
    const reales: OpcionProfesional[] = profesionalesDB.map(p => ({
      key: p.id,
      nombre: [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ').trim() || p.nombre || inicialesDe(p),
      iniciales: inicialesDe(p),
      color: p.color || '#0E7490',
      legacy: false,
    }));
    const keysReales = new Set(reales.map(o => o.key));

    // Iniciales antiguas con jornadas guardadas que no coincidan con un id real.
    const historicas: OpcionProfesional[] = Array.from(new Set(jornadas.map(j => j.iniciales)))
      .filter(k => k && !keysReales.has(k))
      .map(k => {
        const legacy = PROFESIONALES_PLANILLA.find(l => l.iniciales === k);
        return {
          key: k,
          nombre: legacy ? `${legacy.nombre} (histórico)` : `${k} (histórico)`,
          iniciales: legacy?.iniciales ?? k,
          color: legacy?.color ?? '#64748B',
          legacy: true,
        };
      });

    const todas = [...reales, ...historicas];
    if (todas.length) return todas;
    // Fallback si aún no cargan profesionales ni hay jornadas: lista por defecto.
    return PROFESIONALES_PLANILLA.map(l => ({ key: l.iniciales, nombre: l.nombre, iniciales: l.iniciales, color: l.color, legacy: false }));
  }, [profesionalesDB, jornadas]);

  // Si la selección actual no existe en las opciones, cae al primer profesional.
  useEffect(() => {
    if (opcionesProfesionales.length && !opcionesProfesionales.some(o => o.key === iniciales)) {
      setIniciales(opcionesProfesionales[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcionesProfesionales]);

  const infoProfesional = (key: string): OpcionProfesional =>
    opcionesProfesionales.find(o => o.key === key) ?? { key, nombre: key, iniciales: key, color: '#64748B', legacy: true };

  // Cerrar el menú de color al hacer clic en cualquier parte o con Escape.
  useEffect(() => {
    if (!colorMenu) return;
    const cerrar = () => setColorMenu(null);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setColorMenu(null); };
    window.addEventListener('click', cerrar);
    window.addEventListener('keydown', onEsc);
    return () => { window.removeEventListener('click', cerrar); window.removeEventListener('keydown', onEsc); };
  }, [colorMenu]);

  // Prestaciones registradas (para autocompletar examen + precios) y previsiones.
  const [prestaciones, setPrestaciones] = useState<PrestacionTarifa[]>([]);
  const [previsionesOpts, setPrevisionesOpts] = useState<string[]>([...PREVISIONES]);

  useEffect(() => {
    getPrestacionesActivas().then(setPrestaciones).catch(() => setPrestaciones([]));
    getPrevisionesNombres()
      .then(p => { if (p.length) setPrevisionesOpts(p); })
      .catch(() => { /* mantiene PREVISIONES por defecto */ });
  }, []);

  useEffect(() => {
    let activo = true;
    cargarPlanilla(fecha, iniciales).then(p => {
      if (!activo) return;
      setPlanilla(
        p ?? {
          fecha, profesionalIniciales: iniciales,
          filas: construirFilasHorario(fecha),
          arqueo: arqueoVacio(), notas: '', actualizadoEn: 0,
        },
      );
    });
    return () => { activo = false; };
  }, [fecha, iniciales]);

  useEffect(() => { cargarBonos().then(setBonos); }, []);

  useEffect(() => {
    if (!planilla || planilla.actualizadoEn === 0) return;
    setGuardado('guardando');
    const t = setTimeout(() => {
      guardarPlanilla(planilla).then(() => {
        setGuardado('guardado');
        refrescarJornadas();
        setTimeout(() => setGuardado('idle'), 1500);
        // PUENTE AUTOMÁTICO: alimenta citas (Box Eco/Medicina/Recepción/Reportes)
        // y pacientes desde la planilla. Idempotente (actualiza, no duplica).
        if (planilla.filas.some(f => f.paciente.trim())) {
          const prof = PROFESIONALES_PLANILLA.find(pp => pp.iniciales === planilla.profesionalIniciales);
          sincronizarJornadaConCitas(planilla, prof?.nombre ?? planilla.profesionalIniciales)
            .catch(err => console.warn('auto-sync planilla→citas:', err));
        }
      });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planilla]);

  const mutar = (fn: (p: Planilla) => Planilla) =>
    setPlanilla(prev => (prev ? { ...fn(prev), actualizadoEn: Date.now() } : prev));

  const setFila = (id: string, campo: keyof FilaPlanilla, valor: any) =>
    mutar(p => ({ ...p, filas: p.filas.map(f => (f.id === id ? { ...f, [campo]: valor } : f)) }));

  const setColorFila = (id: string, color: string | undefined) =>
    mutar(p => ({ ...p, filas: p.filas.map(f => (f.id === id ? { ...f, color } : f)) }));

  // Busca una prestación por nombre exacto. El nombre registrado puede venir como
  // "CÓDIGO - Nombre", por lo que también se compara quitando el código.
  const buscarPrestacion = (nombre: string) => {
    const n = nombre.toLowerCase().trim();
    const sinCod = (s: string) => (s.includes(' - ') ? s.split(' - ').slice(1).join(' - ').trim() : s);
    return prestaciones.find(p => p.nombre.toLowerCase().trim() === n)
        ?? prestaciones.find(p => sinCod(p.nombre).toLowerCase().trim() === n);
  };

  // Auto-vinculación: al cargar la jornada (o las prestaciones), vincula las filas
  // cuyo examen coincide EXACTAMENTE con una prestación registrada. Así el punto
  // se pone verde y su plantilla se reconoce en el Box, sin re-tipear nada.
  useEffect(() => {
    if (!planilla || prestaciones.length === 0) return;
    let cambio = false;
    const filas = planilla.filas.map(f => {
      if (f.prestacionId || !f.examen.trim()) return f;
      const prest = buscarPrestacion(f.examen);
      if (prest) { cambio = true; return { ...f, prestacionId: prest.id, codigo: f.codigo || prest.codigo }; }
      return f;
    });
    if (cambio) mutar(p => ({ ...p, filas }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestaciones, planilla?.fecha, planilla?.profesionalIniciales]);

  // EXAMEN: al escribir/elegir, si coincide con una prestación registrada,
  // autocompleta código y precios según la previsión de la fila.
  const handleExamenChange = (id: string, nombre: string) =>
    mutar(p => ({
      ...p,
      filas: p.filas.map(f => {
        if (f.id !== id) return f;
        const prest = buscarPrestacion(nombre);
        if (!prest) return { ...f, examen: nombre, prestacionId: undefined };
        const { monto, fonasa } = preciosDe(prest, f.prevision);
        return {
          ...f, examen: prest.nombre, prestacionId: prest.id,
          codigo: prest.codigo, montoCancelar: monto, fonasa,
        };
      }),
    }));

  // EXAMEN: selección directa de una prestación registrada.
  const handleExamenSelect = (id: string, prest: PrestacionTarifa) =>
    mutar(p => ({
      ...p,
      filas: p.filas.map(f => {
        if (f.id !== id) return f;
        const { monto, fonasa } = preciosDe(prest, f.prevision);
        return {
          ...f, examen: prest.nombre, prestacionId: prest.id,
          codigo: prest.codigo, montoCancelar: monto, fonasa,
        };
      }),
    }));

  // PREVISIÓN: si la fila está vinculada a una prestación, recalcula precios.
  const handlePrevisionChange = (id: string, prevision: string) =>
    mutar(p => ({
      ...p,
      filas: p.filas.map(f => {
        if (f.id !== id) return f;
        if (!f.prestacionId) return { ...f, prevision };
        const prest = prestaciones.find(x => x.id === f.prestacionId);
        if (!prest) return { ...f, prevision };
        const { monto, fonasa } = preciosDe(prest, prevision);
        return { ...f, prevision, montoCancelar: monto, fonasa };
      }),
    }));

  const agregarFilas = (n = 1) =>
    mutar(p => ({ ...p, filas: [...p.filas, ...Array.from({ length: n }, () => filaVacia(''))] }));

  const eliminarFila = (id: string) =>
    mutar(p => ({ ...p, filas: p.filas.filter(f => f.id !== id) }));

  const setArqueo = (denominacion: number, cantidad: number) =>
    mutar(p => ({ ...p, arqueo: p.arqueo.map(l => (l.denominacion === denominacion ? { ...l, cantidad } : l)) }));

  const totales = useMemo(() => {
    const filas = planilla?.filas ?? [];
    const totalMonto = filas.reduce((s, f) => s + (f.montoCancelar || 0), 0);
    const totalFonasa = filas.reduce((s, f) => s + (f.fonasa || 0), 0);
    const comision = Math.round(totalFonasa * COMISION_TRULLENQUE);
    const efectivoEsperado = filas.filter(f => f.modoPago.toLowerCase().includes('efectivo')).reduce((s, f) => s + (f.montoCancelar || 0), 0);
    const arqueo = planilla ? totalArqueo(planilla.arqueo) : 0;
    const pacientes = filas.filter(f => f.paciente.trim()).length;
    return { totalMonto, totalFonasa, comision, efectivoEsperado, arqueo, excedente: arqueo - efectivoEsperado, pacientes };
  }, [planilla]);

  // ── Importar desde Excel ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const hojas = wb.SheetNames.filter(n => n.toUpperCase() !== 'BONOS');
    const elegida = await dialog.prompt(
      `${hojas.map((h, i) => `${i + 1}. ${h}`).join('\n')}`,
      { title: '¿Qué jornada quieres importar?', placeholder: 'Escribe el número', confirmText: 'Importar' },
    );
    if (!elegida) { if (fileRef.current) fileRef.current.value = ''; return; }
    const nombreHoja = hojas[parseInt(elegida, 10) - 1];
    if (!nombreHoja) { await dialog.alert('Número inválido.'); return; }

    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[nombreHoja], { header: 1, raw: true, blankrows: false });
    const headers = (rows[0] ?? []).map(h => String(h ?? '').toUpperCase());
    const tieneExamen = headers.some(h => h.includes('EXAMEN'));

    const filas: FilaPlanilla[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const paciente = String(r[1] ?? '').trim();
      if (paciente.toLowerCase() === 'bloqueo') break;
      const hora = fracToHora(r[0]);
      if (!paciente && !hora) continue;
      const examen = tieneExamen ? String(r[10] ?? '').trim() : '';
      filas.push({
        ...filaVacia(hora),
        prestacionId: examen ? buscarPrestacion(examen)?.id : undefined,
        paciente,
        rut: String(r[2] ?? '').trim(),
        edad: String(r[3] ?? '').trim(),
        fechaNac: serialToFecha(r[4]),
        fono: String(r[5] ?? '').trim(),
        correo: String(r[6] ?? '').trim(),
        direccion: String(r[7] ?? '').trim(),
        prevision: String(r[9] ?? 'Particular').trim() || 'Particular',
        examen,
        codigo: tieneExamen ? String(r[11] ?? '').trim() : '',
        ordenMedica: tieneExamen ? String(r[12] ?? '').trim() : '',
        preparacion: tieneExamen ? String(r[13] ?? '').trim() : '',
        montoCancelar: parseNum(tieneExamen ? r[14] : r[10]),
        modoPago: String((tieneExamen ? r[15] : r[11]) ?? '').trim() || 'Débito',
        fonasa: parseNum(tieneExamen ? r[16] : r[12]),
      });
    }
    if (!filas.length) { await dialog.alert('No se encontraron pacientes en esa hoja.'); return; }
    const m = nombreHoja.match(/\(([^)]+)\)/);
    const ini = m ? m[1].trim() : iniciales;
    const detectada = PROFESIONALES_PLANILLA.find(p => p.iniciales.toLowerCase() === ini.toLowerCase())?.iniciales;
    mutar(p => ({ ...p, filas }));
    if (detectada && detectada !== iniciales) setIniciales(detectada);
    if (fileRef.current) fileRef.current.value = '';
    await dialog.alert(`Se importaron ${filas.length} pacientes desde "${nombreHoja}".`, { title: 'Importación lista' });
  };

  // ── Importar MES COMPLETO (todas las jornadas + arqueo + bonos) ──
  const handleImportMes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base = fecha.slice(0, 7); // YYYY-MM de la fecha seleccionada
    const ok = await dialog.confirm(
      `Se importarán TODAS las jornadas del archivo al mes ${base.split('-').reverse().join('/')}.\n\n` +
      'Esto reemplaza las jornadas guardadas de ese mes con los datos del Excel.',
      { title: 'Importar mes completo', confirmText: 'Importar' },
    );
    if (!ok) { if (fileMesRef.current) fileMesRef.current.value = ''; return; }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    let dias = 0, pacientes = 0;

    for (const nombre of wb.SheetNames) {
      if (nombre.toUpperCase() === 'BONOS') continue;
      const dd = diaDesdeNombre(nombre);
      if (!dd) continue;
      const ini = inicialesDesdeNombre(nombre);
      const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[nombre], { header: 1, raw: true, blankrows: false });
      let filas: FilaPlanilla[] = parseFilasDeRows(rows).map(f => ({
        ...f, prestacionId: f.examen ? buscarPrestacion(f.examen)?.id : undefined,
      }));
      const arqueo = parseArqueoDeRows(rows);
      // No guardar jornadas totalmente vacías y sin arqueo.
      const hayDatos = filas.some(f => f.paciente.trim()) || arqueo.some(l => l.cantidad > 0);
      if (!hayDatos) continue;
      if (filas.length === 0) filas = [filaVacia('')];
      await guardarPlanilla({
        fecha: `${base}-${dd}`, profesionalIniciales: ini,
        filas, arqueo, notas: '', actualizadoEn: Date.now(),
      });
      dias++;
      pacientes += filas.filter(f => f.paciente.trim()).length;
    }

    // Bonos
    const bonosSheet = wb.SheetNames.find(n => n.toUpperCase() === 'BONOS');
    if (bonosSheet) {
      const nuevos = parseBonosDeSheet(wb.Sheets[bonosSheet]);
      if (nuevos.length) { setBonos(nuevos); await guardarBonos(nuevos); }
    }

    // Refrescar vista actual
    const recargada = await cargarPlanilla(fecha, iniciales);
    if (recargada) setPlanilla(recargada);
    await refrescarJornadas();
    if (fileMesRef.current) fileMesRef.current.value = '';
    await dialog.alert(`Mes importado: ${dias} jornadas y ${pacientes} pacientes.\n\nUsa las pestañas de días para navegarlas.`, { title: 'Importación lista' });
  };

  // ── Bonos ──
  const agregarBono = () => { const n = [...bonos, { id: `b_${Date.now()}`, tipo: 'Web', fecha, rut: '', folio: '', valor: 0 } as Bono]; setBonos(n); guardarBonos(n); };
  const setBono = (id: string, campo: keyof Bono, valor: any) => { const n = bonos.map(b => (b.id === id ? { ...b, [campo]: valor } : b)); setBonos(n); guardarBonos(n); };
  const eliminarBono = (id: string) => { const n = bonos.filter(b => b.id !== id); setBonos(n); guardarBonos(n); };
  const totalBonos = bonos.reduce((s, b) => s + (b.valor || 0), 0);

  // ── Agregar pacientes de la planilla a la base de datos ──
  const handleAgregarPacientesBD = async () => {
    if (!planilla) return;
    const conNombre = planilla.filas.filter(f => f.paciente.trim());
    if (conNombre.length === 0) {
      await dialog.alert('No hay pacientes en esta jornada para agregar.');
      return;
    }

    setSincronizando(true);
    try {
      const { nuevos, existentes, sinRut } = await analizarPacientesPlanilla(conNombre);

      if (nuevos.length === 0 && existentes.length === 0) {
        await dialog.alert(
          `Los ${sinRut.length} paciente(s) de la planilla no tienen un RUT válido, por lo que no se pueden agregar a la base de datos.`,
          { title: 'Sin RUT válido' },
        );
        return;
      }

      // 1) Agregar los pacientes nuevos directamente.
      let agregados = 0;
      if (nuevos.length > 0) {
        agregados = await guardarPacientesPlanilla(nuevos, true);
      }

      // 2) Si hay pacientes ya existentes, preguntar si se actualizan sus datos.
      let actualizados = 0;
      if (existentes.length > 0) {
        const actualizar = await dialog.confirm(
          `${existentes.length} paciente(s) ya están en la base de datos.\n\n¿Deseas actualizar sus datos con la información de la planilla?`,
          { title: 'Pacientes existentes', confirmText: 'Actualizar datos', cancelText: 'No actualizar' },
        );
        if (actualizar) {
          actualizados = await guardarPacientesPlanilla(existentes, false);
        }
      }

      // 3) Resumen final.
      const partes: string[] = [];
      if (agregados > 0) partes.push(`• ${agregados} paciente(s) nuevo(s) agregado(s).`);
      if (actualizados > 0) partes.push(`• ${actualizados} paciente(s) actualizado(s).`);
      else if (existentes.length > 0) partes.push(`• ${existentes.length} paciente(s) existente(s) sin cambios.`);
      if (sinRut.length > 0) partes.push(`• ${sinRut.length} paciente(s) omitido(s) por no tener RUT válido.`);

      await dialog.alert(partes.join('\n') || 'No se realizaron cambios.', { title: 'Sincronización completada' });
    } catch (e) {
      console.error('handleAgregarPacientesBD', e);
      await dialog.alert('Ocurrió un error al sincronizar los pacientes. Intenta nuevamente.');
    } finally {
      setSincronizando(false);
    }
  };

  // ── PUENTE: enviar la jornada a citas (Box Eco/Medicina/Recepción/Reportes) + pacientes ──
  const handleEnviarASistema = async () => {
    if (!planilla) return;
    const conNombre = planilla.filas.filter(f => f.paciente.trim());
    if (conNombre.length === 0) {
      await dialog.alert('No hay pacientes en esta jornada para enviar al sistema.');
      return;
    }
    const ok = await dialog.confirm(
      `Se enviarán ${conNombre.length} paciente(s) de esta jornada al sistema:\n\n` +
      '• Aparecerán en Box Ecografía / Box Medicina y Recepción.\n' +
      '• Quedarán en la base de datos de pacientes.\n' +
      '• Sus montos alimentarán Reportes y Finanzas.\n\n' +
      'Es seguro repetirlo: actualiza, no duplica.',
      { title: 'Enviar al sistema', confirmText: 'Enviar' },
    );
    if (!ok) return;
    setSincronizando(true);
    try {
      const prof = infoProfesional(iniciales);
      const r = await sincronizarJornadaConCitas(planilla, prof.nombre);
      await dialog.alert(
        `• ${r.citas} cita(s) creadas/actualizadas (visibles en los box).\n` +
        `• ${r.pacientes} paciente(s) sincronizados a la base de datos.`,
        { title: 'Listo — enviado al sistema' },
      );
    } catch (e) {
      console.error('handleEnviarASistema', e);
      await dialog.alert('Ocurrió un error al enviar al sistema. Intenta nuevamente.');
    } finally {
      setSincronizando(false);
    }
  };

  if (!planilla) return <div className="p-8 text-slate-400">Cargando…</div>;
  const profActual = infoProfesional(iniciales);

  return (
    <div style={fullscreen
      ? { position: 'fixed', inset: 0, zIndex: 9998, background: '#F8FAFC', overflow: 'auto', padding: 20, fontFamily: '"Inter","Segoe UI",system-ui,sans-serif' }
      : { maxWidth: 1600, margin: '0 auto', fontFamily: '"Inter","Segoe UI",system-ui,sans-serif' }}>
      {/* ── CSS estilo Excel ── */}
      <style>{`
        .xl { border-collapse: separate; border-spacing: 0; background: #fff;
              font-family: 'Inter','Segoe UI',system-ui,sans-serif; }
        .xl td, .xl th { border-right: 1px solid #EDF0F4; border-bottom: 1px solid #EDF0F4; padding: 0; }
        .xl td:first-child, .xl th:first-child { border-left: none; }
        .xl-head { background: #F7C8E6; color: #6B2A57; font-weight: 700; font-size: 10.5px;
                   letter-spacing: .04em; text-align: center; padding: 9px 6px; line-height: 1.2;
                   text-transform: uppercase; position: sticky; top: 0; z-index: 3; }
        .xl-rownum { background: #F8FAFC; color: #94A3B8; text-align: center; font-size: 11px;
                     width: 34px; min-width: 34px; font-weight: 600; }
        .xl-cell input, .xl-cell select { width: 100%; border: none; background: transparent;
                     font: inherit; font-size: 12.5px; padding: 6px 8px; outline: none; color: #1e293b; }
        .xl-cell select { padding: 5px 4px; }
        .xl-cell input:focus, .xl-cell select:focus { box-shadow: inset 0 0 0 2px #0E7490; background: #ECFEFF; }
        .xl-cell.num input { text-align: right; }
        .xl-sticky { position: sticky; z-index: 2; }
        .xl-head.xl-sticky { z-index: 4; }
        .xl-money td, .xl-money th { border: 1px solid #E8ECF1; font-size: 12.5px; }
      `}</style>

      {/* ── Menú de color (click derecho en una fila) ── */}
      {colorMenu && (
        <div onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: colorMenu.y, left: colorMenu.x, zIndex: 10000, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)', padding: 10 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Color de fila</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {COLORES_FILA.map(c => (
              <button key={c.valor} title={c.nombre}
                onClick={() => { setColorFila(colorMenu.filaId, c.valor); setColorMenu(null); }}
                style={{ width: 24, height: 24, borderRadius: 6, background: c.valor, border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer' }} />
            ))}
          </div>
          <button onClick={() => { setColorFila(colorMenu.filaId, undefined); setColorMenu(null); }}
            style={{ marginTop: 9, width: '100%', fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 7, padding: '5px 0', cursor: 'pointer' }}>
            Quitar color
          </button>
        </div>
      )}

      {/* ── Leyenda de colores ── */}
      {leyenda && (
        <div onMouseDown={() => setLeyenda(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onMouseDown={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.28)', fontFamily: '"Inter","Segoe UI",sans-serif', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>¿Qué significan los colores?</h3>
              <button onClick={() => setLeyenda(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, lineHeight: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '14px 20px 20px' }}>
              {[
                { c: '#F3A6D4', t: 'Encabezado', d: 'Fila de títulos (Hora, Paciente, RUT…).' },
                { c: '#D9EAD3', t: 'Previsión: Particular', d: 'La celda de previsión se pinta verde.' },
                { c: '#CFE2F3', t: 'Previsión: Fonasa', d: 'La celda de previsión se pinta azul.' },
                { c: '#FCE5CD', t: 'Previsión: Isapre', d: 'La celda de previsión se pinta naranjo.' },
                { c: '#FFF59D', t: 'Monto a cancelar', d: 'La columna de monto va en amarillo.' },
                { c: '#A2C4C9', t: 'Ecografía Doppler', d: 'El examen Doppler se marca celeste (ocupa 2 bloques).' },
                { c: '#FCEFE0', t: 'Fila con paciente', d: 'Bloque horario ocupado, en crema.' },
                { c: '#FFFFFF', t: 'Bloque sin paciente', d: 'Slot horario libre, sin color.' },
                { c: '#EFEFEF', t: 'Colación', d: 'Horario de almuerzo, en gris.' },
              ].map(r => (
                <div key={r.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '7px 0' }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 5, background: r.c, border: '1px solid rgba(0,0,0,0.12)', marginTop: 1 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.t}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>{r.d}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '9px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 11.5, color: '#64748B', lineHeight: 1.5 }}>
                Estos colores son <b>automáticos</b>. Con <b>click derecho</b> en una fila puedes pintarla de un color manual, que tiene prioridad sobre los automáticos.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel: Rellenar Sante Pacs ── */}
      {santePacs && (() => {
        const pacientes = planilla.filas.filter(f => f.paciente.trim());
        const fila = planilla.filas.find(f => f.id === santeFilaId) ?? pacientes[0] ?? null;
        // Campos en formato Sante Pacs (DICOM) — los principales para pegar.
        const camposDicom: Array<{ label: string; valor: string }> = fila ? [
          { label: 'Patient Name (Apellidos^Nombres)', valor: nombreDicom(fila.paciente) },
          { label: 'Patient ID (RUT)', valor: rutDicom(fila.rut) },
          { label: 'Birth Date (aaaammdd)', valor: fechaDicom(fila.fechaNac) },
        ] : [];
        // Datos adicionales de referencia.
        const camposExtra: Array<{ label: string; valor: string }> = fila ? [
          { label: 'Edad', valor: fila.edad },
          { label: 'Teléfono', valor: fila.fono },
          { label: 'Correo', valor: fila.correo },
          { label: 'Previsión', valor: fila.prevision },
          { label: 'Examen', valor: fila.examen },
          { label: 'Código', valor: fila.codigo },
        ] : [];
        const todo = camposDicom.filter(c => c.valor.trim()).map(c => c.valor).join('\n');
        return (
          <div onMouseDown={() => setSantePacs(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onMouseDown={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.28)', fontFamily: '"Inter","Segoe UI",sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid #F1F5F9' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Rellenar Sante Pacs</h3>
                <button onClick={() => setSantePacs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, lineHeight: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4M12 8h.01" /></svg>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#1E40AF', lineHeight: 1.5 }}>
                    Esta sección está para <b>agilizar el trabajo de rellenar el Sante Pacs</b>: muestra los datos del paciente ordenados para copiar y pegar.
                  </p>
                </div>

                {pacientes.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No hay pacientes en esta jornada.</p>
                ) : (
                  <>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Paciente</label>
                    <select value={fila?.id ?? ''} onChange={e => setSanteFilaId(e.target.value)}
                      style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#0F172A', outline: 'none', marginBottom: 16 }}>
                      {pacientes.map(f => <option key={f.id} value={f.id}>{f.hora ? `${f.hora} · ` : ''}{f.paciente}</option>)}
                    </select>

                    {(() => {
                      const filaCampo = (c: { label: string; valor: string }, i: number, dicom: boolean) => (
                        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: i ? '1px solid #F1F5F9' : 'none', background: dicom ? '#F8FBFF' : '#fff' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.label}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 14, color: c.valor.trim() ? '#0F172A' : '#cbd5e1', fontWeight: dicom ? 700 : 500, fontFamily: dicom ? 'monospace' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.valor.trim() || '—'}</p>
                          </div>
                          <button onClick={() => copiarTexto(c.valor, c.label)} disabled={!c.valor.trim()}
                            title="Copiar"
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 7, cursor: c.valor.trim() ? 'pointer' : 'not-allowed', border: '1px solid', borderColor: copiado === c.label ? '#16A34A' : '#E2E8F0', color: copiado === c.label ? '#16A34A' : '#0E7490', background: copiado === c.label ? '#F0FDF4' : '#fff', opacity: c.valor.trim() ? 1 : 0.4 }}>
                            {copiado === c.label ? '✓ Copiado' : 'Copiar'}
                          </button>
                        </div>
                      );
                      return (
                        <>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#0E7490', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 6px' }}>Formato Sante Pacs (DICOM)</p>
                          <div style={{ border: '1px solid #BAE6FD', borderRadius: 12, overflow: 'hidden' }}>
                            {camposDicom.map((c, i) => filaCampo(c, i, true))}
                          </div>

                          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', margin: '14px 0 6px' }}>Datos adicionales</p>
                          <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                            {camposExtra.map((c, i) => filaCampo(c, i, false))}
                          </div>

                          <button onClick={() => copiarTexto(todo, '__todo__')}
                            style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 10, border: 'none', background: copiado === '__todo__' ? '#16A34A' : '#0E7490', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                            {copiado === '__todo__' ? '✓ Copiado (DICOM)' : 'Copiar Nombre + RUT + Fecha (DICOM)'}
                          </button>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Barra superior (controles) ── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Planilla Diaria · Caja</h1>
          <p className="text-xs text-slate-500">Misma estructura del Excel mensual de ecografías.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Fecha</span>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-700" />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Profesional</span>
            <select value={iniciales} onChange={e => setIniciales(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-700">
              {opcionesProfesionales.map(p => <option key={p.key} value={p.key}>{p.nombre} ({p.iniciales})</option>)}
            </select>
          </label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <input ref={fileMesRef} type="file" accept=".xlsx,.xls" onChange={handleImportMes} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="h-[34px] px-3 rounded border border-emerald-700 text-emerald-800 text-sm font-semibold hover:bg-emerald-50">
            Importar 1 día
          </button>
          <button onClick={() => fileMesRef.current?.click()}
            className="h-[34px] px-3 rounded bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800">
            Importar mes completo
          </button>
          <button onClick={handleEnviarASistema} disabled={sincronizando}
            title="Crea/actualiza las citas y pacientes en el resto del sistema"
            className="h-[34px] px-3 rounded bg-[#0E7490] text-white text-sm font-bold hover:bg-[#0c6680] flex items-center gap-1.5 disabled:opacity-60">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {sincronizando ? 'Enviando…' : 'Enviar al sistema'}
          </button>
          <button onClick={() => setFullscreen(v => !v)}
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (solo la planilla)'}
            className="h-[34px] px-3 rounded border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {fullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4M15 15l5 5m0 0v-4m0 4h-4" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />}
            </svg>
            {fullscreen ? 'Salir' : 'Pantalla completa'}
          </button>
          <span className="text-xs text-slate-400 self-center min-w-[70px]">
            {guardado === 'guardando' ? 'Guardando…' : guardado === 'guardado' ? '✓ Guardado' : ''}
          </span>
        </div>
      </div>

      {/* ── Pestañas de días guardados del mes (como las hojas del Excel) ── */}
      {(() => {
        const base = fecha.slice(0, 7);
        const delMes = jornadas
          .filter(j => j.fecha.startsWith(base))
          .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.iniciales.localeCompare(b.iniciales)));
        if (delMes.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Jornadas:</span>
            {delMes.map(j => {
              const activa = j.fecha === fecha && j.iniciales === iniciales;
              const dd = j.fecha.slice(8, 10);
              return (
                <button key={`${j.fecha}:${j.iniciales}`}
                  onClick={() => { setFecha(j.fecha); setIniciales(j.iniciales); }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
                    activa ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-600 hover:text-emerald-800'
                  }`}>
                  {dd} · {infoProfesional(j.iniciales).iniciales}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── Barra de título de la hoja ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 border-b-0 rounded-t-2xl">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#0E7490' }} />
        <span className="text-sm font-bold text-slate-800">{profActual.nombre} ({profActual.iniciales})</span>
        <span className="text-xs text-slate-400">· {fecha.split('-').reverse().join('/')}</span>
        <button
          onClick={() => setLeyenda(true)}
          title="¿Qué significan los colores?"
          className="ml-auto flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm font-bold leading-none transition-colors"
        >?</button>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{totales.pacientes} pacientes</span>
      </div>

      {tab === 'planilla' ? (
        <div className="overflow-auto border border-slate-200 rounded-b-2xl bg-white shadow-sm" style={{ maxHeight: fullscreen ? 'calc(100vh - 180px)' : '72vh' }}>
          <table className="xl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="xl-head xl-rownum xl-sticky" style={{ background: '#EFAFDD', left: 0 }}>#</th>
                {COLUMNAS.map(c => {
                  const sticky = STICKY_LEFT[c.campo as string] !== undefined;
                  return (
                    <th key={c.campo} className={`xl-head ${sticky ? 'xl-sticky' : ''}`}
                      style={{ minWidth: c.ancho, width: c.ancho, ...(sticky ? { left: STICKY_LEFT[c.campo as string], boxShadow: c.campo === 'paciente' ? '2px 0 0 #E2E8F0' : undefined } : {}) }}>
                      {c.label}
                    </th>
                  );
                })}
                <th className="xl-head" style={{ width: 30, background: '#EFAFDD' }}></th>
              </tr>
            </thead>
            <tbody>
              {planilla.filas.map((f, idx) => {
                const colacion = esColacion(f.hora);
                const bloqueada = idx > 0 && esDoppler(planilla.filas[idx - 1]) && !f.paciente.trim();
                const vacia = !f.paciente.trim();
                // Fondo de la fila: color manual > colación gris > con paciente crema > vacía blanco.
                const bgBase = f.color ?? (colacion ? '#EFEFEF' : vacia ? '#FFFFFF' : '#FCEFE0');
                // Colores automáticos por celda (réplica del Excel original).
                const cellBg = (campo: string): string => {
                  if (f.color || vacia) return bgBase;            // color manual o fila vacía
                  if (campo === 'prevision') {
                    const p = f.prevision.toLowerCase();
                    if (p.includes('particular')) return '#D9EAD3';   // verde
                    if (p.includes('fonasa')) return '#CFE2F3';       // azul
                    if (p.includes('isapre')) return '#FCE5CD';       // naranjo claro
                  }
                  if (campo === 'montoCancelar') return '#FFF59D';     // amarillo
                  if (campo === 'examen' && esDoppler(f)) return '#A2C4C9'; // celeste Doppler
                  return bgBase;
                };
                const tdStyle = (campo: string, extra?: React.CSSProperties): React.CSSProperties => {
                  const s: React.CSSProperties = { background: cellBg(campo), ...extra };
                  if (STICKY_LEFT[campo] !== undefined) {
                    s.position = 'sticky';
                    s.left = STICKY_LEFT[campo];
                    if (campo === 'paciente') s.boxShadow = '2px 0 0 #E2E8F0';
                  }
                  return s;
                };
                const onCtx = (e: React.MouseEvent) => { e.preventDefault(); setColorMenu({ filaId: f.id, x: e.clientX, y: e.clientY }); };

                // Banda de COLACIÓN o slot RESERVADO por Doppler (no editable).
                if (colacion || bloqueada) {
                  return (
                    <tr key={f.id} className="xl-row" onContextMenu={onCtx}>
                      <td className="xl-rownum xl-sticky" style={{ left: 0, background: '#EDEDED' }}>{idx + 1}</td>
                      <td className="xl-cell xl-sticky" style={tdStyle('hora', { padding: '4px 6px', fontSize: 12, color: '#666', fontWeight: 600 })}>{f.hora}</td>
                      <td className="xl-cell" colSpan={COLUMNAS.length - 1}
                        style={{ background: f.color ?? (colacion ? '#E9E9E9' : '#EAF1F1'), color: colacion ? '#777' : '#3f6f72', fontStyle: 'italic', fontSize: 12, padding: '4px 8px', textAlign: 'center', letterSpacing: '.05em', fontWeight: 600 }}>
                        {colacion ? 'COLACIÓN' : 'Reservado — Doppler (2 bloques)'}
                      </td>
                      <td className="xl-cell" style={{ textAlign: 'center', background: bgBase }}>
                        <button onClick={() => eliminarFila(f.id)} title="Eliminar fila" className="text-slate-300 hover:text-red-500 text-xs px-1">✕</button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={f.id} className="xl-row" onContextMenu={onCtx}>
                    <td className="xl-rownum xl-sticky" style={{ left: 0, background: '#EDEDED' }}>{idx + 1}</td>
                    {COLUMNAS.map(c => {
                      const sticky = STICKY_LEFT[c.campo as string] !== undefined;
                      return (
                        <td key={c.campo} className={`xl-cell ${c.tipo === 'num' ? 'num' : ''} ${sticky ? 'xl-sticky' : ''}`} style={tdStyle(c.campo as string)}>
                          {c.tipo === 'prevision' ? (
                            <select value={f.prevision} onChange={e => handlePrevisionChange(f.id, e.target.value)}>
                              {previsionesOpts.map(p => <option key={p} value={p}>{p}</option>)}
                              {!previsionesOpts.includes(f.prevision) && f.prevision && <option value={f.prevision}>{f.prevision}</option>}
                            </select>
                          ) : c.tipo === 'examen' ? (
                            <ExamenAutocomplete
                              value={f.examen}
                              prestaciones={prestaciones}
                              vinculado={!!f.prestacionId}
                              onType={texto => handleExamenChange(f.id, texto)}
                              onSelect={prest => handleExamenSelect(f.id, prest)}
                            />
                          ) : c.tipo === 'pago' ? (
                            <select value={f.modoPago} onChange={e => setFila(f.id, 'modoPago', e.target.value)}>
                              {MODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                              {!MODOS_PAGO.includes(f.modoPago as any) && f.modoPago && <option value={f.modoPago}>{f.modoPago}</option>}
                            </select>
                          ) : c.tipo === 'num' ? (
                            <input type="number" value={(f[c.campo] as number) || ''} onChange={e => setFila(f.id, c.campo, parseNum(e.target.value))} />
                          ) : (
                            <input value={f[c.campo] as string} onChange={e => setFila(f.id, c.campo, e.target.value)} />
                          )}
                        </td>
                      );
                    })}
                    <td className="xl-cell" style={{ textAlign: 'center', background: bgBase }}>
                      <button onClick={() => eliminarFila(f.id)} title="Eliminar fila"
                        className="text-slate-300 hover:text-red-500 text-xs px-1">✕</button>
                    </td>
                  </tr>
                );
              })}

              {/* Fila "Bloqueo" como en el Excel */}
              <tr>
                <td className="xl-rownum xl-sticky" style={{ left: 0, background: '#EDEDED' }}></td>
                <td className="xl-cell xl-sticky" style={{ left: STICKY_LEFT.hora, background: '#fff', fontStyle: 'italic', color: '#999', padding: '3px 5px', fontSize: 12 }}>Bloqueo</td>
                {COLUMNAS.slice(1).map(c => <td key={c.campo} style={{ background: '#fff' }} />)}
                <td style={{ background: '#fff' }} />
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Botón agregar filas (solo en planilla) ── */}
      {tab === 'planilla' && (
        <div className="flex flex-wrap items-center gap-3 mt-2 mb-6">
          <button onClick={() => agregarFilas(1)} className="text-sm font-semibold text-emerald-800 hover:underline">+ Agregar fila</button>
          <button onClick={() => agregarFilas(5)} className="text-sm text-slate-500 hover:underline">+ 5 filas</button>
          <button
            onClick={() => {
              const primera = planilla.filas.find(f => f.paciente.trim());
              setSanteFilaId(primera?.id ?? planilla.filas[0]?.id ?? null);
              setSantePacs(true);
            }}
            className="ml-2 flex items-center gap-2 px-3 h-[32px] rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="11" height="11" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Rellenar Sante Pacs
          </button>
          <button
            onClick={handleAgregarPacientesBD}
            disabled={sincronizando}
            title="Agrega los pacientes de esta jornada a la base de datos. Si ya existen, pregunta si actualizar sus datos."
            className="flex items-center gap-2 px-3 h-[32px] rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
          >
            {sincronizando ? (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 8v6M22 11h-6" />
              </svg>
            )}
            {sincronizando ? 'Agregando…' : 'Agregar pacientes a la base de datos'}
          </button>
        </div>
      )}

      {/* ── CIERRE DE CAJA (estilo Excel, abajo a la derecha) ── */}
      {tab === 'planilla' && (
        <div className="flex flex-wrap justify-end gap-6 mb-10">
          {/* Totales + comisión */}
          <table className="xl-money" style={{ borderCollapse: 'collapse', alignSelf: 'flex-start' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 12px', background: '#FFF2CC', fontWeight: 700 }}>MONTO A CANCELAR</td>
                <td style={{ padding: '5px 12px', textAlign: 'right', minWidth: 120 }}>{fmt(totales.totalMonto)}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 12px', background: '#DDEBF7', fontWeight: 700 }}>FONASA</td>
                <td style={{ padding: '5px 12px', textAlign: 'right' }}>{fmt(totales.totalFonasa)}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 12px', background: '#FCE4D6', fontWeight: 700 }}>COMISIÓN TRULLENQUE</td>
                <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: 700, color: '#B45309' }}>{fmt(totales.comision)}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 12px', fontWeight: 700 }}>EFECTIVO ESPERADO</td>
                <td style={{ padding: '5px 12px', textAlign: 'right' }}>{fmt(totales.efectivoEsperado)}</td>
              </tr>
            </tbody>
          </table>

          {/* Arqueo: CANTIDAD | TIPO | TOTAL | EXCEDENTE */}
          <table className="xl-money" style={{ borderCollapse: 'collapse', alignSelf: 'flex-start' }}>
            <thead>
              <tr>
                {['CANTIDAD', 'TIPO', 'TOTAL', 'EXCEDENTE'].map(h => (
                  <th key={h} style={{ padding: '5px 10px', background: '#0E7490', color: '#fff', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planilla.arqueo.map((l, i) => (
                <tr key={l.denominacion}>
                  <td style={{ padding: 0, textAlign: 'center', width: 70 }}>
                    <input type="number" min={0} value={l.cantidad || ''} onChange={e => setArqueo(l.denominacion, parseNum(e.target.value))}
                      style={{ width: '100%', border: 'none', textAlign: 'center', padding: '4px', font: 'inherit', fontSize: 12, outline: 'none', background: 'transparent' }}
                      onFocus={e => (e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #0E7490')}
                      onBlur={e => (e.currentTarget.style.boxShadow = 'none')} />
                  </td>
                  <td style={{ padding: '4px 12px', textAlign: 'right', background: '#F3F3F3', width: 80 }}>{fmtNum(l.denominacion)}</td>
                  <td style={{ padding: '4px 12px', textAlign: 'right', width: 90 }}>{fmtNum(l.denominacion * (l.cantidad || 0))}</td>
                  {i === 0 && (
                    <td rowSpan={planilla.arqueo.length} style={{ padding: '4px 12px', textAlign: 'right', verticalAlign: 'bottom', fontWeight: 700, width: 100, color: totales.excedente < 0 ? '#DC2626' : '#0E7490' }}>
                      {fmtNum(totales.excedente)}
                    </td>
                  )}
                </tr>
              ))}
              <tr>
                <td style={{ padding: '5px 10px', background: '#0E7490', color: '#fff', fontWeight: 700, fontSize: 11 }}>TOTAL</td>
                <td style={{ background: '#0E7490' }}></td>
                <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 700, background: '#E2EFDA' }}>{fmtNum(totales.arqueo)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pestañas estilo Excel (abajo) ── */}
      <div className="flex items-end gap-0.5 border-t border-[#B7B7B7] pt-0 mt-2">
        {(['planilla', 'bonos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-semibold border border-t-0 border-[#B7B7B7] rounded-b ${
              tab === t ? 'bg-white text-emerald-800 border-t-2 border-t-emerald-700 -mt-px' : 'bg-[#EDEDED] text-slate-500 hover:bg-slate-200'
            }`}>
            {t === 'planilla' ? 'Planilla del día' : 'BONOS'}
          </button>
        ))}
      </div>

      {/* ── Tab BONOS ── */}
      {tab === 'bonos' && (
        <div className="border border-[#B7B7B7] bg-white p-4 mt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">Registro de Bonos</h3>
            <button onClick={agregarBono} className="text-sm font-semibold text-emerald-800 hover:underline">+ Agregar bono</button>
          </div>
          <table className="xl-money" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {['TIPO', 'FECHA', 'RUT', 'FOLIO', 'VALOR', ''].map((h, i) => (
                  <th key={i} style={{ padding: '5px 10px', background: '#0E7490', color: '#fff', fontSize: 11, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bonos.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#999' }}>Sin bonos registrados.</td></tr>}
              {bonos.map(b => (
                <tr key={b.id}>
                  <td style={{ padding: 2 }}>
                    <select value={b.tipo} onChange={e => setBono(b.id, 'tipo', e.target.value)} style={{ border: 'none', padding: 4, font: 'inherit', fontSize: 12, outline: 'none' }}>
                      <option value="Web">Web</option><option value="Fonasa">Fonasa</option>
                    </select>
                  </td>
                  <td style={{ padding: 2 }}><input type="date" value={b.fecha} onChange={e => setBono(b.id, 'fecha', e.target.value)} style={{ border: 'none', padding: 4, font: 'inherit', fontSize: 12, outline: 'none' }} /></td>
                  <td style={{ padding: 2 }}><input value={b.rut} onChange={e => setBono(b.id, 'rut', e.target.value)} placeholder="12.345.678-9" style={{ border: 'none', padding: 4, font: 'inherit', fontSize: 12, outline: 'none', width: '100%' }} /></td>
                  <td style={{ padding: 2 }}><input value={b.folio} onChange={e => setBono(b.id, 'folio', e.target.value)} style={{ border: 'none', padding: 4, font: 'inherit', fontSize: 12, outline: 'none', width: '100%' }} /></td>
                  <td style={{ padding: 2, textAlign: 'right' }}><input type="number" value={b.valor || ''} onChange={e => setBono(b.id, 'valor', parseNum(e.target.value))} style={{ border: 'none', padding: 4, font: 'inherit', fontSize: 12, outline: 'none', width: 110, textAlign: 'right' }} /></td>
                  <td style={{ padding: 2, textAlign: 'center' }}><button onClick={() => eliminarBono(b.id)} className="text-slate-300 hover:text-red-500 px-1">✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, background: '#F3F3F3' }}>TOTAL BONOS</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, background: '#E2EFDA' }}>{fmt(totalBonos)}</td>
                <td style={{ background: '#F3F3F3' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlanillaDiariaPage;
