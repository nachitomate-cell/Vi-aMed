import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

// Solo inicializa la app de admin si no ha sido inicializada antes
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const crearProfesional = onCall(async (request: CallableRequest) => {
  // Verificar que quien llama es admin o secretaria
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');

  const callerDoc = await admin.firestore()
    .collection('profesionales')
    .doc(request.auth.uid).get();

  if (!callerDoc.exists || callerDoc.data()?.rol !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo admins pueden crear profesionales');
  }

  const { nombre, rut, email, rol, especialidad, color } = request.data;

  // 1. Crear usuario en Firebase Auth con contraseña temporal
  const passwordTemp = generarPasswordTemp();
  const userRecord = await admin.auth().createUser({
    email,
    password:    passwordTemp,
    displayName: nombre,
  });

  // 2. Crear documento en Firestore (profesionales)
  await admin.firestore()
    .collection('profesionales')
    .doc(userRecord.uid).set({
      uid:          userRecord.uid,
      nombre,
      rut,
      email,
      rol,           // 'medico' | 'tecnologo' | 'enfermero' | 'secretaria' | 'admin'
      especialidad:  especialidad || '',
      color:         color || '#0E7490',
      activo:        true,
      estado:        'invited',   // cambia a 'active' cuando activa la cuenta
      creadoPor:     request.auth.uid,
      creadoEn:      admin.firestore.FieldValue.serverTimestamp(),
    });

  // 3. Generar link de activación de Firebase Auth
  const linkActivacion = await admin.auth()
    .generateSignInWithEmailLink(email, {
      url: `http://localhost:3004/activar-cuenta?uid=${userRecord.uid}`,
      handleCodeInApp: true,
    });

  // 4. Enviar email de invitación con Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    'ViñaMed <noreply@synaptechspa.cl>',
    to:      [email],
    subject: 'Invitación al Portal Clínico ViñaMed',
    html:    emailInvitacion(nombre, linkActivacion, passwordTemp),
  });

  return { ok: true, uid: userRecord.uid };
});

function generarPasswordTemp(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 16 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function emailInvitacion(
  nombre: string,
  link: string,
  passTemp: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <body style="margin:0;padding:0;background:#F3F4F6;
                 font-family:-apple-system,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;
                        border:1px solid #E5E7EB;overflow:hidden">

            <tr>
              <td style="background:linear-gradient(135deg,#083344,#0E7490);
                         padding:28px 40px">
                <p style="margin:0;font-size:20px;color:#fff;
                           font-weight:500">Portal Clínico ViñaMed</p>
                <p style="margin:4px 0 0;font-size:12px;
                           color:rgba(255,255,255,0.6)">
                  Invitación de acceso
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 40px">
                <p style="font-size:16px;color:#0F172A;margin:0 0 16px">
                  Hola, <strong>${nombre}</strong>
                </p>
                <p style="font-size:14px;color:#64748B;
                           line-height:1.7;margin:0 0 24px">
                  Has sido invitado/a a acceder al Portal Clínico de ViñaMed.
                  Haz clic en el botón para activar tu cuenta y crear
                  tu contraseña personal.
                </p>

                <a href="${link}"
                   style="display:inline-block;padding:14px 32px;
                          background:#0E7490;color:#fff;border-radius:10px;
                          text-decoration:none;font-size:14px;
                          font-weight:600;margin-bottom:24px">
                  Activar mi cuenta →
                </a>

                <div style="background:#F8FAFC;border:1px solid #E2E8F0;
                             border-radius:10px;padding:16px 20px;
                             margin-bottom:20px">
                  <p style="font-size:12px;color:#64748B;margin:0 0 4px">
                    Contraseña temporal (cámbiala al activar):
                  </p>
                  <p style="font-size:16px;font-family:monospace;
                             color:#0F172A;margin:0;letter-spacing:2px">
                    ${passTemp}
                  </p>
                </div>

                <p style="font-size:12px;color:#94A3B8;line-height:1.6;margin:0">
                  El link de activación expira en 24 horas.
                  Si no solicitaste este acceso, ignora este email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #F1F5F9;padding:16px 40px;
                         background:#F8FAFC;text-align:center">
                <p style="margin:0;font-size:11px;color:#CBD5E1">
                  © ViñaMed · Desarrollado por
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
