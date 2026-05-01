import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TempLog {
  id: string;
  fecha: Timestamp;
  min: number;
  max: number;
  avg: number;
  responsable: string;
}

const InventarioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventario' | 'temperatura'>('temperatura');
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ min: '', max: '', avg: '', responsable: '' });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'registro_temperatura'), orderBy('fecha', 'desc'), limit(31));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TempLog));
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'temperatura') fetchLogs();
  }, [activeTab]);

  const handleSaveTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.min || !form.max || !form.avg) return;

    try {
      await addDoc(collection(db, 'registro_temperatura'), {
        min: Number(form.min),
        max: Number(form.max),
        avg: Number(form.avg),
        responsable: form.responsable || 'Staff',
        fecha: serverTimestamp()
      });
      setForm({ min: '', max: '', avg: '', responsable: '' });
      fetchLogs();
      alert('Registro guardado');
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    }
  };

  const exportExcel = () => {
    const data = logs.map(l => ({
      Fecha: l.fecha?.toDate().toLocaleDateString('es-CL') || '—',
      'Mínima (°C)': l.min,
      'Máxima (°C)': l.max,
      'Promedio (°C)': l.avg,
      Responsable: l.responsable
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Temperaturas');
    XLSX.writeFile(wb, `Registro_Temperaturas_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Registro de Temperatura Diaria - ViñaMed', 14, 15);
    
    const tableData = logs.map(l => [
      l.fecha?.toDate().toLocaleDateString('es-CL') || '—',
      `${l.min}°C`,
      `${l.max}°C`,
      `${l.avg}°C`,
      l.responsable
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Fecha', 'Mínima', 'Máxima', 'Promedio', 'Responsable']],
      body: tableData,
    });

    doc.save(`Registro_Temperaturas_${new Date().toLocaleDateString()}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventario y Control</h1>
          <p className="text-sm text-slate-500">Gestión de insumos y registros sanitarios obligatorios</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('temperatura')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'temperatura' ? 'bg-white text-[#0E7490] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Temperatura
          </button>
          <button 
            onClick={() => setActiveTab('inventario')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventario' ? 'bg-white text-[#0E7490] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Insumos
          </button>
        </div>
      </div>

      {activeTab === 'temperatura' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Formulario */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSaveTemp} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2 text-[#0E7490]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <h2 className="font-bold text-sm uppercase tracking-wider">Nuevo Registro</h2>
                </div>
                
                <div className="space-y-3">
                  <Input label="Mínima (°C)" value={form.min} onChange={v => setForm({...form, min: v})} type="number" step="0.1" />
                  <Input label="Máxima (°C)" value={form.max} onChange={v => setForm({...form, max: v})} type="number" step="0.1" />
                  <Input label="Promedio (°C)" value={form.avg} onChange={v => setForm({...form, avg: v})} type="number" step="0.1" />
                  <Input label="Responsable" value={form.responsable} onChange={v => setForm({...form, responsable: v})} placeholder="Nombre" />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-[#0E7490] hover:bg-[#0c6680] text-white font-bold rounded-xl shadow-lg shadow-[#0E7490]/20 transition-all active:scale-95"
                >
                  Guardar Hoy
                </button>
              </form>
            </div>

            {/* Listado */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Planilla de Temperatura Diaria</h2>
                  <div className="flex gap-2">
                    <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Excel
                    </button>
                    <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Mínima</th>
                        <th className="px-6 py-3">Máxima</th>
                        <th className="px-6 py-3 text-[#0E7490]">Promedio</th>
                        <th className="px-6 py-3 text-right">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={5} className="px-6 py-10 text-center animate-pulse text-slate-400">Cargando registros...</td></tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No hay registros este mes</td></tr>
                      ) : (
                        logs.map(l => (
                          <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-600">{l.fecha?.toDate().toLocaleDateString('es-CL')}</td>
                            <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{l.min}°C</span></td>
                            <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold">{l.max}°C</span></td>
                            <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-[#0E7490]/10 text-[#0E7490] text-xs font-bold">{l.avg}°C</span></td>
                            <td className="px-6 py-4 text-right text-slate-500 font-medium">{l.responsable}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Módulo de Insumos</h3>
            <p className="text-sm text-slate-500 max-w-xs">El control de stock y REAS está siendo finalizado. Usa el registro de temperatura por mientras.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; step?: string; placeholder?: string }> = ({ label, value, onChange, type = "text", step, placeholder }) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">{label}</label>
    <input 
      type={type}
      step={step}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] transition-all"
    />
  </div>
);

export default InventarioPage;
