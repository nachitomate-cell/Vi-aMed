import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import InformeEcoForm from '../components/eco-mobile/InformeEcoForm';
import AccionesInforme from '../components/shared/AccionesInforme';
import {
  INITIAL_FORM,
  buildPreview,
  guardarInformeEco,
  escucharTodosLosResultados, // Añadir este import
  type DatosInformeEco,
} from '../services/informeEcoService';
import type { InformeParaPDF } from '../services/pdfInformeService';

interface InformeListado {
  id: number;
  nombre: string;
  tipo: string;
  region: string;
  hora: string;
  informeId?: string;
}

const BoxEcografiaPage: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DatosInformeEco>(INITIAL_FORM);
  const [dictadosActivos, setDictadosActivos] = useState(0);
  const [saving, setSaving] = useState(false);
  const [informes, setInformes] = useState<InformeListado[]>([]);
  const [informeId, setInformeId] = useState<string | null>(null);
  const [informeParaPDF, setInformeParaPDF] = useState<InformeParaPDF | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!form.fecha) setForm(f => ({ ...f, fecha: today }));
  }, [today]);

  useEffect(() => {
    const unsub = escucharTodosLosResultados(data => {
      // Filtrar por hoy (opcional, pero recomendado)
      const hoy = new Date().toISOString().split('T')[0];
      const items: InformeListado[] = data
        .filter(d => {
          if (!d.fecha) return false;
          const dFecha = d.fecha.toDate ? d.fecha.toDate().toISOString().split('T')[0] : d.fecha.split('T')[0];
          return dFecha === hoy;
        })
        .map(d => ({
          id: d.id,
          nombre: d.pacienteNombre,
          tipo: d.tipoExamen,
          region: d.regionAnatomica,
          hora: d.fecha?.toDate ? d.fecha.toDate().toTimeString().slice(0, 5) : '',
          informeId: d.id
        }));
      setInformes(items);
    });
    return () => unsub();
  }, []);

  const handleChange = (k: keyof DatosInformeEco, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

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
      const citaId = `box-${Date.now()}`;
      savedId = await guardarInformeEco(
        citaId,
        { pacienteRut: form.rut, pacienteNombre: form.nombre },
        form,
        user?.uid ?? '',
      );
    } catch {
      // El guardado en Firestore falló (ej: sin Firebase Auth configurado).
      // Continuamos en modo local: el PDF se puede generar igual.
    }

    const hora = new Date().toTimeString().slice(0, 5);
    setInformes(prev => [
      ...prev,
      { id: Date.now(), nombre: form.nombre, tipo: form.tipo, region: form.region, hora, informeId: savedId ?? undefined },
    ]);
    setInformeId(savedId);
    setInformeParaPDF(pdfData);
    setSaving(false);
  };

  const handleNuevoInforme = () => {
    setForm(INITIAL_FORM);
    setInformeId(null);
    setInformeParaPDF(null);
    setDictadosActivos(0);
    setShowForm(true);
  };

  const preview = buildPreview(form, today);

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Box Ecografía</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generación de informes de imagenología</p>
        </div>
        {!showForm && (
          <button
            onClick={handleNuevoInforme}
            className="flex items-center gap-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo Informe
          </button>
        )}
      </div>

      {showForm ? (
        <div className="space-y-4">
          <InformeEcoForm
            form={form}
            onChange={handleChange}
            dictadosActivos={dictadosActivos}
            setDictadosActivos={setDictadosActivos}
          />

          {/* Vista previa — solo mientras no se ha guardado */}
          {!informeParaPDF && (
            <div className="bg-[#F8FAFC] border border-[#0E7490]/20 rounded-xl p-4">
              <div className="text-xs font-bold text-[#0E7490] uppercase tracking-widest mb-3">Vista previa del informe</div>
              <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">{preview}</pre>
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
          <div className="text-xs text-slate-500 uppercase tracking-widest">Informes del Turno</div>
          {informes.length > 0 ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-200">
              {informes.map(inf => (
                <div key={inf.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#0E7490]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{inf.nombre}</div>
                    <div className="text-xs text-slate-500">Ecografía {inf.tipo}{inf.region ? ` · ${inf.region}` : ''} · {inf.hora}</div>
                  </div>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    Completado
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">No hay informes generados en este turno.</p>
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
