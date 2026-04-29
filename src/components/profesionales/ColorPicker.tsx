import React from 'react';

export const COLORES_PREDEFINIDOS = [
  '#0E7490', '#059669', '#7C3AED', '#DC2626', '#D97706', '#2563EB',
] as const;

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<Props> = ({ value, onChange }) => (
  <div className="flex gap-2.5">
    {COLORES_PREDEFINIDOS.map(c => (
      <button
        key={c}
        type="button"
        onClick={() => onChange(c)}
        className={`w-8 h-8 rounded-full transition-all duration-150 ${
          value === c
            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
            : 'hover:scale-105 opacity-80 hover:opacity-100'
        }`}
        style={{ backgroundColor: c }}
        title={c}
      />
    ))}
  </div>
);
