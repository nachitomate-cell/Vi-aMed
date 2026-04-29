import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

if (admin.apps.length === 0) {
  admin.initializeApp();
}
export { crearProfesional } from './crearProfesional';

// HTML Email Template
function generarEmailHTML(nombre: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F3F4F6;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;overflow:hidden;
                        border:1px solid #E5E7EB">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#083344,#0E7490);
                         padding:28px 40px">
                <p style="margin:0;font-size:20px;color:#fff;
                           font-weight:500">Portal Clínico ViñaMed</p>
                <p style="margin:4px 0 0;font-size:12px;
                           color:rgba(255,255,255,0.6);letter-spacing:.06em;
                           text-transform:uppercase">
                  Centro de Ecografía y Diagnóstico
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 8px;font-size:20px;font-weight:500;color:#0F172A">
                  Hola, ${nombre}
                </p>
                <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6">
                  Recibimos una solicitud para restablecer tu contraseña en el
                  Portal Clínico de ViñaMed. Haz clic en el botón de abajo para
                  crear una nueva contraseña.
                </p>

                <a href="${resetLink}"
                   style="display:inline-block;padding:14px 32px;
                          background:#0E7490;color:#fff;border-radius:10px;
                          text-decoration:none;font-size:14px;
                          font-weight:600;margin-bottom:24px">
                  Restablecer Contraseña →
                </a>

                <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6">
                  Si no solicitaste esto, puedes ignorar este mensaje con seguridad.
                  Tu cuenta permanece protegida.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="border-top:1px solid #F1F5F9;padding:20px 40px;
                         background:#F8FAFC">
                <p style="margin:0;font-size:11px;color:#CBD5E1;text-align:center">
                  © ViñaMed · Medio Oriente 831, Of. 408, Viña del Mar
                  <br>
                  Desarrollado por
                  <a href="https://synaptechspa.cl"
                     style="color:#94A3B8;text-decoration:none">
                    Synaptech Spa
                  </a>
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

// Rate limiting map
const intentos = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const ahora = Date.now();
  const entry = intentos.get(ip);

  if (!entry || ahora > entry.resetAt) {
    intentos.set(ip, { count: 1, resetAt: ahora + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export const recuperarContrasena = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Demasiados intentos. Espera un momento.' });
      return;
    }

    const { email, nombre } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    try {
      let resetLink = '';
      try {
        resetLink = await admin.auth().generatePasswordResetLink(email);
      } catch (authErr) {
        // Ignorar si el usuario no existe para no filtrar emails
        console.warn('Auth Error or User Not Found:', authErr);
      }

      if (!resetLink) {
        res.json({ ok: true }); // Simular éxito si no existe
        return;
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `ViñaMed <${process.env.RESEND_FROM_EMAIL || 'noreply@synaptechspa.cl'}>`,
        to: [email],
        subject: 'Recupera tu acceso — Portal Clínico ViñaMed',
        html: generarEmailHTML(nombre || 'Profesional', resetLink),
      });
      res.json({ ok: true });
    } catch (err) {
      console.error('Resend error:', err);
      res.status(500).json({ error: 'No se pudo enviar el email' });
    }
  }
);

// ── Registro de Profesionales ──────────────────────────────────
function generarEmailConfirmacion(nombre: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
            <tr>
              <td style="background:linear-gradient(135deg,#083344,#0E7490);padding:28px 40px">
                <p style="margin:0;font-size:20px;color:#fff;font-weight:500">Portal Clínico ViñaMed</p>
                <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:.06em;text-transform:uppercase">
                  Centro de Ecografía y Diagnóstico
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 8px;font-size:20px;font-weight:500;color:#0F172A">
                  ¡Bienvenido, ${nombre}!
                </p>
                <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6">
                  Tu cuenta en el Portal Clínico de ViñaMed ha sido creada exitosamente.
                  Ya puedes ingresar al sistema utilizando tu RUT y la contraseña que creaste.
                </p>
                <a href="http://localhost:3004/login"
                   style="display:inline-block;padding:14px 32px;background:#0E7490;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:24px">
                  Ir al Portal →
                </a>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #F1F5F9;padding:20px 40px;background:#F8FAFC">
                <p style="margin:0;font-size:11px;color:#CBD5E1;text-align:center">
                  © ViñaMed · Desarrollado por Synaptech Spa
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

export const registrarProfesional = onCall(async (request: CallableRequest) => {
  const { nombre, rut, email, password, rol, especialidad } = request.data;
  
  if (!email || !password || !rut || !nombre) {
    throw new HttpsError('invalid-argument', 'Faltan datos obligatorios');
  }

  try {
    // 1. Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
    });

    // 2. Crear doc en Firestore
    await admin.firestore().collection('profesionales').doc(userRecord.uid).set({
      uid: userRecord.uid,
      nombre,
      rut,
      email,
      rol: rol || 'medico',
      especialidad: especialidad || '',
      color: '#0E7490',
      activo: true, 
      estado: 'active', // Ya tiene su contraseña
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Enviar correo de confirmación con Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `ViñaMed <${process.env.RESEND_FROM_EMAIL || 'noreply@synaptechspa.cl'}>`,
      to: [email],
      subject: '¡Bienvenido al Portal Clínico ViñaMed!',
      html: generarEmailConfirmacion(nombre),
    });

    return { ok: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error en registrarProfesional:', error);
    throw new HttpsError('internal', error.message || 'Error al registrar profesional');
  }
});
