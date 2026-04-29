import { useState } from 'react';
import { useDictado } from '../../hooks/useDictado';

interface BotonDictadoProps {
  textoActual?: string;
  onTexto: (updater: (prev: string) => string) => void;
  onIniciar?: () => void;
  onDetener?: () => void;
}

export default function BotonDictado({ onTexto, onIniciar, onDetener }: BotonDictadoProps) {
  const [error, setError] = useState('');

  const { escuchando, soportado, transcripcion, toggle } = useDictado({
    onTranscripcion: (texto) => {
      onTexto((prev) => {
        const base = prev?.trim() || '';
        return base ? `${base} ${texto}` : texto;
      });
    },
    onError: (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    },
    onIniciar,
    onDetener,
  });

  if (!soportado) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={toggle}
        title={escuchando ? 'Detener dictado' : 'Iniciar dictado por voz'}
        style={{
          width: 36, height: 36,
          borderRadius: '50%',
          border: escuchando ? '2px solid #DC2626' : '0.5px solid var(--color-border-secondary, #E2E8F0)',
          background: escuchando ? '#FEF2F2' : 'var(--color-background-primary, #FFFFFF)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5" y="1" width="6" height="9" rx="3" fill={escuchando ? '#DC2626' : 'var(--color-text-secondary, #64748B)'}/>
          <path d="M3 8a5 5 0 0010 0" stroke={escuchando ? '#DC2626' : 'var(--color-text-secondary, #64748B)'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <line x1="8" y1="13" x2="8" y2="15" stroke={escuchando ? '#DC2626' : 'var(--color-text-secondary, #64748B)'} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="5" y1="15" x2="11" y2="15" stroke={escuchando ? '#DC2626' : 'var(--color-text-secondary, #64748B)'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        {escuchando && (
          <span style={{
            position: 'absolute', inset: -4,
            borderRadius: '50%',
            border: '2px solid #DC2626',
            opacity: 0.4,
            animation: 'pulse-ring 1.2s ease-out infinite',
          }}/>
        )}
      </button>

      {escuchando && transcripcion && (
        <div style={{
          position: 'absolute', top: 42, right: 0,
          background: 'var(--color-background-primary, #FFFFFF)',
          border: '0.5px solid #DC2626',
          borderRadius: 8, padding: '6px 10px',
          fontSize: 12, color: '#DC2626',
          maxWidth: 220, whiteSpace: 'normal',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
        }}>
          {transcripcion}
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', top: 42, right: 0,
          background: '#FEF2F2', border: '0.5px solid #FECACA',
          borderRadius: 8, padding: '6px 10px',
          fontSize: 12, color: '#991B1B',
          maxWidth: 220, whiteSpace: 'normal', zIndex: 10,
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
