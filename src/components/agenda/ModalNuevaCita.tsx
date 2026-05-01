import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { Cita, EstadoCita, RolProfesional } from '../../types/agenda';
import { BOXES, DURACIONES_MINUTOS } from '../../types/agenda';
import {
  crearCita,
  actualizarCita,
  getProfesionales,
  getTiposAtencion,
  buscarPaciente,
  verificarDisponibilidad,
  verificarDisponibilidadBox,
} from '../../services/agendaService';
import type { Profesional, PacienteResultado } from '../../types/agenda';
import { useAuth } from '../../auth/AuthContext';
import { LABELS_ECO } from '../../constants/prestacionesEco';

interface Props {
  citaEditar?: Cita;
  fechaInicial?: Date;
  onGuardado: () => void;
  onCerrar: () => void;
}

interface FormData {
  pacienteRut: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  tipoAtencion: string;
  profesionalId: string;
  profesionalNombre: string;
  profesionalRol: RolProfesional;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  box: string;
  notas: string;
  prestacion?: string; // Nuevo campo opcional
  estado: EstadoCita;
  visiblePaciente: boolean;
}

function buildForm(fecha?: Date, cita?: Cita): FormData {
  if (cita) {
    const d = cita.fecha.toDate();
    return {
      pacienteRut: cita.pacienteRut,
      pacienteNombre: cita.pacienteNombre,
      pacienteTelefono: cita.pacienteTelefono,
      tipoAtencion: cita.tipoAtencion,
      profesionalId: cita.profesionalId,
      profesionalNombre: cita.profesionalNombre,
      profesionalRol: cita.profesionalRol,
      fecha: d.toISOString().split('T')[0],
      hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      duracionMinutos: cita.duracionMinutos,
      box: cita.box,
      notas: cita.notas,
      visiblePaciente: cita.visiblePaciente,
      prestacion: cita.tipoAtencion.startsWith('Ecografía') ? cita.tipoAtencion : '',
      estado: cita.estado,
    };
  }
  const d = fecha ?? new Date();
  return {
    pacienteRut: '',
    pacienteNombre: '',
    pacienteTelefono: '',
    tipoAtencion: '',
    profesionalId: '',
    profesionalNombre: '',
    profesionalRol: 'medico',
    fecha: d.toISOString().split('T')[0],
    hora: '09:00',
    duracionMinutos: 30,
    box: 'Box 1',
    notas: '',
    visiblePaciente: true,
    prestacion: '',
    estado: 'Agendado',
  };
}

const inputCls =
  'w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

export const ModalNuevaCita: React.FC<Props> = ({
  citaEditar, fechaInicial, onGuardado, onCerrar,
}) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>(() => buildForm(fechaInicial, citaEditar));
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [tiposAtencion, setTiposAtencion] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<PacienteResultado[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isNuevo, setIsNuevo] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getProfesionales().then(setProfesionales).catch(console.error);
    getTiposAtencion().then(setTiposAtencion).catch(console.error);
  }, []);

  const set = (patch: Partial<FormData>) => setForm(f => ({ ...f, ...patch }));

  const handleBusqueda = (val: string) => {
    setBusqueda(val);
    if (form.pacienteRut) set({ pacienteRut: '', pacienteNombre: '', pacienteTelefono: '' });
    if (searchRef.current) clearTimeout(searchRef.current);
    if (val.trim().length < 2) { setResultados([]); return; }
    searchRef.current = setTimeout(async () => {
      const res = await buscarPaciente(val).catch(() => []);
      setResultados(res);
    }, 350);
  };

  const elegirPaciente = (p: PacienteResultado) => {
    set({ pacienteRut: p.rut, pacienteNombre: p.nombre, pacienteTelefono: p.telefono });
    setBusqueda('');
    setResultados([]);
    setIsNuevo(false);
  };

  const handleCrearNuevo = () => {
    // Si la búsqueda parece un RUT, usarla como RUT inicial
    const looksLikeRut = /^[0-9.-]+[0-9kK]$/.test(busqueda.trim());
    set({ 
      pacienteRut: looksLikeRut ? busqueda.trim() : '', 
      pacienteNombre: !looksLikeRut ? busqueda.trim() : '',
      pacienteTelefono: '' 
    });
    setIsNuevo(true);
    setResultados([]);
  };

  const elegirProfesional = (id: string) => {
    const prof = profesionales.find(p => p.id === id);
    if (prof) set({ profesionalId: id, profesionalNombre: prof.nombre, profesionalRol: prof.rol });
    else set({ profesionalId: id });
  };

  const getFechaDate = (): Date => {
    const [y, mo, d] = form.fecha.split('-').map(Number);
    const [h, mi] = form.hora.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
  };

  const handleGuardar = async () => {
    const errs: string[] = [];
    if (!form.pacienteRut) errs.push('Seleccione un paciente');
    if (!form.tipoAtencion) errs.push('Seleccione el tipo de atención');
    if (!form.profesionalId) errs.push('Seleccione un profesional');
    if (!form.fecha || !form.hora) errs.push('Ingrese fecha y hora');
    if (errs.length) { setErrores(errs); return; }

    setErrores([]);
    setGuardando(true);

    try {
      const fechaDate = getFechaDate();

      const profOk = await verificarDisponibilidad(
        form.profesionalId, fechaDate, form.duracionMinutos, citaEditar?.id
      );
      if (!profOk) {
        setErrores([`${form.profesionalNombre} ya tiene una cita en ese horario`]);
        return;
      }

      const boxOk = await verificarDisponibilidadBox(
        form.box, fechaDate, form.duracionMinutos, citaEditar?.id
      );
      if (!boxOk) {
        setErrores([`${form.box} ya está ocupado en ese horario`]);
        return;
      }

      const datos = {
        pacienteRut: form.pacienteRut,
        pacienteNombre: form.pacienteNombre,
        pacienteTelefono: form.pacienteTelefono,
        profesionalId: form.profesionalId,
        profesionalNombre: form.profesionalNombre,
        profesionalRol: form.profesionalRol,
        tipoAtencion: (form.tipoAtencion === 'Ecografía' && form.prestacion) 
          ? form.prestacion 
          : form.tipoAtencion,
        fecha: Timestamp.fromDate(fechaDate),
        duracionMinutos: form.duracionMinutos,
        box: form.box as Cita['box'],
        estado: form.estado,
        notas: form.notas,
        creadoPor: user?.rut ?? 'sistema',
        visiblePaciente: form.visiblePaciente,
      };

      if (citaEditar) {
        await actualizarCita(citaEditar.id, datos);
      } else {
        await crearCita(datos);
      }

      setToast({ msg: citaEditar ? 'Cita actualizada' : 'Cita agendada', ok: true });
      setTimeout(onGuardado, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setToast({ msg, ok: false });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-[#0f1623] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-200">
            {citaEditar ? 'Editar cita' : 'Nueva cita'}
          </h2>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Errores */}
          {errores.length > 0 && (
            <div className="p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-xs text-red-300 space-y-0.5">
              {errores.map((e, i) => <div key={i}>· {e}</div>)}
            </div>
          )}

          {/* Paciente */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Paciente</label>
            <div className="relative">
              {!form.pacienteRut && !isNuevo ? (
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => handleBusqueda(e.target.value)}
                  placeholder="Buscar por RUT o nombre..."
                  className={inputCls}
                />
              ) : (
                <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200">{form.pacienteNombre || 'Nuevo Paciente'}</span>
                    <span className="text-xs text-slate-500">{form.pacienteRut}</span>
                  </div>
                  <button 
                    onClick={() => { set({ pacienteRut: '', pacienteNombre: '', pacienteTelefono: '' }); setIsNuevo(false); setBusqueda(''); }}
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {resultados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-10">
                  {resultados.map(p => (
                    <button
                      key={p.rut}
                      onClick={() => elegirPaciente(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      <div className="text-sm text-slate-200">{p.nombre}</div>
                      <div className="text-xs text-slate-500">{p.rut} · {p.telefono}</div>
                    </button>
                  ))}
                </div>
              )}

              {busqueda.length >= 3 && resultados.length === 0 && !form.pacienteRut && !isNuevo && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-10 text-center">
                  <p className="text-xs text-slate-400 mb-2">No se encontró al paciente</p>
                  <button
                    onClick={handleCrearNuevo}
                    className="text-xs bg-cyan-700/20 text-cyan-400 px-3 py-1.5 rounded-lg border border-cyan-700/30 hover:bg-cyan-700/30 transition-colors font-medium"
                  >
                    + Registrar como nuevo
                  </button>
                </div>
              )}
            </div>

            {isNuevo && (
              <div className="mt-4 p-4 bg-cyan-900/10 border border-cyan-800/30 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Datos del nuevo paciente</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">RUT</label>
                    <input
                      type="text"
                      value={form.pacienteRut}
                      onChange={e => set({ pacienteRut: e.target.value })}
                      placeholder="12.345.678-9"
                      className={`${inputCls} py-2`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={form.pacienteTelefono}
                      onChange={e => set({ pacienteTelefono: e.target.value })}
                      placeholder="+569..."
                      className={`${inputCls} py-2`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Nombre Completo (Nombres y Apellidos)</label>
                  <input
                    type="text"
                    value={form.pacienteNombre}
                    onChange={e => set({ pacienteNombre: e.target.value })}
                    placeholder="Ej: Juan Pérez González"
                    className={`${inputCls} py-2`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tipo de atención */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de atención</label>
            <select
              value={form.tipoAtencion.startsWith('Ecografía') ? 'Ecografía' : form.tipoAtencion}
              onChange={e => {
                const val = e.target.value;
                if (val === 'Ecografía') {
                  set({ tipoAtencion: 'Ecografía', prestacion: LABELS_ECO[0] });
                } else {
                  set({ tipoAtencion: val, prestacion: '' });
                }
              }}
              className={selectCls}
            >
              <option value="" className="bg-[#1e293b] text-slate-200">Seleccionar...</option>
              {tiposAtencion.map(t => (
                <option key={t} value={t} className="bg-[#1e293b] text-slate-200">{t}</option>
              ))}
              {/* Asegurar que Ecografía esté disponible como opción base si no viene de Firestore */}
              {!tiposAtencion.includes('Ecografía') && (
                <option value="Ecografía" className="bg-[#1e293b] text-slate-200">Ecografía</option>
              )}
            </select>
          </div>

          {/* Prestación de Ecografía (Condicional) */}
          {form.tipoAtencion === 'Ecografía' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-medium text-cyan-500 mb-1.5">Prestación específica</label>
              <select
                value={form.prestacion}
                onChange={e => set({ prestacion: e.target.value })}
                className={`${selectCls} border-cyan-700/50 bg-cyan-900/10`}
              >
                {LABELS_ECO.map(p => (
                  <option key={p} value={p} className="bg-[#1e293b] text-slate-200">{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Profesional */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Profesional asignado</label>
            <select
              value={form.profesionalId}
              onChange={e => elegirProfesional(e.target.value)}
              className={selectCls}
            >
              <option value="" className="bg-[#1e293b] text-slate-200">Seleccionar...</option>
              {profesionales.map(p => (
                <option key={p.id} value={p.id} className="bg-[#1e293b] text-slate-200">{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => set({ fecha: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Hora</label>
              <input
                type="time"
                value={form.hora}
                onChange={e => set({ hora: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Duración y box */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Duración</label>
              <select
                value={form.duracionMinutos}
                onChange={e => set({ duracionMinutos: Number(e.target.value) })}
                className={selectCls}
              >
                {DURACIONES_MINUTOS.map(d => (
                  <option key={d} value={d} className="bg-[#1e293b] text-slate-200">{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Box / Sala</label>
              <select
                value={form.box}
                onChange={e => set({ box: e.target.value })}
                className={selectCls}
              >
                {BOXES.map(b => <option key={b} value={b} className="bg-[#1e293b] text-slate-200">{b}</option>)}
              </select>
            </div>
          </div>

          {/* Estado y Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
              <select
                value={form.estado}
                onChange={e => set({ estado: e.target.value as EstadoCita })}
                className={selectCls}
              >
                <option value="solicitada" className="bg-[#1e293b] text-slate-200">Solicitada</option>
                <option value="confirmada" className="bg-[#1e293b] text-slate-200">Confirmada</option>
                <option value="realizada" className="bg-[#1e293b] text-slate-200">Realizada</option>
                <option value="cancelada" className="bg-[#1e293b] text-slate-200">Cancelada</option>
                <option value="no_asistio" className="bg-[#1e293b] text-slate-200">No asistió</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Notas internas</label>
              <textarea
                value={form.notas}
                onChange={e => set({ notas: e.target.value })}
                rows={1}
                placeholder="Notas internas..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Visible paciente */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.visiblePaciente}
              onChange={e => set({ visiblePaciente: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-600 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
              Visible en Portal Mi Salud (app del paciente)
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {guardando && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {guardando ? 'Guardando...' : citaEditar ? 'Guardar cambios' : 'Agendar cita'}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium shadow-xl border ${
              toast.ok
                ? 'bg-emerald-900 border-emerald-700 text-emerald-200'
                : 'bg-red-900 border-red-700 text-red-200'
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};
