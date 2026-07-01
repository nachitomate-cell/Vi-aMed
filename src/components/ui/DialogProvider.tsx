import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de diálogos NATIVO de la app (reemplaza window.alert/confirm/prompt).
// Uso:
//   const dialog = useDialog();
//   await dialog.alert('Guardado');
//   if (await dialog.confirm('¿Eliminar?', { danger: true })) { ... }
//   const valor = await dialog.prompt('Escribe el número', { defaultValue: '1' });
// ─────────────────────────────────────────────────────────────────────────────

type DialogKind = 'alert' | 'confirm' | 'prompt';

export interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

interface DialogState extends DialogOptions {
  kind: DialogKind;
  message: string;
  resolve: (value: unknown) => void;
}

interface DialogApi {
  alert: (message: string, opts?: DialogOptions) => Promise<void>;
  confirm: (message: string, opts?: DialogOptions) => Promise<boolean>;
  prompt: (message: string, opts?: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DialogState | null>(null);
  const [valor, setValor] = useState('');

  const open = useCallback(
    (kind: DialogKind, message: string, opts?: DialogOptions) =>
      new Promise<unknown>(resolve => {
        setValor(opts?.defaultValue ?? '');
        setState({ kind, message, resolve, ...opts });
      }),
    [],
  );

  const api = useMemo<DialogApi>(
    () => ({
      alert: (m, o) => open('alert', m, o).then(() => undefined),
      confirm: (m, o) => open('confirm', m, o).then(v => v === true),
      prompt: (m, o) => open('prompt', m, o).then(v => (v as string | null)),
    }),
    [open],
  );

  const cerrar = useCallback((value: unknown) => {
    setState(prev => { prev?.resolve(value); return null; });
  }, []);

  // Confirmar / cancelar según el tipo.
  const aceptar = useCallback(() => {
    if (!state) return;
    if (state.kind === 'prompt') cerrar(valor);
    else if (state.kind === 'confirm') cerrar(true);
    else cerrar(undefined);
  }, [state, valor, cerrar]);

  const cancelar = useCallback(() => {
    if (!state) return;
    if (state.kind === 'prompt') cerrar(null);
    else if (state.kind === 'confirm') cerrar(false);
    else cerrar(undefined);
  }, [state, cerrar]);

  // Teclado: Enter confirma, Escape cancela.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cancelar(); }
      else if (e.key === 'Enter' && state.kind !== 'prompt') { e.preventDefault(); aceptar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, aceptar, cancelar]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {state && (
        <div
          onMouseDown={cancelar}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            animation: 'vmDlgFade 0.15s ease-out',
          }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              animation: 'vmDlgPop 0.18s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div style={{ padding: '22px 22px 18px' }}>
              {state.title && (
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  {state.title}
                </h3>
              )}
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#475569', whiteSpace: 'pre-line' }}>
                {state.message}
              </p>

              {state.kind === 'prompt' && (
                <input
                  autoFocus
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); aceptar(); }
                  }}
                  placeholder={state.placeholder}
                  style={{
                    marginTop: 14, width: '100%', boxSizing: 'border-box',
                    border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 14px',
                    fontSize: 14, color: '#0F172A', outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0E7490')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 22px 20px' }}>
              {state.kind !== 'alert' && (
                <button
                  onClick={cancelar}
                  style={{
                    padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0',
                    background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {state.cancelText ?? 'Cancelar'}
                </button>
              )}
              <button
                autoFocus={state.kind !== 'prompt'}
                onClick={aceptar}
                style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none',
                  background: state.danger ? '#DC2626' : '#0E7490', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: state.danger ? '0 4px 12px rgba(220,38,38,0.3)' : '0 4px 12px rgba(14,116,144,0.3)',
                }}
              >
                {state.confirmText ?? (state.kind === 'alert' ? 'Entendido' : 'Aceptar')}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes vmDlgFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes vmDlgPop { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog debe usarse dentro de <DialogProvider>');
  return ctx;
}
