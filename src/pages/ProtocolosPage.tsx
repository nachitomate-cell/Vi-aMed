import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storageVinamed } from '../lib/firebase';

interface ProtocoloDoc {
  id?: string;
  titulo: string;
  categoria: 'Protocolo Clínico' | 'Planillas y Formularios' | 'Otro';
  url: string;
  nombreArchivo: string;
  extension: string;
  fecha: any;
  tamano: string;
}

const CATEGORIAS = ['Protocolo Clínico', 'Planillas y Formularios', 'Otro'] as const;

const FileIcon: React.FC<{ ext: string }> = ({ ext }) => {
  const color = ext === 'PDF' ? 'text-red-500' : ext === 'XLSX' ? 'text-emerald-500' : 'text-[#0E7490]';
  return (
    <svg className={`w-5 h-5 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
};

const ModalUpload: React.FC<{ onCerrar: () => void; onExito: () => void }> = ({ onCerrar, onExito }) => {
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<typeof CATEGORIAS[number]>('Protocolo Clínico');
  const [subiendo, setSubiendo] = useState(false);

  const handleSubir = async () => {
    if (!file || !titulo.trim()) return;
    setSubiendo(true);
    try {
      const storageRef = ref(storageVinamed, `gestion_protocolos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'gestion_protocolos'), {
        titulo: titulo.trim(),
        categoria,
        url,
        nombreArchivo: file.name,
        extension: file.name.split('.').pop()?.toUpperCase() || 'DOC',
        tamano: (file.size / 1024).toFixed(1) + ' KB',
        fecha: serverTimestamp(),
      });

      onExito();
      onCerrar();
    } catch (e) {
      console.error(e);
      alert('Error al subir el archivo');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Subir Documento</h2>
          <button onClick={onCerrar} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título del Documento *</label>
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0E7490]"
              placeholder="Ej: Protocolo de Higiene 2025"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoría *</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0E7490]"
              value={categoria}
              onChange={e => setCategoria(e.target.value as any)}
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Archivo *</label>
            <div className="relative group">
              <input 
                type="file" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 group-hover:border-[#0E7490]/30'}`}>
                <div className="flex flex-col items-center">
                  <svg className={`w-8 h-8 mb-2 ${file ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-slate-600 truncate max-w-full px-2">
                    {file ? file.name : 'Click para seleccionar o arrastra aquí'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">PDF, Excel, Word o Imagen</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onCerrar}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            disabled={!file || !titulo.trim() || subiendo}
            onClick={handleSubir}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold shadow-lg shadow-[#0E7490]/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {subiendo ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Subiendo...
              </>
            ) : 'Subir Documento'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtocolosPage: React.FC = () => {
  const [documentos, setDocumentos] = useState<ProtocoloDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocumentos = async () => {
    try {
      const q = query(collection(db, 'gestion_protocolos'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      setDocumentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProtocoloDoc)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const docsPorCategoria = (cat: string) => documentos.filter(d => d.categoria === cat);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Protocolos y Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">Biblioteca central de normativas, protocolos clínicos y formularios</p>
        </div>
        <button 
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#0E7490]/20 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Subir Documento
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-[#0E7490] animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Cargando biblioteca...</p>
        </div>
      ) : documentos.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-20 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700">No hay documentos</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">Comienza subiendo el primer protocolo o formulario para el equipo médico.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {CATEGORIAS.map(cat => {
            const items = docsPorCategoria(cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat}</h2>
                  <div className="h-px bg-slate-100 flex-1" />
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full">{items.length} ARCHIVOS</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(doc => (
                    <a 
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#0E7490] hover:shadow-xl hover:shadow-[#0E7490]/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0E7490]/5 transition-colors">
                        <FileIcon ext={doc.extension} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-[#0E7490] transition-colors">{doc.titulo}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-medium">{doc.nombreArchivo}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[10px] text-slate-400 font-medium">{doc.tamano}</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0E7490] group-hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <ModalUpload 
          onCerrar={() => setShowUpload(false)} 
          onExito={fetchDocumentos} 
        />
      )}
    </div>
  );
};

export default ProtocolosPage;
