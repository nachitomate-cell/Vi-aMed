import React, { useState } from 'react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { dbVinamed } from '../../lib/firebase';
import { descargarPDF, type InformeParaPDF } from '../../services/pdfInformeService';

interface AccionesInformeProps {
  informe: InformeParaPDF;
  informeId?: string | null;
  onActualizado?: (informe: InformeParaPDF) => void;
}

const AccionesInforme: React.FC<AccionesInformeProps> = ({ informe, informeId, onActualizado }) => {
  const [cargandoFirma, setCargandoFirma] = useState(false);
  const [cargandoDescarga, setCargandoDescarga] = useState(false);
  const [firmaConfirmada, setFirmaConfirmada] = useState(informe?.firmado ?? false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [error, setError] = useState('');

  async function handleDescargar() {
    setCargandoDescarga(true);
    setError('');
    try {
      await descargarPDF(informe, firmaConfirmada);
    } catch {
      setError('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setCargandoDescarga(false);
    }
  }

  async function handleFirmar() {
    setCargandoFirma(true);
    setMostrarConfirm(false);
    try {
      if (informeId) {
        await updateDoc(doc(dbVinamed, 'resultados', informeId), {
          firmado: true,
          firmadoEn: serverTimestamp(),
          firmadoPor: 'Dr. Álvaro Trullenque Sánchez',
        });
      }

      setFirmaConfirmada(true);
      onActualizado?.({ ...informe, firmado: true });
      await descargarPDF({ ...informe, firmado: true }, true);
    } catch {
      setError('Error al aplicar la firma. Intenta de nuevo.');
    } finally {
      setCargandoFirma(false);
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-100">
      {firmaConfirmada && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="6.5" fill="#059669" />
            <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-medium text-emerald-800">
            Informe firmado por Dr. Álvaro Trullenque Sánchez
          </span>
        </div>
      )}

      <div className="flex gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={handleDescargar}
          disabled={cargandoDescarga}
          className={`flex-1 min-w-[140px] h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[13px] font-medium transition-colors ${
            cargandoDescarga ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 active:bg-slate-100'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2v7M4 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {cargandoDescarga ? 'Generando...' : `Descargar PDF${firmaConfirmada ? ' (con firma)' : ''}`}
        </button>

        {!firmaConfirmada && (
          <button
            type="button"
            onClick={() => setMostrarConfirm(true)}
            disabled={cargandoFirma}
            className={`flex-1 min-w-[140px] h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#0E7490] text-white text-[13px] font-medium transition-colors ${
              cargandoFirma ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#0c6680] active:bg-[#0b5e75]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 10c2-2 3-4 4-4s1 2 2 2 2-3 3-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="2" y1="12" x2="12" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {cargandoFirma ? 'Aplicando firma...' : 'Agregar firma médica'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {mostrarConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-xl">
            <div className="text-center mb-4">
              <img
                src="/firma.png"
                alt="Firma Dr. Álvaro Trullenque Sánchez"
                className="max-h-20 object-contain mx-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="border-t border-black mt-1 pt-1.5">
                <p className="text-[11px] font-bold text-slate-900">Dr. ÁLVARO TRULLENQUE SÁNCHEZ</p>
                <p className="text-[10px] text-slate-600">MÉDICO RADIÓLOGO</p>
                <p className="text-[10px] text-slate-600">Rut: 7.268.691-8</p>
              </div>
            </div>

            <p className="text-[13px] text-slate-500 text-center mb-5 leading-relaxed">
              Esta acción agregará la firma del Dr. Trullenque Sánchez al informe y lo descargará como PDF. ¿Confirmar?
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setMostrarConfirm(false)}
                className="flex-1 h-[44px] rounded-xl border border-slate-300 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFirmar}
                className="flex-1 h-[44px] rounded-xl bg-[#0E7490] text-white text-[13px] font-medium hover:bg-[#0c6680] transition-colors"
              >
                Sí, firmar y descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccionesInforme;
