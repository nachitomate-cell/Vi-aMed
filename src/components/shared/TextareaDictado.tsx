import React, { useEffect, useState } from 'react';
import BotonDictado from './BotonDictado';

interface TextareaDictadoProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { name: string; value: string } }) => void;
  placeholder?: string;
  required?: boolean;
  minHeight?: number;
  onIniciarDictado?: () => void;
  onDetenerDictado?: () => void;
  onPlantilla?: () => void;
}

export default function TextareaDictado({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  minHeight = 100,
  onIniciarDictado,
  onDetenerDictado,
  onPlantilla,
}: TextareaDictadoProps) {
  const [esMobile, setEsMobile] = useState(false);

  useEffect(() => {
    setEsMobile(window.innerWidth < 768);
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary, #0f172a)' }}>
          {label}
          {required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onPlantilla && (
            <button
              type="button"
              onClick={onPlantilla}
              title="Aplicar plantilla guardada"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: '#0E7490',
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                padding: '3px 8px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E0F2FE')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F0F9FF')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Agregar plantilla
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary, #94a3b8)' }}>Dictado</span>
          <BotonDictado
            textoActual={value}
            onTexto={(updater) => {
              const nuevoValor = typeof updater === 'function' ? updater(value) : updater;
              onChange({ target: { name, value: nuevoValor } });
            }}
            onIniciar={onIniciarDictado}
            onDetener={onDetenerDictado}
          />
        </div>
      </div>

      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          minHeight,
          padding: '10px 12px',
          fontSize: esMobile ? 16 : 14,
          lineHeight: 1.6,
          border: '1px solid var(--color-border-secondary, #E2E8F0)',
          borderRadius: 10,
          background: 'var(--color-background-primary, #FFFFFF)',
          color: 'var(--color-text-primary, #0f172a)',
          resize: 'vertical',
          fontFamily: 'var(--font-sans, Figtree, sans-serif)',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          outline: 'none',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#0E7490')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-secondary, #E2E8F0)')}
      />

      {value?.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary, #94a3b8)', textAlign: 'right', marginTop: 4 }}>
          {value.length} caracteres
        </p>
      )}
    </div>
  );
}
