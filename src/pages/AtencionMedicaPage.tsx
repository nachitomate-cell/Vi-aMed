import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, setDoc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Cita {
  id: string;
  pacienteNombre: string;
  pacienteRut: string;
  pacienteFechaNacimiento: string;
  prevision: string;
  fecha: Timestamp;
  estado: string;
  prestaciones?: any[];
}

interface FichaClinica {
  rut: string;
  anamnesis: string;
  antecedentes: string;
  ultimaActualizacion: Timestamp;
}

const AtencionMedicaPage: React.FC = () => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [anamnesis, setAnamnesis] = useState('');
  const [antecedentes, setAntecedentes] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCitasMedicina = async () => {
    setLoading(true);
    try {
      // Obtenemos todas las citas y filtramos por especialidad Medicina en memoria 
      // (ya que las prestaciones están dentro de un array y Firestore no permite filtrar arrays de objetos fácilmente sin subcolecciones)
      const q = query(
        collection(db, 'citas'),
        where('estado', 'in', ['En espera', 'En atención', 'Finalizado']),
        orderBy('fecha', 'desc')
      );
      
      const snap = await getDocs(q);
      const allCitas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cita));
      
      // Filtrar por especialidad Medicina
      const medicinaCitas = allCitas.filter(c => 
        c.prestaciones?.some(p => p.especialidad === 'Medicina')
      );
      
      setCitas(medicinaCitas);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCitasMedicina();
  }, []);

  const openPaciente = async (cita: Cita) => {
    setSelectedCita(cita);
    setAnamnesis('');
    setAntecedentes('');
    
    // Cargar ficha existente si existe
    try {
      const docRef = doc(db, 'fichas_clinicas', cita.pacienteRut);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as FichaClinica;
        setAnamnesis(data.anamnesis || '');
        setAntecedentes(data.antecedentes || '');
      }
    } catch (e) {
      console.error("Error cargando ficha:", e);
    }
  };

  const saveFicha = async () => {
    if (!selectedCita) return;
    setSaving(true);
    try {
      const fichaRef = doc(db, 'fichas_clinicas', selectedCita.pacienteRut);
      await setDoc(fichaRef, {
        rut: selectedCita.pacienteRut,
        nombre: selectedCita.pacienteNombre,
        anamnesis,
        antecedentes,
        ultimaActualizacion: serverTimestamp()
      }, { merge: true });
      
      alert('Ficha clínica actualizada correctamente');
    } catch (e) {
      console.error(e);
      alert('Error al guardar la ficha');
    }
    setSaving(false);
  };

  const filteredCitas = citas.filter(c => 
    c.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.pacienteRut.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Box Medicina</h1>
          <p className="text-sm text-slate-500">Gestión de pacientes y fichas clínicas de medicina general</p>
        </div>
        
        <div className="relative w-full md:w-80">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LISTADO DE PACIENTES */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pacientes del día</h2>
              <button onClick={fetchCitasMedicina} className="text-slate-400 hover:text-[#0E7490]">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-10 text-center text-slate-400">Cargando pacientes...</div>
              ) : filteredCitas.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic text-sm">No hay pacientes de medicina registrados hoy.</div>
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${c.estado === 'Finalizado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {c.estado}
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
        <div className="lg:col-span-8">
          {selectedCita ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Header Ficha */}
              <div className="p-6 border-b border-slate-100 bg-[#0E7490]/5 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedCita.pacienteNombre}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">RUT:</span> {selectedCita.pacienteRut}</span>
                    <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">Previsión:</span> {selectedCita.prevision}</span>
                    <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">F. Nac:</span> {selectedCita.pacienteFechaNacimiento || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button 
                    disabled={saving}
                    onClick={saveFicha}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0E7490] hover:bg-[#0c6680] text-white font-bold rounded-xl shadow-lg shadow-[#0E7490]/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        Guardar Ficha
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Contenido Ficha */}
              <div className="p-6 space-y-6">
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
                    <textarea 
                      placeholder="Describa el motivo de la consulta actual..."
                      value={anamnesis}
                      onChange={e => setAnamnesis(e.target.value)}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-[#0E7490] transition-all resize-none"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <span className="font-bold">Nota:</span> La anamnesis y los antecedentes se guardan de forma permanente para el RUT del paciente, permitiendo ver su evolución en futuras consultas.
                  </p>
                </div>
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
    </div>
  );
};

export default AtencionMedicaPage;
