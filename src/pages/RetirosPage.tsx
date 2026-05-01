import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Retiro {
  id: string;
  laboratorio: string;
  quienRetira: string;
  temperatura: string;
  numMuestras: string;
  hora: string;
  fecha: Timestamp;
}

const LABS = ['Diagnomed', 'Etcheverry Lab', 'Laboclin', 'Bionet', 'Endoclin'];

const RetirosPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [form, setForm] = useState({ lab: '', nombre: '', temperatura: '', numMuestras: '' });

  const fetchRetiros = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'retiros_laboratorio'), orderBy('fecha', 'desc'), limit(50));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Retiro));
      setRetiros(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRetiros();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lab || !form.nombre) return;

    try {
      const now = new Date();
      const hora = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      
      await addDoc(collection(db, 'retiros_laboratorio'), {
        laboratorio: form.lab,
        quienRetira: form.nombre,
        temperatura: form.temperatura,
        numMuestras: form.numMuestras,
        hora,
        fecha: serverTimestamp()
      });

      setForm({ lab: '', nombre: '', temperatura: '', numMuestras: '' });
      fetchRetiros();
      alert('Retiro registrado correctamente');
    } catch (e) {
      console.error(e);
      alert('Error al registrar retiro');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/setm')}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Retiros de Laboratorio</h1>
            <p className="text-sm text-slate-500">Registro histórico de recolección de muestras diarias</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Nuevo Registro</h2>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Laboratorio</label>
              <select 
                required
                value={form.lab}
                onChange={e => setForm({...form, lab: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20 transition-all"
              >
                <option value="">Seleccionar...</option>
                {LABS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Quién retira (Nombre)</label>
              <input 
                required
                type="text"
                placeholder="Ej: Juan Perez"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Temperatura (°C)</label>
                <input 
                  type="text"
                  placeholder="Ej: 4.5"
                  value={form.temperatura}
                  onChange={e => setForm({...form, temperatura: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">N° Muestras</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={form.numMuestras}
                  onChange={e => setForm({...form, numMuestras: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-[#0E7490] hover:bg-[#0c6680] text-white font-bold rounded-xl shadow-lg shadow-[#0E7490]/20 transition-all active:scale-95"
            >
              Registrar Retiro
            </button>
          </form>
        </div>

        {/* Historial */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Historial de hoy / recientes</h2>
              <button onClick={fetchRetiros} className="p-1.5 text-slate-400 hover:text-[#0E7490] transition-colors">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {retiros.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm italic">
                  No hay retiros registrados aún.
                </div>
              ) : (
                retiros.map(r => (
                  <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0E7490]/10 flex items-center justify-center text-[#0E7490] font-bold">
                        {r.laboratorio[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{r.laboratorio}</div>
                        <div className="text-xs text-slate-500">
                          {r.quienRetira} • {r.numMuestras || 0} muestras • {r.temperatura || '—'}°C
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#0E7490]">{r.hora}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {r.fecha?.toDate ? r.fecha.toDate().toLocaleDateString('es-CL') : '—'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetirosPage;
