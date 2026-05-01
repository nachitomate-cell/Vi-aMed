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
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Cita } from '../types/agenda';
import { ESTADO_LABELS } from '../types/agenda';


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

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!form.fecha) setForm(f => ({ ...f, fecha: today }));
  }, [today]);

  useEffect(() => {
    const hoy = new Date();
    const start = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    const end = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(start)),
      where('fecha', '<=', Timestamp.fromDate(end))
    );

    const unsub = onSnapshot(q, snap => {
      const allCitas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita));
      const ecoCitas = allCitas.filter(c => c.tipoAtencion.toLowerCase().includes('eco'));
      ecoCitas.sort((a, b) => a.fecha.toMillis() - b.fecha.toMillis());
      setCitasDia(ecoCitas);
    });

    return () => unsub();
  }, []);

  const handleChange = (k: keyof DatosInformeEco, v: string) => {
    setForm(f => ({ ...f, [k]: v }));

    // Auto-completar datos del paciente al escribir nombre o RUT
    if ((k === 'nombre' || k === 'rut') && v.length >= 3) {
      const field = k === 'nombre' ? 'nombre' : 'rut';
      Promise.all([
        getDocs(query(collection(db, 'pacientes'), where(field, '>=', v), where(field, '<=', v + '\uf8ff'))),
        getDocs(query(collection(db, 'users'), where(field === 'nombre' ? 'name' : 'rut', '>=', v), where(field === 'nombre' ? 'name' : 'rut', '<=', v + '\uf8ff')))
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
      // El guardado en Firestore falló (ej: sin Firebase Auth configurado).
      // Continuamos en modo local: el PDF se puede generar igual.
    }

    setInformeId(savedId);
    setInformeParaPDF(pdfData);
    setSaving(false);
  };

  const handleNuevoInformeParaCita = async (cita: Cita) => {
    let tipoLimpio = cita.tipoAtencion.replace(/ecograf[íi]a\s*/i, '').trim();
    if (!tipoLimpio) tipoLimpio = cita.tipoAtencion;

    setCitaActiva(cita);
    setInformeId(cita.informeId || null);
    setInformeParaPDF(null);
    setDictadosActivos(0);

    if (cita.informeId) {
      // Fetch the existing report
      const existente = await getInformeExistente(cita.id);
      if (existente) {
        setForm({
          nombre: existente.pacienteNombre || cita.pacienteNombre,
          rut: existente.pacienteRut || cita.pacienteRut,
          edad: existente.edad || '',
          sexo: existente.sexo || '',
          fecha: existente.fecha ? (existente.fecha.toDate ? existente.fecha.toDate().toISOString().split('T')[0] : existente.fecha.split('T')[0]) : INITIAL_FORM.fecha,
          solicitante: existente.medicoSolicitante || '',
          codigo: existente.codigoExamen || '',
          tipo: existente.tipoExamen || tipoLimpio,
          region: existente.regionAnatomica || '',
          indicacion: existente.indicacionClinica || '',
          informante: existente.medicoInformante || '',
          hallazgos: existente.hallazgos || '',
          diagnostico: existente.impresionEcografica || '',
          recomendaciones: existente.recomendaciones || '',
        });
      } else {
        setForm({
          ...INITIAL_FORM,
          nombre: cita.pacienteNombre,
          rut: cita.pacienteRut,
          tipo: tipoLimpio,
        });
      }
    } else {
      setForm({
        ...INITIAL_FORM,
        nombre: cita.pacienteNombre,
        rut: cita.pacienteRut,
        tipo: tipoLimpio,
      });
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
      </div>

      {showForm ? (
        <div className="space-y-4">
          <InformeEcoForm
            form={form}
            onChange={handleChange}
            dictadosActivos={dictadosActivos}
            setDictadosActivos={setDictadosActivos}
          />

          {/* Vista previa en tiempo real — diseño fiel al PDF */}
          {!informeParaPDF && (
            <div>
              <div className="text-xs font-bold text-[#0E7490] uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                Vista previa del informe PDF
              </div>
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '117%' }}>
                <PdfPreviewInforme form={form} fecha={today} />
              </div>
            </div>
          )}

          {/* Acciones PDF — aparece siempre tras guardar (con o sin Firestore) */}
          {informeParaPDF && (
            <AccionesInforme
              informe={informeParaPDF}
              informeId={informeId}
              onActualizado={(inf) => setInformeParaPDF(inf)}
            />
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setForm(INITIAL_FORM);
                setInformeId(null);
                setInformeParaPDF(null);
                setShowForm(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.69" />
              </svg>
              {informeParaPDF ? 'Volver a la lista' : 'Cancelar'}
            </button>
            <div className="flex-1" />
            {!informeParaPDF && (
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`flex items-center gap-2 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors ${
                  canSave && !saving
                    ? 'bg-[#0E7490] hover:bg-[#0c6680]'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
                </svg>
                {saving ? 'Guardando...' : 'Guardar Informe'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest">Pacientes del Turno (Ecografías)</div>
          {citasDia.length > 0 ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-200">
              {citasDia.map(cita => {
                const hora = cita.fecha.toDate().toTimeString().slice(0, 5);
                const esRealizada = cita.estado === 'Finalizado';
                return (
                  <div key={cita.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">{cita.pacienteNombre}</div>
                        <div className="text-xs text-slate-500">{cita.tipoAtencion} · {hora}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!esRealizada ? (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg">
                          Estado: {ESTADO_LABELS[cita.estado] || cita.estado}
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleNuevoInformeParaCita(cita)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${cita.informeId ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'}`}
                        >
                          {cita.informeId ? 'Ver/Editar Informe' : 'Redactar Informe'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">No hay atenciones de ecografía en este turno.</p>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-xs text-slate-500">Los informes usan la plantilla oficial ViñaMed con firma del médico informante.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxEcografiaPage;
