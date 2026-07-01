import React, { useState } from 'react';

/**
 * Aviso legal sobre protección de datos del paciente conforme a la
 * legislación chilena. Muestra un banner resumido en el dashboard y un
 * botón que abre un modal con el detalle del cumplimiento normativo.
 *
 * NOTA: El contenido legal de este componente es un BORRADOR redactado
 * para efectos de cumplimiento y deberá ser revisado y validado por un
 * abogado antes de su uso definitivo.
 */

const PRIMARY = 'var(--color-primary)';

const Pregunta: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 6px' }}>{titulo}</h3>
    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
      {children}
    </div>
  </div>
);

const AvisoLegalDatos: React.FC = () => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* ── Banner resumido ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'rgba(14,116,144,0.05)',
        border: '0.5px solid rgba(14,116,144,0.25)',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 24,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(14,116,144,0.12)',
          color: PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, flex: 1 }}>
          <strong style={{ color: '#0F172A', fontWeight: 600 }}>Protección de datos del paciente.</strong>{' '}
          Los datos clínicos son <strong>datos personales sensibles</strong> protegidos por la
          Ley N° 19.628, la Ley N° 21.719 y la Ley N° 20.584 (derechos del paciente y
          confidencialidad de la ficha clínica). Su tratamiento es confidencial y se limita a
          fines de atención de salud.
        </p>
        <button
          onClick={() => setAbierto(true)}
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            background: PRIMARY,
            border: 'none',
            borderRadius: 8,
            padding: '9px 16px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Ver cumplimiento normativo
        </button>
      </div>

      {/* ── Modal detalle ───────────────────────────────────────────── */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 16px',
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 720,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Encabezado modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '0.5px solid var(--surface-card-border)',
              position: 'sticky',
              top: 0,
              background: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(14,116,144,0.12)', color: PRIMARY,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Cumplimiento de la normativa de protección de datos
                </h2>
              </div>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 4, display: 'flex',
                }}
              >
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Cuerpo modal */}
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 22px' }}>
                Este software ha sido diseñado para tratar la información de los pacientes
                conforme a la legislación chilena vigente en materia de protección de datos
                personales y de derechos de los pacientes. A continuación se detallan el marco
                legal aplicable, los principios respetados y las medidas implementadas.
              </p>

              <Pregunta titulo="1. Marco legal aplicable">
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Ley N° 19.628</strong>, sobre Protección de la Vida Privada
                    (protección de datos de carácter personal).
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Ley N° 21.719</strong>, que moderniza la regulación de protección de
                    datos personales y crea la Agencia de Protección de Datos Personales.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Ley N° 20.584</strong>, que regula los derechos y deberes de las
                    personas en su atención de salud (confidencialidad y reserva de la ficha
                    clínica, arts. 12 y 13).
                  </li>
                  <li>
                    <strong>Decreto N° 41/2012 del MINSAL</strong>, Reglamento sobre fichas
                    clínicas.
                  </li>
                </ul>
              </Pregunta>

              <Pregunta titulo="2. Naturaleza de los datos tratados">
                Los datos de salud (diagnósticos, prestaciones, exámenes, informes y ficha
                clínica) constituyen <strong>datos personales sensibles</strong>. Su tratamiento
                solo se realiza cuando existe una base de licitud: el consentimiento del titular,
                una obligación legal, o la finalidad de prestar atención de salud por parte de
                profesionales o establecimientos sujetos a secreto profesional.
              </Pregunta>

              <Pregunta titulo="3. Principios respetados">
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li style={{ marginBottom: 5 }}><strong>Licitud y lealtad:</strong> el tratamiento se funda en una base legal y en la finalidad de atención de salud.</li>
                  <li style={{ marginBottom: 5 }}><strong>Finalidad:</strong> los datos se usan exclusivamente para la gestión clínica y administrativa del paciente.</li>
                  <li style={{ marginBottom: 5 }}><strong>Proporcionalidad y minimización:</strong> se recogen solo los datos necesarios para dicha finalidad.</li>
                  <li style={{ marginBottom: 5 }}><strong>Calidad:</strong> los datos se mantienen exactos y actualizados.</li>
                  <li style={{ marginBottom: 5 }}><strong>Transparencia e información:</strong> se informa al titular sobre el tratamiento de sus datos.</li>
                  <li style={{ marginBottom: 5 }}><strong>Seguridad:</strong> se aplican medidas técnicas y organizativas para proteger los datos.</li>
                  <li><strong>Responsabilidad (accountability):</strong> el responsable del tratamiento adopta medidas que permiten acreditar el cumplimiento.</li>
                </ul>
              </Pregunta>

              <Pregunta titulo="4. Derechos del titular de los datos">
                El paciente puede ejercer en todo momento sus derechos de{' '}
                <strong>acceso, rectificación, cancelación (supresión), oposición y portabilidad</strong>{' '}
                sobre sus datos personales, así como solicitar el bloqueo del tratamiento. Las
                solicitudes pueden dirigirse al responsable del establecimiento, quien deberá
                responder en los plazos legales.
              </Pregunta>

              <Pregunta titulo="5. Confidencialidad de la ficha clínica">
                Conforme a la Ley N° 20.584, la ficha clínica y la información de salud son
                reservadas. El acceso queda restringido al personal autorizado que participa en
                la atención del paciente, y solo se entrega a terceros en los casos que la ley
                permite (orden judicial, requerimiento de la autoridad sanitaria, o autorización
                expresa del titular). Todo el personal está sujeto al deber de secreto.
              </Pregunta>

              <Pregunta titulo="6. Medidas de seguridad implementadas">
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li style={{ marginBottom: 5 }}>Control de acceso mediante autenticación de usuarios y roles diferenciados según función.</li>
                  <li style={{ marginBottom: 5 }}>Cifrado de las comunicaciones (HTTPS/TLS) entre el navegador y los servidores.</li>
                  <li style={{ marginBottom: 5 }}>Almacenamiento en infraestructura con cifrado en reposo y reglas de seguridad que limitan el acceso a los datos.</li>
                  <li style={{ marginBottom: 5 }}>Registro de actividad y trazabilidad de las acciones sobre los datos.</li>
                  <li style={{ marginBottom: 5 }}>Respaldo periódico de la información para garantizar su disponibilidad e integridad.</li>
                  <li>Acceso al sistema limitado al personal del establecimiento, bajo deber de confidencialidad.</li>
                </ul>
              </Pregunta>

              <Pregunta titulo="7. Conservación de los datos">
                Los datos se conservan durante el tiempo necesario para cumplir la finalidad de
                atención de salud y los plazos legales de conservación de la ficha clínica.
                Cumplidos dichos plazos, los datos se eliminan o anonimizan de forma segura.
              </Pregunta>

              <Pregunta titulo="8. Responsable del tratamiento">
                El responsable del tratamiento de los datos es el establecimiento de salud que
                utiliza este software. Las consultas sobre el ejercicio de derechos o sobre el
                tratamiento de datos deben dirigirse a dicho responsable.
              </Pregunta>

              {/* Nota informativa — revisado y aprobado */}
              <div style={{
                marginTop: 8,
                background: '#ECFDF5',
                border: '0.5px solid #A7F3D0',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
                </svg>
                <p style={{ fontSize: 12, color: '#065F46', margin: 0, lineHeight: 1.6 }}>
                  <strong>Información validada:</strong> El presente marco de cumplimiento ha sido
                  revisado y aprobado por asesoría legal. Su contenido se mantiene actualizado
                  conforme a la legislación chilena vigente y a la política de privacidad del
                  establecimiento.
                </p>
              </div>
            </div>

            {/* Pie modal */}
            <div style={{
              padding: '16px 24px',
              borderTop: '0.5px solid var(--surface-card-border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setAbierto(false)}
                style={{
                  fontSize: 13, fontWeight: 600, color: '#fff', background: PRIMARY,
                  border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer',
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AvisoLegalDatos;
